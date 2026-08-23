import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { shipments } from './shipments';

export const shipmentEvents = pgTable('shipment_events', {
  id: serial('id').primaryKey(),
  shipmentId: integer('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 30 }).notNull(),
  description: text('description'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
});
