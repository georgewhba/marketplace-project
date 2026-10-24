import { db } from '../db/index.js';
import { vendorSubscriptions, subscriptionPlans, commissionRules } from '../db/schema/index.js';
import { eq, and, lt, or } from 'drizzle-orm';

export async function processExpiredSubscriptions() {
  console.log('[Jobs] Running subscription expiration check...');
  try {
    const now = new Date();
    
    // Find expired active subscriptions
    const expiredSubs = await db.select()
      .from(vendorSubscriptions)
      .where(
        and(
          eq(vendorSubscriptions.status, 'active'),
          lt(vendorSubscriptions.currentPeriodEnd, now)
        )
      );

    if (expiredSubs.length === 0) {
      return;
    }

    console.log(`[Jobs] Found ${expiredSubs.length} expired subscriptions. Processing...`);

    const [freePlan] = await db
      .select()
      .from(subscriptionPlans)
      .where(or(eq(subscriptionPlans.slug, 'basic'), eq(subscriptionPlans.slug, 'starter')))
      .limit(1);
    
    if (!freePlan) {
      console.error('[Jobs] Free plan (basic/starter) not found!');
      return;
    }

    for (const sub of expiredSubs) {
      await db.transaction(async (tx) => {
        // Downgrade existing subscription in-place (vendor_subscriptions.vendor_id is UNIQUE)
        await tx.update(vendorSubscriptions)
          .set({
            planId: freePlan.id,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: null, // Free plan never expires
            autoRenew: true,
          })
          .where(eq(vendorSubscriptions.id, sub.id));

        // Update commission rules
        await tx.delete(commissionRules)
          .where(and(eq(commissionRules.scope, 'vendor'), eq(commissionRules.targetId, sub.vendorId)));
          
        await tx.insert(commissionRules).values({
          scope: 'vendor',
          targetId: sub.vendorId,
          rate: freePlan.commissionRate,
          priority: 100, // Highest priority
          effectiveFrom: new Date()
        });
      });
      console.log(`[Jobs] Downgraded vendor ${sub.vendorId} to free plan.`);
    }
  } catch (error) {
    console.error('[Jobs] Error processing expired subscriptions:', error);
  }
}
