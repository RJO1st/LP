import { EXAM_MODES } from './examModes';
const VALID_EXAM_MODES = new Set(Object.keys(EXAM_MODES));
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
// learningPathEngine is not yet built — these stubs keep the file functional
// until src/lib/learningPathEngine.js exists.
// Replace with: import { getTopicSequence, getTopicList, getTopicStrand } from './learningPathEngine';
let getTopicSequence = async () => ({});
let getTopicList     = () => [];
let getTopicStrand   = () => null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ({ getTopicSequence, getTopicList, getTopicStrand } = require('./learningPathEngine'));
} catch {
  // learningPathEngine.js not yet built — anchor topic resolution will fall back gracefully
}

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
const MAX_SEEN = 100; // reduced from 300 — 300 was blocking all questions in smaller topic pools

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
  try {
    // Race against a 500ms timeout — slow cache is worse than a DB hit
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('cache timeout')), 500)
    );
    return await Promise.race([
      cache.get(`mastery:${scholarId}:${curriculum}`),
      timeout,
    ]);
  } catch { return null; }
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
        .select('topic, subject, mastery_score, next_review_at, times_seen, updated_at')
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

// ─── ADAPTIVE LEARNING PATH ALGORITHM ─────────────────────────────────────────
// Automatically selects the optimal topic for a scholar. No manual selection.
// Priority: SR overdue → weakest (anti-repeat) → new introduction → reinforcement
//
// Anti-repetition: tracks last 3 topics played (from masteryRows updated_at).
// After 2 consecutive sessions on the same topic, forces rotation to next priority.
// This prevents scholars from getting stuck on one topic endlessly.
function resolveAnchorTopic(masteryRows, currentTopic, subject, sequence) {
  const now = new Date();
  const subjectRows = masteryRows.filter(r => r.subject === subject);

  // Recent topics: last 3 topics by updated_at (most recent first)
  const recentTopics = [...subjectRows]
    .filter(r => r.updated_at)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 3)
    .map(r => r.topic);

  // Anti-repeat: if same topic was practised in last 2 sessions, exclude it from priority 2+3
  const lastTwo = recentTopics.slice(0, 2);
  const repeatedTopic = lastTwo.length === 2 && lastTwo[0] === lastTwo[1] ? lastTwo[0] : null;

  // ── Priority 1: Spaced repetition — overdue review (always wins, even if repeated)
  const overdue = subjectRows
    .filter(r => r.next_review_at && new Date(r.next_review_at) <= now)
    .sort((a, b) => new Date(a.next_review_at) - new Date(b.next_review_at));

  if (overdue.length > 0) {
    // If the most overdue is the repeated topic, pick the second most overdue
    const pick = repeatedTopic && overdue[0].topic === repeatedTopic && overdue.length > 1
      ? overdue[1] : overdue[0];
    return { topic: pick.topic, reason: 'spaced_repetition' };
  }

  // ── Priority 2: Weakest topic (lowest mastery, at least 1 attempt)
  const weakest = subjectRows
    .filter(r => (r.times_seen ?? 0) > 0 && (r.mastery_score ?? 0) < 0.7)
    .filter(r => r.topic !== repeatedTopic)  // anti-repeat
    .sort((a, b) => {
      // Primary: lowest mastery first
      const scoreDiff = (a.mastery_score ?? 0) - (b.mastery_score ?? 0);
      if (Math.abs(scoreDiff) > 0.05) return scoreDiff;
      // Secondary: least recently practised (stalest first)
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateA - dateB;
    });

  if (weakest.length > 0) {
    return { topic: weakest[0].topic, reason: 'weakest_topic' };
  }

  // ── Priority 3: Introduce a new topic (unseen, from sequence)
  const topicList = getTopicList(sequence);
  const seenTopics = new Set(subjectRows.map(r => r.topic));
  const unseen = topicList.filter(t => !seenTopics.has(t));
  if (unseen.length > 0) {
    return { topic: unseen[0], reason: 'new_introduction' };
  }

  // ── Priority 4: Reinforce — stalest on-track topic (mastery 0.7-0.85)
  const reinforcement = subjectRows
    .filter(r => (r.mastery_score ?? 0) >= 0.7 && (r.mastery_score ?? 0) < 0.85)
    .filter(r => r.topic !== repeatedTopic)
    .sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateA - dateB;  // stalest first
    });

  if (reinforcement.length > 0) {
    return { topic: reinforcement[0].topic, reason: 'reinforcement' };
  }

  // ── Priority 5: Current learning path topic (fallback)
  if (currentTopic && currentTopic !== repeatedTopic) {
    return { topic: currentTopic, reason: 'learning_path' };
  }

  // ── Priority 6: First in sequence (brand new scholar)
  const firstTopic = topicList[0];
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
  // No mastery data = new scholar/topic — skip tier filter entirely
  // so ALL difficulty levels are available (foundation through exceeding)
  if (!row) return null;
  return masteryToTier(row.mastery_score ?? 0, row.interval_days ?? 0);
}

