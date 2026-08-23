import { pgTable, serial, integer, decimal, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { vendors } from './vendors.js';
import { settlements } from './settlements.js';
import { users } from './users.js';

export const payoutRequests = pgTable('payout_requests', {
  id: serial('id').primaryKey(),
  vendorId: integer('vendor_id').notNull().references(() => vendors.id),
  settlementId: integer('settlement_id').references(() => settlements.id),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  bankAccountSnapshot: jsonb('bank_account_snapshot'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending|approved|rejected|paid
  adminId: integer('admin_id').references(() => users.id),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('payouts_vendor_idx').on(t.vendorId),
  index('payouts_status_idx').on(t.status),
]);

export type PayoutRequest = typeof payoutRequests.$inferSelect;
export type NewPayoutRequest = typeof payoutRequests.$inferInsert;
