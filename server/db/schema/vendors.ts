import { pgTable, serial, integer, varchar, text, decimal, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const vendors = pgTable('vendors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  storeName: varchar('store_name', { length: 255 }).notNull().unique(),
  storeSlug: varchar('store_slug', { length: 255 }).notNull().unique(),
  storeDescription: text('store_description'),
  storeLogo: text('store_logo'),
  storeBanner: text('store_banner'),
  shippingPolicy: text('shipping_policy'),
  returnPolicy: text('return_policy'),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).notNull().default('10.00'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  rejectionReason: text('rejection_reason'),
  totalSales: decimal('total_sales', { precision: 12, scale: 2 }).notNull().default('0'),
  totalProducts: integer('total_products').notNull().default(0),
  rating: decimal('rating', { precision: 3, scale: 2 }).notNull().default('0'),
  reviewCount: integer('review_count').notNull().default(0),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('vendors_status_idx').on(t.status),
  index('vendors_slug_idx').on(t.storeSlug),
  index('vendors_user_idx').on(t.userId),
]);

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
