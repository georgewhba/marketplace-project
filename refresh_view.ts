import { db } from './server/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
  await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary`);
  process.exit(0);
}

main().catch(console.error);
