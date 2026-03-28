/**
 * dynamicDifficulty.js — Real-time difficulty adjustment engine
 *
 * Keeps scholars in the "flow" state by dynamically adjusting question
 * difficulty based on recent performance within a session.
 *
 * Flow state = challenge just above current ability:
 *   - Too easy (>85% accuracy) → increase difficulty
 *   - Too hard (<45% accuracy) → decrease difficulty
 *   - Sweet spot (45-85%)      → maintain current level
 *
 * Integration:
 *   - Called by QuestOrchestrator before fetching each question batch
 *   - Writes difficulty_tier to quiz_results for analytics
 *   - Works with existing question difficulty_tier column in questions table
 *
 * Difficulty tiers: 1 (easiest) → 5 (hardest)
 *
 * Usage:
 *   import { DifficultyController } from '@/lib/dynamicDifficulty';
 *   const dc = new DifficultyController(scholarYearLevel);
 *   dc.recordAnswer(isCorrect, timeTakenMs);
 *   const nextTier = dc.getRecommendedTier();
 */

import { calculatePercentage, clamp } from "./calculationUtils";

// ─── CONFIGURATION ───────────────────────────────────────────────────────────

const MIN_TIER = 1;
const MAX_TIER = 5;

/** Sliding window size — only recent answers affect difficulty */
const WINDOW_SIZE = 8;

/** Accuracy thresholds for flow state detection */
const FLOW_THRESHOLDS = {
  tooEasy: 85,    // Accuracy above this → bump up
  tooHard: 45,    // Accuracy below this → bump down
  rapidCorrect: 10000, // If answering correctly in under 10s → likely too easy
};

/** How aggressively to adjust (1 = move one tier at a time) */
const ADJUSTMENT_STEP = 1;

/**
 * Map year levels to starting difficulty tiers.
 * Ensures a KS1 scholar doesn't start on tier 3.
 */
const YEAR_TO_START_TIER = {
  1: 1, 2: 1,         // KS1: start easy
  3: 2, 4: 2,         // KS2 lower: foundation
  5: 2, 6: 3,         // KS2 upper: developing
  7: 3, 8: 3, 9: 3,   // KS3: intermediate
  10: 3, 11: 4,        // KS4: higher
  12: 4, 13: 5,        // Sixth form: advanced
};

// ─── DIFFICULTY CONTROLLER ───────────────────────────────────────────────────

export class DifficultyController {
  /**
   * @param {number} yearLevel — scholar's year level (1-13)
   * @param {number} [initialTier] — override starting tier
   */
  constructor(yearLevel = 6, initialTier) {
    this.yearLevel = yearLevel;
    this.currentTier = initialTier ?? (YEAR_TO_START_TIER[yearLevel] || 3);
    this.answers = [];          // sliding window of recent answers
    this.adjustmentHistory = []; // track all changes for analytics
    this.sessionStartTier = this.currentTier;
    this.streakCorrect = 0;
    this.streakWrong = 0;
  }

  /**
   * Record a scholar's answer and auto-adjust difficulty.
   * @param {boolean} isCorrect
   * @param {number} [timeTakenMs] — time to answer in milliseconds
   * @returns {{ tierChanged: boolean, oldTier: number, newTier: number, reason: string }}
   */
  recordAnswer(isCorrect, timeTakenMs = null) {
    this.answers.push({ isCorrect, timeTakenMs, tier: this.currentTier });

    // Maintain sliding window
    if (this.answers.length > WINDOW_SIZE) {
      this.answers.shift();
    }

    // Update streaks
    if (isCorrect) {
      this.streakCorrect += 1;
      this.streakWrong = 0;
    } else {
      this.streakWrong += 1;
      this.streakCorrect = 0;
    }

    return this._evaluate(timeTakenMs, isCorrect);
  }

  /**
   * Get the recommended difficulty tier for the next question.
   * @returns {number} Tier 1-5
   */
  getRecommendedTier() {
    return this.currentTier;
  }

  /**
   * Get the filter clause for Supabase question queries.
   * Returns a range: [tier - 1, tier + 1] for variety.
   * @returns {{ minTier: number, maxTier: number }}
   */
  getTierRange() {
    return {
      minTier: clamp(this.currentTier - 1, MIN_TIER, MAX_TIER),
      maxTier: clamp(this.currentTier + 1, MIN_TIER, MAX_TIER),
    };
  }

