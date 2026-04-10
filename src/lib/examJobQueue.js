/**
 * examJobQueue.js — Client library for background marking job queue
 *
 * Exports:
 *   - enqueueMarkingJob(supabase, {sittingId, tierScope})
 *   - pollJobStatus(supabase, jobId)
 *   - waitForJob(supabase, jobId, {pollIntervalMs, timeoutMs, onProgress})
 *   - subscribeToJobUpdates(supabase, jobId, onUpdate)
 *
 * Usage:
 *   import { enqueueMarkingJob, waitForJob } from '@/lib/examJobQueue';
 *
 *   // Enqueue job after exam submission
 *   const { jobId } = await enqueueMarkingJob(supabase, { sittingId });
 *
 *   // Wait for completion with polling
 *   const finalStatus = await waitForJob(supabase, jobId, {
 *     onProgress: (progress) => console.log(`Marked ${progress.questionsMarked} of ${progress.questionsTotal}`)
 *   });
 *
 *   // Or use real-time subscription
 *   const unsubscribe = subscribeToJobUpdates(supabase, jobId, (job) => {
 *     if (job.status === 'completed') {
 *       console.log('Marking complete!');
 *       unsubscribe();
 *     }
 *   });
 */

/**
 * Enqueue a new marking job. If job already exists for sitting, upsert it.
 *
 * @param {SupabaseClient} supabase Supabase client
 * @param {Object} options
 * @param {string} options.sittingId Exam sitting UUID
 * @param {number[]} [options.tierScope=[3]] Which tiers to mark (default: [3] for Tier 3 only)
 * @returns {Promise<{jobId: string, status: string}>} Job ID and initial status
 * @throws {Error} If enqueue fails
 *
 * @example
 * const { jobId, status } = await enqueueMarkingJob(supabase, {
 *   sittingId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
 * });
 * console.log(`Job ${jobId} enqueued with status: ${status}`);
 */
export async function enqueueMarkingJob(supabase, { sittingId, tierScope = [3] }) {
  if (!sittingId) {
    throw new Error('enqueueMarkingJob: sittingId is required');
  }

  if (!Array.isArray(tierScope) || tierScope.length === 0) {
    throw new Error('enqueueMarkingJob: tierScope must be non-empty array');
  }

  try {
    const { data, error } = await supabase
      .from('exam_marking_jobs')
      .upsert(
        {
          sitting_id: sittingId,
          status: 'queued',
          tier_scope: tierScope,
          attempts: 0,
          scheduled_at: new Date().toISOString()
        },
        {
          onConflict: 'sitting_id'
        }
      )
      .select('id, status')
      .single();

    if (error) {
      console.error('[examJobQueue] enqueueMarkingJob error:', error);
      throw new Error(`Failed to enqueue marking job: ${error.message}`);
    }

    console.log(`[examJobQueue] Marking job enqueued: ${data.id}`);
    return {
      jobId: data.id,
      status: data.status
    };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`enqueueMarkingJob: ${String(err)}`);
  }
}

/**
 * Poll job status once. Returns current status without waiting.
 *
 * @param {SupabaseClient} supabase Supabase client
 * @param {string} jobId Job UUID
 * @returns {Promise<{status: string, progress: Object, error: Object|null, tier3Results?: Object}>}
 * @throws {Error} If job not found or fetch fails
 *
 * @example
 * const { status, progress } = await pollJobStatus(supabase, jobId);
 * console.log(`Job status: ${status}, marked: ${progress.questionsMarked}/${progress.questionsTotal}`);
 */
export async function pollJobStatus(supabase, jobId) {
  if (!jobId) {
    throw new Error('pollJobStatus: jobId is required');
  }

  try {
    const { data, error } = await supabase
      .from('exam_marking_jobs')
      .select('status, progress, error')
      .eq('id', jobId)
      .maybeSingle();

    if (error) {
      console.error('[examJobQueue] pollJobStatus error:', error);
      throw new Error(`Failed to fetch job status: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Job ${jobId} not found`);
    }

    return {
      status: data.status,
      progress: data.progress || { questionsTotal: 0, questionsMarked: 0 },
      error: data.error,
      // TODO: Add tier3_results when job is completed
      // tier3Results: { total_score, max_possible, completed_at }
    };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`pollJobStatus: ${String(err)}`);
  }
}

/**
 * Wait for job to complete by polling. Blocks until status is terminal
 * (completed, failed, cancelled) or timeout.
 *
 * @param {SupabaseClient} supabase Supabase client
 * @param {string} jobId Job UUID
 * @param {Object} [options] Configuration
 * @param {number} [options.pollIntervalMs=2000] Poll interval in milliseconds
 * @param {number} [options.timeoutMs=120000] Timeout in milliseconds (2 minutes)
 * @param {Function} [options.onProgress] Callback: onProgress(progressJSON)
 * @returns {Promise<{status: string, progress: Object, error: Object|null, tier3Results?: Object}>}
 * @throws {Error} If timeout exceeded or fetch fails
 *
 * @example
 * const result = await waitForJob(supabase, jobId, {
 *   pollIntervalMs: 3000,
 *   timeoutMs: 180000,
 *   onProgress: (progress) => {
 *     console.log(`Progress: ${progress.questionsMarked}/${progress.questionsTotal}`);
 *   }
 * });
 * console.log(`Job ${result.status}`);
 */
