import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { env } from '../env.js';
import { validate, getValidated } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import * as authService from '../services/auth.service.js';
import {
  registerSchema, vendorRegisterSchema, loginSchema,
  refreshSchema, updateProfileSchema, changePasswordSchema, mfaTokenSchema, forgotPasswordSchema, resetPasswordSchema,
  type RegisterInput, type VendorRegisterInput, type LoginInput,
  type RefreshInput, type UpdateProfileInput, type ChangePasswordInput, type MfaTokenInput, type ForgotPasswordInput, type ResetPasswordInput
} from '../validators/auth.validators.js';
import type { AppEnv } from '../types/env.js';

const authRoutes = new Hono<AppEnv>();

// POST /api/auth/register
authRoutes.post('/register', authRateLimit, validate('body', registerSchema), async (c) => {
  const input = getValidated<RegisterInput>(c, 'body');
  const result = await authService.register(input);
  
  return sendSuccess(c, result);
});

// POST /api/auth/verify-otp
authRoutes.post('/verify-otp', authRateLimit, async (c) => {
  const { email, otp } = await c.req.json();
  const result = await authService.verifyRegistrationOTP(email, otp);
  setCookie(c, 'accessToken', result.accessToken, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' });
  setCookie(c, 'refreshToken', result.refreshToken, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' });
  return sendSuccess(c, { user: result.user });
});

// POST /api/auth/google
authRoutes.post('/google', authRateLimit, async (c) => {
  const { idToken, vendorData } = await c.req.json();
  const result = await authService.googleAuth(idToken, vendorData);
  setCookie(c, 'accessToken', result.accessToken, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' });
  setCookie(c, 'refreshToken', result.refreshToken, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' });
  return sendSuccess(c, { user: result.user });
});

// POST /api/auth/register/vendor
authRoutes.post('/register/vendor', authRateLimit, validate('body', vendorRegisterSchema), async (c) => {
  const input = getValidated<VendorRegisterInput>(c, 'body');
  const result = await authService.registerVendor(input);
  if (result.accessToken && result.refreshToken) {
    setCookie(c, 'accessToken', result.accessToken, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' });
    setCookie(c, 'refreshToken', result.refreshToken, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' });
  }
  return sendCreated(c, result);
});

// POST /api/auth/login
authRoutes.post('/login', authRateLimit, validate('body', loginSchema), async (c) => {
  const input = getValidated<LoginInput>(c, 'body');
  const result = await authService.login(input);
  if (result.requiresMfa) {
    setCookie(c, 'accessToken', result.tempToken!, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'Strict', path: '/', maxAge: 5 * 60 });
    return sendSuccess(c, { requiresMfa: true });
  }
  setCookie(c, 'accessToken', result.accessToken!, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' });
  setCookie(c, 'refreshToken', result.refreshToken!, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' });
  return sendSuccess(c, { user: result.user });
});

// POST /api/auth/refresh
authRoutes.post('/refresh', authRateLimit, async (c) => {
  const refreshToken = getCookie(c, 'refreshToken');
  if (!refreshToken) throw AppError.unauthorized('رمز التحديث مطلوب');
  
  const result = await authService.refreshAccessToken(refreshToken);
  setCookie(c, 'accessToken', result.accessToken, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' });
  setCookie(c, 'refreshToken', result.refreshToken, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' });
  return sendSuccess(c, { message: 'تم تحديث الجلسة بنجاح' });
});

// POST /api/auth/logout
authRoutes.post('/logout', async (c) => {
  const refreshToken = getCookie(c, 'refreshToken');
  if (refreshToken) {
    await authService.logout(refreshToken);
  }
  deleteCookie(c, 'accessToken', { path: '/' });
  deleteCookie(c, 'refreshToken', { path: '/' });
  return sendSuccess(c, { message: 'تم تسجيل الخروج بنجاح' });
});

// POST /api/auth/forgot-password
authRoutes.post('/forgot-password', authRateLimit, validate('body', forgotPasswordSchema), async (c) => {
  const input = getValidated<ForgotPasswordInput>(c, 'body');
  await authService.forgotPassword(input.email);
  return sendSuccess(c, { message: 'إذا كان البريد الإلكتروني مسجلاً، فستتلقى رابطاً لإعادة تعيين كلمة المرور.' });
});

// POST /api/auth/reset-password
authRoutes.post('/reset-password', authRateLimit, validate('body', resetPasswordSchema), async (c) => {
  const input = getValidated<ResetPasswordInput>(c, 'body');
  await authService.resetPassword(input.token, input.password);
  return sendSuccess(c, { message: 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.' });
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
authRoutes.post('/mfa/verify', authRateLimit, authenticate, validate('body', mfaTokenSchema), async (c) => {
  const user = c.get('user');
  const input = getValidated<MfaTokenInput>(c, 'body');
  const result = await authService.verifyAndEnableMFA(user.id, input.token);
  return sendSuccess(c, result);
});

// POST /api/auth/mfa/challenge
authRoutes.post('/mfa/challenge', authRateLimit, authenticate, validate('body', mfaTokenSchema), async (c) => {
  const user = c.get('user');
  const input = getValidated<MfaTokenInput>(c, 'body');
  const result = await authService.verifyMFAChallenge(user.id, input.token);
  setCookie(c, 'accessToken', result.accessToken, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' });
  setCookie(c, 'refreshToken', result.refreshToken, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' });
  return sendSuccess(c, { user: result.user });
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
