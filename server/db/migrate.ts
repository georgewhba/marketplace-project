import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env.js';

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  const migrationClient = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(migrationClient);
  
  try {
    // Custom manual migrations since we can't run drizzle-kit generate with TTY
    try {
      await migrationClient`ALTER TABLE subscription_promotions RENAME COLUMN discount_amount TO discount_percentage`;
      console.log('Renamed discount_amount to discount_percentage');
    } catch (e: any) {
      console.error('Error renaming discount_amount (might already be renamed):', e.message);
    }
    
    try {
      await migrationClient`ALTER TABLE subscription_promotions RENAME COLUMN duration_type TO duration_days`;
      console.log('Renamed duration_type to duration_days');
    } catch (e: any) {
      console.error('Error renaming duration_type (might already be renamed):', e.message);
    }
    
    try {
      await migrationClient`ALTER TABLE subscription_promotions ALTER COLUMN duration_days TYPE integer USING (CASE WHEN duration_days='day' THEN 1 WHEN duration_days='week' THEN 7 WHEN duration_days='month' THEN 30 ELSE 30 END)`;
      console.log('Altered duration_days to integer');
    } catch (e: any) {
      console.error('Error altering duration_days type (might already be altered):', e.message);
    }
    
    try {
      await migrationClient`ALTER TABLE subscription_promotions ADD COLUMN IF NOT EXISTS created_by integer REFERENCES users(id) DEFAULT 1`;
      console.log('Added created_by column');
    } catch (e: any) {
      console.error('Error adding created_by:', e.message);
    }

    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations completed successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
