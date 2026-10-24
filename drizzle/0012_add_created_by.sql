-- Reconcile subscription_promotions columns idempotently after 0011_subscription_plans.sql
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
