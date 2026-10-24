import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { products, categories, vendors, productImages, reviews, siteSettings, subscriptionPlans, subscriptionPromotions, vendorSubscriptions } from '../db/schema/index.js';
import { eq, and, gte, lte, desc, asc, sql, ilike, inArray } from 'drizzle-orm';
import { sendSuccess } from '../utils/response.js';
import { getPaginationMeta, getOffset, paginationSchema } from '../utils/pagination.js';
import { validate, getValidated } from '../middleware/validate.js';
import { emailQueue } from '../jobs/email.queue.js';

const storeRoutes = new Hono();

// GET /api/store/settings — only public-safe settings (never exposes ai_api_key or ai_system_prompt)
storeRoutes.get('/settings', async (c: any) => {
  const publicKeys = ['site_name', 'ai_enabled', 'contact_email', 'contact_phone', 'default_shipping_fee', 'currency', 'min_order_amount'];
  const settings = await db.select().from(siteSettings).where(inArray(siteSettings.key, publicKeys));
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));

  return sendSuccess(c, {
    siteName: map['site_name'] || 'سوق مصر',
    ai_enabled: map['ai_enabled'] ?? 'true',
    aiEnabled: map['ai_enabled'] !== 'false',
    contactEmail: map['contact_email'] || '',
    contactPhone: map['contact_phone'] || '',
    defaultShippingFee: map['default_shipping_fee'] || '30',
    currency: map['currency'] || 'EGP',
    minOrderAmount: map['min_order_amount'] || '0',
  });
});

// GET /api/store/home — homepage data
storeRoutes.get('/home', async (c) => {
  // Featured products from approved vendors only
  const featuredProducts = await db
    .select({
      id: products.id, name: products.name, slug: products.slug,
      price: products.price, comparePrice: products.comparePrice,
      rating: products.rating, reviewCount: products.reviewCount,
      totalSold: products.totalSold, stock: products.stock,
      vendorId: products.vendorId,
    })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(and(eq(products.isActive, true), eq(products.isFeatured, true), eq(vendors.status, 'approved')))
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

  // New arrivals from approved vendors only
  const newArrivals = await db
    .select({
      id: products.id, name: products.name, slug: products.slug,
      price: products.price, comparePrice: products.comparePrice,
      rating: products.rating, reviewCount: products.reviewCount, stock: products.stock,
    })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(and(eq(products.isActive, true), eq(vendors.status, 'approved')))
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
  const conditions = [eq(products.isActive, true), eq(vendors.status, 'approved')];

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
    } else {
      conditions.push(sql`1 = 0`);
    }
  }
  if (query.vendor) {
    const [v] = await db.select({ id: vendors.id }).from(vendors)
      .where(and(eq(vendors.storeSlug, query.vendor), eq(vendors.status, 'approved'))).limit(1);
    if (v) {
      conditions.push(eq(products.vendorId, v.id));
    } else {
      conditions.push(sql`1 = 0`);
    }
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

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(whereClause);
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
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
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

  // Get vendor info and verify vendor is approved
  const [vendor] = await db
    .select({ 
      id: vendors.id, 
      storeName: vendors.storeName, 
      storeSlug: vendors.storeSlug, 
      status: vendors.status,
      rating: vendors.rating, 
      reviewCount: vendors.reviewCount,
      subscriptionPlanSlug: subscriptionPlans.slug
    })
    .from(vendors)
    .leftJoin(vendorSubscriptions, and(eq(vendorSubscriptions.vendorId, vendors.id), eq(vendorSubscriptions.status, 'active')))
    .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, vendorSubscriptions.planId))
    .where(and(eq(vendors.id, product.vendorId), eq(vendors.status, 'approved')))
    .limit(1);

  if (!vendor) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'المنتج غير متاح حالياً' } }, 404);
  }

  // Fire-and-forget view count increment (non-blocking)
  db.update(products).set({ viewCount: sql`${products.viewCount} + 1` }).where(eq(products.id, product.id)).then(() => {}).catch(() => {});

  // Get images
  const imgs = await db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(asc(productImages.sortOrder));

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

  const responseData = {
    ...product,
    images: imgs,
    vendor,
    category,
    reviews: productReviews,
  };

  if (c.req.header('Accept')?.includes('text/markdown')) {
    const schemaJson = JSON.stringify({
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name,
      description: product.description || '',
      offers: {
        '@type': 'Offer',
        priceCurrency: 'EGP',
        price: String(product.price),
        availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    }, null, 2);

    const md = `# ${product.name}
**Price:** ${product.price}
**Stock:** ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
**Vendor:** ${vendor?.storeName || 'Unknown'}
**Category:** ${category?.name || 'Unknown'}

## Description
${product.description || ''}

## Schema.org
\`\`\`json
${schemaJson}
\`\`\`
`;
    return c.text(md, 200, { 'Content-Type': 'text/markdown' });
  }

  return sendSuccess(c, responseData);
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

  const responseData = {
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
  };

  if (c.req.header('Accept')?.includes('text/markdown')) {
    const schemaJson = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: vendor.storeName,
      description: vendor.storeDescription || '',
    }, null, 2);

    const md = `# ${vendor.storeName}
**Rating:** ${vendor.rating} (${vendor.reviewCount} reviews)
**Total Products:** ${vendor.totalProducts}

## About
${vendor.storeDescription || 'No description available.'}

## Products
${productsWithImages.map(p => `- ${p.name} - ${p.price}`).join('\n')}

## Schema.org
\`\`\`json
${schemaJson}
\`\`\`
`;
    return c.text(md, 200, { 'Content-Type': 'text/markdown' });
  }

  return sendSuccess(c, responseData);
});

const contactSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب').max(255),
  email: z.string().email('بريد إلكتروني غير صالح').max(255),
  subject: z.string().min(3, 'الموضوع مطلوب').max(255),
  message: z.string().min(10, 'الرسالة قصيرة جداً').max(5000),
});

// POST /api/store/contact
storeRoutes.post('/contact', validate('body', contactSchema), async (c) => {
  const input = getValidated<z.infer<typeof contactSchema>>(c, 'body');

  await emailQueue.add('contact-form', {
    to: 'admin@example.com',
    templateKey: 'order_confirmation',
    subject: `رسالة جديدة من نموذج اتصل بنا: ${input.subject}`,
    data: { orderNumber: `Contact: ${input.name} (${input.email})\n\n${input.message}` }
  }).catch(() => {});

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

// ─── Real-Time Neural Translation Engine with Memory Cache ───
const translationMemoryCache = new Map<string, string>();
const SUPPORTED_TARGET_LANGS = new Set(['ar', 'en', 'fr', 'es', 'de', 'tr']);

async function translateSingleText(text: string, targetLang: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const cacheKey = `${targetLang}:${trimmed}`;
  const cached = translationMemoryCache.get(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return text;
    const data = (await res.json()) as any;
    if (Array.isArray(data?.[0])) {
      const translated = data[0].map((part: any) => part?.[0] || '').join('').trim();
      if (translated) {
        if (translationMemoryCache.size > 10000) {
          const firstKey = translationMemoryCache.keys().next().value;
          if (firstKey) translationMemoryCache.delete(firstKey);
        }
        translationMemoryCache.set(cacheKey, translated);
        return translated;
      }
    }
  } catch {
    // Fallback to original text on network timeout
  }
  return text;
}

storeRoutes.post('/translate', async (c) => {
  try {
    const body = await c.req.json();
    const targetLang = String(body?.targetLang || 'en').toLowerCase();
    if (!SUPPORTED_TARGET_LANGS.has(targetLang)) {
      return sendSuccess(c, { translations: {} });
    }
    const rawTexts: unknown[] = Array.isArray(body?.texts) ? body.texts.slice(0, 80) : [];
    const uniqueTexts = Array.from(
      new Set(
        rawTexts
          .filter((t): t is string => typeof t === 'string' && t.trim().length > 0 && t.length <= 1200)
          .map(t => t.trim())
      )
    );

    const translations: Record<string, string> = {};
    // Process in concurrent batches of 10 for speed without rate-limiting upstream
    for (let i = 0; i < uniqueTexts.length; i += 10) {
      const chunk = uniqueTexts.slice(i, i + 10);
      const results = await Promise.all(chunk.map(txt => translateSingleText(txt, targetLang)));
      chunk.forEach((txt, idx) => {
        translations[txt] = results[idx] || txt;
      });
    }

    return sendSuccess(c, { translations });
  } catch {
    return sendSuccess(c, { translations: {} });
  }
});

export default storeRoutes;
