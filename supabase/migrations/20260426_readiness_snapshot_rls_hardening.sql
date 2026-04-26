-- Migration: 20260426_readiness_snapshot_rls_hardening.sql
-- Hardens scholar_readiness_snapshot RLS following review of 20260426_readiness_snapshot_rls.sql.
--
-- Changes:
--  1. FORCE ROW LEVEL SECURITY — policies apply even to the table owner (postgres role).
--     Without this, the table owner can bypass RLS, which matters if any admin tooling
--     runs queries as the postgres/service role without the service-role bypass intent.
--     Service role (used by server-side writes) uses the Supabase service key which already
--     bypasses RLS by default; FORCE RLS only affects direct postgres connections.
--
--  2. Explicitly revoke INSERT / UPDATE / DELETE from the `authenticated` role so that
--     no future policy accidentally grants write access to a logged-in user.
--     All writes to this table go through service-role server code (analyticsEngine.js →
--     writeReadinessSnapshot) and must never be callable directly by a client.
--
--  3. Confirm the public role has no access (belt-and-braces).

-- ── 1. Force RLS (applies even if a superuser session somehow reaches this table) ──
ALTER TABLE scholar_readiness_snapshot FORCE ROW LEVEL SECURITY;

-- ── 2. Revoke write permissions from authenticated (and public) roles ──
--    Supabase grants broad permissions on tables by default via the `anon` / `authenticated`
--    roles, so we must explicitly revoke what we don't want.
REVOKE INSERT, UPDATE, DELETE ON scholar_readiness_snapshot FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON scholar_readiness_snapshot FROM anon;

-- The service_role bypasses RLS entirely, so it retains full write access without
-- needing an explicit GRANT here.  The three SELECT policies from the previous migration
-- cover the read surface correctly.

-- ── 3. Verify no stray policies exist for INSERT/UPDATE/DELETE ──
--    (Informational — these DROPs are no-ops if they don't exist, which is expected.)
DROP POLICY IF EXISTS "readiness_snapshot_insert" ON scholar_readiness_snapshot;
DROP POLICY IF EXISTS "readiness_snapshot_update" ON scholar_readiness_snapshot;
DROP POLICY IF EXISTS "readiness_snapshot_delete" ON scholar_readiness_snapshot;
DROP POLICY IF EXISTS "scholar_readiness_snapshot_insert" ON scholar_readiness_snapshot;
DROP POLICY IF EXISTS "scholar_readiness_snapshot_update" ON scholar_readiness_snapshot;
DROP POLICY IF EXISTS "scholar_readiness_snapshot_delete" ON scholar_readiness_snapshot;
