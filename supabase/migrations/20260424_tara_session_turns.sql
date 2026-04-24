-- Tara session turn tracking (server-side, replaces client-supplied turnCount)
-- Prevents malicious clients from bypassing the 20-turn session limit by sending turnCount: 0 repeatedly
CREATE TABLE IF NOT EXISTS tara_turns (
  session_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id  UUID REFERENCES scholars(id) ON DELETE CASCADE,
  turn_count  INT NOT NULL DEFAULT 1,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: service role only (Tara route uses service role key)
ALTER TABLE tara_turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON tara_turns USING (false);

-- Index for session lookup by session_id
CREATE INDEX idx_tara_turns_session ON tara_turns(session_id);

-- Index for cleanup queries (find old sessions by scholar and last_seen)
CREATE INDEX idx_tara_turns_scholar ON tara_turns(scholar_id, last_seen DESC);
