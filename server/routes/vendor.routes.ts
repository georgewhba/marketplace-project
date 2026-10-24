import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { env } from '../env.js';
import {
  vendors, products, productImages, orderItems, orders,
  transactions, notifications, users, shipments, shipmentEvents, settlements, payoutRequests,
  subscriptionPlans, vendorSubscriptions, subscriptionPromotions, commissionRules
} from '../db/schema/index.js';
import { eq, and, or, ne, sql, desc, asc, lte, gte } from 'drizzle-orm';
import { authenticate, loadVendor } from '../middleware/authenticate.js';
import { uploadRateLimit } from '../middleware/rateLimit.js';
import { validate, getValidated } from '../middleware/validate.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { paymobService } from '../services/paymob.service.js';
import { resolveCommissionRate } from '../services/commission.service.js';
import { slugify } from '../utils/slugify.js';
import { processImage, deleteImage, validateImageMagicBytes } from '../utils/image.js';
import { getPaginationMeta, getOffset, paginationSchema } from '../utils/pagination.js';
import type { AppEnv } from '../types/env.js';
import { 
  getVendorOverview, 
  getVendorProducts 
} from '../services/analytics.service.js';
import { calculateOrderStatus, shouldAdvanceOrderStatus } from '../utils/calculateOrderStatus.js';
import { ShippingFactory } from '../services/shipping/shipping.factory.js';
import xss from 'xss';

const vendorRoutes = new Hono<AppEnv>();
vendorRoutes.use('*', authenticate, loadVendor);

// GET /api/vendor/analytics/overview
vendorRoutes.get('/analytics/overview', async (c) => {
  const vendor = c.var.vendor!;
  const days = parseInt(c.req.query('days') || '30', 10);
  const data = await getVendorOverview(vendor.id, days);
  return sendSuccess(c, data);
});

// GET /api/vendor/analytics/products
vendorRoutes.get('/analytics/products', async (c) => {
  const vendor = c.var.vendor!;
  const days = parseInt(c.req.query('days') || '30', 10);
  const data = await getVendorProducts(vendor.id, days);
  return sendSuccess(c, data);
});

const productSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().min(3).max(255).trim().transform(val => xss(val)),
  description: z.string().max(5000).optional().transform(val => val ? xss(val) : val),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'سعر غير صالح'),
  comparePrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
}).strict();

const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'processing', 'shipped', 'delivered']).transform(val => val === 'processing' ? 'confirmed' : val),
  trackingNumber: z.string().max(100).optional(),
}).strict();

const createShipmentSchema = z.object({
  provider: z.enum(['bosta', 'manual']),
  trackingNumber: z.string().max(100).optional(),
}).strict();

const updateSettingsSchema = z.object({
  storeName: z.string().min(3).max(255).trim().optional().transform(val => val ? xss(val) : val),
  storeDescription: z.string().max(2000).optional().nullable().transform(val => val ? xss(val) : val),
  shippingPolicy: z.string().max(2000).optional().nullable().transform(val => val ? xss(val) : val),
  returnPolicy: z.string().max(2000).optional().nullable().transform(val => val ? xss(val) : val),
  logo: z.string().url().max(500).optional().nullable().or(z.literal('')),
  banner: z.string().url().max(500).optional().nullable().or(z.literal('')),
}).strict();

// Helper to get active vendor limits (auto-provisions free plan if missing)
async function getVendorLimits(vendorId: number) {
  const [subscription] = await db
    .select({
      productLimit: subscriptionPlans.productLimit,
      imageLimitPerProduct: subscriptionPlans.imageLimitPerProduct,
      autoShippingEnabled: subscriptionPlans.autoShippingEnabled,
      advancedAnalytics: subscriptionPlans.advancedAnalytics,
      bulkActionsEnabled: subscriptionPlans.bulkActionsEnabled,
      payoutCycleDays: subscriptionPlans.payoutCycleDays,
      planName: subscriptionPlans.name,
    })
    .from(vendorSubscriptions)
    .innerJoin(subscriptionPlans, eq(vendorSubscriptions.planId, subscriptionPlans.id))
    .where(
      and(
        eq(vendorSubscriptions.vendorId, vendorId),
        eq(vendorSubscriptions.status, 'active')
      )
    )
    .limit(1);

  if (subscription) {
    return subscription;
  }

  // Auto-provision free plan if vendor doesn't have an active subscription yet
  const [freePlan] = await db
    .select()
    .from(subscriptionPlans)
    .where(
      or(
        eq(subscriptionPlans.slug, 'basic'),
        eq(subscriptionPlans.slug, 'starter'),
        eq(subscriptionPlans.priceMonthly, '0.00')
      )
    )
    .orderBy(asc(subscriptionPlans.sortOrder))
    .limit(1);

  if (freePlan) {
    await db
      .insert(vendorSubscriptions)
      .values({
        vendorId,
        planId: freePlan.id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
        autoRenew: true,
      })
      .onConflictDoUpdate({
        target: vendorSubscriptions.vendorId,
        set: {
          planId: freePlan.id,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: null,
          autoRenew: true,
        },
      });

    return {
      productLimit: freePlan.productLimit,
      imageLimitPerProduct: freePlan.imageLimitPerProduct,
      autoShippingEnabled: freePlan.autoShippingEnabled,
      advancedAnalytics: freePlan.advancedAnalytics,
      bulkActionsEnabled: freePlan.bulkActionsEnabled,
      payoutCycleDays: freePlan.payoutCycleDays,
      planName: freePlan.name,
    };
  }

  // Fallback default free limits if subscription_plans table is empty
  return {
    productLimit: 50,
    imageLimitPerProduct: 3,
    autoShippingEnabled: false,
    advancedAnalytics: false,
    bulkActionsEnabled: false,
    payoutCycleDays: 30,
    planName: 'Basic',
  };
}

