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
    await sql`ALTER TABLE subscription_promotions ALTER COLUMN duration_days TYPE integer USING (CASE WHEN duration_days='day' THEN 1 WHEN duration_days='week' THEN 7 WHEN duration_days='month' THEN 30 ELSE 30 END)`;
    console.log('Altered duration_days to integer');
  } catch (e) {
    console.error('Error altering duration_days type:', e.message);
  }
  
  process.exit(0);
}

run();
