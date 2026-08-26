import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { products, categories, vendors, productImages, reviews, siteSettings, subscriptionPlans, subscriptionPromotions, vendorSubscriptions } from '../db/schema/index.js';
import { eq, and, gte, lte, like, desc, asc, sql, ilike } from 'drizzle-orm';
import { sendSuccess } from '../utils/response.js';
import { getPaginationMeta, getOffset, paginationSchema } from '../utils/pagination.js';
import { validate, getValidated } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/authenticate.js';

const storeRoutes = new Hono();

// GET /api/store/settings
storeRoutes.get('/settings', async (c: any) => {
  const [siteNameSetting] = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, 'site_name')).limit(1);
  return sendSuccess(c, { siteName: siteNameSetting?.value || 'سوق مصر' });
});

// GET /api/store/home — homepage data
storeRoutes.get('/home', async (c) => {
  // Featured products
  const featuredProducts = await db
    .select({
      id: products.id, name: products.name, slug: products.slug,
      price: products.price, comparePrice: products.comparePrice,
      rating: products.rating, reviewCount: products.reviewCount,
      totalSold: products.totalSold, stock: products.stock,
      vendorId: products.vendorId,
    })
    .from(products)
    .where(and(eq(products.isActive, true), eq(products.isFeatured, true)))
    .orderBy(desc(products.createdAt))
    .limit(12);

  // Get images for featured products
  const featuredIds = featuredProducts.map(p => p.id);
  const featuredImagesResult = featuredIds.length > 0
    ? await db.select().from(productImages).where(sql`${productImages.productId} IN ${featuredIds}`).orderBy(asc(productImages.sortOrder))
    : [];

  const featuredWithImages = featuredProducts.map(p => ({
    ...p,
    images: featuredImagesResult.filter(img => img.productId === p.id),
  }));

  // Top-level categories
  const topCategories = await db
    .select()
    .from(categories)
    .where(and(eq(categories.isActive, true), sql`${categories.parentId} IS NULL`))
    .orderBy(asc(categories.sortOrder));

  // New arrivals
  const newArrivals = await db
    .select({
      id: products.id, name: products.name, slug: products.slug,
      price: products.price, comparePrice: products.comparePrice,
      rating: products.rating, reviewCount: products.reviewCount, stock: products.stock,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(desc(products.createdAt))
    .limit(8);

  const newArrivalIds = newArrivals.map(p => p.id);
  const newArrivalImages = newArrivalIds.length > 0
    ? await db.select().from(productImages).where(sql`${productImages.productId} IN ${newArrivalIds}`).orderBy(asc(productImages.sortOrder))
    : [];

  const newArrivalsWithImages = newArrivals.map(p => ({
    ...p,
    images: newArrivalImages.filter(img => img.productId === p.id),
  }));

  const [siteNameSetting] = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, 'site_name')).limit(1);

  return sendSuccess(c, {
    siteName: siteNameSetting?.value || 'المنصة',
    featuredProducts: featuredWithImages,
    categories: topCategories,
    newArrivals: newArrivalsWithImages,
  });
});

// GET /api/store/categories
storeRoutes.get('/categories', async (c) => {
  const allCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder));

  // Build tree
  const topLevel = allCategories.filter(cat => !cat.parentId);
  const tree = topLevel.map(parent => ({
    ...parent,
    children: allCategories.filter(child => child.parentId === parent.id),
  }));

  return sendSuccess(c, tree);
});

// GET /api/store/categories/:slug
storeRoutes.get('/categories/:slug', async (c) => {
  const slug = c.req.param('slug');
  const [category] = await db.select().from(categories).where(eq(categories.slug, slug!)).limit(1);
  
  if (!category) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'القسم غير موجود' } }, 404);
  }

  const subcategories = await db.select().from(categories)
    .where(and(eq(categories.parentId, category.id), eq(categories.isActive, true)))
    .orderBy(asc(categories.sortOrder));

  return sendSuccess(c, { ...category, children: subcategories });
});

const productQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  category: z.string().optional(),
  vendor: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular', 'rating']).default('newest'),
  featured: z.coerce.boolean().optional(),
});

