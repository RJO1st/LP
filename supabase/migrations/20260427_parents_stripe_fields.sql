-- ─── Stripe subscription tracking on parents ─────────────────────────────────
-- Adds stripe_subscription_id so the webhook can resolve a parent from a
-- Stripe subscription or invoice event without a secondary email lookup.
--
-- Written on: 2026-04-27 (session 10)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.parents
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Index: used by invoice.payment_failed + subscription.deleted webhook handlers
-- to locate the parent in a single round-trip.
CREATE INDEX IF NOT EXISTS idx_parents_stripe_subscription_id
  ON public.parents (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ─── Verification query ───────────────────────────────────────────────────────
-- Run after applying this migration to confirm the column exists:
--
-- SELECT column_name, data_type, is_nullable
-- FROM   information_schema.columns
-- WHERE  table_schema = 'public'
--   AND  table_name   = 'parents'
--   AND  column_name  = 'stripe_subscription_id';
--
-- Expected row: stripe_subscription_id | text | YES
-- ─────────────────────────────────────────────────────────────────────────────
