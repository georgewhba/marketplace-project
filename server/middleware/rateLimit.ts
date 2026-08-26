import type { Context, Next } from 'hono';
import { AppError } from '../utils/errors.js';
import { redis } from '../lib/redis.js';

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
    const rawKey = options.keyFn
      ? options.keyFn(c)
      : c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
    
    const key = `ratelimit:${rawKey}`;

    try {
      // Use pipeline for atomic increment and optional expire
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.pttl(key);
      
      const results = await pipeline.exec();
      if (!results) {
        await next();
        return;
      }

      const count = results[0][1] as number;
      let ttl = results[1][1] as number;

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
      await next();
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      
      // If Redis fails, log it but don't block the request (fail open)
      console.error('Rate Limiter Redis Error:', err);
      await next();
    }
  };
}

// Pre-configured rate limiters
export const authRateLimit = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  maxRequests: 5, // Strict limit for auth endpoints
  message: 'عدد محاولات تسجيل الدخول كثيرة جداً، يرجى المحاولة بعد 15 دقيقة',
});

export const uploadRateLimit = rateLimit({
  windowMs: 60_000,
  maxRequests: 5, // Maximum 5 uploads per minute
  keyFn: (c) => {
    const user = c.get('user') as { id: number } | undefined;
    return user ? `user:${user.id}` : c.req.header('x-forwarded-for') ?? 'unknown';
  },
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
    const user = c.get('user') as { id: number } | undefined;
    const identifier = user ? `user:${user.id}` : `ip:${c.req.header('x-forwarded-for') ?? 'unknown'}`;
    // Limit based on the user/IP + the exact path and method
    return `spam:${identifier}:${c.req.method}:${c.req.path}`;
  },
  message: 'لقد قمت بالضغط مرات كثيرة جداً متتالية! يرجى الانتظار ثوانٍ قليلة والمحاولة مجدداً.',
});