// GET /api/vendor/dashboard
vendorRoutes.get('/dashboard', async (c) => {
  const vendor = c.get('vendor');

  // Sales stats
  const [stats] = await db.select({
    totalOrders: sql<number>`count(DISTINCT ${orderItems.orderId})::int`,
    totalRevenue: sql<string>`COALESCE(SUM(${orderItems.vendorAmount}::numeric), 0)`,
    totalCommission: sql<string>`COALESCE(SUM(${orderItems.commissionAmount}::numeric), 0)`,
  }).from(orderItems).where(eq(orderItems.vendorId, vendor.id));

  const [pendingOrders] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(orderItems).where(and(eq(orderItems.vendorId, vendor.id), eq(orderItems.vendorStatus, 'pending')));

  const [productCountResult] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(products).where(eq(products.vendorId, vendor.id));

  // Low stock products
  const lowStock = await db
    .select({ id: products.id, name: products.name, stock: products.stock, lowStockThreshold: products.lowStockThreshold })
    .from(products)
    .where(and(
      eq(products.vendorId, vendor.id),
      sql`${products.stock} <= ${products.lowStockThreshold}`,
      eq(products.isActive, true),
    ))
    .limit(10);

  // Recent orders
  const recentOrderItems = await db
    .select({
      id: orderItems.id, orderId: orderItems.orderId,
      productName: orderItems.productName, quantity: orderItems.quantity,
      total: orderItems.total, vendorStatus: orderItems.vendorStatus,
      createdAt: orderItems.createdAt,
      orderNumber: orders.orderNumber,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(eq(orderItems.vendorId, vendor.id))
    .orderBy(desc(orderItems.createdAt))
    .limit(5);

  const limits = await getVendorLimits(vendor.id);

  return sendSuccess(c, {
    sales: {
      totalOrders: stats?.totalOrders ?? 0,
      totalRevenue: stats?.totalRevenue ?? '0',
      totalCommission: stats?.totalCommission ?? '0',
      pendingOrders: pendingOrders?.count ?? 0,
      totalProducts: productCountResult?.count ?? 0,
    },
    lowStockProducts: lowStock,
    recentOrders: recentOrderItems,
    isBostaEnabled: !!env.BOSTA_API_KEY && limits.autoShippingEnabled,
    advancedAnalyticsEnabled: limits.advancedAnalytics,
    currentPlan: limits.planName
  });
});

// GET /api/vendor/products
vendorRoutes.get('/products', validate('query', paginationSchema), async (c) => {
  const vendor = c.get('vendor');
  const { page, limit } = getValidated<z.infer<typeof paginationSchema>>(c, 'query');

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(products)
    .where(eq(products.vendorId, vendor.id));
  const total = countResult?.count ?? 0;

  const productList = await db.select().from(products)
    .where(eq(products.vendorId, vendor.id))
    .orderBy(desc(products.createdAt))
    .limit(limit).offset(getOffset(page, limit));

  const productIds = productList.map(p => p.id);
  const images = productIds.length > 0
    ? await db.select().from(productImages).where(sql`${productImages.productId} IN ${productIds}`).orderBy(asc(productImages.sortOrder))
    : [];

  const withImages = productList.map(p => ({
    ...p,
    images: images.filter(img => img.productId === p.id),
  }));

  return sendSuccess(c, withImages, 200, getPaginationMeta(page, limit, total));
});

// POST /api/vendor/products
vendorRoutes.post('/products', validate('body', productSchema), async (c) => {
  const vendor = c.get('vendor');
  const input = getValidated<z.infer<typeof productSchema>>(c, 'body');

  const limits = await getVendorLimits(vendor.id);
  
  if (limits.productLimit !== null) {
    const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(products)
      .where(eq(products.vendorId, vendor.id));
    if ((countResult?.count ?? 0) >= limits.productLimit) {
      throw AppError.badRequest(`لقد وصلت للحد الأقصى للمنتجات (${limits.productLimit}) في باقة ${limits.planName}. يرجى الترقية لإضافة المزيد.`);
    }
  }

  const slug = slugify(input.name) + '-' + Math.random().toString(36).substring(2, 7);

  const [product] = await db.insert(products).values({
    vendorId: vendor.id,
    categoryId: input.categoryId,
    name: input.name,
    slug,
    description: input.description,
    price: input.price,
    comparePrice: input.comparePrice,
    sku: input.sku,
    stock: input.stock,
    lowStockThreshold: input.lowStockThreshold,
    isActive: input.isActive,
  }).returning();

  // Update vendor product count
  await db.update(vendors).set({
    totalProducts: sql`${vendors.totalProducts} + 1`,
    updatedAt: new Date(),
  }).where(eq(vendors.id, vendor.id));

  return sendCreated(c, product);
});

// PUT /api/vendor/products/:id
vendorRoutes.put('/products/:id', validate('body', productSchema.partial()), async (c) => {
  const vendor = c.get('vendor');
  const productId = parseInt(c.req.param('id')!, 10);
  if (Number.isNaN(productId)) throw AppError.badRequest('معرف غير صالح');
  const input = getValidated<Partial<z.infer<typeof productSchema>>>(c, 'body');

  // Ownership check
  const [existing] = await db.select().from(products)
    .where(and(eq(products.id, productId), eq(products.vendorId, vendor.id))).limit(1);
  if (!existing) throw AppError.notFound('المنتج');

  const [updated] = await db.update(products).set({
    ...input,
    updatedAt: new Date(),
  }).where(eq(products.id, productId)).returning();

  return sendSuccess(c, updated);
});

// DELETE /api/vendor/products/:id
vendorRoutes.delete('/products/:id', async (c) => {
  const vendor = c.get('vendor');
  const productId = parseInt(c.req.param('id')!, 10);
  if (Number.isNaN(productId)) throw AppError.badRequest('معرف غير صالح');

  const [existing] = await db.select().from(products)
    .where(and(eq(products.id, productId), eq(products.vendorId, vendor.id))).limit(1);
  if (!existing) throw AppError.notFound('المنتج');

  // Delete images from disk
  const imgs = await db.select().from(productImages).where(eq(productImages.productId, productId));
  for (const img of imgs) {
    await deleteImage(img.imageUrl);
  }

  await db.delete(products).where(eq(products.id, productId));
  
  await db.update(vendors).set({
    totalProducts: sql`GREATEST(${vendors.totalProducts} - 1, 0)`,
    updatedAt: new Date(),
  }).where(eq(vendors.id, vendor.id));

  return sendSuccess(c, { message: 'تم حذف المنتج' });
});

// GET /api/vendor/test-r2-ssl (development only)
vendorRoutes.get('/test-r2-ssl', async (c) => {
  if (env.NODE_ENV === 'production') {
    throw AppError.notFound('المسار غير موجود');
  }
  try {
    const fetchRes = await fetch(`https://${env.R2_ACCOUNT_ID?.trim()}.r2.cloudflarestorage.com`);
    return c.json({ success: true, status: fetchRes.status });
  } catch (err: any) {
    return c.json({ success: false, error: err.message });
  }
});

// POST /api/vendor/products/:id/images
vendorRoutes.post('/products/:id/images', uploadRateLimit, async (c) => {
  const vendor = c.get('vendor');
  const productId = parseInt(c.req.param('id')!, 10);
  if (Number.isNaN(productId)) throw AppError.badRequest('معرف غير صالح');

  const [existing] = await db.select({ id: products.id }).from(products)
    .where(and(eq(products.id, productId), eq(products.vendorId, vendor.id))).limit(1);
  if (!existing) throw AppError.notFound('المنتج');

  // Check current image count
  const [imgCount] = await db.select({ count: sql<number>`count(*)::int` }).from(productImages)
    .where(eq(productImages.productId, productId));
    
  const limits = await getVendorLimits(vendor.id);
  
  if ((imgCount?.count ?? 0) >= limits.imageLimitPerProduct) {
    throw AppError.badRequest(`الحد الأقصى ${limits.imageLimitPerProduct} صور للمنتج في باقة ${limits.planName}. يرجى الترقية لإضافة المزيد.`);
  }

  const body = await c.req.parseBody();
  const file = body['image'];
  if (!file || !(file instanceof File)) {
    throw AppError.badRequest('الصورة مطلوبة');
  }

  // Check MIME type
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(file.type)) {
    throw AppError.badRequest('نوع الملف غير مسموح. الأنواع المقبولة: JPEG, PNG, WebP');
  }

  // Check size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw AppError.badRequest('حجم الملف يتجاوز 5 ميجابايت');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  
  // Validate magic bytes
  if (!validateImageMagicBytes(buffer)) {
    throw AppError.badRequest('نوع الملف غير مسموح');
  }

  let imageUrl: string;
  try {
    imageUrl = await processImage(buffer);
  } catch (err: any) {
    console.error('Image processing/upload failed:', err);
    throw AppError.internal('فشل رفع الصورة');
  }

  const [image] = await db.insert(productImages).values({
    productId,
    imageUrl,
    altText: file.name,
    sortOrder: (imgCount?.count ?? 0),
  }).returning();

  return sendCreated(c, image);
});

// DELETE /api/vendor/products/:id/images/:imgId
vendorRoutes.delete('/products/:id/images/:imgId', async (c) => {
  const vendor = c.get('vendor');
  const productId = parseInt(c.req.param('id')!, 10);
  const imgId = parseInt(c.req.param('imgId')!, 10);
  if (Number.isNaN(productId) || Number.isNaN(imgId)) throw AppError.badRequest('معرف غير صالح');

  const [existing] = await db.select({ id: products.id }).from(products)
    .where(and(eq(products.id, productId), eq(products.vendorId, vendor.id))).limit(1);
  if (!existing) throw AppError.notFound('المنتج');

  const [img] = await db.select().from(productImages)
    .where(and(eq(productImages.id, imgId), eq(productImages.productId, productId))).limit(1);
  if (!img) throw AppError.notFound('الصورة');

  await deleteImage(img.imageUrl);
  await db.delete(productImages).where(eq(productImages.id, imgId));

  return sendSuccess(c, { message: 'تم حذف الصورة' });
});

// GET /api/vendor/orders
vendorRoutes.get('/orders', validate('query', paginationSchema), async (c) => {
  const vendor = c.get('vendor');
  const { page, limit } = getValidated<z.infer<typeof paginationSchema>>(c, 'query');

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(orderItems).where(eq(orderItems.vendorId, vendor.id));
  const total = countResult?.count ?? 0;

  const items = await db
    .select({
      id: orderItems.id, orderId: orderItems.orderId,
      productName: orderItems.productName, productImage: orderItems.productImage,
      price: orderItems.price, quantity: orderItems.quantity,
      total: orderItems.total, vendorStatus: orderItems.vendorStatus,
      trackingNumber: orderItems.trackingNumber,
      commissionAmount: orderItems.commissionAmount,
      vendorAmount: orderItems.vendorAmount,
      createdAt: orderItems.createdAt,
      orderNumber: orders.orderNumber,
      customerName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      shippingCity: orders.shippingCity,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(users, eq(orders.customerId, users.id))
    .where(eq(orderItems.vendorId, vendor.id))
    .orderBy(desc(orderItems.createdAt))
    .limit(limit).offset(getOffset(page, limit));

  return sendSuccess(c, items, 200, {
    ...getPaginationMeta(page, limit, total),
    isBostaEnabled: !!env.BOSTA_API_KEY
  });
});

// PUT /api/vendor/orders/:itemId/status
vendorRoutes.put('/orders/:itemId/status', validate('body', updateStatusSchema), async (c) => {
  const vendor = c.get('vendor');
  const itemId = parseInt(c.req.param('itemId')!, 10);
  if (Number.isNaN(itemId)) throw AppError.badRequest('معرف غير صالح');
  const input = getValidated<z.infer<typeof updateStatusSchema>>(c, 'body');

  // Pre-flight: ownership + current status check (outside tx for early error)
  const [preItem] = await db.select().from(orderItems)
    .where(and(eq(orderItems.id, itemId), eq(orderItems.vendorId, vendor.id))).limit(1);
  if (!preItem) throw AppError.notFound('عنصر الطلب');

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    pending: ['confirmed'],
    confirmed: ['shipped'],
    shipped: ['delivered'],
  };

  const allowed = validTransitions[preItem.vendorStatus] ?? [];
  if (!allowed.includes(input.status)) {
    throw AppError.badRequest(`لا يمكن تغيير الحالة من "${preItem.vendorStatus}" إلى "${input.status}"`);
  }

  if (input.status === 'delivered') {
    // ATOMIC TRANSACTION: commission recording + vendor balance + product stats + order status
    // Re-fetching item inside the tx with FOR UPDATE prevents double-delivery races
    // (two concurrent requests for the same itemId both passing the pre-flight above)
    await db.transaction(async (tx) => {
      // Get the order item to lock it (without leftJoin to avoid Postgres FOR UPDATE outer join error)
      const [lockedItem] = await tx
        .select()
        .from(orderItems)
        .where(
          and(
            eq(orderItems.id, itemId),
            eq(orderItems.vendorId, vendor.id)
          )
        )
        .limit(1)
        .for('update');

      if (!lockedItem) {
        throw AppError.notFound('عنصر الطلب');
      }
      
      let categoryId: number | undefined = undefined;
      if (lockedItem.productId) {
        const [prod] = await tx.select({ categoryId: products.categoryId })
          .from(products)
          .where(eq(products.id, lockedItem.productId));
        categoryId = prod?.categoryId ?? undefined;
      }

      if (lockedItem.vendorStatus === 'delivered') {
        throw AppError.badRequest('هذا العنصر تم تسليمه بالفعل');
      }
      if (lockedItem.vendorStatus !== 'shipped') {
        throw AppError.badRequest(`لا يمكن تغيير الحالة من "${lockedItem.vendorStatus}" إلى "delivered"`);
      }

      const saleAmount = parseFloat(lockedItem.total);
      
      const commissionRate = await resolveCommissionRate(vendor.id, categoryId ?? 0);
      const commissionAmount = saleAmount * (commissionRate / 100);
      const vendorAmount = saleAmount - commissionAmount;

      // Read vendor balance INSIDE the tx (prevents stale read-then-write race on balance)
      const [vendorRecord] = await tx
        .select({ totalSales: vendors.totalSales })
        .from(vendors)
        .where(eq(vendors.id, vendor.id))
        .for('update')
        .limit(1);
      const balanceBefore = parseFloat(vendorRecord?.totalSales ?? '0');
      const balanceAfter = balanceBefore + vendorAmount;

      // 1. Record commission transaction (auditable, immutable ledger entry)
      await tx.insert(transactions).values({
        vendorId: vendor.id,
        orderItemId: lockedItem.id,
        type: 'commission',
        amount: vendorAmount.toFixed(2),
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        description: `عمولة من الطلب - ${lockedItem.productName}`,
      });

      // 2. Atomic vendor totalSales increment
      await tx.update(vendors).set({
        totalSales: balanceAfter.toFixed(2),
        updatedAt: new Date(),
      }).where(eq(vendors.id, vendor.id));

      // 3. Atomic product totalSold increment
      if (lockedItem.productId) {
        await tx.update(products).set({
          totalSold: sql`${products.totalSold} + ${lockedItem.quantity}`,
        }).where(eq(products.id, lockedItem.productId));
      }

      // 4. Update the order item itself (set status, deliveredAt, and updated commission)
      const nowDate = new Date();
      await tx.update(orderItems).set({
        vendorStatus: 'delivered',
        deliveredAt: nowDate,
        updatedAt: nowDate,
        commissionRate: commissionRate.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        vendorAmount: vendorAmount.toFixed(2),
      }).where(eq(orderItems.id, lockedItem.id));

      // 5. Check if ALL sibling items are now delivered or cancelled → close the parent order
      const allSiblings = await tx
        .select({ id: orderItems.id, vendorStatus: orderItems.vendorStatus })
        .from(orderItems)
        .where(eq(orderItems.orderId, lockedItem.orderId));

      // Exclude the current item (already set to delivered above) from the "pending" check
      const stillPending = allSiblings.filter(
        i => i.id !== itemId && i.vendorStatus !== 'delivered' && i.vendorStatus !== 'cancelled'
      );

      if (stillPending.length === 0) {
        await tx.update(orders)
          .set({ status: 'delivered', updatedAt: nowDate })
          .where(eq(orders.id, lockedItem.orderId));
      }
    });

    // Return fresh state after committed transaction
    const [updated] = await db.select().from(orderItems).where(eq(orderItems.id, itemId)).limit(1);
    return sendSuccess(c, updated);
  }

  // ── Non-delivered transitions (confirmed / shipped) — simple atomic update ──
  const updateData: Record<string, unknown> = {
    vendorStatus: input.status,
    updatedAt: new Date(),
  };
  if (input.status === 'shipped') {
    updateData['shippedAt'] = new Date();
    if (input.trackingNumber) updateData['trackingNumber'] = input.trackingNumber;
  }

  const [updated] = await db.update(orderItems).set(updateData)
    .where(eq(orderItems.id, itemId)).returning();

  // ── Aggregate order status: read ALL sibling items and compute ──
  const allSiblings = await db
    .select({ id: orderItems.id, vendorStatus: orderItems.vendorStatus })
    .from(orderItems)
    .where(eq(orderItems.orderId, preItem.orderId));

  const computedStatus = calculateOrderStatus(allSiblings, itemId, input.status);

  // Read current order status to enforce "never regress"
  const [currentOrder] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, preItem.orderId))
    .limit(1);

  if (currentOrder && shouldAdvanceOrderStatus(currentOrder.status, computedStatus)) {
    await db.update(orders)
      .set({ status: computedStatus, updatedAt: new Date() })
      .where(eq(orders.id, preItem.orderId));
  }

  return sendSuccess(c, updated);
});

