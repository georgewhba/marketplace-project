import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { env } from './env.js';
import { errorHandler, handleError } from './middleware/errorHandler.js';
import { generalRateLimit } from './middleware/rateLimit.js';
import { requestLogger } from './middleware/logger.js';
import * as Sentry from '@sentry/node';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import fs from 'node:fs/promises';
import path from 'node:path';

// Route imports
import authRoutes from './routes/auth.routes.js';
import storeRoutes from './routes/store.routes.js';
import cartRoutes from './routes/cart.routes.js';
import orderRoutes from './routes/order.routes.js';
import addressRoutes from './routes/address.routes.js';
import reviewRoutes from './routes/review.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import vendorRoutes from './routes/vendor.routes.js';
import adminRoutes from './routes/admin.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import refundsRoutes from './routes/refunds.routes.js';
import webhooksRoutes from './routes/webhooks.routes.js';

// Initialize Sentry before anything else
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 1.0,
  });
}

const app = new Hono();

// Global request logger and request-id injector
app.use('*', requestLogger);

// Global error handler (middleware — catches errors in the middleware chain)
app.use('*', errorHandler);

// Global error handler (Hono onError — catches errors thrown from subroutes
// mounted via app.route(); this is Hono's idiomatic way to handle route errors)
app.onError((err, c) => handleError(err, c));

// CORS — whitelist only, no wildcard with credentials
app.use('/api/*', cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

// Security headers on every response
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https://picsum.photos https://fastly.picsum.photos; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'");
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

// General rate limit on all API routes
app.use('/api/*', generalRateLimit);

// Health check (enhanced)
app.get('/api/health', async (c) => {
  let dbStatus = 'ok';
  try {
    await db.execute(sql`SELECT 1`);
  } catch (e) {
    dbStatus = 'error';
  }

  let diskStatus = 'ok';
  try {
    const stats = await fs.statfs(path.resolve(env.UPLOAD_DIR));
    // Check if free space is less than 100MB
    const freeMb = (stats.bavail * stats.bsize) / (1024 * 1024);
    if (freeMb < 100) {
      diskStatus = 'low_space';
    }
  } catch (e) {
    diskStatus = 'unknown';
  }

  const isHealthy = dbStatus === 'ok' && diskStatus !== 'error';

  return c.json({
    success: isHealthy,
    data: {
      status: isHealthy ? 'healthy' : 'unhealthy',
      db: dbStatus,
      disk: diskStatus,
      timestamp: new Date().toISOString()
    }
  }, isHealthy ? 200 : 503);
});

// Basic Metrics endpoint (Prometheus format)
app.get('/api/metrics', async (c) => {
  // In a real-world scenario with high scale, you'd use a library like prom-client.
  // For this simple implementation, we can just return a basic OK or wire up memory stats.
  const memUsage = process.memoryUsage();
  
  const metrics = [
    `# HELP process_resident_memory_bytes Resident memory size in bytes.`,
    `# TYPE process_resident_memory_bytes gauge`,
    `process_resident_memory_bytes ${memUsage.rss}`,
    `# HELP process_heap_bytes Heap size in bytes.`,
    `# TYPE process_heap_bytes gauge`,
    `process_heap_bytes ${memUsage.heapUsed}`
  ].join('\n');

  return c.text(metrics + '\n', 200, {
    'Content-Type': 'text/plain; version=0.0.4'
  });
});

// Mount routes
app.route('/api/auth', authRoutes);
app.route('/api/store', storeRoutes);
app.route('/api/cart', cartRoutes);
app.route('/api/orders', orderRoutes);
app.route('/api/addresses', addressRoutes);
app.route('/api/reviews', reviewRoutes);
app.route('/api/wishlist', wishlistRoutes);
app.route('/api/vendor', vendorRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/payments', paymentsRoutes);
app.route('/api/refunds', refundsRoutes);
app.route('/api/webhooks', webhooksRoutes);

// Serve uploaded files
app.use('/uploads/*', serveStatic({ root: './' }));

// In production, serve the built client
if (env.NODE_ENV === 'production') {
  app.use('*', serveStatic({ root: './client/dist' }));
}

// Start server
serve({
  fetch: app.fetch,
  port: env.PORT,
}, (info) => {
  console.log(`\n  Marketplace server running at http://localhost:${info.port}`);
  console.log(`  Environment: ${env.NODE_ENV}`);
  console.log(`  CORS origin: ${env.CORS_ORIGIN}\n`);
});

export default app;
export { app };
