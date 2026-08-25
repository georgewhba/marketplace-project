import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db/index.js';
import { users, refreshTokens, vendors, mfaSecrets, userRoles, roles, rolePermissions, permissions, siteSettings } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { env } from '../env.js';
import { AppError } from '../utils/errors.js';
import { slugify } from '../utils/slugify.js';
import { encryptSecret, decryptSecret, generateSecret, generateQRCode, verifyTOTP, generateBackupCodes } from '../utils/mfa.js';
import type {
  RegisterInput,
  VendorRegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from '../validators/auth.validators.js';

const SALT_ROUNDS = process.env['NODE_ENV'] === 'test' ? 4 : 12;

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy_client_id');

async function sendOtpEmail(email: string, otp: string, firstName: string) {
  try {
    await sendEmail({
      to: email,
      subject: 'رمز التحقق الخاص بك',
      templateKey: 'otp_registration',
      data: { name: firstName || 'مستخدم', otp },
    });
  } catch (err) {
    console.error('Failed to send OTP email:', err);
  }
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateAccessToken(user: { id: number; email: string; role: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES as unknown as number }
  );
}

function generateRefreshTokenValue(): string {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * (multipliers[unit] ?? 86400000);
}

export async function register(input: RegisterInput) {
  const skipOtp = false;


  const existing = await db.select({ id: users.id, isActive: users.isActive }).from(users).where(eq(users.email, input.email)).limit(1);
  
  const otpCode = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 120 * 1000); // 120 seconds

  if (existing.length > 0) {
    if (existing[0]!.isActive) {
      throw AppError.conflict('البريد الإلكتروني مسجل بالفعل');
    } else {
      // Resend OTP for unverified account (or activate if skipOtp)
      const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
      const [updatedUser] = await db.update(users).set({ 
        otpCode, 
        otpExpiresAt, 
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        isActive: skipOtp,
        emailVerifiedAt: skipOtp ? new Date() : null
      }).where(eq(users.id, existing[0]!.id)).returning();
      
      if (!skipOtp) {
        sendOtpEmail(input.email, otpCode, input.firstName);
        return { requiresOtp: true, message: 'تم إعادة إرسال رمز التحقق' };
      }
      
      const accessToken = generateAccessToken(updatedUser!);
      const refreshTokenValue = generateRefreshTokenValue();
      const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES));
      await db.insert(refreshTokens).values({ userId: updatedUser!.id, tokenHash: hashToken(refreshTokenValue), expiresAt });
      
      return {
        requiresOtp: false,
        message: 'تم تفعيل الحساب',
        user: { id: updatedUser!.id, email: updatedUser!.email, firstName: updatedUser!.firstName, lastName: updatedUser!.lastName, role: updatedUser!.role },
        accessToken,
        refreshToken: refreshTokenValue,
      };
    }
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const [newUser] = await db.insert(users).values({
    email: input.email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    role: 'customer',
    isActive: skipOtp, // active if skipOtp
    emailVerifiedAt: skipOtp ? new Date() : null,
    otpCode,
    otpExpiresAt,
  }).returning();

  if (!skipOtp) {
    sendOtpEmail(input.email, otpCode, input.firstName);
    console.log(`[OTP] user ${input.email} code: ${otpCode}`);
    return { requiresOtp: true, message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' };
  }

  const accessToken = generateAccessToken(newUser!);
  const refreshTokenValue = generateRefreshTokenValue();
  const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES));
  await db.insert(refreshTokens).values({ userId: newUser!.id, tokenHash: hashToken(refreshTokenValue), expiresAt });
  
  return {
    requiresOtp: false,
    message: 'تم إنشاء الحساب بنجاح',
    user: { id: newUser!.id, email: newUser!.email, firstName: newUser!.firstName, lastName: newUser!.lastName, role: newUser!.role },
    accessToken,
    refreshToken: refreshTokenValue,
  };
}

