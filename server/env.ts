import { z } from 'zod';
import { config } from 'dotenv';

config();

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'Refresh secret must be at least 32 characters'),
  SMTP_HOST: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(5),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@marketplace.com'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('Admin@123456'),
  SENTRY_DSN: z.string().url().optional(),
  PAYMOB_API_KEY: z.string().optional(),
  PAYMOB_INTEGRATION_ID_CARD: z.string().optional(),
  PAYMOB_IFRAME_ID: z.string().optional(),
  PAYMOB_HMAC: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  EMAIL_FROM: z.string().optional().default('onboarding@resend.dev'),
  BOSTA_API_KEY: z.string().optional(),
  BOSTA_WEBHOOK_SECRET: z.string().optional().default('bosta_secret_123'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
  R2_JURISDICTION: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.format();
  const messages = Object.entries(formatted)
    .filter(([key]) => key !== '_errors')
    .map(([key, val]) => {
      const errors = (val as { _errors?: string[] })._errors;
      return `  ${key}: ${errors?.join(', ') ?? 'invalid'}`;
    })
    .join('\n');
  
  console.error(`\n❌ Environment validation failed:\n${messages}\n`);
  console.error('Copy .env.example to .env and fill in the required values.\n');
  process.exit(1);
}

export const env = parsed.data;
