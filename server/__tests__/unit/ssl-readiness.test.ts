import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { enforceHttps, getRequestBaseUrl } from '../../middleware/httpsRedirect.js';

describe('SSL & HTTPS Readiness', () => {
  it('correctly resolves public base URL using x-forwarded headers', async () => {
    const app = new Hono();
    let detectedUrl = '';

    app.get('/test-url', (c) => {
      detectedUrl = getRequestBaseUrl(c);
      return c.text(detectedUrl);
    });

    const req = new Request('http://localhost:5173/test-url', {
      headers: {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'localhost:5173',
      },
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);
    expect(detectedUrl).toBe('https://localhost:5173');
  });

  it('preserves plain HTTP / localhost in development mode', async () => {
    const testApp = new Hono();
    testApp.use('*', enforceHttps);
    testApp.get('/test', (c) => c.text('ok'));

    const req = new Request('http://localhost:3000/test', {
      headers: {
        'x-forwarded-proto': 'http',
        'x-forwarded-host': 'localhost:3000',
      },
    });

    const res = await testApp.fetch(req);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  it('allows ACME challenge verification path without redirection', async () => {
    const testApp = new Hono();
    testApp.use('*', enforceHttps);
    testApp.get('/.well-known/acme-challenge/:token', (c) => c.text(`token-${c.req.param('token')}`));

    const req = new Request('http://localhost:5173/.well-known/acme-challenge/test12345', {
      headers: {
        'x-forwarded-proto': 'http',
        'x-forwarded-host': 'localhost:5173',
      },
    });

    const res = await testApp.fetch(req);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('token-test12345');
  });
});