// ─── DB RESOLVERS ─────────────────────────────────────────────────────────────
// Maps scholar curriculum + year → actual DB curriculum string.
// uk_national has no core subjects for Y3-6 — those rows live under uk_11plus.
function resolveDbCurriculum(curriculum, subject, year) {
  const yr  = parseInt(year, 10) || 4;
  const cur = (curriculum || 'uk_national').toLowerCase();
  const sub = (subject || '').toLowerCase();
  // Verbal/NVR only live under uk_11plus
  if (['verbal_reasoning', 'verbal', 'nvr', 'non_verbal_reasoning'].includes(sub)) return 'uk_11plus';
  switch (cur) {
    case 'uk_national':
      // Only redirect Y3-6 to uk_11plus for subjects that exist there
      // Computing, history, geography, RE, D&T etc. stay under uk_national
      if (yr >= 3 && yr <= 6) {
        const ELEVEN_PLUS_SUBJECTS = ['mathematics', 'maths', 'math', 'english', 'science', 'verbal_reasoning', 'nvr', 'non_verbal_reasoning'];
        return ELEVEN_PLUS_SUBJECTS.includes(sub) ? 'uk_11plus' : 'uk_national';
      }
      return 'uk_national';
    case 'uk_11plus':        return 'uk_11plus';
    case 'ng_primary':
    case 'nigerian_primary': return 'ng_primary';
    case 'ng_jss':
    case 'nigerian_jss':     return 'ng_jss';
    case 'ng_sss':
    case 'nigerian_sss':     return 'ng_sss';
    case 'australian':
    case 'aus_acara':        return 'aus_acara';
    case 'waec':             return 'waec';
    case 'ib_myp':           return 'ib_myp';
    case 'ib_pyp':           return 'ib_pyp';
    case 'us_common_core':   return 'us_common_core';
    case 'ca_primary':       return 'ca_primary';
    case 'ca_secondary':     return 'ca_secondary';
    default:                 return cur;
  }
}

// ─── YEAR LEVEL RESOLVER ─────────────────────────────────────────────────────
// Most curricula store year_level matching the local convention.
// Nigerian JSS bulk data is at year_level=1,2,3 (not 7,8,9).
// Only remap if the curriculum provably uses absolute years.
function resolveDbYear(curriculum, rawYear) {
  const yr  = parseInt(rawYear, 10) || 4;
  const cur = (curriculum || '').toLowerCase();

  switch (cur) {
    case 'ng_jss':
    case 'nigerian_jss':
      // DB has bulk data at years 1-3 AND some at 7-9.
      // If scholar stores JSS2=2, query as-is (matches bulk data).
      // If somehow stored as 8, also fine (matches the smaller 7-9 batch).
      return yr;

    case 'ng_sss':
    case 'nigerian_sss':
      // SSS data stored at years 1-3 in DB
      return yr;

    case 'ng_primary':
    case 'nigerian_primary':
      return yr;

    case 'ib_myp':
      // MYP years 1-5 map to Y7-11 IF the DB uses absolute years
      // Check your DB before enabling: return yr <= 5 ? yr + 6 : yr;
      return yr;

    default:
      return yr;
  }
}

