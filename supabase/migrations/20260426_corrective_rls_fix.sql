-- Corrective RLS migration — April 26 2026
-- Situation: two previous migrations applied partially.
--   1. tara_turns: table + RLS enabled, but "service_role_only" USING(false)
--      policy was NOT created (pg_policies shows empty for this table).
--   2. scholar_readiness_snapshot: old policies (rls_snapshot_scholar SELECT
--      + rls_snapshot_service_write ALL) still present; the three scoped
--      SELECT policies from migration #47 were NOT applied.
-- This migration brings both tables to the intended state.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. tara_turns — deny-all for non-service-role sessions
-- ════════════════════════════════════════════════════════════════════════════
-- RLS is already enabled from the original migration; just add the policy.
-- Service role bypasses RLS by design so the Tara route handler retains
-- full read/write access without needing an explicit ALLOW policy.
DROP POLICY IF EXISTS "service_role_only" ON tara_turns;
CREATE POLICY "service_role_only" ON tara_turns
  USING (false);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. scholar_readiness_snapshot — replace broad policies with scoped ones
-- ════════════════════════════════════════════════════════════════════════════

-- 2a. Drop the two existing broad policies
DROP POLICY IF EXISTS "rls_snapshot_scholar"        ON scholar_readiness_snapshot;
DROP POLICY IF EXISTS "rls_snapshot_service_write"  ON scholar_readiness_snapshot;

-- Also drop any variants from the earlier (partially-applied) migration
-- so this is idempotent on environments where some policies did land.
DROP POLICY IF EXISTS "readiness_snapshot_teacher_select"        ON scholar_readiness_snapshot;
DROP POLICY IF EXISTS "readiness_snapshot_proprietor_select"     ON scholar_readiness_snapshot;
DROP POLICY IF EXISTS "readiness_snapshot_parent_select"         ON scholar_readiness_snapshot;
DROP POLICY IF EXISTS "readiness_snapshot_insert"                ON scholar_readiness_snapshot;
DROP POLICY IF EXISTS "readiness_snapshot_update"                ON scholar_readiness_snapshot;
DROP POLICY IF EXISTS "readiness_snapshot_delete"                ON scholar_readiness_snapshot;
DROP POLICY IF EXISTS "scholar_readiness_snapshot_insert"        ON scholar_readiness_snapshot;
DROP POLICY IF EXISTS "scholar_readiness_snapshot_update"        ON scholar_readiness_snapshot;
DROP POLICY IF EXISTS "scholar_readiness_snapshot_delete"        ON scholar_readiness_snapshot;

-- 2b. FORCE RLS so even the table owner (postgres role) is subject to policies.
--     Write access is reserved for the service role (which bypasses RLS).
ALTER TABLE scholar_readiness_snapshot FORCE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON scholar_readiness_snapshot FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON scholar_readiness_snapshot FROM anon;

-- 2c. Three scoped SELECT policies

-- Teachers can read snapshots for scholars in their assigned classes.
CREATE POLICY "readiness_snapshot_teacher_select"
  ON scholar_readiness_snapshot
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   teacher_assignments ta
      JOIN   enrolments          e  ON e.class_id = ta.class_id
      WHERE  ta.teacher_id           = auth.uid()
        AND  e.scholar_id            = scholar_readiness_snapshot.scholar_id
    )
  );

-- Proprietors and admins can read snapshots for all scholars in their school.
CREATE POLICY "readiness_snapshot_proprietor_select"
  ON scholar_readiness_snapshot
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   school_roles sr
      JOIN   scholars     s  ON s.school_id = sr.school_id
      WHERE  sr.user_id            = auth.uid()
        AND  sr.role               IN ('proprietor', 'admin')
        AND  s.id                  = scholar_readiness_snapshot.scholar_id
    )
  );

-- Parents can read snapshots for their own scholars (consent-agnostic —
-- the application layer applies the consent filter before returning data;
-- the RLS layer just restricts to the parent's own children).
CREATE POLICY "readiness_snapshot_parent_select"
  ON scholar_readiness_snapshot
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   scholars s
      WHERE  s.id        = scholar_readiness_snapshot.scholar_id
        AND  s.parent_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- Verification queries (run these manually after applying):
--
-- SELECT policyname, cmd, qual
--   FROM pg_policies
--  WHERE tablename IN ('tara_turns', 'scholar_readiness_snapshot')
--  ORDER BY tablename, policyname;
--
-- Expected tara_turns:       service_role_only | SELECT | false
-- Expected scholar_readiness_snapshot: three SELECT rows above + no others
-- ════════════════════════════════════════════════════════════════════════════
