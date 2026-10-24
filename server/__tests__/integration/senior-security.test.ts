import { describe, it, expect, afterAll } from 'vitest';
import {
  POST, GET,
  seedUser, seedCategory, seedVendor, seedProduct, seedCartItem, seedAddress, seedCoupon,
  seedOrder, seedOrderItem, createAccessToken, cleanup, closeDb, db
} from './helpers.js';
import { shipments, shipmentEvents, transactions, vendors, orderItems, cartItems } from '../../db/schema/index.js';
import { eq, inArray } from 'drizzle-orm';
import { env } from '../../env.js';

const ts = Date.now();
const cleanupIds = {
  userIds: [] as number[],
  categoryIds: [] as number[],
  vendorIds: [] as number[],
  productIds: [] as number[],
  cartItemIds: [] as number[],
  addressIds: [] as number[],
  couponIds: [] as number[],
  orderIds: [] as number[],
  orderItemIds: [] as number[],
  transactionIds: [] as number[],
};

afterAll(async () => {
  if (cleanupIds.orderIds.length > 0) {
    const shipRows = await db.select().from(shipments).where(inArray(shipments.orderId, cleanupIds.orderIds));
    if (shipRows.length > 0) {
      await db.delete(shipmentEvents).where(inArray(shipmentEvents.shipmentId, shipRows.map(s => s.id)));
      await db.delete(shipments).where(inArray(shipments.orderId, cleanupIds.orderIds));
    }
    if (cleanupIds.vendorIds.length > 0) {
      await db.delete(transactions).where(inArray(transactions.vendorId, cleanupIds.vendorIds));
    }
    await db.delete(orderItems).where(inArray(orderItems.orderId, cleanupIds.orderIds));
  }
  if (cleanupIds.userIds.length > 0) {
    await db.delete(cartItems).where(inArray(cartItems.userId, cleanupIds.userIds));
  }
  await cleanup(cleanupIds);
  await closeDb();
});

describe('Senior Security — Business Logic & State Mutation', () => {
  it('prevents cart mutation from affecting an in-progress checkout', async () => {
    const user = await seedUser(`cartMut-${ts}@test.com`, 'Pass123');
    cleanupIds.userIds.push(user);
    const token = createAccessToken(user, `cartMut-${ts}@test.com`, 'customer');

    const category = await seedCategory(`catMut-${ts}`, `catmut-${ts}`);
    cleanupIds.categoryIds.push(category);

    const vendor = await seedVendor(user, `venMut-${ts}`, `venmut-${ts}`);
    cleanupIds.vendorIds.push(vendor);

    const cheapProduct = await seedProduct(vendor, category, { price: '10.00', stock: 10 });
    const expensiveProduct = await seedProduct(vendor, category, { price: '1000.00', stock: 10 });
    cleanupIds.productIds.push(cheapProduct, expensiveProduct);

    const address = await seedAddress(user);
    cleanupIds.addressIds.push(address);

    await seedCartItem(user, cheapProduct, 1);

    const checkoutRes = await POST('/api/orders', {
      token,
      body: { addressId: address }
    });

    expect(checkoutRes.status).toBe(201);
    const order = checkoutRes.body?.data as any;
    expect(Number(order.total)).toBe(40);
    cleanupIds.orderIds.push(order.id);

    const mutateRes = await POST('/api/cart', {
      token,
      body: { productId: expensiveProduct, quantity: 1 }
    });
    expect(mutateRes.status).toBe(201);

    const orderFetchRes = await GET(`/api/orders/${order.id}`, { token });
    const fetchedOrder = orderFetchRes.body?.data as any;
    expect(Number(fetchedOrder.total)).toBe(40);
  });
});

