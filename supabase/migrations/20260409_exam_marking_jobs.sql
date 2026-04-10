-- Migration: 20260409_exam_marking_jobs
-- Purpose: Add background marking job queue infrastructure for Tier 3 exam marking
-- Adds: exam_marking_jobs table, indexes, triggers, pg_cron extension
-- Timing: 2026-04-09

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── MAIN TABLE ──────────────────────────────────────────────────────────────

/**
 * exam_marking_jobs: Queue of Tier 3 marking jobs.
 *
 * Each row represents one exam sitting's Tier 3 marking task. The job is queued
 * immediately after Tier 1+2 sync marking completes. A Supabase Edge Function
 * triggered by pg_cron processes queued jobs, acquiring an advisory lock to
 * prevent concurrent marking of the same sitting.
 *
 * Lifecycle:
 *   1. INSERT with status='queued' immediately after exam submitted
 *   2. Edge Function picks up job, acquires lock, updates status='running'
 *   3. On success: status='completed', finished_at=NOW()
 *   4. On error (retryable): status='queued', scheduled_at=NOW() + exponential backoff
 *   5. On error (non-retryable or max_attempts exceeded): status='failed'
 *   6. After 30 days: DELETE (cleanup job)
 *
 * Fields:
 *   - id: Unique job ID (UUID)
 *   - sitting_id: FK to exam_sittings (UNIQUE + ON DELETE CASCADE)
 *   - status: Current state (queued, running, completed, failed, cancelled)
 *   - tier_scope: Which tiers this job covers (default [3] for Tier 3 only, but
 *                 system is designed to support [1,2] or [1,2,3] in future)
 *   - attempts: Number of processing attempts so far
 *   - max_attempts: Maximum retries before job is marked failed (default: 3)
 *   - scheduled_at: When this job should next be processed (NOW() for immediate,
 *                   future timestamp for backoff retry)
 *   - started_at: Timestamp when worker first picked up this job
 *   - finished_at: Timestamp when job completed (either successfully or failed)
 *   - error: JSONB with { code: string, message: string, details?: string }
 *   - progress: JSONB tracking partial completion
 *            { questionsTotal: int, questionsMarked: int, lastMarkedAt?: ISO8601 }
 *   - created_at: Job creation timestamp
 *   - updated_at: Last update timestamp (maintained by trigger)
 */
CREATE TABLE IF NOT EXISTS exam_marking_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sitting_id UUID NOT NULL UNIQUE REFERENCES exam_sittings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  tier_scope INT[] NOT NULL DEFAULT ARRAY[3],
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error JSONB,
  progress JSONB DEFAULT '{"questionsTotal": 0, "questionsMarked": 0}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_progress CHECK (
    (progress IS NULL) OR
    (progress->>'questionsTotal' IS NOT NULL AND progress->>'questionsMarked' IS NOT NULL)
  )
);

COMMENT ON TABLE exam_marking_jobs IS
  'Background marking job queue for Tier 3 (AI) exam marking. ' ||
  'Processed asynchronously by Supabase Edge Function mark-exam-sitting triggered by pg_cron. ' ||
  'Each job maps 1:1 with an exam_sittings row.';

-- ─── INDEXES ────────────────────────────────────────────────────────────────

-- Primary dispatch index: find next jobs to process
CREATE INDEX IF NOT EXISTS idx_exam_marking_jobs_dispatchable
  ON exam_marking_jobs (status, scheduled_at)
  WHERE status IN ('queued', 'running');

COMMENT ON INDEX idx_exam_marking_jobs_dispatchable IS
  'Fast dispatch: workers query WHERE status IN (queued, running) ORDER BY scheduled_at ASC LIMIT N';

-- Sitting lookup: quick check if sitting already has job
CREATE INDEX IF NOT EXISTS idx_exam_marking_jobs_sitting_id
  ON exam_marking_jobs (sitting_id);

-- Recent jobs: analytics and debugging
CREATE INDEX IF NOT EXISTS idx_exam_marking_jobs_created_at_desc
  ON exam_marking_jobs (created_at DESC);

-- Completed jobs: for cleanup routine
CREATE INDEX IF NOT EXISTS idx_exam_marking_jobs_completed
  ON exam_marking_jobs (finished_at)
  WHERE status = 'completed';

-- ─── TRIGGER: auto-update updated_at ────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_exam_marking_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exam_marking_jobs_updated_at ON exam_marking_jobs;

CREATE TRIGGER trg_exam_marking_jobs_updated_at
BEFORE UPDATE ON exam_marking_jobs
FOR EACH ROW
EXECUTE FUNCTION update_exam_marking_jobs_updated_at();

-- ─── pg_cron SCHEDULE (commented: manual setup required) ──────────────────

/**
 * pg_cron schedule for mark-exam-sitting Edge Function.
 *
 * This must be manually configured after the Edge Function is deployed,
 * because pg_cron needs the full HTTPS URL of the function.
 *
 * Command to run (replace {FUNCTION_URL} with actual Supabase function URL):
 *
 *   SELECT cron.schedule(
 *     'mark-exam-sitting-worker',
 *     '*/30 * * * * *',
 *     format('SELECT net.http_post(%L, %L::jsonb)', %L, '{}')
 *   );
 *
 * Where:
 *   - '*/30 * * * * *' = every 30 seconds (cron with seconds, per pg_cron v1.3+)
 *   - {FUNCTION_URL} = e.g., 'https://xyzproject.supabase.co/functions/v1/mark-exam-sitting'
 *
 * Verify schedule with:
 *   SELECT * FROM cron.job WHERE jobname = 'mark-exam-sitting-worker';
 *
 * To disable:
 *   SELECT cron.unschedule('mark-exam-sitting-worker');
 */

-- ─── INITIAL DATA (none) ────────────────────────────────────────────────────

-- exam_marking_jobs table is empty on creation. Rows inserted by marking endpoint
-- and processed by Edge Function worker. Old rows cleaned up by retention policy.
