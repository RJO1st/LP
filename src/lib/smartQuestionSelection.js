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
import { getTopicSequence, getTopicList, getTopicStrand } from './learningPathEngine';

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

  // ── Priority 7: First topic from hardcoded foundation as absolute last resort
  // Prevents null anchor which causes an unconstrained broad DB fetch.
  // An unconstrained fetch for Y1 maths returns questions from ALL topics at
  // year_level 0-2, including division-with-remainders, multi-correct number
  // bonds etc. Better to pin to 'place_value' / 'addition' than fetch broadly.
  const FOUNDATION_DEFAULTS = {
    mathematics: 'place_value', maths: 'place_value',
    english: 'phonics', english_studies: 'phonics',
    science: 'living_organisms', basic_science: 'living_organisms',
    verbal_reasoning: 'word_relationships', verbal: 'word_relationships',
    non_verbal_reasoning: 'pattern_recognition', nvr: 'pattern_recognition',
  };
  const defaultTopic = FOUNDATION_DEFAULTS[subject] ?? null;
  if (defaultTopic) return { topic: defaultTopic, reason: 'foundation_default' };

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

  // Y1-2: use exact year match — ±1 allows Y2/Y3 content which is too advanced.
  // Y3+:  allow ±1 for topic continuity and to widen the available pool.
  const yearLow  = dbYear <= 2 ? dbYear : Math.max(1, dbYear - 1);
  const yearHigh = dbYear <= 2 ? dbYear : dbYear + 1;

  let q = supabase
    .from('question_bank')
    .select('*')
    .eq('curriculum', dbCurriculum)
    .eq('subject', dbSubject)
    .gte('year_level', yearLow)
    .lte('year_level', yearHigh)
    .limit(limit);

  if (topic)   q = q.eq('topic', topic);
  if (tier)    q = q.eq('difficulty_tier', tier);
  if (examTag) q = q.eq('exam_tag', examTag);
  if (excludeIds.length > 0) {
    const idList = excludeIds.slice(-150).map(id => `"${id}"`).join(',');
    q = q.not('id', 'in', `(${idList})`);
  }

  const { data, error } = await q;
  if (error) console.warn('[fetchQuestions] error:', error.message, `| ${dbSubject}/${dbCurriculum}/Y${year}`);

  // Boost questions that have visuals — scholars learn better with images.
  // Sort: questions with image_url first, then those with question_data visual hints, then rest.
  // Within each tier, maintain random order so sessions feel fresh.
  const rows = data ?? [];
  if (rows.length > 1) {
    rows.sort((a, b) => {
      const aHas = (a.image_url ? 2 : 0) + (a.needs_visual && a.visual_status === 'generated' ? 1 : 0);
      const bHas = (b.image_url ? 2 : 0) + (b.needs_visual && b.visual_status === 'generated' ? 1 : 0);
      if (aHas !== bHas) return bHas - aHas; // visual questions first
      return Math.random() - 0.5; // random within same tier
    });
  }
  return rows;
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
// ─── SUBJECT-SPECIFIC YEAR LEVEL ─────────────────────────────────────────────
// Reads from scholar_subject_levels table. Falls back to scholars.year_level
// if no row exists for this subject (backward compatible).
async function resolveSubjectYear(supabase, scholarId, subject, fallbackYear) {
  try {
    const { data } = await supabase
      .from('scholar_subject_levels')
      .select('year_level')
      .eq('scholar_id', scholarId)
      .eq('subject', subject)
      .maybeSingle();
    return data?.year_level ?? fallbackYear;
  } catch {
    return fallbackYear;
  }
}

