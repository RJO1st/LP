/**
 * masteryEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * LaunchPard — Core learning science engine (v2 — Composite Mastery).
 *
 * Implements:
 *   1. Bayesian Knowledge Tracing (BKT) — raw acquisition score
 *   2. SM-2 Spaced Repetition — schedules when to review each topic
 *   3. Stability score — derived from SM-2 repetitions + interval (retention proof)
 *   4. Forgetting-curve decay — exponential decay based on days overdue & stability
 *   5. Distributed-practice cap — limits mastery by unique calendar days practiced
 *   6. Volume cap — prevents inflation from small sample sizes
 *   7. Composite mastery score — weighted blend of acquisition, stability, recency
 *   8. Stage-gated tiers with spaced-review requirements
 *
 * CONSERVATIVE PARAMETERS — mastery builds over multiple sessions:
 *   - pLearn: 0.025   (one question = tiny boost)
 *   - pInit:  0.08    (assume scholar starts knowing very little)
 *   - pGuess: 0.30    (4-option MCQ with elimination ≈ 30%)
 *   - pSlip:  0.20    (test anxiety, rushing)
 *
 * Must match route.js (/api/mastery/update) parameters exactly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── BKT PARAMETERS (conservative — must match route.js) ─────────────────────
const BKT = {
  pLearn:  0.025,
  pSlip:   0.20,
  pGuess:  0.30,
  pInit:   0.08,
};

// ─── SM-2 DEFAULTS ───────────────────────────────────────────────────────────
const SM2_DEFAULTS = {
  easeFactor:   2.5,
  intervalDays: 1,
  repetitions:  0,
};

// ─── MASTERY THRESHOLDS → DIFFICULTY TIER ────────────────────────────────────
export const MASTERY_THRESHOLDS = {
  mastered:    0.80,
  developing:  0.45,
};

// ─── TIER GATES ──────────────────────────────────────────────────────────────
// Exceeding: score ≥ 0.80, 150+ questions, 14+ day interval, 5+ spaced reviews, 21+ unique days
// Expected:  score ≥ 0.45, 50+ questions, 3+ spaced reviews, 7+ unique days
const MIN_SEEN_FOR_EXPECTED     = 50;
const MIN_SEEN_FOR_EXCEEDING    = 150;
const MIN_INTERVAL_FOR_EXCEEDING = 14;
const MIN_SPACED_REVIEWS_EXPECTED  = 3;   // successful reviews with gap ≥ 1 day
const MIN_SPACED_REVIEWS_EXCEEDING = 5;   // successful reviews with gap ≥ 7 days
const MIN_UNIQUE_DAYS_EXPECTED     = 7;
const MIN_UNIQUE_DAYS_EXCEEDING    = 21;

// ─── VOLUME-BASED MASTERY CAPS ──────────────────────────────────────────────
// Conservative: ~500 questions per topic per year. 20 questions = ~4% coverage.
// Scholars must answer many questions across many sessions to build mastery.
const VOLUME_CAPS = [
  { minSeen:   0, maxMastery: 0.03 },  // 0-4: barely started → 3%
  { minSeen:   5, maxMastery: 0.06 },  // 5-9: first taste → 6%
  { minSeen:  10, maxMastery: 0.10 },  // 10-19: starting out → 10%
  { minSeen:  20, maxMastery: 0.15 },  // 20-34: getting going → 15%
  { minSeen:  35, maxMastery: 0.22 },  // 35-49: building → 22%
  { minSeen:  50, maxMastery: 0.35 },  // 50-74: solid practice → 35%
  { minSeen:  75, maxMastery: 0.50 },  // 75-99: substantial → 50%
  { minSeen: 100, maxMastery: 0.65 },  // 100-149: strong → 65%
  { minSeen: 150, maxMastery: 0.80 },  // 150-249: advanced → 80%
  { minSeen: 250, maxMastery: 0.90 },  // 250-399: near-complete → 90%
  { minSeen: 400, maxMastery: 0.95 },  // 400+: comprehensive → 95%
];

// ─── DISTRIBUTED-PRACTICE CAPS ──────────────────────────────────────────────
// Prevents mastery inflation from cramming all practice into one day.
// Scholars must practice across multiple calendar days to unlock higher scores.
// 1 day of practice ≈ one session — mastery barely started, no retention proof.
const PRACTICE_DAY_CAPS = [
  { minDays:  0, maxMastery: 0.02 },  // 0 unique days (impossible, but safe)
  { minDays:  1, maxMastery: 0.05 },  // single session → 5% max
  { minDays:  2, maxMastery: 0.10 },  // 2 days → 10%
  { minDays:  3, maxMastery: 0.18 },  // 3 days → 18%
  { minDays:  5, maxMastery: 0.30 },  // 5 days → 30%
  { minDays:  7, maxMastery: 0.45 },  // 7 days → 45% (unlocks "expected" path)
  { minDays: 14, maxMastery: 0.65 },  // 14 days → 65%
  { minDays: 21, maxMastery: 0.80 },  // 21 days → 80% (unlocks "exceeding" path)
  { minDays: 30, maxMastery: 0.90 },  // 30 days → 90%
  { minDays: 45, maxMastery: 1.00 },  // 45+ days → uncapped
];

// ─── COMPOSITE MASTERY WEIGHTS ──────────────────────────────────────────────
const COMPOSITE_WEIGHTS = {
  acquisition: 0.50,  // BKT raw score — "can they answer correctly?"
  stability:   0.30,  // SM-2 retention proof — "do they remember over time?"
  recency:     0.20,  // How recently reviewed — "is the knowledge fresh?"
};

// ─── FORGETTING CURVE ───────────────────────────────────────────────────────
// Exponential decay: retention = stabilityBase ^ daysOverdue
// Higher stability (more spaced reviews passed) → slower decay
const DECAY_BASE_BY_STABILITY = {
  low:    0.92,   // stability < 0.3 → loses ~8% per day overdue
  medium: 0.96,   // stability 0.3-0.6 → loses ~4% per day overdue
  high:   0.985,  // stability > 0.6 → loses ~1.5% per day overdue
};
const MAX_DECAY_DAYS = 90;  // cap decay calculation at 90 days


// ═══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Applies volume-based cap to a raw mastery score.
 */
