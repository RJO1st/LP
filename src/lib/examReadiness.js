/**
 * examReadiness.js
 * Deploy to: src/lib/examReadiness.js
 *
 * Exam readiness score calculation library.
 * Calculates overall exam readiness, subject-specific readiness, grade estimates,
 * and identifies areas needing attention based on mastery data.
 *
 * Supports:
 *   - UK 11+ (ages 10-11): English, Maths, Verbal Reasoning, Non-Verbal Reasoning
 *   - GCSE (ages 14-16): Foundation and Higher tiers, 9-1 grading
 *   - WAEC (Nigerian): English, Maths, Sciences, Humanities — A1-F9 grading
 *   - BECE (Ghanaian): English, Maths, Sciences — 1-9 grading
 */

// ─────────────────────────────────────────────────────────────────────────────
// EXAM CONFIGURATIONS: subjects, weights, grading systems
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exam configurations with required subjects and their weights.
 * Each exam type defines subject weights (must sum to 1.0) and grading info.
 */
export const EXAM_CONFIGS = {
  eleven_plus: {
    label: "UK 11+",
    subjects: {
      english: { label: "English", weight: 0.30, icon: "📖" },
      mathematics: { label: "Maths", weight: 0.30, icon: "🔢" },
      verbal_reasoning: { label: "Verbal Reasoning", weight: 0.25, icon: "🧩" },
      nvr: { label: "Non-Verbal Reasoning", weight: 0.15, icon: "🔷" },
    },
    gradingSystem: "pass_fail",
    passThreshold: 80,
  },

  gcse_foundation: {
    label: "GCSE (Foundation)",
    subjects: {
      english: { label: "English", weight: 0.25, icon: "📖" },
      mathematics: { label: "Maths", weight: 0.25, icon: "🔢" },
      science: { label: "Combined Science", weight: 0.25, icon: "🧪" },
      humanities: { label: "Humanities", weight: 0.25, icon: "🌍" },
    },
    gradingSystem: "gcse_foundation",
    grades: ["5", "4", "3", "2", "1"],
    passGrade: "4",
  },

  gcse_higher: {
    label: "GCSE (Higher)",
    subjects: {
      english: { label: "English", weight: 0.25, icon: "📖" },
      mathematics: { label: "Maths", weight: 0.25, icon: "🔢" },
      science: { label: "Combined Science", weight: 0.25, icon: "🧪" },
      humanities: { label: "Humanities", weight: 0.25, icon: "🌍" },
    },
    gradingSystem: "gcse_higher",
    grades: ["9", "8", "7", "6", "5", "4", "3", "2", "1"],
    passGrade: "5",
  },

  waec: {
    label: "WAEC (Nigerian)",
    subjects: {
      english: { label: "English", weight: 0.25, icon: "📖" },
      mathematics: { label: "Maths", weight: 0.25, icon: "🔢" },
      sciences: { label: "Sciences", weight: 0.25, icon: "🧪" },
      humanities: { label: "Humanities", weight: 0.25, icon: "🌍" },
    },
    gradingSystem: "waec",
    grades: ["A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9"],
    passGrade: "C6",
  },

  bece: {
    label: "BECE (Ghanaian)",
    subjects: {
      english: { label: "English", weight: 0.33, icon: "📖" },
      mathematics: { label: "Maths", weight: 0.33, icon: "🔢" },
      sciences: { label: "Sciences", weight: 0.34, icon: "🧪" },
    },
    gradingSystem: "bece",
    grades: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    passGrade: "6",
  },

  // ─── Nigerian Primary — Secondary School Entrance ───────────────────────
  // Used for the school proprietor & teacher dashboards.
  // Tests the four subjects sat in Nigerian private secondary school entrance
  // exams and Common Entrance. Weights mirror typical exam score distributions.
  secondary_entrance: {
    label: "Secondary School Entrance",
    subjects: {
      mathematics: { label: "Maths",              weight: 0.30, icon: "🔢" },
      english:     { label: "English",             weight: 0.30, icon: "📖" },
      verbal_reasoning: { label: "Verbal Reasoning", weight: 0.25, icon: "🧩" },
      nvr:         { label: "Non-Verbal Reasoning", weight: 0.15, icon: "🔷" },
    },
    gradingSystem: "secondary_entrance",
    // Readiness bands shown in the school dashboard
    grades: ["Exceptional", "Ready", "Developing", "Needs Support"],
    passGrade: "Ready",
    // Score thresholds for each band
    gradeThresholds: {
      Exceptional:      85,   // ≥85 → Exceptional
      Ready:            70,   // 70–84 → Ready
      Developing:       50,   // 50–69 → Developing
      "Needs Support":   0,   // <50 → Needs Support
    },
    // Placement prediction: % chance of gaining admission at a given readiness score
    placementCurve: [
      { readiness: 90, admissionPct: 97 },
      { readiness: 80, admissionPct: 90 },
      { readiness: 70, admissionPct: 78 },
      { readiness: 60, admissionPct: 58 },
      { readiness: 50, admissionPct: 38 },
      { readiness:  0, admissionPct: 15 },
    ],
  },
};

