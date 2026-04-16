/**
 * IndexedDB Offline Storage Layer
 * Manages offline caching of questions, mastery data, and pending syncs
 * Minimal dependencies — no external libs, just raw IndexedDB
 */

const DB_NAME = 'launchpard-offline';
const DB_VERSION = 1;

// Store names (object stores in IndexedDB)
const STORES = {
  QUESTIONS: 'questions',
  MASTERY: 'mastery',
  PENDING_ANSWERS: 'pendingAnswers',
  CONCEPT_CARDS: 'conceptCards',
  SYNC_LOG: 'syncLog',
};

let dbInstance = null;

/**
 * Initialize or get the IndexedDB database instance
 * @returns {Promise<IDBDatabase>}
 */
export async function getDB() {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.QUESTIONS)) {
        const qStore = db.createObjectStore(STORES.QUESTIONS, {
          keyPath: 'id',
        });
        qStore.createIndex('curriculumSubjectTopic', 'curriculumSubjectTopic', {
          unique: false,
        });
      }

      if (!db.objectStoreNames.contains(STORES.MASTERY)) {
        const mStore = db.createObjectStore(STORES.MASTERY, {
          keyPath: 'scholarId',
        });
        mStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PENDING_ANSWERS)) {
        db.createObjectStore(STORES.PENDING_ANSWERS, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }

      if (!db.objectStoreNames.contains(STORES.CONCEPT_CARDS)) {
        db.createObjectStore(STORES.CONCEPT_CARDS, {
          keyPath: 'topicSlug',
        });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_LOG)) {
        const syncStore = db.createObjectStore(STORES.SYNC_LOG, {
          keyPath: 'id',
          autoIncrement: true,
        });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Cache questions for offline access
 * Key format: "curriculum_subject_topic"
 * @param {string} curriculum e.g., "ng_jss"
 * @param {string} subject e.g., "maths"
 * @param {string} topic e.g., "quadratic-equations"
 * @param {Array} questions Array of question objects from API
 * @returns {Promise<void>}
 */
export async function cacheQuestions(curriculum, subject, topic, questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return;
  }

  try {
    const db = await getDB();
    const tx = db.transaction(STORES.QUESTIONS, 'readwrite');
    const store = tx.objectStore(STORES.QUESTIONS);

    const key = `${curriculum}_${subject}_${topic}`;
    const record = {
      id: key,
      curriculumSubjectTopic: key,
      curriculum,
      subject,
      topic,
      questions,
      cachedAt: new Date().toISOString(),
      count: questions.length,
    };

    store.put(record);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Error caching questions:', error);
  }
}

/**
 * Retrieve cached questions
 * @param {string} curriculum
 * @param {string} subject
 * @param {string} topic
 * @returns {Promise<Array|null>}
 */
export async function getCachedQuestions(curriculum, subject, topic) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.QUESTIONS, 'readonly');
    const store = tx.objectStore(STORES.QUESTIONS);

    const key = `${curriculum}_${subject}_${topic}`;

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const record = request.result;
        resolve(record ? record.questions : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error retrieving cached questions:', error);
    return null;
  }
}

/**
 * Get total count of cached questions
 * @returns {Promise<number>}
 */
export async function getCachedQuestionsCount() {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.QUESTIONS, 'readonly');
    const store = tx.objectStore(STORES.QUESTIONS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const records = request.result;
        const totalQuestions = records.reduce(
          (sum, rec) => sum + (rec.count || 0),
          0
        );
        resolve(totalQuestions);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting cached questions count:', error);
    return 0;
  }
}

/**
 * Cache mastery data for a scholar
 * @param {string} scholarId
 * @param {Object} masteryData Object with mastery records
 * @returns {Promise<void>}
 */
export async function cacheMastery(scholarId, masteryData) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.MASTERY, 'readwrite');
    const store = tx.objectStore(STORES.MASTERY);

    const record = {
      scholarId,
      data: masteryData,
      lastUpdated: new Date().toISOString(),
    };

    store.put(record);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Error caching mastery:', error);
  }
}

/**
 * Retrieve cached mastery data
 * @param {string} scholarId
 * @returns {Promise<Object|null>}
 */
export async function getCachedMastery(scholarId) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.MASTERY, 'readonly');
    const store = tx.objectStore(STORES.MASTERY);

    return new Promise((resolve, reject) => {
      const request = store.get(scholarId);
      request.onsuccess = () => {
        const record = request.result;
        resolve(record ? record.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error retrieving cached mastery:', error);
    return null;
  }
}

/**
 * Queue an answer for sync when back online
 * @param {Object} answerPayload The POST body (e.g., { questionId, answerId, timeTaken })
 * @returns {Promise<number>} The auto-incremented ID of the queued answer
 */
export async function queueAnswer(answerPayload) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.PENDING_ANSWERS, 'readwrite');
    const store = tx.objectStore(STORES.PENDING_ANSWERS);

    const record = {
      payload: answerPayload,
      queuedAt: new Date().toISOString(),
      synced: false,
      syncAttempts: 0,
    };

    return new Promise((resolve, reject) => {
      const request = store.add(record);
      request.onsuccess = () => {
        // Log the sync attempt
        logSyncEvent('queued', answerPayload);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error queueing answer:', error);
    throw error;
  }
}

/**
 * Get all pending answers waiting to sync
 * @returns {Promise<Array>}
 */
export async function getPendingAnswers() {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.PENDING_ANSWERS, 'readonly');
    const store = tx.objectStore(STORES.PENDING_ANSWERS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const records = request.result || [];
        resolve(records.filter((r) => !r.synced));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting pending answers:', error);
    return [];
  }
}

/**
 * Mark an answer as synced
 * @param {number} answerId The ID of the pending answer
 * @returns {Promise<void>}
 */
export async function markAnswerSynced(answerId) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.PENDING_ANSWERS, 'readwrite');
    const store = tx.objectStore(STORES.PENDING_ANSWERS);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(answerId);
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.synced = true;
          record.syncedAt = new Date().toISOString();
          const putRequest = store.put(record);
          putRequest.onsuccess = () => {
            logSyncEvent('synced', record.payload);
            resolve();
          };
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('Error marking answer synced:', error);
  }
}

