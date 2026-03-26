-- ═══════════════════════════════════════════════════════════════════════════════
-- Learning Commons Documents — tldraw canvas persistence
-- Deploy to: Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Table: learning_commons_documents ────────────────────────────────────────
-- Stores tldraw canvas snapshots for the Learning Commons feature.
-- Each scholar can have multiple documents (mind maps, diagrams, notes, etc.)

CREATE TABLE IF NOT EXISTS learning_commons_documents (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scholar_id    UUID NOT NULL REFERENCES scholars(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'Untitled',
  doc_type      TEXT NOT NULL DEFAULT 'blank',       -- blank, mind_map, notes, diagram, revision
  canvas_data   JSONB DEFAULT '{}'::jsonb,           -- tldraw store snapshot (full JSON)
  element_count INTEGER DEFAULT 0,                   -- cached count of shapes for gallery display
  thumbnail_url TEXT,                                 -- optional: rendered PNG thumbnail URL
  is_shared     BOOLEAN DEFAULT FALSE,                -- future: peer sharing
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lc_docs_scholar
  ON learning_commons_documents (scholar_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_lc_docs_shared
  ON learning_commons_documents (is_shared)
  WHERE is_shared = TRUE;

-- ── Row-level security ───────────────────────────────────────────────────────
ALTER TABLE learning_commons_documents ENABLE ROW LEVEL SECURITY;

-- Scholars can only see/edit their own documents
CREATE POLICY "scholars_own_docs" ON learning_commons_documents
  FOR ALL
  USING (auth.uid() = scholar_id)
  WITH CHECK (auth.uid() = scholar_id);

-- Parents can view their child's documents (read-only)
-- This uses the existing parent_scholar_link table
CREATE POLICY "parents_view_child_docs" ON learning_commons_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parent_scholar_link
      WHERE parent_scholar_link.scholar_id = learning_commons_documents.scholar_id
        AND parent_scholar_link.parent_id = auth.uid()
    )
  );

-- ── Updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_lc_docs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_lc_docs_updated_at
  BEFORE UPDATE ON learning_commons_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_lc_docs_updated_at();

-- ── Gamification: Learning Commons badges ────────────────────────────────────
-- These are tracked client-side via gamificationEngine.js, but we add
-- a view for easy querying of scholar creation stats.

CREATE OR REPLACE VIEW scholar_commons_stats AS
SELECT
  scholar_id,
  COUNT(*) AS total_documents,
  SUM(element_count) AS total_elements,
  MAX(updated_at) AS last_activity,
  COUNT(*) FILTER (WHERE doc_type = 'mind_map') AS mind_maps,
  COUNT(*) FILTER (WHERE doc_type = 'diagram') AS diagrams,
  COUNT(*) FILTER (WHERE doc_type = 'notes') AS visual_notes,
  COUNT(*) FILTER (WHERE doc_type = 'revision') AS revision_cards
FROM learning_commons_documents
GROUP BY scholar_id;
