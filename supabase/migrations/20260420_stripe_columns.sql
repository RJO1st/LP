-- ─────────────────────────────────────────────────────────────────────────────
-- Add Stripe-specific columns to parents table
-- These are used by the Stripe checkout + webhook routes to link Stripe
-- customers/subscriptions back to LaunchPard parent accounts.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT;

CREATE INDEX IF NOT EXISTS idx_parents_stripe_customer
  ON parents (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
