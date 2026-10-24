import type { Context, Next } from 'hono';
import { env } from '../env.js';

const SAFE_HOST_REGEX = /^[a-zA-Z0-9.-]+(:\d{1,5})?$/;

function resolveSafeHost(c: Context): string | null {
  const rawHost = (c.req.header('x-forwarded-host') || c.req.header('host') || '')
    .split(',')[0]
    ?.trim() || '';

  let configuredHost = '';
  try {
    const frontendUrl = process.env['FRONTEND_URL'] || env.CORS_ORIGIN;
    if (frontendUrl) {
      configuredHost = new URL(frontendUrl).host;
    }
  } catch {
    configuredHost = '';
  }

  if (rawHost && SAFE_HOST_REGEX.test(rawHost)) {
    if (env.NODE_ENV === 'production' && configuredHost && configuredHost !== 'localhost:5173') {
      return configuredHost;
    }
    return rawHost;
  }

  return configuredHost || null;
}

/**
 * Enforce HTTPS in production environments behind a reverse proxy (e.g. Railway, Nginx, Cloudflare).
 * Redirects HTTP requests (identified via x-forwarded-proto: http) to HTTPS with HTTP 301.
 * Excludes ACME challenge requests (/.well-known/acme-challenge/*) so Let's Encrypt validation succeeds.
 */
export const enforceHttps = async (c: Context, next: Next) => {
  if (env.NODE_ENV === 'production') {
    const proto = c.req.header('x-forwarded-proto')?.split(',')[0]?.trim();
    const path = c.req.path;

    // Do not redirect ACME challenge requests, Let's Encrypt needs HTTP-01
    if (proto === 'http' && !path.startsWith('/.well-known/acme-challenge')) {
      const host = resolveSafeHost(c);
      if (host) {
        const queryIndex = c.req.url.indexOf('?');
        const query = queryIndex !== -1 ? c.req.url.substring(queryIndex) : '';
        return c.redirect(`https://${host}${path}${query}`, 301);
      }
    }
  }

  await next();
};

/**
 * Returns the public base URL of the incoming request, accurately resolving
 * reverse proxy headers (x-forwarded-proto and x-forwarded-host) when behind SSL.
 */
export const getRequestBaseUrl = (c: Context): string => {
  try {
    const rawProto = c.req.header('x-forwarded-proto')?.split(',')[0]?.trim();
    const proto =
      rawProto === 'https' || rawProto === 'http'
        ? rawProto
        : new URL(c.req.url).protocol.replace(':', '') || 'http';
    const host = resolveSafeHost(c) || new URL(c.req.url).host;
    return `${proto}://${host}`;
  } catch {
    return 'http://localhost:3000';
  }
};
