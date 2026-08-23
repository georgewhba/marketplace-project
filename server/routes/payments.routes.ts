import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { orders } from '../db/schema/orders.js';
import { payments } from '../db/schema/payments.js';
import { eq } from 'drizzle-orm';
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
      .where(eq(orders.id, orderId));
      
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

  // Parse merchant_order_id (e.g. ORD-15-162817281)
  const orderIdStr = obj.order?.merchant_order_id?.split('-')[1];
  if (!orderIdStr) return c.json({ success: true });
  
  const orderId = parseInt(orderIdStr, 10);
  const success = obj.success;
  const transactionId = String(obj.id);
  const pending = obj.pending;

  if (pending) return c.json({ success: true });

  // Update payment row idempotently
  const existingPayments = await db.select().from(payments)
    .where(eq(payments.orderId, orderId));
    
  const targetPayment = existingPayments.find(p => p.provider === 'paymob' && p.status === 'pending');
  
  if (targetPayment) {
    await db.update(payments)
      .set({
        status: success ? 'succeeded' : 'failed',
        providerTransactionId: transactionId,
        rawResponse: obj,
        updatedAt: new Date()
      })
      .where(eq(payments.id, targetPayment.id));
      
    if (success) {
      await db.update(orders)
        .set({ status: 'confirmed', updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    }
  }

  return c.json({ success: true });
});

router.get('/:orderId/status', authenticate, async (c) => {
  const orderId = parseInt(c.req.param('orderId') || '0');
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
      orderStatus: order.status,
      paymentStatus: lastPayment ? lastPayment.status : 'unknown',
    }
  });
});

export default router;
