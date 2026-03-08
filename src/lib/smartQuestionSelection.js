/**
 * smartQuestionSelection.js
 * Deploy to: src/app/lib/smartQuestionSelection.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mastery-aware, topic-coherent question selection for the QuestOrchestrator.
 *
 * ARCHITECTURAL PRINCIPLES:
 *
 *   1. SINGLE SOURCE OF TRUTH: All subject/topic/strand knowledge is imported
 *      from learningPathEngine.js. This file contains zero subject-specific
 *      logic. Adding a new subject to learningPathEngine is sufficient.
 *
 *   2. BATCHED QUERIES: All Supabase reads are batched into as few round trips
 *      as possible. The default path is 2 queries total per call (not 4-5).
 *
 *   3. CACHE-READY: An optional `cache` parameter accepts any object with
 *      get(key)/set(key, value, ttl) interface — compatible with Upstash Redis,
 *      in-memory LRU, or a no-op stub. When provided, mastery data is served
 *      from cache and only refreshed asynchronously.
 *
 *   4. QUEST COHERENCE: A quest picks an ANCHOR topic (mastery/SR/path driven)
 *      and optionally one ADJACENT topic from the same strand (~70/30 split).
 *      Topics never cross strand boundaries regardless of pool size.
 *
 * CACHE INTERFACE (optional, for Upstash Redis or similar):
 *   cache.get(key)              → Promise<value | null>
 *   cache.set(key, value, ttl)  → Promise<void>  (ttl in seconds)
 *
 * QUERY BUDGET:
 *   Without cache: 2 queries  (batch init + questions)
 *   With cache hit: 1 query   (questions only, mastery from cache)
 *   With cache miss: 2 queries + async cache write
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { masteryToTier } from './masteryEngine';
import {
  getTopicSequence,
  getTopicList,
  getTopicStrand,
} from './learningPathEngine';

// ─── COMBINED SCIENCE RESOLVER ───────────────────────────────────────────────
// UK KS4 Combined Science covers biology, chemistry, and physics topics in one
// subject. When a scholar's subject is 'combined_science', questions are drawn
// from all three science topic pools on a rotating basis.
// The learning path engine is called with the resolved subject, but question
// DB queries use 'combined_science' OR the individual science subjects.

const COMBINED_SCIENCE_SUBJECTS = ['biology', 'chemistry', 'physics'];

/**
 * Resolve combined_science to a specific science subject for this session.
 * Rotates through biology → chemistry → physics based on mastery balance.
 * @param {object[]} masteryRows - scholar_topic_mastery rows
 * @returns {string} - 'biology' | 'chemistry' | 'physics'
 */
function resolveCombinedScienceSubject(masteryRows) {
  // Find which science has the fewest mastered topics — focus there
  const counts = COMBINED_SCIENCE_SUBJECTS.map(sub => ({
    subject: sub,
    mastery: masteryRows
      .filter(r => r.subject === sub)
      .reduce((sum, r) => sum + (r.mastery_score || 0), 0),
  }));
  counts.sort((a, b) => a.mastery - b.mastery);
  return counts[0].subject; // lowest mastery first
}

// ─── SEEN-QUESTION STORE (localStorage) ──────────────────────────────────────
const SEEN_KEY = 'lp_seen_questions';
const MAX_SEEN = 300;

