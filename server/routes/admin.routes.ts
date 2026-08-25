import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  users, vendors, products, productImages, orders, orderItems,
  categories, transactions, notifications, auditLog, siteSettings, coupons,
  commissionRules, settlements, payoutRequests, messageLogs
} from '../db/schema/index.js';
import { eq, and, sql, desc, asc, ilike } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate, getValidated } from '../middleware/validate.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { slugify } from '../utils/slugify.js';
import { getPaginationMeta, getOffset, paginationSchema } from '../utils/pagination.js';
import { 
  getAdminOverview, 
  getTopProducts, 
  getTopVendors, 
  getFunnel, 
  getCategoriesAnalytics 
} from '../services/analytics.service.js';
import type { AppEnv } from '../types/env.js';

const adminRoutes = new Hono<AppEnv>();
adminRoutes.use('*', authenticate);

async function logAction(adminId: number, action: string, targetType: string, targetId: number, details?: unknown) {
  await db.insert(auditLog).values({
    adminId,
    action,
    targetType,
    targetId,
    details: details ?? null,
  });
}

// GET /api/admin/analytics/overview
adminRoutes.get('/analytics/overview', requirePermission('analytics.view'), async (c) => {
  const days = parseInt(c.req.query('days') || '30', 10);
  const data = await getAdminOverview(days);
  return sendSuccess(c, data);
});

// GET /api/admin/analytics/top-products
adminRoutes.get('/analytics/top-products', requirePermission('analytics.view'), async (c) => {
  const days = parseInt(c.req.query('days') || '30', 10);
  const data = await getTopProducts(days);
  return sendSuccess(c, data);
});

// GET /api/admin/analytics/top-vendors
adminRoutes.get('/analytics/top-vendors', requirePermission('analytics.view'), async (c) => {
  const days = parseInt(c.req.query('days') || '30', 10);
  const data = await getTopVendors(days);
  return sendSuccess(c, data);
});

// GET /api/admin/analytics/funnel
adminRoutes.get('/analytics/funnel', requirePermission('analytics.view'), async (c) => {
  const data = await getFunnel();
  return sendSuccess(c, data);
});

// GET /api/admin/analytics/categories
adminRoutes.get('/analytics/categories', requirePermission('analytics.view'), async (c) => {
  const data = await getCategoriesAnalytics();
  return sendSuccess(c, data);
});

// GET /api/admin/dashboard
adminRoutes.get('/dashboard', requirePermission('dashboard.view'), async (c) => {
  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const [vendorCount] = await db.select({ count: sql<number>`count(*)::int` }).from(vendors).where(eq(vendors.status, 'approved'));
  const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.isActive, true));
  const [orderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders);
  const [revenueResult] = await db.select({
    total: sql<string>`COALESCE(SUM(${orders.total}::numeric), 0)`,
  }).from(orders).where(sql`${orders.status} != 'cancelled'`);

  const [pendingVendors] = await db.select({ count: sql<number>`count(*)::int` }).from(vendors).where(eq(vendors.status, 'pending'));

  const recentOrders = await db.select({
    id: orders.id, orderNumber: orders.orderNumber, total: orders.total,
    status: orders.status, createdAt: orders.createdAt,
    customerName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
  }).from(orders)
    .innerJoin(users, eq(orders.customerId, users.id))
    .orderBy(desc(orders.createdAt)).limit(10);

  return sendSuccess(c, {
    stats: {
      totalUsers: userCount?.count ?? 0,
      totalVendors: vendorCount?.count ?? 0,
      totalProducts: productCount?.count ?? 0,
      totalOrders: orderCount?.count ?? 0,
      totalRevenue: revenueResult?.total ?? '0',
      pendingVendors: pendingVendors?.count ?? 0,
    },
    recentOrders,
  });
});

