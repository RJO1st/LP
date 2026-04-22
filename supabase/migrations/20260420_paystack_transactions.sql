-- ─────────────────────────────────────────────────────────────────────────────
-- paystack_transactions
-- Stores pending/completed Paystack references so the webhook can reliably
-- match a charge.success event to the correct parent + plan details, even if
-- Paystack truncates the custom metadata field.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS paystack_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference      TEXT NOT NULL UNIQUE,
  parent_id      UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  plan           TEXT NOT NULL DEFAULT 'ng_scholar',
  billing        TEXT NOT NULL DEFAULT 'monthly' CHECK (billing IN ('monthly', 'annual')),
  addons         TEXT[] NOT NULL DEFAULT '{}',
  amount_kobo    INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ
);

-- Index for webhook lookups by reference
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_reference
  ON paystack_transactions (reference);

-- Index for listing a parent's transactions
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_parent
  ON paystack_transactions (parent_id, created_at DESC);

-- RLS: parents can read their own rows; service role writes
ALTER TABLE paystack_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can read own transactions"
  ON paystack_transactions
  FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

-- Service role bypasses RLS — no INSERT/UPDATE policy needed for the webhook.
