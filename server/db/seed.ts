import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { db, queryClient } from './index.js';
import {
  users, vendors, categories, products, productImages,
  addresses, orders, orderItems, reviews, transactions,
  notifications, coupons, siteSettings, wishlists,
  roles, permissions, rolePermissions, userRoles,
  auditLog, vendorSubscriptions, subscriptionPromotions, subscriptionPlans,
  payoutRequests, settlements, refundRequests, payments,
  shipmentEvents, shipments, commissionRules, mfaSecrets,
  notificationPreferences, messageLogs, refreshTokens, stockAlerts, cartItems
} from './schema/index.js';
import { env } from '../env.js';

const SALT_ROUNDS = 12;

async function seed() {
  console.log('🌱 Seeding database...\n');

  // Clear existing data in strict reverse dependency order
  await db.delete(auditLog);
  await db.delete(vendorSubscriptions);
  await db.delete(subscriptionPromotions);
  await db.delete(subscriptionPlans);
  await db.delete(payoutRequests);
  await db.delete(settlements);
  await db.delete(refundRequests);
  await db.delete(payments);
  await db.delete(shipmentEvents);
  await db.delete(shipments);
  await db.delete(commissionRules);
  await db.delete(mfaSecrets);
  await db.delete(notificationPreferences);
  await db.delete(messageLogs);
  await db.delete(refreshTokens);
  await db.delete(stockAlerts);
  await db.delete(cartItems);
  await db.delete(userRoles);
  await db.delete(rolePermissions);
  await db.delete(permissions);
  await db.delete(roles);
  await db.delete(wishlists);
  await db.delete(notifications);
  await db.delete(transactions);
  await db.delete(reviews);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(productImages);
  await db.delete(products);
  await db.delete(categories);
  await db.delete(vendors);
  await db.delete(addresses);
  await db.delete(users);
  await db.delete(coupons);
  await db.delete(siteSettings);

  console.log('  ✓ Cleared existing data');

  // ─── RBAC: ROLES & PERMISSIONS ───
  const [superAdminRole] = await db.insert(roles).values({
    name: 'super_admin',
    isSystem: true,
  }).returning();
  
  const [supportRole] = await db.insert(roles).values({
    name: 'support_agent',
    isSystem: true,
  }).returning();

  const permissionsList = [
    { key: 'vendors.approve', description: 'Approve or reject vendors' },
    { key: 'vendors.suspend', description: 'Suspend vendors' },
    { key: 'products.moderate', description: 'Edit or delete any product' },
    { key: 'orders.view', description: 'View all orders' },
    { key: 'orders.refund', description: 'Process order refunds' },
    { key: 'users.manage', description: 'Manage users and roles' },
    { key: 'settings.view', description: 'View site settings and subscription plans' },
    { key: 'settings.edit', description: 'Edit site settings' },
    { key: 'commission.manage', description: 'Manage commission rules' },
    { key: 'payouts.approve', description: 'Approve vendor payouts' },
    { key: 'analytics.view', description: 'View advanced analytics' },
    { key: 'dashboard.view', description: 'View admin dashboard' },
    { key: 'manage_roles', description: 'Manage system roles' },
    { key: 'categories.manage', description: 'Manage categories' },
    { key: 'coupons.manage', description: 'Manage coupons' },
    { key: 'audit.view', description: 'View message and audit logs' },
  ];

  const insertedPerms = await db.insert(permissions).values(permissionsList).returning();
  
  // Assign all permissions to super_admin
  await db.insert(rolePermissions).values(
    insertedPerms.map(p => ({ roleId: superAdminRole!.id, permissionId: p.id }))
  );
  // Assign basic permissions to support_agent
  await db.insert(rolePermissions).values([
    { roleId: supportRole!.id, permissionId: insertedPerms.find(p => p.key === 'orders.view')!.id }
  ]);

  console.log('  ✓ Roles and permissions created');

  // ─── SUBSCRIPTION PLANS ───
  const insertedPlans = await db.insert(subscriptionPlans).values([
    {
      name: 'الباقة الأساسية (مجاناً)',
      slug: 'basic',
      priceMonthly: '0.00',
      commissionRate: '10.00',
      productLimit: 50,
      imageLimitPerProduct: 3,
      autoShippingEnabled: false,
      advancedAnalytics: false,
      bulkActionsEnabled: false,
      payoutCycleDays: 30,
      trustBadge: null,
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'باقة بلس (Plus)',
      slug: 'plus',
      priceMonthly: '299.00',
      commissionRate: '7.00',
      productLimit: 300,
      imageLimitPerProduct: 7,
      autoShippingEnabled: true,
      advancedAnalytics: true,
      bulkActionsEnabled: false,
      payoutCycleDays: 14,
      trustBadge: 'plus_seller',
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'باقة المحترفين (Pro)',
      slug: 'pro',
      priceMonthly: '799.00',
      commissionRate: '4.00',
      productLimit: null,
      imageLimitPerProduct: 15,
      autoShippingEnabled: true,
      advancedAnalytics: true,
      bulkActionsEnabled: true,
      payoutCycleDays: 7,
      trustBadge: 'verified_pro',
      sortOrder: 3,
      isActive: true,
    },
  ]).returning();
  const basicPlan = insertedPlans.find(p => p.slug === 'basic')!;
  console.log('  ✓ Subscription plans created');

  // ─── ADMIN ───
  const adminHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, SALT_ROUNDS);
  const [admin] = await db.insert(users).values({
    email: env.SEED_ADMIN_EMAIL,
    passwordHash: adminHash,
    firstName: 'مدير',
    lastName: 'المنصة',
    phone: '01000000000',
    role: 'admin',
    isActive: true,
    emailVerifiedAt: new Date(),
  }).returning();
  
  // Attach super_admin role to admin user
  await db.insert(userRoles).values({ userId: admin!.id, roleId: superAdminRole!.id });
  console.log('  ✓ Admin created');

  // ─── VENDOR USERS ───
  const vendorPassword = await bcrypt.hash('Vendor@123456', SALT_ROUNDS);
  const [vendorUser1] = await db.insert(users).values({
    email: 'sony@marketplace.com', passwordHash: vendorPassword,
    firstName: 'أحمد', lastName: 'حسن', phone: '01111111111',
    role: 'vendor', isActive: true, emailVerifiedAt: new Date(),
  }).returning();
  const [vendorUser2] = await db.insert(users).values({
    email: 'shorouk@marketplace.com', passwordHash: vendorPassword,
    firstName: 'محمد', lastName: 'علي', phone: '01222222222',
    role: 'vendor', isActive: true, emailVerifiedAt: new Date(),
  }).returning();
  const [vendorUser3] = await db.insert(users).values({
    email: 'fashion@marketplace.com', passwordHash: vendorPassword,
    firstName: 'سارة', lastName: 'محمود', phone: '01333333333',
    role: 'vendor', isActive: true, emailVerifiedAt: new Date(),
  }).returning();
  console.log('  ✓ Vendor users created');

  // ─── VENDORS ───
  const [vendor1] = await db.insert(vendors).values({
    userId: vendorUser1!.id, storeName: 'سوني ستور مصر', storeSlug: 'sony-store-egypt',
    storeDescription: 'أحدث الأجهزة الإلكترونية والسماعات والكاميرات من سوني مصر. وكيل معتمد مع ضمان رسمي.',
    commissionRate: '8.50', status: 'approved', approvedAt: new Date(),
    totalProducts: 15, rating: '4.60', reviewCount: 20,
  }).returning();
  const [vendor2] = await db.insert(vendors).values({
    userId: vendorUser2!.id, storeName: 'دار الشروق للكتب', storeSlug: 'dar-el-shorouk',
    storeDescription: 'أكبر مكتبة عربية على الإنترنت. روايات، كتب تقنية، تطوير ذات، وتاريخ.',
    commissionRate: '7.00', status: 'approved', approvedAt: new Date(),
    totalProducts: 13, rating: '4.45', reviewCount: 15,
  }).returning();
  const [vendor3] = await db.insert(vendors).values({
    userId: vendorUser3!.id, storeName: 'فاشن ماجستيك', storeSlug: 'fashion-majestic',
    storeDescription: 'أزياء عصرية للرجال والنساء والأطفال. ماركات أصلية بأسعار مناسبة.',
    commissionRate: '10.00', status: 'approved', approvedAt: new Date(),
    totalProducts: 12, rating: '4.30', reviewCount: 15,
  }).returning();

  // Assign active Basic subscription to all seeded vendors
  await db.insert(vendorSubscriptions).values([
    { vendorId: vendor1!.id, planId: basicPlan.id, status: 'active', currentPeriodStart: new Date(), autoRenew: true },
    { vendorId: vendor2!.id, planId: basicPlan.id, status: 'active', currentPeriodStart: new Date(), autoRenew: true },
    { vendorId: vendor3!.id, planId: basicPlan.id, status: 'active', currentPeriodStart: new Date(), autoRenew: true },
  ]);
  console.log('  ✓ Vendors and active subscriptions created');

  // ─── CATEGORIES ───
  const catData = [
    { name: 'إلكترونيات', slug: 'electronics', icon: 'Cpu', sortOrder: 1 },
    { name: 'كتب', slug: 'books', icon: 'BookOpen', sortOrder: 2 },
    { name: 'ملابس', slug: 'clothing', icon: 'Shirt', sortOrder: 3 },
    { name: 'منزل', slug: 'home', icon: 'Home', sortOrder: 4 },
  ];
  const parentCats = await db.insert(categories).values(catData).returning();

  const elecId = parentCats.find(c => c.slug === 'electronics')!.id;
  const booksId = parentCats.find(c => c.slug === 'books')!.id;
  const clothId = parentCats.find(c => c.slug === 'clothing')!.id;
  const homeId = parentCats.find(c => c.slug === 'home')!.id;

  const subCats = await db.insert(categories).values([
    { name: 'سماعات', slug: 'headphones', parentId: elecId, icon: 'Headphones', sortOrder: 1 },
    { name: 'لابتوب', slug: 'laptops', parentId: elecId, icon: 'Laptop', sortOrder: 2 },
    { name: 'موبايلات', slug: 'phones', parentId: elecId, icon: 'Smartphone', sortOrder: 3 },
    { name: 'كاميرات', slug: 'cameras', parentId: elecId, icon: 'Camera', sortOrder: 4 },
    { name: 'روايات', slug: 'novels', parentId: booksId, icon: 'Book', sortOrder: 1 },
    { name: 'تقنية', slug: 'tech-books', parentId: booksId, icon: 'Code', sortOrder: 2 },
    { name: 'تطوير ذات', slug: 'self-help', parentId: booksId, icon: 'Brain', sortOrder: 3 },
    { name: 'تاريخ', slug: 'history', parentId: booksId, icon: 'Clock', sortOrder: 4 },
    { name: 'رجالي', slug: 'men', parentId: clothId, icon: 'User', sortOrder: 1 },
    { name: 'نسائي', slug: 'women', parentId: clothId, icon: 'User', sortOrder: 2 },
    { name: 'أطفال', slug: 'kids', parentId: clothId, icon: 'Baby', sortOrder: 3 },
    { name: 'أدوات مطبخ', slug: 'kitchen', parentId: homeId, icon: 'ChefHat', sortOrder: 1 },
    { name: 'ديكور', slug: 'decor', parentId: homeId, icon: 'Lamp', sortOrder: 2 },
  ]).returning();
  console.log('  ✓ Categories created (4 parent + 13 sub)');

  // Helper to get subcategory ID
  const subId = (slug: string) => subCats.find(c => c.slug === slug)!.id;

  // ─── PRODUCTS (40) ───
  const productData = [
    // Sony Store (Electronics) — 15 products
    { vendorId: vendor1!.id, categoryId: subId('headphones'), name: 'سماعات سوني WH-1000XM5', price: '7999.00', comparePrice: '8999.00', stock: 25, sku: 'SONY-WH1000XM5', isFeatured: true, description: 'سماعات لاسلكية بخاصية إلغاء الضوضاء الرائدة في الصناعة. صوت فائق الجودة مع بطارية تدوم 30 ساعة.' },
    { vendorId: vendor1!.id, categoryId: subId('headphones'), name: 'سماعات سوني WF-1000XM5', price: '5499.00', comparePrice: '6200.00', stock: 40, sku: 'SONY-WF1000XM5', isFeatured: true, description: 'أصغر وأخف سماعات أذن لاسلكية مع إلغاء ضوضاء فائق. مقاومة للماء والعرق.' },
    { vendorId: vendor1!.id, categoryId: subId('headphones'), name: 'سماعات سوني WH-CH720N', price: '2899.00', comparePrice: '3400.00', stock: 60, sku: 'SONY-WHCH720N', isFeatured: false, description: 'سماعات خفيفة الوزن مع إلغاء ضوضاء وبلوتوث 5.2. مثالية للاستخدام اليومي.' },
    { vendorId: vendor1!.id, categoryId: subId('laptops'), name: 'لابتوب سوني VAIO SX14', price: '42000.00', comparePrice: null, stock: 8, sku: 'SONY-VAIO-SX14', isFeatured: true, description: 'لابتوب احترافي خفيف الوزن بشاشة 14 بوصة 4K. معالج Intel Core i7 الجيل الثالث عشر.' },
    { vendorId: vendor1!.id, categoryId: subId('laptops'), name: 'لابتوب سوني VAIO FE 15', price: '28500.00', comparePrice: '32000.00', stock: 12, sku: 'SONY-VAIO-FE15', isFeatured: false, description: 'لابتوب بشاشة 15.6 بوصة Full HD مع معالج قوي ومساحة تخزين كبيرة.' },
    { vendorId: vendor1!.id, categoryId: subId('phones'), name: 'سوني Xperia 1 V', price: '35000.00', comparePrice: '38000.00', stock: 15, sku: 'SONY-XPERIA1V', isFeatured: true, description: 'هاتف رائد بكاميرا مع مستشعر Exmor T المطور. شاشة OLED 4K HDR بمعدل تحديث 120Hz.' },
    { vendorId: vendor1!.id, categoryId: subId('phones'), name: 'سوني Xperia 10 V', price: '12500.00', comparePrice: '14000.00', stock: 30, sku: 'SONY-XPERIA10V', isFeatured: false, description: 'هاتف متوسط الفئة ببطارية 5000mAh ومقاومة للماء. كاميرا ثلاثية عالية الجودة.' },
    { vendorId: vendor1!.id, categoryId: subId('cameras'), name: 'كاميرا سوني Alpha A7 IV', price: '62000.00', comparePrice: null, stock: 5, sku: 'SONY-A7IV', isFeatured: true, description: 'كاميرا فل فريم بدقة 33 ميجابكسل مع تصوير فيديو 4K 60p. مثالية للمصورين المحترفين.' },
    { vendorId: vendor1!.id, categoryId: subId('cameras'), name: 'كاميرا سوني ZV-E10 II', price: '22000.00', comparePrice: '24500.00', stock: 18, sku: 'SONY-ZVE10II', isFeatured: true, description: 'أفضل كاميرا لصناع المحتوى. تصوير 4K مع شاشة قابلة للدوران وميكروفون مدمج.' },
    { vendorId: vendor1!.id, categoryId: subId('cameras'), name: 'عدسة سوني FE 50mm f/1.4 GM', price: '18500.00', comparePrice: null, stock: 10, sku: 'SONY-FE50GM', isFeatured: false, description: 'عدسة G Master ببعد بؤري 50mm وفتحة f/1.4. بوكيه مذهل وحدة فائقة.' },
    { vendorId: vendor1!.id, categoryId: subId('headphones'), name: 'سماعات سوني LinkBuds S', price: '3200.00', comparePrice: '3800.00', stock: 45, sku: 'SONY-LINKBUDSS', isFeatured: false, description: 'سماعات خفيفة مع إلغاء ضوضاء تتكيف تلقائياً. وزن 4.8 جرام فقط لكل سماعة.' },
    { vendorId: vendor1!.id, categoryId: subId('cameras'), name: 'كاميرا سوني RX100 VII', price: '28000.00', comparePrice: '30000.00', stock: 7, sku: 'SONY-RX100VII', isFeatured: false, description: 'كاميرا كومباكت بمستشعر 1 بوصة وزوم بصري 8x. تصوير متتابع 20 إطار/ثانية.' },
    { vendorId: vendor1!.id, categoryId: subId('headphones'), name: 'سبيكر سوني SRS-XB100', price: '1200.00', comparePrice: '1500.00', stock: 80, sku: 'SONY-SRSXB100', isFeatured: false, description: 'سبيكر بلوتوث محمول مقاوم للماء. صوت قوي وجودة عالية في تصميم صغير.' },
    { vendorId: vendor1!.id, categoryId: subId('phones'), name: 'سوني Xperia 5 V', price: '24000.00', comparePrice: '26500.00', stock: 20, sku: 'SONY-XPERIA5V', isFeatured: true, description: 'هاتف كومباكت بأداء رائد. شاشة OLED 6.1 بوصة مع كاميرا مطورة.' },
    { vendorId: vendor1!.id, categoryId: subId('laptops'), name: 'حقيبة لابتوب سوني', price: '850.00', comparePrice: null, stock: 100, sku: 'SONY-BAG-15', isFeatured: false, description: 'حقيبة لابتوب أنيقة من سوني مقاس 15 بوصة. مقاومة للماء مع جيوب متعددة.' },

    // Dar El Shorouk (Books) — 13 products
    { vendorId: vendor2!.id, categoryId: subId('novels'), name: 'عمارة يعقوبيان — علاء الأسواني', price: '120.00', comparePrice: '150.00', stock: 200, sku: 'BOOK-YAQ-001', isFeatured: true, description: 'رواية تصور الحياة في عمارة وسط القاهرة وتكشف عن طبقات المجتمع المصري المختلفة.' },
    { vendorId: vendor2!.id, categoryId: subId('novels'), name: 'أولاد حارتنا — نجيب محفوظ', price: '95.00', comparePrice: null, stock: 150, sku: 'BOOK-AWL-001', isFeatured: true, description: 'رواية رمزية من الأدب العربي الكلاسيكي تتناول صراع الخير والشر عبر الأجيال.' },
    { vendorId: vendor2!.id, categoryId: subId('novels'), name: 'موسم الهجرة إلى الشمال — الطيب صالح', price: '85.00', comparePrice: '100.00', stock: 120, sku: 'BOOK-MWS-001', isFeatured: false, description: 'رواية سودانية خالدة عن صراع الهوية بين الشرق والغرب.' },
    { vendorId: vendor2!.id, categoryId: subId('tech-books'), name: 'البرمجة بلغة بايثون — دليل عملي', price: '250.00', comparePrice: '300.00', stock: 80, sku: 'BOOK-PYT-001', isFeatured: true, description: 'دليل شامل لتعلم البرمجة بلغة بايثون من الصفر حتى الاحتراف مع مشاريع عملية.' },
    { vendorId: vendor2!.id, categoryId: subId('tech-books'), name: 'تعلم تطوير المواقع — HTML, CSS, JS', price: '220.00', comparePrice: null, stock: 65, sku: 'BOOK-WEB-001', isFeatured: false, description: 'كتاب عملي لتعلم تطوير الويب من الصفر مع أمثلة وتطبيقات حقيقية.' },
    { vendorId: vendor2!.id, categoryId: subId('self-help'), name: 'العادات الذرية — جيمس كلير', price: '180.00', comparePrice: '220.00', stock: 300, sku: 'BOOK-AH-001', isFeatured: true, description: 'كيف تبني عادات جيدة وتتخلص من السيئة. الطبعة العربية الكاملة.' },
    { vendorId: vendor2!.id, categoryId: subId('self-help'), name: 'فن اللامبالاة — مارك مانسون', price: '150.00', comparePrice: '180.00', stock: 250, sku: 'BOOK-FLM-001', isFeatured: true, description: 'نهج مختلف للعيش بحياة أفضل. من أكثر الكتب مبيعاً عالمياً.' },
    { vendorId: vendor2!.id, categoryId: subId('self-help'), name: 'الأب الغني والأب الفقير', price: '160.00', comparePrice: null, stock: 180, sku: 'BOOK-RDP-001', isFeatured: false, description: 'كتاب روبرت كيوساكي الأشهر عن التثقيف المالي وبناء الثروة.' },
    { vendorId: vendor2!.id, categoryId: subId('history'), name: 'تاريخ مصر الحديث — عبد الرحمن الرافعي', price: '280.00', comparePrice: '320.00', stock: 50, sku: 'BOOK-HIS-001', isFeatured: false, description: 'مرجع شامل في تاريخ مصر من عصر محمد علي حتى ثورة يوليو.' },
    { vendorId: vendor2!.id, categoryId: subId('history'), name: 'مقدمة ابن خلدون', price: '200.00', comparePrice: null, stock: 70, sku: 'BOOK-IBN-001', isFeatured: false, description: 'تحقيق جديد لأهم كتاب في فلسفة التاريخ وعلم الاجتماع العربي.' },
    { vendorId: vendor2!.id, categoryId: subId('novels'), name: 'ثلاثية القاهرة — نجيب محفوظ', price: '350.00', comparePrice: '420.00', stock: 90, sku: 'BOOK-THL-001', isFeatured: true, description: 'ثلاثية بين القصرين وقصر الشوق والسكرية في طبعة مجمعة فاخرة.' },
    { vendorId: vendor2!.id, categoryId: subId('tech-books'), name: 'أساسيات الذكاء الاصطناعي', price: '320.00', comparePrice: null, stock: 3, sku: 'BOOK-AI-001', isFeatured: false, description: 'مدخل عملي للذكاء الاصطناعي وتعلم الآلة بأمثلة بلغة بايثون.' },
    { vendorId: vendor2!.id, categoryId: subId('novels'), name: 'ساق البامبو — سعود السنعوسي', price: '110.00', comparePrice: '130.00', stock: 140, sku: 'BOOK-SBB-001', isFeatured: false, description: 'رواية حائزة على جائزة البوكر العربية تتناول الهوية والانتماء.' },

    // Fashion Majestic (Clothing) — 12 products
    { vendorId: vendor3!.id, categoryId: subId('men'), name: 'قميص كتان رجالي — أبيض', price: '450.00', comparePrice: '580.00', stock: 40, sku: 'FASH-MS-001', isFeatured: true, description: 'قميص كتان طبيعي 100% بقصة كلاسيكية. مناسب للمناسبات والعمل.' },
    { vendorId: vendor3!.id, categoryId: subId('men'), name: 'بنطلون تشينو رجالي — كحلي', price: '380.00', comparePrice: '450.00', stock: 55, sku: 'FASH-MP-001', isFeatured: false, description: 'بنطلون تشينو بقماش قطني عالي الجودة. مريح للاستخدام اليومي.' },
    { vendorId: vendor3!.id, categoryId: subId('men'), name: 'جاكيت جلد رجالي — بني', price: '1800.00', comparePrice: '2200.00', stock: 15, sku: 'FASH-MJ-001', isFeatured: true, description: 'جاكيت جلد طبيعي بتصميم كلاسيكي. جلد إيطالي ممتاز مع بطانة حريرية.' },
    { vendorId: vendor3!.id, categoryId: subId('men'), name: 'حذاء رياضي رجالي', price: '650.00', comparePrice: null, stock: 70, sku: 'FASH-MSH-001', isFeatured: false, description: 'حذاء رياضي عصري خفيف الوزن مع نعل مريح. متاح بعدة ألوان.' },
    { vendorId: vendor3!.id, categoryId: subId('women'), name: 'فستان سهرة — أسود', price: '1200.00', comparePrice: '1500.00', stock: 20, sku: 'FASH-WD-001', isFeatured: true, description: 'فستان سهرة أنيق بقماش ساتان فاخر. تصميم كلاسيكي يناسب جميع المناسبات.' },
    { vendorId: vendor3!.id, categoryId: subId('women'), name: 'عباية مطرزة — كحلي', price: '900.00', comparePrice: '1100.00', stock: 35, sku: 'FASH-WA-001', isFeatured: true, description: 'عباية بتطريز يدوي راقي. قماش كريب عالي الجودة مع لمسة عصرية.' },
    { vendorId: vendor3!.id, categoryId: subId('women'), name: 'حقيبة يد جلد — بيج', price: '750.00', comparePrice: '950.00', stock: 25, sku: 'FASH-WB-001', isFeatured: false, description: 'حقيبة يد من الجلد الطبيعي بتصميم عملي وأنيق. جيوب داخلية متعددة.' },
    { vendorId: vendor3!.id, categoryId: subId('women'), name: 'وشاح حرير — ألوان مائية', price: '320.00', comparePrice: null, stock: 50, sku: 'FASH-WS-001', isFeatured: false, description: 'وشاح حرير طبيعي 100% بطبعة فنية مستوحاة من الألوان المائية.' },
    { vendorId: vendor3!.id, categoryId: subId('kids'), name: 'طقم أطفال صيفي — ولادي', price: '280.00', comparePrice: '350.00', stock: 60, sku: 'FASH-KB-001', isFeatured: false, description: 'طقم صيفي من القطن الناعم للأولاد. تيشيرت وشورت بألوان مبهجة.' },
    { vendorId: vendor3!.id, categoryId: subId('kids'), name: 'فستان أطفال — وردي', price: '350.00', comparePrice: '420.00', stock: 45, sku: 'FASH-KG-001', isFeatured: true, description: 'فستان أطفال بتصميم جذاب وقماش قطني مريح. مناسب للحفلات والمناسبات.' },
    { vendorId: vendor3!.id, categoryId: subId('men'), name: 'طقم بيجاما رجالي', price: '420.00', comparePrice: '500.00', stock: 30, sku: 'FASH-MPJ-001', isFeatured: false, description: 'بيجاما قطنية فاخرة بتصميم مريح. مثالية للمنزل والاسترخاء.' },
    { vendorId: vendor3!.id, categoryId: subId('women'), name: 'بلوزة شيفون — بيج', price: '280.00', comparePrice: null, stock: 2, sku: 'FASH-WBL-001', isFeatured: false, description: 'بلوزة شيفون أنيقة بقصة واسعة مريحة. مناسبة للعمل والخروج.' },
  ];

  const insertedProducts = await db.insert(products).values(
    productData.map((p, i) => ({
      ...p,
      slug: `product-${i + 1}-${Math.random().toString(36).substring(2, 7)}`,
      rating: '0', reviewCount: 0, totalSold: 0, viewCount: 0,
    }))
  ).returning();
  console.log(`  ✓ ${insertedProducts.length} products created`);

  // ─── PRODUCT IMAGES ───
  const imageInserts = insertedProducts.map((p, i) => ({
    productId: p.id,
    imageUrl: `https://picsum.photos/seed/product${i + 1}/800/800`,
    altText: p.name,
    sortOrder: 0,
  }));
  // Add second image for featured products
  const featuredProducts = insertedProducts.filter(p => p.isFeatured);
  for (const fp of featuredProducts) {
    imageInserts.push({
      productId: fp.id,
      imageUrl: `https://picsum.photos/seed/product${fp.id}b/800/800`,
      altText: `${fp.name} — صورة إضافية`,
      sortOrder: 1,
    });
  }
  await db.insert(productImages).values(imageInserts);
  console.log(`  ✓ ${imageInserts.length} product images created`);

  // ─── CUSTOMER USERS (10) ───
  const customerPassword = await bcrypt.hash('Customer@123456', SALT_ROUNDS);
  const customerData = [
    { email: 'omar@example.com', firstName: 'عمر', lastName: 'خالد', phone: '01012345678' },
    { email: 'fatma@example.com', firstName: 'فاطمة', lastName: 'أحمد', phone: '01112345678' },
    { email: 'youssef@example.com', firstName: 'يوسف', lastName: 'محمد', phone: '01212345678' },
    { email: 'nour@example.com', firstName: 'نور', lastName: 'إبراهيم', phone: '01512345678' },
    { email: 'ali@example.com', firstName: 'علي', lastName: 'حسين', phone: '01013456789' },
    { email: 'mona@example.com', firstName: 'منى', lastName: 'سيد', phone: '01113456789' },
    { email: 'khaled@example.com', firstName: 'خالد', lastName: 'عبدالله', phone: '01213456789' },
    { email: 'heba@example.com', firstName: 'هبة', lastName: 'ياسر', phone: '01513456789' },
    { email: 'tamer@example.com', firstName: 'تامر', lastName: 'وليد', phone: '01014567890' },
    { email: 'rania@example.com', firstName: 'رانيا', lastName: 'كريم', phone: '01114567890' },
  ];

  const customerUsers = await db.insert(users).values(
    customerData.map(c => ({
      ...c, passwordHash: customerPassword, role: 'customer' as const,
      isActive: true, emailVerifiedAt: new Date(),
    }))
  ).returning();
  console.log(`  ✓ ${customerUsers.length} customers created`);

  // ─── ADDRESSES ───
  const addressData = customerUsers.map((cu, i) => ({
    userId: cu.id,
    label: 'home' as const,
    fullName: `${cu.firstName} ${cu.lastName}`,
    phone: customerData[i]!.phone,
    addressLine1: [
      '15 شارع التحرير، وسط البلد', '28 شارع الهرم، الجيزة',
      '3 شارع مصطفى كامل، سموحة', '45 شارع جامعة الدول العربية، المهندسين',
      '12 شارع النيل، المعادي', '8 كورنيش النيل، جاردن سيتي',
      '20 شارع الحسين، الأزهر', '55 شارع الثورة، مصر الجديدة',
      '7 شارع بور سعيد، العتبة', '33 شارع سليم الأول، الزيتون',
    ][i]!,
    city: ['القاهرة', 'الجيزة', 'الإسكندرية', 'القاهرة', 'القاهرة',
           'القاهرة', 'القاهرة', 'القاهرة', 'القاهرة', 'القاهرة'][i]!,
    state: 'مصر',
    country: 'Egypt',
    isDefault: true,
  }));
  await db.insert(addresses).values(addressData);
  console.log('  ✓ 10 customer addresses created');

  // ─── ORDERS (25) ───
  const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'delivered', 'delivered', 'cancelled'];

  const orderInserts = [];
  for (let i = 0; i < 25; i++) {
    const customer = customerUsers[i % 10]!;
    const addr = addressData[i % 10]!;
    const status = statuses[i % statuses.length]!;
    const date = new Date();
    date.setDate(date.getDate() - (25 - i) * 2);

    // Pick 1-3 random products
    const numItems = 1 + (i % 3);
    const orderProducts = [];
    for (let j = 0; j < numItems; j++) {
      const pIdx = (i * 3 + j) % insertedProducts.length;
      orderProducts.push(insertedProducts[pIdx]!);
    }

    const subtotal = orderProducts.reduce((sum, p) => sum + parseFloat(p.price), 0);
    const shipping = 30 * new Set(orderProducts.map(p => p.vendorId)).size;
    const total = subtotal + shipping;

    orderInserts.push({
      order: {
        orderNumber: `MKT-2026${String(i + 1).padStart(4, '0')}-${100000 + i}`,
        customerId: customer.id,
        status,
        subtotal: subtotal.toFixed(2),
        shippingFee: shipping.toFixed(2),
        discount: '0.00',
        total: total.toFixed(2),
        shippingName: addr.fullName,
        shippingPhone: addr.phone,
        shippingAddressLine1: addr.addressLine1,
        shippingCity: addr.city,
        shippingState: 'مصر',
        shippingCountry: 'Egypt',
        paymentMethod: 'cash_on_delivery' as const,
        createdAt: date,
        updatedAt: date,
      },
      items: orderProducts,
      status,
    });
  }

  for (const orderData of orderInserts) {
    const [order] = await db.insert(orders).values(orderData.order).returning();
    if (!order) continue;

    for (const product of orderData.items) {
      const vendor = [vendor1, vendor2, vendor3].find(v => v!.id === product.vendorId)!;
      const commissionRate = parseFloat(vendor!.commissionRate);
      const itemTotal = parseFloat(product.price);
      const commissionAmount = itemTotal * (commissionRate / 100);
      const vendorAmount = itemTotal - commissionAmount;

      const vendorStatus = orderData.status === 'delivered' ? 'delivered' :
                          orderData.status === 'shipped' ? 'shipped' :
                          orderData.status === 'confirmed' ? 'confirmed' :
                          orderData.status === 'cancelled' ? 'cancelled' : 'pending';

      await db.insert(orderItems).values({
        orderId: order.id,
        productId: product.id,
        vendorId: product.vendorId,
        productName: product.name,
        productSku: product.sku,
        price: product.price,
        quantity: 1,
        total: product.price,
        shippingFee: '30.00',
        vendorStatus,
        commissionRate: commissionRate.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        vendorAmount: vendorAmount.toFixed(2),
        shippedAt: ['shipped', 'delivered'].includes(vendorStatus) ? new Date() : null,
        deliveredAt: vendorStatus === 'delivered' ? new Date() : null,
      });
    }
  }
  console.log('  ✓ 25 orders created with items');

  // ─── REVIEWS (50) ───
  const deliveredItems = await db.select({
    id: orderItems.id, productId: orderItems.productId, vendorId: orderItems.vendorId,
    orderId: orderItems.orderId,
  }).from(orderItems).where(
    sql`${orderItems.vendorStatus} = 'delivered' AND ${orderItems.productId} IS NOT NULL`
  );

  const reviewComments = [
    'منتج ممتاز والتوصيل كان سريع', 'جودة عالية جداً وأنصح بالشراء',
    'المنتج مطابق للوصف تماماً', 'سعر مناسب مقابل الجودة',
    'تجربة شراء مميزة وخدمة عملاء ممتازة', 'المنتج جيد لكن التغليف محتاج تحسين',
    'راضي عن المنتج بشكل عام', 'المنتج فاق توقعاتي بصراحة',
    'هيكون عندي تاني طلب قريب إن شاء الله', 'أفضل سعر لقيته على الإنترنت',
    'الخامات ممتازة والتصميم جميل', 'وصل في الموعد المحدد',
    'المنتج أصلي ومطابق للمواصفات', 'خامات ممتازة وراقية',
    'هبقى عميل دائم عندكم', 'منتج عملي ومفيد جداً',
  ];

  const reviewTitles = [
    'شراء موفق', 'جودة ممتازة', 'أنصح به', 'سعر مناسب', 'ممتاز',
    'جيد', 'راضي جداً', 'فوق المتوقع', 'يستاهل', 'رائع',
  ];

  let reviewCount = 0;
  for (let i = 0; i < Math.min(50, deliveredItems.length); i++) {
    const item = deliveredItems[i]!;
    const [order] = await db.select({ customerId: orders.customerId }).from(orders)
      .where(sql`${orders.id} = ${item.orderId}`).limit(1);
    if (!order) continue;

    const rating = 3 + (i % 3); // Ratings 3-5
    try {
      await db.insert(reviews).values({
        productId: item.productId!,
        customerId: order.customerId,
        orderItemId: item.id,
        rating,
        title: reviewTitles[i % reviewTitles.length]!,
        comment: reviewComments[i % reviewComments.length]!,
        isVerifiedPurchase: true,
        vendorReply: i % 5 === 0 ? 'شكراً لتقييمك الكريم! نسعد بخدمتك دائماً.' : null,
        vendorRepliedAt: i % 5 === 0 ? new Date() : null,
      });
      reviewCount++;
    } catch {
      // Skip duplicate reviews
    }
  }
  console.log(`  ✓ ${reviewCount} reviews created`);

  // Update product ratings based on actual reviews
  for (const product of insertedProducts) {
    const [avg] = await db.select({
      avgRating: sql<string>`COALESCE(ROUND(AVG(${reviews.rating})::numeric, 2), 0)`,
      count: sql<number>`count(*)::int`,
    }).from(reviews).where(sql`${reviews.productId} = ${product.id} AND ${reviews.isVisible} = true`);
    
    if (avg && avg.count > 0) {
      await db.update(products).set({
        rating: String(avg.avgRating), reviewCount: avg.count,
      }).where(sql`${products.id} = ${product.id}`);
    }
  }

  // ─── TRANSACTIONS (for delivered orders) ───
  const deliveredOrderItems = await db.select().from(orderItems)
    .where(sql`${orderItems.vendorStatus} = 'delivered'`);

  const vendorBalances: Record<number, number> = {
    [vendor1!.id]: 0,
    [vendor2!.id]: 0,
    [vendor3!.id]: 0,
  };

  let txCount = 0;
  for (const item of deliveredOrderItems) {
    const saleAmount = parseFloat(item.total);
    const commissionRate = parseFloat(item.commissionRate ?? '10');
    const commissionAmount = saleAmount * (commissionRate / 100);
    const vendorAmount = saleAmount - commissionAmount;
    const balanceBefore = vendorBalances[item.vendorId] ?? 0;
    const balanceAfter = balanceBefore + vendorAmount;
    vendorBalances[item.vendorId] = balanceAfter;

    await db.insert(transactions).values({
      vendorId: item.vendorId,
      orderItemId: item.id,
      type: 'commission',
      amount: vendorAmount.toFixed(2),
      balanceBefore: balanceBefore.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
      description: `عمولة — ${item.productName}`,
    });
    txCount++;
  }

  // Sync vendor totalSales with their cumulative transaction balances
  for (const [vIdStr, bal] of Object.entries(vendorBalances)) {
    await db.update(vendors)
      .set({ totalSales: bal.toFixed(2) })
      .where(sql`${vendors.id} = ${Number(vIdStr)}`);
  }
  console.log(`  ✓ ${txCount} transactions created and vendor balances synchronized`);

  // ─── COUPONS ───
  await db.insert(coupons).values([
    { code: 'WELCOME10', type: 'percentage', value: '10.00', minOrderAmount: '100.00', usageLimit: 100, isActive: true },
    { code: 'SAVE50', type: 'fixed', value: '50.00', minOrderAmount: '500.00', usageLimit: 50, isActive: true },
    { code: 'SUMMER25', type: 'percentage', value: '25.00', minOrderAmount: '300.00', usageLimit: 30, isActive: true },
  ]);
  console.log('  ✓ 3 coupons created');

  // ─── SITE SETTINGS ───
  await db.insert(siteSettings).values([
    { key: 'site_name', value: 'سوق مصر' },
    { key: 'default_commission_rate', value: '10.00' },
    { key: 'contact_email', value: 'support@marketplace.com' },
    { key: 'contact_phone', value: '01000000000' },
    { key: 'default_shipping_fee', value: '30.00' },
    { key: 'shipping_fee_per_vendor', value: '30.00' },
    { key: 'min_order_amount', value: '0.00' },
    { key: 'currency', value: 'EGP' },
  ]);
  console.log('  ✓ Site settings created');

  // ─── WISHLISTS (sample) ───
  for (let i = 0; i < 5; i++) {
    const customer = customerUsers[i]!;
    const product = insertedProducts[(i * 7) % insertedProducts.length]!;
    try {
      await db.insert(wishlists).values({ userId: customer.id, productId: product.id });
    } catch { /* skip duplicates */ }
  }
  console.log('  ✓ Sample wishlists created');

  // Refresh materialized view if present
  try {
    await db.execute(sql`REFRESH MATERIALIZED VIEW daily_sales_summary`);
    console.log('  ✓ Refreshed daily_sales_summary materialized view');
  } catch {
    // View may not exist yet if 0010 migration was not applied
  }

  console.log('\n✅ Seed completed successfully!\n');
  console.log('  📧 Admin: admin@marketplace.com / Admin@123456');
  console.log('  📧 Vendor: sony@marketplace.com / Vendor@123456');
  console.log('  📧 Customer: omar@example.com / Customer@123456');
  console.log('');
  console.log('  ⚠️  Change admin password before any real deployment!\n');

  await queryClient.end();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
