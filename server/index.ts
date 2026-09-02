import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { csrf } from 'hono/csrf';
import { serveStatic } from '@hono/node-server/serve-static';
import { env } from './env.js';
import { errorHandler, handleError } from './middleware/errorHandler.js';
import { generalRateLimit, spamProtectionRateLimit } from './middleware/rateLimit.js';
import { requestLogger } from './middleware/logger.js';
import * as Sentry from '@sentry/node';
import { db, queryClient } from './db/index.js';
import { sql } from 'drizzle-orm';
import { subscriptionPlans } from './db/schema/subscriptions.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import cron from 'node-cron';
import { generateSettlements } from './services/settlement.service.js';

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
import roleRoutes from './routes/roles.routes.js';
import chatRoutes from './routes/chat.routes.js';
import agentRoutes from './routes/agent.routes.js';

import { enforceHttps, getRequestBaseUrl } from './middleware/httpsRedirect.js';

// Initialize Sentry before anything else
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 1.0,
  });
}

const app = new Hono();

// Enforce HTTPS in production (redirects HTTP requests behind reverse proxies, keeping ACME challenges open)
app.use('*', enforceHttps);

// Serve Let's Encrypt / ACME challenges statically before SPA fallback
app.use('/.well-known/acme-challenge/*', serveStatic({ root: './' }));

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

// Global secure headers
app.use('*', secureHeaders({
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  xXssProtection: '1; mode=block',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  crossOriginOpenerPolicy: 'same-origin-allow-popups',
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "blob:", "https://picsum.photos", "https://fastly.picsum.photos", "https:"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    connectSrc: ["'self'", "https://accounts.google.com"],
    frameSrc: ["'self'", "https://accept.paymob.com", "https://accept.paymobsolutions.com", "https://accounts.google.com"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    upgradeInsecureRequests: [],
  },
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
  }
}));

// CSRF Protection
// By default, checks if Origin matches the host, but here we can whitelist the frontend origin
app.use('*', csrf({ origin: typeof env.CORS_ORIGIN === 'string' ? env.CORS_ORIGIN : undefined }));

// General rate limit on all API routes (100 req/min for GET/etc)
app.use('/api/*', generalRateLimit);

// Spam protection (DDoS / Rapid Clicks) on all mutation endpoints
app.use('/api/*', async (c, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(c.req.method)) {
    return spamProtectionRateLimit(c, next);
  }
  return next();
});

// AI Agent Discovery Headers Middleware
app.use('/api/*', async (c, next) => {
  await next();
  const baseUrl = getRequestBaseUrl(c);
  c.header('Link', `<${baseUrl}/api/catalog>; rel="service-desc", <${baseUrl}/llms.txt>; rel="alternate"`);
});

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

// Debug endpoint for R2 configuration and TLS testing
app.get('/api/debug/r2', async (c) => {
  const accountId = env.R2_ACCOUNT_ID?.trim() || 'NOT_SET';
  
  const previewId = accountId !== 'NOT_SET' 
    ? `${accountId.slice(0, 4)}...${accountId.slice(-4)}` 
    : 'NOT_SET';
  
  const hasAccessKey = !!env.R2_ACCESS_KEY_ID;
  const hasSecretKey = !!env.R2_SECRET_ACCESS_KEY;
  const bucketName = env.R2_BUCKET_NAME || 'NOT_SET';
  const publicUrl = env.R2_PUBLIC_URL || 'NOT_SET';
  const jurisdiction = env.R2_JURISDICTION?.trim() || '';

  let tlsTestResult = 'Not tested';
  let tlsError = null;
  let endpointUsed = 'NOT_SET';

  if (accountId !== 'NOT_SET') {
    const https = await import('node:https');
    
    try {
      const jurisdictionPart = jurisdiction ? `.${jurisdiction}` : '';
      const endpoint = `${accountId}${jurisdictionPart}.r2.cloudflarestorage.com`;
      endpointUsed = endpoint;
      
      tlsTestResult = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: endpoint,
          port: 443,
          method: 'GET',
          path: '/'
        }, (res) => {
          resolve(`Success, status: ${res.statusCode}`);
        });

        req.on('error', (e) => {
          reject(e);
        });

        req.end();
      });
    } catch (e: any) {
      tlsTestResult = 'Failed';
      tlsError = e.message;
    }
  }

  return c.json({
    config: {
      accountIdLength: accountId.length,
      accountIdPreview: previewId,
      hasAccessKey,
      hasSecretKey,
      bucketName,
      publicUrl,
      jurisdiction,
      endpointUsed
    },
    tlsTest: {
      result: tlsTestResult,
      error: tlsError
    }
  });
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
app.route('/', agentRoutes); // Root level mounting for robots.txt, sitemap, .well-known
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
app.route('/api/roles', roleRoutes);
app.route('/api/chat', chatRoutes);

// Serve uploaded files
app.use('/uploads/*', serveStatic({ root: './' }));