/**
 * Clear all synced answers (cleanup old data)
 * @returns {Promise<void>}
 */
export async function clearSyncedAnswers() {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.PENDING_ANSWERS, 'readwrite');
    const store = tx.objectStore(STORES.PENDING_ANSWERS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const records = request.result || [];
        records.forEach((record) => {
          if (record.synced) {
            store.delete(record.id);
          }
        });
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Error clearing synced answers:', error);
  }
}

/**
 * Cache a concept card
 * @param {string} topicSlug
 * @param {Object} cardData The concept card content
 * @returns {Promise<void>}
 */
export async function cacheConceptCard(topicSlug, cardData) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.CONCEPT_CARDS, 'readwrite');
    const store = tx.objectStore(STORES.CONCEPT_CARDS);

    const record = {
      topicSlug,
      data: cardData,
      cachedAt: new Date().toISOString(),
    };

    store.put(record);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Error caching concept card:', error);
  }
}

/**
 * Retrieve cached concept card
 * @param {string} topicSlug
 * @returns {Promise<Object|null>}
 */
export async function getCachedConceptCard(topicSlug) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.CONCEPT_CARDS, 'readonly');
    const store = tx.objectStore(STORES.CONCEPT_CARDS);

    return new Promise((resolve, reject) => {
      const request = store.get(topicSlug);
      request.onsuccess = () => {
        const record = request.result;
        resolve(record ? record.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error retrieving cached concept card:', error);
    return null;
  }
}

/**
 * Log a sync event for debugging
 * @param {string} event 'queued' | 'synced' | 'failed' | 'retried'
 * @param {Object} data The payload involved
 * @returns {Promise<void>}
 */
async function logSyncEvent(event, data) {
  try {
    const db = await getDB();
    const tx = db.transaction(STORES.SYNC_LOG, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_LOG);

    const record = {
      event,
      data,
      timestamp: Date.now(),
    };

    store.add(record);

    // Cleanup old logs (keep only last 100)
    const getAllRequest = store.getAll();
    getAllRequest.onsuccess = () => {
      const all = getAllRequest.result || [];
      if (all.length > 100) {
        all.slice(0, all.length - 100).forEach((old) => {
          store.delete(old.id);
        });
      }
    };
  } catch (error) {
    // Silently fail — logging should not break sync
  }
}

/**
 * Check if offline store is available
 * @returns {Promise<boolean>}
 */
export async function isOfflineStoreAvailable() {
  try {
    await getDB();
    return true;
  } catch (error) {
    console.warn('Offline store not available:', error);
    return false;
  }
}

/**
 * Clear all offline data (nuclear option for logout/reset)
 * @returns {Promise<void>}
 */
export async function clearAllOfflineData() {
  try {
    const db = await getDB();
    const storeNames = [
      STORES.QUESTIONS,
      STORES.MASTERY,
      STORES.PENDING_ANSWERS,
      STORES.CONCEPT_CARDS,
      STORES.SYNC_LOG,
    ];

    const tx = db.transaction(storeNames, 'readwrite');
    storeNames.forEach((storeName) => {
      tx.objectStore(storeName).clear();
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('Error clearing offline data:', error);
  }
}

/**
 * Get storage statistics
 * @returns {Promise<Object>}
 */
export async function getOfflineStats() {
  try {
    const db = await getDB();
    const stats = {
      questionsCount: 0,
      masteryCount: 0,
      pendingAnswersCount: 0,
      conceptCardsCount: 0,
      syncLogCount: 0,
    };

    const storeNames = [
      [STORES.QUESTIONS, 'questionsCount'],
      [STORES.MASTERY, 'masteryCount'],
      [STORES.PENDING_ANSWERS, 'pendingAnswersCount'],
      [STORES.CONCEPT_CARDS, 'conceptCardsCount'],
      [STORES.SYNC_LOG, 'syncLogCount'],
    ];

    for (const [storeName, statKey] of storeNames) {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);

      await new Promise((resolve) => {
        const request = store.count();
        request.onsuccess = () => {
          stats[statKey] = request.result;
          resolve();
        };
      });
    }

    return stats;
  } catch (error) {
    console.error('Error getting offline stats:', error);
    return null;
  }
}
