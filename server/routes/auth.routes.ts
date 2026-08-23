import { Hono } from 'hono';
import { validate, getValidated } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import * as authService from '../services/auth.service.js';
import {
  registerSchema, vendorRegisterSchema, loginSchema,
  refreshSchema, updateProfileSchema, changePasswordSchema, mfaTokenSchema,
  type RegisterInput, type VendorRegisterInput, type LoginInput,
  type RefreshInput, type UpdateProfileInput, type ChangePasswordInput, type MfaTokenInput,
} from '../validators/auth.validators.js';
import type { AppEnv } from '../types/env.js';

const authRoutes = new Hono<AppEnv>();

// POST /api/auth/register
authRoutes.post('/register', authRateLimit, validate('body', registerSchema), async (c) => {
  const input = getValidated<RegisterInput>(c, 'body');
  const result = await authService.register(input);
  return sendCreated(c, result);
});

// POST /api/auth/register/vendor
authRoutes.post('/register/vendor', authRateLimit, validate('body', vendorRegisterSchema), async (c) => {
  const input = getValidated<VendorRegisterInput>(c, 'body');
  const result = await authService.registerVendor(input);
  return sendCreated(c, result);
});

// POST /api/auth/login
authRoutes.post('/login', authRateLimit, validate('body', loginSchema), async (c) => {
  const input = getValidated<LoginInput>(c, 'body');
  const result = await authService.login(input);
  return sendSuccess(c, result);
});

// POST /api/auth/refresh
authRoutes.post('/refresh', validate('body', refreshSchema), async (c) => {
  const input = getValidated<RefreshInput>(c, 'body');
  const result = await authService.refreshAccessToken(input.refreshToken);
  return sendSuccess(c, result);
});

// POST /api/auth/logout
authRoutes.post('/logout', validate('body', refreshSchema), async (c) => {
  const input = getValidated<RefreshInput>(c, 'body');
  await authService.logout(input.refreshToken);
  return sendSuccess(c, { message: 'تم تسجيل الخروج بنجاح' });
});

// GET /api/auth/me
authRoutes.get('/me', authenticate, async (c) => {
  const user = c.get('user');
  const profile = await authService.getProfile(user.id);
  return sendSuccess(c, profile);
});

// PUT /api/auth/me
authRoutes.put('/me', authenticate, validate('body', updateProfileSchema), async (c) => {
  const user = c.get('user');
  const input = getValidated<UpdateProfileInput>(c, 'body');
  const updated = await authService.updateProfile(user.id, input);
  return sendSuccess(c, updated);
});

// PUT /api/auth/me/password
authRoutes.put('/me/password', authenticate, validate('body', changePasswordSchema), async (c) => {
  const user = c.get('user');
  const input = getValidated<ChangePasswordInput>(c, 'body');
  await authService.changePassword(user.id, input);
  return sendSuccess(c, { message: 'تم تغيير كلمة المرور بنجاح' });
});

// POST /api/auth/mfa/setup
authRoutes.post('/mfa/setup', authenticate, async (c) => {
  const user = c.get('user');
  const result = await authService.setupMFA(user.id, user.email);
  return sendSuccess(c, result);
});

// POST /api/auth/mfa/verify
authRoutes.post('/mfa/verify', authenticate, validate('body', mfaTokenSchema), async (c) => {
  const user = c.get('user');
  const input = getValidated<MfaTokenInput>(c, 'body');
  const result = await authService.verifyAndEnableMFA(user.id, input.token);
  return sendSuccess(c, result);
});

// POST /api/auth/mfa/challenge
authRoutes.post('/mfa/challenge', authenticate, validate('body', mfaTokenSchema), async (c) => {
  const user = c.get('user');
  const input = getValidated<MfaTokenInput>(c, 'body');
  const result = await authService.verifyMFAChallenge(user.id, input.token);
  return sendSuccess(c, result);
});

// POST /api/auth/mfa/disable
authRoutes.post('/mfa/disable', authenticate, validate('body', mfaTokenSchema), async (c) => {
  const user = c.get('user');
  const input = getValidated<MfaTokenInput>(c, 'body');
  await authService.disableMFA(user.id, input.token);
  return sendSuccess(c, { message: 'تم تعطيل المصادقة الثنائية بنجاح' });
});

import { db } from '../db/index.js';
import { notificationPreferences } from '../db/schema/notifications-config.js';
import { notifications } from '../db/schema/notifications.js';
import { and, eq, count } from 'drizzle-orm';

// GET /api/auth/me/notification-preferences
authRoutes.get('/me/notification-preferences', authenticate, async (c) => {
  const userId = c.get('user')!.id;
  const prefs = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
  return sendSuccess(c, prefs);
});

// PUT /api/auth/me/notification-preferences
authRoutes.put('/me/notification-preferences', authenticate, async (c) => {
  const userId = c.get('user')!.id;
  const body = await c.req.json();
  // Expect { category: string, channel: string, enabled: boolean }
  
  await db.insert(notificationPreferences)
    .values({
      userId,
      category: body.category,
      channel: body.channel,
      enabled: body.enabled,
    })
    .onConflictDoUpdate({
      target: [notificationPreferences.userId, notificationPreferences.category, notificationPreferences.channel],
      set: { enabled: body.enabled },
    });

  return sendSuccess(c, { success: true });
});

// GET /api/auth/me/notifications/unread-count
authRoutes.get('/me/notifications/unread-count', authenticate, async (c) => {
  const userId = c.get('user')!.id;
  const result = await db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return sendSuccess(c, { count: result[0]?.value ?? 0 });
});

export default authRoutes;
