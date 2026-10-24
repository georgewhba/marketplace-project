import { db } from './server/db/index.js';
import { products } from './server/db/schema/index.js';
import { eq } from 'drizzle-orm';

(async () => {
  try {
    const allProducts = await db.select().from(products);
    console.log(`Found ${allProducts.length} products`);
    let count = 0;
    for (const p of allProducts) {
      await db.update(products).set({ isFeatured: true, isActive: true }).where(eq(products.id, p.id));
      count++;
    }
    console.log(`Updated ${count} products to be featured.`);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();
