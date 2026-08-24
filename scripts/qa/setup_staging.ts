import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../server/db/schema/index.js';

const mainDbUrl = 'postgresql://postgres@localhost:5433/postgres';
const stagingDbUrl = 'postgresql://postgres@localhost:5433/marketplace_staging';

async function createDb() {
  const sql = postgres(mainDbUrl, { max: 1 });
  try {
    const result = await sql`SELECT 1 FROM pg_database WHERE datname = 'marketplace_staging'`;
    if (result.length === 0) {
      console.log('Creating staging database...');
      await sql`CREATE DATABASE marketplace_staging`;
      console.log('Staging database created.');
    } else {
      console.log('Staging database already exists. Cleaning up...');
      await sql`DROP DATABASE marketplace_staging WITH (FORCE)`;
      await sql`CREATE DATABASE marketplace_staging`;
      console.log('Staging database recreated.');
    }
  } catch (err) {
    console.error('Error creating database:', err);
  } finally {
    await sql.end();
  }
}

async function main() {
  await createDb();
  console.log('Please run: npx dotenv -e .env.staging -- npm run db:push');
}

main().catch(console.error);
