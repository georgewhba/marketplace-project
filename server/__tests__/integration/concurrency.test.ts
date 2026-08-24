/**
 * F1 Concurrency Integration Tests (Isolated Pattern)
 *
 * NOTE: This file only tests the isolated SQL pattern via helper functions.
 * It proves the pattern works, but does NOT prove the real POST /api/orders endpoint is safe.
 * For the official proof that the actual HTTP endpoint handles concurrency correctly,
 * see `concurrency-http.test.ts`.
 *
 * Tests that concurrent requests on shared resources (stock, coupons) are handled
 * atomically — exactly one succeeds, the other is rejected cleanly, and no data
 * integrity violation occurs.
 *
 * Requires a running PostgreSQL database. Set TEST_DATABASE_URL in .env or
 * inherit DATABASE_URL (the tests use an isolated test schema / cleanup).
 *
 * Run with: npm test -- concurrency
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import {
  users, vendors, categories, products, coupons, orders, orderItems,
  cartItems, addresses, refreshTokens,
} from '../../db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';

config(); // load .env

// ── Test DB connection ────────────────────────────────────────────────────────
const DATABASE_URL = process.env['TEST_DATABASE_URL'] ?? process.env['DATABASE_URL'];
if (!DATABASE_URL) throw new Error('DATABASE_URL / TEST_DATABASE_URL not set — cannot run integration tests');

const client = postgres(DATABASE_URL, { max: 10 });
const db = drizzle(client);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Simulate the atomic stock-deduction UPDATE used in order.routes.ts.
 * Returns true if deduction succeeded (stock was sufficient), false otherwise.
 */
async function atomicDeductStock(productId: number, qty: number): Promise<boolean> {
  const result = await db
    .update(products)
    .set({ stock: sql`${products.stock} - ${qty}`, updatedAt: new Date() })
    .where(and(eq(products.id, productId), sql`${products.stock} >= ${qty}`))
    .returning({ newStock: products.stock });
  return result.length > 0;
}

/**
 * Simulate the atomic coupon-claim UPDATE used in order.routes.ts.
 * Returns true if coupon was claimed (not exhausted), false otherwise.
 */
async function atomicClaimCoupon(couponId: number): Promise<boolean> {
  const result = await db
    .update(coupons)
    .set({ usedCount: sql`${coupons.usedCount} + 1` })
    .where(and(
      eq(coupons.id, couponId),
      eq(coupons.isActive, true),
      sql`(${coupons.usageLimit} IS NULL OR ${coupons.usedCount} < ${coupons.usageLimit})`,
    ))
    .returning({ usedCount: coupons.usedCount });
  return result.length > 0;
}

// ── Test Data Seeding ─────────────────────────────────────────────────────────

let testUserId: number;
let testVendorId: number;
let testCategoryId: number;

beforeAll(async () => {
  // Create a minimal category
  const [cat] = await db.insert(categories).values({
    name: 'تست-' + Date.now(),
    slug: 'test-cat-' + Date.now(),
    isActive: true,
  }).returning({ id: categories.id });
  testCategoryId = cat!.id;

  // Create a test user + vendor
  const pwHash = await bcrypt.hash('Test@12345', 4);
  const [u] = await db.insert(users).values({
    email: `test-f1-${Date.now()}@test.com`,
    passwordHash: pwHash,
    firstName: 'تست',
    lastName: 'F1',
    role: 'vendor',
  }).returning({ id: users.id });
  testUserId = u!.id;

  const [v] = await db.insert(vendors).values({
    userId: testUserId,
    storeName: 'متجر-تست-' + Date.now(),
    storeSlug: 'test-vendor-' + Date.now(),
    status: 'approved',
    commissionRate: '10.00',
  }).returning({ id: vendors.id });
  testVendorId = v!.id;
});

