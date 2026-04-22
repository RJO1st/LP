-- ─── Webhook event replay ledger (Paystack) ────────────────────────────────
-- Every Paystack webhook we process gets claimed in this table. The unique
-- PRIMARY KEY on event_id is the replay guard: if Paystack re-delivers, the
-- INSERT fails with 23505 and the handler returns {received:true, replay:true}
-- without touching `parents`.
--
-- Access model:
--   - Service role writes (from /api/paystack/webhook).
--   - RLS is enabled + FORCED, with NO policies. Anon and authenticated
--     clients cannot read or write. Only SUPABASE_SERVICE_ROLE_KEY bypasses.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.paystack_events (
  event_id    TEXT        PRIMARY KEY,
  event_type  TEXT        NOT NULL,
  reference   TEXT,
  payload     JSONB       NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paystack_events_reference
  ON public.paystack_events (reference)
  WHERE reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_paystack_events_received_at
  ON public.paystack_events (received_at DESC);

ALTER TABLE public.paystack_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paystack_events FORCE ROW LEVEL SECURITY;

-- No policies: RLS denies by default. Service role bypasses RLS.

-- ─── Webhook event replay ledger (Stripe) ───────────────────────────────────
-- Same pattern, ready for when the UK Stripe route lands.
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id    TEXT        PRIMARY KEY,
  event_type  TEXT        NOT NULL,
  reference   TEXT,
  payload     JSONB       NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_received_at
  ON public.stripe_events (received_at DESC);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events FORCE ROW LEVEL SECURITY;