export function capMasteryByVolume(rawScore, timesSeen = 0) {
  let cap = 0.03;
  for (const { minSeen, maxMastery } of VOLUME_CAPS) {
    if (timesSeen >= minSeen) cap = maxMastery;
  }
  return Math.min(rawScore, cap);
}

/**
 * Applies distributed-practice cap based on unique calendar days practiced.
 */
export function capMasteryByPracticeDays(rawScore, uniqueDays = 1) {
  let cap = 0.05;
  for (const { minDays, maxMastery } of PRACTICE_DAY_CAPS) {
    if (uniqueDays >= minDays) cap = maxMastery;
  }
  return Math.min(rawScore, cap);
}

/**
 * Compute stability score from SM-2 state.
 * Stability represents how well-retained the knowledge is based on:
 *   - Number of successful spaced repetitions (0-1 scale, saturates around 8+)
 *   - Current interval length (longer interval = more stable)
 *
 * @param {number} repetitions  - SM-2 repetitions count
 * @param {number} intervalDays - current SM-2 interval in days
 * @returns {number}            - stability score 0-1
 */
export function computeStability(repetitions = 0, intervalDays = 1) {
  // Repetition component: asymptotic growth — diminishing returns after many reps
  const repFactor = 1 - Math.exp(-0.35 * repetitions);  // 0→0, 1→0.30, 3→0.65, 5→0.83, 8→0.94

  // Interval component: longer intervals prove more durable memory
  // Normalised so 30-day interval ≈ 1.0
  const intervalFactor = Math.min(1, Math.log2(Math.max(1, intervalDays) + 1) / Math.log2(31));

  // Weighted blend: repetitions matter more than raw interval
  return Math.min(1, repFactor * 0.65 + intervalFactor * 0.35);
}

/**
 * Apply forgetting-curve decay to a score based on days since last review.
 * Uses stability to determine decay rate — more stable = slower forgetting.
 *
 * @param {number} score       - current mastery score
 * @param {string} lastSeenAt  - ISO timestamp of last review
 * @param {number} stability   - stability score 0-1
 * @param {number} intervalDays - current SM-2 interval
 * @returns {number}           - decayed score
 */
