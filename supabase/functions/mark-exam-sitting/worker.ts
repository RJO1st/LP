/**
 * worker.ts — Async worker for Tier 3 exam marking
 *
 * Exported functions:
 *   - processMarkingJob(jobId, supabase): Process a single queued marking job
 *   - retryFailedJobs(supabase): Retry failed jobs that are eligible for retry
 *   - cleanupOldJobs(supabase): Delete completed jobs older than retention period
 *
 * Called by mark-exam-sitting Edge Function via pg_cron trigger.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { withLock } from "./lock.ts";

interface MarkingJob {
  id: string;
  sitting_id: string;
  status: string;
  tier_scope: number[];
  attempts: number;
  max_attempts: number;
  progress: {
    questionsTotal: number;
    questionsMarked: number;
  };
}

interface ExamAnswer {
  id: string;
  question_id: string;
  scholar_answer: string;
  marking_tier_used: string;
}

const EXPONENTIAL_BACKOFF_BASE_MS = 5000; // 5 seconds
const MAX_RETRY_DELAY_MS = 300000; // 5 minutes
const JOB_RETENTION_DAYS = 30;
const QUESTIONS_PER_INVOCATION = 3; // Max Tier 3 questions to process per cron trigger

/**
 * Process a single marking job: fetch Tier 3 answers, call marking engine,
 * update exam_answers and job status.
 *
 * Flow:
 *   1. Acquire advisory lock on sitting_id (prevents double-marking)
 *   2. Fetch job, verify status is 'queued'
 *   3. Update status to 'running', increment attempts
 *   4. Fetch exam_answers where marking_tier_used != 'tier3'
 *   5. For each Tier 3 answer (up to QUESTIONS_PER_INVOCATION):
 *      - TODO: Call markingEngine Tier 3 with prompt injection defense
 *      - Update exam_answers.marks_awarded, marking_tier
 *      - Increment progress.questionsMarked
 *   6. If all Tier 3 questions marked:
 *      - Update status = 'completed', finished_at = NOW()
 *   7. Else if error and retryable:
 *      - Increment attempts
 *      - If attempts < max_attempts:
 *        - scheduled_at = NOW() + exponential backoff
 *        - status = 'queued' (re-queue for next cron)
 *      - Else:
 *        - status = 'failed', error = { code, message }
 *   8. Release advisory lock
 *
 * @param jobId UUID of exam_marking_jobs row
 * @param supabase Supabase service client (with SUPABASE_SERVICE_ROLE_KEY)
 * @throws Error if job not found, lock unavailable, or fatal error
 */
