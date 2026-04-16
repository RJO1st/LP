/**
 * Offline Answer Sync Manager
 * Handles queuing answers when offline and replaying them when back online
 */

import {
  queueAnswer,
  getPendingAnswers,
  markAnswerSynced,
  clearSyncedAnswers,
  isOfflineStoreAvailable,
} from './offlineStore';

let isSyncing = false;

/**
 * Submit an answer, queueing it if offline
 * @param {Object} answerPayload { questionId, answerId, timeTaken, etc. }
 * @param {Function} onQueuedCallback Called if answer was queued (offline)
 * @returns {Promise<{success: boolean, queued: boolean, error?: string}>}
 */
export async function submitAnswerWithOfflineFallback(
  answerPayload,
  onQueuedCallback
) {
  // Try to POST to API
  try {
    const response = await fetch('/api/session-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(answerPayload),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      queued: false,
      data: result,
    };
  } catch (apiError) {
    console.warn('API submission failed, queueing answer:', apiError);

    // Queue for later sync
    try {
      const storeAvailable = await isOfflineStoreAvailable();
      if (!storeAvailable) {
        return {
          success: false,
          queued: false,
          error: 'Offline storage not available',
        };
      }

      const answerId = await queueAnswer(answerPayload);
      onQueuedCallback?.(answerId);

      return {
        success: true,
        queued: true,
        answerId,
      };
    } catch (queueError) {
      console.error('Error queueing answer:', queueError);
      return {
        success: false,
        queued: false,
        error: queueError.message,
      };
    }
  }
}

/**
 * Replay all pending answers when back online
 * @param {Function} onProgress Called with {current, total, answerId} during sync
 * @param {Function} onError Called with {answerId, error} for individual failures
 * @returns {Promise<{synced: number, failed: number, errors: Array}>}
 */
export async function replayPendingAnswers(onProgress, onError) {
  if (isSyncing) {
    console.warn('Sync already in progress');
    return { synced: 0, failed: 0, errors: [] };
  }

  isSyncing = true;
  const stats = {
    synced: 0,
    failed: 0,
    errors: [],
  };

  try {
    const pending = await getPendingAnswers();

    if (pending.length === 0) {
      console.log('No pending answers to sync');
      return stats;
    }

    console.log(`Syncing ${pending.length} pending answers...`);

    for (let i = 0; i < pending.length; i++) {
      const { id: answerId, payload } = pending[i];

      try {
        onProgress?.({ current: i + 1, total: pending.length, answerId });

        const response = await fetch('/api/session-answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        // Mark as synced
        await markAnswerSynced(answerId);
        stats.synced += 1;

        // Add a small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to sync answer ${answerId}:`, error);
        stats.failed += 1;
        stats.errors.push({ answerId, error: error.message });
        onError?.({ answerId, error: error.message });
      }
    }

    // Clean up synced answers
    await clearSyncedAnswers();

    console.log('Sync complete:', stats);
  } catch (error) {
    console.error('Fatal error during answer sync:', error);
    stats.errors.push({ error: error.message });
  } finally {
    isSyncing = false;
  }

  return stats;
}

/**
 * Hook to automatically replay answers when back online
 * @returns {Promise<void>}
 */
export async function setupAutoAnswerSync() {
  if (typeof window === 'undefined') return;

  const handleOnline = async () => {
    console.log('Back online, attempting to sync answers...');

    // Give a small delay for network to fully stabilize
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await replayPendingAnswers(
      (progress) => {
        console.log(
          `Syncing answer ${progress.current}/${progress.total}`
        );
      },
      (error) => {
        console.error('Sync error:', error);
      }
    );
  };

  window.addEventListener('online', handleOnline);

  // Also try to sync on page visibility change (if user returns to tab)
  const handleVisibilityChange = async () => {
    if (!document.hidden && navigator.onLine) {
      const pending = await getPendingAnswers();
      if (pending.length > 0) {
        console.log('Page became visible and online, syncing answers...');
        await replayPendingAnswers();
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

/**
 * Check if there are pending answers waiting to sync
 * @returns {Promise<number>}
 */
export async function getPendingAnswerCount() {
  try {
    const pending = await getPendingAnswers();
    return pending.length;
  } catch (error) {
    return 0;
  }
}

/**
 * Get sync status
 * @returns {boolean} True if currently syncing
 */
export function isSyncInProgress() {
  return isSyncing;
}