export async function verifyRegistrationOTP(email: string, otp: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  if (!user) throw AppError.notFound('المستخدم غير موجود');
  if (user.isActive) throw AppError.badRequest('الحساب مفعل مسبقاً');
  
  if (user.otpCode !== otp) {
    throw AppError.badRequest('رمز التحقق غير صحيح');
  }

  if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
    throw AppError.badRequest('رمز التحقق انتهت صلاحيته');
  }

  // Activate user
  await db.update(users).set({
    isActive: true,
    emailVerifiedAt: new Date(),
    otpCode: null,
    otpExpiresAt: null,
  }).where(eq(users.id, user.id));

  const accessToken = generateAccessToken(user);
  const refreshTokenValue = generateRefreshTokenValue();
  const refreshTokenHash = hashToken(refreshTokenValue);
  const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES));

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt,
  });

  return {
    user: await getProfile(user.id),
    accessToken,
    refreshToken: refreshTokenValue,
  };
}

export async function registerVendor(input: VendorRegisterInput) {
  const skipOtp = false;

  // Pre-flight uniqueness checks (outside tx for early, user-friendly errors)
  const existing = await db.select({ id: users.id, isActive: users.isActive }).from(users).where(eq(users.email, input.email)).limit(1);
  
  const otpCode = generateOTP();
  const otpExpiresAt = new Date(Date.now() + 120 * 1000); // 120 seconds

  if (existing.length > 0) {
    if (existing[0]!.isActive) {
      throw AppError.conflict('البريد الإلكتروني مسجل بالفعل');
    } else {
      // User exists but unverified, update them
      const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
      const storeSlug = slugify(input.storeName);

      const existingSlug = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.storeSlug, storeSlug)).limit(1);
      if (existingSlug.length > 0) {
        throw AppError.conflict('اسم المتجر مستخدم بالفعل');
      }

      await db.transaction(async (tx) => {
        await tx.update(users).set({ 
          otpCode, 
          otpExpiresAt, 
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          isActive: skipOtp,
          emailVerifiedAt: skipOtp ? new Date() : null,
          role: 'vendor'
        }).where(eq(users.id, existing[0]!.id));

        const [commissionSetting] = await tx.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, 'default_commission_rate')).limit(1);
        const commissionRate = commissionSetting?.value || '10.00';

        const existingVendor = await tx.select({ id: vendors.id }).from(vendors).where(eq(vendors.userId, existing[0]!.id)).limit(1);
        if (existingVendor.length > 0) {
          await tx.update(vendors).set({
            storeName: input.storeName,
            storeSlug,
            storeDescription: input.storeDescription,
            status: 'pending',
            commissionRate,
          }).where(eq(vendors.userId, existing[0]!.id));
        } else {
          await tx.insert(vendors).values({
            userId: existing[0]!.id,
            storeName: input.storeName,
            storeSlug,
            storeDescription: input.storeDescription,
            status: 'pending',
            commissionRate,
          });
        }
      });

      if (!skipOtp) {
        sendOtpEmail(input.email, otpCode, input.firstName);
        console.log(`[OTP] vendor ${input.email} code: ${otpCode}`);
        return { requiresOtp: true, message: 'تم إعادة إرسال رمز التحقق' };
      }
      
      const updatedUser = await getProfile(existing[0]!.id);
      const accessToken = generateAccessToken({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role });
      const refreshTokenValue = generateRefreshTokenValue();
      const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES));
      await db.insert(refreshTokens).values({ userId: updatedUser.id, tokenHash: hashToken(refreshTokenValue), expiresAt });
      
      return {
        requiresOtp: false,
        message: 'تم تسجيل متجرك — في انتظار الموافقة',
        user: updatedUser,
        accessToken,
        refreshToken: refreshTokenValue,
      };
    }
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const storeSlug = slugify(input.storeName);

  // Check store slug uniqueness
  const existingSlug = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.storeSlug, storeSlug)).limit(1);
  if (existingSlug.length > 0) {
    throw AppError.conflict('اسم المتجر مستخدم بالفعل');
  }

  // ATOMIC TRANSACTION: user + vendor
  let newUser: { id: number; email: string; firstName: string; lastName: string; role: string };

  await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: 'vendor',
      isActive: skipOtp,
      emailVerifiedAt: skipOtp ? new Date() : null,
      otpCode,
      otpExpiresAt,
    }).returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    });

    if (!user) throw AppError.internal();
    newUser = user;

    const [commissionSetting] = await tx.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, 'default_commission_rate')).limit(1);
    const commissionRate = commissionSetting?.value || '10.00';

    await tx.insert(vendors).values({
      userId: user.id,
      storeName: input.storeName,
      storeSlug,
      storeDescription: input.storeDescription,
      status: 'pending',
      commissionRate,
    });
  });

  if (!skipOtp) {
    sendOtpEmail(input.email, otpCode, input.firstName);
    console.log(`[OTP] vendor ${input.email} code: ${otpCode}`);
    return { requiresOtp: true, message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' };
  }

  const accessToken = generateAccessToken(newUser!);
  const refreshTokenValue = generateRefreshTokenValue();
  const refreshTokenHash = hashToken(refreshTokenValue);
  const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES));

  await db.insert(refreshTokens).values({
    userId: newUser!.id,
    tokenHash: refreshTokenHash,
    expiresAt,
  });

  return {
    requiresOtp: false,
    message: 'تم تسجيل متجرك — في انتظار الموافقة',
    user: await getProfile(newUser!.id),
    accessToken,
    refreshToken: refreshTokenValue,
  };
}

