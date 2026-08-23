import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import { AppError } from '../utils/errors.js';
import { db } from '../db/index.js';
import { users, vendors } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export interface AuthVendor {
  id: number;
  userId: number;
  storeName: string;
  storeSlug: string;
  status: string;
  commissionRate: string;
}

/**
 * Authentication middleware — verifies JWT access token from Authorization header.
 * Attaches user info to context.
 */
export async function authenticate(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    throw AppError.unauthorized('رمز المصادقة مطلوب');
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      userId: number;
      email: string;
      role: string;
    };

    // Fetch current user state from DB (ensures account is still active)
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user || !user.isActive) {
      throw AppError.unauthorized('الحساب غير نشط أو غير موجود');
    }

    c.set('user', {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    } as AuthUser);

    await next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('انتهت صلاحية رمز المصادقة');
    }
    throw AppError.unauthorized('رمز مصادقة غير صالح');
  }
}

/**
 * Optional authentication — attaches user if token exists, but doesn't block if missing.
 */
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    await next();
    return;
  }

  try {
    await authenticate(c, next);
  } catch {
    // Token invalid/expired — proceed without user
    await next();
  }
}

/**
 * Load vendor data for authenticated vendor users.
 * Must be used after authenticate middleware.
 */
export async function loadVendor(c: Context, next: Next) {
  const user = c.get('user') as AuthUser;
  
  if (user.role !== 'vendor') {
    throw AppError.forbidden('هذه الصفحة مخصصة للبائعين فقط');
  }

  const [vendor] = await db
    .select()
    .from(vendors)
    .where(eq(vendors.userId, user.id))
    .limit(1);

  if (!vendor) {
    throw AppError.notFound('حساب البائع');
  }

  if (vendor.status !== 'approved') {
    throw AppError.forbidden('حساب البائع لم يتم تفعيله بعد');
  }

  c.set('vendor', {
    id: vendor.id,
    userId: vendor.userId,
    storeName: vendor.storeName,
    storeSlug: vendor.storeSlug,
    status: vendor.status,
    commissionRate: vendor.commissionRate,
  } as AuthVendor);

  await next();
}