// ─── QUESTION SANITISER ───────────────────────────────────────────────────────
/**
 * postProcessQuestions — client-side quality guard applied to every quest.
 *
 * Comprehensive age-appropriateness filter that catches AI-generated questions
 * which are too hard, too easy, logically broken, or contain content outside
 * the curriculum for a given year level.
 *
 * GUARD CATEGORIES:
 *
 *   MATHS (all years):
 *     1.  Number bond multi-correct (any year)
 *     2.  Numbers too large for year level
 *     3.  Division — inappropriate difficulty per year
 *     4.  Negative numbers before Y6
 *     5.  Fractions/decimals/percentages — gated by year
 *     6.  Algebra/equations — gated by year
 *     7.  Advanced topics — vectors, trig, calculus etc.
 *     8.  Multiplication beyond year-level tables
 *
 *   ENGLISH:
 *     9.  Vocabulary-definition spelling (Y1-2)
 *     10. Complex grammar terminology too early
 *     11. Reading passage complexity vs year
 *
 *   SCIENCE:
 *     12. Advanced science topics appearing too early
 *
 *   UNIVERSAL:
 *     13. Broken questions — no correct answer or contradictory explanation
 *     14. Options contain content far beyond year level
 *     15. Question text too long/complex for young scholars
 *
 * @param {object[]} rows     — raw question_bank rows (post-DB, pre-normalise)
 * @param {number}   year     — scholar's effective year level for this subject
 * @param {string}   subject  — subject key
 * @returns {object[]}        — filtered rows (bad questions removed)
 */
