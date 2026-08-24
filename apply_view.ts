import { db } from './server/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
  await db.execute(sql`DROP MATERIALIZED VIEW IF EXISTS daily_sales_summary CASCADE;`);
  
  await db.execute(sql`
    CREATE MATERIALIZED VIEW daily_sales_summary AS
    SELECT date_trunc('day', created_at) AS day, vendor_id,
           SUM(total)::numeric AS gross_sales, COUNT(DISTINCT order_id) AS order_count
    FROM order_items 
    WHERE vendor_status = 'delivered'
    GROUP BY 1, 2;
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS daily_sales_summary_day_vendor_idx 
    ON daily_sales_summary(day, vendor_id);
  `);
  
  console.log('Materialized view recreated successfully.');
  process.exit(0);
}

main().catch(console.error);
