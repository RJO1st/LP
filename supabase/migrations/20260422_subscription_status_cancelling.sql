-- ─────────────────────────────────────────────────────────────────────────────
-- Add 'cancelling' to parents.subscription_status CHECK constraint
--
-- Required by the Paystack webhook `subscription.not_renew` handler.
-- Semantic:
--   'active'     — paying, will auto-renew
--   'cancelling' — parent turned off auto-renew; still has access until
--                  subscription_end, then flips to 'cancelled' via
--                  subscription.disable webhook
--   'past_due'   — recurring charge failed; Paystack is retrying
--   'cancelled'  — no access; downgraded to free tier
--   'trialing'   — introductory trial period
--
-- A parallel boolean `cancel_at_period_end` was considered but rejected:
-- one field is simpler to query for cron jobs that need to flip expiring
-- subscriptions off. See src/app/api/paystack/webhook/route.js for the
-- state-transition diagram.
--
-- The original CHECK constraint was declared inline in
-- 20260421_paystack_parent_columns.sql, so Postgres auto-named it. We
-- look the name up rather than hard-coding it.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  existing_constraint TEXT;
BEGIN
  SELECT con.conname
    INTO existing_constraint
  FROM pg_constraint con
  INNER JOIN pg_class rel ON rel.oid = con.conrelid
  INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'parents'
    AND nsp.nspname = 'public'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%subscription_status%'
  LIMIT 1;

  IF existing_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.parents DROP CONSTRAINT %I', existing_constraint);
  END IF;
END $$;

ALTER TABLE public.parents
  ADD CONSTRAINT parents_subscription_status_check
  CHECK (
    subscription_status IN (
      'active',
      'cancelling',
      'cancelled',
      'past_due',
      'trialing'
    )
  );
