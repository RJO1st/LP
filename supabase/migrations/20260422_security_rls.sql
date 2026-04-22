-- ═══════════════════════════════════════════════════════════════════════════════
-- LaunchPard security audit — RLS hardening (April 22 2026)
--
-- Covers the April 15+ school-dashboard tables that shipped with inconsistent
-- RLS posture:
--
--   (a) `topic_exam_importance`      — RLS never enabled. Table holds exam
--                                      weight metadata; harmless on read but a
--                                      bug that loses service-role scoping
--                                      could let any authenticated request
--                                      scramble the weights. Enforce read-only
--                                      for authenticated users, writes only
--                                      via service role.
--
--   (b) `school_dashboard_cache`     — RLS never enabled. Rows contain
--                                      aggregated readiness + placement % per
--                                      school. A stray unfiltered SELECT from
--                                      an authenticated session would hand
--                                      over competitor-quality analytics on
--                                      every partner school. Scope SELECT to
--                                      proprietors/admins of the row's school.
--
--   (c) `scholar_school_consent`     — Existing parent-scoped policies are
--                                      correct but don't verify that the
--                                      scholar being consented-for actually
--                                      belongs to the parent. A malicious
--                                      authenticated client that guesses a
--                                      scholar_id could insert a consent row
--                                      claiming someone else's scholar (the
--                                      upsert would fail the FK on
--                                      scholars.parent_id check only at the
--                                      application layer — not at DB level).
--                                      Add an EXISTS() sub-check to the INSERT
--                                      policy.
--
--   (d) All April-15 tables lacked `FORCE ROW LEVEL SECURITY`. Without FORCE,
--                                      RLS is bypassed for the table owner
--                                      (the `postgres` role that owns tables
--                                      created via migrations). Any
--                                      SECURITY DEFINER function that
--                                      forgets to SET search_path or any
--                                      path that momentarily runs as the
--                                      owner would bypass RLS silently.
--                                      FORCE RLS applies policies uniformly
--                                      including to the owner.
--
--   (e) Reciprocal tables (`scholar_readiness_snapshot`) — FORCE RLS added for
--                                      the same reason; existing policies
--                                      (parent/teacher SELECT + service-role
--                                      write) are kept as-is.
--
-- Rollback note:
--   This migration only ENABLES RLS and adds policies. Nothing is dropped
--   except an outdated INSERT policy on `scholar_school_consent` that we
--   replace with a tighter one. If it needs to be reverted, re-apply the
--   April-15 consent/leads migration to restore the old policy; the FORCE RLS
--   flag can be cleared with `ALTER TABLE <t> NO FORCE ROW LEVEL SECURITY`.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. topic_exam_importance ────────────────────────────────────────────────
-- Read-only to authenticated users (the readiness computation is server-side
-- via service role, but we allow authenticated reads to keep the door open
-- for client-side analytics panels without creating a second code path).
-- Writes are service-role only; operations run by cron jobs / data seeds.
ALTER TABLE public.topic_exam_importance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_exam_importance FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_tei_read ON public.topic_exam_importance;
CREATE POLICY rls_tei_read ON public.topic_exam_importance
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS rls_tei_service_write ON public.topic_exam_importance;
CREATE POLICY rls_tei_service_write ON public.topic_exam_importance
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ── 2. school_dashboard_cache ───────────────────────────────────────────────
-- Rows aggregate school-level readiness and placement %. Only proprietors and
-- admins of the owning school should see them. Writes are service-role only
-- (populated by the nightly Edge Function).
ALTER TABLE public.school_dashboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_dashboard_cache FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_sdc_read_school_admin ON public.school_dashboard_cache;
CREATE POLICY rls_sdc_read_school_admin ON public.school_dashboard_cache
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM public.school_roles
      WHERE user_id = auth.uid()
        AND role IN ('proprietor', 'admin')
    )
  );

DROP POLICY IF EXISTS rls_sdc_service_write ON public.school_dashboard_cache;
CREATE POLICY rls_sdc_service_write ON public.school_dashboard_cache
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ── 3. scholar_school_consent ───────────────────────────────────────────────
-- Existing April-15 policies:
--   scholar_school_consent_select_own   — parent_id = auth.uid()
--   scholar_school_consent_insert_own   — parent_id = auth.uid()
--   scholar_school_consent_update_own   — parent_id = auth.uid() (both USING/WITH CHECK)
--   scholar_school_consent_service_all  — service role
--
-- We keep all four but tighten the INSERT policy so that `scholar_id` must
-- belong to the authenticated parent. Otherwise a parent who knows someone
-- else's scholar UUID could insert a consent row for that child (the row's
-- `parent_id = auth.uid()` check is satisfied by them being a parent at
-- all — it doesn't prove the scholar is theirs).
DROP POLICY IF EXISTS scholar_school_consent_insert_own
  ON public.scholar_school_consent;
