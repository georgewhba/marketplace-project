import { db } from '../db/index.js';
import { sql, eq, and, desc, gte, sum, count, avg } from 'drizzle-orm';
import { 
  orderItems, products, vendors, users, categories, cartItems 
} from '../db/schema/index.js';
import { dailySalesSummary } from '../db/schema/analytics.js';

/**
 * Helper to calculate percentage change
 */
function calculateChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

/**
 * ADMIN ANALYTICS
 */

export async function getAdminOverview(days: number = 30) {
  // We use PostgreSQL interval to get dates
  const currentPeriodStart = sql`NOW() - INTERVAL '${sql.raw(days.toString())} days'`;
  const previousPeriodStart = sql`NOW() - INTERVAL '${sql.raw((days * 2).toString())} days'`;

  // Get current metrics using daily_sales_summary if possible, or orderItems
  const currentMetrics = await db
    .select({
      totalSales: sql<number>`COALESCE(SUM(${dailySalesSummary.grossSales}), 0)::numeric`,
      totalOrders: sql<number>`COALESCE(SUM(${dailySalesSummary.orderCount}), 0)::numeric`,
    })
    .from(dailySalesSummary)
    .where(gte(dailySalesSummary.day, currentPeriodStart));

  const previousMetrics = await db
    .select({
      totalSales: sql<number>`COALESCE(SUM(${dailySalesSummary.grossSales}), 0)::numeric`,
      totalOrders: sql<number>`COALESCE(SUM(${dailySalesSummary.orderCount}), 0)::numeric`,
    })
    .from(dailySalesSummary)
    .where(and(
      gte(dailySalesSummary.day, previousPeriodStart),
      sql`${dailySalesSummary.day} < ${currentPeriodStart}`
    ));

  // New customers
  const currentCustomers = await db
    .select({ count: count() })
    .from(users)
    .where(and(eq(users.role, 'customer'), gte(users.createdAt, currentPeriodStart)));
  
  const previousCustomers = await db
    .select({ count: count() })
    .from(users)
    .where(and(
      eq(users.role, 'customer'), 
      gte(users.createdAt, previousPeriodStart),
      sql`${users.createdAt} < ${currentPeriodStart}`
    ));

  // Daily breakdown for the chart (current period)
  const dailyBreakdown = await db
    .select({
      date: dailySalesSummary.day,
      sales: sql<number>`SUM(${dailySalesSummary.grossSales})::numeric`,
      orders: sql<number>`SUM(${dailySalesSummary.orderCount})::numeric`,
    })
    .from(dailySalesSummary)
    .where(gte(dailySalesSummary.day, currentPeriodStart))
    .groupBy(dailySalesSummary.day)
    .orderBy(dailySalesSummary.day);

  return {
    metrics: {
      sales: currentMetrics[0]?.totalSales || 0,
      salesChange: calculateChange(currentMetrics[0]?.totalSales || 0, previousMetrics[0]?.totalSales || 0),
      orders: currentMetrics[0]?.totalOrders || 0,
      ordersChange: calculateChange(currentMetrics[0]?.totalOrders || 0, previousMetrics[0]?.totalOrders || 0),
      newCustomers: currentCustomers[0]?.count || 0,
      customersChange: calculateChange(currentCustomers[0]?.count || 0, previousCustomers[0]?.count || 0),
    },
    dailyBreakdown
  };
}