afterAll(async () => {
  // Clean up test data in reverse dependency order
  if (testVendorId) await db.delete(vendors).where(eq(vendors.id, testVendorId));
  if (testUserId) {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, testUserId));
    await db.delete(users).where(eq(users.id, testUserId));
  }
  if (testCategoryId) await db.delete(categories).where(eq(categories.id, testCategoryId));
  await client.end();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('F1 — Stock Concurrency', () => {
  it('only one of two concurrent requests succeeds when stock = 1', async () => {
    // Seed: 1 unit of stock
    const [product] = await db.insert(products).values({
      vendorId: testVendorId,
      categoryId: testCategoryId,
      name: 'منتج-تست-مخزون-' + Date.now(),
      slug: 'test-product-stock-' + Date.now(),
      price: '100.00',
      stock: 1,
      isActive: true,
    }).returning({ id: products.id });
    const productId = product!.id;

    try {
      // Fire two concurrent stock deductions for quantity = 1
      const [result1, result2] = await Promise.all([
        atomicDeductStock(productId, 1),
        atomicDeductStock(productId, 1),
      ]);

      // Exactly ONE should succeed
      const successCount = [result1, result2].filter(Boolean).length;
      expect(successCount).toBe(1);

      // Final stock must be 0 — never negative
      const [final] = await db.select({ stock: products.stock })
        .from(products).where(eq(products.id, productId)).limit(1);
      expect(parseInt(final!.stock.toString())).toBe(0);
    } finally {
      await db.delete(products).where(eq(products.id, productId));
    }
  });

  it('deduction of quantity > stock returns false, stock unchanged', async () => {
    const [product] = await db.insert(products).values({
      vendorId: testVendorId,
      categoryId: testCategoryId,
      name: 'منتج-تست-كمية-' + Date.now(),
      slug: 'test-product-qty-' + Date.now(),
      price: '200.00',
      stock: 3,
      isActive: true,
    }).returning({ id: products.id });
    const productId = product!.id;

    try {
      const succeeded = await atomicDeductStock(productId, 10);
      expect(succeeded).toBe(false);

      const [final] = await db.select({ stock: products.stock })
        .from(products).where(eq(products.id, productId)).limit(1);
      expect(parseInt(final!.stock.toString())).toBe(3); // stock untouched
    } finally {
      await db.delete(products).where(eq(products.id, productId));
    }
  });
});

describe('F1 — Coupon Concurrency', () => {
  it('only one of two concurrent requests claims a coupon with usageLimit = 1', async () => {
    const code = 'TESTCOUPON' + Date.now();
    const [coupon] = await db.insert(coupons).values({
      code,
      type: 'fixed',
      value: '50.00',
      usageLimit: 1,
      usedCount: 0,
      isActive: true,
    }).returning({ id: coupons.id });
    const couponId = coupon!.id;

    try {
      const [result1, result2] = await Promise.all([
        atomicClaimCoupon(couponId),
        atomicClaimCoupon(couponId),
      ]);

      // Exactly ONE claim must succeed
      const successCount = [result1, result2].filter(Boolean).length;
      expect(successCount).toBe(1);

      // usedCount must be exactly 1 — never 2
      const [finalCoupon] = await db.select({ usedCount: coupons.usedCount })
        .from(coupons).where(eq(coupons.id, couponId)).limit(1);
      expect(finalCoupon!.usedCount).toBe(1);
    } finally {
      await db.delete(coupons).where(eq(coupons.id, couponId));
    }
  });

  it('claiming an already-exhausted coupon returns false', async () => {
    const code = 'EXHAUSTED' + Date.now();
    const [coupon] = await db.insert(coupons).values({
      code,
      type: 'percentage',
      value: '10.00',
      usageLimit: 1,
      usedCount: 1, // already exhausted
      isActive: true,
    }).returning({ id: coupons.id });
    const couponId = coupon!.id;

    try {
      const succeeded = await atomicClaimCoupon(couponId);
      expect(succeeded).toBe(false);

      // usedCount must remain 1
      const [finalCoupon] = await db.select({ usedCount: coupons.usedCount })
        .from(coupons).where(eq(coupons.id, couponId)).limit(1);
      expect(finalCoupon!.usedCount).toBe(1);
    } finally {
      await db.delete(coupons).where(eq(coupons.id, couponId));
    }
  });
});

describe('F1 — registerVendor Atomicity', () => {
  it('does not leave an orphan user if vendor insert fails (duplicate storeSlug)', async () => {
    const timestamp = Date.now();
    const pwHash = await bcrypt.hash('Test@12345', 4);
    const slug = `duplicate-slug-${timestamp}`;

    // Pre-create a vendor with this slug so the second registration will conflict
    const [preUser] = await db.insert(users).values({
      email: `pre-vendor-${timestamp}@test.com`,
      passwordHash: pwHash,
      firstName: 'سابق',
      lastName: 'تست',
      role: 'vendor',
    }).returning({ id: users.id });

    await db.insert(vendors).values({
      userId: preUser!.id,
      storeName: `متجر سابق ${timestamp}`,
      storeSlug: slug,
      status: 'pending',
      commissionRate: '10.00',
    });

    // Count users before the conflicting registration attempt
    const [countBefore] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const userCountBefore = countBefore!.count;

    // Now attempt to register a NEW user with the SAME slug (simulating a race)
    const conflictEmail = `conflict-${timestamp}@test.com`;
    let threwError = false;
    try {
      await db.transaction(async (tx) => {
        // This mirrors the transaction in registerVendor
        const [newUser] = await tx.insert(users).values({
          email: conflictEmail,
          passwordHash: pwHash,
          firstName: 'تعارض',
          lastName: 'تست',
          role: 'vendor',
        }).returning({ id: users.id });

        // This WILL fail due to unique constraint on storeSlug
        await tx.insert(vendors).values({
          userId: newUser!.id,
          storeName: `متجر تعارض ${timestamp}`,
          storeSlug: slug, // duplicate! → constraint violation → automatic rollback
          status: 'pending',
          commissionRate: '10.00',
        });
      });
    } catch {
      threwError = true;
    }

    expect(threwError).toBe(true);

    // The user count must be the same as before — no orphan user was created
    const [countAfter] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    expect(countAfter!.count).toBe(userCountBefore);

    // Confirm the conflicting email does NOT exist in the DB
    const [orphan] = await db.select({ id: users.id }).from(users)
      .where(eq(users.email, conflictEmail)).limit(1);
    expect(orphan).toBeUndefined();

    // Cleanup pre-seeded data
    await db.delete(vendors).where(eq(vendors.userId, preUser!.id));
    await db.delete(users).where(eq(users.id, preUser!.id));
  });
});