// POST /api/vendor/orders/:itemId/ship
vendorRoutes.post('/orders/:itemId/ship', validate('body', createShipmentSchema), async (c) => {
  const vendor = c.get('vendor');
  const itemId = parseInt(c.req.param('itemId')!, 10);
  if (Number.isNaN(itemId)) throw AppError.badRequest('معرف غير صالح');
  const input = getValidated<z.infer<typeof createShipmentSchema>>(c, 'body');

  const [item] = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      vendorStatus: orderItems.vendorStatus,
      quantity: orderItems.quantity,
      productName: orderItems.productName,
    })
    .from(orderItems)
    .where(and(eq(orderItems.id, itemId), eq(orderItems.vendorId, vendor.id)))
    .limit(1);

  if (!item) throw AppError.notFound('عنصر الطلب');
  if (item.vendorStatus !== 'confirmed' && item.vendorStatus !== 'pending') {
    throw AppError.badRequest('يجب أن يكون الطلب مؤكدًا قبل الشحن');
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, item.orderId)).limit(1);
  if (!order) throw AppError.notFound('الطلب غير موجود');
  
  if (input.provider === 'bosta') {
    const limits = await getVendorLimits(vendor.id);
    if (!limits.autoShippingEnabled) {
      throw AppError.badRequest(`الشحن الآلي عبر Bosta غير متاح في باقة ${limits.planName}. يرجى الترقية.`);
    }
  }

  const pickupAddress = { city: 'VendorCity' };
  const dropoffAddress = {
    city: order.shippingCity,
    address: order.shippingAddressLine1,
    phone: order.shippingPhone,
  };

  const provider = ShippingFactory.getProvider(input.provider);
  const shipmentResult = await provider.createShipment({
    orderId: order.id,
    vendorId: vendor.id,
    pickupAddress,
    dropoffAddress,
    items: [item],
  });

  const finalTrackingNumber = input.trackingNumber || shipmentResult.trackingNumber;

  const [shipment] = await db.transaction(async (tx) => {
    const [newShipment] = await tx.insert(shipments).values({
      orderId: order.id,
      vendorId: vendor.id,
      provider: input.provider,
      providerShipmentId: shipmentResult.providerShipmentId,
      trackingNumber: finalTrackingNumber,
      status: 'created',
      cost: shipmentResult.cost.toString(),
    }).returning();

    if (!newShipment) {
      throw AppError.internal('فشل إنشاء الشحنة');
    }

    await tx.insert(shipmentEvents).values({
      shipmentId: newShipment.id,
      status: 'created',
      description: 'Shipment created successfully',
    });

    await tx.update(orderItems)
      .set({ 
        vendorStatus: 'shipped', 
        trackingNumber: finalTrackingNumber || undefined,
        shippedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(orderItems.id, itemId));
      
    const allSiblings = await tx
      .select({ id: orderItems.id, vendorStatus: orderItems.vendorStatus })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
      
    const computedStatus = calculateOrderStatus(allSiblings, itemId, 'shipped');
    if (shouldAdvanceOrderStatus(order.status, computedStatus)) {
      await tx.update(orders)
        .set({ status: computedStatus, updatedAt: new Date() })
        .where(eq(orders.id, order.id));
    }
    
    return [newShipment];
  });

  return sendCreated(c, shipment);
});


