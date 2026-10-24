import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../env.js';
import { validate, getValidated } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import * as authService from '../services/auth.service.js';
import * as authValidators from '../validators/auth.validators.js';
import {
  registerSchema, vendorRegisterSchema, loginSchema,
  refreshSchema, updateProfileSchema, changePasswordSchema, mfaTokenSchema, forgotPasswordSchema, resetPasswordSchema,
  type RegisterInput, type VendorRegisterInput, type LoginInput,
  type RefreshInput, type UpdateProfileInput, type ChangePasswordInput, type MfaTokenInput, type ForgotPasswordInput, type ResetPasswordInput
} from '../validators/auth.validators.js';
import { db } from '../db/index.js';
import { notificationPreferences } from '../db/schema/notifications-config.js';
import { notifications } from '../db/schema/notifications.js';
import { and, eq, count, desc } from 'drizzle-orm';
import type { AppEnv } from '../types/env.js';

const verifyOtpSchema = (authValidators as any).verifyOtpSchema || z.object({
  email: z.string().email('بريد إلكتروني غير صالح').toLowerCase().trim(),
  otp: z.string().length(6, 'رمز التحقق يجب أن يتكون من 6 أرقام').regex(/^\d{6}$/, 'رمز التحقق غير صالح'),
}).strict();

const googleAuthSchema = (authValidators as any).googleAuthSchema || z.object({
  idToken: z.string().min(1, 'رمز جوجل مطلوب'),
  vendorData: z.object({
    storeName: z.string().min(3, 'اسم المتجر مطلوب (3 أحرف على الأقل)').max(255).trim(),
    storeDescription: z.string().max(2000).optional(),
  }).optional(),
}).strict();

const notificationPreferenceSchema = (authValidators as any).notificationPreferenceSchema || z.object({
  category: z.enum(['order_updates', 'promotions', 'system_alerts']),
  channel: z.enum(['email', 'whatsapp', 'push']),
  enabled: z.boolean(),
}).strict();

function setAuthCookies(c: any, accessToken: string, refreshToken: string) {
  setCookie(c, 'accessToken', accessToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/',
    maxAge: 15 * 60,
  });
  setCookie(c, 'refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

const authRoutes = new Hono<AppEnv>();

// POST /api/auth/register
authRoutes.post('/register', authRateLimit, validate('body', registerSchema), async (c) => {
  const input = getValidated<RegisterInput>(c, 'body');
  const result = await authService.register(input);
  
  if (result.accessToken && result.refreshToken) {
    setAuthCookies(c, result.accessToken, result.refreshToken);
  }
  
  return sendCreated(c, result);
});

// POST /api/auth/verify-otp
authRoutes.post('/verify-otp', authRateLimit, validate('body', verifyOtpSchema), async (c) => {
  const { email, otp } = getValidated<{ email: string; otp: string }>(c, 'body');
  const result = await authService.verifyRegistrationOTP(email, otp);
  setAuthCookies(c, result.accessToken, result.refreshToken);
  return sendSuccess(c, { user: result.user });
});

// POST /api/auth/google
authRoutes.post('/google', authRateLimit, validate('body', googleAuthSchema), async (c) => {
  const { idToken, vendorData } = getValidated<{ idToken: string; vendorData?: { storeName: string; storeDescription?: string } }>(c, 'body');
  const result = await authService.googleAuth(idToken, vendorData) as any;
  if (result.requiresMfa) {
    setCookie(c, 'mfaTempToken', result.tempToken!, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/',
      maxAge: 5 * 60,
    });
    return sendSuccess(c, { requiresMfa: true, tempToken: result.tempToken });
  }
  setAuthCookies(c, result.accessToken, result.refreshToken);
  return sendSuccess(c, { user: result.user });
});

// POST /api/auth/register/vendor
authRoutes.post('/register/vendor', authRateLimit, validate('body', vendorRegisterSchema), async (c) => {
  const input = getValidated<VendorRegisterInput>(c, 'body');
  const result = await authService.registerVendor(input);
  if (result.accessToken && result.refreshToken) {
    setAuthCookies(c, result.accessToken, result.refreshToken);
  }
  return sendCreated(c, result);
});

