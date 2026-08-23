import { pgTable, serial, integer, varchar, text, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { products } from './products.js';
import { users } from './users.js';
import { orderItems } from './order-items.js';

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  customerId: integer('customer_id').notNull().references(() => users.id),
  orderItemId: integer('order_item_id').notNull().references(() => orderItems.id),
  rating: integer('rating').notNull(),
  title: varchar('title', { length: 255 }),
  comment: text('comment'),
  isVerifiedPurchase: boolean('is_verified_purchase').notNull().default(true),
  isVisible: boolean('is_visible').notNull().default(true),
  vendorReply: text('vendor_reply'),
  vendorRepliedAt: timestamp('vendor_replied_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('reviews_unique').on(t.customerId, t.orderItemId),
  index('reviews_product_idx').on(t.productId),
]);

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
