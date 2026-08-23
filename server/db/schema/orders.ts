import { pgTable, serial, integer, varchar, text, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: varchar('order_number', { length: 30 }).notNull().unique(),
  customerId: integer('customer_id').notNull().references(() => users.id),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  shippingFee: decimal('shipping_fee', { precision: 10, scale: 2 }).notNull().default('0'),
  discount: decimal('discount', { precision: 10, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  couponCode: varchar('coupon_code', { length: 50 }),
  shippingName: varchar('shipping_name', { length: 255 }).notNull(),
  shippingPhone: varchar('shipping_phone', { length: 20 }).notNull(),
  shippingAddressLine1: text('shipping_address_line1').notNull(),
  shippingAddressLine2: text('shipping_address_line2'),
  shippingCity: varchar('shipping_city', { length: 100 }).notNull(),
  shippingState: varchar('shipping_state', { length: 100 }),
  shippingCountry: varchar('shipping_country', { length: 100 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull().default('cash_on_delivery'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('orders_customer_idx').on(t.customerId),
  index('orders_status_idx').on(t.status),
  index('orders_order_number_idx').on(t.orderNumber),
]);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
