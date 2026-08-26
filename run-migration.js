import 'dotenv/config';
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`ALTER TABLE subscription_promotions RENAME COLUMN discount_amount TO discount_percentage`;
    console.log('Renamed discount_amount to discount_percentage');
  } catch (e) {
    console.error('Error renaming discount_amount:', e.message);
  }

  try {
    await sql`ALTER TABLE subscription_promotions RENAME COLUMN duration_type TO duration_days`;
    console.log('Renamed duration_type to duration_days');
  } catch (e) {
    console.error('Error renaming duration_type:', e.message);
  }

  try {
    await sql`ALTER TABLE subscription_promotions ADD COLUMN IF NOT EXISTS created_by integer REFERENCES users(id) DEFAULT 1`;
    console.log('Added created_by column to subscription_promotions');
  } catch (e) {
    console.error('Error adding created_by:', e.message);
  }
  
  process.exit(0);
}

run();
