import { db } from '../db/index.js';
import { subscriptionPlans, vendorSubscriptions, subscriptionPromotions } from '../db/schema/subscriptions.js';
import { sql } from 'drizzle-orm';

async function seedPlans() {
  console.log('Seeding subscription plans...');
  
  // Clear existing dependencies first (in a dev environment this is fine)
  await db.delete(vendorSubscriptions);
  await db.delete(subscriptionPromotions);
  await db.delete(subscriptionPlans);

  // Reset the ID sequence
  await db.execute(sql`ALTER SEQUENCE subscription_plans_id_seq RESTART WITH 1`);

  const plans = [
    {
      name: 'Basic',
      slug: 'basic',
      priceMonthly: '0.00',
      commissionRate: '12.00',
      productLimit: 50,
      imageLimitPerProduct: 3,
      autoShippingEnabled: false,
      advancedAnalytics: false,
      bulkActionsEnabled: false,
      payoutCycleDays: 30,
      trustBadge: null,
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'Plus',
      slug: 'plus',
      priceMonthly: '499.00',
      commissionRate: '8.00',
      productLimit: 500,
      imageLimitPerProduct: 5,
      autoShippingEnabled: true,
      advancedAnalytics: true,
      bulkActionsEnabled: false,
      payoutCycleDays: 14,
      trustBadge: null,
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'Pro',
      slug: 'pro',
      priceMonthly: '1499.00',
      commissionRate: '4.00',
      productLimit: null, // unlimited
      imageLimitPerProduct: 10,
      autoShippingEnabled: true,
      advancedAnalytics: true,
      bulkActionsEnabled: true,
      payoutCycleDays: 7,
      trustBadge: 'verified',
      sortOrder: 3,
      isActive: true,
    }
  ];

  for (const plan of plans) {
    try {
      await db.insert(subscriptionPlans).values(plan);
      console.log(`Plan ${plan.name} created.`);
    } catch (err: any) {
      console.error(`Error inserting ${plan.name}:`, err);
    }
  }

  console.log('Done!');
  process.exit(0);
}

seedPlans().catch((err) => {
  console.error(err);
  process.exit(1);
});