export async function login(input: LoginInput) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user) {
    throw AppError.unauthorized('بريد إلكتروني أو كلمة مرور غير صحيحة');
  }

  if (!user.isActive) {
    throw AppError.forbidden('الحساب معطّل، تواصل مع الدعم');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized('بريد إلكتروني أو كلمة مرور غير صحيحة');
  }

  // Check MFA
  const [mfa] = await db.select().from(mfaSecrets).where(eq(mfaSecrets.userId, user.id)).limit(1);

  if (mfa?.enabled) {
    const tempToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, purpose: 'mfa_temp' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '5m' }
    );
    return {
      requiresMfa: true,
      tempToken,
    };
  }

  const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshTokenValue = generateRefreshTokenValue();
  const refreshTokenHash = hashToken(refreshTokenValue);
  const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES));

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt,
  });

  return {
    user: await getProfile(user.id),
    accessToken,
    refreshToken: refreshTokenValue,
  };
}

export async function refreshAccessToken(tokenValue: string) {
  const tokenHash = hashToken(tokenValue);

  const [storedToken] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!storedToken) {
    throw AppError.unauthorized('رمز التحديث غير صالح');
  }

  if (storedToken.expiresAt < new Date()) {
    // Expired — delete and reject
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));
    throw AppError.unauthorized('انتهت صلاحية رمز التحديث');
  }

  // Delete old token (rotation — used token is consumed)
  await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));

  const [user] = await db
    .select({ id: users.id, email: users.email, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, storedToken.userId))
    .limit(1);

  if (!user || !user.isActive) {
    throw AppError.unauthorized('الحساب غير نشط');
  }

  // Issue new pair
  const newAccessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
  const newRefreshTokenValue = generateRefreshTokenValue();
  const newRefreshTokenHash = hashToken(newRefreshTokenValue);
  const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES));

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: newRefreshTokenHash,
    expiresAt,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshTokenValue,
  };
}

export async function logout(tokenValue: string) {
  const tokenHash = hashToken(tokenValue);
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function getProfile(userId: number) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw AppError.notFound('المستخدم');

  // If vendor, include vendor info
  let vendorInfo = null;
  if (user.role === 'vendor') {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.userId, userId)).limit(1);
    vendorInfo = vendor ?? null;
  }

  const [mfa] = await db.select({ enabled: mfaSecrets.enabled }).from(mfaSecrets).where(eq(mfaSecrets.userId, userId)).limit(1);

  // RBAC permissions
  let userPermissions: string[] = [];
  let isSuperAdmin = false;

  const userRoleList = await db
    .select({
      roleName: roles.name,
      isSystem: roles.isSystem,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id));

  isSuperAdmin = user.role === 'admin' || userRoleList.some(r => r.isSystem && r.roleName === 'super_admin');

  if (isSuperAdmin) {
    userPermissions = ['*'];
  } else {
    const perms = await db
      .select({ key: permissions.key })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, user.id));
    
    userPermissions = perms.map(p => p.key);
  }

  return { 
    ...user, 
    vendor: vendorInfo, 
    mfaEnabled: mfa?.enabled ?? false,
    permissions: userPermissions,
    isSuperAdmin
  };
}