function postProcessQuestions(rows, year, subject) {
  if (!rows?.length) return rows;

  const yr  = Number(year) || 1;
  const sub = (subject || '').toLowerCase();

  // ── Helpers ───────────────────────────────────────────────────────────
  const extractText = (row) => (
    row.question_text ||
    row.question_data?.q ||
    (typeof row.question_data === 'string' ? (() => {
      try { return JSON.parse(row.question_data)?.q; } catch { return ''; }
    })() : '') ||
    ''
  );

  const extractOpts = (row) => {
    if (Array.isArray(row.options)) return row.options;
    if (typeof row.options === 'string') {
      try { return JSON.parse(row.options); } catch {}
    }
    return [];
  };

  const extractNums = (text) => (text.match(/\d+/g) || []).map(Number);

  const reject = (guard, row, reason) => {
    console.warn(`[sanitiser][${guard}] Rejected Y${yr} ${sub}: "${(row.question_text || '').slice(0, 70)}" — ${reason}`);
    return false;
  };

  const isMaths   = /math|maths|mathematics/.test(sub);
  const isEnglish = /english|spelling|phonics|literacy|english_studies/.test(sub);
  const isScience = /science|biology|chemistry|physics|basic_science|combined_science/.test(sub);

  // ── Number caps by year (maximum number that should appear in any context)
  const NUMBER_CAPS = {
    1: 20,   2: 100,  3: 1000,  4: 10000,
    5: 1000000, 6: 10000000,
  };
  const numCap = NUMBER_CAPS[Math.min(yr, 6)] ?? Infinity;

  return rows.filter(row => {
    const qTextRaw = extractText(row);
    const qText    = qTextRaw.toLowerCase();
    const opts     = extractOpts(row);
    const optsLower = opts.map(o => String(o).toLowerCase());
    const allText  = [qText, ...optsLower].join(' ');
    const nums     = extractNums(qTextRaw);
    const maxNum   = nums.length > 0 ? Math.max(...nums) : 0;

    // ═══════════════════════════════════════════════════════════════════
    // MATHS GUARDS
    // ═══════════════════════════════════════════════════════════════════

    if (isMaths) {

      // ── G1: Number bond multi-correct ────────────────────────────────
      const isSumQuestion = /\b(adds?\s+up\s+to|add\s+to|sum\s+(is|to|of|equals?)|make[s]?\s+\d|totals?\s+\d|total\s+(of|is)\s+\d|equal[s]?\s+\d|pairs?\s+that\s+make|number\s*bonds?)/i.test(qText);

      if (isSumQuestion && opts.length >= 2) {
        const targetMatch = qText.match(/\b(adds?\s+up\s+to|make[s]?|sum\s+(?:is|to|of|equals?)|totals?|total\s+(?:of|is)|equal[s]?)\s+(-?\d+\.?\d*)/i);
        const fallbackTarget = !targetMatch
          ? qText.match(/\bnumber\s*bonds?\b.*?(\d+)/i) || qText.match(/which\s+(?:numbers?|pair)\b.*?(\d+)/i)
          : null;
        const target = targetMatch
          ? parseFloat(targetMatch[2])
          : fallbackTarget ? parseFloat(fallbackTarget[1]) : null;

        // Negative options in number bonds for Y1-4
        if (yr <= 4 && opts.some(o => /-\d/.test(String(o)))) {
          return reject('G1', row, 'number bond with negative option');
        }

        if (target !== null) {
          const parseOptPair = (opt) => {
            const m = String(opt).match(/(-?\d+\.?\d*)\s*(?:and|&)\s*(-?\d+\.?\d*)/i);
            if (!m) return null;
            return parseFloat(m[1]) + parseFloat(m[2]);
          };
          const correctCount = opts.filter(o => {
            const sum = parseOptPair(o);
            return sum !== null && Math.abs(sum - target) < 0.001;
          }).length;

          if (correctCount > 1) {
            return reject('G1', row, `multi-correct number bond (${correctCount} correct)`);
          }
          if (correctCount === 0) {
            return reject('G1', row, 'number bond with zero correct options');
          }
        }
      }

      // ── G2: Numbers too large for year level ─────────────────────────
      // Check all numbers in question AND options against year cap.
      // Exception: question IDs, dates (years like 2024), or "Question 5 of 20"
      const questionNums = extractNums(qTextRaw);
      const optionNums   = opts.flatMap(o => extractNums(String(o)));
      const contentNums  = [...questionNums, ...optionNums].filter(n => {
        // Exclude likely dates (1900-2100) and question ordinals
        if (n >= 1900 && n <= 2100) return false;
        return true;
      });
      const maxContentNum = contentNums.length > 0 ? Math.max(...contentNums) : 0;

      if (maxContentNum > numCap) {
        return reject('G2', row, `number ${maxContentNum} exceeds Y${yr} cap of ${numCap}`);
      }

      // ── G3: Division — age-gated ─────────────────────────────────────
      const isDivision = /÷|divide[sd]?|division|shared?\s|share\s+them|split\s+(equally|between|among|them)|how\s+many\s+(each|per\s+person|groups?)/i.test(qText);

      if (isDivision) {
        // Y1: NO division at all (only halving, which is handled separately)
        if (yr <= 1 && !/\bhalf\b|\bhalves\b|\bhalving\b/i.test(qText)) {
          return reject('G3', row, 'division for Y1 (only halving allowed)');
        }

        // Y2: Only simple sharing ÷2, ÷5, ÷10, numbers ≤ 20
        if (yr <= 2) {
          const divMatch = qText.match(/(\d+)\s*(?:÷|divided\s+by|shared|split)/i) ||
                           qText.match(/share\s+(\d+)|split\s+(\d+)|divide\s+(\d+)/i) ||
                           qText.match(/have\s+(\d+)\s+\w+.*?\b(?:share|split|divide|equally)/i);
          const dividend = divMatch ? parseInt(divMatch[1] || divMatch[2] || divMatch[3], 10) : null;

          if (dividend !== null && dividend > 20) {
            return reject('G3', row, `Y2 division dividend ${dividend} > 20`);
          }
          if (dividend === null && maxNum > 20) {
            return reject('G3', row, `Y2 division with large number (max=${maxNum})`);
          }

          // Reject remainders
          const hasRemainder = opts.some(o => /remainder|r\s*\d/i.test(String(o)));
          if (hasRemainder) return reject('G3', row, 'Y2 division with remainder');

          // Odd ÷ 2 check
          const divBy2 = qText.match(/(\d+)\s*(?:÷|divided\s+by)\s*2/i);
          if (divBy2 && parseInt(divBy2[1], 10) % 2 !== 0) {
            return reject('G3', row, 'Y2 odd÷2 (has remainder)');
          }
        }

        // Y3-4: Division allowed but no remainders, numbers within year cap
        if (yr <= 4) {
          const hasRemainder = opts.some(o => /remainder|r\s*\d/i.test(String(o))) ||
                               /remainder/i.test(qText);
          if (hasRemainder) return reject('G3', row, `Y${yr} division with remainder (Y5+ topic)`);
        }
      }

      // ── G4: Negative numbers — Y6+ only ──────────────────────────────
      if (yr < 6) {
        // Check question text and options for negative numbers
        // Be careful: "minus" in subtraction context is fine, negative VALUES are not
        const hasNegative = /\b-\d+\b/.test(qTextRaw) ||
                           opts.some(o => /^-\d/.test(String(o).trim())) ||
                           /\bnegative\s+number/i.test(qText) ||
                           /\bbelow\s+zero\b/i.test(qText);
        if (hasNegative) {
          return reject('G4', row, `negative numbers before Y6`);
        }
      }

      // ── G5: Fractions / decimals / percentages — year gating ─────────
      const hasFraction   = /\b\d+\s*\/\s*\d+\b|½|¼|¾|⅓|⅔|⅕|⅛|fraction|\bquarter|\bthird|\bfifth|\beighth|\bsixth|\bseventh|\bninth|\btenth/i.test(allText);
      const hasDecimal    = /\b\d+\.\d+\b/.test(allText) && !/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/.test(allText); // exclude dates
      const hasPercentage = /%|\bpercent|\bpercentage/i.test(allText);
      const hasRatio      = /\bratio\b|\b\d+\s*:\s*\d+\b/i.test(allText);

      // Y1: No fractions at all (only "half" in sharing context)
      if (yr <= 1 && hasFraction && !/\bhalf\b|\bhalves\b/i.test(qText)) {
        return reject('G5', row, 'fractions for Y1 (only half allowed)');
      }
      // Y1-2: No decimals
      if (yr <= 2 && hasDecimal) {
        return reject('G5', row, 'decimals before Y3');
      }
      // Y1-4: No percentages
      if (yr <= 4 && hasPercentage) {
        return reject('G5', row, 'percentages before Y5');
      }
      // Y1-5: No ratios (formal ratio notation)
      if (yr <= 5 && hasRatio) {
        return reject('G5', row, 'ratios before Y6');
      }

      // ── G6: Algebra / equations — year gating ────────────────────────
      // Simple unknowns (? or □) are fine from Y1
      // Formal algebra (x, y, expressions) is Y6+
      const hasAlgebra = /\balgebra\b|\bequation\b|\bsolve\s+for\b|\bfind\s+(?:the\s+value\s+of\s+)?[xyn]\b|\b\d+[xyn]\s*[+\-=]/i.test(allText);
      const hasAdvancedAlgebra = /\bsimultaneous\b|\bquadratic\b|\bfactoris/i.test(allText);

      if (yr < 6 && hasAlgebra) {
        return reject('G6', row, 'algebra before Y6');
      }
      if (yr <= 8 && hasAdvancedAlgebra) {
        return reject('G6', row, 'advanced algebra for Y' + yr);
      }

      // ── G7: Advanced maths topics — hard block ───────────────────────
      const ADVANCED_MATHS_TERMS = {
        7:  /\bpythagoras\b|\btrigonometry\b|\bsin\b|\bcos\b|\btan\b|\bcalculus\b|\bdifferentiat/i,
        9:  /\bvector[s]?\b|\bmatrix\b|\bmatrices\b|\bintegrat(?:ion|e)\b|\bdeterminant/i,
        11: /\bcomplex\s+number/i,
      };
      for (const [minYear, pattern] of Object.entries(ADVANCED_MATHS_TERMS)) {
        if (yr < Number(minYear) && pattern.test(allText)) {
          return reject('G7', row, `advanced topic for Y${yr} (requires Y${minYear}+)`);
        }
      }

      // ── G8: Multiplication beyond year-level tables ──────────────────
      // Y2: only ×2, ×5, ×10. Y3: add ×3, ×4, ×8. Y4+: all tables to 12×12
      if (yr <= 2) {
        const mulMatch = qText.match(/(\d+)\s*[×x*]\s*(\d+)/i) ||
                         qText.match(/(\d+)\s*(?:times|multiplied\s+by|groups?\s+of)\s+(\d+)/i);
        if (mulMatch) {
          const a = parseInt(mulMatch[1], 10);
          const b = parseInt(mulMatch[2], 10);
          const allowedTables = [2, 5, 10];
          if (!allowedTables.includes(a) && !allowedTables.includes(b)) {
            return reject('G8', row, `Y2 multiplication beyond ×2/×5/×10 (${a}×${b})`);
          }
        }
      }
      if (yr === 3) {
        const mulMatch = qText.match(/(\d+)\s*[×x*]\s*(\d+)/i) ||
                         qText.match(/(\d+)\s*(?:times|multiplied\s+by|groups?\s+of)\s+(\d+)/i);
        if (mulMatch) {
          const a = parseInt(mulMatch[1], 10);
          const b = parseInt(mulMatch[2], 10);
          const allowedTables = [2, 3, 4, 5, 8, 10];
          if (!allowedTables.includes(a) && !allowedTables.includes(b)) {
            return reject('G8', row, `Y3 multiplication beyond allowed tables (${a}×${b})`);
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ENGLISH GUARDS
    // ═══════════════════════════════════════════════════════════════════

    if (isEnglish) {

      // ── G9: Y1-2 vocabulary-definition spelling ──────────────────────
      if (yr <= 2) {
        const vocabSpellingPattern = /\bword\s+that\s+means?\b|\bmeans?\s+(not\s+)?\w+\b.*\bspell|\bcorrect\s+spelling\b.*\bmeans?\b|\bspelling\b.*\bword\s+for\b/i;
        if (vocabSpellingPattern.test(qText)) {
          return reject('G9', row, 'vocab-definition spelling for Y1-2');
        }
      }

      // ── G10: Complex grammar terminology too early ───────────────────
      const GRAMMAR_GATES = {
        // Term → minimum year level required
        'subordinate clause':  3, 'subordinating conjunction': 3,
        'fronted adverbial':   4, 'possessive apostrophe': 4, 'determiner': 4,
        'modal verb':          5, 'relative clause': 5, 'relative pronoun': 5,
        'cohesion':            5, 'parenthesis': 5, 'bracket': 5, 'dash': 5,
        'subjunctive':         6, 'passive voice': 6, 'active voice': 6,
        'semi-colon':          6, 'colon':  6, 'hyphen': 6,
        'ellipsis':            6,
        'pathetic fallacy':    7, 'oxymoron': 7, 'sibilance': 7,
      };
      for (const [term, minYr] of Object.entries(GRAMMAR_GATES)) {
        if (yr < minYr && allText.includes(term)) {
          return reject('G10', row, `grammar term "${term}" requires Y${minYr}+`);
        }
      }

      // ── G11: Y1-2 question/option word length ───────────────────────
      // Y1 scholars can't read words with 8+ letters reliably
      // Y2 scholars struggle with 10+ letter words
      if (yr <= 2) {
        const maxWordLen = yr === 1 ? 8 : 10;
        const allWords = allText.split(/\s+/);
        const tooLong = allWords.filter(w => w.replace(/[^a-z]/gi, '').length > maxWordLen);
        // Allow up to 1 long word (might be the answer they're learning)
        // Reject if 3+ long words — question is clearly above level
        if (tooLong.length >= 3) {
          return reject('G11', row, `${tooLong.length} words exceed ${maxWordLen} chars for Y${yr}`);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SCIENCE GUARDS
    // ═══════════════════════════════════════════════════════════════════

    if (isScience) {

      // ── G12: Advanced science topics too early ───────────────────────
      const SCIENCE_GATES = {
        'photosynthesis':     3, // introduced Y3 (plants)
        'evaporation':        4, 'condensation': 4, 'water cycle': 4,
        'puberty':            5, 'reproduction': 5,
        'evolution':          6, 'inheritance': 6, 'fossils': 6,
        'classification key': 6,
        'dna':                7, 'chromosome': 7, 'allele': 7,
        'atomic':             7, 'electron': 7, 'proton': 7, 'neutron': 7,
        'periodic table':     7,
        'cellular respiration': 7, 'mitosis': 7,
        'isotope':            9, 'radioactive': 9,
        'quantum':            11,
      };
      for (const [term, minYr] of Object.entries(SCIENCE_GATES)) {
        if (yr < minYr && allText.includes(term)) {
          return reject('G12', row, `science term "${term}" requires Y${minYr}+`);
        }
      }

      // ── G12b: Science formula/equation notation for primary ──────────
      if (yr <= 6) {
        // Chemical formulas in question OR options — block for primary scholars
        // Explicit named formulas + pattern: CapitalLetter + lowercase? + digit(s)
        const chemPattern = /\b[A-Z][a-z]?\d+|\bNaCl\b|\bCaCO3\b|\bNaOH\b|\bHCl\b|\bKCl\b|\bH2SO4\b|\bFe2O3\b|\bMgO\b|\bKOH\b/;
        const hasChemFormula = chemPattern.test(qTextRaw) || opts.some(o => chemPattern.test(String(o)));
        // Allow "CO2" and "H2O" and "O2" as these are common knowledge
        const commonPattern = /\bCO2\b|\bH2O\b|\bO2\b|\bN2\b/;
        const isOnlyCommon = !opts.some(o => chemPattern.test(String(o)) && !commonPattern.test(String(o)));
        if (hasChemFormula && !isOnlyCommon) {
          return reject('G12b', row, 'chemical formula notation for primary');
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // UNIVERSAL GUARDS (all subjects)
    // ═══════════════════════════════════════════════════════════════════

    // ── G13: Broken questions — zero correct or self-contradictory ────
    {
      const correctIdx = row.correct_index ?? row.correct_answer_index ?? null;
      if (correctIdx !== null && opts.length > 0) {
        // correct_index out of bounds
        if (correctIdx < 0 || correctIdx >= opts.length) {
          return reject('G13', row, `correct_index ${correctIdx} out of bounds (${opts.length} options)`);
        }
      }
      // Fewer than 2 options
      if (opts.length > 0 && opts.length < 2) {
        return reject('G13', row, `only ${opts.length} option(s)`);
      }
      // Duplicate options (exact match)
      const uniqueOpts = new Set(optsLower.map(o => o.trim()));
      if (uniqueOpts.size < opts.length && opts.length > 0) {
        return reject('G13', row, 'duplicate options');
      }
    }

    // ── G14: Question text complexity — word count gate ─────────────
    // Y1-2 questions shouldn't be 40+ word essays
    if (yr <= 2 && qText.split(/\s+/).length > 35) {
      return reject('G14', row, `question too long for Y${yr} (${qText.split(/\s+/).length} words)`);
    }
    if (yr <= 4 && qText.split(/\s+/).length > 60) {
      return reject('G14', row, `question too long for Y${yr} (${qText.split(/\s+/).length} words)`);
    }

    // ── G15: Options contain clearly wrong-level content ────────────
    // E.g. a Y1 question with options like "photosynthesis", "trigonometry"
    if (yr <= 3) {
      const BANNED_OPTION_TERMS = /\balgebra\b|\btrigonometry\b|\bpythagoras\b|\bcalculus\b|\bvector\b|\bsimultaneous\b|\bquadratic\b|\bpolynomial\b|\blogarithm\b|\bderivative\b/i;
      if (opts.some(o => BANNED_OPTION_TERMS.test(String(o)))) {
        return reject('G15', row, 'options contain advanced terminology for Y' + yr);
      }
    }

    // ── G16: Maths — all numbers in Y1 must be ≤ 20 everywhere ─────
    // Catches edge cases where number cap check missed something
    // (e.g. numbers inside option text like "23 apples")
    if (isMaths && yr <= 1) {
      const allNumsEverywhere = extractNums(allText);
      const tooBig = allNumsEverywhere.filter(n => n > 20 && !(n >= 1900 && n <= 2100));
      if (tooBig.length > 0) {
        return reject('G16', row, `Y1 maths with number(s) > 20: ${tooBig.join(', ')}`);
      }
    }

    // ── G17: Explanation/answer text reveals a logical error ─────────
    // If the explanation contradicts the marked correct answer, the question is broken.
    // This is a lightweight heuristic — checks if explanation says "the answer is X"
    // but marked answer is Y.
    {
      const exp = (row.explanation || row.question_data?.exp || '').toLowerCase();
      const correctIdx = row.correct_index ?? row.correct_answer_index;
      if (exp && correctIdx != null && opts[correctIdx]) {
        const markedAnswer = String(opts[correctIdx]).toLowerCase().trim();
        // Extract what the explanation claims the answer is.
        // Capture: number + optional unit (apples, cm, kg etc), stop before "because/since/as/,"
        const expAnswerMatch = exp.match(
          /\b(?:the\s+)?(?:correct\s+)?answer\s+is\s+["']?(-?\d+[\d,.]*(?:\s+[a-z]{1,10})?)(?:\s*[.,;]|\s+(?:because|since|as|so|and|but|which|that|$))/i
        ) || exp.match(
          /\b(?:=|equals?)\s+["']?(-?\d+[\d,.]*(?:\s+[a-z]{1,10})?)(?:\s*[.,;]|\s+(?:because|since|as|so|and|but|which|that|$))/i
        );
        if (expAnswerMatch) {
          const expAnswer = (expAnswerMatch[1] || '').trim().toLowerCase();
          // If explanation names an answer that doesn't match the marked answer
          // and the explanation answer IS one of the other options → broken question
          if (expAnswer !== markedAnswer &&
              expAnswer.length > 0 &&
              optsLower.some(o => o.trim() === expAnswer || o.trim().startsWith(expAnswer))) {
            return reject('G17', row, `explanation says "${expAnswer}" but marked answer is "${markedAnswer}"`);
          }
        }
      }
    }

    // ── G18: Math arithmetic verification ────────────────────────────
    // If the question/passage/explanation contains "X + Y - Z = W", verify
    // that the arithmetic is correct and the marked answer matches.
    if (isMaths) {
      const fullText = [qTextRaw, row.passage || '', row.explanation || row.question_data?.exp || ''].join(' ');
      // Find expressions like "450 + 350 - 100 = 700"
      const exprPattern = /(\d+(?:\s*[+\-*/×÷]\s*\d+)+)\s*=\s*(\d+(?:\.\d+)?)/g;
      let exprMatch;
      while ((exprMatch = exprPattern.exec(fullText)) !== null) {
        const expr = exprMatch[1].replace(/×/g, '*').replace(/÷/g, '/').replace(/[^0-9+\-*/().]/g, '');
        const claimed = parseFloat(exprMatch[2]);
        try {
          // eslint-disable-next-line no-new-func
          const actual = new Function(`"use strict"; return (${expr})`)();
          if (typeof actual === 'number' && isFinite(actual) && Math.abs(actual - claimed) > 0.01) {
            return reject('G18', row, `math error: "${exprMatch[1]} = ${claimed}" but actual is ${actual}`);
          }
        } catch { /* skip unevaluable expressions */ }
      }

      // Also check: if we can extract numbers from a word problem and compute the answer,
      // does the marked answer match?
      const correctIdx = row.correct_index ?? row.correct_answer_index;
      if (correctIdx != null && opts[correctIdx]) {
        const markedNum = parseFloat(String(opts[correctIdx]).replace(/[^0-9.\-]/g, ''));
        if (!isNaN(markedNum)) {
          // Look for simple "A op B op C" patterns in the question
          const simpleExpr = qTextRaw.match(/(\d+)\s*([+\-])\s*(\d+)(?:\s*([+\-])\s*(\d+))?/);
          if (simpleExpr) {
            const a = parseInt(simpleExpr[1]);
            const op1 = simpleExpr[2];
            const b = parseInt(simpleExpr[3]);
            let result = op1 === '+' ? a + b : a - b;
            if (simpleExpr[4] && simpleExpr[5]) {
              const op2 = simpleExpr[4];
              const c = parseInt(simpleExpr[5]);
              result = op2 === '+' ? result + c : result - c;
            }
            // Only reject if our computed answer is in the options but differs from marked
            const computedOptIdx = opts.findIndex(o => {
              const n = parseFloat(String(o).replace(/[^0-9.\-]/g, ''));
              return !isNaN(n) && Math.abs(n - result) < 0.01;
            });
            if (computedOptIdx >= 0 && computedOptIdx !== correctIdx && Math.abs(result - markedNum) > 0.01) {
              return reject('G18', row, `computed answer ${result} (opt ${computedOptIdx}) != marked "${opts[correctIdx]}" (opt ${correctIdx})`);
            }
          }
        }
      }
    }

    return true;
  });
}

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
  focusedTopic = null,
) {
  try {
    // ── 0. Resolve combined_science to a specific science subject ─────────────
    let resolvedSubject = subject;
    if (subject === 'combined_science') {
      const { data: scienceMastery } = await supabase
        .from('scholar_topic_mastery')
        .select('topic, subject, mastery_score')
        .eq('scholar_id', scholarId)
        .in('subject', COMBINED_SCIENCE_SUBJECTS);
      resolvedSubject = resolveCombinedScienceSubject(scienceMastery || []);
    }
    const activeSubject = resolvedSubject;

    // ── 0.5. Resolve subject-specific year level ──────────────────────────
    // Override year with subject-specific level from scholar_subject_levels
    // All downstream code (fetchQuestions, passages, fallbacks) uses this
    const subjectYear = await resolveSubjectYear(supabase, scholarId, activeSubject, year);
    year = subjectYear; // shadow the parameter — subject-specific from here on

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
        .gte('year_level', dbYear <= 2 ? dbYear : Math.max(1, dbYear - 1))
        .lte('year_level', dbYear <= 2 ? dbYear : dbYear + 1)
        .limit(Math.min(count * 5, 100));

      if (broadErr) {
        console.error('[getSmartQuestions] Nuclear fallback error:', broadErr.message, broadErr.details);
      } else {
        console.log(`[getSmartQuestions] Nuclear fallback found ${broadRows?.length ?? 0} rows`);
      }
      questRows = shuffle(broadRows ?? []).slice(0, count);
    }

    // ── 6.7 Cross-curriculum fallback — borrow from closest curriculum ────
    // If a curriculum has no content yet (e.g. ca_primary just launched),
    // borrow questions from the closest matching curriculum so scholars
    // never see a blank screen.
    if (questRows.length === 0) {
      const FALLBACK_MAP = {
        ca_primary:    'aus_acara',     // Similar grade range, English-speaking
        ca_secondary:  'uk_national',   // KS3-4 content covers similar topics
        ib_pyp:        'uk_11plus',     // Primary-age, similar subjects
        ib_myp:        'uk_national',   // Secondary, similar subjects
        us_common_core:'uk_national',   // English + maths overlap
      };
      const dbCurriculum = resolveDbCurriculum(curriculum, activeSubject, year);
      const fallbackCur = FALLBACK_MAP[dbCurriculum];
      if (fallbackCur) {
        const dbSubject = resolveDbSubject(activeSubject, curriculum);
        const dbYear    = resolveDbYear(curriculum, year);
        console.warn(
          `[getSmartQuestions] Cross-curriculum fallback: ${dbCurriculum} → ${fallbackCur} ` +
          `for subject=${dbSubject}, year=${dbYear}`
        );
        const { data: fallbackRows } = await supabase
          .from('question_bank')
          .select('*')
          .eq('curriculum', fallbackCur)
          .eq('subject', dbSubject)
          .gte('year_level', Math.max(1, dbYear - 1))
          .lte('year_level', dbYear + 1)
          .limit(Math.min(count * 5, 100));

        if (fallbackRows?.length) {
          console.log(`[getSmartQuestions] Cross-curriculum fallback found ${fallbackRows.length} rows from ${fallbackCur}`);
          questRows = shuffle(fallbackRows).slice(0, count);
        }
      }
    }

    // ── 7. Post-process THEN slice ────────────────────────────────────────
    // Sanitise from the full unsliced pool so bad questions don't exhaust the count.
    // If bad questions are stripped first, the remaining good questions fill the quest.
    questRows = postProcessQuestions(questRows, year, activeSubject);
    questRows = shuffle(questRows).slice(0, count);

    // ── 7.5. Top-up if sanitiser left us short ────────────────────────────
    // If sanitisation removed enough questions to leave us below 70% of target,
    // do one broad re-fetch (no topic constraint, larger limit) to top up.
    // This handles topics where most DB rows are bad (e.g. legacy number bonds).
    if (questRows.length < Math.ceil(count * 0.7)) {
      const shortfall = count - questRows.length;
      console.warn(
        `[getSmartQuestions] Post-sanitise shortfall: ${questRows.length}/${count}. ` +
        `Fetching ${shortfall} top-up questions (no topic constraint).`
      );
      const usedIds   = new Set(questRows.map(r => r.id).filter(Boolean));
      const topUpRows = await fetchQuestions(
        supabase, curriculum, activeSubject, year,
        null,       // no topic — broad
        null,       // no tier
        [...excludeIds, ...Array.from(usedIds)],
        shortfall * 8,  // generous overfetch to survive sanitiser
        examTag,
      );
      const sanitisedTopUp = postProcessQuestions(topUpRows, year, activeSubject);
      const fresh = sanitisedTopUp.filter(r => !usedIds.has(r.id));
      questRows = [...questRows, ...shuffle(fresh).slice(0, shortfall)];
    }

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