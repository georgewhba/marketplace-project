import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { env } from '../env.js';
import { orders, payments, vendorSubscriptions, subscriptionPlans, commissionRules } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import { validate, getValidated } from '../middleware/validate.js';
import { paymobService } from '../services/paymob.service.js';
import { AppError } from '../utils/errors.js';

type Variables = {
  user: any;
};

const router = new Hono<{ Variables: Variables }>();

const initiateSchema = z.object({
  orderId: z.number().int().positive(),
  method: z.enum(['card', 'wallet', 'fawry_ref', 'cod']),
});

router.post('/initiate', authenticate, validate('body', initiateSchema), async (c) => {
  const { orderId, method } = getValidated<z.infer<typeof initiateSchema>>(c, 'body');
  const user = c.get('user');

  // Verify order ownership and status
  const orderList = await db.select().from(orders).where(eq(orders.id, orderId));
  const order = orderList[0];
  
  if (!order || order.customerId !== user.id) {
    throw AppError.notFound('الطلب');
  }
  
  if (order.status !== 'pending') {
    throw AppError.badRequest('لا يمكن الدفع لهذا الطلب في حالته الحالية');
  }

  // If COD, just update payment method and confirm immediately
  if (method === 'cod') {
    await db.update(orders)
      .set({ paymentMethod: 'cod', status: 'confirmed', updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, 'pending')));
      
    // Remove any existing pending payments for this order
    await db.delete(payments)
      .where(and(eq(payments.orderId, orderId), eq(payments.status, 'pending')));

    // Record payment row as pending (will be collected upon delivery)
    await db.insert(payments).values({
      orderId,
      provider: 'cash_on_delivery',
      method: 'cod',
      amount: order.total,
      status: 'pending'
    });
    
    return c.json({ success: true, data: { status: 'confirmed', method: 'cod' } });
  }

  // Electronic Payment
  const billingData = {
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    phone_number: user.phone || order.shippingPhone || '01000000000',
    street: order.shippingAddressLine1,
    building: 'NA',
    floor: 'NA',
    apartment: 'NA',
    city: order.shippingCity,
    country: 'EG',
  };

  const { iframeUrl } = await paymobService.generatePaymentKey(orderId, Number(order.total), billingData);

  // Update order method
  await db.update(orders)
    .set({ paymentMethod: method })
    .where(eq(orders.id, orderId));

  // Remove any existing pending payments for this order
  await db.delete(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.status, 'pending')));

  // Record pending payment intent
  await db.insert(payments).values({
    orderId,
    provider: 'paymob',
    method,
    amount: order.total,
    status: 'pending'
  });

  return c.json({ success: true, data: { iframeUrl, method } });
});

router.post('/webhook', async (c) => {
  // Paymob sends HMAC in query parameters
  const hmac = c.req.query('hmac');
  if (!hmac) {
    throw AppError.unauthorized('Missing HMAC');
  }

  const payload = await c.req.json();
  
  // Validate HMAC
  const isValid = paymobService.validateHMAC(payload.obj, hmac);
  if (!isValid) {
    console.error('🚨 Invalid Paymob HMAC signature');
    throw AppError.unauthorized('Invalid signature');
  }

  const obj = payload.obj;
  if (!obj) return c.json({ success: true }); // Acknowledge

  // Parse merchant_order_id
  const merchantOrderId = obj.order?.merchant_order_id;
  if (!merchantOrderId) return c.json({ success: true });

  const success = obj.success;
  const transactionId = String(obj.id);
  const pending = obj.pending;

  if (pending) return c.json({ success: true });

  // Handle Subscription Payment
  if (merchantOrderId.startsWith('SUB-')) {
    const [, vendorIdStr, planIdStr] = merchantOrderId.split('-');
    const vendorId = parseInt(vendorIdStr, 10);
    const planId = parseInt(planIdStr, 10);

    if (success && !Number.isNaN(vendorId) && !Number.isNaN(planId)) {
      const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
      if (plan) {
        // Activate subscription
        const now = new Date();
        const periodEnd = new Date();
        periodEnd.setDate(now.getDate() + 30); // 30 days for monthly plan

        const [existingSub] = await db.select().from(vendorSubscriptions).where(eq(vendorSubscriptions.vendorId, vendorId));

        if (existingSub) {
          await db.update(vendorSubscriptions)
            .set({
              planId,
              status: 'active',
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              autoRenew: true
            })
            .where(eq(vendorSubscriptions.id, existingSub.id));
        } else {
          await db.insert(vendorSubscriptions).values({
            vendorId,
            planId,
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            autoRenew: true
          });
        }

        // Update commission rules
        await db.delete(commissionRules).where(and(eq(commissionRules.scope, 'vendor'), eq(commissionRules.targetId, vendorId)));
        await db.insert(commissionRules).values({
          scope: 'vendor',
          targetId: vendorId,
          rate: plan.commissionRate,
          priority: 100, // Highest priority
          effectiveFrom: now
        });
      }
    }

    return c.json({ success: true });
  }

  // Handle Regular Order Payment
  const orderIdStr = merchantOrderId.split('-')[1] ?? merchantOrderId;
  const orderId = parseInt(orderIdStr, 10);
  if (Number.isNaN(orderId)) return c.json({ success: true });

  // Update payment row idempotently
  const existingPayments = await db.select().from(payments)
    .where(eq(payments.orderId, orderId));
    
  const targetPayment = existingPayments.find(p => p.provider === 'paymob' && p.status === 'pending');
  
  if (targetPayment) {
    let finalSuccess = Boolean(success);
    
    if (finalSuccess) {
      const [orderRecord] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (!orderRecord) return c.json({ success: true });
      
      const orderTotalCents = Math.round(parseFloat(orderRecord.total) * 100);
      if (obj.amount_cents !== orderTotalCents) {
        console.error(`🚨 Payment amount mismatch for order ${orderId}: expected ${orderTotalCents}, got ${obj.amount_cents}`);
        finalSuccess = false;
      }
    }

    await db.update(payments)
      .set({
        status: finalSuccess ? 'succeeded' : 'failed',
        providerTransactionId: transactionId,
        rawResponse: obj,
        updatedAt: new Date()
      })
      .where(eq(payments.id, targetPayment.id));
      
    if (finalSuccess) {
      await db.update(orders)
        .set({ status: 'confirmed', updatedAt: new Date() })
        .where(and(eq(orders.id, orderId), eq(orders.status, 'pending')));
    }
  }

  return c.json({ success: true });
});

