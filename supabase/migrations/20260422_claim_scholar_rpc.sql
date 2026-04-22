-- ─── claim_scholar_invitation RPC ───────────────────────────────────────────
-- SECURITY DEFINER function that atomically claims a scholar invitation.
--
-- Why an RPC instead of multi-statement logic in the API route?
--   The previous route did: SELECT invitation → UPDATE scholars.parent_id →
--   UPDATE invitation.status. Between the SELECT and the first UPDATE a second
--   request with the same code (replayed from the email link, or double-clicked
--   by the parent) could also pass the `status='pending'` check. Both requests
--   would then succeed and the second parent's UPDATE on `scholars.parent_id`
--   would silently overwrite the first. The RLS policy on `scholar_invitations`
--   also only allows service-role writes, so the API-level flow didn't actually
--   work without bypassing RLS — which meant the previous implementation was
--   functionally broken even before considering the race.
--
-- The fix:
--   - SELECT … FOR UPDATE takes a row lock on the invitation, serialising
--     concurrent claim attempts on the same code.
--   - Status / expiry / email checks happen AFTER the lock so they see the
--     committed state that the lock-holder observed.
--   - All side-effects run inside the same implicit transaction the RPC is
--     invoked in. If any write fails the whole claim is rolled back.
--   - Runs as SECURITY DEFINER so it can read/write `scholar_invitations`
--     despite the service-role-only RLS policy, but its own logic scopes
--     every write to `auth.uid()`.
--
-- Error contract (mapped to HTTP in /api/parent/claim-scholar):
--   '28000' → unauthenticated (401)
--   'P0002' → invitation_not_found (404)
--   'P0001' with message 'invitation_not_pending'  → 409
--   'P0001' with message 'invitation_expired'      → 410
--   '42501' → invitation_email_mismatch (403)
-- ────────────────────────────────────────────────────────────────────────────

BEGIN;

CREATE OR REPLACE FUNCTION public.claim_scholar_invitation(
  p_validation_code TEXT
)
RETURNS TABLE (
  scholar_id   UUID,
  scholar_name TEXT,
  year_level   INT,
  curriculum   TEXT,
  codename     TEXT,
  access_code  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_parent_id    UUID := auth.uid();
  v_parent_email TEXT;
  v_invitation   RECORD;
BEGIN
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  IF p_validation_code IS NULL OR length(p_validation_code) = 0 THEN
    RAISE EXCEPTION 'invitation_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Lookup the caller's email — needed for the parent_email match check.
  SELECT email INTO v_parent_email
    FROM auth.users
   WHERE id = v_parent_id;

  -- Take a row-level lock on the invitation. Any concurrent claim on the same
  -- code blocks here until this transaction commits or rolls back.
  SELECT id, scholar_id, parent_email, status, expires_at
    INTO v_invitation
    FROM public.scholar_invitations
   WHERE validation_code = p_validation_code
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'invitation_not_pending' USING ERRCODE = 'P0001';
  END IF;

  IF v_invitation.expires_at IS NULL OR v_invitation.expires_at < now() THEN
    -- Flip the row to 'expired' so we don't keep raising on it.
    UPDATE public.scholar_invitations
       SET status = 'expired'
     WHERE id = v_invitation.id
       AND status = 'pending';
    RAISE EXCEPTION 'invitation_expired' USING ERRCODE = 'P0001';
  END IF;

  IF v_invitation.parent_email IS NOT NULL
     AND lower(v_invitation.parent_email) <> lower(COALESCE(v_parent_email, '')) THEN
    RAISE EXCEPTION 'invitation_email_mismatch' USING ERRCODE = '42501';
  END IF;

  -- Atomic side-effects.
  UPDATE public.scholars
     SET parent_id = v_parent_id
   WHERE id = v_invitation.scholar_id;

  UPDATE public.scholar_invitations
     SET status = 'claimed'
   WHERE id = v_invitation.id;

  -- Ensure a parent row exists. The parents table is keyed on auth.uid().
  -- Defaults match the existing signup flow; dashboard onboarding later
  -- overrides region/currency based on curriculum choice.
  INSERT INTO public.parents (id, subscription_status, subscription_tier, region, currency)
  VALUES (v_parent_id, 'active', 'free', 'GB', 'GBP')
  ON CONFLICT (id) DO NOTHING;

  RETURN QUERY
    SELECT s.id, s.name, s.year_level, s.curriculum, s.codename, s.access_code
      FROM public.scholars s
     WHERE s.id = v_invitation.scholar_id;
END;
$$;

-- Lock down invocation: only authenticated sessions may call this RPC.
-- Anonymous (including the service role, which should use admin flows instead)
-- must not be able to claim scholars via this path.
REVOKE ALL ON FUNCTION public.claim_scholar_invitation(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_scholar_invitation(TEXT) FROM anon;
GRANT  EXECUTE ON FUNCTION public.claim_scholar_invitation(TEXT) TO authenticated;

COMMIT;

-- ── Verification (manual) ───────────────────────────────────────────────────
-- SELECT proname, prosecdef FROM pg_proc WHERE proname = 'claim_scholar_invitation';
-- -- prosecdef should be 't'
--
-- SELECT has_function_privilege('authenticated', 'public.claim_scholar_invitation(text)', 'EXECUTE');
-- -- should be 't'
--
-- SELECT has_function_privilege('anon', 'public.claim_scholar_invitation(text)', 'EXECUTE');
-- -- should be 'f'
