// ─── Deploy to: src/lib/cache.js ─────────────────────────────────────────────
// Lightweight in-memory cache for LaunchPard.
// Works in Vercel serverless functions (persists for function lifetime ~5-15 min).
// No external service required. Swap to Redis/Upstash when scaling beyond 1K scholars.
//
// Usage:
//   import { cache } from "@/lib/cache";
//   const topics = await cache.getOrSet("topics:uk_11plus:maths", 300, async () => {
//     const { data } = await supabase.from("question_bank").select("topic")...;
//     return data;
//   });

const store = new Map();

const cache = {
  /**
   * Get a cached value, or compute and cache it if missing/expired.
   * @param {string} key - Cache key
   * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 min)
   * @param {Function} fetchFn - Async function to compute the value if cache miss
   * @returns {Promise<any>} Cached or freshly computed value
   */
  async getOrSet(key, ttlSeconds = 300, fetchFn) {
    const entry = store.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.value;
    }
    const value = await fetchFn();
    store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    return value;
  },

  /**
   * Get a cached value (returns undefined if missing/expired).
   */
  get(key) {
    const entry = store.get(key);
    if (entry && Date.now() < entry.expiresAt) return entry.value;
    if (entry) store.delete(key); // clean up expired
    return undefined;
  },

  /**
   * Set a cached value.
   */
  set(key, value, ttlSeconds = 300) {
    store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  },

  /**
   * Invalidate a specific key or all keys matching a prefix.
   */
  invalidate(keyOrPrefix) {
    if (store.has(keyOrPrefix)) {
      store.delete(keyOrPrefix);
      return;
    }
    // Prefix invalidation: "mastery:scholar123:*" clears all matching
    for (const k of store.keys()) {
      if (k.startsWith(keyOrPrefix)) store.delete(k);
    }
  },

  /**
   * Clear the entire cache (useful on deploy or mastery bulk update).
   */
  clear() {
    store.clear();
  },

  /**
   * Get cache stats for debugging.
   */
  stats() {
    let active = 0, expired = 0;
    const now = Date.now();
    for (const [, entry] of store) {
      if (now < entry.expiresAt) active++;
      else expired++;
    }
    return { active, expired, total: store.size };
  },
};

export { cache };