describe('F1 — Cancel Consistency', () => {
  it('cancellation restores stock atomically', async () => {
    // Seed: product with stock 10
    const [product] = await db.insert(products).values({
      vendorId: testVendorId,
      categoryId: testCategoryId,
      name: 'منتج-إلغاء-' + Date.now(),
      slug: 'cancel-product-' + Date.now(),
      price: '150.00',
      stock: 10,
      isActive: true,
    }).returning({ id: products.id });
    const productId = product!.id;

    // Create a test customer + address
    const pwHash = await bcrypt.hash('Test@12345', 4);
    const [customer] = await db.insert(users).values({
      email: `cancel-customer-${Date.now()}@test.com`,
      passwordHash: pwHash,
      firstName: 'عميل',
      lastName: 'إلغاء',
      role: 'customer',
    }).returning({ id: users.id });

    const [addr] = await db.insert(addresses).values({
      userId: customer!.id,
      label: 'home',
      fullName: 'عميل تست',
      phone: '01012345678',
      addressLine1: 'شارع تست 1',
      city: 'القاهرة',
      country: 'Egypt',
    }).returning({ id: addresses.id });

    // Simulate a placed order (deduct stock by 3)
    await db.update(products)
      .set({ stock: sql`${products.stock} - 3` })
      .where(eq(products.id, productId));

    const orderNum = 'TEST-' + Date.now();
    const [order] = await db.insert(orders).values({
      orderNumber: orderNum,
      customerId: customer!.id,
      status: 'pending',
      subtotal: '450.00',
      shippingFee: '30.00',
      total: '480.00',
      shippingName: 'عميل تست',
      shippingPhone: '01012345678',
      shippingAddressLine1: 'شارع تست',
      shippingCity: 'القاهرة',
      shippingCountry: 'Egypt',
      paymentMethod: 'cash_on_delivery',
    }).returning({ id: orders.id });

    const [oi] = await db.insert(orderItems).values({
      orderId: order!.id,
      productId: productId,
      vendorId: testVendorId,
      productName: 'منتج إلغاء',
      price: '150.00',
      quantity: 3,
      total: '450.00',
      shippingFee: '30.00',
      commissionRate: '10.00',
      commissionAmount: '45.00',
      vendorAmount: '405.00',
    }).returning({ id: orderItems.id });

    try {
      // Verify stock dropped to 7 after order placement
      const [beforeCancel] = await db.select({ stock: products.stock })
        .from(products).where(eq(products.id, productId)).limit(1);
      expect(parseInt(beforeCancel!.stock.toString())).toBe(7);

      // Simulate atomic cancel: restore stock + update statuses
      await db.transaction(async (tx) => {
        await tx.update(products)
          .set({ stock: sql`${products.stock} + 3` })
          .where(eq(products.id, productId));
        await tx.update(orderItems)
          .set({ vendorStatus: 'cancelled', updatedAt: new Date() })
          .where(eq(orderItems.id, oi!.id));
        await tx.update(orders)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(orders.id, order!.id));
      });

      // Stock must be restored to 10
      const [afterCancel] = await db.select({ stock: products.stock })
        .from(products).where(eq(products.id, productId)).limit(1);
      expect(parseInt(afterCancel!.stock.toString())).toBe(10);

      // Order must be cancelled
      const [finalOrder] = await db.select({ status: orders.status })
        .from(orders).where(eq(orders.id, order!.id)).limit(1);
      expect(finalOrder!.status).toBe('cancelled');
    } finally {
      await db.delete(orderItems).where(eq(orderItems.id, oi!.id));
      await db.delete(orders).where(eq(orders.id, order!.id));
      await db.delete(addresses).where(eq(addresses.id, addr!.id));
      await db.delete(users).where(eq(users.id, customer!.id));
      await db.delete(products).where(eq(products.id, productId));
    }
  });
});