export async function processMarkingJob(
  jobId: string,
  supabase: SupabaseClient
): Promise<void> {
  console.log(`[worker] processMarkingJob START jobId=${jobId}`);

  try {
    // Fetch job metadata
    const { data: job, error: jobError } = await supabase
      .from("exam_marking_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) {
      console.error(`[worker] Failed to fetch job ${jobId}:`, jobError);
      throw new Error(`Job fetch failed: ${jobError.message}`);
    }

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const markingJob: MarkingJob = job;
    console.log(
      `[worker] Job fetched: sitting_id=${markingJob.sitting_id}, status=${markingJob.status}, attempts=${markingJob.attempts}`
    );

    // Acquire lock on sitting_id to prevent concurrent marking
    await withLock(supabase, markingJob.sitting_id, async () => {
      // Double-check job is still queued (another invocation might have grabbed it)
      const { data: currentJob } = await supabase
        .from("exam_marking_jobs")
        .select("status")
        .eq("id", jobId)
        .maybeSingle();

      if (currentJob?.status !== "queued") {
        console.log(
          `[worker] Job ${jobId} no longer queued (status=${currentJob?.status}), skipping`
        );
        return;
      }

      // Update job status to 'running'
      const newAttempts = markingJob.attempts + 1;
      const { error: updateError } = await supabase
        .from("exam_marking_jobs")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
          attempts: newAttempts
        })
        .eq("id", jobId);

      if (updateError) {
        throw new Error(`Failed to update job status: ${updateError.message}`);
      }

      console.log(
        `[worker] Job status updated to running (attempt ${newAttempts}/${markingJob.max_attempts})`
      );

      // Fetch exam answers that need Tier 3 marking
      const { data: answers, error: answersError } = await supabase
        .from("exam_answers")
        .select("id, question_id, scholar_answer, marking_tier")
        .eq("sitting_id", markingJob.sitting_id)
        .eq("marking_tier", null); // Only unmarked answers

      if (answersError) {
        throw new Error(`Failed to fetch answers: ${answersError.message}`);
      }

      const tier3Answers: ExamAnswer[] = answers || [];
      console.log(
        `[worker] Found ${tier3Answers.length} Tier 3 answers to mark`
      );

      // Update progress
      let questionsMarked = markingJob.progress.questionsMarked || 0;
      const questionsToProcess = Math.min(
        tier3Answers.length - questionsMarked,
        QUESTIONS_PER_INVOCATION
      );

      // Process up to QUESTIONS_PER_INVOCATION answers
      for (let i = 0; i < questionsToProcess; i++) {
        const answerIdx = questionsMarked + i;
        const answer = tier3Answers[answerIdx];

        try {
          // TODO: Call markingEngine.tier3Mark(question, answer, markScheme, {...options})
          // with:
          //   - Prompt injection defense: sanitize answer text + question text
          //   - Timeout: 30s max per answer
          //   - Response validation: ensure marks_awarded is 0–marks_available
          //   - Confidence threshold: flag if confidence < 0.7
          //
          // For now, this is a stub that logs and skips actual marking.
          console.log(
            `[worker] TODO: Mark answer ${answer.id} (question_id=${answer.question_id})`
          );

          // Placeholder: mark as completed with 0 marks
          // Real implementation would call markingEngine
          const { error: updateErr } = await supabase
            .from("exam_answers")
            .update({
              marks_awarded: 0,
              marking_tier: "tier3",
              ai_feedback: "Placeholder: Tier 3 marking not yet implemented"
            })
            .eq("id", answer.id);

          if (updateErr) {
            console.warn(
              `[worker] Failed to update answer ${answer.id}:`,
              updateErr
            );
          }
        } catch (err) {
          console.error(
            `[worker] Error marking answer ${answer.id}:`,
            err instanceof Error ? err.message : String(err)
          );
          // Continue to next answer; don't fail entire job
        }

        questionsMarked++;
      }

      // Determine if job is complete
      const allAnswersMarked = questionsMarked >= tier3Answers.length;

      if (allAnswersMarked) {
        // Mark job as completed
        const { error: completeError } = await supabase
          .from("exam_marking_jobs")
          .update({
            status: "completed",
            finished_at: new Date().toISOString(),
            progress: {
              questionsTotal: tier3Answers.length,
              questionsMarked: questionsMarked
            }
          })
          .eq("id", jobId);

        if (completeError) {
          throw new Error(
            `Failed to mark job as completed: ${completeError.message}`
          );
        }

        console.log(`[worker] Job ${jobId} COMPLETED`);
      } else {
        // Still more answers to mark; re-queue for next invocation
        const { error: requeueError } = await supabase
          .from("exam_marking_jobs")
          .update({
            status: "queued",
            progress: {
              questionsTotal: tier3Answers.length,
              questionsMarked: questionsMarked
            }
          })
          .eq("id", jobId);

        if (requeueError) {
          throw new Error(`Failed to re-queue job: ${requeueError.message}`);
        }

        console.log(
          `[worker] Job ${jobId} re-queued (${questionsMarked}/${tier3Answers.length} marked)`
        );
      }
    });

    console.log(`[worker] processMarkingJob SUCCESS jobId=${jobId}`);
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : String(err);
    console.error(`[worker] processMarkingJob FAILED jobId=${jobId}:`, errorMsg);

    // Update job with error info
    const backoffMs = Math.min(
      EXPONENTIAL_BACKOFF_BASE_MS * Math.pow(2, Math.max(0, (job?.attempts || 0) - 1)),
      MAX_RETRY_DELAY_MS
    );

    const { data: job } = await supabase
      .from("exam_marking_jobs")
      .select("attempts, max_attempts")
      .eq("id", jobId)
      .maybeSingle();

    if (job && job.attempts < job.max_attempts) {
      // Retryable — re-queue with backoff
      const nextAttempt = new Date(Date.now() + backoffMs).toISOString();
      await supabase
        .from("exam_marking_jobs")
        .update({
          status: "queued",
          scheduled_at: nextAttempt
        })
        .eq("id", jobId);

      console.log(
        `[worker] Job ${jobId} will retry in ${backoffMs}ms (attempt ${job.attempts + 1}/${job.max_attempts})`
      );
    } else {
      // Max retries exceeded — mark as failed
      await supabase
        .from("exam_marking_jobs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error: {
            code: "MAX_RETRIES_EXCEEDED",
            message: errorMsg
          }
        })
        .eq("id", jobId);

      console.log(`[worker] Job ${jobId} FAILED (max retries exceeded)`);
    }
  }
}