// GET /api/vendor/settlements
vendorRoutes.get('/settlements', validate('query', paginationSchema), async (c) => {
  const vendor = c.get('vendor');
  const { page, limit } = getValidated<z.infer<typeof paginationSchema>>(c, 'query');

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(settlements)
    .where(eq(settlements.vendorId, vendor.id));
  const total = countResult?.count ?? 0;

  const list = await db.select()
    .from(settlements)
    .where(eq(settlements.vendorId, vendor.id))
    .orderBy(desc(settlements.createdAt))
    .limit(limit).offset(getOffset(page, limit));

  const [vendorRecord] = await db.select({ totalSales: vendors.totalSales })
    .from(vendors).where(eq(vendors.id, vendor.id)).limit(1);

  return sendSuccess(c, {
    settlements: list,
    balance: vendorRecord?.totalSales ?? '0',
  }, 200, getPaginationMeta(page, limit, total));
});

// GET /api/vendor/payouts
vendorRoutes.get('/payouts', async (c) => {
  const vendor = c.get('vendor');
  
  const list = await db.select().from(payoutRequests)
    .where(eq(payoutRequests.vendorId, vendor.id))
    .orderBy(desc(payoutRequests.createdAt));
    
  return sendSuccess(c, list);
});

const payoutRequestSchema = z.object({
  settlementId: z.number().int().positive(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  bankAccountSnapshot: z.any().optional(),
});

// POST /api/vendor/payouts/request
vendorRoutes.post('/payouts/request', validate('body', payoutRequestSchema), async (c) => {
  const vendor = c.get('vendor');
  const input = getValidated<z.infer<typeof payoutRequestSchema>>(c, 'body');

  const limits = await getVendorLimits(vendor.id);

  const request = await db.transaction(async (tx) => {
    const [settlement] = await tx.select().from(settlements)
      .where(and(eq(settlements.id, input.settlementId), eq(settlements.vendorId, vendor.id)))
      .for('update')
      .limit(1);
      
    if (!settlement) throw AppError.notFound('التسوية غير موجودة');
    if (settlement.status !== 'finalized') throw AppError.badRequest('لا يمكن طلب سحب إلا للتسويات المعتمدة');
    
    // Check if non-rejected payout request already exists for this settlement
    const [existing] = await tx.select().from(payoutRequests)
      .where(and(
        eq(payoutRequests.settlementId, input.settlementId),
        ne(payoutRequests.status, 'rejected')
      ))
      .limit(1);
      
    if (existing) throw AppError.badRequest('تم تقديم طلب سحب لهذه التسوية مسبقاً');
    
    const requestAmount = parseFloat(input.amount);
    const availableAmount = parseFloat(settlement.netPayable);
    
    if (requestAmount <= 0 || requestAmount > availableAmount) {
      throw AppError.badRequest('المبلغ المطلوب أكبر من رصيد التسوية');
    }
    
    // Check when the last non-rejected payout request was made
    const [lastRequest] = await tx.select().from(payoutRequests)
      .where(and(
        eq(payoutRequests.vendorId, vendor.id),
        ne(payoutRequests.status, 'rejected')
      ))
      .orderBy(desc(payoutRequests.createdAt))
      .limit(1);

    if (lastRequest) {
      const daysSinceLastRequest = (new Date().getTime() - lastRequest.createdAt.getTime()) / (1000 * 3600 * 24);
      if (daysSinceLastRequest < limits.payoutCycleDays) {
        throw AppError.badRequest(`يمكنك طلب سحب الأرباح كل ${limits.payoutCycleDays} أيام في باقة ${limits.planName}. يرجى الانتظار أو الترقية لباقة أعلى.`);
      }
    }

    const [created] = await tx.insert(payoutRequests).values({
      vendorId: vendor.id,
      settlementId: input.settlementId,
      amount: input.amount,
      bankAccountSnapshot: input.bankAccountSnapshot ?? null,
    }).returning();

    return created;
  });

  return sendCreated(c, request);
});

// GET /api/vendor/settings
vendorRoutes.get('/settings', async (c) => {
  const vendor = c.get('vendor');
  const [v] = await db.select().from(vendors).where(eq(vendors.id, vendor.id)).limit(1);
  if (!v) throw AppError.notFound('حساب البائع');
  return sendSuccess(c, {
    ...v,
    logo: v.storeLogo,
    banner: v.storeBanner
  });
});

// PUT /api/vendor/settings
vendorRoutes.put('/settings', validate('body', updateSettingsSchema), async (c) => {
  const vendor = c.get('vendor');
  const input = getValidated<z.infer<typeof updateSettingsSchema>>(c, 'body');

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.storeName !== undefined) {
    const newSlug = slugify(input.storeName);
    const [existingSlug] = await db.select({ id: vendors.id })
      .from(vendors)
      .where(and(eq(vendors.storeSlug, newSlug), ne(vendors.id, vendor.id)))
      .limit(1);
    if (existingSlug) {
      throw AppError.conflict('اسم المتجر مستخدم بالفعل');
    }
    updateData['storeName'] = input.storeName;
    updateData['storeSlug'] = newSlug;
  }
  if (input.storeDescription !== undefined) updateData['storeDescription'] = input.storeDescription;
  if (input.shippingPolicy !== undefined) updateData['shippingPolicy'] = input.shippingPolicy;
  if (input.returnPolicy !== undefined) updateData['returnPolicy'] = input.returnPolicy;
  if (input.logo !== undefined) updateData['storeLogo'] = input.logo;
  if (input.banner !== undefined) updateData['storeBanner'] = input.banner;

  const [updated] = await db.update(vendors).set(updateData)
    .where(eq(vendors.id, vendor.id)).returning();
  return sendSuccess(c, updated);
});

