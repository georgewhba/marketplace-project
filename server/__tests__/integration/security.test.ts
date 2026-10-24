import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  POST, GET, PUT,
  seedUser, seedCategory, seedVendor, seedProduct, seedCartItem, seedOrder, seedOrderItem,
  createAccessToken, cleanup, closeDb
} from './helpers.js';
import jwt from 'jsonwebtoken';

const ts = Date.now();
const cleanupIds = {
  userIds: [] as number[],
  categoryIds: [] as number[],
  vendorIds: [] as number[],
  productIds: [] as number[],
  cartItemIds: [] as number[],
  orderIds: [] as number[],
  orderItemIds: [] as number[],
  reviewIds: [] as number[],
};

let sharedVendorId: number;
let sharedCategoryId: number;
let sharedProductId: number;

beforeAll(async () => {
  const owner = await seedUser(`secOwner-${ts}@test.com`, 'Pass123', 'vendor');
  cleanupIds.userIds.push(owner);
  sharedCategoryId = await seedCategory(`cat-${ts}`, `cat-${ts}`);
  sharedVendorId = await seedVendor(owner, `vendor-${ts}`, `vendor-${ts}`);
  sharedProductId = await seedProduct(sharedVendorId, sharedCategoryId);
  cleanupIds.categoryIds.push(sharedCategoryId);
  cleanupIds.vendorIds.push(sharedVendorId);
  cleanupIds.productIds.push(sharedProductId);
});

afterAll(async () => {
  await cleanup(cleanupIds);
  await closeDb();
});

describe('Security — IDOR (Insecure Direct Object Reference)', () => {
  it('prevents user A from accessing user B cart', async () => {
    const userA = await seedUser(`userA-${ts}@test.com`, 'Pass123');
    const userB = await seedUser(`userB-${ts}@test.com`, 'Pass123');
    cleanupIds.userIds.push(userA, userB);

    const tokenA = createAccessToken(userA, `userA-${ts}@test.com`, 'customer');

    const cartItemId = await seedCartItem(userB, sharedProductId, 2);
    cleanupIds.cartItemIds.push(cartItemId);

    const res = await PUT(`/api/cart/${cartItemId}`, {
      token: tokenA,
      body: { quantity: 5 }
    });

    expect([403, 404]).toContain(res.status);
  });
});

describe('Security — JWT Tampering', () => {
  it('rejects tampered JWT tokens', async () => {
    const fakeToken = jwt.sign({ userId: 1, role: 'admin' }, 'WRONG_SECRET', { expiresIn: '1h' });
    const res = await GET('/api/admin/dashboard', { token: fakeToken });
    expect(res.status).toBe(401);
  });
});

describe('Security — Negative Quantities', () => {
  it('rejects adding negative quantities to cart', async () => {
    const user = await seedUser(`userNeg-${ts}@test.com`, 'Pass123');
    cleanupIds.userIds.push(user);
    const token = createAccessToken(user, `userNeg-${ts}@test.com`, 'customer');

    const res = await POST('/api/cart', {
      token,
      body: { productId: sharedProductId, quantity: -5 }
    });

    expect(res.status).toBe(400);
  });
});

describe('Security — XSS & Data Sanitization', () => {
  it('sanitizes XSS payloads in review comment and title on a delivered order item', async () => {
    const user = await seedUser(`userXSS-${ts}@test.com`, 'Pass123');
    cleanupIds.userIds.push(user);
    const token = createAccessToken(user, `userXSS-${ts}@test.com`, 'customer');

    const orderId = await seedOrder(user, { status: 'delivered' });
    cleanupIds.orderIds.push(orderId);
    const orderItemId = await seedOrderItem(orderId, sharedProductId, sharedVendorId, {
      vendorStatus: 'delivered',
    });
    cleanupIds.orderItemIds.push(orderItemId);

    const res = await POST('/api/reviews', {
      token,
      body: {
        orderItemId,
        rating: 5,
        title: '<img src=x onerror=alert(1)>Nice',
        comment: '<script>alert("xss")</script> Great product!'
      }
    });

    expect(res.status).toBe(201);
    const data = res.body?.data as any;
    if (data?.id) cleanupIds.reviewIds.push(data.id);
    expect(data.comment).not.toContain('<script>');
    expect(data.title).not.toContain('onerror');
  });
});
