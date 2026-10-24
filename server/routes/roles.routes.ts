import { Hono } from 'hono';
import { db } from '../db/index.js';
import { roles, permissions, rolePermissions, userRoles } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { authenticate } from '../middleware/authenticate.js';
import { requirePermission } from '../middleware/rbac.js';
import { validate, getValidated } from '../middleware/validate.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { z } from 'zod';
import type { AppEnv } from '../types/env.js';

const roleRoutes = new Hono<AppEnv>();

roleRoutes.use('*', authenticate);

// GET /api/roles
roleRoutes.get('/', requirePermission('manage_roles'), async (c) => {
  const allRoles = await db.select().from(roles);
  const allRolePerms = await db
    .select({
      roleId: rolePermissions.roleId,
      permissionId: rolePermissions.permissionId,
      key: permissions.key,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id));

  const rolesWithPerms = allRoles.map((r) => ({
    ...r,
    permissionIds: allRolePerms.filter((rp) => rp.roleId === r.id).map((rp) => rp.permissionId),
    permissions: allRolePerms.filter((rp) => rp.roleId === r.id).map((rp) => rp.key),
  }));

  return sendSuccess(c, rolesWithPerms);
});

// GET /api/roles/permissions
roleRoutes.get('/permissions', requirePermission('manage_roles'), async (c) => {
  const allPermissions = await db.select().from(permissions);
  return sendSuccess(c, allPermissions);
});

// GET /api/roles/:id/permissions
roleRoutes.get('/:id/permissions', requirePermission('manage_roles'), async (c) => {
  const roleId = parseInt(c.req.param('id'), 10);
  if (Number.isNaN(roleId)) throw AppError.badRequest('معرف غير صالح');

  const assigned = await db
    .select({
      id: permissions.id,
      key: permissions.key,
      description: permissions.description,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));

  return sendSuccess(c, assigned);
});

// POST /api/roles
roleRoutes.post(
  '/',
  requirePermission('manage_roles'),
  validate('body', z.object({ name: z.string().trim().min(1).max(100) })),
  async (c) => {
    const { name } = getValidated<{ name: string }>(c, 'body');
    const [existing] = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
    if (existing) throw AppError.conflict('اسم الدور مستخدم بالفعل');

    const [role] = await db.insert(roles).values({ name }).returning();
    return sendCreated(c, role);
  }
);

// PUT /api/roles/:id
roleRoutes.put(
  '/:id',
  requirePermission('manage_roles'),
  validate('body', z.object({ name: z.string().trim().min(1).max(100) })),
  async (c) => {
    const id = parseInt(c.req.param('id'), 10);
    if (Number.isNaN(id)) throw AppError.badRequest('معرف غير صالح');

    const [existing] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!existing) throw AppError.notFound('الدور');
    if (existing.isSystem) {
      throw AppError.forbidden('لا يمكن تعديل اسم دور النظام الأساسي');
    }

    const { name } = getValidated<{ name: string }>(c, 'body');
    const [role] = await db.update(roles).set({ name }).where(eq(roles.id, id)).returning();
    return sendSuccess(c, role);
  }
);

// POST /api/roles/:id/permissions
roleRoutes.post(
  '/:id/permissions',
  requirePermission('manage_roles'),
  validate('body', z.object({ permissionIds: z.array(z.number().int().positive()) })),
  async (c) => {
    const roleId = parseInt(c.req.param('id'), 10);
    if (Number.isNaN(roleId)) throw AppError.badRequest('معرف غير صالح');

    const [role] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
    if (!role) throw AppError.notFound('الدور');

    const { permissionIds } = getValidated<{ permissionIds: number[] }>(c, 'body');
    const uniqueIds = [...new Set(permissionIds)];

    await db.transaction(async (tx) => {
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
      if (uniqueIds.length > 0) {
        await tx.insert(rolePermissions).values(
          uniqueIds.map((permissionId: number) => ({ roleId, permissionId }))
        );
      }
    });

    return sendSuccess(c, { message: 'تم تحديث صلاحيات الدور' });
  }
);

// GET /api/roles/users/:userId
roleRoutes.get('/users/:userId', requirePermission('manage_roles'), async (c) => {
  const userId = parseInt(c.req.param('userId'), 10);
  if (Number.isNaN(userId)) throw AppError.badRequest('معرف غير صالح');

  const userRoleList = await db
    .select({ roleId: userRoles.roleId, roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
  return sendSuccess(c, userRoleList);
});

// POST /api/roles/users/:userId
roleRoutes.post(
  '/users/:userId',
  requirePermission('manage_roles'),
  validate('body', z.object({ roleIds: z.array(z.number().int().positive()) })),
  async (c) => {
    const userId = parseInt(c.req.param('userId'), 10);
    if (Number.isNaN(userId)) throw AppError.badRequest('معرف غير صالح');

    const { roleIds } = getValidated<{ roleIds: number[] }>(c, 'body');
    const uniqueRoleIds = [...new Set(roleIds)];

    await db.transaction(async (tx) => {
      await tx.delete(userRoles).where(eq(userRoles.userId, userId));
      if (uniqueRoleIds.length > 0) {
        await tx.insert(userRoles).values(
          uniqueRoleIds.map((roleId: number) => ({ userId, roleId }))
        );
      }
    });

    return sendSuccess(c, { message: 'تم تحديث أدوار المستخدم' });
  }
);

export default roleRoutes;
