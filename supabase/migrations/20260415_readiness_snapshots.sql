-- ═══════════════════════════════════════════════════════════════════════════════
-- LaunchPard Readiness Infrastructure — April 15 2026
--
-- Adds two tables that power the enhanced readiness score and trend charts:
--
--   topic_exam_importance  — exam weight (0-1) per topic per exam type.
--                            Tells the readiness formula that "fractions" matters
--                            more for entrance exams than "poetry appreciation".
--
--   scholar_readiness_snapshot — daily readiness scores per scholar.
--                            Powers the "progress over last 3 months" charts in
--                            parent and proprietor dashboards. Written by the
--                            nightly Edge Function (or on-demand after each quiz).
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. topic_exam_importance ──────────────────────────────────────────────────
-- Stores the importance weight (0.0–1.0) of each topic for a given exam type.
-- A topic with weight=1.0 is critical for the exam; weight=0.2 is minor.
-- Multiply into the readiness formula: topic_readiness × exam_weight.
CREATE TABLE IF NOT EXISTS topic_exam_importance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_slug  TEXT NOT NULL,            -- matches question_bank.topic
  subject     TEXT NOT NULL,            -- 'mathematics', 'english', 'verbal_reasoning', 'nvr'
  exam_type   TEXT NOT NULL,            -- 'secondary_entrance', 'waec', 'bece', etc.
  weight      NUMERIC(3,2) NOT NULL     -- 0.00–1.00; higher = more important for exam
                CHECK (weight >= 0 AND weight <= 1),
  notes       TEXT,                     -- optional: why this weight was chosen
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (topic_slug, subject, exam_type)
);

CREATE INDEX IF NOT EXISTS idx_tei_topic   ON topic_exam_importance(topic_slug);
CREATE INDEX IF NOT EXISTS idx_tei_subject ON topic_exam_importance(subject, exam_type);

-- Seed: Nigerian Primary Secondary Entrance exam weights (Maths, English, VR, NVR)
-- Weight reflects frequency in Nigerian private school entrance papers.
-- Topics with weight=1.0 appear in nearly every paper; 0.3 = minor topics.
INSERT INTO topic_exam_importance (topic_slug, subject, exam_type, weight, notes) VALUES

-- ── Maths (entrance papers heavily test these) ─────────────────────────────
('place_value',           'mathematics', 'secondary_entrance', 1.0, 'Core; every paper'),
('fractions',             'mathematics', 'secondary_entrance', 1.0, 'Core; every paper'),
('addition',              'mathematics', 'secondary_entrance', 0.9, 'Fundamental'),
('subtraction',           'mathematics', 'secondary_entrance', 0.9, 'Fundamental'),
('multiplication',        'mathematics', 'secondary_entrance', 0.9, 'Fundamental'),
('division',              'mathematics', 'secondary_entrance', 0.9, 'Fundamental'),
('decimals',              'mathematics', 'secondary_entrance', 0.8, 'Commonly tested'),
('percentages',           'mathematics', 'secondary_entrance', 0.8, 'Commonly tested'),
('number_bonds',          'mathematics', 'secondary_entrance', 0.7, 'Foundational'),
('ratio_and_proportion',  'mathematics', 'secondary_entrance', 0.7, 'Upper primary'),
('area_and_perimeter',    'mathematics', 'secondary_entrance', 0.7, 'Geometry basics'),
('angles_and_shapes',     'mathematics', 'secondary_entrance', 0.6, 'Geometry'),
('data_handling',         'mathematics', 'secondary_entrance', 0.5, 'Charts & tables'),
('algebra_basics',        'mathematics', 'secondary_entrance', 0.5, 'Upper primary stretch'),
('probability',           'mathematics', 'secondary_entrance', 0.4, 'Less common P4-5'),

-- ── English (comprehension & grammar dominate) ──────────────────────────────
('comprehension',         'english', 'secondary_entrance', 1.0, 'Every entrance paper'),
('grammar',               'english', 'secondary_entrance', 1.0, 'Every entrance paper'),
('vocabulary',            'english', 'secondary_entrance', 0.9, 'Vocabulary in context'),
('sentence_structure',    'english', 'secondary_entrance', 0.9, 'Core grammar'),
('spelling',              'english', 'secondary_entrance', 0.8, 'Spelling tests common'),
('punctuation',           'english', 'secondary_entrance', 0.8, 'Punctuation rules'),
('text_types',            'english', 'secondary_entrance', 0.6, 'Letter / essay forms'),
('inference',             'english', 'secondary_entrance', 0.6, 'Reading between lines'),
('creative_writing',      'english', 'secondary_entrance', 0.5, 'Essay component'),
('vocabulary_in_context', 'english', 'secondary_entrance', 0.5, 'Context clues'),
('authors_purpose',       'english', 'secondary_entrance', 0.3, 'Less common primary'),

-- ── Verbal Reasoning (all topics highly weighted) ───────────────────────────
('synonyms_antonyms',       'verbal_reasoning', 'secondary_entrance', 1.0, 'Very common'),
('word_relationships',      'verbal_reasoning', 'secondary_entrance', 1.0, 'Every VR paper'),
('analogies',               'verbal_reasoning', 'secondary_entrance', 1.0, 'Every VR paper'),
('word_completion',         'verbal_reasoning', 'secondary_entrance', 0.9, 'Common'),
('odd_one_out',             'verbal_reasoning', 'secondary_entrance', 0.9, 'Common'),
('letter_sequences',        'verbal_reasoning', 'secondary_entrance', 0.9, 'Common'),
('hidden_words',            'verbal_reasoning', 'secondary_entrance', 0.8, 'Moderately common'),
('coded_sequences',         'verbal_reasoning', 'secondary_entrance', 0.8, 'Moderately common'),
('double_meanings',         'verbal_reasoning', 'secondary_entrance', 0.7, 'Some papers'),
('word_connections',        'verbal_reasoning', 'secondary_entrance', 0.7, 'Some papers'),

