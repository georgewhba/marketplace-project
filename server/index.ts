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
import { authenticate } from './middleware/authenticate.js';
import { authorize } from './middleware/authorize.js';
import * as Sentry from '@sentry/node';
import { db, queryClient } from './db/index.js';
import { sql } from 'drizzle-orm';
import { subscriptionPlans } from './db/schema/subscriptions.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import cron from 'node-cron';
import { generateSettlements } from './services/settlement.service.js';
import { initAnalyticsJobs } from './jobs/analytics.js';
import { processExpiredSubscriptions } from './jobs/subscription.job.js';
import { closeQueues } from './jobs/index.js';

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

// Markdown for Agents (Content Negotiation per RFC / Cloudflare standards)
app.use('*', async (c, next) => {
  const accept = c.req.header('Accept') || '';
  if (accept.includes('text/markdown') && !c.req.path.startsWith('/api/') && !c.req.path.startsWith('/uploads/')) {
    const baseUrl = getRequestBaseUrl(c);
    const md = `# سوق مصر — منصة التجارة الإلكترونية الأولى (Marketplace Egypt)

مرحباً بك في سوق مصر، المنصة الرائدة متعددة البائعين للتجارة الإلكترونية والتسوق الآمن عبر الإنترنت.

## موارد الوكلاء والذكاء الاصطناعي (Agent Resources)
- دليل الوكلاء الذكيين: [llms.txt](${baseUrl}/llms.txt)
- كتالوج الخدمات (ARD Manifest): [ai-catalog.json](${baseUrl}/.well-known/ai-catalog.json)
- كتالوج الروابط (RFC 9727): [api-catalog](${baseUrl}/.well-known/api-catalog)
- مواصفات OpenAPI: [api-catalog](${baseUrl}/api/catalog)
- بطاقة خادم MCP: [server-card.json](${baseUrl}/.well-known/mcp/server-card.json)
- فهرس مهارات الوكلاء: [agent-skills/index.json](${baseUrl}/.well-known/agent-skills/index.json)
- إرشادات مصادقة الوكلاء: [auth.md](${baseUrl}/auth.md)
- خريطة الموقع: [sitemap.xml](${baseUrl}/sitemap.xml)

## الأقسام والمنتجات الرئيسية
- الإلكترونيات، الأزياء، الكتب، المستلزمات المنزلية
- منتجات موثقة من بائعين معتمدين مع شحن سريع وضمان جودة.

## بروتوكولات التجارة المؤتمتة
- يدعم الموقع بروتوكولات ACP (Agentic Commerce Protocol) و UCP و WebMCP و MCP و MPP للتسوق المؤتمت.
`;
    return new Response(md, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'x-markdown-tokens': '320',
        'Vary': 'Accept'
      }
    });
  }
  await next();
});

// Global request logger and request-id injector
app.use('*', requestLogger);

// Global error handler (middleware — catches errors in the middleware chain)
app.use('*', errorHandler);

// Global error handler (Hono onError — catches errors thrown from subroutes)
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
    scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
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

// CSRF Protection (skip external webhook endpoints authenticated via HMAC/Bearer secrets)
const csrfMiddleware = csrf({ origin: typeof env.CORS_ORIGIN === 'string' ? env.CORS_ORIGIN : undefined });
app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/api/webhooks/') || c.req.path === '/api/payments/webhook') {
    return next();
  }
  return csrfMiddleware(c, next);
});

// General rate limit on all API routes (100 req/min for GET/etc)
app.use('/api/*', generalRateLimit);

// Spam protection (DDoS / Rapid Clicks) on all mutation endpoints
app.use('/api/*', async (c, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(c.req.method)) {
    return spamProtectionRateLimit(c, next);
  }
  return next();
});

// Global AI Agent Discovery Headers (RFC 8288 & RFC 9727) on all responses
app.use('*', async (c, next) => {
  await next();
  const baseUrl = getRequestBaseUrl(c);
  c.header(
    'Link',
    `<${baseUrl}/.well-known/api-catalog>; rel="api-catalog", <${baseUrl}/.well-known/ai-catalog.json>; rel="service-desc", <${baseUrl}/.well-known/mcp/server-card.json>; rel="service-desc", <${baseUrl}/llms.txt>; rel="alternate", <${baseUrl}/auth.md>; rel="service-doc"`
  );
});

