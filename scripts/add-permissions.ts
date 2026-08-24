import { db, queryClient } from '../server/db/index.js';
import { roles, permissions, rolePermissions } from '../server/db/schema/index.js';
import { eq, and } from 'drizzle-orm';

async function run() {
  console.log('Adding missing permissions...');
  
  const permissionsToAdd = [
    { key: 'categories.manage', description: 'Manage categories' },
    { key: 'coupons.manage', description: 'Manage coupons' },
    { key: 'audit.view', description: 'View audit and message logs' },
    { key: 'dashboard.view', description: 'View admin dashboard overview' },
  ];

  // Insert permissions if they don't exist
  const addedPerms = [];
  for (const perm of permissionsToAdd) {
    const existing = await db.select().from(permissions).where(eq(permissions.key, perm.key)).limit(1);
    if (existing.length === 0) {
      const [inserted] = await db.insert(permissions).values(perm).returning();
      if (inserted) addedPerms.push(inserted);
    } else {
      addedPerms.push(existing[0]);
    }
  }

  // Get super_admin role
  const [superAdminRole] = await db.select().from(roles).where(eq(roles.name, 'super_admin')).limit(1);
  if (superAdminRole) {
    for (const perm of addedPerms) {
      if (!perm) continue;
      const existingLink = await db.select().from(rolePermissions)
        .where(and(eq(rolePermissions.roleId, superAdminRole.id), eq(rolePermissions.permissionId, perm.id)))
        .limit(1);
      
      if (existingLink.length === 0) {
         try {
           await db.insert(rolePermissions).values({
             roleId: superAdminRole.id,
             permissionId: perm.id
           });
           console.log(`Added permission ${perm.key} to super_admin`);
         } catch (e) {
           // ignore duplicate
         }
      }
    }
  }

  console.log('Done!');
  await queryClient.end();
}

run().catch(console.error);
