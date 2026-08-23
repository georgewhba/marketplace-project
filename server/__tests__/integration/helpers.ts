/**
 * Shared test helpers for integration tests.
 *
 * Uses direct DB access (same pattern as concurrency.test.ts).
 * For testing HTTP routes, we use Hono's app.request() which does NOT
 * require a running server — it processes requests in-process.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  users, vendors, categories, products, coupons, orders, orderItems,
  cartItems, addresses, refreshTokens, reviews, transactions, notifications,
} from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';

config(); // load .env

const DATABASE_URL = process.env['TEST_DATABASE_URL'] ?? process.env['DATABASE_URL'];
if (!DATABASE_URL) throw new Error('DATABASE_URL / TEST_DATABASE_URL not set');

const client = postgres(DATABASE_URL, { max: 10 });
const db = drizzle(client);

const JWT_ACCESS_SECRET = process.env['JWT_ACCESS_SECRET']!;
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET']!;

// ── User helpers ────────────────────────────────────────────────────────────

/**
 * Seed a user directly in DB (bypasses API, faster for setup).
 * Uses low bcrypt rounds (4) for speed in tests.
 */
export async function seedUser(
  email: string,
  password: string,
  role: 'customer' | 'vendor' | 'admin' = 'customer',
  firstName = 'تست',
  lastName = 'مستخدم',
) {
  const passwordHash = await bcrypt.hash(password, 4);
  const [user] = await db.insert(users).values({
    email,
    passwordHash,
    firstName,
    lastName,
    role,
  }).returning({ id: users.id });
  return user!.id;
}

/**
 * Create an access token directly (bypasses auth flow, faster for setup).
 */
