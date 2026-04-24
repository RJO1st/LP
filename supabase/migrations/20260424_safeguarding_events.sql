-- Safeguarding event audit log (persistent, GDPR-aware)
-- Records crisis/concerning/off-topic events with limited text preview for audit and parent notification
CREATE TABLE IF NOT EXISTS safeguarding_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   TEXT NOT NULL,  -- 'crisis' | 'concerning' | 'off_topic'
  scholar_id   UUID REFERENCES scholars(id) ON DELETE SET NULL,
  age_band     TEXT,           -- 'ks1' | 'ks2' | 'ks3' | 'ks4'
  text_preview TEXT,           -- first 80 chars of input (GDPR: not full text)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE safeguarding_events ENABLE ROW LEVEL SECURITY;
-- Only service role can read/write (routes use service role key)
CREATE POLICY "service_role_only" ON safeguarding_events USING (false);

-- Index for queries by scholar and timestamp (ascending for recent events)
CREATE INDEX idx_safeguarding_events_scholar ON safeguarding_events(scholar_id, created_at DESC);

-- Index for queries by event type and timestamp (for audit/dashboard filtering)
CREATE INDEX idx_safeguarding_events_type ON safeguarding_events(event_type, created_at DESC);
