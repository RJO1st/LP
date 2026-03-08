/**
 * masteryEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * LaunchPard — Core learning science engine.
 *
 * Implements:
 *   1. Bayesian Knowledge Tracing (BKT) — estimates P(mastery) per topic
 *   2. SM-2 Spaced Repetition — schedules when to review each topic
 *   3. Adaptive tier selection — maps mastery → difficulty tier
 *
 * All heavy computation is also handled server-side by the Supabase RPC
 * `upsert_mastery_after_answer`. This client-side version is used for
 * optimistic UI updates and offline-capable session logic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── BKT PARAMETERS ──────────────────────────────────────────────────────────
const BKT = {
  pLearn:  0.15,   // P(learn): probability of learning from one question
  pSlip:   0.10,   // P(slip):  knows topic but answers wrong
  pGuess:  0.25,   // P(guess): doesn't know but guesses right (4 options)
  pInit:   0.30,   // P(init):  prior probability of already knowing topic
};

// ─── SM-2 DEFAULTS ───────────────────────────────────────────────────────────
const SM2_DEFAULTS = {
  easeFactor:   2.5,
  intervalDays: 1,
  repetitions:  0,
};

// ─── MASTERY THRESHOLDS → DIFFICULTY TIER ────────────────────────────────────
export const MASTERY_THRESHOLDS = {
  mastered:    0.80,   // ≥ 0.80 → exceeding
  developing:  0.55,   // ≥ 0.55 → expected
  // < 0.55 → developing
};

export function masteryToTier(masteryScore) {
  if (masteryScore >= MASTERY_THRESHOLDS.mastered)   return 'exceeding';
  if (masteryScore >= MASTERY_THRESHOLDS.developing) return 'expected';
  return 'developing';
}

export function tierToLabel(tier) {
  return { developing: 'Building', expected: 'On Track', exceeding: 'Stellar' }[tier] ?? tier;
}

export function masteryToPercent(score) {
  return Math.round(score * 100);
}

// ─── BKT: UPDATE P(MASTERY) GIVEN AN ANSWER ──────────────────────────────────
/**
 * Given current mastery estimate and whether the scholar answered correctly,
 * returns the updated mastery estimate using Bayesian Knowledge Tracing.
 *
 * @param {number} currentMastery  - current P(mastery), 0–1
 * @param {boolean} correct        - whether the scholar answered correctly
 * @returns {number}               - updated P(mastery)
 */
export function updateMastery(currentMastery, correct) {
  const { pLearn, pSlip, pGuess } = BKT;

  // P(correct | mastery model)
  const pCorrectGiven = currentMastery * (1 - pSlip) + (1 - currentMastery) * pGuess;

  let pMasteryGivenObs;
  if (correct) {
    // Bayes: P(mastery | correct)
    pMasteryGivenObs = (currentMastery * (1 - pSlip)) / pCorrectGiven;
  } else {
    // Bayes: P(mastery | incorrect)
    pMasteryGivenObs = (currentMastery * pSlip) / (1 - pCorrectGiven);
  }

  // Apply learning transition: even if wrong, learning may still occur
  const updated = pMasteryGivenObs + (1 - pMasteryGivenObs) * pLearn;

  // Clamp to prevent extreme values
  return Math.max(0.05, Math.min(0.99, updated));
}

// ─── SM-2: UPDATE SPACED REPETITION SCHEDULE ─────────────────────────────────
/**
 * Given current SM-2 state and correctness, returns new schedule.
 * Simplified SM-2 using quality score: correct=4, incorrect=1.
 *
 * @param {object} srState  - { easeFactor, intervalDays, repetitions }
 * @param {boolean} correct
 * @returns {object}        - { easeFactor, intervalDays, repetitions, nextReviewAt }
 */
