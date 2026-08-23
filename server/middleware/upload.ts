import multer from 'multer';
import { env } from '../env.js';

const MAX_FILE_SIZE = env.MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Multer configuration for file uploads.
 * Stores files in memory for processing by Sharp before saving to disk.
 * Validates MIME type (further magic byte validation happens in the route handler).
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مسموح. الأنواع المقبولة: JPEG, PNG, WebP'));
    }
  },
});
