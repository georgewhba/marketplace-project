import { pgTable, serial, integer, varchar, text, decimal, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { vendors } from './vendors.js';
import { categories } from './categories.js';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  vendorId: integer('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  comparePrice: decimal('compare_price', { precision: 10, scale: 2 }),
  sku: varchar('sku', { length: 100 }),
  stock: integer('stock').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
  isActive: boolean('is_active').notNull().default(true),
  isFeatured: boolean('is_featured').notNull().default(false),
  rating: decimal('rating', { precision: 3, scale: 2 }).notNull().default('0'),
  reviewCount: integer('review_count').notNull().default(0),
  totalSold: integer('total_sold').notNull().default(0),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('products_vendor_idx').on(t.vendorId),
  index('products_category_idx').on(t.categoryId),
  index('products_slug_idx').on(t.slug),
  index('products_featured_idx').on(t.isFeatured),
  index('products_active_idx').on(t.isActive),
]);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
