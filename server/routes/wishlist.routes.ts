import { Hono } from 'hono';
import { db } from '../db/index.js';
import { wishlists, products, productImages } from '../db/schema/index.js';
import { eq, and, sql, asc } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import type { AppEnv } from '../types/env.js';

const wishlistRoutes = new Hono<AppEnv>();
wishlistRoutes.use('*', authenticate);

// GET /api/wishlist
wishlistRoutes.get('/', async (c) => {
  const user = c.get('user');
  
  const items = await db
    .select({
      id: wishlists.id,
      productId: products.id,
      productName: products.name,
      productSlug: products.slug,
      productPrice: products.price,
      productComparePrice: products.comparePrice,
      productRating: products.rating,
      productStock: products.stock,
      createdAt: wishlists.createdAt,
    })
    .from(wishlists)
    .innerJoin(products, eq(wishlists.productId, products.id))
    .where(eq(wishlists.userId, user.id));

  const productIds = items.map(i => i.productId);
  const images = productIds.length > 0
    ? await db.select().from(productImages).where(sql`${productImages.productId} IN ${productIds}`).orderBy(asc(productImages.sortOrder))
    : [];

  const enriched = items.map(item => ({
    id: item.id,
    createdAt: item.createdAt,
    product: {
      id: item.productId,
      name: item.productName,
      slug: item.productSlug,
      price: item.productPrice,
      compareAtPrice: item.productComparePrice,
      rating: item.productRating,
      stock: item.productStock,
      images: images.find(img => img.productId === item.productId)
        ? [{ url: images.find(img => img.productId === item.productId)!.imageUrl }]
        : [],
    }
  }));

  return sendSuccess(c, enriched);
});

// POST /api/wishlist — toggle add
wishlistRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json() as { productId?: number };
  
  if (!body.productId || typeof body.productId !== 'number') {
    throw AppError.badRequest('معرف المنتج مطلوب');
  }

  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, body.productId)).limit(1);
  if (!product) throw AppError.notFound('المنتج');

  // Check if already in wishlist
  const [existing] = await db.select().from(wishlists)
    .where(and(eq(wishlists.userId, user.id), eq(wishlists.productId, body.productId)))
    .limit(1);

  if (existing) {
    // Remove (toggle off)
    await db.delete(wishlists).where(eq(wishlists.id, existing.id));
    return sendSuccess(c, { wishlisted: false });
  }

  await db.insert(wishlists).values({ userId: user.id, productId: body.productId });
  return sendCreated(c, { wishlisted: true });
});

// DELETE /api/wishlist/:productId
wishlistRoutes.delete('/:productId', async (c) => {
  const user = c.get('user');
  const productId = parseInt(c.req.param('productId')!, 10);

  await db.delete(wishlists).where(and(eq(wishlists.userId, user.id), eq(wishlists.productId, productId)));
  return sendSuccess(c, { wishlisted: false });
});

// GET /api/wishlist/check/:productId
wishlistRoutes.get('/check/:productId', async (c) => {
  const user = c.get('user');
  const productId = parseInt(c.req.param('productId')!, 10);

  const [existing] = await db.select({ id: wishlists.id }).from(wishlists)
    .where(and(eq(wishlists.userId, user.id), eq(wishlists.productId, productId)))
    .limit(1);

  return sendSuccess(c, { wishlisted: !!existing });
});

export default wishlistRoutes;
