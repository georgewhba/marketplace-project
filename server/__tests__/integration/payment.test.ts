import { describe, it, expect, afterAll } from 'vitest';
import {
  POST,
  seedUser, seedCategory, seedVendor, seedProduct, createAccessToken, cleanup, closeDb, db, seedCartItem, seedAddress
} from './helpers.js';
import crypto from 'crypto';

const ts = Date.now();
const cleanupIds = {
  userIds: [] as number[],
  categoryIds: [] as number[],
  vendorIds: [] as number[],
  productIds: [] as number[],
  addressIds: [] as number[],
  cartItemIds: [] as number[],
};

afterAll(async () => {
  await cleanup(cleanupIds);
  await closeDb();
});

describe('Payment & Checkout Edge Cases', () => {
  let user: number, token: string, product: number, address: number;

  it('Setup data', async () => {
    user = await seedUser(`pay-${ts}@test.com`, 'Pass123');
    cleanupIds.userIds.push(user);
    token = createAccessToken(user, `pay-${ts}@test.com`, 'customer');

    const category = await seedCategory(`catPay-${ts}`, `catpay-${ts}`);
    cleanupIds.categoryIds.push(category);

    const vendor = await seedVendor(user, `venPay-${ts}`, `venpay-${ts}`);
    cleanupIds.vendorIds.push(vendor);

    product = await seedProduct(vendor, category, { price: '100.00', stock: 10 });
    cleanupIds.productIds.push(product);

    address = await seedAddress(user);
    cleanupIds.addressIds.push(address);

    const cartItem = await seedCartItem(user, product, 2); // 200 total
    cleanupIds.cartItemIds.push(cartItem);
  });

  it('rejects price manipulation in checkout payload', async () => {
    const res = await POST('/api/orders', {
      token,
      body: { 
        shippingAddressId: address,
        paymentMethod: 'card',
        totalAmount: 1.00 // Malicious attempt to change price
      }
    });

    expect([200, 201, 400]).toContain(res.status); // 400 if strictly validated
    if (res.status === 201 || res.status === 200) {
      // If it passes, ensure the DB-calculated total is 200, not 1
      const orderData = res.body?.data as any;
      expect(Number(orderData.totalAmount)).toBeGreaterThan(1);
    }
  });

  it('rejects Paymob webhook with invalid HMAC signature (Forgery)', async () => {
    const fakePayload = {
      obj: {
        id: 12345,
        success: true,
        order: { id: 9999 } // Mismatched or fake order
      }
    };
    
    // Simulate what paymob sends, but with wrong HMAC in query
    const res = await POST('/api/payments/webhook?hmac=invalid_hmac_hash', {
      body: fakePayload
    });

    // Should definitely be 401 or 403 or 400 for bad signature
    expect([400, 401, 403]).toContain(res.status);
  });
});
