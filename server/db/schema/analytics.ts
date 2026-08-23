import { pgMaterializedView, timestamp, integer, decimal } from 'drizzle-orm/pg-core';
import { vendors } from './vendors.js';

export const dailySalesSummary = pgMaterializedView('daily_sales_summary', {
  day: timestamp('day', { withTimezone: true }),
  vendorId: integer('vendor_id').references(() => vendors.id),
  grossSales: decimal('gross_sales', { precision: 12, scale: 2 }),
  orderCount: integer('order_count'),
}).existing();