// GET /api/admin/vendors
adminRoutes.get('/vendors', requirePermission('vendors.approve'), validate('query', paginationSchema.extend({
  status: z.string().optional(),
})), async (c) => {
  const { page, limit, status } = getValidated<z.infer<typeof paginationSchema> & { status?: string }>(c, 'query');
  
  const conditions = [];
  if (status) conditions.push(eq(vendors.status, status));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(vendors).where(whereClause);
  const total = countResult?.count ?? 0;

  const vendorList = await db
    .select({
      id: vendors.id, storeName: vendors.storeName, storeSlug: vendors.storeSlug,
      status: vendors.status, commissionRate: vendors.commissionRate,
      totalSales: vendors.totalSales, totalProducts: vendors.totalProducts,
      rating: vendors.rating, createdAt: vendors.createdAt,
      ownerName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      ownerEmail: users.email,
    })
    .from(vendors)
    .innerJoin(users, eq(vendors.userId, users.id))
    .where(whereClause)
    .orderBy(desc(vendors.createdAt))
    .limit(limit).offset(getOffset(page, limit));

  return sendSuccess(c, vendorList, 200, getPaginationMeta(page, limit, total));
});

// GET /api/admin/vendors/:id
adminRoutes.get('/vendors/:id', requirePermission('vendors.approve'), async (c) => {
  const vendorId = parseInt(c.req.param('id')!, 10);
  const [vendor] = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
  if (!vendor) throw AppError.notFound('البائع');

  const [owner] = await db.select({
    email: users.email, firstName: users.firstName, lastName: users.lastName, phone: users.phone,
  }).from(users).where(eq(users.id, vendor.userId)).limit(1);

  const vendorProducts = await db.select().from(products)
    .where(eq(products.vendorId, vendorId)).orderBy(desc(products.createdAt)).limit(20);

  return sendSuccess(c, { ...vendor, owner, products: vendorProducts });
});

const approveSchema = z.object({ commissionRate: z.string().regex(/^\d+(\.\d{1,2})?$/).optional() }).strict();
const rejectSchema = z.object({ reason: z.string().min(1, 'سبب الرفض مطلوب').max(1000) }).strict();

// PUT /api/admin/vendors/:id/approve
adminRoutes.put('/vendors/:id/approve', requirePermission('vendors.approve'), validate('body', approveSchema), async (c) => {
  const admin = c.get('user');
  const vendorId = parseInt(c.req.param('id')!, 10);
  const input = getValidated<z.infer<typeof approveSchema>>(c, 'body');

  const [vendor] = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
  if (!vendor) throw AppError.notFound('البائع');

  const updateData: Record<string, unknown> = {
    status: 'approved', approvedAt: new Date(), updatedAt: new Date(),
  };
  if (input.commissionRate) updateData['commissionRate'] = input.commissionRate;

  await db.update(vendors).set(updateData).where(eq(vendors.id, vendorId));

  await db.insert(notifications).values({
    userId: vendor.userId,
    title: 'تم تفعيل متجرك',
    message: 'تمت الموافقة على متجرك ويمكنك الآن إضافة المنتجات',
    type: 'vendor_approved',
    actionUrl: '/vendor/dashboard',
  });

  await logAction(admin.id, 'vendor.approve', 'vendor', vendorId, { commissionRate: input.commissionRate });
  return sendSuccess(c, { message: 'تمت الموافقة على البائع' });
});

// PUT /api/admin/vendors/:id/reject
adminRoutes.put('/vendors/:id/reject', requirePermission('vendors.approve'), validate('body', rejectSchema), async (c) => {
  const admin = c.get('user');
  const vendorId = parseInt(c.req.param('id')!, 10);
  const input = getValidated<z.infer<typeof rejectSchema>>(c, 'body');

  const [vendor] = await db.select().from(vendors).where(eq(vendors.id, vendorId)).limit(1);
  if (!vendor) throw AppError.notFound('البائع');

  await db.update(vendors).set({
    status: 'rejected', rejectionReason: input.reason, updatedAt: new Date(),
  }).where(eq(vendors.id, vendorId));

  await db.insert(notifications).values({
    userId: vendor.userId,
    title: 'تم رفض طلب المتجر',
    message: `سبب الرفض: ${input.reason}`,
    type: 'vendor_rejected',
  });

  await logAction(admin.id, 'vendor.reject', 'vendor', vendorId, { reason: input.reason });
  return sendSuccess(c, { message: 'تم رفض البائع' });
});

