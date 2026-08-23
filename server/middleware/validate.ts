import type { Context, Next } from 'hono';
import { z, type ZodSchema } from 'zod';
import { AppError } from '../utils/errors.js';

/**
 * Zod validation middleware factory.
 * Validates body, query, or params against a Zod schema.
 * Rejects any unrecognized fields when using .strict() schemas.
 */
export function validate<T extends ZodSchema>(
  target: 'body' | 'query' | 'param',
  schema: T
) {
  return async (c: Context, next: Next) => {
    let data: unknown;

    switch (target) {
      case 'body':
        try {
          data = await c.req.json();
        } catch {
          throw AppError.badRequest('بيانات JSON غير صالحة');
        }
        break;
      case 'query':
        data = c.req.query();
        break;
      case 'param':
        data = c.req.param();
        break;
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      throw AppError.badRequest('بيانات غير صالحة', errors);
    }

    // Attach validated data to context
    c.set(`validated_${target}`, result.data);
    await next();
  };
}

/**
 * Helper to retrieve validated data from context.
 */
export function getValidated<T>(c: Context, target: 'body' | 'query' | 'param'): T {
  return c.get(`validated_${target}`) as T;
}
