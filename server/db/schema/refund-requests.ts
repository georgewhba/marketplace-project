import { pgTable, serial, integer, text, decimal, timestamp, varchar, index } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';
import { orderItems } from './order-items.js';
import { users } from './users.js';

export const refundRequests = pgTable('refund_requests', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id),
  orderItemId: integer('order_item_id').references(() => orderItems.id),
  customerId: integer('customer_id').notNull().references(() => users.id),
  reason: text('reason').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending|approved|rejected|completed
  adminId: integer('admin_id').references(() => users.id),
  adminNote: text('admin_note'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('refunds_order_idx').on(t.orderId),
  index('refunds_customer_idx').on(t.customerId),
]);

export type RefundRequest = typeof refundRequests.$inferSelect;
export type NewRefundRequest = typeof refundRequests.$inferInsert;