// POST /api/auth/login
authRoutes.post('/login', authRateLimit, validate('body', loginSchema), async (c) => {
  const input = getValidated<LoginInput>(c, 'body');
  const result = await authService.login(input);
  if (result.requiresMfa) {
    setCookie(c, 'mfaTempToken', result.tempToken!, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'Strict',
      path: '/',
      maxAge: 5 * 60,
    });
    return sendSuccess(c, { requiresMfa: true, tempToken: result.tempToken });
  }
  setAuthCookies(c, result.accessToken!, result.refreshToken!);
  return sendSuccess(c, { user: result.user });
});

// POST /api/auth/refresh
authRoutes.post('/refresh', authRateLimit, async (c) => {
  const refreshToken = getCookie(c, 'refreshToken');
  if (!refreshToken) throw AppError.unauthorized('رمز التحديث مطلوب');
  
  const result = await authService.refreshAccessToken(refreshToken);
  setAuthCookies(c, result.accessToken, result.refreshToken);
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
  deleteCookie(c, 'mfaTempToken', { path: '/' });
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
authRoutes.post('/mfa/challenge', authRateLimit, validate('body', mfaTokenSchema), async (c) => {
  const rawAuth = c.req.header('Authorization')?.replace('Bearer ', '').trim();
  const headerToken = rawAuth && rawAuth !== 'undefined' && rawAuth !== 'null' ? rawAuth : undefined;
  const tempToken = headerToken || getCookie(c, 'mfaTempToken') || getCookie(c, 'accessToken');

  if (!tempToken) {
    throw AppError.unauthorized('رمز المصادقة المؤقت مطلوب');
  }

  let userId: number;
  try {
    const payload = jwt.verify(tempToken, env.JWT_ACCESS_SECRET) as { userId: number; purpose?: string };
    userId = payload.userId;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('انتهت صلاحية رمز المصادقة');
    }
    throw AppError.unauthorized('رمز مصادقة غير صالح');
  }

  const input = getValidated<MfaTokenInput>(c, 'body');
  const result = await authService.verifyMFAChallenge(userId, input.token);
  deleteCookie(c, 'mfaTempToken', { path: '/' });
  setAuthCookies(c, result.accessToken, result.refreshToken);
  return sendSuccess(c, { user: result.user });
});

// POST /api/auth/mfa/disable
authRoutes.post('/mfa/disable', authRateLimit, authenticate, validate('body', mfaTokenSchema), async (c) => {
  const user = c.get('user');
  const input = getValidated<MfaTokenInput>(c, 'body');
  await authService.disableMFA(user.id, input.token);
  return sendSuccess(c, { message: 'تم تعطيل المصادقة الثنائية بنجاح' });
});

// GET /api/auth/me/notification-preferences
authRoutes.get('/me/notification-preferences', authenticate, async (c) => {
  const userId = c.get('user')!.id;
  const prefs = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
  return sendSuccess(c, prefs);
});

// PUT /api/auth/me/notification-preferences
authRoutes.put('/me/notification-preferences', authenticate, validate('body', notificationPreferenceSchema), async (c) => {
  const userId = c.get('user')!.id;
  const body = getValidated<{ category: string; channel: string; enabled: boolean }>(c, 'body');

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

// GET /api/auth/me/notifications
authRoutes.get('/me/notifications', authenticate, async (c) => {
  const userId = c.get('user')!.id;
  const list = await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  return sendSuccess(c, list);
});

// PUT /api/auth/me/notifications/:id/read
authRoutes.put('/me/notifications/:id/read', authenticate, async (c) => {
  const userId = c.get('user')!.id;
  const notifId = parseInt(c.req.param('id')!, 10);
  if (Number.isNaN(notifId)) throw AppError.badRequest('معرف غير صالح');
  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.id, notifId), eq(notifications.userId, userId)));
  return sendSuccess(c, { message: 'تم القراءة' });
});

// PUT /api/auth/me/notifications/read-all
authRoutes.put('/me/notifications/read-all', authenticate, async (c) => {
  const userId = c.get('user')!.id;
  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.isRead, false), eq(notifications.userId, userId)));
  return sendSuccess(c, { message: 'تم قراءة الجميع' });
});

// GET /api/auth/me/notifications/unread-count
authRoutes.get('/me/notifications/unread-count', authenticate, async (c) => {
  const userId = c.get('user')!.id;
  const result = await db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return sendSuccess(c, { count: result[0]?.value ?? 0 });
});

export default authRoutes;
