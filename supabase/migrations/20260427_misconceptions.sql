-- ─── Misconception Registry (#M1) ───────────────────────────────────────────
-- Two tables:
--   misconceptions          — one row per known student misconception per topic
--   question_misconceptions — M2M join: which misconceptions a question addresses
--
-- Generation pipeline: generateQuestionsV2.mjs extracts misconception_ids from
-- the AI response and populates question_misconceptions at insert time.
--
-- Quiz selector: QuizEngine reads misconception_ids for each session question.
-- On wrong answer, any unasked session question sharing the same misconception
-- is promoted to the front of the retry queue before the raw missed-question list.
--
-- Written: 2026-04-27 (session 11)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. misconceptions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.misconceptions (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_slug      TEXT        NOT NULL,      -- e.g. "fractions", "quadratic_equations"
  subject         TEXT        NOT NULL,      -- "mathematics" | "english_language" | etc.
  year_band       TEXT,                      -- "ks1"|"ks2"|"ks3"|"ks4"|"jss"|"sss" | NULL (cross-band)
  label           TEXT        NOT NULL,      -- short human-readable name, e.g. "Fraction = part only"
  description     TEXT,                      -- one-sentence explanation of the misconception
  common_trigger  TEXT,                      -- the type of question or context that reveals it
  remediation_hint TEXT,                     -- what a correct response should emphasise
  source          TEXT DEFAULT 'ai_generated', -- 'ai_generated' | 'manual' | 'research'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (topic_slug, subject, year_band, label)
);

COMMENT ON TABLE public.misconceptions IS
  'Registry of known student misconceptions per topic/subject/year-band. '
  'Populated at question generation time and used by the quiz selector '
  'to queue misconception-targeted retries on wrong answers.';

-- Index: selector looks up by topic + subject at quiz load time
CREATE INDEX IF NOT EXISTS idx_misconceptions_topic_subject
  ON public.misconceptions (topic_slug, subject);

CREATE INDEX IF NOT EXISTS idx_misconceptions_year_band
  ON public.misconceptions (year_band)
  WHERE year_band IS NOT NULL;

-- ── 2. question_misconceptions (join) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.question_misconceptions (
  question_id     UUID        NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
  misconception_id UUID       NOT NULL REFERENCES public.misconceptions(id) ON DELETE CASCADE,
  relevance       NUMERIC(4, 3) DEFAULT 1.0, -- 0.0–1.0 how strongly this question tests this misconception
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (question_id, misconception_id)
);

COMMENT ON TABLE public.question_misconceptions IS
  'M2M join between question_bank and misconceptions. '
  'A question can address multiple misconceptions; a misconception can be '
  'tested by multiple questions. Relevance score allows the selector to '
  'prioritise the most diagnostic question for each misconception.';

CREATE INDEX IF NOT EXISTS idx_qm_misconception_id
  ON public.question_misconceptions (misconception_id);

-- ── 3. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.misconceptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_misconceptions ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users (quiz selector queries these)
CREATE POLICY "auth_read_misconceptions" ON public.misconceptions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_read_question_misconceptions" ON public.question_misconceptions
  FOR SELECT TO authenticated USING (true);

-- Service role writes (generator + admin only)
REVOKE INSERT, UPDATE, DELETE ON public.misconceptions          FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.question_misconceptions FROM authenticated, anon;

-- ─── Verification ─────────────────────────────────────────────────────────────
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('misconceptions', 'question_misconceptions');
-- Expected: 2 rows
-- ─────────────────────────────────────────────────────────────────────────────
