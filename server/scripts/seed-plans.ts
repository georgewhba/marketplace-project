import { db } from '../db/index.js';
import { subscriptionPlans } from '../db/schema/subscriptions.js';

async function seedPlans() {
  console.log('Seeding subscription plans...');
  
  const plans = [
    {
      name: 'باقة الانطلاق',
      slug: 'starter',
      priceMonthly: '0.00',
      commissionRate: '15.00',
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
      name: 'باقة النمو',
      slug: 'growth',
      priceMonthly: '499.00',
      commissionRate: '10.00',
      productLimit: 500,
      imageLimitPerProduct: 5,
      autoShippingEnabled: true,
      advancedAnalytics: true,
      bulkActionsEnabled: false,
      payoutCycleDays: 14,
      trustBadge: 'verified',
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'الباقة الاحترافية',
      slug: 'pro',
      priceMonthly: '1499.00',
      commissionRate: '5.00',
      productLimit: null, // unlimited
      imageLimitPerProduct: 10,
      autoShippingEnabled: true,
      advancedAnalytics: true,
      bulkActionsEnabled: true,
      payoutCycleDays: 7,
      trustBadge: 'featured',
      sortOrder: 3,
      isActive: true,
    }
  ];

  for (const plan of plans) {
    try {
      await db.insert(subscriptionPlans).values(plan);
      console.log(`Plan ${plan.name} created.`);
    } catch (err: any) {
      if (err.code === '23505') {
        console.log(`Plan ${plan.name} already exists.`);
      } else {
        console.error(`Error inserting ${plan.name}:`, err);
      }
    }
  }

  console.log('Done!');
  process.exit(0);
}

seedPlans().catch((err) => {
  console.error(err);
  process.exit(1);
});
