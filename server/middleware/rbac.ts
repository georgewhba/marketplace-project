import { createMiddleware } from 'hono/factory';
import { db } from '../db/index.js';
import { users, userRoles, roles, rolePermissions, permissions } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { AppError } from '../utils/errors.js';
import type { AppEnv } from '../types/env.js';

export const requirePermission = (permissionKey: string) => {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user');
    if (!user) {
      throw AppError.unauthorized('غير مصرح');
    }

    // Always allow super_admin
    const userRoleList = await db
      .select({
        roleName: roles.name,
        isSystem: roles.isSystem,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));

    const isSuperAdmin = user.role === 'admin' || userRoleList.some(r => r.isSystem && r.roleName === 'super_admin');
    if (isSuperAdmin) {
      await next();
      return;
    }

    // Check specific permission
    const hasPermission = await db
      .select({ permissionKey: permissions.key })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        and(
          eq(userRoles.userId, user.id),
          eq(permissions.key, permissionKey)
        )
      )
      .limit(1);

    if (hasPermission.length === 0) {
      throw AppError.forbidden('ليس لديك صلاحية لهذا الإجراء');
    }

    await next();
  });
};
