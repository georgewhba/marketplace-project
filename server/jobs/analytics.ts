import cron from 'node-cron';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

/**
 * Initializes background jobs for analytics
 */
export function initAnalyticsJobs() {
  // Refresh materialized view every hour
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('[Analytics Job] Refreshing daily_sales_summary materialized view...');
      // CONCURRENTLY can be used since we added a UNIQUE index
      await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY daily_sales_summary`);
      console.log('[Analytics Job] Successfully refreshed daily_sales_summary.');
    } catch (error) {
      console.error('[Analytics Job] Failed to refresh materialized view:', error);
    }
  });

  console.log('[Analytics Job] Hourly materialized view refresh initialized.');
}
