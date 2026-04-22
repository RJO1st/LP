-- ─────────────────────────────────────────────────────────────────────────────
-- Add subscription_status, billing_cycle to parents
-- Required by the Paystack webhook (charge.success + subscription.disable).
--
-- subscription_status: 'active' | 'cancelled' | 'past_due' | null (free/trial)
-- billing_cycle:       'monthly' | 'annual' | null (free)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS subscription_status TEXT
    CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'trialing')),
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT
    CHECK (billing_cycle IN ('monthly', 'annual'));

-- Back-fill: anyone already on a paid tier is active
UPDATE parents
SET subscription_status = 'active'
WHERE subscription_tier != 'free'
  AND subscription_status IS NULL;

-- Index — used by cron jobs that check expiring subscriptions
CREATE INDEX IF NOT EXISTS idx_parents_subscription_status
  ON parents (subscription_status, subscription_end);

-- ── Remove tutor_connect from the ng_addons allow-list ───────────────────────
-- tutor_connect was removed from the product on April 19 2026.
ALTER TABLE parents
  DROP CONSTRAINT IF EXISTS parents_ng_addons_values_check;

ALTER TABLE parents
  ADD CONSTRAINT parents_ng_addons_values_check
  CHECK (
    ng_addons <@ ARRAY['family_child', 'waec_boost', 'ai_unlimited']::TEXT[]
  );

-- Clear any stale tutor_connect values
UPDATE parents
SET ng_addons = array_remove(ng_addons, 'tutor_connect')
WHERE 'tutor_connect' = ANY(ng_addons);
