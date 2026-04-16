/**
 * Offline-Aware Question Fetcher
 * Attempts to fetch questions from API, falls back to IndexedDB cache when offline
 * Automatically populates cache when API succeeds
 */

import {
  cacheQuestions,
  getCachedQuestions,
  isOfflineStoreAvailable,
} from './offlineStore';

/**
 * Fetch questions with automatic offline fallback
 * @param {string} curriculum e.g., "ng_jss"
 * @param {string} subject e.g., "maths"
 * @param {string} topic e.g., "quadratic-equations"
 * @param {Object} options Additional fetch options (headers, etc.)
 * @returns {Promise<{questions: Array, isFromCache: boolean, error?: string}>}
 */
export async function fetchQuestionsWithOfflineFallback(
  curriculum,
  subject,
  topic,
  options = {}
) {
  // Build the API endpoint
  const endpoint = `/api/questions/${curriculum}/${subject}/${topic}`;

  try {
    // Try to fetch from API
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const questions = data.questions || [];

    // Cache successful API response
    if (questions.length > 0) {
      const storeAvailable = await isOfflineStoreAvailable();
      if (storeAvailable) {
        await cacheQuestions(curriculum, subject, topic, questions);
      }
    }

    return {
      questions,
      isFromCache: false,
    };
  } catch (apiError) {
    console.warn(`API fetch failed for ${curriculum}/${subject}/${topic}:`, apiError);

    // Fallback to cached questions
    try {
      const cachedQuestions = await getCachedQuestions(curriculum, subject, topic);
      if (cachedQuestions && cachedQuestions.length > 0) {
        console.log('Using cached questions');
        return {
          questions: cachedQuestions,
          isFromCache: true,
        };
      }
    } catch (cacheError) {
      console.error('Error fetching cached questions:', cacheError);
    }

    // No cache available
    return {
      questions: [],
      isFromCache: false,
      error: apiError.message,
    };
  }
}

/**
 * Batch fetch multiple topic questions (useful for pre-loading)
 * @param {string} curriculum
 * @param {string} subject
 * @param {Array<string>} topics Array of topic slugs
 * @returns {Promise<Map<string, Array>>} Map of topic -> questions
 */
export async function fetchQuestionsForTopicsBatch(
  curriculum,
  subject,
  topics
) {
  const results = new Map();

  // Fetch in parallel for better performance
  const promises = topics.map((topic) =>
    fetchQuestionsWithOfflineFallback(curriculum, subject, topic)
      .then((result) => {
        if (result.questions.length > 0) {
          results.set(topic, result.questions);
        }
        return result;
      })
      .catch((error) => {
        console.error(`Error fetching questions for topic ${topic}:`, error);
      })
  );

  await Promise.all(promises);
  return results;
}

/**
 * Pre-load and cache questions for a curriculum/subject combo
 * Useful for optimizing offline experience when user is online
 * @param {string} curriculum
 * @param {string} subject
 * @param {Array<string>} topics
 * @returns {Promise<Object>} Stats on what was cached
 */
export async function preloadQuestionsForOffline(curriculum, subject, topics) {
  const stats = {
    totalTopics: topics.length,
    cachedTopics: 0,
    totalQuestions: 0,
    errors: [],
  };

  for (const topic of topics) {
    try {
      const result = await fetchQuestionsWithOfflineFallback(
        curriculum,
        subject,
        topic
      );
      if (result.questions.length > 0) {
        stats.cachedTopics += 1;
        stats.totalQuestions += result.questions.length;
      }
    } catch (error) {
      stats.errors.push({ topic, error: error.message });
    }
  }

  console.log('Offline preload complete:', stats);
  return stats;
}

/**
 * Check if a topic has cached questions
 * @param {string} curriculum
 * @param {string} subject
 * @param {string} topic
 * @returns {Promise<boolean>}
 */
export async function hasCachedQuestions(curriculum, subject, topic) {
  try {
    const cached = await getCachedQuestions(curriculum, subject, topic);
    return cached && cached.length > 0;
  } catch (error) {
    return false;
  }
}