/**
 * Grade mapping thresholds (mastery % to grade)
 * Used when calculating estimated grades
 */
const GRADE_MAPPINGS = {
  pass_fail: {
    pass: 80,
    fail: 0,
  },
  gcse_foundation: {
    5: 90,
    4: 80,
    3: 70,
    2: 60,
    1: 0,
  },
  gcse_higher: {
    9: 95,
    8: 90,
    7: 85,
    6: 80,
    5: 75,
    4: 70,
    3: 60,
    2: 50,
    1: 0,
  },
  waec: {
    A1: 95,
    B2: 85,
    B3: 75,
    C4: 65,
    C5: 60,
    C6: 55,
    D7: 50,
    E8: 40,
    F9: 0,
  },
  bece: {
    1: 95,
    2: 90,
    3: 85,
    4: 80,
    5: 75,
    6: 70,
    7: 60,
    8: 50,
    9: 0,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates exam type and returns config, or null if invalid.
 * @param {string} examType - exam key (e.g., "eleven_plus", "gcse_higher")
 * @returns {Object|null} exam config or null
 */
export function getExamConfig(examType) {
  if (!examType || !EXAM_CONFIGS[examType]) return null;
  return EXAM_CONFIGS[examType];
}

/**
 * Calculates recency factor (0-1) based on last seen date.
 * Topics seen recently count full value; stale topics are penalized.
 * Decay timeline:
 *   - 0-7 days: 1.0 (full credit)
 *   - 7-30 days: 1.0 to 0.7 (linear decay)
 *   - 30+ days: below 0.7 (aggressive penalty)
 *
 * @param {Date|string|null} lastSeenAt - ISO date string or Date object
 * @returns {number} recency factor 0-1
 */
function calculateRecencyFactor(lastSeenAt) {
  if (!lastSeenAt) return 0.3; // Unseen topics are low value

  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const daysSinceReview = (now - lastSeen) / (1000 * 60 * 60 * 24);

  if (daysSinceReview <= 7) return 1.0;
  if (daysSinceReview <= 30) {
    // Linear decay from 1.0 to 0.7 over 23 days
    return 1.0 - ((daysSinceReview - 7) / 23) * 0.3;
  }
  // Aggressive penalty for stale knowledge
  return Math.max(0.1, 0.7 - (daysSinceReview - 30) / 100);
}

/**
 * Calculates confidence factor (0-1) based on practice volume.
 * More practice = higher confidence that knowledge is solid.
 *
 * @param {number} timesSeen - number of times topic was attempted
 * @returns {number} confidence factor 0-1
 */
function calculateConfidenceFactor(timesSeen = 0) {
  const MIN_QUESTIONS = 10;
  return Math.min(1.0, Math.max(0.3, timesSeen / MIN_QUESTIONS));
}

/**
 * Calculates stability bonus (0-1) based on SM-2 stability metric.
 * Higher stability = more reliable knowledge for exam conditions.
 *
 * @param {number} stability - SM-2 stability value (0-1)
 * @returns {number} stability bonus factor 0-1
 */
function calculateStabilityBonus(stability = 0) {
  if (stability >= 0.8) return 1.0;
  if (stability >= 0.5) return 0.85 + (stability - 0.5) * 0.3;
  if (stability >= 0.3) return 0.7 + (stability - 0.3) * 0.75;
  return 0.5 + stability;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CALCULATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates overall exam readiness (0-100) from mastery data.
 * Readiness = weighted average of subject readiness scores.
 *
 * Algorithm:
 *   1. For each subject: average composite scores of all topics
 *   2. Apply recency penalty (stale topics count less)
 *   3. Apply stability bonus (proven retention)
 *   4. Weight by exam configuration
 *   5. Return weighted average clamped to 0-100
 *
 * @param {string} examType - exam key
 * @param {Object} masteryData - {subjectKey: {compositeScore, stability, recency, timesSeen, lastSeenAt}}
 * @returns {number} overall readiness 0-100, or null if invalid exam type
 */
export function calculateExamReadiness(examType, masteryData = {}) {
  const config = getExamConfig(examType);
  if (!config) return null;

  let weightedTotal = 0;
  let totalWeight = 0;

  for (const [subjectKey, subjectConfig] of Object.entries(config.subjects)) {
    const weight = subjectConfig.weight;
    const subjectMastery = masteryData[subjectKey];

    if (!subjectMastery) {
      // No data yet = 0% readiness for this subject
      totalWeight += weight;
      continue;
    }

    // Extract mastery components
    const compositeScore = subjectMastery.compositeScore || 0;
    const stability = subjectMastery.stability || 0;
    const timesSeen = subjectMastery.timesSeen || 0;
    const lastSeenAt = subjectMastery.lastSeenAt;

    // Apply adjustments
    const recencyFactor = calculateRecencyFactor(lastSeenAt);
    const confidenceFactor = calculateConfidenceFactor(timesSeen);
    const stabilityBonus = calculateStabilityBonus(stability);

    // Composite readiness = composite score × recency × confidence × stability
    const subjectReadiness = (compositeScore / 100) * recencyFactor * confidenceFactor * stabilityBonus;

    weightedTotal += subjectReadiness * weight * 100;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.min(100, Math.round(weightedTotal / totalWeight)) : 0;
}

/**
 * Gets per-subject readiness breakdown.
 * Returns an object with subject keys mapping to readiness % (0-100).
 *
 * @param {string} examType - exam key
 * @param {Object} masteryData - mastery data
 * @returns {Object|null} {subjectKey: readiness%} or null if invalid exam
 */
export function getSubjectReadiness(examType, masteryData = {}) {
  const config = getExamConfig(examType);
  if (!config) return null;

  const result = {};

  for (const [subjectKey, subjectConfig] of Object.entries(config.subjects)) {
    const subjectMastery = masteryData[subjectKey];

    if (!subjectMastery) {
      result[subjectKey] = 0;
      continue;
    }

    const compositeScore = subjectMastery.compositeScore || 0;
    const stability = subjectMastery.stability || 0;
    const timesSeen = subjectMastery.timesSeen || 0;
    const lastSeenAt = subjectMastery.lastSeenAt;

    const recencyFactor = calculateRecencyFactor(lastSeenAt);
    const confidenceFactor = calculateConfidenceFactor(timesSeen);
    const stabilityBonus = calculateStabilityBonus(stability);

    const subjectReadiness = (compositeScore / 100) * recencyFactor * confidenceFactor * stabilityBonus;
    result[subjectKey] = Math.min(100, Math.round(subjectReadiness * 100));
  }

  return result;
}

/**
 * Estimates grade based on overall readiness score.
 * Maps composite score to exam-specific grades using grade thresholds.
 *
 * @param {string} examType - exam key
 * @param {number} compositeScore - overall readiness score (0-100)
 * @returns {string|null} estimated grade (e.g., "Pass", "8", "B2") or null
 */
export function estimateGrade(examType, compositeScore = 0) {
  const config = getExamConfig(examType);
  if (!config) return null;

  const mapping = GRADE_MAPPINGS[config.gradingSystem];
  if (!mapping) return null;

  // Find the highest grade threshold we meet
  for (const [grade, threshold] of Object.entries(mapping).reverse()) {
    if (compositeScore >= threshold) {
      return grade;
    }
  }

  return Object.values(mapping).length > 0 ? Object.keys(mapping)[Object.keys(mapping).length - 1] : null;
}

/**
 * Gets the weakest areas (subjects) that need most attention.
 * Sorts subjects by readiness and returns the lowest N.
 *
 * @param {string} examType - exam key
 * @param {Object} masteryData - mastery data
 * @param {number} limit - how many weakest areas to return (default 3)
 * @returns {Array|null} [{subjectKey, label, readiness, icon}] or null if invalid exam
 */
export function getWeakestAreas(examType, masteryData = {}, limit = 3) {
  const config = getExamConfig(examType);
  if (!config) return null;

  const subjectReadiness = getSubjectReadiness(examType, masteryData);

  const weakestSubjects = Object.entries(subjectReadiness)
    .map(([subjectKey, readiness]) => ({
      subjectKey,
      label: config.subjects[subjectKey]?.label || subjectKey,
      icon: config.subjects[subjectKey]?.icon || "📚",
      readiness,
    }))
    .sort((a, b) => a.readiness - b.readiness)
    .slice(0, limit);

  return weakestSubjects;
}

/**
 * Calculates estimated days until "exam ready" at current progress rate.
 * Based on trend of recent improvements and current readiness.
 *
 * Returns null if already ready or if insufficient data for trend.
 *
 * @param {string} examType - exam key
 * @param {Object} masteryData - mastery data with optional progressHistory
 * @param {number} targetReadiness - target readiness % (default 80)
 * @returns {number|null} estimated days to reach target, or null if unable to estimate
 */
export function estimateDaysToReady(examType, masteryData = {}, targetReadiness = 80) {
  const config = getExamConfig(examType);
  if (!config) return null;

  const currentReadiness = calculateExamReadiness(examType, masteryData);
  if (currentReadiness === null) return null;

  // Already ready
  if (currentReadiness >= targetReadiness) return 0;

  // If no progress history, estimate 1 point per day (conservative)
  if (!masteryData.progressHistory || masteryData.progressHistory.length < 2) {
    const pointsNeeded = targetReadiness - currentReadiness;
    return Math.ceil(pointsNeeded / 1.0);
  }

  // Calculate improvement rate from last 7 days
  const now = new Date();
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const recentProgress = masteryData.progressHistory.filter(
    (p) => new Date(p.timestamp) >= oneWeekAgo
  );

  if (recentProgress.length < 2) {
    // Fallback to conservative estimate
    return Math.ceil((targetReadiness - currentReadiness) / 1.0);
  }

  // Calculate slope: readiness change per day
  const firstEntry = recentProgress[0];
  const lastEntry = recentProgress[recentProgress.length - 1];
  const readinessDelta = lastEntry.readiness - firstEntry.readiness;
  const timeDelta = (new Date(lastEntry.timestamp) - new Date(firstEntry.timestamp)) / (1000 * 60 * 60 * 24);

  if (timeDelta === 0) return null;

  const improvementPerDay = readinessDelta / timeDelta;

  // If not improving, return null (can't estimate)
  if (improvementPerDay <= 0) return null;

  const pointsNeeded = targetReadiness - currentReadiness;
  return Math.ceil(pointsNeeded / improvementPerDay);
}

/**
 * Gets a status indicator ("On track", "Needs attention", "At risk") based on readiness.
 *
 * @param {number} readiness - overall readiness score (0-100)
 * @param {string} examType - exam key (for context)
 * @returns {Object} {status: string, color: string, emoji: string}
 */
export function getReadinessStatus(readiness, examType = null) {
  const config = getExamConfig(examType);
  const passThreshold = config?.passThreshold || 80;

  if (readiness >= passThreshold) {
    return {
      status: "On track",
      color: "#10b981",
      emoji: "✅",
    };
  }

  if (readiness >= passThreshold - 20) {
    return {
      status: "Needs attention",
      color: "#f59e0b",
      emoji: "⚠️",
    };
  }

  return {
    status: "At risk",
    color: "#ef4444",
    emoji: "🚨",
  };
}