router.get('/:orderId/status', authenticate, async (c) => {
  const orderId = parseInt(c.req.param('orderId') || '', 10);
  if (Number.isNaN(orderId) || orderId <= 0) {
    throw AppError.badRequest('معرف غير صالح');
  }
  const user = c.get('user');

  const orderList = await db.select().from(orders).where(eq(orders.id, orderId));
  const order = orderList[0];

  if (!order || order.customerId !== user.id) {
    throw AppError.notFound('الطلب');
  }

  const paymentsList = await db.select().from(payments)
    .where(eq(payments.orderId, orderId));
    
  const lastPayment = paymentsList.sort((a, b) => b.id - a.id)[0];

  return c.json({
    success: true,
    data: {
      status: lastPayment ? lastPayment.status : 'pending',
    }
  });
});

// Mock Paymob Webhook (For development without real credentials)
router.post('/webhook/paymob-mock', async (c) => {
  if (env.NODE_ENV === 'production') {
    throw AppError.notFound('المسار غير موجود');
  }

  const { orderId, success } = await c.req.json();
  
  if (typeof orderId === 'string' && orderId.startsWith('SUB-')) {
    const parts = orderId.split('-');
    const vendorId = parseInt(parts[1] || '0', 10);
    const planId = parseInt(parts[2] || '0', 10);
    
    if (success && !Number.isNaN(vendorId) && !Number.isNaN(planId)) {
      const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId));
      if (!plan) return c.json({ success: false, message: 'Plan not found' });
      
      const now = new Date();
      const periodEnd = new Date();
      periodEnd.setDate(now.getDate() + 30);
      
      const [existingSub] = await db.select().from(vendorSubscriptions).where(eq(vendorSubscriptions.vendorId, vendorId));
      
      if (existingSub) {
        await db.update(vendorSubscriptions)
          .set({ planId, status: 'active', currentPeriodStart: now, currentPeriodEnd: periodEnd, autoRenew: true })
          .where(eq(vendorSubscriptions.id, existingSub.id));
      } else {
        await db.insert(vendorSubscriptions).values({
          vendorId, planId, status: 'active', currentPeriodStart: now, currentPeriodEnd: periodEnd, autoRenew: true
        });
      }
      
      await db.delete(commissionRules).where(and(eq(commissionRules.scope, 'vendor'), eq(commissionRules.targetId, vendorId)));
      await db.insert(commissionRules).values({
        scope: 'vendor', targetId: vendorId, rate: plan.commissionRate, priority: 100, effectiveFrom: now
      });
    }
    return c.json({ success: true });
  }

  // Handle regular order mock payment
  const numericOrderId = typeof orderId === 'number'
    ? orderId
    : typeof orderId === 'string' && orderId.startsWith('ORD-')
      ? parseInt(orderId.split('-')[1] || '0', 10)
      : parseInt(String(orderId), 10);

  if (!Number.isNaN(numericOrderId) && numericOrderId > 0) {
    const existingPayments = await db.select().from(payments).where(eq(payments.orderId, numericOrderId));
    const targetPayment = existingPayments.find(p => p.status === 'pending');

    if (targetPayment) {
      await db.update(payments)
        .set({
          status: success ? 'succeeded' : 'failed',
          providerTransactionId: `MOCK-${Date.now()}`,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, targetPayment.id));
    }

    if (success) {
      await db.update(orders)
        .set({ status: 'confirmed', updatedAt: new Date() })
        .where(and(eq(orders.id, numericOrderId), eq(orders.status, 'pending')));
    }

    return c.json({ success: true });
  }

  return c.json({ success: false, message: 'Invalid orderId' }, 400);
});

export default router;
