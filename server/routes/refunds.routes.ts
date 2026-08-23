import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { refundRequests } from '../db/schema/refund-requests.js';
import { orders } from '../db/schema/orders.js';
import { orderItems } from '../db/schema/order-items.js';
import { payments } from '../db/schema/payments.js';
import { transactions } from '../db/schema/transactions.js';
import { vendors } from '../db/schema/vendors.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate, getValidated } from '../middleware/validate.js';
import { paymobService } from '../services/paymob.service.js';
import { AppError } from '../utils/errors.js';

type Variables = {
  user: any;
};

const router = new Hono<{ Variables: Variables }>();

// Customer: Request Refund
const refundSchema = z.object({
  orderId: z.number().int().positive(),
  orderItemId: z.number().int().positive().optional(),
  reason: z.string().min(5).max(1000),
});

router.post('/', authenticate, validate('body', refundSchema), async (c) => {
  const { orderId, orderItemId, reason } = getValidated<z.infer<typeof refundSchema>>(c, 'body');
  const user = c.get('user');

  // Verify order
  const orderList = await db.select().from(orders).where(eq(orders.id, orderId));
  const order = orderList[0];

  if (!order || order.customerId !== user.id) {
    throw AppError.notFound('الطلب');
  }

  // Find eligible items (must be delivered to refund)
  let amountToRefund = 0;
  if (orderItemId) {
    const items = await db.select().from(orderItems)
      .where(and(eq(orderItems.id, orderItemId), eq(orderItems.orderId, orderId)));
    const item = items[0];
    if (!item) throw AppError.notFound('العنصر');
    if (item.vendorStatus !== 'delivered') {
      throw AppError.badRequest('يمكن طلب استرجاع للعناصر المستلمة فقط');
    }
    amountToRefund = Number(item.total);
  } else {
    if (order.status !== 'delivered') {
      throw AppError.badRequest('يمكن طلب استرجاع للطلبات المستلمة فقط');
    }
    amountToRefund = Number(order.total);
  }

  await db.insert(refundRequests).values({
    orderId,
    orderItemId,
    customerId: user.id,
    reason,
    amount: amountToRefund.toString(),
  });

  return c.json({ success: true, message: 'تم تقديم طلب الاسترجاع بنجاح' });
});

// Customer: Get Refund Requests
router.get('/', authenticate, async (c) => {
  const user = c.get('user');
  const list = await db.select().from(refundRequests)
    .where(eq(refundRequests.customerId, user.id))
    .orderBy(desc(refundRequests.createdAt));
    
  return c.json({ success: true, data: list });
});

// Admin: Get all Refund Requests
router.get('/admin', authenticate, authorize('admin'), async (c) => {
  const list = await db.select().from(refundRequests).orderBy(desc(refundRequests.createdAt));
  return c.json({ success: true, data: list });
});

// Admin: Approve Refund
const approveSchema = z.object({
  adminNote: z.string().optional(),
});
router.put('/admin/:id/approve', authenticate, authorize('admin'), validate('body', approveSchema), async (c) => {
  const id = parseInt(c.req.param('id') || '0');
  const { adminNote } = getValidated<z.infer<typeof approveSchema>>(c, 'body');
  const user = c.get('user');

  const reqList = await db.select().from(refundRequests).where(eq(refundRequests.id, id));
  const req = reqList[0];
  if (!req) throw AppError.notFound('طلب الاسترجاع');
  if (req.status !== 'pending') throw AppError.badRequest('الطلب تمت معالجته مسبقاً');

  // Find the successful payment
  const paymentList = await db.select().from(payments)
    .where(and(eq(payments.orderId, req.orderId), eq(payments.status, 'succeeded')));
  
  const payment = paymentList[0];

  // Note: if payment method was COD, the refund would likely happen offline or via wallet transfer.
  // For Paymob electronic payments:
  if (payment && payment.providerTransactionId) {
    // Attempt actual refund
    try {
      await paymobService.issueRefund(payment.providerTransactionId, Number(req.amount));
      
      // Update payment status (partially_refunded or refunded depending on amount logic, keeping it simple here)
      await db.update(payments)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
    } catch (e) {
      throw AppError.internal('فشل الاسترجاع عبر بوابة الدفع');
    }
  }

  // Execute the refund state changes and ledger deduction inside a transaction
  await db.transaction(async (tx) => {
    // Update refund request status
    await tx.update(refundRequests)
      .set({
        status: 'approved',
        adminId: user.id,
        adminNote,
        processedAt: new Date()
      })
      .where(eq(refundRequests.id, id));

    if (req.orderItemId) {
      const [item] = await tx.select().from(orderItems).where(eq(orderItems.id, req.orderItemId));
      
      if (item && item.vendorAmount) {
        // Lock vendor balance
        const [vendorRecord] = await tx.select({ totalSales: vendors.totalSales })
          .from(vendors)
          .where(eq(vendors.id, item.vendorId))
          .for('update');

        const balanceBefore = parseFloat(vendorRecord!.totalSales);
        const refundAmount = parseFloat(item.vendorAmount);
        const balanceAfter = balanceBefore - refundAmount;

        // Record negative transaction for vendor
        await tx.insert(transactions).values({
          vendorId: item.vendorId,
          orderItemId: item.id,
          type: 'refund',
          amount: (-refundAmount).toFixed(2),
          balanceBefore: balanceBefore.toFixed(2),
          balanceAfter: balanceAfter.toFixed(2),
          description: `استرجاع للعنصر #${item.id}`,
        });
        
        // Atomically update vendor totalSales (balance)
        await tx.update(vendors)
          .set({ totalSales: balanceAfter.toFixed(2), updatedAt: new Date() })
          .where(eq(vendors.id, item.vendorId));
      }
    }
  });

  return c.json({ success: true, message: 'تم الموافقة على الاسترجاع بنجاح' });
});

// Admin: Reject Refund
const rejectSchema = z.object({
  adminNote: z.string().min(1, 'سبب الرفض مطلوب'),
});
router.put('/admin/:id/reject', authenticate, authorize('admin'), validate('body', rejectSchema), async (c) => {
  const id = parseInt(c.req.param('id') || '0');
  const { adminNote } = getValidated<z.infer<typeof rejectSchema>>(c, 'body');
  const user = c.get('user');

  const reqList = await db.select().from(refundRequests).where(eq(refundRequests.id, id));
  if (!reqList[0]) throw AppError.notFound('طلب الاسترجاع');
  if (reqList[0].status !== 'pending') throw AppError.badRequest('الطلب تمت معالجته مسبقاً');

  await db.update(refundRequests)
    .set({
      status: 'rejected',
      adminId: user.id,
      adminNote,
      processedAt: new Date()
    })
    .where(eq(refundRequests.id, id));

  return c.json({ success: true, message: 'تم رفض طلب الاسترجاع' });
});

export default router;