// GET /api/store/products
storeRoutes.get('/products', validate('query', productQuerySchema), async (c) => {
  const query = getValidated<z.infer<typeof productQuerySchema>>(c, 'query');
  const conditions = [eq(products.isActive, true)];

  if (query.search) {
    conditions.push(ilike(products.name, `%${query.search}%`));
  }
  if (query.category) {
    const [cat] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, query.category)).limit(1);
    if (cat) {
      // Include subcategory products too
      const subcats = await db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, cat.id));
      const catIds = [cat.id, ...subcats.map(s => s.id)];
      conditions.push(sql`${products.categoryId} IN ${catIds}`);
    }
  }
  if (query.vendor) {
    const [v] = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.storeSlug, query.vendor)).limit(1);
    if (v) conditions.push(eq(products.vendorId, v.id));
  }
  if (query.minPrice !== undefined) {
    conditions.push(gte(products.price, String(query.minPrice)));
  }
  if (query.maxPrice !== undefined) {
    conditions.push(lte(products.price, String(query.maxPrice)));
  }
  if (query.featured) {
    conditions.push(eq(products.isFeatured, true));
  }

  const whereClause = and(...conditions);

  const sortMap = {
    newest: desc(products.createdAt),
    price_asc: asc(products.price),
    price_desc: desc(products.price),
    popular: desc(products.totalSold),
    rating: desc(products.rating),
  };

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(whereClause);
  const total = countResult?.count ?? 0;

  const offset = getOffset(query.page, query.limit);
  const productList = await db
    .select({
      id: products.id, name: products.name, slug: products.slug,
      price: products.price, comparePrice: products.comparePrice,
      rating: products.rating, reviewCount: products.reviewCount,
      totalSold: products.totalSold, stock: products.stock,
      vendorId: products.vendorId, categoryId: products.categoryId,
      createdAt: products.createdAt,
    })
    .from(products)
    .where(whereClause)
    .orderBy(sortMap[query.sort])
    .limit(query.limit)
    .offset(offset);

  // Get first image for each product
  const productIds = productList.map(p => p.id);
  const images = productIds.length > 0
    ? await db.select().from(productImages).where(sql`${productImages.productId} IN ${productIds}`).orderBy(asc(productImages.sortOrder))
    : [];

  const productsWithImages = productList.map(p => ({
    ...p,
    images: images.filter(img => img.productId === p.id),
  }));

  return sendSuccess(c, productsWithImages, 200, getPaginationMeta(query.page, query.limit, total));
});

// GET /api/store/products/:slug
storeRoutes.get('/products/:slug', async (c) => {
  const slug = c.req.param('slug');
  const [product] = await db.select().from(products).where(and(eq(products.slug, slug!), eq(products.isActive, true))).limit(1);

  if (!product) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'المنتج غير موجود' } }, 404);
  }

  // Fire-and-forget view count increment (non-blocking)
  db.update(products).set({ viewCount: sql`${products.viewCount} + 1` }).where(eq(products.id, product.id)).then(() => {}).catch(() => {});

  // Get images
  const imgs = await db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(asc(productImages.sortOrder));

  // Get vendor info
  const [vendor] = await db
    .select({ 
      id: vendors.id, 
      storeName: vendors.storeName, 
      storeSlug: vendors.storeSlug, 
      rating: vendors.rating, 
      reviewCount: vendors.reviewCount,
      subscriptionPlanSlug: subscriptionPlans.slug
    })
    .from(vendors)
    .leftJoin(vendorSubscriptions, and(eq(vendorSubscriptions.vendorId, vendors.id), eq(vendorSubscriptions.status, 'active')))
    .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, vendorSubscriptions.planId))
    .where(eq(vendors.id, product.vendorId))
    .limit(1);

  // Get category
  const [category] = await db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .where(eq(categories.id, product.categoryId))
    .limit(1);

  // Get recent reviews
  const productReviews = await db
    .select({
      id: reviews.id, rating: reviews.rating, title: reviews.title,
      comment: reviews.comment, isVerifiedPurchase: reviews.isVerifiedPurchase,
      vendorReply: reviews.vendorReply, createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(and(eq(reviews.productId, product.id), eq(reviews.isVisible, true)))
    .orderBy(desc(reviews.createdAt))
    .limit(10);

  return sendSuccess(c, {
    ...product,
    images: imgs,
    vendor,
    category,
    reviews: productReviews,
  });
});

