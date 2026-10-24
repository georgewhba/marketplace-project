import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors.js';
import { redis, isRedisMock } from '../lib/redis.js';
import { env } from '../env.js';

/**
 * Safely extract client IP.
 * In test mode, uses x-forwarded-for directly so integration tests can isolate test cases.
 * Otherwise, uses the last hop of x-forwarded-for (trusted reverse proxy) or x-real-ip.
 */
export function getClientIp(c: Context): string {
  const xff = c.req.header('x-forwarded-for');
  if (xff) {
    if (env.NODE_ENV === 'test') {
      return xff.trim();
    }
    const hops = xff
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);
    if (hops.length > 0) {
      return hops[hops.length - 1]!;
    }
  }
  return c.req.header('x-real-ip')?.trim() || 'unknown';
}

function resolveUserIdOrIp(c: Context): string {
  const xff = c.req.header('x-forwarded-for');
  if (env.NODE_ENV === 'test' && xff?.trim().startsWith('test-')) {
    return `ip:${xff.trim()}`;
  }

  const user = c.get('user') as { id: number } | undefined;
  if (user?.id) return `user:${user.id}`;

  let token = getCookie(c, 'accessToken');
  if (!token || token === 'undefined' || token === 'null') {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const bearer = authHeader.substring(7).trim();
      if (bearer && bearer !== 'undefined' && bearer !== 'null') {
        token = bearer;
      }
    }
  }

  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId?: number };
      if (payload?.userId) return `user:${payload.userId}`;
    } catch {
      // Ignore invalid or expired tokens for rate-limit key resolution
    }
  }

  return `ip:${getClientIp(c)}`;
}

/**
 * Redis-backed fixed window rate limiter.
 * Key function determines the scope (per IP, per user, etc.)
 */
export function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
  keyFn?: (c: Context) => string;
  message?: string;
}) {
  return async (c: Context, next: Next) => {
    // Generate base key
    const rawKey = options.keyFn ? options.keyFn(c) : getClientIp(c);
    
    // Add a unique prefix based on maxRequests and windowMs to differentiate limiters
    const limiterPrefix = options.message?.includes('تسجيل الدخول') ? 'auth' : 
                          options.message?.includes('عمليات الرفع') ? 'upload' : 
                          options.maxRequests === 100 ? 'general' : 'default';
    
    const key = `ratelimit:${limiterPrefix}:${rawKey}`;

    try {
      // Fail open immediately if real Redis is disconnected
      if (!isRedisMock && redis.status && redis.status !== 'ready') {
        await next();
        return;
      }

      // Use pipeline for atomic increment and optional expire
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.pttl(key);
      
      const results = await Promise.race([
        pipeline.exec(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 500)),
      ]);
      if (!results) {
        await next();
        return;
      }

      const count = results[0]?.[1] as number;
      let ttl = results[1]?.[1] as number;

      // If key has no expiration (ttl === -1), set one
      if (ttl === -1) {
        await redis.pexpire(key, options.windowMs);
        ttl = options.windowMs;
      }

      if (count > options.maxRequests) {
        const retryAfter = Math.ceil(ttl / 1000);
        c.header('Retry-After', String(retryAfter));
        c.header('X-RateLimit-Limit', String(options.maxRequests));
        c.header('X-RateLimit-Remaining', '0');
        throw AppError.tooManyRequests(options.message);
      }

      c.header('X-RateLimit-Limit', String(options.maxRequests));
      c.header('X-RateLimit-Remaining', String(options.maxRequests - count));
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      
      // If Redis fails, log it but don't block the request (fail open)
      console.error('Rate Limiter Redis Error:', err);
    }

    await next();
  };
}

// Pre-configured rate limiters
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50,
  message: 'محاولات تسجيل دخول كثيرة جداً. يرجى المحاولة بعد 15 دقيقة.',
});

export const uploadRateLimit = rateLimit({
  windowMs: 60_000,
  maxRequests: 5, // Maximum 5 uploads per minute
  keyFn: (c) => resolveUserIdOrIp(c),
  message: 'عدد عمليات الرفع كثيرة جداً، يرجى المحاولة بعد دقيقة',
});

export const generalRateLimit = rateLimit({
  windowMs: 60_000,
  maxRequests: 100, // 100 requests per minute
  message: 'تم تجاوز الحد الأقصى للطلبات المسموحة، يرجى المحاولة بعد قليل',
});

// حماية ضد الضغط المتكرر (Spam / DDoS) على نفس الزر/الرابط
export const spamProtectionRateLimit = rateLimit({
  windowMs: 15_000, // 15 seconds
  maxRequests: 5, // Max 5 requests per 15 seconds for the exact same action
  keyFn: (c) => {
    const identifier = resolveUserIdOrIp(c);
    // Limit based on the user/IP + the exact path and method
    return `spam:${identifier}:${c.req.method}:${c.req.path}`;
  },
  message: 'لقد قمت بالضغط مرات كثيرة جداً متتالية! يرجى الانتظار ثوانٍ قليلة والمحاولة مجدداً.',
});