/**
 * Retry failed jobs that are eligible (attempts < max_attempts, scheduled_at < now()).
 * Called by cron job to clean up failed jobs and re-attempt them.
 *
 * @param supabase Supabase service client
 * @returns Number of jobs re-queued
 */
export async function retryFailedJobs(supabase: SupabaseClient): Promise<number> {
  console.log("[worker] retryFailedJobs START");

  try {
    const now = new Date().toISOString();
    const { data: failedJobs, error } = await supabase
      .from("exam_marking_jobs")
      .select("id")
      .eq("status", "failed")
      .lt("scheduled_at", now)
      .lt("attempts", "max_attempts");

    if (error) {
      console.error("[worker] Failed to fetch failed jobs:", error);
      return 0;
    }

    const jobs = failedJobs || [];
    console.log(`[worker] Found ${jobs.length} failed jobs eligible for retry`);

    // Re-queue each job
    for (const job of jobs) {
      const { error: updateError } = await supabase
        .from("exam_marking_jobs")
        .update({ status: "queued" })
        .eq("id", job.id);

      if (updateError) {
        console.warn(`[worker] Failed to re-queue job ${job.id}:`, updateError);
      } else {
        console.log(`[worker] Job ${job.id} re-queued`);
      }
    }

    return jobs.length;
  } catch (err) {
    console.error(
      "[worker] retryFailedJobs error:",
      err instanceof Error ? err.message : String(err)
    );
    return 0;
  }
}

/**
 * Cleanup: delete completed jobs older than retention period.
 * Called by cron job weekly.
 *
 * @param supabase Supabase service client
 * @param retentionDays Retention period in days (default: 30)
 * @returns Number of jobs deleted
 */
export async function cleanupOldJobs(
  supabase: SupabaseClient,
  retentionDays: number = JOB_RETENTION_DAYS
): Promise<number> {
  console.log(`[worker] cleanupOldJobs START (retention=${retentionDays}d)`);

  try {
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: oldJobs, error: fetchError } = await supabase
      .from("exam_marking_jobs")
      .select("id")
      .eq("status", "completed")
      .lt("finished_at", cutoffDate);

    if (fetchError) {
      console.error("[worker] Failed to fetch old jobs:", fetchError);
      return 0;
    }

    const jobs = oldJobs || [];
    console.log(`[worker] Found ${jobs.length} jobs to cleanup`);

    // Delete in batches to avoid huge queries
    let deleted = 0;
    for (let i = 0; i < jobs.length; i += 100) {
      const batch = jobs.slice(i, i + 100).map(j => j.id);
      const { error: deleteError, count } = await supabase
        .from("exam_marking_jobs")
        .delete()
        .in("id", batch);

      if (deleteError) {
        console.warn("[worker] Failed to delete batch:", deleteError);
      } else {
        deleted += count || 0;
      }
    }

    console.log(`[worker] cleanupOldJobs completed (deleted ${deleted})`);
    return deleted;
  } catch (err) {
    console.error(
      "[worker] cleanupOldJobs error:",
      err instanceof Error ? err.message : String(err)
    );
    return 0;
  }
}
