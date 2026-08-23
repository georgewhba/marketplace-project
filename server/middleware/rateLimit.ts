import type { Context, Next } from 'hono';
import { AppError } from '../utils/errors.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory sliding window rate limiter.
 * Key function determines the scope (per IP, per user, etc.)
 */
export function rateLimit(options: {
  windowMs: number;
  maxRequests: number;
  keyFn?: (c: Context) => string;
  message?: string;
}) {
  const store = new Map<string, RateLimitEntry>();

  // Cleanup expired entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, 60_000);

  return async (c: Context, next: Next) => {
    const key = options.keyFn
      ? options.keyFn(c)
      : c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';

    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      c.header('X-RateLimit-Limit', String(options.maxRequests));
      c.header('X-RateLimit-Remaining', String(options.maxRequests - 1));
      await next();
      return;
    }

    entry.count++;

    if (entry.count > options.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      c.header('X-RateLimit-Limit', String(options.maxRequests));
      c.header('X-RateLimit-Remaining', '0');
      throw AppError.tooManyRequests(options.message);
    }

    c.header('X-RateLimit-Limit', String(options.maxRequests));
    c.header('X-RateLimit-Remaining', String(options.maxRequests - entry.count));
    await next();
  };
}

// Pre-configured rate limiters
export const authRateLimit = rateLimit({
  windowMs: 60_000,
  maxRequests: 5,
  message: 'عدد محاولات تسجيل الدخول كثيرة، حاول بعد دقيقة',
});

export const uploadRateLimit = rateLimit({
  windowMs: 60_000,
  maxRequests: 10,
  keyFn: (c) => {
    const user = c.get('user') as { id: number } | undefined;
    return user ? `user:${user.id}` : c.req.header('x-forwarded-for') ?? 'unknown';
  },
  message: 'عدد عمليات الرفع كثيرة، حاول بعد دقيقة',
});

export const generalRateLimit = rateLimit({
  windowMs: 60_000,
  maxRequests: 100,
});
