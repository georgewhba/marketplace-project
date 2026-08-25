import { pgTable, serial, varchar, decimal, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { vendors } from './vendors.js';
import { users } from './users.js';
import { payments } from './payments.js';

export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(), // starter | growth | pro
  priceMonthly: decimal('price_monthly', { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).notNull(),
  productLimit: integer('product_limit'), // null = unlimited
  imageLimitPerProduct: integer('image_limit_per_product').notNull(),
  autoShippingEnabled: boolean('auto_shipping_enabled').notNull().default(false),
  advancedAnalytics: boolean('advanced_analytics').notNull().default(false),
  bulkActionsEnabled: boolean('bulk_actions_enabled').notNull().default(false),
  payoutCycleDays: integer('payout_cycle_days').notNull().default(30), // 30 | 14 | 7
  trustBadge: varchar('trust_badge', { length: 30 }), // null | 'verified' | 'featured'
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

export const vendorSubscriptions = pgTable('vendor_subscriptions', {
  id: serial('id').primaryKey(),
  vendorId: integer('vendor_id').notNull().references(() => vendors.id).unique(),
  planId: integer('plan_id').notNull().references(() => subscriptionPlans.id),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active|pending_payment|cancelled|expired
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull().defaultNow(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }), // null for free plan
  autoRenew: boolean('auto_renew').notNull().default(true),
  lastPaymentId: integer('last_payment_id').references(() => payments.id), 
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptionPromotions = pgTable('subscription_promotions', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').notNull().references(() => subscriptionPlans.id),
  discountAmount: decimal('discount_amount', { precision: 6, scale: 2 }).notNull(), // max 100 enforced in logic
  durationType: varchar('duration_type', { length: 10 }).notNull(), // day | week | month
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type VendorSubscription = typeof vendorSubscriptions.$inferSelect;
export type NewVendorSubscription = typeof vendorSubscriptions.$inferInsert;
export type SubscriptionPromotion = typeof subscriptionPromotions.$inferSelect;
export type NewSubscriptionPromotion = typeof subscriptionPromotions.$inferInsert;