export function applyForgettingDecay(score, lastSeenAt, stability = 0, intervalDays = 1) {
  if (!lastSeenAt) return score;

  const daysSince = (Date.now() - new Date(lastSeenAt).getTime()) / 86_400_000;
  // Only decay if overdue (past the scheduled review date)
  const daysOverdue = Math.max(0, daysSince - intervalDays);
  if (daysOverdue <= 0) return score;

  // Select decay rate based on stability level
  const decayBase = stability > 0.6
    ? DECAY_BASE_BY_STABILITY.high
    : stability > 0.3
    ? DECAY_BASE_BY_STABILITY.medium
    : DECAY_BASE_BY_STABILITY.low;

  const cappedOverdue = Math.min(daysOverdue, MAX_DECAY_DAYS);
  const retention = Math.pow(decayBase, cappedOverdue);

  // Floor: never decay below pInit (scholar doesn't fully forget)
  return Math.max(BKT.pInit, score * retention);
}

/**
 * Compute recency factor — how recently the scholar reviewed this topic.
 * Full value if reviewed within the last 7 days, decays to 0.3 at 60+ days.
 *
 * @param {string} lastSeenAt - ISO timestamp
 * @returns {number}          - recency factor 0.3-1.0
 */
export function computeRecency(lastSeenAt) {
  if (!lastSeenAt) return 0.3;
  const daysSince = (Date.now() - new Date(lastSeenAt).getTime()) / 86_400_000;
  if (daysSince <= 7) return 1.0;
  if (daysSince >= 60) return 0.3;
  // Linear interpolation between 7 days (1.0) and 60 days (0.3)
  return 1.0 - ((daysSince - 7) / (60 - 7)) * 0.7;
}

/**
 * Compute composite mastery score.
 * Blends acquisition (BKT), stability (SM-2 retention), and recency.
 * Then applies volume + distributed-practice caps.
 *
 * @param {object} params
 * @param {number} params.acquisitionScore - BKT P(mastery) after update
 * @param {number} params.stability        - stability score 0-1
 * @param {number} params.recency          - recency factor 0.3-1.0
 * @param {number} params.timesSeen        - total questions answered
 * @param {number} params.uniquePracticeDays - unique calendar days practiced
 * @returns {number}                       - composite mastery 0-1
 */
export function computeCompositeMastery({
  acquisitionScore,
  stability,
  recency,
  timesSeen = 0,
  uniquePracticeDays = 1,
}) {
  const { acquisition: wA, stability: wS, recency: wR } = COMPOSITE_WEIGHTS;

  // Weighted composite
  let composite = (acquisitionScore * wA) + (stability * wS) + (recency * wR);

  // Clamp to 0-1
  composite = Math.max(0.01, Math.min(0.99, composite));

  // Apply both caps — the more restrictive cap wins
  composite = capMasteryByVolume(composite, timesSeen);
  composite = capMasteryByPracticeDays(composite, uniquePracticeDays);

  return composite;
}


// ═══════════════════════════════════════════════════════════════════════════════
// TIER CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps composite mastery + evidence to a difficulty tier.
 * Stage-gated with spaced-review and distributed-practice requirements.
 *
 * @param {number} masteryScore      - composite mastery 0-1
 * @param {number} intervalDays      - SM-2 interval
 * @param {number} timesSeen         - total questions answered
 * @param {number} spacedReviewCount - successful spaced reviews completed
 * @param {number} uniquePracticeDays - unique calendar days practiced
 * @returns {string}                 - 'developing' | 'expected' | 'exceeding'
 */
