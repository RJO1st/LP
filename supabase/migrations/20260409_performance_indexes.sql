-- Migration: Performance indexes for hot-path queries
-- Created: 2026-04-09
-- Purpose: Optimize question_bank and scholar_topic_mastery for frequently-accessed
--          filter patterns in smartQuestionSelection.js hot paths.

-- ────────────────────────────────────────────────────────────────────────────────
-- QUESTION_BANK COMPOSITE INDEXES
-- ────────────────────────────────────────────────────────────────────────────────
-- The primary hot path in fetchQuestions() filters on:
--   curriculum, subject, is_active=true, year_level (range), and optionally
--   topic_slug, difficulty_tier.
-- These composite indexes cover the full filter set for fast index-only scans.

-- Primary: (curriculum, subject, is_active) → covers year_level range scan
CREATE INDEX IF NOT EXISTS idx_question_bank_curriculum_subject_active
  ON question_bank (curriculum, subject, is_active)
  WHERE is_active = true;

-- Secondary: (curriculum, subject, year_level, is_active) for scholars within specific year range
CREATE INDEX IF NOT EXISTS idx_question_bank_curriculum_subject_year_active
  ON question_bank (curriculum, subject, year_level, is_active)
  WHERE is_active = true;

-- Tertiary: (curriculum, subject, topic_slug, is_active, difficulty_tier)
-- Trailing columns improve selectivity when topic and tier filters are combined.
CREATE INDEX IF NOT EXISTS idx_question_bank_curriculum_subject_topic_tier
  ON question_bank (curriculum, subject, topic_slug, is_active, difficulty_tier)
  WHERE is_active = true;

-- Year-wide index: (curriculum, subject, year_level) supporting range queries
-- Used in fetchQuestions yearLow/yearHigh filters.
CREATE INDEX IF NOT EXISTS idx_question_bank_curriculum_subject_year
  ON question_bank (curriculum, subject, year_level)
  WHERE is_active = true;

-- ────────────────────────────────────────────────────────────────────────────────
-- SCHOLAR_TOPIC_MASTERY INDEXES
-- ────────────────────────────────────────────────────────────────────────────────
-- Hot path in loadScholarContext() queries scholar_topic_mastery filtered by
--   scholar_id + curriculum. The combination is a frequent lookup pattern.

-- Primary: (scholar_id, curriculum) — covers loadScholarContext() filter
CREATE INDEX IF NOT EXISTS idx_scholar_topic_mastery_scholar_curriculum
  ON scholar_topic_mastery (scholar_id, curriculum);

-- Secondary: (scholar_id, topic_slug) — used in resolveAnchorTopic() grouping
CREATE INDEX IF NOT EXISTS idx_scholar_topic_mastery_scholar_topic
  ON scholar_topic_mastery (scholar_id, topic_slug);

-- ────────────────────────────────────────────────────────────────────────────────
-- CURRICULUM_STANDARDS INDEXES
-- ────────────────────────────────────────────────────────────────────────────────
-- Support fetchStandardsForPath() which filters on curriculum_id + subject + year_level

CREATE INDEX IF NOT EXISTS idx_curriculum_standards_curriculum_subject_year
  ON curriculum_standards (curriculum_id, subject, year_level);

-- ────────────────────────────────────────────────────────────────────────────────
-- CURRICULUM_COVERAGE_STATS INDEXES
-- ────────────────────────────────────────────────────────────────────────────────
-- Support fetchStandardsForPath() coverage gap lookups

CREATE INDEX IF NOT EXISTS idx_curriculum_coverage_stats_curriculum_subject
  ON curriculum_coverage_stats (curriculum_id, subject);

-- ────────────────────────────────────────────────────────────────────────────────
-- UPDATE TABLE STATISTICS
-- ────────────────────────────────────────────────────────────────────────────────
-- Ensure the query planner picks up the new indexes for cost estimation.

ANALYZE question_bank;
ANALYZE scholar_topic_mastery;
ANALYZE curriculum_standards;
ANALYZE curriculum_coverage_stats;
