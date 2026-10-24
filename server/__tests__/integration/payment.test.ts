import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  POST,
  seedUser, seedCategory, seedVendor, seedProduct, createAccessToken, cleanup, closeDb, seedCartItem, seedAddress
} from './helpers.js';

const ts = Date.now();
const cleanupIds = {
  userIds: [] as number[],
  categoryIds: [] as number[],
  vendorIds: [] as number[],
  productIds: [] as number[],
  addressIds: [] as number[],
  cartItemIds: [] as number[],
  orderIds: [] as number[],
};

afterAll(async () => {
  await cleanup(cleanupIds);
  await closeDb();
});

describe('Payment & Checkout Edge Cases', () => {
  let user: number, token: string, product: number, address: number;

  beforeAll(async () => {
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

  it('rejects price manipulation in checkout payload and enforces server-side price calculation', async () => {
    // 1. Extra malicious fields (totalAmount / total) must be rejected by strict schema
    const tamperedRes = await POST('/api/orders', {
      token,
      body: {
        addressId: address,
        total: 1.00, // Malicious attempt to override price
      }
    });
    expect(tamperedRes.status).toBe(400);

    // 2. Valid checkout must compute total from DB product price (2 * 100 = 200 + shipping)
    const validRes = await POST('/api/orders', {
      token,
      body: {
        addressId: address,
      }
    });
    expect(validRes.status).toBe(201);
    const orderData = validRes.body?.data as any;
    expect(Number(orderData.total)).toBeGreaterThanOrEqual(200);
    if (orderData?.id) {
      cleanupIds.orderIds.push(orderData.id);
    }
  });

  it('rejects Paymob webhook with invalid HMAC signature (Forgery)', async () => {
    const fakePayload = {
      obj: {
        id: 12345,
        success: true,
        order: { id: 9999 }
      }
    };

    const res = await POST('/api/payments/webhook?hmac=invalid_hmac_hash', {
      body: fakePayload
    });

    expect([400, 401, 403]).toContain(res.status);
  });
});
