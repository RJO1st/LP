# mark-exam-sitting Edge Function

Supabase Edge Function for asynchronous Tier 3 (AI) exam marking. Processes queued jobs from the `exam_marking_jobs` table, invokes GPT-4o marking for extended responses/essays, and updates `exam_answers` with marks awarded.

## File Structure

```
supabase/functions/mark-exam-sitting/
├── index.ts         HTTP handler: accepts POST, dispatches to worker
├── worker.ts        Async marking logic: processMarkingJob, retryFailedJobs, cleanupOldJobs
├── lock.ts          Postgres advisory lock utilities for mutual exclusion
└── README.md        This file
```

## Environment Variables

Required (set in Supabase project settings):

- **SUPABASE_URL**: Supabase project URL (e.g., `https://xyz.supabase.co`)
- **SUPABASE_SERVICE_ROLE_KEY**: Service role key for bypassing RLS
- **OPENAI_API_KEY**: OpenAI API key for GPT-4o calls (TODO: used by markingEngine Tier 3)

## Deployment

### Prerequisites

1. Supabase CLI installed: `npm install -g @supabase/cli`
2. Authenticated with Supabase: `supabase login`
3. Project ID available
4. Environment variables set in Supabase dashboard

### Deploy Function

```bash
cd /path/to/quest-academy-main

supabase functions deploy mark-exam-sitting \
  --project-id {PROJECT_ID}
```

The function URL will be printed:
```
Deployed to: https://{PROJECT_ID}.supabase.co/functions/v1/mark-exam-sitting
```

### Configure pg_cron Schedule

After deployment, enable pg_cron trigger in Supabase dashboard (SQL editor):

```sql
SELECT cron.schedule(
  'mark-exam-sitting-worker',
  '*/30 * * * * *',
  'SELECT net.http_post(
    ''https://{PROJECT_ID}.supabase.co/functions/v1/mark-exam-sitting'',
    ''{}''::jsonb,
    headers := jsonb_build_object(''Authorization'', ''Bearer {ANON_KEY}'')
  )'
);
```

**Notes:**
- Replace `{PROJECT_ID}` with your Supabase project ID
- Replace `{ANON_KEY}` with your `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public key)
- `*/30 * * * * *` = every 30 seconds (requires pg_cron v1.3+ for seconds support)
- Verify schedule: `SELECT * FROM cron.job WHERE jobname = 'mark-exam-sitting-worker';`
- Disable: `SELECT cron.unschedule('mark-exam-sitting-worker');`

## Local Testing

### Run Locally with Supabase Emulator

```bash
# Start Supabase local environment
supabase start

# Deploy function to local
supabase functions deploy mark-exam-sitting --no-verify-jwt

# Test with curl (manual trigger)
curl -X POST http://localhost:54321/functions/v1/mark-exam-sitting \
  -H 'Content-Type: application/json' \
  -d '{}' 

# Or with specific job ID
curl -X POST http://localhost:54321/functions/v1/mark-exam-sitting \
  -H 'Content-Type: application/json' \
  -d '{"jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"}'
```

### Seed Test Data

Insert a test exam sitting and job:

```sql
-- Create test scholar
INSERT INTO scholars (id, parent_id, name, curriculum, current_year_level, avatar)
VALUES ('scholar-test-id', 'parent-id', 'Test Scholar', 'uk_national', 10, '{}')
ON CONFLICT DO NOTHING;

-- Create test exam paper
INSERT INTO exam_papers (id, exam_board, exam_type, subject, tier, year, session, total_marks, duration_minutes, status)
VALUES ('paper-test-id', 'aqa', 'gcse', 'mathematics', 'foundation', 2024, 'june', 80, 60, 'published')
ON CONFLICT DO NOTHING;

-- Create test exam sitting
INSERT INTO exam_sittings (id, scholar_id, exam_paper_id, status, total_marks_available, mode)
VALUES ('sitting-test-id', 'scholar-test-id', 'paper-test-id', 'completed', 80, 'timed')
ON CONFLICT DO NOTHING;