// GET /api/vendor/notifications
vendorRoutes.get('/notifications', async (c) => {
  const user = c.get('user');
  const list = await db.select().from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  return sendSuccess(c, list);
});

// PUT /api/vendor/notifications/:id/read
vendorRoutes.put('/notifications/:id/read', async (c) => {
  const user = c.get('user');
  const notifId = parseInt(c.req.param('id')!, 10);
  if (Number.isNaN(notifId)) throw AppError.badRequest('معرف غير صالح');

  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.id, notifId), eq(notifications.userId, user.id)));
  return sendSuccess(c, { message: 'تم القراءة' });
});

// ==============================================
// Vendor Subscription API
// ==============================================

vendorRoutes.get('/subscription', async (c) => {
  const vendor = c.get('vendor');

  // Ensure free plan is provisioned if vendor has no active subscription yet
  await getVendorLimits(vendor.id);
  
  const sub = await db.select({
    id: vendorSubscriptions.id,
    status: vendorSubscriptions.status,
    currentPeriodStart: vendorSubscriptions.currentPeriodStart,
    currentPeriodEnd: vendorSubscriptions.currentPeriodEnd,
    autoRenew: vendorSubscriptions.autoRenew,
    planId: subscriptionPlans.id,
    planName: subscriptionPlans.name,
    priceMonthly: subscriptionPlans.priceMonthly,
    commissionRate: subscriptionPlans.commissionRate,
    productLimit: subscriptionPlans.productLimit,
    imageLimitPerProduct: subscriptionPlans.imageLimitPerProduct,
    autoShippingEnabled: subscriptionPlans.autoShippingEnabled,
    advancedAnalytics: subscriptionPlans.advancedAnalytics,
    bulkActionsEnabled: subscriptionPlans.bulkActionsEnabled,
    payoutCycleDays: subscriptionPlans.payoutCycleDays,
    trustBadge: subscriptionPlans.trustBadge,
  })
  .from(vendorSubscriptions)
  .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, vendorSubscriptions.planId))
  .where(eq(vendorSubscriptions.vendorId, vendor.id))
  .limit(1);

  if (!sub.length) {
    return sendSuccess(c, null);
  }

  return sendSuccess(c, sub[0]);
});