export function createAccessToken(userId: number, email: string, role: string) {
  return jwt.sign({ userId, email, role }, JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

/**
 * Seed a vendor in DB. Returns vendor ID.
 */
export async function seedVendor(userId: number, storeName: string, storeSlug: string, commissionRate = '10.00') {
  const [vendor] = await db.insert(vendors).values({
    userId,
    storeName,
    storeSlug,
    status: 'approved',
    commissionRate,
  }).returning({ id: vendors.id });
  return vendor!.id;
}

/**
 * Seed a category. Returns category ID.
 */
export async function seedCategory(name: string, slug: string) {
  const [cat] = await db.insert(categories).values({
    name,
    slug,
    isActive: true,
  }).returning({ id: categories.id });
  return cat!.id;
}

/**
 * Seed a product. Returns product ID.
 */
export async function seedProduct(vendorId: number, categoryId: number, overrides: Partial<{
  name: string;
  slug: string;
  price: string;
  stock: number;
  isActive: boolean;
}> = {}) {
  const ts = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const [product] = await db.insert(products).values({
    vendorId,
    categoryId,
    name: overrides.name ?? `منتج-تست-${ts}`,
    slug: overrides.slug ?? `test-product-${ts}`,
    price: overrides.price ?? '100.00',
    stock: overrides.stock ?? 10,
    isActive: overrides.isActive ?? true,
  }).returning({ id: products.id });
  return product!.id;
}

/**
 * Seed an address for a user. Returns address ID.
 */
export async function seedAddress(userId: number) {
  const [addr] = await db.insert(addresses).values({
    userId,
    label: 'home',
    fullName: 'عميل تست',
    phone: '01012345678',
    addressLine1: 'شارع التحرير 15',
    city: 'القاهرة',
    country: 'Egypt',
  }).returning({ id: addresses.id });
  return addr!.id;
}

/**
 * Add an item to a user's cart.
 */
/**
 * Add an item to a user's cart. Uses upsert (ON CONFLICT DO UPDATE) so that
 * calling this multiple times for the same (userId, productId) increments
 * quantity rather than crashing with a unique-constraint violation.
 */
export async function seedCartItem(userId: number, productId: number, quantity = 1) {
  const [item] = await db.insert(cartItems).values({
    userId,
    productId,
    quantity,
  }).onConflictDoUpdate({
    target: [cartItems.userId, cartItems.productId],
    set: { quantity, updatedAt: new Date() },
  }).returning({ id: cartItems.id });
  return item!.id;
}

/**
 * Delete all cart items for a user. Useful for explicit test cleanup
 * when a test is expected to leave items in the cart.
 */
export async function clearCart(userId: number) {
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
}

/**
 * Seed a coupon. Returns coupon ID.
 */
export async function seedCoupon(overrides: Partial<{
  code: string;
  type: string;
  value: string;
  usageLimit: number | null;
  minOrderAmount: string;
}> = {}) {
  const [coupon] = await db.insert(coupons).values({
    code: overrides.code ?? `TEST${Date.now()}`,
    type: overrides.type ?? 'fixed',
    value: overrides.value ?? '50.00',
    usageLimit: overrides.usageLimit ?? null,
    minOrderAmount: overrides.minOrderAmount ?? '0',
    isActive: true,
  }).returning({ id: coupons.id });
  return coupon!.id;
}

// ── Hono App request helper ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _app: any = null;

/**
 * Lazily import the Hono app. The app is created once per test process.
 * This uses app.request() which does NOT start a real HTTP server.
 */
async function getApp(): Promise<{ request: (req: Request) => Response | Promise<Response> }> {
  if (!_app) {
    const mod = await import('../../index.js');
    _app = mod.app ?? mod.default;
  }
  return _app;
}

/**
 * A unique IP per test file run — keeps each test file's requests in a separate
 * rate-limit bucket so tests don't exhaust each other's windows.
 */

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
  /** Override the synthetic IP (useful for testing rate limiting itself). */
  ip?: string;
}

async function httpRequest(method: string, path: string, opts: RequestOptions = {}) {
  const app = await getApp();
  const url = `http://localhost${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Per-request unique IP: each test call gets its own rate-limit window
    // so tests never exhaust the in-memory rate limiter (5 auth calls/min etc.)
    'X-Forwarded-For': opts.ip ?? `test-${crypto.randomUUID()}`,
    ...opts.headers,
  };
  if (opts.token) {
    headers['Authorization'] = `Bearer ${opts.token}`;
  }

  const init: RequestInit = { method, headers };
  if (opts.body !== undefined && method !== 'GET') {
    init.body = JSON.stringify(opts.body);
  }

  const res = await Promise.resolve(app.request(new Request(url, init)));
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json as Record<string, unknown> | null };
}

export async function GET(path: string, opts: RequestOptions = {}) {
  return httpRequest('GET', path, opts);
}
export async function POST(path: string, opts: RequestOptions = {}) {
  return httpRequest('POST', path, opts);
}
export async function PUT(path: string, opts: RequestOptions = {}) {
  return httpRequest('PUT', path, opts);
}
export async function DEL(path: string, opts: RequestOptions = {}) {
  return httpRequest('DELETE', path, opts);
}

// ── Cleanup helpers ─────────────────────────────────────────────────────────

/**
 * Clean up all test data created by a specific test.
 * Pass arrays of IDs to delete (in correct FK order).
 */
export async function cleanup(ids: {
  reviewIds?: number[];
  transactionIds?: number[];
  orderItemIds?: number[];
  orderIds?: number[];
  cartItemIds?: number[];
  addressIds?: number[];
  productIds?: number[];
  couponIds?: number[];
  vendorIds?: number[];
  userIds?: number[];
  categoryIds?: number[];
}) {
  for (const id of ids.reviewIds ?? []) await db.delete(reviews).where(eq(reviews.id, id));
  for (const id of ids.transactionIds ?? []) await db.delete(transactions).where(eq(transactions.id, id));
  for (const id of ids.orderItemIds ?? []) await db.delete(orderItems).where(eq(orderItems.id, id));
  for (const id of ids.orderIds ?? []) await db.delete(orders).where(eq(orders.id, id));
  for (const id of ids.cartItemIds ?? []) await db.delete(cartItems).where(eq(cartItems.id, id));
  for (const id of ids.addressIds ?? []) await db.delete(addresses).where(eq(addresses.id, id));
  for (const id of ids.productIds ?? []) await db.delete(products).where(eq(products.id, id));
  for (const id of ids.couponIds ?? []) await db.delete(coupons).where(eq(coupons.id, id));
  for (const id of ids.vendorIds ?? []) await db.delete(vendors).where(eq(vendors.id, id));
  for (const id of ids.userIds ?? []) {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, id));
    await db.delete(notifications).where(eq(notifications.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }
  for (const id of ids.categoryIds ?? []) await db.delete(categories).where(eq(categories.id, id));
}

export async function closeDb() {
  await client.end();
}

export { db };
