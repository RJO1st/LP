// src/lib/examModes.js
// ─── SINGLE SOURCE OF TRUTH for all exam modes ───────────────────────────────
// Add new exam modes here ONLY. All other files import from this module.
// Never hard-code exam mode strings elsewhere in the codebase.

export const EXAM_MODES = {
  eleven_plus: {
    label:             "11+ Prep",
    emoji:             "🎯",
    shortDesc:         "Timed 11+ mock tests",
    desc:              "Adds Verbal Reasoning & Non-Verbal Reasoning alongside the national curriculum",
    examTag:           "eleven_plus",
    eligibleCurricula: ["uk_national", "uk_11plus"],
    eligibleYears:     [3, 4, 5, 6],
    extraSubjects:     ["verbal_reasoning", "nvr"],
  },
  waec: {
    label:             "WAEC / NECO Prep",
    emoji:             "📋",
    shortDesc:         "Timed WAEC & NECO papers",
    desc:              "WAEC and NECO exam preparation for SS3 scholars",
    examTag:           "waec",
    eligibleCurricula: ["ng_sss"],
    eligibleYears:     [3],
    extraSubjects:     [],
  },
  bece: {
    label:             "BECE Practice",
    emoji:             "📝",
    shortDesc:         "Junior WAEC mock papers",
    desc:              "Basic Education Certificate Examination preparation for JSS3",
    examTag:           "bece",
    eligibleCurricula: ["ng_jss"],
    eligibleYears:     [3],
    extraSubjects:     [],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** All valid exam mode keys — use for DB constraints and runtime validation */
export const VALID_EXAM_MODES = new Set(Object.keys(EXAM_MODES));

/**
 * Returns the exam mode definition, or null if invalid/unknown.
 * Use this instead of EXAM_MODES[key] directly — provides safe fallback.
 */
export function getExamMode(examMode) {
  if (!examMode || !VALID_EXAM_MODES.has(examMode)) return null;
  return EXAM_MODES[examMode];
}

/**
 * Returns extra subjects for a given exam mode + year combination.
 * Returns [] if exam mode is invalid, unknown, or year is not eligible.
 */
export function getExamModeExtraSubjects(examMode, year) {
  const mode = getExamMode(examMode);
  if (!mode) return [];
  if (!mode.eligibleYears.includes(Number(year))) return [];
  return mode.extraSubjects;
}

/**
 * Returns true if an exam mode is valid for a given curriculum + year.
 * Use for validation in parent dashboard and server-side guards.
 */
export function isExamModeEligible(examMode, curriculum, year) {
  const mode = getExamMode(examMode);
  if (!mode) return false;
  return (
    mode.eligibleCurricula.includes(curriculum) &&
    mode.eligibleYears.includes(Number(year))
  );
}

/**
 * Returns the display label for the nav bar.
 * Falls back to curriculumName if no exam mode set.
 */
export function getExamModeNavLabel(examMode, curriculumName) {
  const mode = getExamMode(examMode);
  return mode ? `${mode.emoji} ${mode.label}` : curriculumName;
}

/**
 * Returns all exam modes eligible for a given curriculum + year.
 * Used by parent dashboard to populate exam mode selector.
 */
export function getEligibleExamModes(curriculum, year) {
  return Object.entries(EXAM_MODES)
    .filter(([, mode]) => isExamModeEligible(mode.examTag === mode.examTag, curriculum, year))
    .map(([key, mode]) => ({ key, ...mode }));
}