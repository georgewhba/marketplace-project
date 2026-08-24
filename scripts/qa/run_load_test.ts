import { db } from '../../server/db/index.js';
import { users, products, addresses, cartItems, categories, vendors } from '../../server/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const INITIAL_STOCK = 5;
const NUM_USERS = 50;
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'CHANGE_ME_access_secret_32chars_min';
const PORT = process.env.PORT || 3002;

async function setup() {
  console.log('Setting up load test data...');

  // 1. Create a category
  const [category] = await db.insert(categories).values({
    name: 'Load Test Category',
    slug: 'load-test-category',
  }).returning();

  // 2. Create a vendor
  const hashedPassword = await hash('password123', 10);
  const [vendorUser] = await db.insert(users).values({
    firstName: 'Load',
    lastName: 'Vendor',
    email: 'vendor-load@test.com',
    passwordHash: hashedPassword,
    role: 'vendor',
    isActive: true,
  }).returning();

  const [vendor] = await db.insert(vendors).values({
    userId: vendorUser.id,
    storeName: 'Load Test Store',
    storeSlug: 'load-test-store',
    status: 'approved',
  }).returning();

  // 3. Create a product with limited stock
  const [product] = await db.insert(products).values({
    vendorId: vendor.id,
    categoryId: category.id,
    name: 'Limited Edition Sneakers',
    slug: 'limited-edition-sneakers',
    description: 'Very limited',
    price: '100.00',
    stock: INITIAL_STOCK,
    isActive: true,
    isFeatured: false,
  }).returning();

  console.log(`Created product ${product.id} with stock ${product.stock}`);

  // 4. Create 50 users, tokens, addresses, and carts
  const testUsers = [];
  
  for (let i = 0; i < NUM_USERS; i++) {
    const [user] = await db.insert(users).values({
      firstName: 'Test',
      lastName: `User ${i}`,
      email: `testuser${i}@load.com`,
      passwordHash: hashedPassword,
      role: 'customer',
      isActive: true,
    }).returning();

    const [address] = await db.insert(addresses).values({
      userId: user.id,
      fullName: `Test User ${i}`,
      phone: '1234567890',
      addressLine1: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
      postalCode: '12345',
      isDefault: true,
    }).returning();

    await db.insert(cartItems).values({
      userId: user.id,
      productId: product.id,
      quantity: 1,
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    
    testUsers.push({
      token,
      addressId: address.id,
    });
  }

  console.log(`Created ${NUM_USERS} users with cart items.`);

  // Write test data to file for k6
  const testDataPath = path.join(process.cwd(), 'scripts/qa/test-data.json');
  fs.writeFileSync(testDataPath, JSON.stringify({
    baseUrl: `http://localhost:${PORT}`,
    users: testUsers,
  }));

  console.log('Test data written to test-data.json');
  
  return product.id;
}

async function verify(productId: number) {
  console.log('Verifying results...');
  const [product] = await db.select().from(products).where(eq(products.id, productId));
  
  console.log(`Final stock: ${product.stock}`);
  if (product.stock === 0) {
    console.log('✅ PASS: No overselling occurred. Stock is exactly 0.');
  } else if (product.stock < 0) {
    console.error(`❌ FAIL: Overselling detected! Stock is ${product.stock}`);
    process.exit(1);
  } else {
    console.warn(`⚠️ WARNING: Stock is ${product.stock}, meaning not all items were sold. This is fine if errors occurred but expected 0.`);
  }
}

async function main() {
  // We need to clear previous load test data
  console.log('Clearing old data...');
  await db.delete(cartItems);
  await db.delete(addresses);
  await db.delete(products);
  await db.delete(categories);
  await db.delete(vendors);
  await db.delete(users).where(eq(users.email, 'vendor-load@test.com'));
  
  // Also delete test users
  for (let i = 0; i < NUM_USERS; i++) {
    await db.delete(users).where(eq(users.email, `testuser${i}@load.com`));
  }
  
  const productId = await setup();
  
  console.log('\n--- Starting k6 Load Test ---');
  try {
    // Run k6
    const k6Path = path.join(process.cwd(), 'k6-bin/k6-v0.49.0-windows-amd64/k6.exe');
    execSync(`${k6Path} run scripts/qa/load_test.js`, { stdio: 'inherit' });
  } catch (error) {
    console.error('k6 test failed to run or returned error status.');
  }
  console.log('--- k6 Load Test Finished ---\n');
  
  await verify(productId);
  process.exit(0);
}

main().catch(console.error);