// Maps incoming subject name → DB column value
function resolveDbSubject(subject, curriculum) {
  const sub = (subject || '').toLowerCase().replace(/\s+/g, '_');
  const cur = (curriculum || '').toLowerCase();

  // Universal aliases — handle spaces, abbreviations, common variants
  const universal = {
    maths: 'mathematics', math: 'mathematics',
    verbal: 'verbal_reasoning',
    nvr: 'nvr',
    non_verbal_reasoning: 'nvr',
    dt: 'design_and_technology',
    'd&t': 'design_and_technology',
    design_technology: 'design_and_technology',
    re: 'religious_education',
    rs: 'religious_studies',
    ict: 'computing',
    it: 'computing',
    information_technology: 'computing',
    pe: 'physical_education',
    geo: 'geography',
    hist: 'history',
    bio: 'biology',
    chem: 'chemistry',
    phys: 'physics',
    lit: 'literature',
    econ: 'economics',
    gov: 'government',
    pshe: 'pshe',
    citizenship: 'civic_education',
  };
  if (universal[sub]) return universal[sub];

  // Nigerian JSS / Primary — uses english_studies, basic_science
  const isNgJssOrPrimary = ['ng_jss', 'nigerian_jss', 'ng_primary', 'nigerian_primary'].includes(cur);
  if (isNgJssOrPrimary) {
    const ngMap = {
      english:                      'english_studies',
      science:                      'basic_science',
      basic_science_and_technology: 'basic_science',
      computing:                    'basic_digital_literacy',
      ict:                          'basic_digital_literacy',
      religious_education:          'religious_studies',
    };
    if (ngMap[sub]) return ngMap[sub];
  }

  // Nigerian SSS — uses english (NOT english_studies)
  const isNgSss = ['ng_sss', 'nigerian_sss'].includes(cur);
  if (isNgSss) {
    const sssMap = {
      english_studies:          'english',
      citizenship_and_heritage: 'civic_education',
      computing:                'digital_technologies',
      ict:                      'digital_technologies',
      religious_education:      'religious_studies',
    };
    if (sssMap[sub]) return sssMap[sub];
  }

  return sub;
}

// ─── PASSAGE GROUP FETCHER ────────────────────────────────────────────────────
/**
 * Finds a passage with linked questions for the given subject/curriculum/year.
 * Returns { passage, questions } or null if no suitable passage found.
 * Prioritises passages the scholar hasn't seen recently.
 */
async function fetchPassageGroup(supabase, curriculum, subject, year, topic, excludeIds, maxQuestions) {
  const dbCurriculum = resolveDbCurriculum(curriculum, subject, year);
  const dbSubject    = resolveDbSubject(subject, curriculum);

  // Find passages with enough questions (≥2), matching curriculum+subject
  let passageQuery = supabase
    .from('passages')
    .select('id, title, body, curriculum, subject, year_level, topic, word_count, question_count')
    .eq('curriculum', dbCurriculum)
    .eq('subject', dbSubject)
    .gte('question_count', 2)
    .order('question_count', { ascending: false })
    .limit(10);

  // Prefer passages near the scholar's year level
  if (year) {
    passageQuery = passageQuery
      .gte('year_level', Math.max(1, year - 1))
      .lte('year_level', year + 1);
  }

  const { data: passages, error: pErr } = await passageQuery;
  if (pErr || !passages?.length) {
    // Broaden: try without year constraint
    const { data: broadPassages } = await supabase
      .from('passages')
      .select('id, title, body, curriculum, subject, year_level, topic, word_count, question_count')
      .eq('curriculum', dbCurriculum)
      .eq('subject', dbSubject)
      .gte('question_count', 2)
      .order('question_count', { ascending: false })
      .limit(10);
    if (!broadPassages?.length) return null;
    passages?.push?.(...broadPassages);
  }

  // Pick a passage — prefer one whose questions haven't been seen
  for (const passage of (passages || [])) {
    // Fetch ALL questions linked to this passage
    const { data: linkedQs, error: qErr } = await supabase
      .from('question_bank')
      .select('*')
      .eq('passage_id', passage.id)
      .limit(maxQuestions);

    if (qErr || !linkedQs?.length || linkedQs.length < 2) continue;

    // Check how many are in the exclude list (already seen)
    const unseenQs = linkedQs.filter(q => !excludeIds.includes(q.id));
    
    // If at least 2 unseen questions, use this passage
    if (unseenQs.length >= 2) {
      return {
        passage: {
          id: passage.id,
          title: passage.title,
          body: passage.body,
          wordCount: passage.word_count,
          topic: passage.topic,
        },
        questions: unseenQs.slice(0, maxQuestions),
      };
    }
  }

  // No suitable passage found with unseen questions
  // Fall back to any passage (allow re-reading)
  if (passages?.length) {
    const fallback = passages[0];
    const { data: fbQs } = await supabase
      .from('question_bank')
      .select('*')
      .eq('passage_id', fallback.id)
      .limit(maxQuestions);

    if (fbQs?.length >= 2) {
      return {
        passage: {
          id: fallback.id,
          title: fallback.title,
          body: fallback.body,
          wordCount: fallback.word_count,
          topic: fallback.topic,
        },
        questions: fbQs,
      };
    }
  }

  return null;
}

