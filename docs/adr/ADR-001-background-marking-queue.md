# ADR-001: Background Marking Queue for Tier 3 Exam Marking

## Status
Proposed

## Date
2026-04-09

## Deciders
LaunchPard Engineering Team

## Context

### The Problem
The current GCSE exam marking system (Part 21) uses a synchronous 3-tier architecture:
- **Tier 1 (Deterministic)**: MCQ index matching, numeric ±0.5%, Levenshtein typo fix (<50ms per question)
- **Tier 2 (Rule-Based)**: Fuzzy matching, method marks, multi-form answers (<100ms per question)
- **Tier 3 (AI Marking)**: GPT-4o-mini via OpenAI API for extended responses, essays (2-5 seconds per question)

A typical 40-question GCSE paper with 10 Tier 3 questions can take 20-50 seconds to mark. Vercel Serverless Functions have hard timeouts (29-30s), creating two failure modes:
1. Request timeout: client receives 504, hanging scholar/parent experience
2. Partial marking: Tier 1+2 questions marked, Tier 3 never invoked, inconsistent exam state

Additionally, the HTTP request blocks indefinitely waiting for AI responses, consuming connection slots and reducing platform concurrency. This does not scale to 100+ simultaneous exam submissions.

### Current Performance
- Tier 1 + Tier 2 combined: ~150ms for 40 questions
- Tier 3 alone: 20-50s for 10 questions (blocking HTTP connection)
- Timeout risk threshold: 25 seconds (5s safety margin on 30s serverless limit)

## Decision

Adopt a **hybrid synchronous-asynchronous marking flow**:

1. **Synchronous path (HTTP endpoint)**: Tier 1 + Tier 2 marking completes immediately inside the `/api/exam-sittings/[sittingId]/mark` endpoint. Results returned to client within 200ms. Tier 3 questions identified but not marked yet.

2. **Asynchronous path (Edge Function worker)**: Tier 3 marking dispatched to a Supabase Edge Function (`mark-exam-sitting`) triggered by pg_cron every 30 seconds. Worker acquires Postgres advisory lock per sitting to prevent double-marking. Processes up to 3 Tier 3 questions per invocation (configurable). Updates exam_answers in-place. Job state persisted in new `exam_marking_jobs` table.

3. **Client polling**: POST `/api/exam-sittings/[sittingId]/mark` returns `{ status: 'partially_marked', tier1_2_results, tier3_job_id }`. Client polls `/api/exam-marking-jobs/[jobId]` every 2 seconds (configurable). Optional Supabase Realtime subscription for push updates on completion.

### Data Flow
```
Scholar submits exam → POST /mark
  → Tier 1+2 sync (150ms) → return partial results
  → Insert exam_marking_jobs row (status: queued, tier_scope: [3])
  
pg_cron triggers every 30s
  → Edge Function mark-exam-sitting invoked
  → Acquire advisory lock on sitting_id
  → Fetch queued job, update status: running
  → For each Tier 3 answer:
    → Call markingEngine Tier 3 (GPT-4o)
    → Update exam_answers.marks_awarded, marking_tier
    → Increment progress.questionsMarked
  → On success: status: completed
  → On error: status: failed, retry with exponential backoff
  
Client polls /api/exam-marking-jobs/[jobId]
  → If status: completed → render full results
  → If status: running → show progress bar (questionsMarked/questionsTotal)
  → If status: failed → show retry button or human review notice
```

## Alternatives Considered

### (a) Pure sync with longer serverless timeout
Requested 120s timeout from Vercel. Rejected: (1) Hard limit at 29-30s on Hobby/Pro plans, no extension available. (2) Even if available, forcing HTTP connection to stay open for 2+ minutes is poor UX. (3) Doesn't scale beyond single-scholar at a time.

### (b) Dedicated queue service (BullMQ, Temporal, Inngest)
Rejected for MVP: (1) Requires external infrastructure outside Supabase. (2) Higher operational complexity. (3) Vercel doesn't have built-in integration. (4) Overkill for marking workload (not a high-throughput message bus). (5) Supabase-native pg_cron + Edge Functions cheaper and simpler.

### (c) Vercel Cron
Rejected: (1) Vercel Cron endpoints not granular enough — fires globally every N minutes, no per-job state. (2) Cannot dispatch to arbitrary functions. (3) No built-in state persistence. (4) Would need custom database polling layer anyway.

### (d) Webhook callback from OpenAI (if batch API available)
Rejected: (1) OpenAI batch API exists but has 24-hour latency. (2) Marking results needed within 30-60s. (3) Not suitable for interactive exam review.

## Consequences

### Positive
- **No more timeout risk**: Tier 1+2 always completes within HTTP timeout window.
- **Instant partial feedback**: Scholar sees Tier 1+2 results immediately (often majority of questions).
- **Scalable**: Many scholars can submit exams concurrently; marking queue processes Tier 3 at steady rate (not bottlenecked by OpenAI latency).
- **Audit trail**: Job state persisted in DB; can replay failed jobs, monitor queue health, identify bottlenecks.
- **Resilient**: Exponential backoff, max 3 retries per job, human review flag for failed markings.
- **Optional real-time**: Supabase Realtime subscription provides push notification on completion (no polling if desired).

