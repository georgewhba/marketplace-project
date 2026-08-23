import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { addresses } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import { validate, getValidated } from '../middleware/validate.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import type { AppEnv } from '../types/env.js';

const addressRoutes = new Hono<AppEnv>();
addressRoutes.use('*', authenticate);

const addressSchema = z.object({
  label: z.string().max(50).default('home'),
  fullName: z.string().min(2, 'الاسم مطلوب').max(255).trim(),
  phone: z.string().min(8, 'رقم الهاتف مطلوب').max(20),
  addressLine1: z.string().min(5, 'العنوان مطلوب').trim(),
  addressLine2: z.string().optional().nullable(),
  city: z.string().min(2, 'المدينة مطلوبة').max(100).trim(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).default('Egypt'),
  isDefault: z.boolean().default(false),
}).strict();

// GET /api/addresses
addressRoutes.get('/', async (c) => {
  const user = c.get('user');
  const list = await db.select().from(addresses).where(eq(addresses.userId, user.id));
  return sendSuccess(c, list);
});

// POST /api/addresses
addressRoutes.post('/', validate('body', addressSchema), async (c) => {
  const user = c.get('user');
  const input = getValidated<z.infer<typeof addressSchema>>(c, 'body');

  if (input.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  }

  const [addr] = await db.insert(addresses).values({ ...input, userId: user.id }).returning();
  return sendCreated(c, addr);
});

// PUT /api/addresses/:id
addressRoutes.put('/:id', validate('body', addressSchema.partial()), async (c) => {
  const user = c.get('user');
  const addrId = parseInt(c.req.param('id')!, 10);
  const input = getValidated<Partial<z.infer<typeof addressSchema>>>(c, 'body');

  const [existing] = await db.select().from(addresses)
    .where(and(eq(addresses.id, addrId), eq(addresses.userId, user.id))).limit(1);
  if (!existing) throw AppError.notFound('العنوان');

  if (input.isDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  }

  const [updated] = await db.update(addresses).set(input).where(eq(addresses.id, addrId)).returning();
  return sendSuccess(c, updated);
});

// DELETE /api/addresses/:id
addressRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const addrId = parseInt(c.req.param('id')!, 10);

  const [existing] = await db.select().from(addresses)
    .where(and(eq(addresses.id, addrId), eq(addresses.userId, user.id))).limit(1);
  if (!existing) throw AppError.notFound('العنوان');

  await db.delete(addresses).where(eq(addresses.id, addrId));
  return sendSuccess(c, { message: 'تم حذف العنوان' });
});

// PUT /api/addresses/:id/default
addressRoutes.put('/:id/default', async (c) => {
  const user = c.get('user');
  const addrId = parseInt(c.req.param('id')!, 10);

  const [existing] = await db.select().from(addresses)
    .where(and(eq(addresses.id, addrId), eq(addresses.userId, user.id))).limit(1);
  if (!existing) throw AppError.notFound('العنوان');

  await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  const [updated] = await db.update(addresses).set({ isDefault: true }).where(eq(addresses.id, addrId)).returning();
  return sendSuccess(c, updated);
});

export default addressRoutes;
