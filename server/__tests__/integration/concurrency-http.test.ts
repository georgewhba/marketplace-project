/**
 * F1 Concurrency HTTP Integration Tests
 *
 * Tests that concurrent HTTP requests to the real POST /api/orders endpoint 
 * handle shared resources (stock, coupons) atomically.
 *
 * This test guarantees the actual route and business logic used in production
 * is safe against race conditions.
 *
 * Run with: npm test -- concurrency-http
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  POST,
  seedUser, seedVendor, seedCategory, seedProduct, seedAddress,
  seedCartItem, seedCoupon, clearCart, createAccessToken, cleanup, closeDb, db,
} from './helpers.js';
import { products, coupons, orders, orderItems } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';

const ts = Date.now();

let vendorUserId: number;
let vendorId: number;
let categoryId: number;

// We need two distinct customers
let customer1Id: number;
let customer1Token: string;
let address1Id: number;

let customer2Id: number;
let customer2Token: string;
let address2Id: number;

const orderIds: number[] = [];
const productIds: number[] = [];
const couponIds: number[] = [];

beforeAll(async () => {
  categoryId = await seedCategory(`cat-http-conc-${ts}`, `cat-http-conc-${ts}`);
  vendorUserId = await seedUser(`vendor-http-conc-${ts}@test.com`, 'Test@12345', 'vendor', 'بائع', 'تست');
  vendorId = await seedVendor(vendorUserId, `متجر-http-conc-${ts}`, `store-http-conc-${ts}`, '10.00');

  // Customer 1
  customer1Id = await seedUser(`cust1-http-conc-${ts}@test.com`, 'Test@12345', 'customer', 'عميل1', 'تست');
  customer1Token = createAccessToken(customer1Id, `cust1-http-conc-${ts}@test.com`, 'customer');
  address1Id = await seedAddress(customer1Id);

  // Customer 2
  customer2Id = await seedUser(`cust2-http-conc-${ts}@test.com`, 'Test@12345', 'customer', 'عميل2', 'تست');
  customer2Token = createAccessToken(customer2Id, `cust2-http-conc-${ts}@test.com`, 'customer');
  address2Id = await seedAddress(customer2Id);
});

afterAll(async () => {
  for (const orderId of orderIds) {
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
  }
  await cleanup({
    couponIds,
    productIds,
    addressIds: [address1Id, address2Id],
    vendorIds: [vendorId],
    userIds: [vendorUserId, customer1Id, customer2Id],
    categoryIds: [categoryId],
  });
  await closeDb();
});

describe('Real HTTP Endpoint Concurrency — Stock', () => {
  // Loop to ensure consistency of concurrency protection (not just an accidental success)
  for (let i = 1; i <= 5; i++) {
    it(`Run ${i}: exactly one of two concurrent checkout requests succeeds when stock = 1`, async () => {
      // Clear carts to avoid pollution from previous failed/timed-out runs
      await clearCart(customer1Id);
      await clearCart(customer2Id);

      // 1. Seed product with stock = 1
      const productId = await seedProduct(vendorId, categoryId, {
        name: `منتج-تزامن-مخزون-${i}-${ts}`,
        slug: `conc-stock-${i}-${ts}`,
        price: '100.00',
        stock: 1,
      });
      productIds.push(productId);

      // 2. Both customers add it to their carts
      await seedCartItem(customer1Id, productId, 1);
      await seedCartItem(customer2Id, productId, 1);

      // 3. Fire concurrent POST /api/orders
      const [res1, res2] = await Promise.all([
        POST('/api/orders', { token: customer1Token, body: { addressId: address1Id } }),
        POST('/api/orders', { token: customer2Token, body: { addressId: address2Id } }),
      ]);

      // 4. Verify exactly one succeeded (201) and one failed (400)
      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 400]);

      // Save successful order for cleanup
      const successRes = res1.status === 201 ? res1 : res2;
      const orderId = (successRes.body?.['data'] as Record<string, unknown>)?.['id'] as number;
      if (orderId) orderIds.push(orderId);
      
      const errorRes = res1.status === 400 ? res1 : res2;
      const errorMsg = (errorRes.body?.['error'] as Record<string, unknown>)?.['message'] as string;
      expect(errorMsg).toMatch(/نفد المخزون|الكمية المتاحة/);

      // 5. Verify DB stock is exactly 0
      const [p] = await db.select({ stock: products.stock }).from(products).where(eq(products.id, productId));
      expect(parseInt(p!.stock.toString())).toBe(0);

      // Clear carts just in case
      await clearCart(customer1Id);
      await clearCart(customer2Id);
    }, 30000);
  }
});

describe('Real HTTP Endpoint Concurrency — Coupons', () => {
  it('exactly one of two concurrent checkout requests succeeds when coupon usageLimit = 1', async () => {
    // Clear carts
    await clearCart(customer1Id);
    await clearCart(customer2Id);

    // 1. Seed product with plenty of stock
    const productId = await seedProduct(vendorId, categoryId, {
      name: `منتج-تزامن-كوبون-${ts}`,
      slug: `conc-coupon-${ts}`,
      price: '100.00',
      stock: 10, // enough for both
    });
    productIds.push(productId);

    // 2. Seed coupon with usageLimit = 1
    const couponId = await seedCoupon({
      code: `LIMIT1-${ts}`,
      type: 'fixed',
      value: '20.00',
      usageLimit: 1,
    });
    couponIds.push(couponId);

    // Both customers add to cart
    await seedCartItem(customer1Id, productId, 1);
    await seedCartItem(customer2Id, productId, 1);

    // 3. Fire concurrent POST /api/orders WITH the coupon
    const [res1, res2] = await Promise.all([
      POST('/api/orders', { token: customer1Token, body: { addressId: address1Id, couponCode: `LIMIT1-${ts}` } }),
      POST('/api/orders', { token: customer2Token, body: { addressId: address2Id, couponCode: `LIMIT1-${ts}` } }),
    ]);

    // 4. Verify exactly one succeeded (201) and one failed (400)
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 400]);

    // Save successful order for cleanup
    const successRes = res1.status === 201 ? res1 : res2;
    const orderId = (successRes.body?.['data'] as Record<string, unknown>)?.['id'] as number;
    if (orderId) orderIds.push(orderId);
    
    const errorRes = res1.status === 400 ? res1 : res2;
    const errorMsg = (errorRes.body?.['error'] as Record<string, unknown>)?.['message'] as string;
    expect(errorMsg).toMatch(/كود الخصم استُنفد/);

    // 5. Verify coupon usedCount is exactly 1
    const [c] = await db.select({ usedCount: coupons.usedCount }).from(coupons).where(eq(coupons.id, couponId));
    expect(c!.usedCount).toBe(1);

    // Clear carts
    await clearCart(customer1Id);
    await clearCart(customer2Id);
  }, 30000);
});