### Negative
- **Eventual consistency**: Tier 3 results lag by 30s–2m depending on queue depth. Scholar must wait to see full marks.
- **Client complexity**: Client library required for polling/subscription logic. Need to handle job not found, transient failures, cancellation.
- **Cold start latency**: Supabase Edge Function first invocation adds 2–5s (Deno cold start). Subsequent invocations <500ms. Mitigated by keeping function warm via cron schedule.
- **Requires pg_cron extension**: Must be enabled in Supabase project. Standard on new projects, but users with older orgs may not have it.
- **Duplicate marking risk**: Without advisory locking, two cron invocations could mark same sitting. Mitigated by advisory lock + unique constraint on job table.

## Implementation Notes

### Files Created (Scaffolding)
1. **`docs/adr/ADR-001-background-marking-queue.md`** (this file)
2. **`supabase/migrations/20260409_exam_marking_jobs.sql`** — DB schema (new `exam_marking_jobs` table, indexes, triggers, pg_cron extension)
3. **`supabase/functions/mark-exam-sitting/index.ts`** — Edge Function HTTP handler
4. **`supabase/functions/mark-exam-sitting/worker.ts`** — Async worker logic: processMarkingJob, retryFailedJobs, cleanupOldJobs
5. **`supabase/functions/mark-exam-sitting/lock.ts`** — Postgres advisory lock wrappers
6. **`supabase/functions/mark-exam-sitting/README.md`** — Deployment & testing guide
7. **`src/lib/examJobQueue.js`** — Client library (enqueueMarkingJob, pollJobStatus, waitForJob, subscribeToJobUpdates)
8. **`src/app/api/exam-marking-jobs/[jobId]/route.js`** — Polling API endpoint (GET job status)

### New API Responses

**POST `/api/exam-sittings/[sittingId]/mark` (modified — future PR)**
```json
{
  "status": "partially_marked",
  "tier1_2_results": {
    "total_score": 35,
    "max_possible": 40,
    "questions_marked": 30,
    "marked_at": "2026-04-09T10:45:00Z"
  },
  "tier3_job_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "message": "Tier 1+2 marking complete. Tier 3 processing in background."
}
```

**GET `/api/exam-marking-jobs/[jobId]`**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "completed|running|queued|failed|cancelled",
  "progress": {
    "questionsTotal": 10,
    "questionsMarked": 7
  },
  "tier3_results": {
    "total_score": 5,
    "max_possible": 10,
    "completed_at": "2026-04-09T10:46:30Z"
  },
  "error": null | { code: "AI_TIMEOUT", message: "..." }
}
```

### Feature Flag
- `enable_async_tier3_marking` (boolean, default: false)
- Rollout: 10% scholars week 1, 50% week 2, 100% week 3
- Fallback: if job queue unavailable, fall back to synchronous Tier 3 in HTTP request (current behavior)

## Rollout Plan

### Phase 1: Infrastructure (Week 1, Day 1–2)
- [ ] Deploy migration: `supabase migration up`
- [ ] Deploy Edge Function: `supabase functions deploy mark-exam-sitting`
- [ ] Test marking job lifecycle locally (mock data)

### Phase 2: Client Library (Week 1, Day 3–4)
- [ ] Wire client library into ExamResults.jsx (polling + Realtime subscription)
- [ ] Add job status UI: "Marking in progress..." spinner, progress bar, retry button
- [ ] Test polling latency, Realtime push notifications

### Phase 3: Canary Rollout (Week 2, Day 1–7)
- [ ] Enable feature flag for 10% of scholars
- [ ] Monitor: job queue depth, Tier 3 latency (p50/p95), failure rate, retry count
- [ ] Check dashboard: Are scholars seeing results within 60s?
- [ ] Increase to 50% mid-week if metrics healthy

### Phase 4: GA Rollout (Week 3)
- [ ] Increase to 100%
- [ ] Remove feature flag (legacy sync path no longer needed)
- [ ] Archive this ADR once stable

### Monitoring Metrics
- **Queue depth**: `SELECT COUNT(*) FROM exam_marking_jobs WHERE status IN ('queued', 'running')`
- **Tier 3 latency**: `avg(finished_at - started_at) WHERE status = 'completed'` (target: <30s per 3 questions)
- **Failure rate**: `COUNT(status='failed') / COUNT(status IN ('completed','failed'))`
- **Retry attempts**: `avg(attempts)` per job
- **Cold start**: First invocation latency from cron trigger (target: <5s)

## Compliance & Security

### Data Security
- Job table stores only metadata (status, progress, error). No scholar data or answers.
- Error messages sanitized (no PII, no raw AI responses).
- Advisory lock prevents concurrent writes; Realtime subscription only accessible to sitting owner (schema-level RLS).

### AI Safety
- Tier 3 invocation includes prompt injection defense:
  - Question text + answer + mark scheme sanitized (no raw user input in GPT prompt)
  - GPT response validated against expected schema (scores 0–max_marks, confidence 0–1)
  - Low confidence markings (<0.7) flagged for human review
- Timeout: 30s per AI call; on timeout, mark as failed and retry

## References
- `CLAUDE.md` Part 21: GCSE Exam Papers System (3-tier marking engine, existing implementation)
- `src/lib/markingEngine.js`: Tier 1+2 implementation (already exists)
- `src/app/api/exam-sittings/[sittingId]/mark/route.js`: Current synchronous endpoint (to be modified)
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Supabase pg_cron: https://supabase.com/docs/guides/database/extensions/pg_cron
