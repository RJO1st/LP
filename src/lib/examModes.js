// src/lib/examModes.js
// ─── SINGLE SOURCE OF TRUTH for all exam modes ───────────────────────────────
// Add new exam modes here ONLY. All other files import from this module.
// Never hard-code exam mode strings elsewhere in the codebase.

export const EXAM_MODES = {
  eleven_plus: {
    label:             "11+ Prep",
    emoji:             "📝",
    desc:              "Adds Verbal Reasoning & Non-Verbal Reasoning alongside the national curriculum",
    examTag:           "eleven_plus",
    eligibleCurricula: ["uk_national"],
    eligibleYears:     [3, 4, 5, 6],
    extraSubjects:     ["verbal", "nvr"],
  },
  sats: {
    label:             "SATs Mode",
    emoji:             "📋",
    desc:              "Focuses KS2 on SATs-style questions",
    examTag:           "sats",
    eligibleCurricula: ["uk_national"],
    eligibleYears:     [6],
    extraSubjects:     [],
  },
  iseb: {
    label:             "ISEB / Pre-Test",
    emoji:             "🏫",
    desc:              "Common Pre-Test style prep for independent school entry",
    examTag:           "iseb",
    eligibleCurricula: ["uk_national"],
    eligibleYears:     [4, 5, 6, 7],
    extraSubjects:     ["verbal", "nvr"],
  },
  gcse: {
    label:             "GCSE Prep",
    emoji:             "🎓",
    desc:              "GCSE-style questions for KS4 scholars",
    examTag:           "gcse",
    eligibleCurricula: ["uk_national"],
    eligibleYears:     [9, 10, 11],
    extraSubjects:     [],   // uses scholar.selected_subjects
  },
  us_sat: {
    label:             "US SAT Prep",
    emoji:             "📐",
    desc:              "SAT-style questions for US high school scholars",
    examTag:           "us_sat",
    eligibleCurricula: ["us_common_core"],
    eligibleYears:     [10, 11, 12],
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