  /**
   * Get analytics summary for the session.
   * @returns {object}
   */
  getSessionSummary() {
    const correct = this.answers.filter((a) => a.isCorrect).length;
    const total = this.answers.length;
    return {
      startTier: this.sessionStartTier,
      endTier: this.currentTier,
      tierDelta: this.currentTier - this.sessionStartTier,
      windowAccuracy: calculatePercentage(correct, total),
      totalAdjustments: this.adjustmentHistory.length,
      adjustments: this.adjustmentHistory,
      answersInWindow: total,
    };
  }

  /**
   * Reset for a new subject within the same session.
   * Keeps year level but resets answers and tier.
   */
  resetForSubject(initialTier) {
    this.currentTier = initialTier ?? (YEAR_TO_START_TIER[this.yearLevel] || 3);
    this.answers = [];
    this.adjustmentHistory = [];
    this.sessionStartTier = this.currentTier;
    this.streakCorrect = 0;
    this.streakWrong = 0;
  }

  // ─── PRIVATE ─────────────────────────────────────────────────────────────

  _evaluate(timeTakenMs, isCorrect) {
    const oldTier = this.currentTier;
    let reason = "stable";

    // Need at least 3 answers before adjusting
    if (this.answers.length < 3) {
      return { tierChanged: false, oldTier, newTier: oldTier, reason: "warming_up" };
    }

    const correct = this.answers.filter((a) => a.isCorrect).length;
    const accuracy = calculatePercentage(correct, this.answers.length);

    // ── Rapid escalation: 4+ correct streak with fast times → too easy ──
    if (this.streakCorrect >= 4 && timeTakenMs && timeTakenMs < FLOW_THRESHOLDS.rapidCorrect) {
      this.currentTier = clamp(this.currentTier + ADJUSTMENT_STEP, MIN_TIER, MAX_TIER);
      reason = "rapid_correct_streak";
    }
    // ── Frustration detection: 3+ wrong streak → too hard ──
    else if (this.streakWrong >= 3) {
      this.currentTier = clamp(this.currentTier - ADJUSTMENT_STEP, MIN_TIER, MAX_TIER);
      reason = "frustration_detected";
    }
    // ── Window-based adjustment ──
    else if (accuracy > FLOW_THRESHOLDS.tooEasy) {
      this.currentTier = clamp(this.currentTier + ADJUSTMENT_STEP, MIN_TIER, MAX_TIER);
      reason = "too_easy";
    } else if (accuracy < FLOW_THRESHOLDS.tooHard) {
      this.currentTier = clamp(this.currentTier - ADJUSTMENT_STEP, MIN_TIER, MAX_TIER);
      reason = "too_hard";
    }

    const tierChanged = this.currentTier !== oldTier;

    if (tierChanged) {
      this.adjustmentHistory.push({
        from: oldTier,
        to: this.currentTier,
        reason,
        afterAnswer: this.answers.length,
        accuracy,
      });
      // Reset streak counters after adjustment to avoid rapid oscillation
      this.streakCorrect = 0;
      this.streakWrong = 0;
    }

    return { tierChanged, oldTier, newTier: this.currentTier, reason };
  }
}

// ─── STATIC UTILITIES ────────────────────────────────────────────────────────

/**
 * Calculate the initial difficulty tier for a scholar based on
 * their historical mastery in a subject.
 *
 * @param {number} masteryScore — 0.0 to 1.0 from masteryEngine
 * @param {number} yearLevel
 * @returns {number} Tier 1-5
 */
export function calculateInitialTier(masteryScore, yearLevel) {
  const baseTier = YEAR_TO_START_TIER[yearLevel] || 3;

  if (masteryScore >= 0.8) return clamp(baseTier + 1, MIN_TIER, MAX_TIER);
  if (masteryScore >= 0.6) return baseTier;
  if (masteryScore >= 0.3) return clamp(baseTier - 1, MIN_TIER, MAX_TIER);
  return clamp(baseTier - 1, MIN_TIER, MAX_TIER);
}

/**
 * Get a human-readable label for a difficulty tier.
 * @param {number} tier
 * @returns {string}
 */
export function getTierLabel(tier) {
  const labels = {
    1: "Foundation",
    2: "Developing",
    3: "Expected",
    4: "Exceeding",
    5: "Challenge",
  };
  return labels[tier] || "Expected";
}
