-- ─── Stripe checkout session ledger ─────────────────────────────────────────
-- Stores pending / completed Stripe Checkout Sessions so the webhook handler
-- can resolve plan + billing from a trusted source (not just Stripe metadata,
-- which is caller-supplied at checkout time).
--
-- Access model: service-role only. RLS enabled + FORCED, no policies.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.stripe_sessions (
  session_id    TEXT        PRIMARY KEY,           -- Stripe cs_live_... / cs_test_...
  parent_id     UUID        NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  plan          TEXT        NOT NULL,              -- 'uk_pro' | 'uk_pro_exam'
  billing       TEXT        NOT NULL,              -- 'monthly' | 'annual'
  amount_pence  INTEGER     NOT NULL,              -- GBP amount × 100
  stripe_price_id TEXT,                            -- the price_id used (audit trail)
  status        TEXT        NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stripe_sessions_parent_id
  ON public.stripe_sessions (parent_id);

CREATE INDEX IF NOT EXISTS idx_stripe_sessions_status
  ON public.stripe_sessions (status)
  WHERE status = 'pending';

ALTER TABLE public.stripe_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_sessions FORCE ROW LEVEL SECURITY;
-- No policies: RLS denies by default. Service role bypasses RLS.