// ─── QUESTION FETCHER ─────────────────────────────────────────────────────────
/**
 * Fetch questions for a topic+tier in one query.
 * When topic or tier is null, the constraint is omitted (broader fetch).
 */
async function fetchQuestions(supabase, curriculum, subject, year, topic, tier, excludeIds, limit, examTag = null) {
  const dbCurriculum = resolveDbCurriculum(curriculum, subject, year);
  const dbSubject    = resolveDbSubject(subject, curriculum);
  const dbYear       = resolveDbYear(curriculum, year);

  let q = supabase
    .from('question_bank')
    .select('*')
    .eq('curriculum', dbCurriculum)
    .eq('subject', dbSubject)
    .gte('year_level', Math.max(1, dbYear - 1))
    .lte('year_level', dbYear + 1)
    .limit(limit);

  if (topic)   q = q.eq('topic', topic);
  if (tier)    q = q.eq('difficulty_tier', tier);
  if (examTag) q = q.eq('exam_tag', examTag);
  // PostgREST requires UUIDs quoted inside the parens: ("uuid1","uuid2")
  if (excludeIds.length > 0) {
    const idList = excludeIds.slice(-150).map(id => `"${id}"`).join(',');
    q = q.not('id', 'in', `(${idList})`);
  }

  const { data, error } = await q;
  if (error) console.warn('[fetchQuestions] error:', error.message, `| ${dbSubject}/${dbCurriculum}/Y${year}`);
  return data ?? [];
}

/**
 * Fetch anchor + adjacent questions in a single parallel batch.
 * Reduces round trips from 3-4 down to 1-2.
 */
