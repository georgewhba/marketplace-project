import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { cartItems, products, productImages, vendors } from '../db/schema/index.js';
import { eq, and, sql, asc } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import { validate, getValidated } from '../middleware/validate.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import type { AppEnv } from '../types/env.js';

const cartRoutes = new Hono<AppEnv>();
cartRoutes.use('*', authenticate);

const addToCartSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive().max(99),
}).strict();

const updateCartSchema = z.object({
  quantity: z.number().int().positive().max(99),
}).strict();

// GET /api/cart
cartRoutes.get('/', async (c) => {
  const user = c.get('user');
  
  const items = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      productName: products.name,
      productSlug: products.slug,
      productPrice: products.price,
      productComparePrice: products.comparePrice,
      productStock: products.stock,
      productIsActive: products.isActive,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(and(eq(cartItems.userId, user.id), eq(vendors.status, 'approved')))
    .orderBy(asc(cartItems.createdAt));

  // Get images for cart products
  const productIds = items.map(i => i.productId);
  const images = productIds.length > 0
    ? await db.select().from(productImages).where(sql`${productImages.productId} IN ${productIds}`).orderBy(asc(productImages.sortOrder))
    : [];

  const enrichedItems = items.map(item => ({
    ...item,
    productImage: images.find(img => img.productId === item.productId)?.imageUrl ?? null,
  }));

  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.productPrice) * item.quantity, 0);

  return sendSuccess(c, { items: enrichedItems, subtotal: subtotal.toFixed(2), itemCount: items.length });
});

// GET /api/cart/count
cartRoutes.get('/count', async (c) => {
  const user = c.get('user');
  const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(cartItems).where(eq(cartItems.userId, user.id));
  return sendSuccess(c, { count: result?.count ?? 0 });
});

// POST /api/cart
cartRoutes.post('/', validate('body', addToCartSchema), async (c) => {
  const user = c.get('user');
  const input = getValidated<z.infer<typeof addToCartSchema>>(c, 'body');

  // Check product exists, is active, and vendor is approved
  const [product] = await db
    .select({
      id: products.id,
      stock: products.stock,
      isActive: products.isActive,
      vendorStatus: vendors.status,
    })
    .from(products)
    .innerJoin(vendors, eq(products.vendorId, vendors.id))
    .where(eq(products.id, input.productId))
    .limit(1);

  if (!product || !product.isActive || product.vendorStatus !== 'approved') {
    throw AppError.notFound('المنتج');
  }
  if (product.stock < input.quantity) {
    throw AppError.badRequest(`الكمية المتاحة ${product.stock} فقط`);
  }

  // Check if already in cart
  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.userId, user.id), eq(cartItems.productId, input.productId)))
    .limit(1);

  if (existing) {
    const newQty = existing.quantity + input.quantity;
    if (newQty > product.stock) {
      throw AppError.badRequest(`الكمية المتاحة ${product.stock} فقط`);
    }
    const [updated] = await db
      .update(cartItems)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(cartItems.id, existing.id))
      .returning();
    return sendSuccess(c, updated);
  }

  const [item] = await db.insert(cartItems).values({
    userId: user.id,
    productId: input.productId,
    quantity: input.quantity,
  }).returning();

  return sendCreated(c, item);
});

// PUT /api/cart/:id
cartRoutes.put('/:id', validate('body', updateCartSchema), async (c) => {
  const user = c.get('user');
  const itemId = parseInt(c.req.param('id')!, 10);
  if (Number.isNaN(itemId)) throw AppError.badRequest('معرف غير صالح');
  const input = getValidated<z.infer<typeof updateCartSchema>>(c, 'body');

  const [item] = await db.select().from(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.userId, user.id))).limit(1);
  if (!item) throw AppError.notFound('عنصر السلة');

  // Check stock
  const [product] = await db.select({ stock: products.stock }).from(products).where(eq(products.id, item.productId)).limit(1);
  if (product && input.quantity > product.stock) {
    throw AppError.badRequest(`الكمية المتاحة ${product.stock} فقط`);
  }

  const [updated] = await db
    .update(cartItems)
    .set({ quantity: input.quantity, updatedAt: new Date() })
    .where(eq(cartItems.id, itemId))
    .returning();

  return sendSuccess(c, updated);
});

// DELETE /api/cart/:id
cartRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const itemId = parseInt(c.req.param('id')!, 10);
  if (Number.isNaN(itemId)) throw AppError.badRequest('معرف غير صالح');

  const [item] = await db.select().from(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.userId, user.id))).limit(1);
  if (!item) throw AppError.notFound('عنصر السلة');

  await db.delete(cartItems).where(eq(cartItems.id, itemId));
  return sendSuccess(c, { message: 'تم الحذف بنجاح' });
});

// DELETE /api/cart (clear all)
cartRoutes.delete('/', async (c) => {
  const user = c.get('user');
  await db.delete(cartItems).where(eq(cartItems.userId, user.id));
  return sendSuccess(c, { message: 'تم تفريغ السلة' });
});

export default cartRoutes;
