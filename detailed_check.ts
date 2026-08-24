import { db } from './server/db/index.js';
import { sql, eq } from 'drizzle-orm';
import { getAdminOverview, getFunnel, getVendorOverview } from './server/services/analytics.service.js';
import { orderItems } from './server/db/schema/order-items.js';

async function runDetailedCheck() {
  // First, insert some fake data to make sure delivered/pending have different numbers
  await db.update(orderItems).set({ vendorStatus: 'cancelled' }).where(eq(orderItems.id, 1));
  await db.update(orderItems).set({ vendorStatus: 'delivered' }).where(eq(orderItems.id, 2));

  // Admin Overview API
  const adminApi = await getAdminOverview(30);

  // Admin Manual Raw
  const adminManual: any = await db.execute(sql`
    SELECT 
      SUM(total)::numeric as sales,
      COUNT(DISTINCT order_id) as orders
    FROM order_items 
    WHERE created_at >= NOW() - INTERVAL '30 days'
  `);

  // Admin Manual Corrected (Delivered)
  const adminCorrected: any = await db.execute(sql`
    SELECT 
      SUM(total)::numeric as sales,
      COUNT(DISTINCT order_id) as orders
    FROM order_items 
    WHERE created_at >= NOW() - INTERVAL '30 days' 
    AND vendor_status = 'delivered'
  `);

  // Vendor 1 Overview API
  const vendor1Api = await getVendorOverview(1, 30);

  // Vendor 1 Manual Raw
  const vendor1Manual: any = await db.execute(sql`
    SELECT 
      SUM(total)::numeric as sales,
      COUNT(DISTINCT order_id) as orders
    FROM order_items 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    AND vendor_id = 1
  `);

  // Vendor 1 Manual Corrected
  const vendor1Corrected: any = await db.execute(sql`
    SELECT 
      SUM(total)::numeric as sales,
      COUNT(DISTINCT order_id) as orders
    FROM order_items 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    AND vendor_id = 1
    AND vendor_status = 'delivered'
  `);

  // Output formatting
  console.log('--- ADMIN METRICS COMPARISON ---');
  console.log('API Result:', adminApi.metrics.sales, 'Sales |', adminApi.metrics.orders, 'Orders');
  console.log('Manual Raw:', adminManual[0].sales, 'Sales |', adminManual[0].orders, 'Orders');
  console.log('Corrected (Delivered):', adminCorrected[0].sales, 'Sales |', adminCorrected[0].orders, 'Orders');

  console.log('\n--- VENDOR 1 METRICS COMPARISON ---');
  console.log('API Result:', vendor1Api.metrics.sales, 'Sales |', vendor1Api.metrics.orders, 'Orders');
  console.log('Manual Raw:', vendor1Manual[0].sales, 'Sales |', vendor1Manual[0].orders, 'Orders');
  console.log('Corrected (Delivered):', vendor1Corrected[0].sales, 'Sales |', vendor1Corrected[0].orders, 'Orders');
  
  process.exit(0);
}

runDetailedCheck().catch(console.error);
