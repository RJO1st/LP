-- ════════════════════════════════════════════════════════════════════════════════
-- LaunchPard — DB Purge & Visual Infrastructure Setup
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ════════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ PART 1: RECONNAISSANCE — Run these first to understand what you're purging │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 1a. Count all questions by source/batch
SELECT
  CASE
    WHEN batch_id LIKE 'backfill-%' THEN 'backfill.sh'
    WHEN batch_id IS NOT NULL       THEN 'batch-generate-cron'
    ELSE 'on-the-fly / manual'
  END AS source,
  curriculum,
  COUNT(*) AS total,
  MIN(created_at) AS earliest,
  MAX(created_at) AS latest
FROM question_bank
GROUP BY 1, 2
ORDER BY 1, 2;

-- 1b. Find "look at" questions that reference visuals but have no image
SELECT id, curriculum, subject, year_level, question_text, image_url
FROM question_bank
WHERE question_text ~* '(look at|the diagram|the graph|the chart|the table|the picture|the image|the map|the drawing|shown below|shown above|figure \d|fig\.\s*\d)'
  AND (image_url IS NULL OR image_url = '')
ORDER BY curriculum, subject, year_level
LIMIT 50;

-- 1c. Count questions with broken answer indices (answer points outside opts range)
SELECT curriculum, subject, COUNT(*) AS broken_count
FROM question_bank
WHERE question_data IS NOT NULL
  AND (question_data::jsonb->>'a')::int NOT BETWEEN 0 AND 3
  AND (question_data::jsonb->>'question_type') IN ('mcq', 'fill_blank')
GROUP BY 1, 2
ORDER BY broken_count DESC;

-- 1d. Count old backfill.sh questions that may have gate issues (WAEC SS with basic maths)
SELECT curriculum, subject, year_level, difficulty_tier, COUNT(*) AS total
FROM question_bank
WHERE batch_id LIKE 'backfill-%'
  AND curriculum IN ('ng_sss', 'ng_jss')
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, 3, 4;


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ PART 2: PURGE — Delete bad questions (run AFTER reviewing Part 1 results)  │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 2a. Delete ALL old backfill.sh questions (they have broken gate logic)
-- The new batch-generate crons will replenish with properly-gated content.
-- ⚠️  UNCOMMENT TO RUN — this is destructive
/*
DELETE FROM question_bank
WHERE batch_id LIKE 'backfill-%';
*/

-- 2b. Delete questions with broken answer indices
/*
DELETE FROM question_bank
WHERE question_data IS NOT NULL
  AND (question_data::jsonb->>'question_type') IN ('mcq', 'fill_blank')
  AND (
    (question_data::jsonb->>'a')::int < 0
    OR (question_data::jsonb->>'a')::int > 3
    OR (question_data::jsonb->'opts') IS NULL
    OR jsonb_array_length(question_data::jsonb->'opts') != 4
  );
*/

-- 2c. Delete questions that reference visuals they don't have
-- Strategy: delete ONLY those with STRONG visual dependency (the question is
-- meaningless without the visual). Keep ones that merely mention visual concepts
-- but can still be answered from text alone.
-- ⚠️  UNCOMMENT TO RUN — this is destructive
/*
DELETE FROM question_bank
WHERE question_text ~* '(look at the|shown below|shown above|see the diagram|the picture shows|the graph shows|refer to the (diagram|chart|map|table|figure)|in the (picture|image|figure) (below|above))'
  AND (image_url IS NULL OR image_url = '')
  AND visual_status != 'generated'
  AND question_data::jsonb->>'svg_content' IS NULL;
*/

-- 2c-ALT. SOFTER approach: Instead of deleting, rewrite the visual references out
-- This preserves the question but removes the "look at" language
-- Run this INSTEAD of 2c if you want to keep the questions
/*
UPDATE question_bank
SET question_text = regexp_replace(
  question_text,
  '(Look at the (diagram|graph|chart|picture|image|map|table|drawing|figure)[^.]*\.\s*)',
  '',
  'gi'
),
visual_status = 'none',
needs_visual = false
WHERE question_text ~* '(look at the|shown below|shown above|see the diagram|the picture shows|the graph shows)'
  AND (image_url IS NULL OR image_url = '')
  AND visual_status != 'generated';
*/