// PUT /api/admin/vendors/:id/suspend
adminRoutes.put('/vendors/:id/suspend', requirePermission('vendors.suspend'), async (c) => {
  const admin = c.get('user');
  const vendorId = parseInt(c.req.param('id')!, 10);

  await db.update(vendors).set({ status: 'suspended', updatedAt: new Date() })
    .where(eq(vendors.id, vendorId));
  await logAction(admin.id, 'vendor.suspend', 'vendor', vendorId);
  return sendSuccess(c, { message: 'تم تعليق البائع' });
});

// GET /api/admin/products
adminRoutes.get('/products', requirePermission('products.moderate'), validate('query', paginationSchema.extend({
  search: z.string().optional(),
})), async (c) => {
  const { page, limit, search } = getValidated<z.infer<typeof paginationSchema> & { search?: string }>(c, 'query');
  
  const conditions = [];
  if (search) conditions.push(ilike(products.name, `%${search}%`));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(whereClause);
  const total = countResult?.count ?? 0;

  const productList = await db
    .select({
      id: products.id, name: products.name, slug: products.slug,
      price: products.price, stock: products.stock, isActive: products.isActive,
      isFeatured: products.isFeatured, rating: products.rating,
      totalSold: products.totalSold, createdAt: products.createdAt,
      vendorName: vendors.storeName,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(vendors, eq(products.vendorId, vendors.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(whereClause)
    .orderBy(desc(products.createdAt))
    .limit(limit).offset(getOffset(page, limit));

  const productIds = productList.map(p => p.id);
  const images = productIds.length > 0
    ? await db.select().from(productImages).where(sql`${productImages.productId} IN ${productIds}`).orderBy(asc(productImages.sortOrder))
    : [];

  const productsWithImages = productList.map(p => ({
    ...p,
    images: images.filter(img => img.productId === p.id),
  }));

  return sendSuccess(c, productsWithImages, 200, getPaginationMeta(page, limit, total));
});

// PUT /api/admin/products/:id/feature
adminRoutes.put('/products/:id/feature', requirePermission('products.moderate'), async (c) => {
  const admin = c.get('user');
  const productId = parseInt(c.req.param('id')!, 10);
  const [product] = await db.select({ isFeatured: products.isFeatured }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw AppError.notFound('المنتج');

  await db.update(products).set({ isFeatured: !product.isFeatured, updatedAt: new Date() })
    .where(eq(products.id, productId));
  await logAction(admin.id, 'product.feature', 'product', productId, { featured: !product.isFeatured });
  return sendSuccess(c, { isFeatured: !product.isFeatured });
});

// PUT /api/admin/products/:id/toggle
adminRoutes.put('/products/:id/toggle', requirePermission('products.moderate'), async (c) => {
  const admin = c.get('user');
  const productId = parseInt(c.req.param('id')!, 10);
  const [product] = await db.select({ isActive: products.isActive }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw AppError.notFound('المنتج');

  await db.update(products).set({ isActive: !product.isActive, updatedAt: new Date() })
    .where(eq(products.id, productId));
  await logAction(admin.id, 'product.toggle', 'product', productId, { active: !product.isActive });
  return sendSuccess(c, { isActive: !product.isActive });
});

// DELETE /api/admin/products/:id
adminRoutes.delete('/products/:id', requirePermission('products.moderate'), async (c) => {
  const admin = c.get('user');
  const productId = parseInt(c.req.param('id')!, 10);
  await db.delete(products).where(eq(products.id, productId));
  await logAction(admin.id, 'product.delete', 'product', productId);
  return sendSuccess(c, { message: 'تم حذف المنتج' });
});

// GET /api/admin/categories
adminRoutes.get('/categories', requirePermission('categories.manage'), async (c) => {
  const allCats = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  const tree = allCats.filter(cat => !cat.parentId).map(parent => ({
    ...parent,
    children: allCats.filter(child => child.parentId === parent.id),
  }));
  return sendSuccess(c, tree);
});

const categorySchema = z.object({
  name: z.string().min(2).max(255).trim(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  parentId: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
}).strict();

// POST /api/admin/categories
adminRoutes.post('/categories', requirePermission('categories.manage'), validate('body', categorySchema), async (c) => {
  const admin = c.get('user');
  const input = getValidated<z.infer<typeof categorySchema>>(c, 'body');
  const slug = slugify(input.name);

  const [existing] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, slug)).limit(1);
  if (existing) throw AppError.conflict('اسم القسم مستخدم بالفعل');

  const [cat] = await db.insert(categories).values({ ...input, slug }).returning();
  await logAction(admin.id, 'category.create', 'category', cat!.id);
  return sendCreated(c, cat);
});

// PUT /api/admin/categories/:id
adminRoutes.put('/categories/:id', requirePermission('categories.manage'), validate('body', categorySchema.partial()), async (c) => {
  const admin = c.get('user');
  const catId = parseInt(c.req.param('id')!, 10);
  const input = getValidated<Partial<z.infer<typeof categorySchema>>>(c, 'body');

  if (input.name) {
    (input as Record<string, unknown>)['slug'] = slugify(input.name);
  }

  const [updated] = await db.update(categories).set(input).where(eq(categories.id, catId)).returning();
  if (!updated) throw AppError.notFound('القسم');
  await logAction(admin.id, 'category.update', 'category', catId);
  return sendSuccess(c, updated);
});

// DELETE /api/admin/categories/:id
adminRoutes.delete('/categories/:id', requirePermission('categories.manage'), async (c) => {
  const admin = c.get('user');
  const catId = parseInt(c.req.param('id')!, 10);

  // Check for products
  const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products)
    .where(eq(products.categoryId, catId));
  if ((productCount?.count ?? 0) > 0) {
    throw AppError.badRequest('لا يمكن حذف قسم يحتوي على منتجات');
  }

  // Check for subcategories
  const [subCount] = await db.select({ count: sql<number>`count(*)::int` }).from(categories)
    .where(eq(categories.parentId, catId));
  if ((subCount?.count ?? 0) > 0) {
    throw AppError.badRequest('لا يمكن حذف قسم يحتوي على أقسام فرعية');
  }

  await db.delete(categories).where(eq(categories.id, catId));
  await logAction(admin.id, 'category.delete', 'category', catId);
  return sendSuccess(c, { message: 'تم حذف القسم' });
});

// GET /api/admin/orders
adminRoutes.get('/orders', requirePermission('orders.view'), validate('query', paginationSchema.extend({
  status: z.string().optional(),
})), async (c) => {
  const { page, limit, status } = getValidated<z.infer<typeof paginationSchema> & { status?: string }>(c, 'query');
  
  const conditions = [];
  if (status) conditions.push(eq(orders.status, status));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(whereClause);
  const total = countResult?.count ?? 0;

  const orderList = await db
    .select({
      id: orders.id, orderNumber: orders.orderNumber, total: orders.total,
      status: orders.status, paymentMethod: orders.paymentMethod,
      shippingCity: orders.shippingCity, createdAt: orders.createdAt,
      customerName: sql<string>`concat(${users.firstName}, ' ', ${users.lastName})`,
      customerEmail: users.email,
    })
    .from(orders)
    .innerJoin(users, eq(orders.customerId, users.id))
    .where(whereClause)
    .orderBy(desc(orders.createdAt))
    .limit(limit).offset(getOffset(page, limit));

  return sendSuccess(c, orderList, 200, getPaginationMeta(page, limit, total));
});

// GET /api/admin/users
adminRoutes.get('/users', requirePermission('users.manage'), validate('query', paginationSchema), async (c) => {
  const { page, limit } = getValidated<z.infer<typeof paginationSchema>>(c, 'query');

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const total = countResult?.count ?? 0;

  const userList = await db.select({
    id: users.id, email: users.email, firstName: users.firstName,
    lastName: users.lastName, role: users.role, isActive: users.isActive,
    createdAt: users.createdAt,
  }).from(users).orderBy(desc(users.createdAt)).limit(limit).offset(getOffset(page, limit));

  return sendSuccess(c, userList, 200, getPaginationMeta(page, limit, total));
});

// PUT /api/admin/users/:id/toggle
adminRoutes.put('/users/:id/toggle', requirePermission('users.manage'), async (c) => {
  const admin = c.get('user');
  const userId = parseInt(c.req.param('id')!, 10);
  if (userId === admin.id) throw AppError.badRequest('لا يمكنك تعطيل حسابك');

  const [user] = await db.select({ isActive: users.isActive }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw AppError.notFound('المستخدم');

  await db.update(users).set({ isActive: !user.isActive, updatedAt: new Date() }).where(eq(users.id, userId));
  await logAction(admin.id, 'user.toggle', 'user', userId, { active: !user.isActive });
  return sendSuccess(c, { isActive: !user.isActive });
});

// GET /api/admin/transactions
adminRoutes.get('/transactions', requirePermission('orders.view'), validate('query', paginationSchema), async (c) => {
  const { page, limit } = getValidated<z.infer<typeof paginationSchema>>(c, 'query');

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(transactions);
  const total = countResult?.count ?? 0;

  const txList = await db
    .select({
      id: transactions.id, type: transactions.type, amount: transactions.amount,
      balanceBefore: transactions.balanceBefore, balanceAfter: transactions.balanceAfter,
      description: transactions.description, createdAt: transactions.createdAt,
      vendorName: vendors.storeName,
    })
    .from(transactions)
    .innerJoin(vendors, eq(transactions.vendorId, vendors.id))
    .orderBy(desc(transactions.createdAt))
    .limit(limit).offset(getOffset(page, limit));

  return sendSuccess(c, txList, 200, getPaginationMeta(page, limit, total));
});

// GET /api/admin/settings
adminRoutes.get('/settings', requirePermission('settings.edit'), async (c) => {
  const settings = await db.select().from(siteSettings);
  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }
  return sendSuccess(c, settingsMap);
});

// PUT /api/admin/settings — strict Zod validation, only allowed keys
const updateSiteSettingsSchema = z.object({
  site_name: z.string().min(1).max(255).optional(),
  default_commission_rate: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  contact_email: z.string().email().max(255).optional(),
  contact_phone: z.string().max(20).optional(),
  default_shipping_fee: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currency: z.string().max(10).optional(),
  min_order_amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
}).strict();

adminRoutes.put('/settings', requirePermission('settings.edit'), validate('body', updateSiteSettingsSchema), async (c) => {
  const admin = c.get('user');
  const input = getValidated<z.infer<typeof updateSiteSettingsSchema>>(c, 'body');

  const entries = Object.entries(input).filter(([, v]) => v !== undefined) as [string, string][];
  if (entries.length === 0) {
    throw AppError.badRequest('لم يتم إرسال أي إعدادات للتحديث');
  }

  for (const [key, value] of entries) {
    await db.insert(siteSettings).values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
  }

  await logAction(admin.id, 'settings.update', 'settings', 0, { keys: entries.map(([k]) => k) });
  return sendSuccess(c, { message: 'تم تحديث الإعدادات' });
});

// Coupons management
const couponSchema = z.object({
  code: z.string().min(3).max(50).transform(s => s.toUpperCase()),
  type: z.enum(['percentage', 'fixed']),
  value: z.string().regex(/^\d+(\.\d{1,2})?$/),
  minOrderAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  usageLimit: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
  expiresAt: z.string().datetime().optional().nullable(),
}).strict();

adminRoutes.get('/coupons', requirePermission('coupons.manage'), async (c) => {
  const list = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  return sendSuccess(c, list);
});

adminRoutes.post('/coupons', requirePermission('coupons.manage'), validate('body', couponSchema), async (c) => {
  const admin = c.get('user');
  const input = getValidated<z.infer<typeof couponSchema>>(c, 'body');
  const [coupon] = await db.insert(coupons).values({
    ...input,
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
  }).returning();

  await logAction(admin.id, 'coupon.create', 'coupon', coupon!.id, { code: input.code });
  return sendCreated(c, coupon);
});

adminRoutes.delete('/coupons/:id', requirePermission('coupons.manage'), async (c) => {
  const admin = c.get('user');
  const couponId = parseInt(c.req.param('id')!, 10);
  await db.delete(coupons).where(eq(coupons.id, couponId));
  await logAction(admin.id, 'coupon.delete', 'coupon', couponId);
  return sendSuccess(c, { message: 'تم حذف الكوبون' });
});
// ==========================================
// 8. Commission Rules (FIZ G3)
// ==========================================
const ruleSchema = z.object({
  scope: z.enum(['global', 'category', 'vendor']),
  targetId: z.number().nullable().optional(),
  rate: z.string().regex(/^\d+(\.\d{1,2})?$/),
  priority: z.number().int().default(0),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().nullable().optional(),
});

adminRoutes.get('/commission-rules', requirePermission('commission.manage'), async (c) => {
  const rules = await db.select().from(commissionRules).orderBy(desc(commissionRules.createdAt));
  return sendSuccess(c, rules);
});

adminRoutes.post('/commission-rules', requirePermission('commission.manage'), validate('body', ruleSchema), async (c) => {
  const input = getValidated<z.infer<typeof ruleSchema>>(c, 'body');
  
  if (input.scope !== 'global' && !input.targetId) {
    throw AppError.badRequest('يجب تحديد targetId للقواعد غير العامة');
  }

  const [rule] = await db.insert(commissionRules).values({
    scope: input.scope,
    targetId: input.targetId || null,
    rate: input.rate,
    priority: input.priority,
    effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : new Date(),
    effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
  }).returning();

  return sendCreated(c, rule);
});

adminRoutes.delete('/commission-rules/:id', requirePermission('commission.manage'), async (c) => {
  const id = parseInt(c.req.param('id')!, 10);
  await db.delete(commissionRules).where(eq(commissionRules.id, id));
  return sendSuccess(c, { message: 'تم حذف القاعدة' });
});

// ==========================================
// 9. Settlements & Payouts (FIZ G3)
// ==========================================
adminRoutes.get('/settlements', requirePermission('payouts.approve'), async (c) => {
  const list = await db.select({
    id: settlements.id,
    vendorId: settlements.vendorId,
    vendorName: vendors.storeName,
    periodStart: settlements.periodStart,
    periodEnd: settlements.periodEnd,
    grossSales: settlements.grossSales,
    totalCommission: settlements.totalCommission,
    netPayable: settlements.netPayable,
    status: settlements.status,
    createdAt: settlements.createdAt
  })
  .from(settlements)
  .innerJoin(vendors, eq(settlements.vendorId, vendors.id))
  .orderBy(desc(settlements.createdAt));
  
  return sendSuccess(c, list);
});

adminRoutes.put('/settlements/:id/finalize', requirePermission('payouts.approve'), async (c) => {
  const id = parseInt(c.req.param('id')!, 10);
  const [settlement] = await db.update(settlements)
    .set({ status: 'finalized' })
    .where(and(eq(settlements.id, id), eq(settlements.status, 'draft')))
    .returning();
    
  if (!settlement) throw AppError.notFound('التسوية غير موجودة أو ليست مسودة');
  return sendSuccess(c, settlement);
});

adminRoutes.get('/payouts', requirePermission('payouts.approve'), async (c) => {
  const list = await db.select({
    id: payoutRequests.id,
    vendorId: payoutRequests.vendorId,
    vendorName: vendors.storeName,
    settlementId: payoutRequests.settlementId,
    amount: payoutRequests.amount,
    status: payoutRequests.status,
    bankAccountSnapshot: payoutRequests.bankAccountSnapshot,
    createdAt: payoutRequests.createdAt,
  })
  .from(payoutRequests)
  .innerJoin(vendors, eq(payoutRequests.vendorId, vendors.id))
  .orderBy(desc(payoutRequests.createdAt));
  
  return sendSuccess(c, list);
});

const payoutActionSchema = z.object({
  reason: z.string().optional(),
});

adminRoutes.put('/payouts/:id/approve', requirePermission('payouts.approve'), async (c) => {
  const id = parseInt(c.req.param('id')!, 10);
  const admin = c.get('user');
  
  const request = await db.transaction(async (tx) => {
    const [req] = await tx.update(payoutRequests)
      .set({ 
        status: 'paid', 
        adminId: admin.id,
        processedAt: new Date()
      })
      .where(and(eq(payoutRequests.id, id), eq(payoutRequests.status, 'pending')))
      .returning();
      
    if (!req) throw AppError.notFound('الطلب غير موجود أو تمت معالجته');
    
    if (req.settlementId) {
      await tx.update(settlements)
        .set({ status: 'paid', paidAt: new Date() })
        .where(eq(settlements.id, req.settlementId));
    }
    
    // Create payout transaction using strict row lock
    const [vendorRecord] = await tx.select({ totalSales: vendors.totalSales })
      .from(vendors)
      .where(eq(vendors.id, req.vendorId))
      .for('update');
      
    const balanceBefore = parseFloat(vendorRecord!.totalSales);
    const balanceAfter = balanceBefore - parseFloat(req.amount);
    
    await tx.insert(transactions).values({
      vendorId: req.vendorId,
      type: 'payout',
      amount: req.amount,
      balanceBefore: balanceBefore.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
      description: `سحب أرباح #${req.id}`,
    });
    
    await tx.update(vendors)
      .set({ totalSales: balanceAfter.toFixed(2), updatedAt: new Date() })
      .where(eq(vendors.id, req.vendorId));

    return req;
  });
  
  return sendSuccess(c, request);
});

adminRoutes.put('/payouts/:id/reject', requirePermission('payouts.approve'), validate('body', payoutActionSchema), async (c) => {
  const id = parseInt(c.req.param('id')!, 10);
  const admin = c.get('user');
  const input = getValidated<z.infer<typeof payoutActionSchema>>(c, 'body');
  
  const [request] = await db.update(payoutRequests)
    .set({ 
      status: 'rejected', 
      adminId: admin.id,
      processedAt: new Date(),
    })
    .where(and(eq(payoutRequests.id, id), eq(payoutRequests.status, 'pending')))
    .returning();
    
  if (!request) throw AppError.notFound('الطلب غير موجود أو تمت معالجته');
  
  return sendSuccess(c, request);
});
// GET /api/admin/message-logs
adminRoutes.get('/message-logs', requirePermission('audit.view'), async (c) => {
  const query = c.req.query();
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.max(1, Math.min(100, parseInt(query.limit || '20')));
  const offset = (page - 1) * limit;

  const conditions = [];
  if (query.channel) conditions.push(eq(messageLogs.channel, query.channel));
  if (query.status) conditions.push(eq(messageLogs.status, query.status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [logs, totalCount] = await Promise.all([
    db.select().from(messageLogs).where(where).orderBy(desc(messageLogs.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(messageLogs).where(where)
  ]);

  return sendSuccess(c, {
    logs,
    meta: getPaginationMeta(Number(totalCount[0]?.count ?? 0), page, limit)
  });
});

export default adminRoutes;
