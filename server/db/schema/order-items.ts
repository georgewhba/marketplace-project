import { pgTable, serial, integer, varchar, text, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';
import { products } from './products.js';
import { vendors } from './vendors.js';

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  vendorId: integer('vendor_id').notNull().references(() => vendors.id),
  productName: varchar('product_name', { length: 255 }).notNull(),
  productImage: text('product_image'),
  productSku: varchar('product_sku', { length: 100 }),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  shippingFee: decimal('shipping_fee', { precision: 10, scale: 2 }).notNull().default('0'),
  vendorStatus: varchar('vendor_status', { length: 20 }).notNull().default('pending'),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }),
  commissionAmount: decimal('commission_amount', { precision: 10, scale: 2 }),
  vendorAmount: decimal('vendor_amount', { precision: 10, scale: 2 }),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('order_items_order_idx').on(t.orderId),
  index('order_items_vendor_idx').on(t.vendorId),
  index('order_items_product_idx').on(t.productId),
]);

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
