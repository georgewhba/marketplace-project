import type { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { getCookie } from 'hono/cookie';
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

function extractToken(c: Context): string | undefined {
  let token = getCookie(c, 'accessToken');
  if (token === 'undefined' || token === 'null') {
    token = undefined;
  }

  if (!token) {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7).trim();
      if (bearerToken && bearerToken !== 'undefined' && bearerToken !== 'null') {
        token = bearerToken;
      }
    }
  }

  return token;
}

/**
 * Authentication middleware — verifies JWT access token from Authorization header or Cookie.
 * Attaches user info to context.
 */
export async function authenticate(c: Context, next: Next) {
  const token = extractToken(c);

  if (!token) {
    throw AppError.unauthorized('رمز المصادقة مطلوب');
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      userId: number;
      email: string;
      role: string;
      purpose?: string;
    };

    if (payload.purpose === 'mfa_temp') {
      throw AppError.unauthorized('يرجى إكمال التحقق الثنائي أولاً');
    }

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
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('انتهت صلاحية رمز المصادقة');
    }
    throw AppError.unauthorized('رمز مصادقة غير صالح');
  }

  await next();
}

/**
 * Optional authentication — attaches user if token exists, but doesn't block if missing.
 */
export async function optionalAuth(c: Context, next: Next) {
  const token = extractToken(c);

  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
        userId: number;
        email: string;
        role: string;
        purpose?: string;
      };

      if (payload.purpose !== 'mfa_temp') {
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

        if (user && user.isActive) {
          c.set('user', {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
          } as AuthUser);
        }
      }
    } catch {
      // Token invalid/expired — proceed without user
    }
  }

  await next();
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
