/**
 * lock.ts — Postgres advisory lock utilities for mark-exam-sitting worker
 *
 * Provides mutual exclusion for marking the same exam sitting across multiple
 * worker invocations. Uses Postgres advisory locks (pg_try_advisory_lock),
 * which are fast, reliable, and automatically released on connection close.
 *
 * Pattern: withLock(jobId, async () => { ... marking work ... })
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

/**
 * Hash a string key to a 64-bit integer for pg_try_advisory_lock.
 * Uses simple DJB2 algorithm to convert string to stable hash.
 * @param key String key (e.g., sitting UUID or job UUID)
 * @returns Number suitable for Postgres advisory lock
 */
function hashKey(key: string): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) + hash + key.charCodeAt(i);
    hash = hash & 0xffffffff; // Keep 32-bit
  }
  return Math.abs(hash % 9223372036854775807); // Postgres bigint range
}

/**
 * Acquire Postgres advisory lock. Non-blocking — returns false immediately if
 * lock unavailable.
 *
 * @param supabase Supabase service client
 * @param key Lock key (e.g., sitting ID)
 * @returns true if lock acquired, false if already held by another connection
 */
export async function acquireAdvisoryLock(
  supabase: SupabaseClient,
  key: string
): Promise<boolean> {
  const lockId = hashKey(key);
  try {
    const { data, error } = await supabase.rpc(
      "pg_try_advisory_lock",
      { lockid: lockId },
      { head: false }
    );

    if (error) {
      console.error(
        `[lock] acquireAdvisoryLock failed for key=${key}:`,
        error.message
      );
      return false;
    }

    const locked = data === true;
    if (locked) {
      console.log(
        `[lock] Advisory lock acquired for key=${key} (hash=${lockId})`
      );
    } else {
      console.log(
        `[lock] Advisory lock unavailable for key=${key} (already held)`
      );
    }
    return locked;
  } catch (err) {
    console.error(`[lock] acquireAdvisoryLock exception for key=${key}:`, err);
    return false;
  }
}

/**
 * Release Postgres advisory lock.
 *
 * @param supabase Supabase service client
 * @param key Lock key (must match acquireAdvisoryLock call)
 */
export async function releaseAdvisoryLock(
  supabase: SupabaseClient,
  key: string
): Promise<void> {
  const lockId = hashKey(key);
  try {
    const { error } = await supabase.rpc(
      "pg_advisory_unlock",
      { lockid: lockId },
      { head: false }
    );

    if (error) {
      console.warn(
        `[lock] releaseAdvisoryLock error for key=${key}:`,
        error.message
      );
    } else {
      console.log(
        `[lock] Advisory lock released for key=${key} (hash=${lockId})`
      );
    }
  } catch (err) {
    console.error(`[lock] releaseAdvisoryLock exception for key=${key}:`, err);
  }
}

/**
 * Wrapper: acquire lock, run function, release lock.
 *
 * Pattern:
 *   await withLock(jobId, async () => {
 *     // Marking work — guaranteed to be serial per jobId
 *     await updateJobStatus(jobId, 'running');
 *     // ... Tier 3 marking ...
 *     await updateJobStatus(jobId, 'completed');
 *   });
 *
 * @template T Return type of fn
 * @param key Lock key (typically sitting_id or job_id)
 * @param fn Async function to execute under lock
 * @returns Result of fn, or throws if lock unavailable
 * @throws Error if lock cannot be acquired
 */
export async function withLock<T>(
  supabase: SupabaseClient,
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const locked = await acquireAdvisoryLock(supabase, key);

  if (!locked) {
    throw new Error(
      `[lock] Could not acquire advisory lock for key=${key}. Job may already be processing.`
    );
  }

  try {
    const result = await fn();
    return result;
  } finally {
    await releaseAdvisoryLock(supabase, key);
  }
}