export function masteryToTier(
  masteryScore,
  intervalDays = 0,
  timesSeen = 0,
  spacedReviewCount = 0,
  uniquePracticeDays = 1,
) {
  if (masteryScore >= MASTERY_THRESHOLDS.mastered
      && timesSeen >= MIN_SEEN_FOR_EXCEEDING
      && intervalDays >= MIN_INTERVAL_FOR_EXCEEDING
      && spacedReviewCount >= MIN_SPACED_REVIEWS_EXCEEDING
      && uniquePracticeDays >= MIN_UNIQUE_DAYS_EXCEEDING) {
    return 'exceeding';
  }
  if (masteryScore >= MASTERY_THRESHOLDS.developing
      && timesSeen >= MIN_SEEN_FOR_EXPECTED
      && spacedReviewCount >= MIN_SPACED_REVIEWS_EXPECTED
      && uniquePracticeDays >= MIN_UNIQUE_DAYS_EXPECTED) {
    return 'expected';
  }
  return 'developing';
}

export function tierToLabel(tier) {
  return { developing: 'Building', expected: 'On Track', exceeding: 'Stellar' }[tier] ?? tier;
}

export function masteryToPercent(score) {
  return Math.round(score * 100);
}


// ═══════════════════════════════════════════════════════════════════════════════
// BKT + SM-2 CORE (unchanged algorithms, new exports)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * BKT update — P(mastery | observation).
 */
export function updateMastery(currentMastery, correct) {
  const { pLearn, pSlip, pGuess } = BKT;
  const pCorrectGiven = currentMastery * (1 - pSlip) + (1 - currentMastery) * pGuess;

  let pMasteryGivenObs;
  if (correct) {
    pMasteryGivenObs = (currentMastery * (1 - pSlip)) / pCorrectGiven;
  } else {
    pMasteryGivenObs = (currentMastery * pSlip) / (1 - pCorrectGiven);
  }

  const updated = pMasteryGivenObs + (1 - pMasteryGivenObs) * pLearn;
  return Math.max(0.01, Math.min(0.99, updated));
}

/**
 * SM-2 spaced repetition schedule update.
 */