vendorRoutes.post('/subscription/subscribe', validate('body', z.object({ planId: z.number().int().positive() })), async (c) => {
  const vendor = c.get('vendor');
  const user = c.get('user');
  const { planId } = getValidated<{planId: number}>(c, 'body');

  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId));
  if (!plan || !plan.isActive) throw AppError.notFound('Plan not found or inactive');

  // Check for active promotion to calculate correct price
  const now = new Date();
  const [promo] = await db.select().from(subscriptionPromotions)
    .where(and(
      eq(subscriptionPromotions.planId, planId),
      eq(subscriptionPromotions.isActive, true),
      lte(subscriptionPromotions.startsAt, now),
      gte(subscriptionPromotions.endsAt, now)
    ));

  let finalPrice = parseFloat(plan.priceMonthly);
  if (promo) {
    const discountPct = parseFloat(promo.discountPercentage);
    finalPrice = Math.max(0, finalPrice * (1 - discountPct / 100));
  }

  const [existingSub] = await db.select().from(vendorSubscriptions).where(eq(vendorSubscriptions.vendorId, vendor.id));

  // If free plan, activate immediately
  if (finalPrice === 0) {
    if (existingSub) {
      await db.update(vendorSubscriptions)
        .set({
          planId: plan.id,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: null,
          autoRenew: true
        })
        .where(eq(vendorSubscriptions.id, existingSub.id));
    } else {
      await db.insert(vendorSubscriptions).values({
        vendorId: vendor.id,
        planId: plan.id,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: null,
        autoRenew: true
      });
    }
    
    // Update commission rules immediately for free plan
    await db.delete(commissionRules).where(and(eq(commissionRules.scope, 'vendor'), eq(commissionRules.targetId, vendor.id)));
    await db.insert(commissionRules).values({
      scope: 'vendor',
      targetId: vendor.id,
      rate: plan.commissionRate,
      priority: 100, // Highest priority
      effectiveFrom: new Date()
    });

    return sendSuccess(c, { message: 'تم تفعيل الباقة المجانية بنجاح', plan });
  }

  // If paid plan, generate Paymob iframe
  const billingData = {
    first_name: user.firstName,
    last_name: user.lastName,
    email: user.email,
    phone_number: '01000000000',
    street: 'NA', building: 'NA', floor: 'NA', apartment: 'NA', city: 'NA', country: 'EG',
  };

  const referenceId = `SUB-${vendor.id}-${plan.id}`;
  const { iframeUrl } = await paymobService.generatePaymentKey(referenceId, finalPrice, billingData);

  // Only create a 'pending_payment' row if the vendor has no subscription row at all,
  // or update planId if the existing row is not active. Do NOT overwrite an 'active' subscription!
  if (!existingSub) {
    await db.insert(vendorSubscriptions).values({
      vendorId: vendor.id,
      planId: plan.id,
      status: 'pending_payment'
    });
  } else if (existingSub.status !== 'active') {
    await db.update(vendorSubscriptions)
      .set({
        planId: plan.id,
        status: 'pending_payment'
      })
      .where(eq(vendorSubscriptions.id, existingSub.id));
  }

  return sendSuccess(c, { iframeUrl, plan });
});

vendorRoutes.post('/subscription/cancel', async (c) => {
  const vendor = c.get('vendor');
  
  const [sub] = await db.update(vendorSubscriptions)
    .set({ autoRenew: false })
    .where(and(eq(vendorSubscriptions.vendorId, vendor.id), eq(vendorSubscriptions.status, 'active')))
    .returning();

  if (!sub) throw AppError.notFound('No active subscription found');

  return sendSuccess(c, { message: 'تم إيقاف التجديد التلقائي. ستظل باقتك فعالة حتى نهاية الفترة الحالية.' });
});

export default vendorRoutes;
