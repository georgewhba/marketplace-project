import type { Context, Next } from 'hono';
import { AppError } from '../utils/errors.js';

/**
 * Detects Postgres unique_violation errors (code 23505).
 * Works with postgres-js driver which exposes `code` on the error object.
 */
function isPostgresUniqueViolation(err: unknown): boolean {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return (err as { code: string }).code === '23505';
  }
  return false;
}

import * as Sentry from '@sentry/node';
import { logger } from './logger.js';

/**
 * Core error-to-response mapping.
 *
 * Called by both:
 *   - errorHandler middleware (catches errors thrown in the middleware chain)
 *   - app.onError() (catches errors thrown from subroutes via app.route())
 *
 * Hono 4.x does not propagate app.route() errors through app.use() try-catch;
 * app.onError() is the idiomatic way to handle those.
 */
export function handleError(err: unknown, c: Context): Response {
  const requestId = c.get('requestId') || 'unknown';

  if (err instanceof AppError) {
    return c.json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    }, err.statusCode as 400) as Response;
  }

  // Safety net: catch Postgres unique_violation (23505) as 409 Conflict
  if (isPostgresUniqueViolation(err)) {
    if (process.env['NODE_ENV'] !== 'test') {
      logger.warn({
        requestId,
        message: (err as Error).message,
        url: c.req.url,
        method: c.req.method,
        code: 'UNIQUE_VIOLATION'
      }, 'Postgres Unique Violation');
    }
    return c.json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'هذا العنصر موجود بالفعل',
      },
    }, 409) as Response;
  }

  // Unexpected error — log server-side only, return generic message to client
  const error = err instanceof Error ? err : new Error(String(err));
  
  if (process.env['NODE_ENV'] !== 'test') {
    // 1. Log with Pino
    logger.error({
      requestId,
      message: error.message,
      stack: error.stack,
      url: c.req.url,
      method: c.req.method,
    }, 'Unhandled Error');

    // 2. Report to Sentry
    Sentry.withScope((scope) => {
      scope.setTag('request_id', requestId as string);
      scope.setExtra('url', c.req.url);
      scope.setExtra('method', c.req.method);
      Sentry.captureException(error);
    });
  }

  return c.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'حدث خطأ غير متوقع في الخادم',
    },
  }, 500) as Response;
}

/**
 * Global error handler middleware — catches errors thrown in the middleware
 * chain (app.use() layers). Delegates to handleError.
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (err: unknown) {
    return handleError(err, c);
  }
}

