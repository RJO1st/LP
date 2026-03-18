/**
 * mockTestCatalogue.js
 * Deploy to: src/lib/mockTestCatalogue.js
 *
 * Single source of truth for all mock test / paper configurations.
 * PaperEngine reads from here. Dashboard filters by year + curriculum.
 *
 * IMPORTANT — subject names MUST match question_bank exactly:
 *   "mathematics" not "maths"
 *   "english" for uk/ng_sss, "english_studies" for ng_jss/ng_primary
 *   "basic_science" not "basic_science_and_technology"
 *
 * Year levels MUST match DB conventions:
 *   ng_jss: 1,2,3  (not 7,8,9)
 *   ng_sss: 1,2,3  (not 10,11,12)
 *   uk_11plus: 3,4,5,6
 *   uk_national: 1-9
 */

// ─── PAPER SIZES ──────────────────────────────────────────────────────────────
export const PAPER_CONFIGS = {
  quick:    { questions: 10, minutes: 12,  label: "10 questions · 12 min"  },
  standard: { questions: 20, minutes: 25,  label: "20 questions · 25 min"  },
  full:     { questions: 30, minutes: 40,  label: "30 questions · 40 min"  },
  extended: { questions: 40, minutes: 50,  label: "40 questions · 50 min"  },
  no_timer: { questions: 20, minutes: null, label: "20 questions · No timer" },
};

// ─── CATEGORY LABELS ──────────────────────────────────────────────────────────
export const CATEGORIES = {
  exam_prep:        { label: "Exam Prep",        emoji: "🎯", color: "#6366f1" },
  subject_practice: { label: "Subject Practice", emoji: "📚", color: "#0891b2" },
  diagnostic:       { label: "Diagnostic",       emoji: "🔬", color: "#10b981" },
  waec:             { label: "WAEC / NECO",      emoji: "🇳🇬", color: "#059669" },
  bece:             { label: "BECE",             emoji: "🇳🇬", color: "#0d9488" },
};

// ─── SUBJECT NAME RESOLVER ────────────────────────────────────────────────────
// Maps display-friendly subject keys to actual DB subject names per curriculum
const SUBJECT_FOR_DB = {
  // Universal subjects (curriculum: null inherits scholar's curriculum)
  mathematics:  { default: "mathematics" },
  english:      {
    default: "english",
    ng_jss: "english_studies",
    ng_primary: "english_studies",
  },
  science:      {
    default: "science",
    ng_jss: "basic_science",
    ng_primary: "basic_science",
  },
};

/**
 * Resolve subject name for a given curriculum.
 * E.g. resolveSubjectForCurriculum("english", "ng_jss") → "english_studies"
 */
export function resolveSubjectForCurriculum(subject, curriculum) {
  const mapping = SUBJECT_FOR_DB[subject];
  if (!mapping) return subject; // no mapping = use as-is
  return mapping[curriculum] ?? mapping.default ?? subject;
}

// ─── TEST CATALOGUE ───────────────────────────────────────────────────────────
/**
 * Each test entry:
 *   id             — unique string key
 *   label          — display name shown to scholar
 *   subject        — DB subject field (MUST match question_bank.subject)
 *   subjects       — (optional) array for multi-subject tests
 *   curriculum     — which question pool: "uk_national" | "uk_11plus" | "ng_sss" etc.
 *                    null = inherits scholar's curriculum
 *   paperSize      — key in PAPER_CONFIGS
 *   examTag        — optional exam_tag filter on question_bank (null = no filter)
 *   badge          — emoji shown on the card
 *   category       — key in CATEGORIES
 *   eligibleYears  — year levels this test is appropriate for (MUST match DB year_level)
 *   description    — one-line description shown on the card
 *   difficulty     — "foundation" | "standard" | "challenging" | "exam"
 */