export function updateSR(srState, correct) {
  let { easeFactor, intervalDays, repetitions } = {
    ...SM2_DEFAULTS,
    ...srState,
  };

  const quality = correct ? 4 : 1;

  if (quality >= 3) {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 3;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions  = 0;
    intervalDays = 1;
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  intervalDays = Math.min(90, Math.max(1, intervalDays));
  const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

  return { easeFactor, intervalDays, repetitions, nextReviewAt };
}


// ═══════════════════════════════════════════════════════════════════════════════
// FULL ANSWER PROCESSING (v2 — composite mastery)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine if this answer counts as a "spaced review" — i.e., the scholar
 * returned after a meaningful gap and answered correctly.
 *
 * @param {object} current  - existing mastery record
 * @param {boolean} correct - whether they answered correctly
 * @returns {boolean}
 */
function isSpacedReview(current, correct) {
  if (!correct || !current?.last_seen_at) return false;
  const daysSince = (Date.now() - new Date(current.last_seen_at).getTime()) / 86_400_000;
  // Count as spaced review if they returned after at least 1 day gap
  return daysSince >= 1;
}

/**
 * Get today's date string (YYYY-MM-DD) for tracking unique practice days.
 */
function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Count unique practice days from a stored array of date strings.
 * Adds today if not already present.
 *
 * @param {string[]} existingDays - array of "YYYY-MM-DD" strings
 * @returns {{ days: string[], count: number }}
 */
function updatePracticeDays(existingDays = []) {
  const today = todayDateString();
  const days = Array.isArray(existingDays) ? [...existingDays] : [];
  if (!days.includes(today)) {
    days.push(today);
  }
  // Keep only last 90 days to prevent unbounded growth
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const filtered = days.filter(d => d >= cutoffStr);
  return { days: filtered, count: filtered.length };
}

/**
 * Process a scholar's answer: update mastery + SR schedule + composite score.
 * Returns the full updated mastery record (for optimistic UI update).
 *
 * NEW fields in v2:
 *   - stability           (0-1, SM-2 derived retention proof)
 *   - spaced_review_count (number of successful spaced reviews)
 *   - practice_days       (string[] of YYYY-MM-DD dates)
 *   - unique_practice_days (count of unique days)
 *   - acquisition_score   (raw BKT, before composite blending)
 *   - mastery_score       (composite: acquisition × stability × recency)
 *
 * @param {object} masteryRecord  - current DB row from scholar_topic_mastery
 * @param {boolean} correct
 * @returns {object}              - updated mastery record
 */
export function processAnswer(masteryRecord, correct) {
  const current = masteryRecord ?? {
    mastery_score:       BKT.pInit,
    acquisition_score:   BKT.pInit,
    ease_factor:         SM2_DEFAULTS.easeFactor,
    interval_days:       SM2_DEFAULTS.intervalDays,
    repetitions:         SM2_DEFAULTS.repetitions,
    times_seen:          0,
    times_correct:       0,
    current_streak:      0,
    stability:           0,
    spaced_review_count: 0,
    practice_days:       [],
    unique_practice_days: 0,
  };

  // 1. Apply forgetting-curve decay to acquisition score BEFORE BKT update
  const prevStability = current.stability ?? computeStability(
    current.repetitions ?? 0,
    current.interval_days ?? 1,
  );
  const prevAcquisition = current.acquisition_score ?? current.mastery_score ?? BKT.pInit;
  const decayedAcquisition = applyForgettingDecay(
    prevAcquisition,
    current.last_seen_at,
    prevStability,
    current.interval_days ?? 1,
  );

  // 2. BKT update on decayed score
  const rawAcquisition = updateMastery(decayedAcquisition, correct);

  // 3. SM-2 schedule update
  const newSR = updateSR(
    {
      easeFactor:   current.ease_factor,
      intervalDays: current.interval_days,
      repetitions:  current.repetitions ?? 0,
    },
    correct,
  );

  // 4. Track spaced reviews
  const spacedReview = isSpacedReview(current, correct);
  const spacedReviewCount = (current.spaced_review_count ?? 0) + (spacedReview ? 1 : 0);

  // 5. Track unique practice days
  const { days: practiceDays, count: uniquePracticeDays } = updatePracticeDays(
    current.practice_days,
  );

  // 6. Compute new stability
  const newStability = computeStability(newSR.repetitions, newSR.intervalDays);

  // 7. Compute recency (it's "now" since they just answered)
  const recency = 1.0;  // just answered = maximum recency

  // 8. Volume + practice-day capped acquisition (for backward compat display)
  const timesSeen = (current.times_seen ?? 0) + 1;
  const cappedAcquisition = capMasteryByVolume(rawAcquisition, timesSeen);

  // 9. Compute composite mastery score
  const compositeMastery = computeCompositeMastery({
    acquisitionScore: cappedAcquisition,
    stability: newStability,
    recency,
    timesSeen,
    uniquePracticeDays,
  });

  // 10. Determine tier with full gating
  const tier = masteryToTier(
    compositeMastery,
    newSR.intervalDays,
    timesSeen,
    spacedReviewCount,
    uniquePracticeDays,
  );

  return {
    ...current,
    // Core scores
    mastery_score:       compositeMastery,
    acquisition_score:   cappedAcquisition,
    stability:           newStability,
    // SM-2 state
    ease_factor:         newSR.easeFactor,
    interval_days:       newSR.intervalDays,
    repetitions:         newSR.repetitions,
    next_review_at:      newSR.nextReviewAt.toISOString(),
    last_seen_at:        new Date().toISOString(),
    // Counters
    times_seen:          timesSeen,
    times_correct:       (current.times_correct ?? 0) + (correct ? 1 : 0),
    current_streak:      correct ? (current.current_streak ?? 0) + 1 : 0,
    // v2 fields
    spaced_review_count: spacedReviewCount,
    practice_days:       practiceDays,
    unique_practice_days: uniquePracticeDays,
    // Tier
    current_tier:        tier,
    updated_at:          new Date().toISOString(),
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// BATCH SESSION PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process all answers from a completed quiz session.
 */
export function processSession(scholarId, answers, masteryMap = {}) {
  const updates = {};

  for (const answer of answers) {
    const key = `${answer.curriculum}|${answer.subject}|${answer.topic}`;
    const current = updates[key] ?? masteryMap[key] ?? null;
    const updated = processAnswer(current, answer.correct);

    updates[key] = {
      ...updated,
      scholar_id:  scholarId,
      curriculum:  answer.curriculum,
      subject:     answer.subject,
      topic:       answer.topic,
      year_level:  answer.yearLevel,
    };
  }

  return Object.values(updates);
}


// ═══════════════════════════════════════════════════════════════════════════════
// SPACED REPETITION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Return topics due for review, sorted by most overdue.
 */
export function getDueTopics(masteryRecords) {
  const now = new Date();
  return masteryRecords
    .filter(r => r.next_review_at && new Date(r.next_review_at) <= now)
    .sort((a, b) => new Date(a.next_review_at) - new Date(b.next_review_at));
}

/**
 * Get mastery breakdown for UI display (acquisition, stability, recency components).
 */
export function getMasteryBreakdown(masteryRecord) {
  if (!masteryRecord) return null;

  const acquisition = masteryRecord.acquisition_score ?? masteryRecord.mastery_score ?? 0;
  const stability = masteryRecord.stability ?? computeStability(
    masteryRecord.repetitions ?? 0,
    masteryRecord.interval_days ?? 1,
  );
  const recency = computeRecency(masteryRecord.last_seen_at);

  return {
    acquisition: Math.round(acquisition * 100),
    stability: Math.round(stability * 100),
    recency: Math.round(recency * 100),
    composite: Math.round((masteryRecord.mastery_score ?? 0) * 100),
    uniqueDays: masteryRecord.unique_practice_days ?? 0,
    spacedReviews: masteryRecord.spaced_review_count ?? 0,
    tier: masteryRecord.current_tier ?? 'developing',
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// DIAGNOSTICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Score a diagnostic quiz session.
 */
export function scoreDiagnostic(answers) {
  const topicScores = {};
  const topicCounts = {};

  for (const { topic, correct } of answers) {
    if (!topicScores[topic]) { topicScores[topic] = 0; topicCounts[topic] = 0; }
    topicScores[topic] += correct ? 1 : 0;
    topicCounts[topic] += 1;
  }

  const normalised = {};
  for (const topic of Object.keys(topicScores)) {
    normalised[topic] = topicScores[topic] / topicCounts[topic];
  }

  const sorted = Object.entries(normalised).sort(([, a], [, b]) => a - b);
  const recommendedStart = sorted[0]?.[0] ?? null;

  const avgScore = Object.values(normalised).reduce((a, b) => a + b, 0) / Object.keys(normalised).length;
  const estimatedLevel = avgScore >= 0.75 ? 'above_year' : avgScore >= 0.45 ? 'at_year' : 'below_year';

  return { topicScores: normalised, recommendedStart, estimatedLevel };
}


// ═══════════════════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function masteryColour(score) {
  if (score >= 0.80) return '#22c55e';
  if (score >= 0.55) return '#f59e0b';
  return '#ef4444';
}

export function masteryEmoji(score) {
  if (score >= 0.80) return '⭐';
  if (score >= 0.55) return '📈';
  return '🔄';
}

// ─── Certificate requirements ───────────────────────────────────────────────
// Certificates require sustained "exceeding" tier — not just hitting it once.
export const CERTIFICATE_REQUIREMENTS = {
  expected: {
    minDaysAtTier:    14,    // must hold "expected" for 14+ days
    minSpacedReviews: 2,     // at least 2 successful spaced reviews
    minUniqueDays:    5,     // practiced on 5+ different days
  },
  exceeding: {
    minDaysAtTier:    30,    // must hold "exceeding" for 30+ days
    minSpacedReviews: 3,     // at least 3 successful spaced reviews
    minUniqueDays:    10,    // practiced on 10+ different days
  },
};

/**
 * Check if a scholar qualifies for a certificate at the given tier.
 */
export function checkCertificateEligibility(masteryRecord, tier) {
  const req = CERTIFICATE_REQUIREMENTS[tier];
  if (!req || !masteryRecord) return false;

  const record = masteryRecord;
  if ((record.current_tier ?? 'developing') !== tier && tier !== 'expected') return false;

  // Check tier duration (needs tier_achieved_at timestamp in DB)
  if (record.tier_achieved_at) {
    const daysAtTier = (Date.now() - new Date(record.tier_achieved_at).getTime()) / 86_400_000;
    if (daysAtTier < req.minDaysAtTier) return false;
  }

  if ((record.spaced_review_count ?? 0) < req.minSpacedReviews) return false;
  if ((record.unique_practice_days ?? 0) < req.minUniqueDays) return false;

  return true;
}


// ═══════════════════════════════════════════════════════════════════════════════
// RETENTION GATES (Point 7 — prevent path progression until retention proven)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a single topic has sufficient retention to "unlock" the next topic.
 * Used by LearningPathMap to gate sequential topic progression.
 *
 * A topic is retention-ready when:
 *   1. Composite mastery ≥ threshold (default 0.40)
 *   2. At least 1 spaced review completed (came back after ≥1 day and answered correctly)
 *   3. Practiced on ≥2 unique calendar days (not a single-session cram)
 *
 * @param {object} masteryRecord - DB row from scholar_topic_mastery
 * @param {number} [threshold=0.40] - minimum composite mastery required
 * @returns {{ ready: boolean, reasons: string[] }}
 */
export function checkRetentionGate(masteryRecord, threshold = 0.15) {
  const reasons = [];
  if (!masteryRecord) return { ready: false, reasons: ['No practice yet'] };

  const score = masteryRecord.mastery_score ?? 0;
  const spacedReviews = masteryRecord.spaced_review_count ?? 0;
  const uniqueDays = masteryRecord.unique_practice_days ?? 0;

  if (score < threshold) reasons.push(`Mastery ${Math.round(score * 100)}% < ${Math.round(threshold * 100)}%`);
  if (spacedReviews < 1) reasons.push('Needs at least 1 spaced review');
  if (uniqueDays < 3) reasons.push(`Practiced ${uniqueDays}/3 required days`);

  return { ready: reasons.length === 0, reasons };
}

/**
 * Check if a scholar is ready to advance to the next year level.
 * Aggregates retention across all topic mastery records for the current year.
 *
 * Requirements for year advancement:
 *   - ≥70% of topics must have composite mastery ≥ 0.40
 *   - ≥50% of topics must have at least 1 spaced review
 *   - Average stability across all topics must be ≥ 0.20
 *   - At least 5 total unique practice days across all topics
 *
 * @param {object[]} masteryRecords - all scholar_topic_mastery rows for this year
 * @returns {{ ready: boolean, reasons: string[], stats: object }}
 */
export function checkProgressionReadiness(masteryRecords = []) {
  if (!masteryRecords.length) {
    return { ready: false, reasons: ['No topics practiced yet'], stats: {} };
  }

  const reasons = [];
  const total = masteryRecords.length;

  const topicsAboveThreshold = masteryRecords.filter(r => (r.mastery_score ?? 0) >= 0.15).length;
  const topicsWithSpacedReview = masteryRecords.filter(r => (r.spaced_review_count ?? 0) >= 1).length;
  const avgStability = masteryRecords.reduce((sum, r) => sum + (r.stability ?? 0), 0) / total;

  // Collect all unique practice days across topics
  const allDays = new Set();
  for (const r of masteryRecords) {
    const days = r.practice_days ?? [];
    if (Array.isArray(days)) days.forEach(d => allDays.add(d));
  }
  const totalUniqueDays = allDays.size;

  const masteryPct = Math.round((topicsAboveThreshold / total) * 100);
  const spacedPct = Math.round((topicsWithSpacedReview / total) * 100);

  if (masteryPct < 70) reasons.push(`${masteryPct}% topics at mastery (need 70%)`);
  if (spacedPct < 50) reasons.push(`${spacedPct}% topics reviewed (need 50%)`);
  if (avgStability < 0.20) reasons.push(`Avg stability ${Math.round(avgStability * 100)}% (need 20%)`);
  if (totalUniqueDays < 7) reasons.push(`${totalUniqueDays}/7 practice days completed`);

  return {
    ready: reasons.length === 0,
    reasons,
    stats: {
      total,
      topicsAboveThreshold,
      topicsWithSpacedReview,
      avgStability: Math.round(avgStability * 100),
      totalUniqueDays,
      masteryPct,
      spacedPct,
    },
  };
}
