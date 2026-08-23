import { pgTable, serial, varchar, integer, boolean, timestamp, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';

export const notificationPreferences = pgTable('notification_preferences', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 50 }).notNull(), // order_updates, promotions, stock_alerts, etc.
  channel: varchar('channel', { length: 20 }).notNull(), // email | sms | in_app
  enabled: boolean('enabled').notNull().default(true),
}, (t) => ({ pk: uniqueIndex('notif_pref_pk').on(t.userId, t.category, t.channel) }));

export const messageLogs = pgTable('message_logs', {
  id: serial('id').primaryKey(),
  channel: varchar('channel', { length: 10 }).notNull(), // email | sms
  recipient: varchar('recipient', { length: 255 }).notNull(),
  templateKey: varchar('template_key', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull(), // sent | failed | queued
  providerMessageId: varchar('provider_message_id', { length: 255 }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
