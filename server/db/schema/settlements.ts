import { pgTable, serial, integer, decimal, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { vendors } from './vendors.js';

export const settlements = pgTable('settlements', {
  id: serial('id').primaryKey(),
  vendorId: integer('vendor_id').notNull().references(() => vendors.id),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  grossSales: decimal('gross_sales', { precision: 12, scale: 2 }).notNull(),
  totalCommission: decimal('total_commission', { precision: 12, scale: 2 }).notNull(),
  netPayable: decimal('net_payable', { precision: 12, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft|finalized|paid
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('settlements_vendor_idx').on(t.vendorId),
  index('settlements_status_idx').on(t.status),
]);

export type Settlement = typeof settlements.$inferSelect;
export type NewSettlement = typeof settlements.$inferInsert;
