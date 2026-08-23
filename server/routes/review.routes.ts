import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { reviews, orderItems, products, vendors, users } from '../db/schema/index.js';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate, getValidated } from '../middleware/validate.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { getPaginationMeta, getOffset, paginationSchema } from '../utils/pagination.js';
import type { AppEnv } from '../types/env.js';

const reviewRoutes = new Hono<AppEnv>();

const createReviewSchema = z.object({
  orderItemId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  comment: z.string().max(2000).optional(),
}).strict();

const vendorReplySchema = z.object({
  reply: z.string().min(1).max(2000),
}).strict();

// POST /api/reviews
reviewRoutes.post('/', authenticate, validate('body', createReviewSchema), async (c) => {
  const user = c.get('user');
  const input = getValidated<z.infer<typeof createReviewSchema>>(c, 'body');

  // Verify the order item belongs to this user and is delivered
  const [item] = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      vendorId: orderItems.vendorId,
      vendorStatus: orderItems.vendorStatus,
      orderId: orderItems.orderId,
    })
    .from(orderItems)
    .where(eq(orderItems.id, input.orderItemId))
    .limit(1);

  if (!item || !item.productId) throw AppError.notFound('عنصر الطلب');
  if (item.vendorStatus !== 'delivered') {
    throw AppError.badRequest('لا يمكنك تقييم منتج لم يتم توصيله');
  }

  // Verify ownership via order
  const { orders } = await import('../db/schema/index.js');
  const [order] = await db.select({ customerId: orders.customerId })
    .from(orders).where(eq(orders.id, item.orderId)).limit(1);
  if (!order || order.customerId !== user.id) {
    throw AppError.forbidden('لا يمكنك تقييم طلب ليس لك');
  }

  // Pre-check: prevent duplicate review (explicit check before insert for clear error message)
  const [existingReview] = await db.select({ id: reviews.id }).from(reviews)
    .where(and(eq(reviews.customerId, user.id), eq(reviews.orderItemId, input.orderItemId)))
    .limit(1);
  if (existingReview) throw AppError.conflict('لقد قيّمت هذا المنتج من قبل');

  const [review] = await db.insert(reviews).values({
    productId: item.productId,
    customerId: user.id,
    orderItemId: input.orderItemId,
    rating: input.rating,
    title: input.title,
    comment: input.comment,
    isVerifiedPurchase: true,
  }).returning();

  // Recalculate product rating
  const [avgResult] = await db.select({
    avgRating: sql<string>`ROUND(AVG(${reviews.rating})::numeric, 2)`,
    count: sql<number>`count(*)::int`,
  }).from(reviews).where(and(eq(reviews.productId, item.productId), eq(reviews.isVisible, true)));

  if (avgResult) {
    await db.update(products).set({
      rating: avgResult.avgRating ?? '0',
      reviewCount: avgResult.count ?? 0,
      updatedAt: new Date(),
    }).where(eq(products.id, item.productId));
  }

  // Recalculate vendor rating
  const [vendorAvg] = await db.select({
    avgRating: sql<string>`ROUND(AVG(${reviews.rating})::numeric, 2)`,
    count: sql<number>`count(*)::int`,
  }).from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(and(eq(products.vendorId, item.vendorId), eq(reviews.isVisible, true)));

  if (vendorAvg) {
    await db.update(vendors).set({
      rating: vendorAvg.avgRating ?? '0',
      reviewCount: vendorAvg.count ?? 0,
      updatedAt: new Date(),
    }).where(eq(vendors.id, item.vendorId));
  }

  return sendCreated(c, review);
});

// GET /api/reviews/product/:id
reviewRoutes.get('/product/:id', validate('query', paginationSchema), async (c) => {
  const productId = parseInt(c.req.param('id')!, 10);
  const { page, limit } = getValidated<z.infer<typeof paginationSchema>>(c, 'query');

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.isVisible, true)));
  const total = countResult?.count ?? 0;

  const reviewList = await db
    .select({
      id: reviews.id, rating: reviews.rating, title: reviews.title,
      comment: reviews.comment, isVerifiedPurchase: reviews.isVerifiedPurchase,
      vendorReply: reviews.vendorReply, vendorRepliedAt: reviews.vendorRepliedAt,
      createdAt: reviews.createdAt,
      customerFirstName: users.firstName, customerLastName: users.lastName,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.customerId, users.id))
    .where(and(eq(reviews.productId, productId), eq(reviews.isVisible, true)))
    .orderBy(desc(reviews.createdAt))
    .limit(limit)
    .offset(getOffset(page, limit));

  return sendSuccess(c, reviewList, 200, getPaginationMeta(page, limit, total));
});

// PUT /api/reviews/:id/vendor-reply (vendor only)
reviewRoutes.put('/:id/vendor-reply', authenticate, validate('body', vendorReplySchema), async (c) => {
  const user = c.get('user');
  if (user.role !== 'vendor') throw AppError.forbidden();
  const input = getValidated<z.infer<typeof vendorReplySchema>>(c, 'body');
  const reviewId = parseInt(c.req.param('id')!, 10);

  const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
  if (!review) throw AppError.notFound('التقييم');

  // Verify vendor owns the product
  const [product] = await db.select({ vendorId: products.vendorId }).from(products)
    .where(eq(products.id, review.productId)).limit(1);
  
  const { vendors: vendorsTable } = await import('../db/schema/index.js');
  const [vendor] = await db.select({ id: vendorsTable.id }).from(vendorsTable)
    .where(eq(vendorsTable.userId, user.id)).limit(1);
  
  if (!product || !vendor || product.vendorId !== vendor.id) {
    throw AppError.forbidden('لا يمكنك الرد على تقييم لمنتج ليس لك');
  }

  const [updated] = await db.update(reviews).set({
    vendorReply: input.reply,
    vendorRepliedAt: new Date(),
  }).where(eq(reviews.id, reviewId)).returning();

  return sendSuccess(c, updated);
});

// DELETE /api/reviews/:id (admin only) — soft-delete: sets is_visible=false, preserves audit trail
reviewRoutes.delete('/:id', authenticate, authorize('admin'), async (c) => {
  const reviewId = parseInt(c.req.param('id')!, 10);
  const [review] = await db.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1);
  if (!review) throw AppError.notFound('التقييم');

  // Soft-delete: hide the review instead of permanent deletion
  await db.update(reviews).set({ isVisible: false }).where(eq(reviews.id, reviewId));

  // Recalculate product rating (query already filters is_visible=true)
  const [avgResult] = await db.select({
    avgRating: sql<string>`COALESCE(ROUND(AVG(${reviews.rating})::numeric, 2), 0)`,
    count: sql<number>`count(*)::int`,
  }).from(reviews).where(and(eq(reviews.productId, review.productId), eq(reviews.isVisible, true)));

  if (avgResult) {
    await db.update(products).set({
      rating: String(avgResult.avgRating),
      reviewCount: avgResult.count,
    }).where(eq(products.id, review.productId));
  }

  return sendSuccess(c, { message: 'تم إخفاء التقييم' });
});

export default reviewRoutes;
