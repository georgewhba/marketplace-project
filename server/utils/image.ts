import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../env.js';
import { uploadToR2, deleteFromR2 } from './r2.js';

const MAX_DIMENSION = 1200;
const MAX_INPUT_PIXELS = 40_000_000; // Prevent image decompression bombs

/**
 * Validate file type by checking magic bytes, not just the extension.
 */
export function validateImageMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return true;
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return true;
  }

  // WebP: RIFF....WEBP (bytes 0..3 == 'RIFF' and bytes 8..11 == 'WEBP')
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return true;
  }

  return false;
}

const isR2FullyConfigured = Boolean(
  env.R2_ACCOUNT_ID &&
  env.R2_ACCESS_KEY_ID &&
  env.R2_SECRET_ACCESS_KEY &&
  env.R2_BUCKET_NAME &&
  env.R2_PUBLIC_URL
);

/**
 * Process uploaded image:
 * - Resize to max 1200×1200 (preserving aspect ratio)
 * - Convert to WebP
 * - Strip all EXIF metadata (GPS, device info)
 * - Uploads to R2 if configured, else saves to local disk.
 * Returns the URL path to the saved file.
 */
export async function processImage(buffer: Buffer): Promise<string> {
  const filename = `${uuidv4()}.webp`;

  const processedBuffer = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .rotate() // Auto-rotate based on EXIF orientation, then strip
    .toBuffer();

  if (isR2FullyConfigured) {
    return await uploadToR2(processedBuffer, filename, 'image/webp');
  }

  // Fallback to local disk
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  await fs.mkdir(uploadDir, { recursive: true });
  const outputPath = path.join(uploadDir, filename);
  await fs.writeFile(outputPath, processedBuffer);

  return `/uploads/${filename}`;
}

/**
 * Delete an uploaded image by its URL path.
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  if (isR2FullyConfigured && env.R2_PUBLIC_URL && imageUrl.startsWith(env.R2_PUBLIC_URL)) {
    await deleteFromR2(imageUrl);
    return;
  }

  if (!imageUrl.startsWith('/uploads/')) return;

  const filename = path.basename(imageUrl);
  const filePath = path.join(path.resolve(env.UPLOAD_DIR), filename);

  try {
    await fs.unlink(filePath);
  } catch {
    // File might already be deleted, ignore
  }
}