async function fetchQuestPool(
  supabase, curriculum, subject, year,
  anchorTopic, anchorTier, adjacentTopic, adjacentTier,
  excludeIds, overfetch, examTag = null,
) {
  const queries = [
    // Always fetch anchor
    fetchQuestions(supabase, curriculum, subject, year, anchorTopic, anchorTier, excludeIds, overfetch, examTag),
  ];

  if (adjacentTopic) {
    queries.push(
      fetchQuestions(supabase, curriculum, subject, year, adjacentTopic, adjacentTier, excludeIds, overfetch, examTag)
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
  examMode = null,
  focusedTopic = null,  // ← NEW: when set, overrides anchor topic resolution (from JourneyMap)
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
    // Validate examMode against EXAM_MODES — rejects unknown/legacy strings silently.
    // For eleven_plus: DB rows live under curriculum=uk_11plus (not tagged with exam_tag).
    // Using examTag filter returns 0 — the curriculum resolver IS the content filter.
    const resolvedCurriculum = resolveDbCurriculum(curriculum, activeSubject, year);
    const usesCurriculumAsFilter = resolvedCurriculum !== curriculum.toLowerCase();
    const examTag = (VALID_EXAM_MODES.has(examMode) && !usesCurriculumAsFilter) ? examMode : null;

    const [sequence, { masteryRows, currentTopic }] = await Promise.all([
      getTopicSequence(activeSubject, curriculum, supabase),
      loadScholarContext(supabase, scholarId, curriculum, activeSubject, cache),
    ]);

    // ── 2. Resolve anchor and adjacent topics ─────────────────────────────
    // If focusedTopic is provided (from JourneyMap), use it directly — skip auto-resolution
    const { topic: anchorTopic, reason: selectionReason } = focusedTopic
      ? { topic: focusedTopic, reason: "journey_map_selected" }
      : resolveAnchorTopic(masteryRows, currentTopic, activeSubject, sequence);

    if (!anchorTopic) {
      console.warn(
        `[getSmartQuestions] No anchor topic found for subject=${activeSubject}, ` +
        `curriculum=${curriculum}, year=${year}. Fetching broadly.`
      );
    }

    const anchorTier   = getTierForTopic(masteryRows, activeSubject, anchorTopic);
    const adjacentTopic = getAdjacentTopic(sequence, activeSubject, anchorTopic, masteryRows);
    const adjacentTier  = getTierForTopic(masteryRows, activeSubject, adjacentTopic);

    // Quest split: 70% anchor, 30% adjacent
    const anchorCount   = adjacentTopic ? Math.ceil(count * 0.7) : count;
    const adjacentCount = adjacentTopic ? count - anchorCount : 0;

    // ── 2.5. PASSAGE GROUPING ────────────────────────────────────────────
    // If anchor topic is a comprehension/text_analysis skill, check if there
    // are passages available. If so, fetch passage + ALL its linked questions
    // as a grouped set — the scholar reads the passage once and answers all
    // questions about it. Remaining quest slots filled with non-passage questions.
    const isPassageTopic = /comprehension|text_analysis|source_analysis|inference|literary/i.test(anchorTopic ?? '');
    const isPassageSubject = /english|literature|history|geography|hass|civic|social_studies|religious|commerce|economics/i.test(activeSubject);

    if (isPassageTopic || (isPassageSubject && Math.random() < 0.3)) {
      try {
        const passageResult = await fetchPassageGroup(
          supabase, curriculum, activeSubject, year, anchorTopic, excludeIds, count
        );
        if (passageResult && passageResult.questions.length >= 2) {
          console.log(
            `[getSmartQuestions] Passage found: "${passageResult.passage.title}" ` +
            `(${passageResult.questions.length} linked questions)`
          );

          // Tag passage questions with the passage object
          const passageQs = passageResult.questions.map(r => ({
            ...r,
            _passage: passageResult.passage,
            _selectionReason: 'passage_grouped',
            _anchorTopic: anchorTopic,
          }));

          // Fill remaining slots with non-passage MCQ questions
          const passageQIds = new Set(passageQs.map(q => q.id));
          const remainingCount = count - passageQs.length;

          if (remainingCount > 0) {
            const { anchorRows } = await fetchQuestPool(
              supabase, curriculum, activeSubject, year,
              anchorTopic, anchorTier, adjacentTopic, adjacentTier,
              [...excludeIds, ...passageQs.map(q => q.id)], overfetch, examTag,
            );
            const fillers = shuffle(anchorRows)
              .filter(r => !passageQIds.has(r.id))
              .slice(0, remainingCount)
              .map(r => ({ ...r, _selectionReason: selectionReason, _anchorTopic: anchorTopic }));

            // Passage questions FIRST (scholar reads passage, then answers), fillers after
            const allQs = [...passageQs, ...fillers];
            const selectedIds = allQs.map(r => r.id).filter(Boolean);
            if (selectedIds.length > 0) addLocalSeen(selectedIds);
            return allQs;
          }

          // All slots filled by passage questions
          const selectedIds = passageQs.map(r => r.id).filter(Boolean);
          if (selectedIds.length > 0) addLocalSeen(selectedIds);
          return passageQs;
        }
      } catch (passageErr) {
        console.warn('[getSmartQuestions] Passage grouping failed (non-fatal):', passageErr?.message);
        // Fall through to normal question selection
      }
    }

    // ── 3. Build exclusion list ───────────────────────────────────────────
    // Cap at 50 most recent to prevent blocking all questions in smaller pools
    const localSeen  = getLocalSeen();
    const allExclude = [...new Set([...previousIds, ...localSeen])].filter(Boolean);
    const excludeIds = allExclude.slice(-50);
    const overfetch  = Math.max(count * 5, 50);

    // ── 4. Fetch anchor + adjacent in parallel (1 round trip) ────────────
    let { anchorRows, adjacentRows } = await fetchQuestPool(
      supabase, curriculum, activeSubject, year,
      anchorTopic, anchorTier, adjacentTopic, adjacentTier,
      excludeIds, overfetch, examTag,
    );

    // Relax tier on anchor if thin (stay on topic — never jump strand)
    if (anchorRows.length < anchorCount && anchorTier) {
      const relaxed = await fetchQuestions(
        supabase, curriculum, activeSubject, year, anchorTopic, null, excludeIds, overfetch, examTag
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
          supabase, curriculum, activeSubject, year,
          fallbackTopic, getTierForTopic(masteryRows, activeSubject, fallbackTopic),
          excludeIds, count, examTag,
        );
        const used = new Set(questRows.map(r => r.id));
        questRows  = [...questRows, ...fbRows.filter(r => !used.has(r.id)).slice(0, count - questRows.length)];
      }
    }

    // ── 6. Cross-session dedup (non-fatal — if table doesn't exist, skip) ─
    if (scholarId && questRows.length > 0) {
      try {
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
      } catch (histErr) {
        console.warn('[getSmartQuestions] history dedup skipped:', histErr?.message);
      }
    }

    // ── 6.5 Thin-coverage guard ───────────────────────────────────────────
    // If exam mode is set but fewer than 50% of questions are exam-tagged,
    // log a warning and back-fill with untagged questions so the scholar
    // never gets a broken quiz. This surfaces missing content early in logs.
    if (examTag && questRows.length < count * 0.5) {
      console.warn(
        `[examMode] Thin coverage: ${questRows.length}/${count} questions found ` +
        `for exam_tag=${examTag}, subject=${resolveDbSubject(activeSubject, curriculum)}, curriculum=${resolvedCurriculum}, year=${year}. ` +
        `Back-filling with untagged questions. Run populate scripts to fix.`
      );
      const { anchorRows: uAnchor, adjacentRows: uAdj } = await fetchQuestPool(
        supabase, curriculum, activeSubject, year,
        anchorTopic, anchorTier, adjacentTopic, adjacentTier,
        excludeIds, overfetch, null,   // null = no exam_tag filter
      );
      const used    = new Set(questRows.map(r => r.id));
      const backfill = [...uAnchor, ...uAdj].filter(r => !used.has(r.id));
      questRows = [...questRows, ...backfill].slice(0, count);
    }

    // ── 6.6 Nuclear fallback — broad fetch, no topic/tier constraints ─────
    // If ALL topic-specific queries returned zero (stubs, empty mastery, new
    // scholar, sparse DB), fetch ANY question for this subject+curriculum+year.
    // This guarantees the scholar always gets a DB quiz, never falls through
    // to the procedural engine unless the DB genuinely has zero rows.
    if (questRows.length === 0) {
      const dbCurriculum = resolveDbCurriculum(curriculum, activeSubject, year);
      const dbSubject    = resolveDbSubject(activeSubject, curriculum);
      const dbYear       = resolveDbYear(curriculum, year);
      console.warn(
        `[getSmartQuestions] Nuclear fallback: 0 questions after all topic logic. ` +
        `Direct query: subject=${dbSubject}, curriculum=${dbCurriculum}, year=${dbYear}±1`
      );
      const { data: broadRows, error: broadErr } = await supabase
        .from('question_bank')
        .select('*')
        .eq('curriculum', dbCurriculum)
        .eq('subject', dbSubject)
        .gte('year_level', Math.max(1, dbYear - 1))
        .lte('year_level', dbYear + 1)
        .limit(Math.min(count * 5, 100));

      if (broadErr) {
        console.error('[getSmartQuestions] Nuclear fallback error:', broadErr.message, broadErr.details);
      } else {
        console.log(`[getSmartQuestions] Nuclear fallback found ${broadRows?.length ?? 0} rows`);
      }
      questRows = shuffle(broadRows ?? []).slice(0, count);
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
// ── Additional exports for QuestOrchestrator's adaptive algorithm ────────────
export { getTopicSequence, loadScholarContext, resolveAnchorTopic };