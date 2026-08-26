import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../env.js';

const MAX_DIMENSION = 1200;

// Magic bytes for allowed image types
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
};

/**
 * Validate file type by checking magic bytes, not just the extension.
 */
export function validateImageMagicBytes(buffer: Buffer): boolean {
  for (const bytes of Object.values(MAGIC_BYTES)) {
    let match = true;
    for (let i = 0; i < bytes.length; i++) {
      if (buffer[i] !== bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

import { uploadToR2, deleteFromR2 } from './r2.js';

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
  
  const processedBuffer = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .rotate() // Auto-rotate based on EXIF orientation, then strip
    .toBuffer();

  if (env.R2_BUCKET_NAME && env.R2_PUBLIC_URL) {
    // Upload to Cloudflare R2
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
  if (env.R2_BUCKET_NAME && env.R2_PUBLIC_URL && imageUrl.startsWith(env.R2_PUBLIC_URL)) {
    // Delete from Cloudflare R2
    await deleteFromR2(imageUrl);
    return;
  }

  // Fallback to local disk
  if (!imageUrl.startsWith('/uploads/')) return;
  
  const filename = path.basename(imageUrl);
  const filePath = path.join(path.resolve(env.UPLOAD_DIR), filename);
  
  try {
    await fs.unlink(filePath);
  } catch {
    // File might already be deleted, ignore
  }
}