export function updateSR(srState, correct) {
  let { easeFactor, intervalDays, repetitions } = {
    ...SM2_DEFAULTS,
    ...srState,
  };

  const quality = correct ? 4 : 1;  // simplified quality score

  if (quality >= 3) {
    // Correct answer: advance interval
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 3;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect: reset
    repetitions  = 0;
    intervalDays = 1;
  }

  // SM-2 ease factor update
  easeFactor = Math.max(
    1.3,
    easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  // Cap at 90 days
  intervalDays = Math.min(90, Math.max(1, intervalDays));

  const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

  return { easeFactor, intervalDays, repetitions, nextReviewAt };
}

// ─── FULL ANSWER PROCESSING ───────────────────────────────────────────────────
/**
 * Process a scholar's answer: update mastery + SR schedule.
 * Returns the full updated mastery record (for optimistic UI update).
 *
 * @param {object} masteryRecord  - current DB row from scholar_topic_mastery
 * @param {boolean} correct
 * @returns {object}              - updated mastery record
 */
export function processAnswer(masteryRecord, correct) {
  const current = masteryRecord ?? {
    mastery_score:  BKT.pInit,
    ease_factor:    SM2_DEFAULTS.easeFactor,
    interval_days:  SM2_DEFAULTS.intervalDays,
    repetitions:    SM2_DEFAULTS.repetitions,
    times_seen:     0,
    times_correct:  0,
    current_streak: 0,
  };

  const newMastery = updateMastery(current.mastery_score, correct);
  const newSR      = updateSR(
    {
      easeFactor:   current.ease_factor,
      intervalDays: current.interval_days,
      repetitions:  current.repetitions ?? 0,
    },
    correct
  );

  return {
    ...current,
    mastery_score:  newMastery,
    ease_factor:    newSR.easeFactor,
    interval_days:  newSR.intervalDays,
    repetitions:    newSR.repetitions,
    next_review_at: newSR.nextReviewAt.toISOString(),
    last_seen_at:   new Date().toISOString(),
    times_seen:     (current.times_seen  ?? 0) + 1,
    times_correct:  (current.times_correct ?? 0) + (correct ? 1 : 0),
    current_streak: correct ? (current.current_streak ?? 0) + 1 : 0,
    current_tier:   masteryToTier(newMastery),
    updated_at:     new Date().toISOString(),
  };
}

// ─── BATCH: PROCESS A FULL SESSION ───────────────────────────────────────────
/**
 * Process all answers from a completed quiz session.
 * Returns array of mastery update objects ready to upsert.
 *
 * @param {string} scholarId
 * @param {array}  answers   - [{ topic, subject, curriculum, yearLevel, correct, questionId }]
 * @param {object} masteryMap - existing mastery records keyed by topic
 * @returns {array}           - mastery update objects
 */
export function processSession(scholarId, answers, masteryMap = {}) {
  const updates = {};

  for (const answer of answers) {
    const key = `${answer.curriculum}|${answer.subject}|${answer.topic}`;
    const current = updates[key] ?? masteryMap[key] ?? null;
    const updated  = processAnswer(current, answer.correct);

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

// ─── SPACED REPETITION: GET DUE TOPICS ───────────────────────────────────────
/**
 * From a mastery map, return topics that are due for review (client-side check).
 *
 * @param {array} masteryRecords - array of scholar_topic_mastery rows
 * @returns {array}              - records due for review, sorted by most overdue
 */
export function getDueTopics(masteryRecords) {
  const now = new Date();
  return masteryRecords
    .filter(r => r.next_review_at && new Date(r.next_review_at) <= now)
    .sort((a, b) => new Date(a.next_review_at) - new Date(b.next_review_at));
}

// ─── DIAGNOSTICS: SCORE A DIAGNOSTIC SESSION ─────────────────────────────────
/**
 * Takes a diagnostic quiz result and returns topic scores + recommended start.
 *
 * @param {array} answers - [{ topic, correct }]
 * @returns {object}      - { topicScores, recommendedStart, estimatedLevel }
 */
export function scoreDiagnostic(answers) {
  const topicScores = {};
  const topicCounts = {};

  for (const { topic, correct } of answers) {
    if (!topicScores[topic]) { topicScores[topic] = 0; topicCounts[topic] = 0; }
    topicScores[topic] += correct ? 1 : 0;
    topicCounts[topic] += 1;
  }

  // Normalise to 0-1
  const normalised = {};
  for (const topic of Object.keys(topicScores)) {
    normalised[topic] = topicScores[topic] / topicCounts[topic];
  }

  // Weakest topic is the starting point
  const sorted = Object.entries(normalised).sort(([, a], [, b]) => a - b);
  const recommendedStart = sorted[0]?.[0] ?? null;

  // Overall level estimate
  const avgScore = Object.values(normalised).reduce((a, b) => a + b, 0) / Object.keys(normalised).length;
  const estimatedLevel = avgScore >= 0.75 ? 'above_year' : avgScore >= 0.45 ? 'at_year' : 'below_year';

  return { topicScores: normalised, recommendedStart, estimatedLevel };
}

// ─── MASTERY COLOUR HELPERS (for UI) ─────────────────────────────────────────
export function masteryColour(score) {
  if (score >= 0.80) return '#22c55e';  // green  — mastered
  if (score >= 0.55) return '#f59e0b';  // amber  — developing
  return '#ef4444';                      // red    — struggling
}

export function masteryEmoji(score) {
  if (score >= 0.80) return '⭐';
  if (score >= 0.55) return '📈';
  return '🔄';
}