// Health check (enhanced)
app.get('/api/health', async (c) => {
  let dbStatus = 'ok';
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    dbStatus = 'error';
  }

  let diskStatus = 'ok';
  try {
    const stats = await fs.statfs(path.resolve(env.UPLOAD_DIR));
    const freeMb = (stats.bavail * stats.bsize) / (1024 * 1024);
    if (freeMb < 100) {
      diskStatus = 'low_space';
    }
  } catch {
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

// Debug endpoint for R2 configuration and TLS testing — restricted to authenticated Admins
app.get('/api/debug/r2', authenticate, authorize('admin'), async (c) => {
  if (env.NODE_ENV === 'production') {
    return c.notFound();
  }
  const accountId = env.R2_ACCOUNT_ID?.trim() || 'NOT_SET';
  const previewId = accountId !== 'NOT_SET'
    ? `${accountId.slice(0, 4)}...${accountId.slice(-4)}`
    : 'NOT_SET';

  return c.json({
    config: {
      accountIdPreview: previewId,
      hasAccessKey: !!env.R2_ACCESS_KEY_ID,
      hasSecretKey: !!env.R2_SECRET_ACCESS_KEY,
      bucketName: env.R2_BUCKET_NAME || 'NOT_SET',
      publicUrl: env.R2_PUBLIC_URL || 'NOT_SET',
      jurisdiction: env.R2_JURISDICTION?.trim() || '',
    },
  });
});

// Basic Metrics endpoint (Prometheus format) — restricted to authenticated Admins
app.get('/api/metrics', authenticate, authorize('admin'), async (c) => {
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
app.route('/', agentRoutes);
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
  app.use('/assets/*', serveStatic({ root: './client/dist' }));
  app.use('/vite.svg', serveStatic({ root: './client/dist' }));
  app.use('/favicon.ico', serveStatic({ root: './client/dist' }));
  app.use('/favicon.svg', serveStatic({ root: './client/dist' }));
  app.use('/icons.svg', serveStatic({ root: './client/dist' }));

  let cachedIndexHtml: string | null = null;

  app.get('*', async (c) => {
    if (c.req.header('Accept')?.includes('text/markdown')) {
      const baseUrl = getRequestBaseUrl(c);
      const md = `# سوق مصر — منصة التجارة الإلكترونية الأولى (Marketplace Egypt)

مرحباً بك في سوق مصر، المنصة الرائدة متعددة البائعين للتجارة الإلكترونية والتسوق الآمن عبر الإنترنت.

## موارد الوكلاء والذكاء الاصطناعي (Agent Resources)
- دليل الوكلاء الذكيين: [llms.txt](${baseUrl}/llms.txt)
- كتالوج الخدمات (ARD Manifest): [ai-catalog.json](${baseUrl}/.well-known/ai-catalog.json)
- مواصفات OpenAPI: [api-catalog](${baseUrl}/api/catalog)
- بطاقة خادم MCP: [server-card.json](${baseUrl}/.well-known/mcp/server-card.json)
- فهرس مهارات الوكلاء: [agent-skills/index.json](${baseUrl}/.well-known/agent-skills/index.json)
- إرشادات مصادقة الوكلاء: [auth.md](${baseUrl}/auth.md)
- خريطة الموقع: [sitemap.xml](${baseUrl}/sitemap.xml)
`;
      c.header('Content-Type', 'text/markdown; charset=utf-8');
      c.header('x-markdown-tokens', '320');
      c.header('Vary', 'Accept');
      return c.text(md, 200);
    }

    try {
      if (!cachedIndexHtml) {
        cachedIndexHtml = await fs.readFile(path.join(process.cwd(), 'client/dist/index.html'), 'utf-8');
      }
      const runtimeEnv = {
        VITE_GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
      };
      const scriptTag = `<script>window.ENV = ${JSON.stringify(runtimeEnv)};</script></head>`;
      const indexHtml = cachedIndexHtml.replace('</head>', () => scriptTag);

      return c.html(indexHtml);
    } catch {
      return c.notFound();
    }
  });
}

// Start server and background cron jobs only if not in test environment
if (env.NODE_ENV !== 'test') {
  const isCronRunner = process.env.NODE_APP_INSTANCE === undefined || process.env.NODE_APP_INSTANCE === '0';

  if (isCronRunner) {
    cron.schedule('0 0 * * *', async () => {
      try {
        console.log('[Cron] Running generateSettlements...');
        const result = await generateSettlements();
        console.log(`[Cron] Generated ${result.createdCount} new settlements.`);
      } catch (error) {
        console.error('[Cron] Error generating settlements:', error);
      }
    });

    cron.schedule('0 1 * * *', async () => {
      try {
        console.log('[Cron] Running processExpiredSubscriptions...');
        await processExpiredSubscriptions();
      } catch (error) {
        console.error('[Cron] Error processing expired subscriptions:', error);
      }
    });

    initAnalyticsJobs();
    console.log('[Cron] Background jobs initialized on this instance.');
  }

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
      if (typeof process.send === 'function') {
        process.send('ready');
      }
    });

    const shutdown = async (signal: string) => {
      console.log(`\n[${signal}] Received. Shutting down gracefully...`);

      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log('HTTP server closed.');
          resolve();
        });
      });

      try {
        await closeQueues();
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
