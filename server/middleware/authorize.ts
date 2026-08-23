import type { Context, Next } from 'hono';
import { AppError } from '../utils/errors.js';
import type { AuthUser } from './authenticate.js';

/**
 * Role-based authorization middleware.
 * Must be used after authenticate middleware.
 */
export function authorize(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as AuthUser | undefined;
    
    if (!user) {
      throw AppError.unauthorized();
    }

    if (!allowedRoles.includes(user.role)) {
      throw AppError.forbidden('ليس لديك صلاحية للوصول لهذا المورد');
    }

    await next();
  };
}
