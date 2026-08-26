import { describe, it, expect, afterAll } from 'vitest';
import {
  POST, GET, PUT, DEL,
  seedUser, seedCategory, seedVendor, seedProduct, seedCartItem, createAccessToken, cleanup, closeDb, db
} from './helpers.js';
import jwt from 'jsonwebtoken';

const ts = Date.now();
const cleanupIds = {
  userIds: [] as number[],
  categoryIds: [] as number[],
  vendorIds: [] as number[],
  productIds: [] as number[],
  cartItemIds: [] as number[],
};

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
    
    // User B adds item to cart
    const category = await seedCategory(`cat-${ts}`, `cat-${ts}`);
    const vendor = await seedVendor(userA, `vendor-${ts}`, `vendor-${ts}`);
    const product = await seedProduct(vendor, category);
    cleanupIds.categoryIds.push(category);
    cleanupIds.vendorIds.push(vendor);
    cleanupIds.productIds.push(product);

    const cartItemId = await seedCartItem(userB, product, 2);
    cleanupIds.cartItemIds.push(cartItemId);

    const res = await PUT(`/api/cart/${cartItemId}`, {
      token: tokenA,
      body: { quantity: 5 }
    });

    // Should be 403 or 404 because user A doesn't own this cart item
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
      body: { productId: cleanupIds.productIds[0], quantity: -5 }
    });

    expect(res.status).toBe(400);
  });
});

describe('Security — XSS & Data Sanitization', () => {
  it('sanitizes or rejects XSS payloads in string inputs', async () => {
    const user = await seedUser(`userXSS-${ts}@test.com`, 'Pass123');
    cleanupIds.userIds.push(user);
    const token = createAccessToken(user, `userXSS-${ts}@test.com`, 'customer');
    
    const res = await POST('/api/reviews', {
      token,
      body: { 
        productId: cleanupIds.productIds[0], 
        rating: 5,
        comment: '<script>alert("xss")</script> Great product!' 
      }
    });

    if (res.status === 201) {
      const data = res.body?.data as any;
      expect(data.comment).not.toContain('<script>');
    } else {
      expect(res.status).toBe(400);
    }
  });
});