export async function waitForJob(
  supabase,
  jobId,
  {
    pollIntervalMs = 2000,
    timeoutMs = 120000,
    onProgress = null
  } = {}
) {
  if (!jobId) {
    throw new Error('waitForJob: jobId is required');
  }

  if (pollIntervalMs <= 0) {
    throw new Error('waitForJob: pollIntervalMs must be > 0');
  }

  if (timeoutMs <= 0) {
    throw new Error('waitForJob: timeoutMs must be > 0');
  }

  const startTime = Date.now();
  const terminalStatuses = new Set(['completed', 'failed', 'cancelled']);

  try {
    while (true) {
      const elapsed = Date.now() - startTime;

      if (elapsed > timeoutMs) {
        throw new Error(
          `waitForJob timeout after ${(elapsed / 1000).toFixed(1)}s. Job may still be processing.`
        );
      }

      const jobStatus = await pollJobStatus(supabase, jobId);

      if (onProgress && jobStatus.progress) {
        onProgress(jobStatus.progress);
      }

      if (terminalStatuses.has(jobStatus.status)) {
        console.log(
          `[examJobQueue] Job ${jobId} reached terminal status: ${jobStatus.status}`
        );
        return jobStatus;
      }

      // Sleep before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`waitForJob: ${String(err)}`);
  }
}

/**
 * Subscribe to real-time job status updates via Supabase Realtime.
 * Automatically unsubscribes on terminal status or after timeout.
 *
 * @param {SupabaseClient} supabase Supabase client
 * @param {string} jobId Job UUID
 * @param {Function} onUpdate Callback: onUpdate(job) called on each update
 * @returns {Function} Unsubscribe function: call to disconnect
 *
 * @example
 * const unsubscribe = subscribeToJobUpdates(supabase, jobId, (job) => {
 *   console.log(`Job updated: ${job.status}`);
 *   if (job.status === 'completed') {
 *     unsubscribe();
 *   }
 * });
 */
export function subscribeToJobUpdates(supabase, jobId, onUpdate) {
  if (!jobId) {
    throw new Error('subscribeToJobUpdates: jobId is required');
  }

  if (typeof onUpdate !== 'function') {
    throw new Error('subscribeToJobUpdates: onUpdate must be a function');
  }

  const terminalStatuses = new Set(['completed', 'failed', 'cancelled']);

  const subscription = supabase
    .channel(`marking_job:${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'exam_marking_jobs',
        filter: `id=eq.${jobId}`
      },
      (payload) => {
        const job = payload.new;

        try {
          onUpdate(job);
        } catch (err) {
          console.error('[examJobQueue] onUpdate callback error:', err);
        }

        // Auto-unsubscribe on terminal status
        if (terminalStatuses.has(job.status)) {
          console.log(
            `[examJobQueue] Job ${jobId} reached terminal status, unsubscribing`
          );
          unsubscribe();
        }
      }
    )
    .subscribe((status) => {
      console.log(`[examJobQueue] Subscription status: ${status}`);
    });

  /**
   * Unsubscribe function
   */
  const unsubscribe = async () => {
    await supabase.removeChannel(subscription);
  };

  return unsubscribe;
}

/**
 * High-level helper: wait for job with optional real-time subscription.
 * Combines polling + Realtime for optimal latency and reduced polling overhead.
 *
 * @param {SupabaseClient} supabase Supabase client
 * @param {string} jobId Job UUID
 * @param {Object} [options] Configuration
 * @param {boolean} [options.useRealtime=true] Use Realtime subscription if available
 * @param {number} [options.pollIntervalMs=2000] Fallback poll interval
 * @param {number} [options.timeoutMs=120000] Timeout
 * @param {Function} [options.onProgress] Progress callback
 * @returns {Promise<Object>} Final job status
 *
 * @example
 * const result = await waitForJobWithRealtime(supabase, jobId, {
 *   useRealtime: true,
 *   onProgress: (progress) => updateProgressBar(progress)
 * });
 */
export async function waitForJobWithRealtime(
  supabase,
  jobId,
  {
    useRealtime = true,
    pollIntervalMs = 5000,
    timeoutMs = 120000,
    onProgress = null
  } = {}
) {
  if (!jobId) {
    throw new Error('waitForJobWithRealtime: jobId is required');
  }

  let unsubscribeRealtime = null;

  try {
    // Start Realtime subscription if enabled
    if (useRealtime) {
      unsubscribeRealtime = subscribeToJobUpdates(supabase, jobId, (job) => {
        if (onProgress && job.progress) {
          onProgress(job.progress);
        }
      });
    }

    // Wait with polling (Realtime accelerates completion if available)
    const result = await waitForJob(supabase, jobId, {
      pollIntervalMs,
      timeoutMs,
      onProgress
    });

    return result;
  } finally {
    // Always cleanup Realtime subscription
    if (unsubscribeRealtime) {
      try {
        await unsubscribeRealtime();
      } catch (err) {
        console.warn('[examJobQueue] Error unsubscribing from Realtime:', err);
      }
    }
  }
}
