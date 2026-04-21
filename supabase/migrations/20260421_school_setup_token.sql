-- ─── 20260421_school_setup_token.sql ─────────────────────────────────────────
-- Adds one-time setup token columns to the schools table.
-- Used by /api/admin/schools/provision to generate a LaunchPard-branded
-- onboarding link (launchpard.com/api/auth/school-setup?t=TOKEN)
-- instead of emailing a raw Supabase auth URL.
--
-- Flow:
--   1. Admin provisions school → UUID token stored here + emailed as LaunchPard URL
--   2. Proprietor clicks → /api/auth/school-setup validates token + clears it
--   3. Endpoint generates fresh Supabase auth link → 302 redirect (one-time use)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS setup_token             TEXT,
  ADD COLUMN IF NOT EXISTS setup_token_email       TEXT,
  ADD COLUMN IF NOT EXISTS setup_token_expires_at  TIMESTAMPTZ;

-- Fast lookup by token value (partial index — only non-null rows)
CREATE INDEX IF NOT EXISTS idx_schools_setup_token
  ON schools (setup_token)
  WHERE setup_token IS NOT NULL;
