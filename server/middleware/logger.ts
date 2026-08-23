import pino from 'pino';
import { env } from '../env.js';
import type { Context, Next } from 'hono';
import { v4 as uuidv4 } from 'uuid';

// Configure Pino logger
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    }
  } : undefined,
});

/**
 * Middleware to inject a unique request ID and log incoming requests.
 */
export async function requestLogger(c: Context, next: Next) {
  // Generate or use provided request ID
  const requestId = c.req.header('x-request-id') || uuidv4();
  c.set('requestId', requestId);
  c.header('x-request-id', requestId);

  const start = Date.now();
  const method = c.req.method;
  const url = c.req.url;

  // Do not log health checks in production to reduce noise
  const isHealthCheck = url.includes('/api/health') || url.includes('/api/metrics');
  
  if (!isHealthCheck || env.NODE_ENV === 'development') {
    logger.info({ requestId, method, url }, 'Incoming Request');
  }

  try {
    await next();
  } finally {
    const ms = Date.now() - start;
    const status = c.res.status;
    
    if (!isHealthCheck || env.NODE_ENV === 'development') {
      if (status >= 500) {
        logger.error({ requestId, method, url, status, duration_ms: ms }, 'Request Failed');
      } else if (status >= 400) {
        logger.warn({ requestId, method, url, status, duration_ms: ms }, 'Request Warning');
      } else {
        logger.info({ requestId, method, url, status, duration_ms: ms }, 'Request Completed');
      }
    }
  }
}
