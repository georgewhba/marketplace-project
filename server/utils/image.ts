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

/**
 * Process uploaded image:
 * - Resize to max 1200×1200 (preserving aspect ratio)
 * - Convert to WebP
 * - Strip all EXIF metadata (GPS, device info)
 * - Save with UUID filename
 * Returns the relative URL path to the saved file.
 */
export async function processImage(buffer: Buffer): Promise<string> {
  const filename = `${uuidv4()}.webp`;
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  
  // Ensure upload directory exists
  await fs.mkdir(uploadDir, { recursive: true });
  
  const outputPath = path.join(uploadDir, filename);

  await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .rotate() // Auto-rotate based on EXIF orientation, then strip
    .toFile(outputPath);

  return `/uploads/${filename}`;
}

/**
 * Delete an uploaded image by its URL path.
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  if (!imageUrl.startsWith('/uploads/')) return;
  
  const filename = path.basename(imageUrl);
  const filePath = path.join(path.resolve(env.UPLOAD_DIR), filename);
  
  try {
    await fs.unlink(filePath);
  } catch {
    // File might already be deleted, ignore
  }
}
