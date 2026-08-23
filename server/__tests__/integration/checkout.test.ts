/**
 * F3 Integration Tests — Checkout + Cancel
 *
 * Tests: full purchase journey, coupon application, cancellation with stock restore
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  POST, PUT,
  seedUser, seedVendor, seedCategory, seedProduct, seedAddress,
  seedCartItem, seedCoupon, clearCart, createAccessToken, cleanup, closeDb, db,
} from './helpers.js';
import { orders, orderItems, products, coupons } from '../../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';

const ts = Date.now();

// Shared test fixtures
let customerId: number;
let customerToken: string;
let vendorUserId: number;
let vendorId: number;
let categoryId: number;
let productId1: number;
let productId2: number;
let addressId: number;

// Track created IDs for cleanup
const orderIds: number[] = [];
const couponIds: number[] = [];

beforeAll(async () => {
  // Seed infrastructure
  categoryId = await seedCategory(`تست-checkout-${ts}`, `test-checkout-cat-${ts}`);

  vendorUserId = await seedUser(`checkout-vendor-${ts}@test.com`, 'Test@12345', 'vendor', 'بائع', 'شيكاوت');
  vendorId = await seedVendor(vendorUserId, `متجر-شيكاوت-${ts}`, `checkout-store-${ts}`, '10.00');

  customerId = await seedUser(`checkout-customer-${ts}@test.com`, 'Test@12345', 'customer', 'عميل', 'شيكاوت');
  customerToken = createAccessToken(customerId, `checkout-customer-${ts}@test.com`, 'customer');

  productId1 = await seedProduct(vendorId, categoryId, {
    name: `منتج-شيكاوت-1-${ts}`, slug: `checkout-p1-${ts}`, price: '200.00', stock: 20,
  });
  productId2 = await seedProduct(vendorId, categoryId, {
    name: `منتج-شيكاوت-2-${ts}`, slug: `checkout-p2-${ts}`, price: '150.00', stock: 10,
  });

  addressId = await seedAddress(customerId);
});

afterAll(async () => {
  // Clean order items first, then orders
  for (const orderId of orderIds) {
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
  }
  await cleanup({
    couponIds,
    productIds: [productId1, productId2],
    addressIds: [addressId],
    vendorIds: [vendorId],
    userIds: [vendorUserId, customerId],
    categoryIds: [categoryId],
  });
  await closeDb();
});

describe('Checkout — Full purchase journey', () => {
  it('creates an order with correct totals from cart items', async () => {
    // Add items to cart
    await seedCartItem(customerId, productId1, 2); // 200 × 2 = 400
    await seedCartItem(customerId, productId2, 1); // 150 × 1 = 150
    // subtotal = 550, shipping = 30 (1 vendor), total = 580

    const res = await POST('/api/orders', {
      token: customerToken,
      body: { addressId },
    });

    expect(res.status).toBe(201);
    const data = res.body?.['data'] as Record<string, unknown>;
    expect(data['orderNumber']).toBeDefined();
    expect(data['orderNumber']).toMatch(/^MKT-/);
    expect(parseFloat(data['total'] as string)).toBe(580);

    const orderId = data['id'] as number;
    orderIds.push(orderId);

    // Verify in DB: subtotal, shipping, total
    const [dbOrder] = await db.select().from(orders).where(eq(orders.id, orderId));
    expect(parseFloat(dbOrder!.subtotal)).toBe(550);
    expect(parseFloat(dbOrder!.shippingFee)).toBe(30);
    expect(parseFloat(dbOrder!.total)).toBe(580);
    expect(dbOrder!.status).toBe('pending');

    // Verify stock was deducted
    const [p1] = await db.select({ stock: products.stock }).from(products).where(eq(products.id, productId1));
    const [p2] = await db.select({ stock: products.stock }).from(products).where(eq(products.id, productId2));
    expect(parseInt(p1!.stock.toString())).toBe(18); // 20 - 2
    expect(parseInt(p2!.stock.toString())).toBe(9);  // 10 - 1
  });

  it('applies percentage coupon correctly', async () => {
    // Restore stock for next test
    await db.update(products).set({ stock: 20 }).where(eq(products.id, productId1));
    await db.update(products).set({ stock: 10 }).where(eq(products.id, productId2));

    const couponId = await seedCoupon({
      code: `PERCENT10-${ts}`,
      type: 'percentage',
      value: '10.00',
      usageLimit: 5,
    });
    couponIds.push(couponId);

    // Add to cart
    await seedCartItem(customerId, productId1, 1); // 200
    // subtotal = 200, discount = 20 (10%), shipping = 30, total = 210

    const res = await POST('/api/orders', {
      token: customerToken,
      body: { addressId, couponCode: `PERCENT10-${ts}` },
    });

    expect(res.status).toBe(201);
    const data = res.body?.['data'] as Record<string, unknown>;
    expect(parseFloat(data['total'] as string)).toBe(210);

    const orderId = data['id'] as number;
    orderIds.push(orderId);

    // Verify coupon.usedCount incremented
    const [coupon] = await db.select({ usedCount: coupons.usedCount }).from(coupons).where(eq(coupons.id, couponId));
    expect(coupon!.usedCount).toBe(1);
  });

  it('applies fixed coupon correctly', async () => {
    await db.update(products).set({ stock: 20 }).where(eq(products.id, productId1));

    const couponId = await seedCoupon({
      code: `FIXED50-${ts}`,
      type: 'fixed',
      value: '50.00',
      usageLimit: 3,
    });
    couponIds.push(couponId);

    await seedCartItem(customerId, productId1, 1); // 200
    // subtotal = 200, discount = 50 (fixed), shipping = 30, total = 180

    const res = await POST('/api/orders', {
      token: customerToken,
      body: { addressId, couponCode: `FIXED50-${ts}` },
    });

    expect(res.status).toBe(201);
    const data = res.body?.['data'] as Record<string, unknown>;
    expect(parseFloat(data['total'] as string)).toBe(180);

    orderIds.push(data['id'] as number);
  });

  it('rejects checkout with empty cart', async () => {
    // Cart should be empty after previous checkout
    const res = await POST('/api/orders', {
      token: customerToken,
      body: { addressId },
    });
    expect(res.status).toBe(400);
  });

  it('rejects checkout with invalid address (IDOR)', async () => {
    await seedCartItem(customerId, productId1, 1);
    const res = await POST('/api/orders', {
      token: customerToken,
      body: { addressId: 999999 }, // non-existent or someone else's address
    });
    expect(res.status).toBe(404);

    // Checkout failed → cart item still present; clear it so next tests start clean
    await clearCart(customerId);
  });
});

describe('Checkout — Cancel order', () => {
  it('cancels a pending order: restores stock and coupon usage', async () => {
    // Restore stock
    await db.update(products).set({ stock: 20 }).where(eq(products.id, productId1));
    await db.update(products).set({ stock: 10 }).where(eq(products.id, productId2));

    const couponId = await seedCoupon({
      code: `CANCEL-${ts}`,
      type: 'fixed',
      value: '30.00',
      usageLimit: 2,
    });
    couponIds.push(couponId);

    // Place order
    await seedCartItem(customerId, productId1, 3); // 200 × 3 = 600
    const res = await POST('/api/orders', {
      token: customerToken,
      body: { addressId, couponCode: `CANCEL-${ts}` },
    });
    expect(res.status).toBe(201);
    const orderId = (res.body?.['data'] as Record<string, unknown>)['id'] as number;
    orderIds.push(orderId);

    // Verify stock dropped
    const [before] = await db.select({ stock: products.stock }).from(products).where(eq(products.id, productId1));
    expect(parseInt(before!.stock.toString())).toBe(17); // 20 - 3

    // Cancel
    const cancelRes = await PUT(`/api/orders/${orderId}/cancel`, { token: customerToken });
    expect(cancelRes.status).toBe(200);
    const cancelData = cancelRes.body?.['data'] as Record<string, unknown>;
    expect(cancelData['status']).toBe('cancelled');

    // Verify stock restored
    const [after] = await db.select({ stock: products.stock }).from(products).where(eq(products.id, productId1));
    expect(parseInt(after!.stock.toString())).toBe(20);

    // Verify coupon usage decremented
    const [coupon] = await db.select({ usedCount: coupons.usedCount }).from(coupons).where(eq(coupons.id, couponId));
    expect(coupon!.usedCount).toBe(0); // was 1, now 0
  });

  it('rejects cancel on a confirmed order', async () => {
    // Restore stock and place a new order
    await db.update(products).set({ stock: 20 }).where(eq(products.id, productId1));
    await seedCartItem(customerId, productId1, 1);
    const res = await POST('/api/orders', {
      token: customerToken,
      body: { addressId },
    });
    expect(res.status).toBe(201);
    const orderId = (res.body?.['data'] as Record<string, unknown>)['id'] as number;
    orderIds.push(orderId);

    // Manually confirm the order (simulating vendor action)
    await db.update(orders).set({ status: 'confirmed' }).where(eq(orders.id, orderId));

    // Try to cancel
    const cancelRes = await PUT(`/api/orders/${orderId}/cancel`, { token: customerToken });
    expect(cancelRes.status).toBe(400);
  });
});
