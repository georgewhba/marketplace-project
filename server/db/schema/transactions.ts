import { pgTable, serial, integer, varchar, text, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { vendors } from './vendors.js';
import { orderItems } from './order-items.js';

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  vendorId: integer('vendor_id').notNull().references(() => vendors.id),
  orderItemId: integer('order_item_id').references(() => orderItems.id),
  settlementId: integer('settlement_id'),
  type: varchar('type', { length: 20 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal('balance_before', { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 12, scale: 2 }).notNull(),
  description: text('description'),
  referenceId: varchar('reference_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('transactions_vendor_idx').on(t.vendorId),
  index('transactions_type_idx').on(t.type),
]);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