-- Create test job
INSERT INTO exam_marking_jobs (id, sitting_id, status, tier_scope, max_attempts, scheduled_at)
VALUES (
  'job-test-id',
  'sitting-test-id',
  'queued',
  ARRAY[3],
  3,
  NOW()
)
ON CONFLICT (sitting_id) DO NOTHING;

-- Verify
SELECT * FROM exam_marking_jobs WHERE id = 'job-test-id';
```

Then trigger the function and check logs.

## Monitoring

### Check Job Status

```sql
-- List all jobs
SELECT id, sitting_id, status, attempts, progress, error, created_at
FROM exam_marking_jobs
ORDER BY created_at DESC
LIMIT 20;

-- List queued jobs
SELECT id, sitting_id, scheduled_at FROM exam_marking_jobs
WHERE status IN ('queued', 'running')
ORDER BY scheduled_at ASC;

-- List failed jobs
SELECT id, sitting_id, attempts, error, finished_at
FROM exam_marking_jobs
WHERE status = 'failed'
ORDER BY finished_at DESC;
```

### View pg_cron Logs

```sql
-- See cron job schedule
SELECT * FROM cron.job;

-- View cron execution history (requires pg_cron logging enabled)
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

### View Function Logs (Supabase Dashboard)

1. Go to: **Functions** → **mark-exam-sitting** → **Logs**
2. Filter by timestamp, status, error
3. Check for cold-start latency, timeout errors, concurrent processing

## Performance Tuning

### Latency Targets

- Cold start (first invocation): <5s (Deno startup overhead)
- Warm invocation: <500ms (skip Deno init, just handler)
- Tier 3 per question: 2-5s (OpenAI latency)
- Job dispatch to processing: <30s (next cron tick)

### Scaling

- **Cron frequency**: Currently every 30s. Can reduce to 10s if queue depth > 100.
- **Questions per invocation**: `QUESTIONS_PER_INVOCATION = 3` (in worker.ts). Can increase to 5 if latency permits.
- **Concurrent workers**: Postgres advisory locks ensure only 1 worker per sitting. Multiple cron invocations can process different sittings in parallel.

### Monitoring Queue Depth

```sql
SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest_job,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_age_seconds
FROM exam_marking_jobs
WHERE status IN ('queued', 'running')
GROUP BY status;
```

If queue depth grows, increase cron frequency or questions per invocation.

## Troubleshooting

### Function Returns 500 Error

1. Check env vars are set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
2. Verify function deployed: `supabase functions list --project-id {PROJECT_ID}`
3. Check function logs in Supabase dashboard
4. Test with curl manually (see Local Testing section)

### Jobs Stuck in 'running' State

Likely crashed during processing. Check logs, then manually fix:

```sql
-- Reset stuck job to 'queued'
UPDATE exam_marking_jobs
SET status = 'queued', started_at = NULL
WHERE id = '{JOB_ID}';
```

### pg_cron Not Triggering

1. Verify schedule is enabled: `SELECT * FROM cron.job WHERE jobname = 'mark-exam-sitting-worker';`
2. Check if pg_cron extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
3. Verify Supabase project supports cron (standard on all projects)
4. Check network logs for HTTP errors from function invocation

### Tier 3 Marking Not Working

- Placeholder implementation in worker.ts processes answers but marks them as 0
- TODO: Implement real Tier 3 marking via `markingEngine.tier3Mark()` (see worker.ts comments)
- Will require importing marking engine logic (currently in Next.js server code)

## Future Work

1. **Extract markingEngine to shared package**: Currently Tier 3 logic lives in Next.js. Extract to `packages/marking-engine` so Edge Function can import it.
2. **Add structured error codes**: Distinguish retryable vs. non-retryable errors (network timeout vs. invalid input).
3. **Implement dashboard**: Admin UI to monitor job queue, retry failed jobs, view completion stats.
4. **Add webhook callback**: Notify ExamResults UI via webhook when marking completes (instead of polling).
5. **Batch processing optimization**: If queue exceeds threshold, spawn multiple workers in parallel per cron tick.
6. **Cost tracking**: Log OpenAI token usage per job for billing/monitoring.
