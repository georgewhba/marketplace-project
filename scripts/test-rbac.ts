import { db, queryClient } from '../server/db/index.js';
import { users, userRoles, roles } from '../server/db/schema/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { app } from '../server/index.js';

async function run() {
  console.log('Testing RBAC Isolation...');

  // 1. Get or create a support agent user
  const [supportRole] = await db.select().from(roles).where(eq(roles.name, 'support_agent')).limit(1);
  if (!supportRole) throw new Error('Support role not found');

  const email = 'support@marketplace.com';
  let [supportUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  if (!supportUser) {
    const passwordHash = await bcrypt.hash('Support@123', 4);
    [supportUser] = await db.insert(users).values({
      email,
      passwordHash,
      firstName: 'Support',
      lastName: 'Agent',
      role: 'admin',
      isActive: true,
      emailVerifiedAt: new Date()
    }).returning();
    await db.insert(userRoles).values({ userId: supportUser!.id, roleId: supportRole.id });
  }

  // 2. Perform mock requests
  // Generate a mock JWT token or just simulate it directly. It's easier to hit the Hono app via app.request()
  // Wait, I can generate a real JWT for the user.
  const token = jwt.sign({ userId: supportUser!.id, email: supportUser!.email, role: 'admin' }, process.env.JWT_ACCESS_SECRET || 'secret', { expiresIn: '1h' });

  const headers = { 'Authorization': `Bearer ${token}` };

  console.log('--- Testing endpoints as Support Agent (only has orders.view) ---');
  
  const tests = [
    { name: 'Get Orders (Should Allow)', method: 'GET', path: '/api/admin/orders', expected: 200 },
    { name: 'Get Vendors (Should Deny)', method: 'GET', path: '/api/admin/vendors', expected: 403 },
    { name: 'Update Settings (Should Deny)', method: 'PUT', path: '/api/admin/settings', expected: 403, body: {} },
  ];

  for (const t of tests) {
    const req = new Request(`http://localhost${t.path}`, {
      method: t.method,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: t.body ? JSON.stringify(t.body) : undefined
    });

    const res = await app.fetch(req, process.env as any);
    const text = await res.text();
    if (res.status === t.expected) {
      console.log(`✅ ${t.name}: Got ${res.status}`);
    } else {
      console.log(`❌ ${t.name}: Expected ${t.expected}, got ${res.status} - ${text}`);
    }
  }

  // 3. Test super_admin
  const [adminUser] = await db.select().from(users).where(eq(users.email, 'admin@marketplace.com')).limit(1);
  const adminToken = jwt.sign({ userId: adminUser!.id, email: adminUser!.email, role: 'admin' }, process.env.JWT_ACCESS_SECRET || 'secret', { expiresIn: '1h' });
  const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };

  console.log('\n--- Testing endpoints as Super Admin ---');
  const adminTests = [
    { name: 'Get Vendors (Should Allow)', method: 'GET', path: '/api/admin/vendors', expected: 200 },
    { name: 'Update Settings (Should Allow)', method: 'PUT', path: '/api/admin/settings', expected: 400, body: {} }, // 400 because validation fails, but not 403!
  ];

  for (const t of adminTests) {
    const req = new Request(`http://localhost${t.path}`, {
      method: t.method,
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: t.body ? JSON.stringify(t.body) : undefined
    });

    const res = await app.fetch(req, process.env as any);
    if (res.status === t.expected || (t.expected === 400 && res.status === 400)) {
      console.log(`✅ ${t.name}: Got ${res.status}`);
    } else {
      console.log(`❌ ${t.name}: Expected ${t.expected}, got ${res.status}`);
    }
  }

  await queryClient.end();
  process.exit(0);
}

run().catch(console.error);
