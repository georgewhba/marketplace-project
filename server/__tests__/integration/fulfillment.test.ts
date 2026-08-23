/**
 * F3 Integration Tests — Fulfillment + Commission + Reviews
 *
 * Tests: vendor fulfillment lifecycle (confirm→ship→deliver), commission calculation,
 *        IDOR prevention, aggregate order status, and duplicate review protection.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  POST, PUT, GET,
  seedUser, seedVendor, seedCategory, seedProduct, seedAddress,
  seedCartItem, createAccessToken, cleanup, closeDb, db,
} from './helpers.js';
import {
  orders, orderItems, products, vendors, transactions, reviews,
} from '../../db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';

const ts = Date.now();

// Fixtures
let customerId: number;
let customerToken: string;
let vendor1UserId: number;
let vendor1Id: number;
let vendor1Token: string;
let vendor2UserId: number;
let vendor2Id: number;
let vendor2Token: string;
let categoryId: number;
let product1Id: number; // belongs to vendor1
let product2Id: number; // belongs to vendor2
let addressId: number;

// Track for cleanup
const orderIds: number[] = [];
const transactionIds: number[] = [];
const reviewIds: number[] = [];

beforeAll(async () => {
  categoryId = await seedCategory(`تست-fulfill-${ts}`, `test-fulfill-cat-${ts}`);

  // Vendor 1
  vendor1UserId = await seedUser(`fulfill-v1-${ts}@test.com`, 'Test@12345', 'vendor', 'بائع', 'أول');
  vendor1Id = await seedVendor(vendor1UserId, `متجر-1-${ts}`, `fulfill-store1-${ts}`, '10.00');
  vendor1Token = createAccessToken(vendor1UserId, `fulfill-v1-${ts}@test.com`, 'vendor');

  // Vendor 2
  vendor2UserId = await seedUser(`fulfill-v2-${ts}@test.com`, 'Test@12345', 'vendor', 'بائع', 'ثاني');
  vendor2Id = await seedVendor(vendor2UserId, `متجر-2-${ts}`, `fulfill-store2-${ts}`, '15.00');
  vendor2Token = createAccessToken(vendor2UserId, `fulfill-v2-${ts}@test.com`, 'vendor');

  // Customer
  customerId = await seedUser(`fulfill-cust-${ts}@test.com`, 'Test@12345', 'customer', 'عميل', 'توصيل');
  customerToken = createAccessToken(customerId, `fulfill-cust-${ts}@test.com`, 'customer');

  // Products
  product1Id = await seedProduct(vendor1Id, categoryId, {
    name: `منتج-بائع1-${ts}`, slug: `fulfill-p1-${ts}`, price: '500.00', stock: 10,
  });
  product2Id = await seedProduct(vendor2Id, categoryId, {
    name: `منتج-بائع2-${ts}`, slug: `fulfill-p2-${ts}`, price: '300.00', stock: 10,
  });

  addressId = await seedAddress(customerId);
});

afterAll(async () => {
  for (const id of reviewIds) await db.delete(reviews).where(eq(reviews.id, id));
  for (const id of transactionIds) await db.delete(transactions).where(eq(transactions.id, id));
  for (const orderId of orderIds) {
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
  }
  await cleanup({
    productIds: [product1Id, product2Id],
    addressIds: [addressId],
    vendorIds: [vendor1Id, vendor2Id],
    userIds: [vendor1UserId, vendor2UserId, customerId],
    categoryIds: [categoryId],
  });
  await closeDb();
});

// ── Helper: place a multi-vendor order ──────────────────────────────────────

async function placeMultiVendorOrder(): Promise<{
  orderId: number;
  item1Id: number;
  item2Id: number;
}> {
  // Reset stock
  await db.update(products).set({ stock: 10 }).where(eq(products.id, product1Id));
  await db.update(products).set({ stock: 10 }).where(eq(products.id, product2Id));

  await seedCartItem(customerId, product1Id, 1); // vendor1: 500
  await seedCartItem(customerId, product2Id, 1); // vendor2: 300

  const res = await POST('/api/orders', {
    token: customerToken,
    body: { addressId },
  });
  expect(res.status).toBe(201);
  const data = res.body?.['data'] as Record<string, unknown>;
  const orderId = data['id'] as number;
  orderIds.push(orderId);

  // Fetch order items
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const item1 = items.find(i => i.vendorId === vendor1Id)!;
  const item2 = items.find(i => i.vendorId === vendor2Id)!;

  return { orderId, item1Id: item1.id, item2Id: item2.id };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Fulfillment — Vendor lifecycle', () => {
  it('confirm→ship→deliver creates transaction with correct commission', async () => {
    const { orderId, item1Id } = await placeMultiVendorOrder();

    // Record vendor1 totalSales before
    const [vendorBefore] = await db.select({ totalSales: vendors.totalSales })
      .from(vendors).where(eq(vendors.id, vendor1Id));
    const salesBefore = parseFloat(vendorBefore!.totalSales);

    // Step 1: Confirm
    const confirmRes = await PUT(`/api/vendor/orders/${item1Id}/status`, {
      token: vendor1Token,
      body: { status: 'confirmed' },
    });
    expect(confirmRes.status).toBe(200);

    // Step 2: Ship
    const shipRes = await PUT(`/api/vendor/orders/${item1Id}/status`, {
      token: vendor1Token,
      body: { status: 'shipped', trackingNumber: 'TRK-123' },
    });
    expect(shipRes.status).toBe(200);

    // Step 3: Deliver
    const deliverRes = await PUT(`/api/vendor/orders/${item1Id}/status`, {
      token: vendor1Token,
      body: { status: 'delivered' },
    });
    expect(deliverRes.status).toBe(200);

    // Verify transaction was created
    const txn = await db.select().from(transactions)
      .where(and(eq(transactions.vendorId, vendor1Id), eq(transactions.orderItemId, item1Id)));
    expect(txn.length).toBe(1);
    const t = txn[0]!;
    transactionIds.push(t.id);

    // Commission calculation: 500 × 10% = 50 commission, 450 vendor amount
    expect(t.type).toBe('commission');
    expect(parseFloat(t.amount)).toBe(450); // vendor amount (what vendor gets)

    // Verify vendor.totalSales updated
    const [vendorAfter] = await db.select({ totalSales: vendors.totalSales })
      .from(vendors).where(eq(vendors.id, vendor1Id));
    expect(parseFloat(vendorAfter!.totalSales)).toBe(salesBefore + 500);
  });
});

describe('Fulfillment — Aggregate order status', () => {
  it('order stays pending when only one vendor of two confirms', async () => {
    const { orderId, item1Id, item2Id } = await placeMultiVendorOrder();

    // Only vendor1 confirms
    await PUT(`/api/vendor/orders/${item1Id}/status`, {
      token: vendor1Token,
      body: { status: 'confirmed' },
    });

    // Order should NOT be "confirmed" because vendor2 item is still pending
    const [order] = await db.select({ status: orders.status })
      .from(orders).where(eq(orders.id, orderId));
    expect(order!.status).toBe('pending');
  });

  it('order advances to confirmed when BOTH vendors confirm', async () => {
    const { orderId, item1Id, item2Id } = await placeMultiVendorOrder();

    await PUT(`/api/vendor/orders/${item1Id}/status`, {
      token: vendor1Token,
      body: { status: 'confirmed' },
    });
    await PUT(`/api/vendor/orders/${item2Id}/status`, {
      token: vendor2Token,
      body: { status: 'confirmed' },
    });

    const [order] = await db.select({ status: orders.status })
      .from(orders).where(eq(orders.id, orderId));
    expect(order!.status).toBe('confirmed');
  });
});

describe('Fulfillment — IDOR prevention', () => {
  it('vendor cannot update another vendor\'s order item', async () => {
    const { item2Id } = await placeMultiVendorOrder();

    // Vendor 1 tries to confirm vendor 2's item
    const res = await PUT(`/api/vendor/orders/${item2Id}/status`, {
      token: vendor1Token,
      body: { status: 'confirmed' },
    });

    // Should be 404 (vendor routes filter by vendorId — item not found for this vendor)
    expect([403, 404]).toContain(res.status);
  });
});

describe('Reviews — Duplicate protection (F2 fix)', () => {
  it('first review succeeds, second returns 409', async () => {
    const { orderId, item1Id } = await placeMultiVendorOrder();

    // Deliver item first (required for review)
    await PUT(`/api/vendor/orders/${item1Id}/status`, {
      token: vendor1Token,
      body: { status: 'confirmed' },
    });
    await PUT(`/api/vendor/orders/${item1Id}/status`, {
      token: vendor1Token,
      body: { status: 'shipped' },
    });
    await PUT(`/api/vendor/orders/${item1Id}/status`, {
      token: vendor1Token,
      body: { status: 'delivered' },
    });

    // Clean up transaction from delivery
    const txns = await db.select({ id: transactions.id }).from(transactions)
      .where(eq(transactions.orderItemId, item1Id));
    for (const t of txns) transactionIds.push(t.id);

    // First review
    const review1 = await POST('/api/reviews', {
      token: customerToken,
      body: { orderItemId: item1Id, rating: 5, comment: 'ممتاز!' },
    });
    expect(review1.status).toBe(201);
    const reviewData = review1.body?.['data'] as Record<string, unknown>;
    reviewIds.push(reviewData['id'] as number);

    // Second review — same item
    const review2 = await POST('/api/reviews', {
      token: customerToken,
      body: { orderItemId: item1Id, rating: 4, comment: 'كويس' },
    });
    expect(review2.status).toBe(409);
  });

  it('review on undelivered item is rejected', async () => {
    const { item1Id } = await placeMultiVendorOrder();

    // Try review without delivering — item is still "pending"
    const res = await POST('/api/reviews', {
      token: customerToken,
      body: { orderItemId: item1Id, rating: 3, comment: 'لسه ما وصل' },
    });
    expect(res.status).toBe(400);
  });
});
