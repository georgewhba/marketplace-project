import 'dotenv/config';
import { db } from './server/db/index.js';
import { products, productImages, categories, vendors } from './server/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { slugify } from './server/utils/slugify.js';
import fs from 'fs';
import path from 'path';

(async () => {
  try {
    // 1. Get the vendor
    const vendorList = await db.select().from(vendors).where(eq(vendors.storeSlug, 'george-wahba')); // Or whatever slug it is, wait, we know user id or just grab first vendor
    let vendor = vendorList[0];
    if (!vendor) {
        const all = await db.select().from(vendors);
        vendor = all[0];
    }
    
    // 2. Get categories
    const allCats = await db.select().from(categories);
    let electronicsCat = allCats.find(c => c.name.includes('إلكترونيات') || c.slug.includes('electronics'));
    
    if (!electronicsCat) {
        const [c] = await db.insert(categories).values({
            name: 'إلكترونيات',
            slug: 'electronics',
            description: 'أجهزة إلكترونية وهواتف',
            icon: 'Monitor',
            isActive: true,
            sortOrder: 1
        }).returning();
        electronicsCat = c;
    }

    const productsData = [
        {
            name: 'Apple iPhone 15 Pro Max',
            slug: 'iphone-15-pro-max',
            description: 'أحدث هاتف من آبل بتصميم من التيتانيوم وكاميرا احترافية بدقة 48 ميجابكسل وأداء خارق مع معالج A17 Pro.',
            price: '55000',
            comparePrice: '60000',
            stock: 15,
            isActive: true,
            isFeatured: true,
            categoryId: electronicsCat.id,
            vendorId: vendor.id,
            rating: '4.9',
            reviewCount: 120,
            totalSold: 45
        },
        {
            name: 'Sony PlayStation 5 Console',
            slug: 'sony-playstation-5',
            description: 'جهاز الألعاب الأقوى من سوني بإصدار الأقراص، استمتع بألعاب الجيل الجديد برسومات فائقة الدقة وسرعة تحميل لا مثيل لها.',
            price: '28000',
            comparePrice: '32000',
            stock: 8,
            isActive: true,
            isFeatured: true,
            categoryId: electronicsCat.id,
            vendorId: vendor.id,
            rating: '4.8',
            reviewCount: 85,
            totalSold: 30
        },
        {
            name: 'MacBook Pro 14-inch M3',
            slug: 'macbook-pro-m3',
            description: 'لابتوب احترافي من آبل بشريحة M3، شاشة Liquid Retina XDR، أداء مذهل للمونتاج والبرمجة ببطارية تدوم طويلاً.',
            price: '85000',
            comparePrice: '92000',
            stock: 5,
            isActive: true,
            isFeatured: true,
            categoryId: electronicsCat.id,
            vendorId: vendor.id,
            rating: '4.9',
            reviewCount: 40,
            totalSold: 12
        },
        {
            name: 'Samsung Galaxy Watch 6',
            slug: 'samsung-galaxy-watch-6',
            description: 'ساعة ذكية متقدمة لتتبع اللياقة البدنية والصحة، شاشة AMOLED، وقياس دقيق لنبضات القلب والنوم.',
            price: '8500',
            comparePrice: '10000',
            stock: 25,
            isActive: true,
            isFeatured: true,
            categoryId: electronicsCat.id,
            vendorId: vendor.id,
            rating: '4.6',
            reviewCount: 56,
            totalSold: 78
        },
        {
            name: 'Sony WH-1000XM5 Headphones',
            slug: 'sony-headphones-xm5',
            description: 'سماعات رأس عازلة للضوضاء الأفضل في فئتها، صوت عالي الجودة، بطارية تدوم 30 ساعة ومريحة للاستخدام الطويل.',
            price: '12000',
            comparePrice: '14500',
            stock: 12,
            isActive: true,
            isFeatured: true,
            categoryId: electronicsCat.id,
            vendorId: vendor.id,
            rating: '4.7',
            reviewCount: 92,
            totalSold: 60
        }
    ];

    const imageMap = {
        'iphone-15-pro-max': 'product_smartphone_1787851883646.jpg',
        'sony-playstation-5': 'product_console_1787851895260.jpg',
        'macbook-pro-m3': 'product_laptop_1787849478262.jpg',
        'samsung-galaxy-watch-6': 'product_smartwatch_1787851856395.jpg',
        'sony-headphones-xm5': 'product_headphones_1787851845432.jpg'
    };

    console.log('Inserting products...');
    for (const pData of productsData) {
        // Check if exists
        const existing = await db.select().from(products).where(eq(products.slug, pData.slug));
        let insertedId;
        if (existing.length === 0) {
            const [inserted] = await db.insert(products).values(pData).returning();
            insertedId = inserted.id;
            console.log(`Inserted ${pData.name}`);
        } else {
            insertedId = existing[0].id;
            await db.update(products).set(pData).where(eq(products.id, insertedId));
            console.log(`Updated ${pData.name}`);
        }

        // Handle Images
        const imgName = imageMap[pData.slug];
        if (imgName) {
            // we will pretend the image is uploaded by just copying it to uploads folder
            // ensure uploads folder exists
            const destFolder = path.join(process.cwd(), 'uploads');
            if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
            
            // source is from artifacts if available, or we just put the url as is if served differently
            // wait, in the server, images are served from /uploads
            // I'll copy from artifacts to uploads if possible, but actually we can just put the absolute path?
            // No, the frontend expects `/uploads/filename.jpg`
            // Let's set the image path in DB to `/uploads/${imgName}`
            
            // Delete existing images for this product
            await db.delete(productImages).where(eq(productImages.productId, insertedId));
            
            await db.insert(productImages).values({
                productId: insertedId,
                imageUrl: `/uploads/${imgName}`,
                sortOrder: 0
            });
            console.log(`Linked image ${imgName} to ${pData.name}`);
        }
    }

    console.log('Seed completed successfully!');

  } catch(e) {
      console.error('Seed error:', e);
  } finally {
      process.exit(0);
  }
})();
