-- ═══════════════════════════════════════════════════════════════════════════════
-- LaunchPard Tier Gating Migration (April 14, 2026)
--
-- Adds region-aware subscription tier schema to the parents table. Zero
-- user-visible change after this runs: every existing parent is backfilled
-- to region='GB' + uk_pro (if subscribed) or free (if trial/expired).
--
-- Columns added:
--   region              — 2-letter ISO code; source of truth for pricing locale.
--                         WRITE-ONCE at signup from __geo cookie / IP detection.
--                         Cannot be changed by user (anti-VPN-arbitrage).
--   subscription_tier   — specific tier matching TIER_DEFS in src/lib/tierAccess.js
--   currency            — 'GBP' or 'NGN', derived from region but stored for
--                         historical billing records.
--
-- This migration is safe on an empty or populated parents table.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Add columns with safe defaults ──────────────────────────────────────────
ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'GB',
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'GBP';

-- ── Constraint: region must be a supported ISO code ─────────────────────────
-- GB = United Kingdom (default), NG = Nigeria (new), CA/US/AU/IE = other
-- English-speaking markets served via UK pricing for now, IB = International
-- Baccalaureate families, OTHER = everything else
ALTER TABLE parents
  DROP CONSTRAINT IF EXISTS parents_region_check;
ALTER TABLE parents
  ADD CONSTRAINT parents_region_check
  CHECK (region IN ('GB','NG','CA','US','AU','IE','IB','OTHER'));

-- ── Constraint: subscription_tier must be a known tier key ──────────────────
-- Keep this list in sync with TIER_DEFS in src/lib/tierAccess.js.
ALTER TABLE parents
  DROP CONSTRAINT IF EXISTS parents_subscription_tier_check;
ALTER TABLE parents
  ADD CONSTRAINT parents_subscription_tier_check
  CHECK (subscription_tier IN (
    'free',
    -- GB / CA / US / AU / IE / OTHER tiers
    'uk_pro', 'uk_pro_exam',
    -- NG tiers (analysis-backed; see NIGERIAN_PRICING_ANALYSIS.md)
    'ng_explorer', 'ng_scholar', 'ng_waec',
    'ng_family_2', 'ng_family_3', 'ng_family_4plus'
  ));

-- ── Constraint: currency must be GBP or NGN ─────────────────────────────────
ALTER TABLE parents
  DROP CONSTRAINT IF EXISTS parents_currency_check;
ALTER TABLE parents
  ADD CONSTRAINT parents_currency_check
  CHECK (currency IN ('GBP','NGN'));

-- ── Composite index for tier-gating lookups ─────────────────────────────────
-- Used by hasFeature() + quota enforcement queries.
CREATE INDEX IF NOT EXISTS idx_parents_region_tier
  ON parents(region, subscription_tier);

-- ── Backfill existing parents ────────────────────────────────────────────────
-- Existing users continue to see exactly what they saw before:
--   1. Default region stays 'GB' (every existing parent was UK-region)
--   2. subscription_tier derived from existing state:
--      - pro_override=true OR (subscription_status='active')  -> 'uk_pro'
--      - otherwise                                             -> 'free'
--   3. currency='GBP' for all existing parents

UPDATE parents
SET subscription_tier = 'uk_pro'
WHERE (pro_override IS TRUE OR subscription_status = 'active')
  AND subscription_tier = 'free';

-- ── Validation: check everything landed correctly ───────────────────────────
-- Should return zero rows. If anything returns, roll back and investigate.
DO $$
DECLARE
  bad_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad_count FROM parents
    WHERE region NOT IN ('GB','NG','CA','US','AU','IE','IB','OTHER')
       OR currency NOT IN ('GBP','NGN')
       OR subscription_tier NOT IN (
            'free','uk_pro','uk_pro_exam',
            'ng_explorer','ng_scholar','ng_waec',
            'ng_family_2','ng_family_3','ng_family_4plus'
          );
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Tier gating migration: % invalid rows found in parents', bad_count;
  END IF;
END $$;

-- ── Add-on: create tier_feedback_quota table for daily quota tracking ───────
-- Tara AI feedback is rate-limited per-scholar per-day on the free/explorer
-- tiers. This table holds the counter. A nightly cron (existing /api/cron
-- pattern) resets it.
CREATE TABLE IF NOT EXISTS tier_feedback_quota (
  scholar_id UUID NOT NULL REFERENCES scholars(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  feedback_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scholar_id, day)
);

CREATE INDEX IF NOT EXISTS idx_tier_feedback_quota_day
  ON tier_feedback_quota(day);

-- Atomic increment function — called by /api/tara via tierAccess
CREATE OR REPLACE FUNCTION increment_tier_feedback_quota(p_scholar_id UUID, p_day DATE)
RETURNS void AS $$
  INSERT INTO tier_feedback_quota (scholar_id, day, feedback_count)
  VALUES (p_scholar_id, p_day, 1)
  ON CONFLICT (scholar_id, day)
  DO UPDATE SET feedback_count = tier_feedback_quota.feedback_count + 1;
$$ LANGUAGE sql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_tier_feedback_quota(UUID, DATE) TO service_role;

-- RLS on tier_feedback_quota — scholar owner can read their own row
ALTER TABLE tier_feedback_quota ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tier_feedback_quota_scholar_read ON tier_feedback_quota;
CREATE POLICY tier_feedback_quota_scholar_read ON tier_feedback_quota
  FOR SELECT
  USING (
    scholar_id IN (
      SELECT id FROM scholars WHERE parent_id = (
        SELECT id FROM parents WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS tier_feedback_quota_service_write ON tier_feedback_quota;
CREATE POLICY tier_feedback_quota_service_write ON tier_feedback_quota
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Post-migration verification queries (run manually to confirm)
-- ═══════════════════════════════════════════════════════════════════════════════
-- SELECT region, subscription_tier, currency, COUNT(*)
--   FROM parents GROUP BY region, subscription_tier, currency
--   ORDER BY region, subscription_tier;
--
-- SELECT subscription_status, subscription_tier, COUNT(*)
--   FROM parents GROUP BY subscription_status, subscription_tier
--   ORDER BY subscription_status;