export async function updateProfile(userId: number, input: UpdateProfileInput) {
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (input.firstName !== undefined) updateData['firstName'] = input.firstName;
  if (input.lastName !== undefined) updateData['lastName'] = input.lastName;
  if (input.phone !== undefined) updateData['phone'] = input.phone;

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
      avatarUrl: users.avatarUrl,
    });

  if (!updated) throw AppError.internal();
  return updated;
}

export async function changePassword(userId: number, input: ChangePasswordInput) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw AppError.unauthorized();

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) throw AppError.badRequest('كلمة المرور الحالية غير صحيحة');

  const newHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));

  // Invalidate refresh tokens
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

export async function setupMFA(userId: number, email: string) {
  const { secret, uri } = generateSecret(email);
  const encryptedSecret = encryptSecret(secret);
  
  const existing = await db.select().from(mfaSecrets).where(eq(mfaSecrets.userId, userId)).limit(1);
  if (existing.length > 0) {
    await db.update(mfaSecrets).set({ secretEncrypted: encryptedSecret, enabled: false }).where(eq(mfaSecrets.userId, userId));
  } else {
    await db.insert(mfaSecrets).values({ userId, secretEncrypted: encryptedSecret, enabled: false });
  }

  const qrCode = await generateQRCode(uri);
  return { secret, qrCode };
}

export async function verifyAndEnableMFA(userId: number, token: string) {
  const [mfa] = await db.select().from(mfaSecrets).where(eq(mfaSecrets.userId, userId)).limit(1);
  if (!mfa || mfa.enabled) throw AppError.badRequest('MFA is not pending setup');

  const secret = decryptSecret(mfa.secretEncrypted);
  if (!verifyTOTP(token, secret)) {
    throw AppError.badRequest('رمز التحقق غير صحيح');
  }

  const { plain: backupCodes, hashed: hashedCodes } = await generateBackupCodes();

  await db.update(mfaSecrets).set({ enabled: true, backupCodesHashed: hashedCodes }).where(eq(mfaSecrets.userId, userId));
  
  return { backupCodes };
}

export async function verifyMFAChallenge(userId: number, token: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [mfa] = await db.select().from(mfaSecrets).where(eq(mfaSecrets.userId, userId)).limit(1);
  
  if (!user || !mfa || !mfa.enabled) {
    throw AppError.badRequest('MFA is not enabled');
  }

  let isValid = false;
  let usedBackupCodeIndex = -1;

  const secret = decryptSecret(mfa.secretEncrypted);
  isValid = verifyTOTP(token, secret);

  const mfaBackupCodes = (mfa.backupCodesHashed as string[]) || [];

  if (!isValid && mfaBackupCodes && mfaBackupCodes.length > 0) {
    for (let i = 0; i < mfaBackupCodes.length; i++) {
      if (await bcrypt.compare(token, mfaBackupCodes[i]!)) {
        isValid = true;
        usedBackupCodeIndex = i;
        break;
      }
    }
  }

  if (!isValid) {
    throw AppError.unauthorized('رمز التحقق غير صحيح');
  }

  if (usedBackupCodeIndex !== -1) {
    const newBackupCodes = [...mfaBackupCodes];
    newBackupCodes.splice(usedBackupCodeIndex, 1);
    await db.update(mfaSecrets).set({ backupCodesHashed: newBackupCodes }).where(eq(mfaSecrets.userId, userId));
  }

  const accessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshTokenValue = generateRefreshTokenValue();
  const refreshTokenHash = hashToken(refreshTokenValue);
  const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES));

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt,
  });

  return {
    user: await getProfile(user.id),
    accessToken,
    refreshToken: refreshTokenValue,
  };
}

