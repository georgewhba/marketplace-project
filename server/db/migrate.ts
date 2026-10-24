import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env.js';

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  const migrationClient = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(migrationClient);
  
  try {
    // 1. Run standard Drizzle migrations first so all tables (including 0011 subscription_promotions) exist
    await migrate(db, { migrationsFolder: './drizzle' });

    // 2. Apply idempotent schema reconciliation for subscription_promotions (0012)
    await migrationClient`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'subscription_promotions' AND column_name = 'discount_amount'
        ) THEN
          ALTER TABLE subscription_promotions RENAME COLUMN discount_amount TO discount_percentage;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'subscription_promotions' AND column_name = 'duration_type'
        ) THEN
          ALTER TABLE subscription_promotions RENAME COLUMN duration_type TO duration_days;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'subscription_promotions' AND column_name = 'duration_days' AND data_type <> 'integer'
        ) THEN
          ALTER TABLE subscription_promotions
            ALTER COLUMN duration_days TYPE integer
            USING (CASE WHEN duration_days::text = 'day' THEN 1 WHEN duration_days::text = 'week' THEN 7 WHEN duration_days::text = 'month' THEN 30 ELSE 30 END);
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'subscription_promotions'
        ) THEN
          ALTER TABLE subscription_promotions ADD COLUMN IF NOT EXISTS created_by integer REFERENCES users(id) DEFAULT 1;
        END IF;
      END $$;
    `;

    console.log('✅ Migrations completed successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
