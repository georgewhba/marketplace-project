import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { users, refreshTokens, vendors } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { env } from '../env.js';
import { AppError } from '../utils/errors.js';
import { slugify } from '../utils/slugify.js';
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
      id: users.id, email: users.email, firstName: users.firstName,
      lastName: users.lastName, phone: users.phone, role: users.role,
      avatarUrl: users.avatarUrl, createdAt: users.createdAt,
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

  return { ...user, vendor: vendorInfo };
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
      id: users.id, email: users.email, firstName: users.firstName,
      lastName: users.lastName, phone: users.phone, role: users.role,
      avatarUrl: users.avatarUrl,
    });

  if (!updated) throw AppError.notFound('المستخدم');
  return updated;
}

export async function changePassword(userId: number, input: ChangePasswordInput) {
  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw AppError.notFound('المستخدم');

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) {
    throw AppError.badRequest('كلمة المرور الحالية غير صحيحة');
  }

  const newHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);

  await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, userId));

  // Revoke ALL refresh tokens for this user — forces re-login on all devices
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}
