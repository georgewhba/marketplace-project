import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { users, refreshTokens, vendors, mfaSecrets, userRoles, roles, rolePermissions, permissions } from '../db/schema/index.js';
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
  // Check if email already exists
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existing.length > 0) {
    throw AppError.conflict('البريد الإلكتروني مسجل بالفعل');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const [user] = await db.insert(users).values({
    email: input.email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    role: 'customer',
  }).returning({
    id: users.id,
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
    role: users.role,
  });

  if (!user) throw AppError.internal();

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
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
    accessToken,
    refreshToken: refreshTokenValue,
  };
}

export async function registerVendor(input: VendorRegisterInput) {
  // Pre-flight uniqueness checks (outside tx for early, user-friendly errors)
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existing.length > 0) {
    throw AppError.conflict('البريد الإلكتروني مسجل بالفعل');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const storeSlug = slugify(input.storeName);

  // Check store slug uniqueness
  const existingSlug = await db.select({ id: vendors.id }).from(vendors).where(eq(vendors.storeSlug, storeSlug)).limit(1);
  if (existingSlug.length > 0) {
    throw AppError.conflict('اسم المتجر مستخدم بالفعل');
  }

  // ATOMIC TRANSACTION: user + vendor + refresh token are one unit.
  // If the vendor insert fails (e.g. slug race between pre-check and now),
  // the user row is automatically rolled back — no orphan users possible.
  const refreshTokenValue = generateRefreshTokenValue();
  const refreshTokenHash = hashToken(refreshTokenValue);
  const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES));

  let newUser: { id: number; email: string; firstName: string; lastName: string; role: string };

  await db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: 'vendor',
    }).returning({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    });

    if (!user) throw AppError.internal();
    newUser = user;

    // Inserting vendor inside the same tx — any constraint violation here
    // (e.g. unique storeSlug race) rolls back the user insert automatically
    await tx.insert(vendors).values({
      userId: user.id,
      storeName: input.storeName,
      storeSlug,
      storeDescription: input.storeDescription,
      status: 'pending',
    });

    await tx.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
    });
  });

  const accessToken = generateAccessToken(newUser!);

  return {
    user: { id: newUser!.id, email: newUser!.email, firstName: newUser!.firstName, lastName: newUser!.lastName, role: newUser!.role },
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
    user: {
      id: user.id, email: user.email, firstName: user.firstName,
      lastName: user.lastName, role: user.role, phone: user.phone,
      avatarUrl: user.avatarUrl,
    },
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
    user: {
      id: user.id, email: user.email, firstName: user.firstName,
      lastName: user.lastName, role: user.role, phone: user.phone,
      avatarUrl: user.avatarUrl,
    },
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
