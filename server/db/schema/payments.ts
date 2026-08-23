import { pgTable, serial, integer, varchar, decimal, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id),
  provider: varchar('provider', { length: 30 }).notNull(), // paymob|fawry|cash_on_delivery
  providerTransactionId: varchar('provider_transaction_id', { length: 255 }),
  method: varchar('method', { length: 30 }).notNull(), // card|wallet|fawry_ref|cod
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending|succeeded|failed|refunded|partially_refunded
  rawResponse: jsonb('raw_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('payments_order_idx').on(t.orderId), 
  index('payments_status_idx').on(t.status)
]);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
