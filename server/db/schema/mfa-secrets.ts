import { pgTable, serial, integer, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const mfaSecrets = pgTable('mfa_secrets', {
  userId: integer('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  secretEncrypted: text('secret_encrypted').notNull(),
  enabled: boolean('enabled').notNull().default(false),
  backupCodesHashed: jsonb('backup_codes_hashed').notNull().default('[]'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type MfaSecret = typeof mfaSecrets.$inferSelect;
export type NewMfaSecret = typeof mfaSecrets.$inferInsert;
