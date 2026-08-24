import { z } from 'zod';

const egyptPhoneRegex = /^(\+20|0)?1[0125]\d{8}$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export const registerSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح').max(255).toLowerCase().trim(),
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .max(72, 'كلمة المرور لا يمكن أن تتجاوز 72 حرف')
    .regex(passwordRegex, 'كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم'),
  firstName: z.string().min(2, 'الاسم الأول مطلوب').max(100).trim(),
  lastName: z.string().min(2, 'اسم العائلة مطلوب').max(100).trim(),
  phone: z.union([z.string().regex(egyptPhoneRegex, 'رقم هاتف مصري غير صالح'), z.literal('')]).optional(),
}).strict();

export const vendorRegisterSchema = registerSchema.extend({
  storeName: z.string().min(3, 'اسم المتجر مطلوب (3 أحرف على الأقل)').max(255).trim(),
  storeDescription: z.string().max(2000).optional(),
}).strict();

export const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح').toLowerCase().trim(),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
}).strict();

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'رمز التحديث مطلوب'),
}).strict();

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(100).trim().optional(),
  lastName: z.string().min(2).max(100).trim().optional(),
  phone: z.union([z.string().regex(egyptPhoneRegex, 'رقم هاتف مصري غير صالح'), z.literal('')]).optional().nullable(),
}).strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: z.string()
    .min(8, 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل')
    .max(72)
    .regex(passwordRegex, 'كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم'),
}).strict();

export const mfaTokenSchema = z.object({
  token: z.string().min(6, 'رمز التحقق مطلوب').max(10),
}).strict();

export const forgotPasswordSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح').toLowerCase().trim(),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'الرمز مطلوب'),
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .max(72)
    .regex(passwordRegex, 'كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم'),
}).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type VendorRegisterInput = z.infer<typeof vendorRegisterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type MfaTokenInput = z.infer<typeof mfaTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
