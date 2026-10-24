import { db } from '../db/index.js';
import { sql, eq, and, desc, gte, count } from 'drizzle-orm';
import { 
  orderItems, products, vendors, users, categories, cartItems 
} from '../db/schema/index.js';
import { dailySalesSummary } from '../db/schema/analytics.js';

function sanitizeDays(days: unknown): number {
  const num = Number(days);
  return Math.max(1, Math.min(365, Number.isFinite(num) ? Math.floor(num) : 30));
}

/**
 * Helper to calculate percentage change
 */
function calculateChange(current: number | string, previous: number | string) {
  const curr = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Number((((curr - prev) / prev) * 100).toFixed(2));
}

/**
 * ADMIN ANALYTICS
 */

export async function getAdminOverview(days: number = 30) {
  const safeDays = sanitizeDays(days);
  // We use PostgreSQL interval to get dates
  const currentPeriodStart = sql`NOW() - INTERVAL '${sql.raw(safeDays.toString())} days'`;
  const previousPeriodStart = sql`NOW() - INTERVAL '${sql.raw((safeDays * 2).toString())} days'`;

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

  const currSales = Number(currentMetrics[0]?.totalSales ?? 0);
  const prevSales = Number(previousMetrics[0]?.totalSales ?? 0);
  const currOrders = Number(currentMetrics[0]?.totalOrders ?? 0);
  const prevOrders = Number(previousMetrics[0]?.totalOrders ?? 0);
  const currCustomers = Number(currentCustomers[0]?.count ?? 0);
  const prevCustomers = Number(previousCustomers[0]?.count ?? 0);

  return {
    metrics: {
      sales: currSales,
      salesChange: calculateChange(currSales, prevSales),
      orders: currOrders,
      ordersChange: calculateChange(currOrders, prevOrders),
      newCustomers: currCustomers,
      customersChange: calculateChange(currCustomers, prevCustomers),
    },
    dailyBreakdown
  };
}

export async function getTopProducts(days: number = 30) {
  const safeDays = sanitizeDays(days);
  const periodStart = sql`NOW() - INTERVAL '${sql.raw(safeDays.toString())} days'`;

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
    .where(and(gte(orderItems.createdAt, periodStart), eq(orderItems.vendorStatus, 'delivered')))
    .groupBy(products.id)
    .orderBy(desc(sql`SUM(${orderItems.total})`))
    .limit(10);
}

export async function getTopVendors(days: number = 30) {
  const safeDays = sanitizeDays(days);
  const periodStart = sql`NOW() - INTERVAL '${sql.raw(safeDays.toString())} days'`;

  return await db
    .select({
      id: vendors.id,
      storeName: vendors.storeName,
      totalRevenue: sql<number>`SUM(${orderItems.total})::numeric`,
      totalOrders: sql<number>`COUNT(DISTINCT ${orderItems.orderId})::numeric`
    })
    .from(orderItems)
    .innerJoin(vendors, eq(orderItems.vendorId, vendors.id))
    .where(and(gte(orderItems.createdAt, periodStart), eq(orderItems.vendorStatus, 'delivered')))
    .groupBy(vendors.id)
    .orderBy(desc(sql`SUM(${orderItems.total})`))
    .limit(10);
}

export async function getFunnel() {
  // Total Views across all products
  const viewsResult = await db.select({ totalViews: sql<number>`COALESCE(SUM(${products.viewCount}), 0)::numeric` }).from(products);
  const totalViews = Number(viewsResult[0]?.totalViews ?? 0);

  // Items currently in cart (note: this is a snapshot, not a historical event log, but required by specs without new events table)
  const cartAddsResult = await db.select({ count: count() }).from(cartItems);
  const totalInCart = Number(cartAddsResult[0]?.count ?? 0);

  // Total order items ever created (unique orders)
  const ordersResult = await db.select({ count: sql<number>`COUNT(DISTINCT ${orderItems.orderId})::numeric` }).from(orderItems);
  const totalOrders = Number(ordersResult[0]?.count ?? 0);

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
    .leftJoin(orderItems, and(eq(products.id, orderItems.productId), eq(orderItems.vendorStatus, 'delivered')))
    .groupBy(categories.id)
    .orderBy(desc(sql`COALESCE(SUM(${orderItems.total}), 0)`));
}


/**
 * VENDOR ANALYTICS
 */

export async function getVendorOverview(vendorId: number, days: number = 30) {
  const safeDays = sanitizeDays(days);
  const currentPeriodStart = sql`NOW() - INTERVAL '${sql.raw(safeDays.toString())} days'`;
  const previousPeriodStart = sql`NOW() - INTERVAL '${sql.raw((safeDays * 2).toString())} days'`;

  const currentMetrics = await db
    .select({
      totalSales: sql<number>`COALESCE(SUM(${orderItems.total}), 0)::numeric`,
      totalOrders: sql<number>`COUNT(DISTINCT ${orderItems.orderId})::numeric`,
    })
    .from(orderItems)
    .where(and(eq(orderItems.vendorId, vendorId), eq(orderItems.vendorStatus, 'delivered'), gte(orderItems.createdAt, currentPeriodStart)));

  const previousMetrics = await db
    .select({
      totalSales: sql<number>`COALESCE(SUM(${orderItems.total}), 0)::numeric`,
      totalOrders: sql<number>`COUNT(DISTINCT ${orderItems.orderId})::numeric`,
    })
    .from(orderItems)
    .where(and(
      eq(orderItems.vendorId, vendorId), 
      eq(orderItems.vendorStatus, 'delivered'),
      gte(orderItems.createdAt, previousPeriodStart),
      sql`${orderItems.createdAt} < ${currentPeriodStart}`
    ));

  const sales = Number(currentMetrics[0]?.totalSales ?? 0);
  const prevSales = Number(previousMetrics[0]?.totalSales ?? 0);
  const orders = Number(currentMetrics[0]?.totalOrders ?? 0);
  const prevOrders = Number(previousMetrics[0]?.totalOrders ?? 0);
  const aov = orders > 0 ? Number((sales / orders).toFixed(2)) : 0;

  // Daily breakdown
  const dailyBreakdown = await db
    .select({
      date: sql<Date>`date_trunc('day', ${orderItems.createdAt})`,
      sales: sql<number>`SUM(${orderItems.total})::numeric`,
      orders: sql<number>`COUNT(DISTINCT ${orderItems.orderId})::numeric`,
    })
    .from(orderItems)
    .where(and(eq(orderItems.vendorId, vendorId), eq(orderItems.vendorStatus, 'delivered'), gte(orderItems.createdAt, currentPeriodStart)))
    .groupBy(sql`date_trunc('day', ${orderItems.createdAt})`)
    .orderBy(sql`date_trunc('day', ${orderItems.createdAt})`);

  return {
    metrics: {
      sales,
      salesChange: calculateChange(sales, prevSales),
      orders,
      ordersChange: calculateChange(orders, prevOrders),
      aov
    },
    dailyBreakdown
  };
}

export async function getVendorProducts(vendorId: number, days: number = 30) {
  const safeDays = sanitizeDays(days);
  const periodStart = sql`NOW() - INTERVAL '${sql.raw(safeDays.toString())} days'`;

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
      eq(orderItems.vendorStatus, 'delivered'),
      gte(orderItems.createdAt, periodStart)
    ))
    .where(eq(products.vendorId, vendorId))
    .groupBy(products.id)
    .orderBy(desc(sql`COALESCE(SUM(${orderItems.total}), 0)`));
}
