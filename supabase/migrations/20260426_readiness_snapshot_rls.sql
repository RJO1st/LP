-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fix scholar_readiness_snapshot RLS (#47)
--
-- Problem: the existing SELECT policy on scholar_readiness_snapshot allowed
-- any authenticated user to read any row if they knew the scholar_id.
-- Teachers from School A could read snapshots for scholars in School B.
--
-- Fix: teachers may only read snapshots for scholars in a class they are
-- assigned to (via teacher_assignments). Proprietors/admins may read any
-- snapshot within their school. Parents may read their own scholars.
-- Service-role writes are unaffected (no RLS on service_role).
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop any existing permissive SELECT policy
DROP POLICY IF EXISTS "scholar_readiness_snapshot_select" ON scholar_readiness_snapshot;
DROP POLICY IF EXISTS "readiness_snapshot_select" ON scholar_readiness_snapshot;

-- ── Teachers: only scholars enrolled in their assigned classes ────────────────
CREATE POLICY "readiness_snapshot_teacher_select"
  ON scholar_readiness_snapshot
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM teacher_assignments ta
      JOIN enrolments e ON e.class_id = ta.class_id
      WHERE ta.teacher_id = auth.uid()
        AND e.scholar_id  = scholar_readiness_snapshot.scholar_id
    )
  );

-- ── Proprietors / Admins: any scholar in their school ────────────────────────
CREATE POLICY "readiness_snapshot_proprietor_select"
  ON scholar_readiness_snapshot
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM school_roles sr
      JOIN scholars s ON s.school_id = sr.school_id
      WHERE sr.user_id  = auth.uid()
        AND sr.role      IN ('proprietor', 'admin')
        AND s.id         = scholar_readiness_snapshot.scholar_id
    )
  );

-- ── Parents: only their own linked scholars ───────────────────────────────────
CREATE POLICY "readiness_snapshot_parent_select"
  ON scholar_readiness_snapshot
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM scholars s
      JOIN parents p ON p.id = s.parent_id
      WHERE p.user_id = auth.uid()
        AND s.id      = scholar_readiness_snapshot.scholar_id
    )
  );

-- Ensure RLS is enabled (idempotent)
ALTER TABLE scholar_readiness_snapshot ENABLE ROW LEVEL SECURITY;
