/**
 * F3 Integration Tests — Auth lifecycle
 *
 * Tests: register → login → /me → refresh rotation → logout → mass-assignment prevention
 */

import { describe, it, expect, afterAll } from 'vitest';
import {
  POST, GET,
  seedUser, createAccessToken, cleanup, closeDb, db,
} from './helpers.js';
import { refreshTokens, users } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const ts = Date.now();
const createdUserIds: number[] = [];

afterAll(async () => {
  await cleanup({ userIds: createdUserIds });
  await closeDb();
});

describe('Auth — Register', () => {
  it('registers a new customer and returns tokens', async () => {
    const email = `auth-reg-${ts}@test.com`;
    const res = await POST('/api/auth/register', {
      body: {
        email,
        password: 'Test@12345',
        firstName: 'أحمد',
        lastName: 'تست',
      },
    });

    expect(res.status).toBe(201);
    
    // Tokens are now set as HttpOnly cookies
    const cookies = res.headers.get('set-cookie');
    expect(cookies).toBeDefined();
    expect(cookies).toContain('accessToken=');
    expect(cookies).toContain('refreshToken=');

    const data = res.body?.['data'] as Record<string, unknown>;
    expect(data).toBeDefined();

    const user = data['user'] as Record<string, unknown>;
    expect(user['email']).toBe(email);
    expect(user['role']).toBe('customer');

    createdUserIds.push(user['id'] as number);
  });

  it('rejects duplicate email with 409', async () => {
    const email = `auth-dup-${ts}@test.com`;
    // First registration
    const res1 = await POST('/api/auth/register', {
      body: {
        email,
        password: 'Test@12345',
        firstName: 'أول',
        lastName: 'مستخدم',
      },
    });
    expect(res1.status).toBe(201);
    const u = (res1.body?.['data'] as Record<string, unknown>)?.['user'] as Record<string, unknown>;
    createdUserIds.push(u['id'] as number);

    // Second registration — same email
    const res2 = await POST('/api/auth/register', {
      body: {
        email,
        password: 'Test@12345',
        firstName: 'ثاني',
        lastName: 'مستخدم',
      },
    });
    expect(res2.status).toBe(409);
  });

  it('rejects registration with extra field (mass-assignment prevention)', async () => {
    const email = `auth-mass-${ts}@test.com`;
    const res = await POST('/api/auth/register', {
      body: {
        email,
        password: 'Test@12345',
        firstName: 'هاكر',
        lastName: 'تست',
        role: 'admin', // ← extra field, should be rejected by .strict()
      },
    });

    // Zod .strict() rejects unknown keys → validate middleware throws AppError.badRequest → 400
    expect(res.status).toBe(400);
  });
});

describe('Auth — Login', () => {
  const email = `auth-login-${ts}@test.com`;
  const password = 'Test@12345';

  it('login returns tokens for valid credentials', async () => {
    // Seed user first
    const userId = await seedUser(email, password, 'customer', 'دخول', 'تست');
    createdUserIds.push(userId);

    const res = await POST('/api/auth/login', {
      body: { email, password },
    });

    expect(res.status).toBe(200);

    const cookies = res.headers.get('set-cookie');
    expect(cookies).toBeDefined();
    expect(cookies).toContain('accessToken=');
    expect(cookies).toContain('refreshToken=');
  });

  it('rejects login with wrong password', async () => {
    const res = await POST('/api/auth/login', {
      body: { email, password: 'WrongPass1' },
    });
    expect(res.status).toBe(401);
  });

  it('rejects login with non-existent email', async () => {
    const res = await POST('/api/auth/login', {
      body: { email: 'nobody@ghost.com', password: 'Test@12345' },
    });
    expect(res.status).toBe(401);
  });
});

describe('Auth — /me', () => {
  it('returns user profile with valid token', async () => {
    const email = `auth-me-${ts}@test.com`;
    const userId = await seedUser(email, 'Test@12345', 'customer', 'ملف', 'شخصي');
    createdUserIds.push(userId);

    const token = createAccessToken(userId, email, 'customer');
    const res = await GET('/api/auth/me', { token });

    expect(res.status).toBe(200);
    const data = res.body?.['data'] as Record<string, unknown>;
    expect(data['email']).toBe(email);
    expect(data['firstName']).toBe('ملف');
  });

  it('rejects request without token', async () => {
    const res = await GET('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects request with invalid token', async () => {
    const res = await GET('/api/auth/me', { token: 'invalid.jwt.token' });
    expect(res.status).toBe(401);
  });
});

describe('Auth — Refresh Token Rotation', () => {
  it('rotates refresh token: old token is consumed, new pair issued', async () => {
    const email = `auth-refresh-${ts}@test.com`;

    // Register via API to get a real refresh token
    const regRes = await POST('/api/auth/register', {
      body: {
        email,
        password: 'Test@12345',
        firstName: 'تجديد',
        lastName: 'رمز',
      },
    });
    expect(regRes.status).toBe(201);
    const regData = regRes.body?.['data'] as Record<string, unknown>;
    const userId = (regData['user'] as Record<string, unknown>)['id'] as number;
    createdUserIds.push(userId);

    const cookies1 = regRes.headers.get('set-cookie');
    const match1 = cookies1?.match(/refreshToken=([^;]+)/);
    const refreshToken1 = match1 ? match1[1] : '';

    // Use refresh token cookie to get new tokens
    const refRes = await POST('/api/auth/refresh', {
      headers: {
        'Cookie': `refreshToken=${refreshToken1}`,
      }
    });
    expect(refRes.status).toBe(200);
    
    const cookies = refRes.headers.get('set-cookie');
    expect(cookies).toBeDefined();
    expect(cookies).toContain('accessToken=');
    expect(cookies).toContain('refreshToken=');
    
    // Extract new refreshToken
    const match = cookies!.match(/refreshToken=([^;]+)/);
    const refreshToken2 = match ? match[1] : null;
    expect(refreshToken2).not.toBeNull();
    expect(refreshToken2).not.toBe(refreshToken1);

    // Old refresh token should now be rejected (consumed)
    const replayRes = await POST('/api/auth/refresh', {
      headers: {
        'Cookie': `refreshToken=${refreshToken1}`,
      }
    });
    expect(replayRes.status).toBe(401);
  });
});

describe('Auth — Logout', () => {
  it('logout invalidates refresh token', async () => {
    const email = `auth-logout-${ts}@test.com`;

    // Register
    const regRes = await POST('/api/auth/register', {
      body: {
        email,
        password: 'Test@12345',
        firstName: 'خروج',
        lastName: 'تست',
      },
    });
    expect(regRes.status).toBe(201);
    const regData = regRes.body?.['data'] as Record<string, unknown>;
    const userId = (regData['user'] as Record<string, unknown>)['id'] as number;
    const cookies = regRes.headers.get('set-cookie')!;
    const accessMatch = cookies.match(/accessToken=([^;]+)/);
    const refreshMatch = cookies.match(/refreshToken=([^;]+)/);
    const accessToken = accessMatch ? accessMatch[1] : '';
    const refreshToken = refreshMatch ? refreshMatch[1] : '';
    createdUserIds.push(userId);

    // Logout
    const logoutRes = await POST('/api/auth/logout', {
      token: accessToken,
      headers: {
        'Cookie': `refreshToken=${refreshToken}`,
      }
    });
    expect(logoutRes.status).toBe(200);

    // Refresh token should now be rejected
    const refRes = await POST('/api/auth/refresh', {
      headers: {
        'Cookie': `refreshToken=${refreshToken}`,
      }
    });
    expect(refRes.status).toBe(401);
  });
});
