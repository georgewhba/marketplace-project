import { pgTable, serial, integer, varchar, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';
import { vendors } from './vendors.js';

export const shipments = pgTable('shipments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  vendorId: integer('vendor_id').notNull().references(() => vendors.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 30 }).notNull().default('manual'), // bosta|manual
  providerShipmentId: varchar('provider_shipment_id', { length: 255 }),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  status: varchar('status', { length: 30 }).notNull().default('created'),
  cost: decimal('cost', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ 
  orderIdx: index('shipments_order_idx').on(t.orderId),
  trackingIdx: index('shipments_tracking_idx').on(t.trackingNumber),
}));