-- 2d. Delete duplicate questions (keep the newest, delete older copies)
/*
DELETE FROM question_bank a
USING question_bank b
WHERE a.id < b.id
  AND a.curriculum = b.curriculum
  AND a.subject = b.subject
  AND a.year_level = b.year_level
  AND lower(regexp_replace(a.question_text, '[^a-z0-9]', '', 'gi'))
    = lower(regexp_replace(b.question_text, '[^a-z0-9]', '', 'gi'));
*/


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ PART 3: VISUAL INFRASTRUCTURE — Add columns for image pipeline             │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 3a. Add image support columns (safe — won't fail if columns already exist)
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS image_type TEXT;       -- 'graph', 'diagram', 'illustration', 'map', 'photo', 'chart'
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS needs_visual BOOLEAN DEFAULT false;
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS visual_prompt TEXT;    -- stored prompt for regeneration/auditing
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS visual_status TEXT DEFAULT 'none'; -- 'none', 'pending', 'generated', 'failed'

-- 3b. Index for the visual generation cron to find pending work efficiently
CREATE INDEX IF NOT EXISTS idx_qb_visual_pending
  ON question_bank (visual_status)
  WHERE visual_status = 'pending';

-- 3c. Index for SmartQuestionSelection to prefer questions WITH visuals
CREATE INDEX IF NOT EXISTS idx_qb_has_image
  ON question_bank (curriculum, subject, year_level)
  WHERE image_url IS NOT NULL;


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ PART 4: FLAG QUESTIONS THAT NEED VISUALS                                   │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 4a. Flag questions that explicitly reference a visual ("look at", "diagram", etc.)
UPDATE question_bank
SET needs_visual = true,
    visual_status = 'pending',
    image_type = CASE
      WHEN question_text ~* '(graph|parabola|quadratic|axes|coordinate|plot)' THEN 'graph'
      WHEN question_text ~* '(map|continent|country|region|ocean)' THEN 'map'
      WHEN question_text ~* '(diagram|circuit|cell|organ|skeleton|food chain)' THEN 'diagram'
      WHEN question_text ~* '(chart|bar chart|pie chart|histogram|tally)' THEN 'chart'
      WHEN question_text ~* '(table|data table|timetable|frequency)' THEN 'data_table'
      WHEN question_text ~* '(picture|photo|image|illustration)' THEN 'illustration'
      ELSE 'diagram'
    END
WHERE (image_url IS NULL OR image_url = '')
  AND question_text ~* '(look at|the diagram|the graph|the chart|the table|the picture|the image|the map|the drawing|shown below|shown above|figure \d)'
  AND visual_status != 'generated';

-- 4b. Flag science questions that benefit from diagrams (even without "look at")
UPDATE question_bank
SET needs_visual = true,
    visual_status = CASE WHEN visual_status = 'none' THEN 'pending' ELSE visual_status END,
    image_type = 'diagram'
WHERE subject IN ('science', 'basic_science', 'biology', 'chemistry', 'physics')
  AND (image_url IS NULL OR image_url = '')
  AND visual_status NOT IN ('generated', 'pending')
  AND question_text ~* '(cell|organ|skeleton|food chain|circuit|magnet|solar system|water cycle|rock cycle|photosynthesis|respiration|digestion|heart|lung|atom|molecule|element|periodic|force|lever|pulley|gear|plant|root|stem|leaf|flower)'
  AND year_level >= 3;

-- 4c. Flag geography questions that benefit from maps
UPDATE question_bank
SET needs_visual = true,
    visual_status = CASE WHEN visual_status = 'none' THEN 'pending' ELSE visual_status END,
    image_type = 'map'
WHERE subject IN ('geography', 'hass', 'social_studies')
  AND (image_url IS NULL OR image_url = '')
  AND visual_status NOT IN ('generated', 'pending')
  AND question_text ~* '(continent|country|capital|ocean|river|mountain|desert|equator|hemisphere|latitude|longitude|climate zone|tectonic|volcano|earthquake)'
  AND year_level >= 2;

-- 4d. Flag maths questions that benefit from graphs (algebra, coordinate, statistics)
UPDATE question_bank
SET needs_visual = true,
    visual_status = CASE WHEN visual_status = 'none' THEN 'pending' ELSE visual_status END,
    image_type = 'graph'
WHERE subject IN ('mathematics', 'math', 'maths')
  AND (image_url IS NULL OR image_url = '')
  AND visual_status NOT IN ('generated', 'pending')
  AND question_text ~* '(graph|plot|coordinate|equation.*line|quadratic|parabola|bar chart|pie chart|histogram|scatter|frequency|y\s*=\s*|simultaneous)'
  AND year_level >= 5;


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ PART 5: MONITORING QUERIES — Run anytime to check visual pipeline status   │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- 5a. Visual pipeline dashboard
SELECT
  visual_status,
  image_type,
  COUNT(*) AS total
FROM question_bank
WHERE needs_visual = true
GROUP BY 1, 2
ORDER BY 1, 2;

-- 5b. Questions with images vs without
SELECT
  curriculum,
  subject,
  COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '') AS with_image,
  COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') AS without_image,
  ROUND(100.0 * COUNT(*) FILTER (WHERE image_url IS NOT NULL AND image_url != '') / COUNT(*), 1) AS pct_with_image
FROM question_bank
GROUP BY 1, 2
ORDER BY pct_with_image ASC;

-- 5c. Still-broken "look at" questions (should trend to 0)
SELECT COUNT(*) AS orphan_visual_refs
FROM question_bank
WHERE question_text ~* '(look at|shown below|shown above|see the diagram)'
  AND (image_url IS NULL OR image_url = '')
  AND visual_status != 'generated';