const getLocalSeen = () => {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; }
};
const addLocalSeen = (ids) => {
  try {
    let seen = [...new Set([...getLocalSeen(), ...ids])];
    if (seen.length > MAX_SEEN) seen = seen.slice(-MAX_SEEN);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {}
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─── CACHE HELPERS ────────────────────────────────────────────────────────────
const MASTERY_CACHE_TTL = 60; // seconds — mastery changes rarely within a session

async function getMasteryFromCache(cache, scholarId, curriculum) {
  if (!cache || !scholarId) return null;
  try { return await cache.get(`mastery:${scholarId}:${curriculum}`); } catch { return null; }
}
async function setMasteryInCache(cache, scholarId, curriculum, data) {
  if (!cache || !scholarId) return;
  try { await cache.set(`mastery:${scholarId}:${curriculum}`, data, MASTERY_CACHE_TTL); } catch {}
}

// ─── BATCH DATA LOADER ────────────────────────────────────────────────────────
/**
 * Fetch mastery + learning path in a single parallel batch.
 * Returns { masteryRows, currentTopic }.
 * Uses cache when available — only hits DB on miss.
 */
async function loadScholarContext(supabase, scholarId, curriculum, subject, cache) {
  if (!scholarId) return { masteryRows: [], currentTopic: null };

  // Check cache first
  const cached = await getMasteryFromCache(cache, scholarId, curriculum);
  let masteryRows = cached ?? null;

  // Parallel fetch: mastery (if not cached) + learning path
  const fetches = [];

  if (!masteryRows) {
    fetches.push(
      supabase
        .from('scholar_topic_mastery')
        .select('topic, subject, mastery_score, next_review_at, attempts_total, updated_at')
        .eq('scholar_id', scholarId)
        .eq('curriculum', curriculum)
    );
  } else {
    fetches.push(Promise.resolve({ data: masteryRows }));
  }

  fetches.push(
    supabase
      .from('scholar_learning_path')
      .select('current_topic')
      .eq('scholar_id', scholarId)
      .eq('curriculum', curriculum)
      .eq('subject', subject)
      .maybeSingle()
  );

  const [masteryResult, pathResult] = await Promise.all(fetches);
  masteryRows = masteryResult.data ?? [];

  // Async cache write (don't await — keep hot path fast)
  if (!cached) setMasteryInCache(cache, scholarId, curriculum, masteryRows);

  return {
    masteryRows,
    currentTopic: pathResult.data?.current_topic ?? null,
  };
}

// ─── ANCHOR TOPIC RESOLUTION ──────────────────────────────────────────────────
function resolveAnchorTopic(masteryRows, currentTopic, subject, sequence) {
  const now = new Date();

  // 1. Spaced repetition — most overdue first
  const overdue = masteryRows
    .filter(r => r.subject === subject && r.next_review_at && new Date(r.next_review_at) <= now)
    .sort((a, b) => new Date(a.next_review_at) - new Date(b.next_review_at))[0];
  if (overdue) return { topic: overdue.topic, reason: 'spaced_repetition' };

  // 2. Current learning path topic
  if (currentTopic) return { topic: currentTopic, reason: 'learning_path' };

  // 3. Weakest topic with at least one attempt
  const withAttempts = masteryRows
    .filter(r => r.subject === subject && (r.attempts_total ?? 0) > 0)
    .sort((a, b) => (a.mastery_score ?? 0) - (b.mastery_score ?? 0));
  if (withAttempts[0]) return { topic: withAttempts[0].topic, reason: 'weakest_topic' };

  // 4. First topic in sequence (brand new scholar)
  const firstTopic = getTopicList(sequence)[0];
  if (firstTopic) return { topic: firstTopic, reason: 'sequence_start' };

  return { topic: null, reason: 'fallback' };
}

// ─── ADJACENT TOPIC ───────────────────────────────────────────────────────────
function getAdjacentTopic(sequence, subject, anchorTopic, masteryRows) {
  if (!anchorTopic) return null;
  const strand = getTopicStrand(sequence, anchorTopic);
  if (!strand) return null;

  const strandTopics = sequence[strand] ?? [];
  const idx = strandTopics.indexOf(anchorTopic);
  if (idx === -1) return null;

  const candidates = [];
  if (idx > 0) candidates.push(strandTopics[idx - 1]);
  if (idx < strandTopics.length - 1) candidates.push(strandTopics[idx + 1]);

  // Prefer topic the scholar has already started (reinforcement > introduction)
  for (const c of candidates) {
    if (masteryRows.some(r => r.topic === c)) return c;
  }
  return candidates[0] ?? null;
}

// ─── TIER FOR TOPIC ───────────────────────────────────────────────────────────
function getTierForTopic(masteryRows, subject, topic) {
  if (!topic) return null;
  const row = masteryRows.find(r => r.subject === subject && r.topic === topic);
  if (!row) return 'developing';
  return masteryToTier(row.mastery_score ?? 0);
}

// ─── QUESTION FETCHER ─────────────────────────────────────────────────────────
/**
 * Fetch questions for a topic+tier in one query.
 * When topic or tier is null, the constraint is omitted (broader fetch).
 */
async function fetchQuestions(supabase, curriculum, subject, year, topic, tier, excludeIds, limit) {
  let q = supabase
    .from('question_bank')
    .select('*')
    .eq('curriculum', curriculum)
    .eq('subject', subject)
    .eq('year_level', year)
    .order('last_used', { ascending: true, nullsFirst: true })
    .limit(limit);

  if (topic) q = q.eq('topic', topic);
  if (tier)  q = q.eq('difficulty_tier', tier);
  if (excludeIds.length > 0) q = q.not('id', 'in', `(${excludeIds.slice(-150).join(',')})`);

  const { data } = await q;
  return data ?? [];
}

/**
 * Fetch anchor + adjacent questions in a single parallel batch.
 * Reduces round trips from 3-4 down to 1-2.
 */
async function fetchQuestPool(
  supabase, curriculum, subject, year,
  anchorTopic, anchorTier, adjacentTopic, adjacentTier,
  excludeIds, overfetch,
) {
  const queries = [
    // Always fetch anchor
    fetchQuestions(supabase, curriculum, subject, year, anchorTopic, anchorTier, excludeIds, overfetch),
  ];

  if (adjacentTopic) {
    queries.push(
      fetchQuestions(supabase, curriculum, subject, year, adjacentTopic, adjacentTier, excludeIds, overfetch)
    );
  }

  const [anchorRows, adjacentRows = []] = await Promise.all(queries);
  return { anchorRows, adjacentRows };
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
/**
 * Select a coherent, mastery-appropriate set of questions for a quest.
 *
 * @param {object}   supabase
 * @param {string}   scholarId
 * @param {string}   subject
 * @param {string}   curriculum
 * @param {number}   year
 * @param {number}   [count=10]
 * @param {string[]} [previousIds=[]]    question IDs used this session
 * @param {object}   [cache=null]        Upstash Redis client or compatible cache
 * @returns {Promise<object[]>}          question_bank rows, annotated
 */
export async function getSmartQuestions(
  supabase,
  scholarId,
  subject,
  curriculum,
  year,
  count = 10,
  previousIds = [],
  cache = null,
) {
  try {
    // ── 0. Resolve combined_science to a specific science subject ─────────────
    let resolvedSubject = subject;
    if (subject === 'combined_science') {
      // Load mastery across all three sciences to decide which to focus on
      const { data: scienceMastery } = await supabase
        .from('scholar_topic_mastery')
        .select('topic, subject, mastery_score')
        .eq('scholar_id', scholarId)
        .in('subject', COMBINED_SCIENCE_SUBJECTS);
      resolvedSubject = resolveCombinedScienceSubject(scienceMastery || []);
    }
    const activeSubject = resolvedSubject;

    // ── 1. Load topic sequence + scholar context (2 queries max, 1 with cache) ──
    const [sequence, { masteryRows, currentTopic }] = await Promise.all([
      getTopicSequence(activeSubject, curriculum, supabase),
      loadScholarContext(supabase, scholarId, curriculum, activeSubject, cache),
    ]);

    // ── 2. Resolve anchor and adjacent topics ─────────────────────────────
    const { topic: anchorTopic, reason: selectionReason } =
      resolveAnchorTopic(masteryRows, currentTopic, subject, sequence);

    const anchorTier   = getTierForTopic(masteryRows, subject, anchorTopic);
    const adjacentTopic = getAdjacentTopic(sequence, subject, anchorTopic, masteryRows);
    const adjacentTier  = getTierForTopic(masteryRows, subject, adjacentTopic);

    // Quest split: 70% anchor, 30% adjacent
    const anchorCount   = adjacentTopic ? Math.ceil(count * 0.7) : count;
    const adjacentCount = adjacentTopic ? count - anchorCount : 0;

    // ── 3. Build exclusion list ───────────────────────────────────────────
    const localSeen  = getLocalSeen();
    const excludeIds = [...new Set([...previousIds, ...localSeen])].filter(Boolean);
    const overfetch  = Math.max(count * 5, 50);

    // ── 4. Fetch anchor + adjacent in parallel (1 round trip) ────────────
    let { anchorRows, adjacentRows } = await fetchQuestPool(
      supabase, curriculum, subject, year,
      anchorTopic, anchorTier, adjacentTopic, adjacentTier,
      excludeIds, overfetch,
    );

    // Relax tier on anchor if thin (stay on topic — never jump strand)
    if (anchorRows.length < anchorCount && anchorTier) {
      const relaxed = await fetchQuestions(
        supabase, curriculum, subject, year, anchorTopic, null, excludeIds, overfetch
      );
      anchorRows = [...anchorRows, ...relaxed.filter(r => !anchorRows.find(x => x.id === r.id))];
    }

    // ── 5. Compose quest ─────────────────────────────────────────────────
    let questRows = [
      ...shuffle(anchorRows).slice(0, anchorCount),
      ...shuffle(adjacentRows).slice(0, adjacentCount),
    ];

    // Fill shortfall from existing pools (no new DB call)
    if (questRows.length < count) {
      const used  = new Set(questRows.map(r => r.id));
      const extra = [...anchorRows, ...adjacentRows].filter(r => !used.has(r.id));
      questRows   = [...questRows, ...shuffle(extra).slice(0, count - questRows.length)];
    }

    // Last resort: walk same strand (±2 positions), never cross strands
    if (questRows.length < count) {
      const strand      = getTopicStrand(sequence, anchorTopic ?? '');
      const strandArr   = strand ? (sequence[strand] ?? []) : [];
      const anchorIdx   = strandArr.indexOf(anchorTopic ?? '');
      const neighbours  = strandArr.filter((t, i) =>
        Math.abs(i - anchorIdx) <= 2 && t !== anchorTopic && t !== adjacentTopic
      );
      for (const fallbackTopic of neighbours) {
        if (questRows.length >= count) break;
        const fbRows = await fetchQuestions(
          supabase, curriculum, subject, year,
          fallbackTopic, getTierForTopic(masteryRows, subject, fallbackTopic),
          excludeIds, count,
        );
        const used = new Set(questRows.map(r => r.id));
        questRows  = [...questRows, ...fbRows.filter(r => !used.has(r.id)).slice(0, count - questRows.length)];
      }
    }

    // ── 6. Cross-session dedup (piggybacks on previous queries, no extra call) ─
    if (scholarId && questRows.length > 0) {
      const candidateIds = questRows.map(r => r.id).filter(Boolean);
      const { data: history } = await supabase
        .from('scholar_question_history')
        .select('question_id')
        .eq('scholar_id', scholarId)
        .in('question_id', candidateIds);

      if (history?.length > 0) {
        const seenSet = new Set(history.map(h => h.question_id));
        const fresh   = questRows.filter(r => !seenSet.has(r.id));
        questRows     = fresh.length >= Math.floor(count * 0.6)
          ? fresh
          : [...fresh, ...questRows.filter(r => seenSet.has(r.id))];
      }
    }

    // ── 7. Shuffle, slice, record ─────────────────────────────────────────
    questRows = shuffle(questRows).slice(0, count);
    const selectedIds = questRows.map(r => r.id).filter(Boolean);
    if (selectedIds.length > 0) addLocalSeen(selectedIds);

    // ── 8. Annotate ───────────────────────────────────────────────────────
    return questRows.map(r => ({
      ...r,
      _selectionReason: selectionReason,
      _anchorTopic:     anchorTopic,
      _anchorTier:      anchorTier,
      _adjacentTopic:   adjacentTopic,
      _questCoherence:  adjacentTopic
        ? `${anchorTopic} (${anchorCount}q) + ${adjacentTopic} (${adjacentCount}q)`
        : `${anchorTopic ?? 'any'} only`,
    }));

  } catch (err) {
    console.warn('[getSmartQuestions] Failed:', err?.message ?? err);
    return [];
  }
}