describe('Senior Security — Concurrency & Race Conditions', () => {
  it('prevents using a single-use coupon multiple times across concurrent users', async () => {
    const category = await seedCategory(`catCr-${ts}`, `catcr-${ts}`);
    cleanupIds.categoryIds.push(category);
    const vendorOwner = await seedUser(`venOwnerCr-${ts}@test.com`, 'Pass123', 'vendor');
    cleanupIds.userIds.push(vendorOwner);
    const vendor = await seedVendor(vendorOwner, `venCr-${ts}`, `vencr-${ts}`);
    cleanupIds.vendorIds.push(vendor);
    const product = await seedProduct(vendor, category, { price: '100.00', stock: 100 });
    cleanupIds.productIds.push(product);

    const couponId = await seedCoupon({ code: `ONCE${ts}`, type: 'fixed', value: '10.00', usageLimit: 1 });
    cleanupIds.couponIds.push(couponId);

    const promises = [];
    for (let i = 0; i < 5; i++) {
      const u = await seedUser(`couponRace-${ts}-${i}@test.com`, 'Pass123');
      cleanupIds.userIds.push(u);
      const tok = createAccessToken(u, `couponRace-${ts}-${i}@test.com`, 'customer');
      const addr = await seedAddress(u);
      cleanupIds.addressIds.push(addr);
      await seedCartItem(u, product, 1);

      promises.push(POST('/api/orders', {
        token: tok,
        body: { addressId: addr, couponCode: `ONCE${ts}` }
      }));
    }

    const results = await Promise.all(promises);
    const successes = results.filter(r => r.status === 201);
    expect(successes.length).toBe(1);

    for (const s of successes) {
      if (s.body?.data) {
        cleanupIds.orderIds.push((s.body.data as any).id);
      }
    }
  });
});

describe('Senior Security — Idempotency (Webhook Double Delivery)', () => {
  it('processes Bosta DELIVERED webhook idempotently without double-crediting vendor balance', async () => {
    const owner = await seedUser(`whOwner-${ts}@test.com`, 'Pass123', 'vendor');
    const customer = await seedUser(`whCust-${ts}@test.com`, 'Pass123', 'customer');
    cleanupIds.userIds.push(owner, customer);

    const category = await seedCategory(`catWh-${ts}`, `catwh-${ts}`);
    cleanupIds.categoryIds.push(category);
    const vendor = await seedVendor(owner, `venWh-${ts}`, `venwh-${ts}`, '10.00');
    cleanupIds.vendorIds.push(vendor);
    const product = await seedProduct(vendor, category, { price: '200.00', stock: 10 });
    cleanupIds.productIds.push(product);

    const orderId = await seedOrder(customer, { status: 'shipped', subtotal: '200.00', total: '230.00' });
    cleanupIds.orderIds.push(orderId);
    const trackNum = `BOSTA-IDEM-${ts}`;
    const itemId = await seedOrderItem(orderId, product, vendor, {
      price: '200.00',
      quantity: 1,
      total: '200.00',
      vendorStatus: 'shipped',
      commissionRate: '10.00',
      commissionAmount: '20.00',
      vendorAmount: '180.00',
    });
    cleanupIds.orderItemIds.push(itemId);

    await db.update(orderItems).set({ trackingNumber: trackNum }).where(eq(orderItems.id, itemId));
    await db.insert(shipments).values({
      orderId,
      vendorId: vendor,
      provider: 'bosta',
      trackingNumber: trackNum,
      status: 'in_transit',
    });

    const secret = env.BOSTA_WEBHOOK_SECRET || 'bosta_secret_123';
    const webhookBody = { trackingNumber: trackNum, state: { value: 'DELIVERED' } };
    const headers = { Authorization: `Bearer ${secret}` };

    // Send two delivery webhooks back-to-back
    const res1 = await POST('/api/webhooks/bosta', { body: webhookBody, headers });
    const res2 = await POST('/api/webhooks/bosta', { body: webhookBody, headers });
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const txRows = await db.select().from(transactions).where(eq(transactions.vendorId, vendor));
    expect(txRows.length).toBe(1);

    const [vRow] = await db.select().from(vendors).where(eq(vendors.id, vendor));
    expect(Number(vRow?.totalSales)).toBe(180);
  });
});

describe('Senior Security — Prototype Pollution / Type Juggling', () => {
  it('rejects Object injection in string fields', async () => {
    const res = await POST('/api/auth/login', {
      body: {
        email: { "$gt": "" },
        password: "Pass"
      }
    });

    expect(res.status).toBe(400);
  });
});
