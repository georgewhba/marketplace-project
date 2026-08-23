import { Hono } from 'hono';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { uploadRateLimit } from '../middleware/rateLimit.js';
import { sendCreated } from '../utils/response.js';
import { processImage, validateImageMagicBytes } from '../utils/image.js';
import { AppError } from '../utils/errors.js';

const uploadRoutes = new Hono();

// POST /api/upload — restricted to vendor and admin only
uploadRoutes.post('/', authenticate, authorize('vendor', 'admin'), uploadRateLimit, async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  
  if (!file || !(file instanceof File)) {
    throw AppError.badRequest('الملف مطلوب');
  }

  // Check MIME type
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(file.type)) {
    throw AppError.badRequest('نوع الملف غير مسموح. الأنواع المقبولة: JPEG, PNG, WebP');
  }

  // Check size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw AppError.badRequest('حجم الملف يتجاوز 5 ميجابايت');
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate magic bytes
  if (!validateImageMagicBytes(buffer)) {
    throw AppError.badRequest('محتوى الملف لا يتطابق مع نوع الصورة المتوقع');
  }

  const url = await processImage(buffer);
  return sendCreated(c, { url });
});

export default uploadRoutes;