export const TEST_CATALOGUE = [

  // ══════════════════════════════════════════════════════════════════════════
  // 11+ EXAM PREP (uk_11plus scholars only, Y3-6)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id:            "eleven_plus_maths",
    label:         "11+ Maths",
    subject:       "mathematics",
    curriculum:    "uk_11plus",
    paperSize:     "standard",
    examTag:       "eleven_plus",
    badge:         "➕",
    category:      "exam_prep",
    eligibleYears: [4, 5, 6],
    description:   "Grammar school entry maths paper",
    difficulty:    "exam",
  },
  {
    id:            "eleven_plus_english",
    label:         "11+ English",
    subject:       "english",
    curriculum:    "uk_11plus",
    paperSize:     "standard",
    examTag:       "eleven_plus",
    badge:         "📖",
    category:      "exam_prep",
    eligibleYears: [4, 5, 6],
    description:   "Grammar school entry English paper",
    difficulty:    "exam",
  },
  {
    id:            "eleven_plus_vr",
    label:         "11+ Verbal Reasoning",
    subject:       "verbal_reasoning",
    curriculum:    "uk_11plus",
    paperSize:     "standard",
    examTag:       "eleven_plus",
    badge:         "💬",
    category:      "exam_prep",
    eligibleYears: [4, 5, 6],
    description:   "Grammar school verbal reasoning paper",
    difficulty:    "exam",
  },
  {
    id:            "eleven_plus_nvr",
    label:         "11+ Non-Verbal Reasoning",
    subject:       "nvr",
    curriculum:    "uk_11plus",
    paperSize:     "standard",
    examTag:       "eleven_plus",
    badge:         "🔷",
    category:      "exam_prep",
    eligibleYears: [4, 5, 6],
    description:   "Grammar school non-verbal reasoning paper",
    difficulty:    "exam",
  },
  {
    id:            "eleven_plus_science",
    label:         "11+ Science",
    subject:       "science",
    curriculum:    "uk_11plus",
    paperSize:     "standard",
    examTag:       "eleven_plus",
    badge:         "🔬",
    category:      "exam_prep",
    eligibleYears: [4, 5, 6],
    description:   "Grammar school science paper",
    difficulty:    "exam",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // WAEC / NECO (ng_sss scholars, SS3 only — year_level: 3)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id:            "waec_mathematics",
    label:         "WAEC Mathematics",
    subject:       "mathematics",
    curriculum:    "ng_sss",
    paperSize:     "extended",
    examTag:       "waec",
    badge:         "📏",
    category:      "waec",
    eligibleYears: [3],
    description:   "WAEC/NECO style — number theory, algebra, statistics",
    difficulty:    "exam",
  },
  {
    id:            "waec_english",
    label:         "WAEC English Language",
    subject:       "english",
    curriculum:    "ng_sss",
    paperSize:     "extended",
    examTag:       "waec",
    badge:         "📝",
    category:      "waec",
    eligibleYears: [3],
    description:   "Comprehension, lexis & structure, oral English",
    difficulty:    "exam",
  },
  {
    id:            "waec_biology",
    label:         "WAEC Biology",
    subject:       "biology",
    curriculum:    "ng_sss",
    paperSize:     "extended",
    examTag:       "waec",
    badge:         "🌿",
    category:      "waec",
    eligibleYears: [3],
    description:   "Cell biology, genetics, ecology — WAEC syllabus",
    difficulty:    "exam",
  },
  {
    id:            "waec_chemistry",
    label:         "WAEC Chemistry",
    subject:       "chemistry",
    curriculum:    "ng_sss",
    paperSize:     "extended",
    examTag:       "waec",
    badge:         "⚗️",
    category:      "waec",
    eligibleYears: [3],
    description:   "Organic, inorganic and physical chemistry — WAEC style",
    difficulty:    "exam",
  },
  {
    id:            "waec_physics",
    label:         "WAEC Physics",
    subject:       "physics",
    curriculum:    "ng_sss",
    paperSize:     "extended",
    examTag:       "waec",
    badge:         "⚡",
    category:      "waec",
    eligibleYears: [3],
    description:   "Mechanics, waves, electricity — WAEC syllabus",
    difficulty:    "exam",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BECE (ng_jss scholars, JSS3 only — year_level: 3)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id:            "bece_mathematics",
    label:         "BECE Mathematics",
    subject:       "mathematics",
    curriculum:    "ng_jss",
    paperSize:     "full",
    examTag:       "bece",
    badge:         "📐",
    category:      "bece",
    eligibleYears: [3],
    description:   "Junior WAEC mathematics paper",
    difficulty:    "exam",
  },
  {
    id:            "bece_english",
    label:         "BECE English Studies",
    subject:       "english_studies",
    curriculum:    "ng_jss",
    paperSize:     "full",
    examTag:       "bece",
    badge:         "📖",
    category:      "bece",
    eligibleYears: [3],
    description:   "Junior WAEC English studies paper",
    difficulty:    "exam",
  },
  {
    id:            "bece_basic_science",
    label:         "BECE Basic Science",
    subject:       "basic_science",
    curriculum:    "ng_jss",
    paperSize:     "full",
    examTag:       "bece",
    badge:         "🔬",
    category:      "bece",
    eligibleYears: [3],
    description:   "Junior WAEC basic science paper",
    difficulty:    "exam",
  },
  {
    id:            "bece_social_studies",
    label:         "BECE Social Studies",
    subject:       "social_studies",
    curriculum:    "ng_jss",
    paperSize:     "full",
    examTag:       "bece",
    badge:         "🌍",
    category:      "bece",
    eligibleYears: [3],
    description:   "Junior WAEC social studies paper",
    difficulty:    "exam",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SUBJECT PRACTICE (all curricula — subject resolved at query time)
  // curriculum: null means it inherits the scholar's curriculum
  // ══════════════════════════════════════════════════════════════════════════

  {
    id:            "mock_maths",
    label:         "Maths Practice Test",
    subject:       "mathematics",
    curriculum:    null,
    paperSize:     "standard",
    examTag:       null,
    badge:         "🔢",
    category:      "subject_practice",
    eligibleYears: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    description:   "Timed maths practice at your level",
    difficulty:    "standard",
  },
  {
    id:            "mock_english",
    label:         "English Practice Test",
    subject:       "english",
    curriculum:    null,
    paperSize:     "standard",
    examTag:       null,
    badge:         "📚",
    category:      "subject_practice",
    eligibleYears: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    description:   "Timed English practice at your level",
    difficulty:    "standard",
  },
  {
    id:            "mock_science",
    label:         "Science Practice Test",
    subject:       "science",
    curriculum:    null,
    paperSize:     "standard",
    examTag:       null,
    badge:         "🔭",
    category:      "subject_practice",
    eligibleYears: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    description:   "Mixed science at your level",
    difficulty:    "standard",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // DIAGNOSTIC (all curricula)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id:            "diagnostic_full",
    label:         "Full Diagnostic",
    subjects:      ["mathematics", "english", "science"],
    subject:       "mathematics",
    curriculum:    null,
    paperSize:     "no_timer",
    examTag:       null,
    badge:         "🔬",
    category:      "diagnostic",
    eligibleYears: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    description:   "See where you stand across all subjects — no time pressure",
    difficulty:    "standard",
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

// Curriculum families — maps scholar curriculum to compatible test curricula
const CURRICULUM_FAMILIES = {
  // UK
  uk_national:    ["uk_national"],
  uk_11plus:      ["uk_11plus", "uk_national"],
  // Nigerian (year levels: 1-6 primary, 1-3 JSS, 1-3 SSS)
  ng_primary:     ["ng_primary"],
  ng_jss:         ["ng_jss"],
  ng_sss:         ["ng_sss"],
  // Australian
  aus_acara:      ["aus_acara"],
  // US
  us_common_core: ["us_common_core"],
  // Canadian
  ca_primary:     ["ca_primary"],
  ca_secondary:   ["ca_secondary"],
  // IB
  ib_pyp:         ["ib_pyp"],
  ib_myp:         ["ib_myp"],
};

// Categories always shown regardless of curriculum match
const OPEN_CATEGORIES = new Set(["subject_practice", "diagnostic"]);

/**
 * Get tests appropriate for a scholar's year and curriculum.
 * Optionally filter by category.
 */
export function getTestsForScholar(yearLevel, curriculum, categoryFilter = null) {
  const year   = parseInt(yearLevel, 10) || 1;
  const family = CURRICULUM_FAMILIES[curriculum] ?? [curriculum];

  return TEST_CATALOGUE.filter(t => {
    const yearOk = t.eligibleYears.includes(year);
    const catOk  = !categoryFilter || t.category === categoryFilter;
    // Open categories: always show. Locked categories: must match curriculum family.
    const currOk = OPEN_CATEGORIES.has(t.category)
      || !t.curriculum
      || family.includes(t.curriculum);
    return yearOk && catOk && currOk;
  });
}

/**
 * Get a specific test config by id.
 */
export function getTestById(id) {
  return TEST_CATALOGUE.find(t => t.id === id) ?? null;
}

/**
 * Resolve the curriculum to use for DB queries for a given test + scholar.
 * Falls back to scholar's own curriculum when test has curriculum: null.
 */
export function resolveTestCurriculum(test, scholarCurriculum) {
  return test.curriculum ?? scholarCurriculum ?? "uk_national";
}