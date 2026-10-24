import { db } from './server/db/index.js';
import { sql } from 'drizzle-orm';
import { getAdminOverview, getVendorOverview } from './server/services/analytics.service.js';

async function runDetailedCheck() {
  // Read-only diagnostic check (never mutate order_items!)
  const adminApi = await getAdminOverview(30);

  const adminManual: any = await db.execute(sql`
    SELECT 
      COALESCE(SUM(total), 0)::numeric as sales,
      COUNT(DISTINCT order_id) as orders
    FROM order_items 
    WHERE created_at >= NOW() - INTERVAL '30 days'
  `);

  const adminCorrected: any = await db.execute(sql`
    SELECT 
      COALESCE(SUM(total), 0)::numeric as sales,
      COUNT(DISTINCT order_id) as orders
    FROM order_items 
    WHERE created_at >= NOW() - INTERVAL '30 days' 
    AND vendor_status = 'delivered'
  `);

  const vendor1Api = await getVendorOverview(1, 30);

  const vendor1Manual: any = await db.execute(sql`
    SELECT 
      COALESCE(SUM(total), 0)::numeric as sales,
      COUNT(DISTINCT order_id) as orders
    FROM order_items 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    AND vendor_id = 1
  `);

  const vendor1Corrected: any = await db.execute(sql`
    SELECT 
      COALESCE(SUM(total), 0)::numeric as sales,
      COUNT(DISTINCT order_id) as orders
    FROM order_items 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    AND vendor_id = 1
    AND vendor_status = 'delivered'
  `);

  console.log('--- ADMIN METRICS COMPARISON ---');
  console.log('API Result:', adminApi.metrics.sales, 'Sales |', adminApi.metrics.orders, 'Orders');
  console.log('Manual Raw:', adminManual[0]?.sales, 'Sales |', adminManual[0]?.orders, 'Orders');
  console.log('Corrected (Delivered):', adminCorrected[0]?.sales, 'Sales |', adminCorrected[0]?.orders, 'Orders');

  console.log('\n--- VENDOR 1 METRICS COMPARISON ---');
  console.log('API Result:', vendor1Api.metrics.sales, 'Sales |', vendor1Api.metrics.orders, 'Orders');
  console.log('Manual Raw:', vendor1Manual[0]?.sales, 'Sales |', vendor1Manual[0]?.orders, 'Orders');
  console.log('Corrected (Delivered):', vendor1Corrected[0]?.sales, 'Sales |', vendor1Corrected[0]?.orders, 'Orders');

  process.exit(0);
}

runDetailedCheck().catch(console.error);
