/**
 * LaunchPard — Client-Side Question Cache
 * src/lib/questionCache.js
 *
 * Caches question batches in IndexedDB to:
 * - Enable offline play
 * - Reduce repeated Supabase calls
 * - Speed up quiz start times
 */

const DB_NAME  = 'launchpard-cache';
const DB_VER   = 1;
const STORE    = 'questions';
const TTL_MS   = 4 * 60 * 60 * 1000; // 4 hours

let _db = null;

const openDB = () => new Promise((res, rej) => {
  if (_db) return res(_db);
  const req = indexedDB.open(DB_NAME, DB_VER);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(STORE)) {
      const store = db.createObjectStore(STORE, { keyPath: 'key' });
      store.createIndex('expires', 'expires', { unique: false });
    }
  };
  req.onsuccess = (e) => { _db = e.target.result; res(_db); };
  req.onerror   = (e) => rej(e.target.error);
});

const cacheKey = (subject, year, curriculum) => `q:${curriculum}:${subject}:${year}`;

/**
 * Get cached questions for a subject/year/curriculum.
 * Returns null if cache miss or expired.
 */
export const getCachedQuestions = async (subject, year, curriculum = 'uk_11plus') => {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db    = await openDB();
    const tx    = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const key   = cacheKey(subject, year, curriculum);
    return new Promise((res) => {
      const req = store.get(key);
      req.onsuccess = () => {
        const record = req.result;
        if (!record || record.expires < Date.now()) return res(null);
        res(record.questions);
      };
      req.onerror = () => res(null);
    });
  } catch { return null; }
};

/**
 * Store a batch of questions in the cache.
 */
export const setCachedQuestions = async (subject, year, questions, curriculum = 'uk_11plus') => {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db    = await openDB();
    const tx    = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.put({
      key: cacheKey(subject, year, curriculum),
      questions,
      expires: Date.now() + TTL_MS,
    });
  } catch {}
};

/**
 * Pre-warm cache for likely next subjects (call after quiz completes).
 */
export const prewarmCache = async (year, currentSubject, curriculum = 'uk_11plus', fetcher) => {
  const allSubjects = ['mathematics', 'english', 'verbal_reasoning', 'nvr', 'science'];
  const others = allSubjects.filter(s => s !== currentSubject);
  // Fire and forget — pre-fetch next 2 subjects
  for (const s of others.slice(0, 2)) {
    const cached = await getCachedQuestions(s, year, curriculum);
    if (!cached && fetcher) {
      fetcher(s, year).then(qs => setCachedQuestions(s, year, qs, curriculum)).catch(() => {});
    }
  }
};

/**
 * Evict expired cache entries (call on app startup).
 */
export const evictExpired = async () => {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db    = await openDB();
    const tx    = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const idx   = store.index('expires');
    const range = IDBKeyRange.upperBound(Date.now());
    const req   = idx.openCursor(range);
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };
  } catch {}
};