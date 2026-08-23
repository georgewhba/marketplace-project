import { pgTable, serial, varchar, integer, decimal, timestamp } from 'drizzle-orm/pg-core';

export const commissionRules = pgTable('commission_rules', {
  id: serial('id').primaryKey(),
  scope: varchar('scope', { length: 20 }).notNull(), // global|category|vendor
  targetId: integer('target_id'), // null لو scope=global، وإلا category_id أو vendor_id
  rate: decimal('rate', { precision: 5, scale: 2 }).notNull(),
  priority: integer('priority').notNull().default(0), // الأعلى بيكسب عند التعارض
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull().defaultNow(),
  effectiveTo: timestamp('effective_to', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CommissionRule = typeof commissionRules.$inferSelect;
export type NewCommissionRule = typeof commissionRules.$inferInsert;
