import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { orders, orderItems, cartItems, products, vendors, productImages, coupons, addresses, notifications } from '../db/schema/index.js';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import { validate, getValidated } from '../middleware/validate.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { generateOrderNumber } from '../utils/order-number.js';
import { getPaginationMeta, getOffset, paginationSchema } from '../utils/pagination.js';
import type { AppEnv } from '../types/env.js';

const orderRoutes = new Hono<AppEnv>();
orderRoutes.use('*', authenticate);

const checkoutSchema = z.object({
  addressId: z.number().int().positive(),
  couponCode: z.string().optional(),
  notes: z.string().max(500).optional(),
}).strict();

// POST /api/orders — fully atomic checkout
orderRoutes.post('/', validate('body', checkoutSchema), async (c) => {
  const user = c.get('user');
  const input = getValidated<z.infer<typeof checkoutSchema>>(c, 'body');

  // ── Pre-flight reads (outside tx for early user-friendly errors) ──────────

  // Verify address belongs to user
  const [address] = await db.select().from(addresses)
    .where(and(eq(addresses.id, input.addressId), eq(addresses.userId, user.id)))
    .limit(1);
  if (!address) throw AppError.notFound('العنوان');

  // Load cart with product details
  const cartItemsList = await db
    .select({
      cartId: cartItems.id,
      productId: products.id,
      vendorId: products.vendorId,
      productName: products.name,
      productPrice: products.price,
      productSku: products.sku,
      productStock: products.stock,
      productIsActive: products.isActive,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, user.id));

  if (cartItemsList.length === 0) {
    throw AppError.badRequest('السلة فارغة');
  }

  // Early stock/active check (optimistic, pre-flight — not the authoritative gate)
  for (const item of cartItemsList) {
    if (!item.productIsActive) {
      throw AppError.badRequest(`المنتج "${item.productName}" غير متاح حالياً`);
    }
    if (item.productStock < item.quantity) {
      throw AppError.badRequest(`الكمية المتاحة من "${item.productName}" هي ${item.productStock} فقط`);
    }
  }

  // Calculate subtotal
  let subtotal = 0;
  for (const item of cartItemsList) {
    subtotal += parseFloat(item.productPrice) * item.quantity;
  }

  // Shipping fee per vendor group (flat 30 EGP per vendor)
  const vendorIds = [...new Set(cartItemsList.map(i => i.vendorId))];
  const shippingPerVendor = 30;
  const totalShipping = vendorIds.length * shippingPerVendor;

  // Validate coupon (pre-flight read for early error — authoritative gate is inside tx)
  let couponId: number | undefined;
  let couponCode: string | undefined;
  let discount = 0;

  if (input.couponCode) {
    const [coupon] = await db.select().from(coupons)
      .where(and(eq(coupons.code, input.couponCode.toUpperCase()), eq(coupons.isActive, true)))
      .limit(1);

    if (!coupon) throw AppError.badRequest('كود الخصم غير صالح');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw AppError.badRequest('كود الخصم منتهي الصلاحية');
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw AppError.badRequest('كود الخصم استُنفد');

    const minOrder = parseFloat(coupon.minOrderAmount ?? '0');
    if (subtotal < minOrder) throw AppError.badRequest(`الحد الأدنى لاستخدام الكود ${minOrder} جنيه`);

    if (coupon.type === 'percentage') {
      discount = subtotal * (parseFloat(coupon.value) / 100);
    } else {
      discount = Math.min(parseFloat(coupon.value), subtotal);
    }

    couponId = coupon.id;
    couponCode = coupon.code;
  }

  const total = subtotal + totalShipping - discount;
  const orderNumber = generateOrderNumber();

  // Load vendor commission rates and product images (read-only, safe outside tx)
  const vendorList = await db.select({ id: vendors.id, commissionRate: vendors.commissionRate })
    .from(vendors)
    .where(sql`${vendors.id} IN ${vendorIds}`);

  const productIds = cartItemsList.map(i => i.productId);
  const imagesResult = productIds.length > 0
    ? await db.select().from(productImages)
        .where(sql`${productImages.productId} IN ${productIds}`)
        .orderBy(asc(productImages.sortOrder))
    : [];

  // ── ATOMIC TRANSACTION: order + items + stock deduction + cart clear + coupon ──

  let createdOrder: typeof orders.$inferSelect;

  await db.transaction(async (tx) => {
    // 1. Atomically deduct stock for every cart item.
    //    The WHERE stock >= qty clause is the authoritative race-condition guard.
    //    If it returns no rows, stock was insufficient at execution time → rollback all.
    for (const item of cartItemsList) {
      const deducted = await tx
        .update(products)
        .set({
          stock: sql`${products.stock} - ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(products.id, item.productId),
          sql`${products.stock} >= ${item.quantity}`,
        ))
        .returning({ newStock: products.stock });

      if (deducted.length === 0) {
        // Stock was not sufficient at execution time — rollback entire transaction
        throw AppError.badRequest(`نفد المخزون من المنتج "${item.productName}"، حاول تقليل الكمية أو تحديث السلة`);
      }
    }

    // 2. Atomically claim coupon usage (authoritative gate inside tx)
    if (couponId !== undefined) {
      const claimed = await tx
        .update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(and(
          eq(coupons.id, couponId),
          eq(coupons.isActive, true),
          sql`(${coupons.usageLimit} IS NULL OR ${coupons.usedCount} < ${coupons.usageLimit})`,
        ))
        .returning({ usedCount: coupons.usedCount });

      if (claimed.length === 0) {
        // Coupon was exhausted between pre-flight check and now
        throw AppError.badRequest('كود الخصم استُنفد بالكامل، حاول بدونه');
      }
    }

    // 3. Insert order row
    const [order] = await tx.insert(orders).values({
      orderNumber,
      customerId: user.id,
      status: 'pending',
      subtotal: subtotal.toFixed(2),
      shippingFee: totalShipping.toFixed(2),
      discount: discount.toFixed(2),
      total: total.toFixed(2),
      couponCode,
      shippingName: address.fullName,
      shippingPhone: address.phone,
      shippingAddressLine1: address.addressLine1,
      shippingAddressLine2: address.addressLine2,
      shippingCity: address.city,
      shippingState: address.state,
      shippingCountry: address.country,
      paymentMethod: 'cash_on_delivery',
      notes: input.notes,
    }).returning();

    if (!order) throw AppError.internal();
    createdOrder = order;

    // 4. Insert order items (snapshot of price/commission at order time)
    const vendorsWithShipping = new Set<number>();
    for (const item of cartItemsList) {
      const vendor = vendorList.find(v => v.id === item.vendorId);
      const commissionRate = vendor ? parseFloat(vendor.commissionRate) : 10;
      const itemTotal = parseFloat(item.productPrice) * item.quantity;
      const commissionAmount = itemTotal * (commissionRate / 100);
      const vendorAmount = itemTotal - commissionAmount;
      const firstImage = imagesResult.find(img => img.productId === item.productId);
      const itemShipping = vendorsWithShipping.has(item.vendorId) ? 0 : shippingPerVendor;
      vendorsWithShipping.add(item.vendorId);

      await tx.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        vendorId: item.vendorId,
        productName: item.productName,
        productImage: firstImage?.imageUrl ?? null,
        productSku: item.productSku,
        price: item.productPrice,
        quantity: item.quantity,
        total: itemTotal.toFixed(2),
        shippingFee: itemShipping.toFixed(2),
        commissionRate: commissionRate.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        vendorAmount: vendorAmount.toFixed(2),
      });
    }

    // 5. Clear cart (all items for this user)
    await tx.delete(cartItems).where(eq(cartItems.userId, user.id));
  });
  // ── Transaction committed — DB is consistent ──────────────────────────────

  // Fire-and-forget vendor notifications (outside tx; a notification failure
  // must never roll back a successfully created order)
  const notifyVendors = async () => {
    for (const vendorId of vendorIds) {
      const [vendorRecord] = await db.select({ userId: vendors.userId })
        .from(vendors).where(eq(vendors.id, vendorId)).limit(1);
      if (vendorRecord) {
        await db.insert(notifications).values({
          userId: vendorRecord.userId,
          title: 'طلب جديد',
          message: `لديك طلب جديد رقم ${orderNumber}`,
          type: 'order_placed',
          actionUrl: `/vendor/orders`,
        });
      }
    }
  };
  notifyVendors().catch(() => { /* intentionally swallowed — non-critical */ });

  return sendCreated(c, {
    id: createdOrder!.id,
    orderNumber: createdOrder!.orderNumber,
    total: createdOrder!.total,
    status: createdOrder!.status,
  });
});

// GET /api/orders
orderRoutes.get('/', validate('query', paginationSchema), async (c) => {
  const user = c.get('user');
  const { page, limit } = getValidated<z.infer<typeof paginationSchema>>(c, 'query');

  const [countResult] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(eq(orders.customerId, user.id));
  const total = countResult?.count ?? 0;

  const orderList = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, user.id))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(getOffset(page, limit));

  const orderIds = orderList.map(o => o.id);
  const items = orderIds.length > 0
    ? await db.select().from(orderItems).where(sql`${orderItems.orderId} IN ${orderIds}`)
    : [];

  const ordersWithItems = orderList.map(o => ({
    ...o,
    items: items.filter(i => i.orderId === o.id),
  }));

  return sendSuccess(c, ordersWithItems, 200, getPaginationMeta(page, limit, total));
});

// GET /api/orders/:id
orderRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const orderId = parseInt(c.req.param('id')!, 10);

  const [order] = await db.select().from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.customerId, user.id)))
    .limit(1);

  if (!order) throw AppError.notFound('الطلب');

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

  return sendSuccess(c, { ...order, items });
});

// PUT /api/orders/:id/cancel — atomic: status re-check + stock restore + coupon restore
orderRoutes.put('/:id/cancel', async (c) => {
  const user = c.get('user');
  const orderId = parseInt(c.req.param('id')!, 10);

  // Pre-flight ownership check (outside tx — safe read)
  const [preCheck] = await db.select({ id: orders.id, customerId: orders.customerId })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.customerId, user.id)))
    .limit(1);
  if (!preCheck) throw AppError.notFound('الطلب');

  let cancelledOrder: typeof orders.$inferSelect;

  await db.transaction(async (tx) => {
    // Re-read order status inside the transaction to prevent TOCTOU race
    // (another request might have confirmed the order between pre-check and now)
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, user.id)))
      .for('update')
      .limit(1);

    if (!order) throw AppError.notFound('الطلب');
    if (order.status !== 'pending') {
      throw AppError.badRequest('لا يمكن إلغاء الطلب بعد تأكيده');
    }

    // Load order items inside tx
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    // Atomically restore stock for each item with a product
    for (const item of items) {
      if (item.productId) {
        await tx.update(products)
          .set({ stock: sql`${products.stock} + ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }
      // Mark each item as cancelled
      await tx.update(orderItems)
        .set({ vendorStatus: 'cancelled', updatedAt: new Date() })
        .where(eq(orderItems.id, item.id));
    }

    // Restore coupon usage if one was applied
    if (order.couponCode) {
      await tx.update(coupons)
        .set({ usedCount: sql`GREATEST(${coupons.usedCount} - 1, 0)` })
        .where(eq(coupons.code, order.couponCode));
    }

    // Mark the order itself as cancelled
    const [updated] = await tx.update(orders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(orders.id, order.id))
      .returning();

    if (!updated) throw AppError.internal();
    cancelledOrder = updated;
  });

  return sendSuccess(c, cancelledOrder!);
});

export default orderRoutes;