export async function disableMFA(userId: number, token: string) {
  const [mfa] = await db.select().from(mfaSecrets).where(eq(mfaSecrets.userId, userId)).limit(1);
  if (!mfa || !mfa.enabled) throw AppError.badRequest('MFA is already disabled');

  const secret = decryptSecret(mfa.secretEncrypted);
  if (!verifyTOTP(token, secret)) {
    throw AppError.badRequest('رمز التحقق غير صحيح');
  }

  await db.delete(mfaSecrets).where(eq(mfaSecrets.userId, userId));
}

import { sendEmail } from './email.service.js';

export async function forgotPassword(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return; // Silent success to prevent email enumeration

  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.update(users).set({
    passwordResetToken: tokenHash,
    passwordResetExpires: expiresAt,
  }).where(eq(users.id, user.id));

  // In a real app, this would be a link to the frontend reset password page
  const resetLink = `${env.CORS_ORIGIN}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    templateKey: 'password_reset',
    subject: 'استعادة كلمة المرور',
    data: { name: user.firstName, resetLink },
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  
  const [user] = await db.select().from(users).where(eq(users.passwordResetToken, tokenHash)).limit(1);
  
  if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    throw AppError.badRequest('الرمز غير صالح أو منتهي الصلاحية');
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  
  await db.update(users).set({
    passwordHash: newHash,
    passwordResetToken: null,
    passwordResetExpires: null,
  }).where(eq(users.id, user.id));

  // Invalidate refresh tokens
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));
}

export async function googleAuth(idToken: string, vendorData?: { storeName: string, storeDescription?: string }) {
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID || 'dummy_client_id',
    });
    payload = ticket.getPayload();
  } catch (err) {
    throw AppError.unauthorized('رمز جوجل غير صالح');
  }

  if (!payload || !payload.email) {
    throw AppError.unauthorized('فشل في جلب البيانات من جوجل');
  }

  const { email, given_name, family_name, picture, sub: googleId } = payload;

  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    // Create new user linked to google
    const [newUser] = await db.insert(users).values({
      email,
      firstName: given_name || 'مستخدم',
      lastName: family_name || '',
      passwordHash: '', // OAuth users don't have a password
      role: vendorData ? 'vendor' : 'customer',
      avatarUrl: picture,
      googleId,
      isActive: true,
      emailVerifiedAt: new Date(),
    }).returning();
    user = newUser as any;
  } else {
    // Update existing user to link google if not linked, and potentially upgrade to vendor
    if (vendorData && user.role === 'customer') {
      const [updatedUser] = await db.update(users).set({ role: 'vendor', googleId: user.googleId || googleId, emailVerifiedAt: new Date(), isActive: true }).where(eq(users.id, user.id)).returning();
      user = updatedUser as any;
    } else if (!user.googleId) {
      const [updatedUser] = await db.update(users).set({ googleId, emailVerifiedAt: new Date(), isActive: true }).where(eq(users.id, user.id)).returning();
      user = updatedUser as any;
    }
  }

  if (vendorData) {
    const storeSlug = slugify(vendorData.storeName);
    const existingSlug = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.storeSlug, storeSlug)).limit(1);
    
    // Check if this user already has a vendor profile
    const existingVendor = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.userId, user!.id)).limit(1);
    
    if (existingVendor.length === 0) {
      if (existingSlug.length > 0) {
        throw AppError.conflict('اسم المتجر مستخدم بالفعل');
      }
      const [commissionSetting] = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, 'default_commission_rate')).limit(1);
      const commissionRate = commissionSetting?.value || '10.00';
      await db.insert(vendors).values({
        userId: user!.id,
        storeName: vendorData.storeName,
        storeSlug,
        storeDescription: vendorData.storeDescription,
        status: 'pending',
        commissionRate,
      });
    }
  }

  if (!user!.isActive) {
    throw AppError.forbidden('الحساب معطّل، تواصل مع الدعم');
  }

  const accessToken = generateAccessToken(user!);
  const refreshTokenValue = generateRefreshTokenValue();
  const refreshTokenHash = hashToken(refreshTokenValue);
  const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES));

  await db.insert(refreshTokens).values({
    userId: user!.id,
    tokenHash: refreshTokenHash,
    expiresAt,
  });

  return {
    user: await getProfile(user!.id),
    accessToken,
    refreshToken: refreshTokenValue,
  };
}