CREATE POLICY scholar_school_consent_insert_own
  ON public.scholar_school_consent
  FOR INSERT
  WITH CHECK (
    parent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.scholars s
       WHERE s.id = scholar_school_consent.scholar_id
         AND s.parent_id = auth.uid()
    )
  );

-- Same scholar-ownership tightening applied to UPDATE — otherwise a parent
-- could revoke a consent row they never owned if the row's parent_id column
-- was mis-set (defensive; the column shouldn't diverge from scholar.parent_id
-- but RLS is where we assume it might).
DROP POLICY IF EXISTS scholar_school_consent_update_own
  ON public.scholar_school_consent;
CREATE POLICY scholar_school_consent_update_own
  ON public.scholar_school_consent
  FOR UPDATE
  USING (
    parent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.scholars s
       WHERE s.id = scholar_school_consent.scholar_id
         AND s.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    parent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.scholars s
       WHERE s.id = scholar_school_consent.scholar_id
         AND s.parent_id = auth.uid()
    )
  );

ALTER TABLE public.scholar_school_consent FORCE ROW LEVEL SECURITY;

-- ── 4. school_leads ─────────────────────────────────────────────────────────
-- Writes are all service-role (parent-claim flow inserts via the service-role
-- backend, not via the RLS-scoped client). Reads are also service-role — this
-- table feeds the internal sales pipeline and should never be visible to a
-- logged-in parent or teacher. Policy is already set at creation time; we
-- just enforce it uniformly with FORCE RLS.
ALTER TABLE public.school_leads FORCE ROW LEVEL SECURITY;

-- ── 5. scholar_readiness_snapshot ───────────────────────────────────────────
-- Existing policies grant parent + teacher SELECT, service-role full access.
-- Add FORCE RLS so a SECURITY DEFINER path accidentally reading as owner
-- still respects the read scope.
ALTER TABLE public.scholar_readiness_snapshot FORCE ROW LEVEL SECURITY;

-- ── 6. scholar_invitations ──────────────────────────────────────────────────
-- Only the service role reads/writes directly; the parent flow now goes
-- through the `claim_scholar_invitation` SECURITY DEFINER RPC. Apply FORCE
-- RLS so the RPC's row lock is the only path to the data even if a future
-- bug exposes the table owner role to an API route.
ALTER TABLE public.scholar_invitations FORCE ROW LEVEL SECURITY;

-- ── 7. school_roles, classes, enrolments, teacher_assignments ───────────────
-- These already have policies from 20260415_school_dashboard.sql. Apply FORCE
-- so policies are uniform across all callers (owner included).
ALTER TABLE public.school_roles         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.classes              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.enrolments           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments  FORCE ROW LEVEL SECURITY;

-- ── 8. Post-migration validation ────────────────────────────────────────────
DO $$
DECLARE
  v_missing TEXT := '';
  v_not_forced TEXT := '';
  r RECORD;
  expected_tables TEXT[] := ARRAY[
    'topic_exam_importance',
    'school_dashboard_cache',
    'scholar_school_consent',
    'school_leads',
    'scholar_readiness_snapshot',
    'scholar_invitations',
    'school_roles',
    'classes',
    'enrolments',
    'teacher_assignments'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY expected_tables LOOP
    SELECT relrowsecurity, relforcerowsecurity INTO r
      FROM pg_class
     WHERE oid = ('public.' || t)::regclass;
    IF NOT r.relrowsecurity THEN
      v_missing := v_missing || t || ' ';
    END IF;
    IF NOT r.relforcerowsecurity THEN
      v_not_forced := v_not_forced || t || ' ';
    END IF;
  END LOOP;

  IF length(v_missing) > 0 THEN
    RAISE EXCEPTION 'RLS not enabled on: %', v_missing;
  END IF;
  IF length(v_not_forced) > 0 THEN
    RAISE EXCEPTION 'RLS not FORCED on: %', v_not_forced;
  END IF;
  RAISE NOTICE 'Security RLS migration validated: all 10 tables RLS+FORCE ✓';
END $$;

COMMIT;

-- ── Manual verification queries ─────────────────────────────────────────────
-- SELECT relname, relrowsecurity, relforcerowsecurity
--   FROM pg_class
--  WHERE relname IN ('topic_exam_importance','school_dashboard_cache',
--                    'scholar_school_consent','school_leads',
--                    'scholar_readiness_snapshot','scholar_invitations',
--                    'school_roles','classes','enrolments','teacher_assignments')
--  ORDER BY relname;
-- -- relrowsecurity AND relforcerowsecurity should both be 't' for every row.
--
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
--   FROM pg_policies
--  WHERE schemaname = 'public'
--    AND tablename IN ('topic_exam_importance','school_dashboard_cache','scholar_school_consent')
--  ORDER BY tablename, policyname;
