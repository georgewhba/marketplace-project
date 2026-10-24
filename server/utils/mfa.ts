import crypto from 'crypto';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { env } from '../env.js';

authenticator.options = { window: 1 };

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes for GCM

// Full 256-bit key derived from MFA_ENCRYPTION_KEY (preferred) or JWT_ACCESS_SECRET
const PRIMARY_KEY = env.MFA_ENCRYPTION_KEY
  ? crypto.createHash('sha256').update(env.MFA_ENCRYPTION_KEY).digest()
  : crypto.createHash('sha256').update(String(env.JWT_ACCESS_SECRET)).digest();

const JWT_RAW_KEY = crypto.createHash('sha256').update(String(env.JWT_ACCESS_SECRET)).digest();

// Legacy key derivation for backwards-compatible decryption of existing secrets
const LEGACY_KEY = Buffer.from(
  crypto.createHash('sha256').update(String(env.JWT_ACCESS_SECRET)).digest('base64').substring(0, 32),
  'utf-8'
);

export function encryptSecret(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, PRIMARY_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptSecret(hash: string): string {
  const parts = hash.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted text format');
  
  const iv = Buffer.from(parts[0]!, 'hex');
  const authTag = Buffer.from(parts[1]!, 'hex');
  const encrypted = parts[2]!;

  const candidateKeys = [PRIMARY_KEY, JWT_RAW_KEY, LEGACY_KEY];
  let lastError: unknown;

  for (const key of candidateKeys) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to decrypt MFA secret');
}

export function generateSecret(email: string) {
  const secret = authenticator.generateSecret();
  const uri = authenticator.keyuri(email, 'SouqMasr', secret);
  return { secret, uri };
}

export async function generateQRCode(uri: string): Promise<string> {
  return await QRCode.toDataURL(uri);
}

export function verifyTOTP(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

export async function generateBackupCodes(count = 10): Promise<{ plain: string[], hashed: string[] }> {
  const plain: string[] = [];
  const hashed: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex'); // 8 characters
    plain.push(code);
    hashed.push(await bcrypt.hash(code, 10));
  }
  
  return { plain, hashed };
}