// In production, serve the built client
if (env.NODE_ENV === 'production') {
  // Serve static assets, but NOT index.html
  // We want ALL index.html requests to go through our injection middleware
  app.use('/assets/*', serveStatic({ root: './client/dist' }));
  app.use('/vite.svg', serveStatic({ root: './client/dist' }));
  app.use('/favicon.ico', serveStatic({ root: './client/dist' }));
  app.use('/favicon.svg', serveStatic({ root: './client/dist' }));
  app.use('/icons.svg', serveStatic({ root: './client/dist' }));
  
  // SPA fallback for React Router + explicit index.html handling
  app.get('*', async (c) => {
    try {
      let indexHtml = await fs.readFile(path.join(process.cwd(), 'client/dist/index.html'), 'utf-8');
      
      // Inject Runtime Environment Variables
      const runtimeEnv = {
        VITE_GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
      };
      const scriptTag = `<script>window.ENV = ${JSON.stringify(runtimeEnv)};</script></head>`;
      indexHtml = indexHtml.replace('</head>', scriptTag);
      
      return c.html(indexHtml);
    } catch (err) {
      return c.notFound();
    }
  });
}

import { initAnalyticsJobs } from './jobs/analytics.js';
import { processExpiredSubscriptions } from './jobs/subscription.job.js';

// Determine if this process should run cron jobs (only the primary instance in a PM2 cluster)
const isCronRunner = process.env.NODE_APP_INSTANCE === undefined || process.env.NODE_APP_INSTANCE === '0';

if (isCronRunner) {
  // Schedule settlements generation (runs daily at midnight)
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[Cron] Running generateSettlements...');
      const result = await generateSettlements();
      console.log(`[Cron] Generated ${result.createdCount} new settlements.`);
    } catch (error) {
      console.error('[Cron] Error generating settlements:', error);
    }
  });

  // Schedule subscription expiration check (runs daily at 1 AM)
  cron.schedule('0 1 * * *', async () => {
    try {
      console.log('[Cron] Running processExpiredSubscriptions...');
      await processExpiredSubscriptions();
    } catch (error) {
      console.error('[Cron] Error processing expired subscriptions:', error);
    }
  });

  // Initialize analytics background jobs
  initAnalyticsJobs();
  console.log('[Cron] Background jobs initialized on this instance.');
}

import { closeQueues } from './jobs/index.js';

// Start server only if not in test environment
if (env.NODE_ENV !== 'test') {
  
  // Auto-seed subscription plans for production if empty
  const autoSeedPlans = async () => {
    try {
      const existing = await db.select({ count: sql<number>`count(*)` }).from(subscriptionPlans);
      if (!existing[0] || Number(existing[0].count) === 0) {
        console.log('[Auto-Seed] No subscription plans found. Seeding default (Basic, Plus, Pro) plans...');
        const plansToInsert = [
          { name: 'Basic', slug: 'basic', priceMonthly: '0.00', commissionRate: '12.00', productLimit: 50, imageLimitPerProduct: 3, autoShippingEnabled: false, advancedAnalytics: false, bulkActionsEnabled: false, payoutCycleDays: 30, sortOrder: 1, isActive: true },
          { name: 'Plus', slug: 'plus', priceMonthly: '499.00', commissionRate: '8.00', productLimit: 500, imageLimitPerProduct: 5, autoShippingEnabled: true, advancedAnalytics: true, bulkActionsEnabled: false, payoutCycleDays: 14, sortOrder: 2, isActive: true },
          { name: 'Pro', slug: 'pro', priceMonthly: '1499.00', commissionRate: '4.00', productLimit: null, imageLimitPerProduct: 10, autoShippingEnabled: true, advancedAnalytics: true, bulkActionsEnabled: true, payoutCycleDays: 7, trustBadge: 'verified', sortOrder: 3, isActive: true }
        ];
        for (const p of plansToInsert) {
          await db.insert(subscriptionPlans).values(p);
        }
        console.log('[Auto-Seed] Subscription plans seeded successfully.');
      }
    } catch (error) {
      console.error('[Auto-Seed] Error seeding plans:', error);
    }
  };

  autoSeedPlans().then(() => {
    const server = serve({
      fetch: app.fetch,
      port: env.PORT,
    }, (info) => {
      console.log(`\n  Marketplace server running at http://localhost:${info.port}`);
      console.log(`  Environment: ${env.NODE_ENV}`);
      console.log(`  CORS origin: ${env.CORS_ORIGIN}`);
      console.log(`  PM2 Instance: ${process.env.NODE_APP_INSTANCE ?? 'none'}\n`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\n[${signal}] Received. Shutting down gracefully...`);
      
      // Stop accepting new connections
      server.close(() => {
        console.log('HTTP server closed.');
      });

      try {
        await closeQueues();
        // Close database connections safely
        await queryClient.end({ timeout: 5 });
        console.log('Database connections closed.');
        process.exit(0);
      } catch (err) {
        console.error('Error during database shutdown:', err);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  });
}

export default app;
export { app };
