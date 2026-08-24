import { db } from './server/db/index.js';
import { sql } from 'drizzle-orm';
import { getAdminOverview, getFunnel } from './server/services/analytics.service.js';

async function main() {
  console.log('--- Admin Overview API ---');
  const overview = await getAdminOverview(30);
  console.log(JSON.stringify(overview, null, 2));

  console.log('\n--- Admin Overview SQL Manual ---');
  // Manual SQL query for gross sales and orders
  const manualSales: any = await db.execute(sql`
    SELECT 
      SUM(total)::numeric as gross_sales,
      COUNT(DISTINCT order_id) as order_count 
    FROM order_items 
    WHERE created_at >= NOW() - INTERVAL '30 days'
  `);
  console.log('Manual Gross Sales and Orders (order_items):', manualSales[0]);

  // Let's also check daily_sales_summary manually
  const matViewSales: any = await db.execute(sql`
    SELECT 
      SUM(gross_sales)::numeric as gross_sales,
      SUM(order_count)::numeric as order_count 
    FROM daily_sales_summary 
    WHERE day >= NOW() - INTERVAL '30 days'
  `);
  console.log('Manual Gross Sales and Orders (daily_sales_summary):', matViewSales[0]);

  console.log('\n--- Funnel API ---');
  const funnel = await getFunnel();
  console.log(JSON.stringify(funnel, null, 2));

  console.log('\n--- Funnel SQL Manual ---');
  const manualViews: any = await db.execute(sql`SELECT SUM(view_count)::numeric as total_views FROM products`);
  const manualCart: any = await db.execute(sql`SELECT COUNT(*) as in_cart FROM cart_items`);
  const manualOrders: any = await db.execute(sql`SELECT COUNT(*) as ordered FROM order_items`);
  console.log('Manual Funnel:', {
    views: manualViews[0]?.total_views,
    inCart: manualCart[0]?.in_cart,
    ordered: manualOrders[0]?.ordered
  });

  process.exit(0);
}

main().catch(console.error);
