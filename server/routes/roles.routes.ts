import { Hono } from 'hono';
import { db } from '../db/index.js';
import { roles, permissions, rolePermissions, userRoles, users } from '../db/schema/index.js';
import { eq, inArray } from 'drizzle-orm';
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
  return sendSuccess(c, allRoles);
});

// GET /api/roles/permissions
roleRoutes.get('/permissions', requirePermission('manage_roles'), async (c) => {
  const allPermissions = await db.select().from(permissions);
  return sendSuccess(c, allPermissions);
});

// POST /api/roles
roleRoutes.post(
  '/',
  requirePermission('manage_roles'),
  validate('body', z.object({ name: z.string().min(1) })),
  async (c) => {
    const { name } = getValidated<{ name: string }>(c, 'body');
    const [role] = await db.insert(roles).values({ name }).returning();
    return sendCreated(c, role);
  }
);

// PUT /api/roles/:id
roleRoutes.put(
  '/:id',
  requirePermission('manage_roles'),
  validate('body', z.object({ name: z.string().min(1) })),
  async (c) => {
    const id = parseInt(c.req.param('id'), 10);
    const { name } = getValidated<{ name: string }>(c, 'body');
    const [role] = await db.update(roles).set({ name }).where(eq(roles.id, id)).returning();
    if (!role) throw AppError.notFound('الدور');
    return sendSuccess(c, role);
  }
);

// POST /api/roles/:id/permissions
roleRoutes.post(
  '/:id/permissions',
  requirePermission('manage_roles'),
  validate('body', z.object({ permissionIds: z.array(z.number()) })),
  async (c) => {
    const roleId = parseInt(c.req.param('id'), 10);
    const { permissionIds } = getValidated<{ permissionIds: number[] }>(c, 'body');
    
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    
    if (permissionIds.length > 0) {
      await db.insert(rolePermissions).values(
        permissionIds.map((permissionId: number) => ({ roleId, permissionId }))
      );
    }
    return sendSuccess(c, { message: 'تم تحديث صلاحيات الدور' });
  }
);

// GET /api/roles/users/:userId
roleRoutes.get('/users/:userId', requirePermission('manage_roles'), async (c) => {
  const userId = parseInt(c.req.param('userId'), 10);
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
  validate('body', z.object({ roleIds: z.array(z.number()) })),
  async (c) => {
    const userId = parseInt(c.req.param('userId'), 10);
    const { roleIds } = getValidated<{ roleIds: number[] }>(c, 'body');
    
    await db.delete(userRoles).where(eq(userRoles.userId, userId));
    
    if (roleIds.length > 0) {
      await db.insert(userRoles).values(
        roleIds.map((roleId: number) => ({ userId, roleId }))
      );
    }
    return sendSuccess(c, { message: 'تم تحديث أدوار المستخدم' });
  }
);

export default roleRoutes;