-- ── NVR (spatial reasoning) ─────────────────────────────────────────────────
('odd_shape_out',           'nvr', 'secondary_entrance', 1.0, 'Core NVR'),
('similar_figures',         'nvr', 'secondary_entrance', 1.0, 'Core NVR'),
('pattern_completion',      'nvr', 'secondary_entrance', 1.0, 'Core NVR'),
('symmetry',                'nvr', 'secondary_entrance', 0.9, 'Common'),
('matrices',                'nvr', 'secondary_entrance', 0.9, 'Common'),
('reflection',              'nvr', 'secondary_entrance', 0.8, 'Common'),
('translations',            'nvr', 'secondary_entrance', 0.8, 'Common'),
('figure_classification',   'nvr', 'secondary_entrance', 0.8, 'Common'),
('analogous_figures',       'nvr', 'secondary_entrance', 0.7, 'Upper primary'),
('nets_of_shapes',          'nvr', 'secondary_entrance', 0.7, 'Upper primary'),
('rotations_clockwise_anticlockwise', 'nvr', 'secondary_entrance', 0.6, 'Some papers'),
('cube_views',              'nvr', 'secondary_entrance', 0.6, 'Some papers'),
('spatial_reasoning',       'nvr', 'secondary_entrance', 0.5, 'Advanced'),
('3d_visualization',        'nvr', 'secondary_entrance', 0.5, 'Advanced')

ON CONFLICT (topic_slug, subject, exam_type) DO NOTHING;

-- ── 2. scholar_readiness_snapshot ────────────────────────────────────────────
-- Stores a point-in-time readiness score per scholar.
-- Written after each quiz session (or by nightly batch).
-- Powers: parent progress chart, proprietor trend graph, year-on-year comparison.
CREATE TABLE IF NOT EXISTS scholar_readiness_snapshot (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id      UUID NOT NULL REFERENCES scholars(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  exam_type       TEXT NOT NULL DEFAULT 'secondary_entrance',
  -- Overall and per-subject scores (0-100 integer, nullable if no data yet)
  overall_score   SMALLINT,
  maths_score     SMALLINT,
  english_score   SMALLINT,
  vr_score        SMALLINT,
  nvr_score       SMALLINT,
  -- Grade band at time of snapshot
  grade_band      TEXT,   -- 'Exceptional' | 'Ready' | 'Developing' | 'Needs Support'
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (scholar_id, snapshot_date, exam_type),
  CONSTRAINT chk_snapshot_scores CHECK (
    (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)) AND
    (maths_score   IS NULL OR (maths_score   >= 0 AND maths_score   <= 100)) AND
    (english_score IS NULL OR (english_score >= 0 AND english_score <= 100)) AND
    (vr_score      IS NULL OR (vr_score      >= 0 AND vr_score      <= 100)) AND
    (nvr_score     IS NULL OR (nvr_score     >= 0 AND nvr_score     <= 100))
  )
);

CREATE INDEX IF NOT EXISTS idx_snapshot_scholar      ON scholar_readiness_snapshot(scholar_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_date         ON scholar_readiness_snapshot(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshot_scholar_date ON scholar_readiness_snapshot(scholar_id, snapshot_date DESC);
-- Composite index for class trend queries (join via enrolments)
CREATE INDEX IF NOT EXISTS idx_snapshot_exam_date    ON scholar_readiness_snapshot(exam_type, snapshot_date DESC);

-- RLS: scholars see their own; parents see their children's; teachers see their class
ALTER TABLE scholar_readiness_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_snapshot_scholar ON scholar_readiness_snapshot;
CREATE POLICY rls_snapshot_scholar ON scholar_readiness_snapshot
  FOR SELECT USING (
    scholar_id IN (
      SELECT id FROM scholars WHERE parent_id = auth.uid()
    )
    OR
    scholar_id IN (
      SELECT e.scholar_id FROM enrolments e
      JOIN teacher_assignments ta ON ta.class_id = e.class_id
      WHERE ta.teacher_id = auth.uid()
    )
    OR
    auth.jwt() ->> 'role' = 'service_role'
  );

DROP POLICY IF EXISTS rls_snapshot_service_write ON scholar_readiness_snapshot;
CREATE POLICY rls_snapshot_service_write ON scholar_readiness_snapshot
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ── 3. Materialised helper: school_dashboard_cache ───────────────────────────
-- Lightweight view refreshed nightly. Gives proprietor dashboard sub-10ms loads
-- without re-aggregating across all mastery records on every page view.
-- Populated by the same Edge Function that writes snapshots.
CREATE TABLE IF NOT EXISTS school_dashboard_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id        UUID          REFERENCES classes(id) ON DELETE CASCADE,  -- NULL = school-level row
  cache_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  total_scholars  INT,
  avg_readiness   NUMERIC(5,2),
  pct_ready       NUMERIC(5,2),   -- % with readiness >= 70
  placement_pct   NUMERIC(5,2),   -- admission probability
  refreshed_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (school_id, class_id, cache_date)
);

CREATE INDEX IF NOT EXISTS idx_cache_school ON school_dashboard_cache(school_id, cache_date DESC);

-- ── 4. Validation ─────────────────────────────────────────────────────────────
DO $$
DECLARE cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM topic_exam_importance
  WHERE exam_type = 'secondary_entrance';
  IF cnt < 30 THEN
    RAISE EXCEPTION 'topic_exam_importance seed missing — only % rows', cnt;
  END IF;
  RAISE NOTICE 'Readiness snapshot migration validated: % topic weights seeded.', cnt;
END $$;

COMMIT;