// GET /api/store/vendors/:slug
storeRoutes.get('/vendors/:slug', async (c) => {
  const slug = c.req.param('slug');
  const [vendor] = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.storeSlug, slug!), eq(vendors.status, 'approved')))
    .limit(1);

  if (!vendor) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'المتجر غير موجود' } }, 404);
  }

  const vendorProducts = await db
    .select({
      id: products.id, name: products.name, slug: products.slug,
      price: products.price, comparePrice: products.comparePrice,
      rating: products.rating, reviewCount: products.reviewCount, stock: products.stock,
    })
    .from(products)
    .where(and(eq(products.vendorId, vendor.id), eq(products.isActive, true)))
    .orderBy(desc(products.createdAt))
    .limit(20);

  const productIds = vendorProducts.map(p => p.id);
  const images = productIds.length > 0
    ? await db.select().from(productImages).where(sql`${productImages.productId} IN ${productIds}`).orderBy(asc(productImages.sortOrder))
    : [];

  const productsWithImages = vendorProducts.map(p => ({
    ...p,
    images: images.filter(img => img.productId === p.id),
  }));

  return sendSuccess(c, {
    id: vendor.id,
    storeName: vendor.storeName,
    storeSlug: vendor.storeSlug,
    storeDescription: vendor.storeDescription,
    storeLogo: vendor.storeLogo,
    storeBanner: vendor.storeBanner,
    rating: vendor.rating,
    reviewCount: vendor.reviewCount,
    totalProducts: vendor.totalProducts,
    products: productsWithImages,
  });
});
const contactSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  email: z.string().email('بريد إلكتروني غير صالح'),
  subject: z.string().min(3, 'الموضوع مطلوب'),
  message: z.string().min(10, 'الرسالة قصيرة جداً'),
});

// POST /api/store/contact
import { sendEmail } from '../services/email.service.js';

storeRoutes.post('/contact', validate('body', contactSchema), async (c) => {
  const input = getValidated<z.infer<typeof contactSchema>>(c, 'body');

  // In a real application, you might want to save this to a database
  // and send it to the admin's email.
  // Here we just send an email to a predefined admin address.
  await sendEmail({
    to: 'admin@example.com', // Admin email
    templateKey: 'order_confirmation', // Fallback since we don't have a contact template, or create one
    subject: `رسالة جديدة من نموذج اتصل بنا: ${input.subject}`,
    data: { orderNumber: `Contact: ${input.name} (${input.email})\n\n${input.message}` } // Hack for now
  });

  return sendSuccess(c, { message: 'تم إرسال رسالتك بنجاح. سنتواصل معك قريباً.' });
});

// GET /api/store/subscription-plans
storeRoutes.get('/subscription-plans', async (c) => {
  const plans = await db.select().from(subscriptionPlans)
    .where(eq(subscriptionPlans.isActive, true))
    .orderBy(asc(subscriptionPlans.sortOrder));

  // Get active promotions
  const now = new Date();
  const promotions = await db.select().from(subscriptionPromotions)
    .where(and(
      eq(subscriptionPromotions.isActive, true),
      lte(subscriptionPromotions.startsAt, now),
      gte(subscriptionPromotions.endsAt, now)
    ));

  // Map discounts to plans
  const plansWithDiscounts = plans.map(plan => {
    const promo = promotions.find(p => p.planId === plan.id);
    let finalPrice = plan.priceMonthly;
    if (promo) {
      const discountPct = parseFloat(promo.discountPercentage);
      finalPrice = (parseFloat(plan.priceMonthly) * (1 - discountPct / 100)).toFixed(2);
      if (parseFloat(finalPrice) < 0) finalPrice = '0.00';
    }
    return {
      ...plan,
      originalPrice: plan.priceMonthly,
      priceMonthly: finalPrice,
      hasActivePromotion: !!promo,
      promotionPercentage: promo?.discountPercentage,
      promotionEndsAt: promo?.endsAt,
    };
  });

  return sendSuccess(c, plansWithDiscounts);
});

export default storeRoutes;
