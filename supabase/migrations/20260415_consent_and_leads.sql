-- ═══════════════════════════════════════════════════════════════════════════════
-- LaunchPard NDPR Compliance Migration (April 15, 2026)
--
-- Adds schema for parent consent tracking and school leads generation.
--
-- Tables added:
--   scholar_school_consent  — Per-school consent record. Parent consents to share
--                             their child's data with a specific school. Tracks
--                             IP + user agent for audit trail.
--   school_leads            — Captures when a parent adds a scholar linked to a
--                             non-partner school. Sales team uses this to contact
--                             unpartnered schools for partnership opportunities.
--
-- Columns added to schools:
--   is_partner              — Boolean flag indicating if school is a partner
--   partner_since           — Timestamp when partnership was established
--
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Ensure schools table exists (if not already) ──────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  country           TEXT,
  state_province    TEXT,
  city              TEXT,
  postal_code       TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ── Add NDPR partner columns to schools ────────────────────────────────────────
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS is_partner BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_since TIMESTAMPTZ;

-- ── Create scholar_school_consent table ────────────────────────────────────────
-- Per-school consent record. Revoked when parent opts out of data sharing.
CREATE TABLE IF NOT EXISTS scholar_school_consent (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id        UUID NOT NULL REFERENCES scholars(id) ON DELETE CASCADE,
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  parent_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_given_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  consent_ip        TEXT,
  consent_user_agent TEXT,
  revoked_at        TIMESTAMPTZ,
  revoke_reason     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (scholar_id, school_id)
);

-- ── Indexes for common queries ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scholar_school_consent_scholar_id
  ON scholar_school_consent(scholar_id);

CREATE INDEX IF NOT EXISTS idx_scholar_school_consent_school_id
  ON scholar_school_consent(school_id);

CREATE INDEX IF NOT EXISTS idx_scholar_school_consent_parent_id
  ON scholar_school_consent(parent_id);

CREATE INDEX IF NOT EXISTS idx_scholar_school_consent_revoked
  ON scholar_school_consent(revoked_at) WHERE revoked_at IS NULL;

-- ── Create school_leads table ──────────────────────────────────────────────────
-- Captures when a parent adds a scholar linked to a non-partner school.
-- Sales team uses this to identify partnership opportunities.
CREATE TABLE IF NOT EXISTS school_leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  parent_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scholar_id    UUID NOT NULL REFERENCES scholars(id) ON DELETE CASCADE,
  lead_status   TEXT NOT NULL DEFAULT 'new',
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  contacted_at  TIMESTAMPTZ,
  converted_at  TIMESTAMPTZ,
  CONSTRAINT chk_school_lead_status CHECK (lead_status IN ('new','contacted','converted','ignored'))
);

-- ── Indexes for leads lookups ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_school_leads_school_id
  ON school_leads(school_id);

CREATE INDEX IF NOT EXISTS idx_school_leads_status
  ON school_leads(lead_status);

CREATE INDEX IF NOT EXISTS idx_school_leads_created_at
  ON school_leads(created_at DESC);

-- ── Enable RLS on scholar_school_consent ───────────────────────────────────────
ALTER TABLE scholar_school_consent ENABLE ROW LEVEL SECURITY;

-- Parents can SELECT their own consent records
CREATE POLICY scholar_school_consent_select_own
  ON scholar_school_consent FOR SELECT
  USING (parent_id = auth.uid());

-- Parents can INSERT (give consent)
CREATE POLICY scholar_school_consent_insert_own
  ON scholar_school_consent FOR INSERT
  WITH CHECK (parent_id = auth.uid());

-- Parents can UPDATE (revoke consent)
CREATE POLICY scholar_school_consent_update_own
  ON scholar_school_consent FOR UPDATE
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- Service role has full access (for API calls)
CREATE POLICY scholar_school_consent_service_all
  ON scholar_school_consent FOR ALL
  USING (auth.role() = 'service_role');

-- ── Enable RLS on school_leads ─────────────────────────────────────────────────
ALTER TABLE school_leads ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for API calls and admin reporting)
CREATE POLICY school_leads_service_all
  ON school_leads FOR ALL
  USING (auth.role() = 'service_role');

-- ── Validation: check tables created successfully ──────────────────────────────
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count FROM information_schema.tables
    WHERE table_name IN ('scholar_school_consent', 'school_leads');
  IF table_count < 2 THEN
    RAISE EXCEPTION 'NDPR compliance migration: Failed to create required tables';
  END IF;
END $$;

COMMIT;