export async function getTopProducts(days: number = 30) {
  const periodStart = sql`NOW() - INTERVAL '${sql.raw(days.toString())} days'`;

  return await db
    .select({
      id: products.id,
      name: products.name,
      totalRevenue: sql<number>`SUM(${orderItems.total})::numeric`,
      totalSold: sql<number>`SUM(${orderItems.quantity})::numeric`,
      rating: products.rating
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(gte(orderItems.createdAt, periodStart))
    .groupBy(products.id)
    .orderBy(desc(sql`SUM(${orderItems.total})`))
    .limit(10);
}

export async function getTopVendors(days: number = 30) {
  const periodStart = sql`NOW() - INTERVAL '${sql.raw(days.toString())} days'`;

  return await db
    .select({
      id: vendors.id,
      storeName: vendors.storeName,
      totalRevenue: sql<number>`SUM(${orderItems.total})::numeric`,
      totalOrders: sql<number>`COUNT(DISTINCT ${orderItems.orderId})::numeric`
    })
    .from(orderItems)
    .innerJoin(vendors, eq(orderItems.vendorId, vendors.id))
    .where(gte(orderItems.createdAt, periodStart))
    .groupBy(vendors.id)
    .orderBy(desc(sql`SUM(${orderItems.total})`))
    .limit(10);
}

export async function getFunnel() {
  // Total Views across all products
  const viewsResult = await db.select({ totalViews: sql<number>`COALESCE(SUM(${products.viewCount}), 0)::numeric` }).from(products);
  const totalViews = viewsResult[0]?.totalViews || 0;

  // Items currently in cart (note: this is a snapshot, not a historical event log, but required by specs without new events table)
  const cartAddsResult = await db.select({ count: count() }).from(cartItems);
  const totalInCart = cartAddsResult[0]?.count || 0;

  // Total order items ever created
  const ordersResult = await db.select({ count: count() }).from(orderItems);
  const totalOrders = ordersResult[0]?.count || 0;

  return {
    views: totalViews,
    inCart: totalInCart,
    ordered: totalOrders,
    // Simplistic conversion rates
    cartConversion: totalViews > 0 ? Number(((totalInCart / totalViews) * 100).toFixed(2)) : 0,
    orderConversion: totalViews > 0 ? Number(((totalOrders / totalViews) * 100).toFixed(2)) : 0
  };
}

export async function getCategoriesAnalytics() {
  return await db
    .select({
      id: categories.id,
      name: categories.name,
      activeProducts: sql<number>`COUNT(DISTINCT CASE WHEN ${products.isActive} = true THEN ${products.id} ELSE NULL END)::numeric`,
      totalSales: sql<number>`COALESCE(SUM(${orderItems.total}), 0)::numeric`,
      avgRating: sql<number>`COALESCE(AVG(${products.rating}), 0)::numeric`
    })
    .from(categories)
    .leftJoin(products, eq(categories.id, products.categoryId))
    .leftJoin(orderItems, eq(products.id, orderItems.productId))
    .groupBy(categories.id)
    .orderBy(desc(sql`COALESCE(SUM(${orderItems.total}), 0)`));
}


/**
 * VENDOR ANALYTICS
 */

export async function getVendorOverview(vendorId: number, days: number = 30) {
  const currentPeriodStart = sql`NOW() - INTERVAL '${sql.raw(days.toString())} days'`;
  const previousPeriodStart = sql`NOW() - INTERVAL '${sql.raw((days * 2).toString())} days'`;

  const currentMetrics = await db
    .select({
      totalSales: sql<number>`COALESCE(SUM(${orderItems.total}), 0)::numeric`,
      totalOrders: sql<number>`COUNT(DISTINCT ${orderItems.orderId})::numeric`,
    })
    .from(orderItems)
    .where(and(eq(orderItems.vendorId, vendorId), gte(orderItems.createdAt, currentPeriodStart)));

  const previousMetrics = await db
    .select({
      totalSales: sql<number>`COALESCE(SUM(${orderItems.total}), 0)::numeric`,
      totalOrders: sql<number>`COUNT(DISTINCT ${orderItems.orderId})::numeric`,
    })
    .from(orderItems)
    .where(and(
      eq(orderItems.vendorId, vendorId), 
      gte(orderItems.createdAt, previousPeriodStart),
      sql`${orderItems.createdAt} < ${currentPeriodStart}`
    ));

  const sales = currentMetrics[0]?.totalSales || 0;
  const orders = currentMetrics[0]?.totalOrders || 0;
  const aov = orders > 0 ? Number((sales / orders).toFixed(2)) : 0;

  // Daily breakdown
  const dailyBreakdown = await db
    .select({
      date: sql<Date>`date_trunc('day', ${orderItems.createdAt})`,
      sales: sql<number>`SUM(${orderItems.total})::numeric`,
      orders: sql<number>`COUNT(DISTINCT ${orderItems.orderId})::numeric`,
    })
    .from(orderItems)
    .where(and(eq(orderItems.vendorId, vendorId), gte(orderItems.createdAt, currentPeriodStart)))
    .groupBy(sql`date_trunc('day', ${orderItems.createdAt})`)
    .orderBy(sql`date_trunc('day', ${orderItems.createdAt})`);

  return {
    metrics: {
      sales,
      salesChange: calculateChange(sales, previousMetrics[0]?.totalSales || 0),
      orders,
      ordersChange: calculateChange(orders, previousMetrics[0]?.totalOrders || 0),
      aov
    },
    dailyBreakdown
  };
}

export async function getVendorProducts(vendorId: number, days: number = 30) {
  const periodStart = sql`NOW() - INTERVAL '${sql.raw(days.toString())} days'`;

  return await db
    .select({
      id: products.id,
      name: products.name,
      views: products.viewCount,
      rating: products.rating,
      totalSold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)::numeric`,
      revenue: sql<number>`COALESCE(SUM(${orderItems.total}), 0)::numeric`
    })
    .from(products)
    .leftJoin(orderItems, and(
      eq(products.id, orderItems.productId),
      gte(orderItems.createdAt, periodStart)
    ))
    .where(eq(products.vendorId, vendorId))
    .groupBy(products.id)
    .orderBy(desc(sql`COALESCE(SUM(${orderItems.total}), 0)`));
}
