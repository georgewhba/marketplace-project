import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { refundRequests } from '../db/schema/refund-requests.js';
import { orders } from '../db/schema/orders.js';
import { orderItems } from '../db/schema/order-items.js';
import { payments } from '../db/schema/payments.js';
import { transactions } from '../db/schema/transactions.js';
import { vendors } from '../db/schema/vendors.js';
import { eq, and, ne, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/rbac.js';
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

  // Check for existing non-rejected refund requests on this order
  const existingRefunds = await db.select().from(refundRequests)
    .where(and(eq(refundRequests.orderId, orderId), ne(refundRequests.status, 'rejected')));

  if (!orderItemId) {
    if (existingRefunds.length > 0) {
      throw AppError.conflict('يوجد طلب استرجاع مسجل بالفعل لهذا الطلب');
    }
  } else {
    const duplicate = existingRefunds.some(r => !r.orderItemId || r.orderItemId === orderItemId);
    if (duplicate) {
      throw AppError.conflict('يوجد طلب استرجاع مسجل بالفعل لهذا الطلب');
    }
  }

  const maxOrderRefundable = Math.max(0, Number(order.total) - Number(order.shippingFee));
  const alreadyRefunded = existingRefunds.reduce((sum, r) => sum + Number(r.amount), 0);
  const remainingRefundable = Math.max(0, Number((maxOrderRefundable - alreadyRefunded).toFixed(2)));

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
    const subtotalNum = Number(order.subtotal);
    const discountRatio = subtotalNum > 0
      ? (subtotalNum - Number(order.discount)) / subtotalNum
      : 1;
    amountToRefund = Number((Number(item.total) * Math.max(0, discountRatio)).toFixed(2));
    amountToRefund = Math.min(amountToRefund, remainingRefundable);
  } else {
    if (order.status !== 'delivered') {
      throw AppError.badRequest('يمكن طلب استرجاع للطلبات المستلمة فقط');
    }
    amountToRefund = remainingRefundable;
  }

  if (amountToRefund <= 0) {
    throw AppError.badRequest('لا يوجد مبلغ متبقٍ قابل للاسترجاع في هذا الطلب');
  }

  await db.insert(refundRequests).values({
    orderId,
    orderItemId,
    customerId: user.id,
    reason,
    amount: amountToRefund.toFixed(2),
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
router.get('/admin', authenticate, requirePermission('orders.refund'), async (c) => {
  const list = await db.select().from(refundRequests).orderBy(desc(refundRequests.createdAt));
  return c.json({ success: true, data: list });
});

// Admin: Approve Refund
const approveSchema = z.object({
  adminNote: z.string().optional(),
});
router.put('/admin/:id/approve', authenticate, requirePermission('orders.refund'), validate('body', approveSchema), async (c) => {
  const id = parseInt(c.req.param('id') || '', 10);
  if (Number.isNaN(id) || id <= 0) throw AppError.badRequest('معرف غير صالح');
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

  // For Paymob electronic payments:
  if (payment && payment.providerTransactionId) {
    try {
      await paymobService.issueRefund(payment.providerTransactionId, Number(req.amount));
      
      await db.update(payments)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
    } catch (e: any) {
      await db.update(refundRequests)
        .set({ status: 'failed', adminNote: `فشل بوابة الدفع: ${e.message}`, processedAt: new Date() })
        .where(eq(refundRequests.id, req.id));
      throw AppError.internal('فشل الاسترجاع عبر بوابة الدفع');
    }
  }

  // Execute the refund state changes and ledger deduction inside a transaction
  await db.transaction(async (tx) => {
    const [lockedReq] = await tx.select().from(refundRequests)
      .where(eq(refundRequests.id, id))
      .for('update');

    if (!lockedReq) throw AppError.notFound('طلب الاسترجاع');
    if (lockedReq.status !== 'pending') throw AppError.badRequest('الطلب تمت معالجته مسبقاً');

    // Update refund request status
    await tx.update(refundRequests)
      .set({
        status: 'approved',
        adminId: user.id,
        adminNote,
        processedAt: new Date()
      })
      .where(eq(refundRequests.id, id));

    const itemsToRefund = lockedReq.orderItemId
      ? await tx.select().from(orderItems).where(eq(orderItems.id, lockedReq.orderItemId))
      : await tx.select().from(orderItems).where(and(eq(orderItems.orderId, lockedReq.orderId), eq(orderItems.vendorStatus, 'delivered')));

    for (const item of itemsToRefund) {
      const refundAmount = parseFloat(item.vendorAmount ?? item.total);
      if (refundAmount <= 0) continue;

      // Lock vendor balance
      const [vendorRecord] = await tx.select({ totalSales: vendors.totalSales })
        .from(vendors)
        .where(eq(vendors.id, item.vendorId))
        .for('update');

      const balanceBefore = parseFloat(vendorRecord?.totalSales ?? '0');
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
  });

  return c.json({ success: true, message: 'تم الموافقة على الاسترجاع بنجاح' });
});

// Admin: Reject Refund
const rejectSchema = z.object({
  adminNote: z.string().min(1, 'سبب الرفض مطلوب'),
});
router.put('/admin/:id/reject', authenticate, requirePermission('orders.refund'), validate('body', rejectSchema), async (c) => {
  const id = parseInt(c.req.param('id') || '', 10);
  if (Number.isNaN(id) || id <= 0) throw AppError.badRequest('معرف غير صالح');
  const { adminNote } = getValidated<z.infer<typeof rejectSchema>>(c, 'body');
  const user = c.get('user');

  const [updated] = await db.update(refundRequests)
    .set({
      status: 'rejected',
      adminId: user.id,
      adminNote,
      processedAt: new Date()
    })
    .where(and(eq(refundRequests.id, id), eq(refundRequests.status, 'pending')))
    .returning();

  if (!updated) throw AppError.badRequest('الطلب غير موجود أو تمت معالجته مسبقاً');

  return c.json({ success: true, message: 'تم رفض طلب الاسترجاع' });
});

export default router;
