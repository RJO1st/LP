/**
 * mockTestCatalogue.js
 * Deploy to: src/lib/mockTestCatalogue.js
 *
 * Single source of truth for all mock test / paper configurations.
 * PaperEngine reads from here. Dashboard filters by year + curriculum.
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
  gcse:             { label: "GCSE",             emoji: "🏆", color: "#dc2626" },
  a_level:          { label: "A-Level",          emoji: "🎓", color: "#7c3aed" },
  waec:             { label: "WAEC / NECO",      emoji: "🌍", color: "#059669" },
  sat:              { label: "SAT / ACT",        emoji: "🇺🇸", color: "#d97706" },
};

// ─── TEST CATALOGUE ───────────────────────────────────────────────────────────
/**
 * Each test entry:
 *   id             — unique string key
 *   label          — display name shown to scholar
 *   subject        — question_bank subject field to query
 *   subjects       — (optional) array, for multi-subject tests like diagnostic
 *   curriculum     — which question pool: "uk_national" | "uk_11plus" | "nigerian" etc.
 *   paperSize      — key in PAPER_CONFIGS
 *   examTag        — optional exam_tag filter on question_bank (null = no filter)
 *   badge          — emoji shown on the card
 *   category       — key in CATEGORIES
 *   eligibleYears  — year levels this test is appropriate for
 *   description    — one-line description shown on the card
 *   difficulty     — "foundation" | "standard" | "challenging" | "exam"
 */
export const TEST_CATALOGUE = [

  // ── EXAM PREP ─────────────────────────────────────────────────────────────

  {
    id:            "iseb_maths",
    label:         "ISEB Pre-Test · Maths",
    subject:       "maths",
    curriculum:    "uk_11plus",
    paperSize:     "standard",
    examTag:       "iseb",
    badge:         "📐",
    category:      "exam_prep",
    eligibleYears: [6, 7, 8],
    description:   "Independent school entry maths paper",
    difficulty:    "exam",
  },
  {
    id:            "iseb_english",
    label:         "ISEB Pre-Test · English",
    subject:       "english",
    curriculum:    "uk_11plus",
    paperSize:     "standard",
    examTag:       "iseb",
    badge:         "📝",
    category:      "exam_prep",
    eligibleYears: [6, 7, 8],
    description:   "Independent school entry English paper",
    difficulty:    "exam",
  },
  {
    id:            "iseb_verbal",
    label:         "ISEB Pre-Test · Verbal Reasoning",
    subject:       "verbal_reasoning",
    curriculum:    "uk_11plus",
    paperSize:     "standard",
    examTag:       "iseb",
    badge:         "🔤",
    category:      "exam_prep",
    eligibleYears: [6, 7, 8],
    description:   "Independent school verbal reasoning paper",
    difficulty:    "exam",
  },
  {
    id:            "iseb_nvr",
    label:         "ISEB Pre-Test · Non-Verbal Reasoning",
    subject:       "nvr",
    curriculum:    "uk_11plus",
    paperSize:     "standard",
    examTag:       "iseb",
    badge:         "🔷",
    category:      "exam_prep",
    eligibleYears: [6, 7, 8],
    description:   "Independent school non-verbal reasoning paper",
    difficulty:    "exam",
  },
  {
    id:            "eleven_plus_maths",
    label:         "11+ Maths",
    subject:       "maths",
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
    id:            "sats_maths_y6",
    label:         "SATs · Maths Y6",
    subject:       "maths",
    curriculum:    "uk_national",
    paperSize:     "full",
    examTag:       "sats",
    badge:         "🏫",
    category:      "exam_prep",
    eligibleYears: [5, 6],
    description:   "KS2 SATs maths reasoning paper",
    difficulty:    "exam",
  },
  {
    id:            "sats_english_y6",
    label:         "SATs · English Y6",
    subject:       "english",
    curriculum:    "uk_national",
    paperSize:     "full",
    examTag:       "sats",
    badge:         "✏️",
    category:      "exam_prep",
    eligibleYears: [5, 6],
    description:   "KS2 SATs English reading paper",
    difficulty:    "exam",
  },

  // ── SUBJECT PRACTICE ──────────────────────────────────────────────────────

  {
    id:            "mock_maths",
    label:         "Maths Mock Test",
    subject:       "maths",
    curriculum:    null,        // inherits scholar's curriculum
    paperSize:     "standard",
    examTag:       null,
    badge:         "🔢",
    category:      "subject_practice",
    eligibleYears: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    description:   "Timed maths practice at your level",
    difficulty:    "standard",
  },
  {
    id:            "mock_english",
    label:         "English Mock Test",
    subject:       "english",
    curriculum:    null,
    paperSize:     "standard",
    examTag:       null,
    badge:         "📚",
    category:      "subject_practice",
    eligibleYears: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    description:   "Timed English practice at your level",
    difficulty:    "standard",
  },
  {
    id:            "mock_science",
    label:         "Science Mock Test",
    subject:       "science",
    curriculum:    null,
    paperSize:     "standard",
    examTag:       null,
    badge:         "🔭",
    category:      "subject_practice",
    eligibleYears: [3, 4, 5, 6, 7, 8, 9],
    description:   "Mixed science — plants, animals, materials, forces",
    difficulty:    "standard",
  },
  {
    id:            "mock_physics",
    label:         "Physics Mock Test",
    subject:       "physics",
    curriculum:    null,
    paperSize:     "standard",
    examTag:       null,
    badge:         "⚡",
    category:      "subject_practice",
    eligibleYears: [7, 8, 9, 10, 11],
    description:   "Forces, waves, electricity, energy",
    difficulty:    "standard",
  },
  {
    id:            "mock_chemistry",
    label:         "Chemistry Mock Test",
    subject:       "chemistry",
    curriculum:    null,
    paperSize:     "standard",
    examTag:       null,
    badge:         "⚗️",
    category:      "subject_practice",
    eligibleYears: [7, 8, 9, 10, 11],
    description:   "Atoms, reactions, periodic table, pH",
    difficulty:    "standard",
  },
  {
    id:            "mock_biology",
    label:         "Biology Mock Test",
    subject:       "biology",
    curriculum:    null,
    paperSize:     "standard",
    examTag:       null,
    badge:         "🧬",
    category:      "subject_practice",
    eligibleYears: [7, 8, 9, 10, 11],
    description:   "Cells, genetics, ecosystems, body systems",
    difficulty:    "standard",
  },
  {
    id:            "mock_verbal",
    label:         "Verbal Reasoning Mock",
    subject:       "verbal_reasoning",
    curriculum:    null,
    paperSize:     "standard",
    examTag:       null,
    badge:         "🔤",
    category:      "subject_practice",
    eligibleYears: [3, 4, 5, 6, 7, 8],
    description:   "Word patterns, codes, analogies",
    difficulty:    "standard",
  },
  {
    id:            "mock_nvr",
    label:         "Non-Verbal Reasoning Mock",
    subject:       "nvr",
    curriculum:    null,
    paperSize:     "standard",
    examTag:       null,
    badge:         "🔷",
    category:      "subject_practice",
    eligibleYears: [3, 4, 5, 6, 7, 8],
    description:   "Shapes, patterns, matrices",
    difficulty:    "standard",
  },
  {
    id:            "mock_quick_maths",
    label:         "Quick Maths Check",
    subject:       "maths",
    curriculum:    null,
    paperSize:     "quick",
    examTag:       null,
    badge:         "⚡",
    category:      "subject_practice",
    eligibleYears: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    description:   "10 questions · 12 minutes · no prep needed",
    difficulty:    "standard",
  },

  // ── GCSE ──────────────────────────────────────────────────────────────────

  {
    id:            "gcse_maths_foundation",
    label:         "GCSE Maths · Foundation",
    subject:       "maths",
    curriculum:    "uk_national",
    paperSize:     "full",
    examTag:       "gcse",
    badge:         "📐",
    category:      "gcse",
    eligibleYears: [9, 10, 11],
    description:   "Number, algebra, geometry and statistics",
    difficulty:    "exam",
  },
  {
    id:            "gcse_maths_higher",
    label:         "GCSE Maths · Higher",
    subject:       "maths",
    curriculum:    "uk_national",
    paperSize:     "extended",
    examTag:       "gcse",
    badge:         "📊",
    category:      "gcse",
    eligibleYears: [10, 11],
    description:   "Higher tier — includes quadratics, vectors, proof",
    difficulty:    "challenging",
  },
  {
    id:            "gcse_english_language",
    label:         "GCSE English Language",
    subject:       "english",
    curriculum:    "uk_national",
    paperSize:     "full",
    examTag:       "gcse",
    badge:         "✍️",
    category:      "gcse",
    eligibleYears: [9, 10, 11],
    description:   "Reading comprehension, inference and language analysis",
    difficulty:    "exam",
  },
  {
    id:            "gcse_biology",
    label:         "GCSE Biology",
    subject:       "biology",
    curriculum:    "uk_national",
    paperSize:     "full",
    examTag:       "gcse",
    badge:         "🧬",
    category:      "gcse",
    eligibleYears: [9, 10, 11],
    description:   "Cells, genetics, ecology, body systems",
    difficulty:    "exam",
  },
  {
    id:            "gcse_chemistry",
    label:         "GCSE Chemistry",
    subject:       "chemistry",
    curriculum:    "uk_national",
    paperSize:     "full",
    examTag:       "gcse",
    badge:         "⚗️",
    category:      "gcse",
    eligibleYears: [9, 10, 11],
    description:   "Atomic structure, reactions, quantitative chemistry",
    difficulty:    "exam",
  },
  {
    id:            "gcse_physics",
    label:         "GCSE Physics",
    subject:       "physics",
    curriculum:    "uk_national",
    paperSize:     "full",
    examTag:       "gcse",
    badge:         "⚡",
    category:      "gcse",
    eligibleYears: [9, 10, 11],
    description:   "Forces, electricity, waves, space",
    difficulty:    "exam",
  },
  {
    id:            "gcse_combined_science",
    label:         "GCSE Combined Science",
    subjects:      ["biology", "chemistry", "physics"],
    subject:       "biology",
    curriculum:    "uk_national",
    paperSize:     "extended",
    examTag:       "gcse",
    badge:         "🔭",
    category:      "gcse",
    eligibleYears: [9, 10, 11],
    description:   "Trilogy — Biology, Chemistry and Physics combined",
    difficulty:    "exam",
  },

  // ── A-LEVEL ───────────────────────────────────────────────────────────────

  {
    id:            "alevel_maths",
    label:         "A-Level Maths",
    subject:       "maths",
    curriculum:    "uk_national",
    paperSize:     "extended",
    examTag:       "a_level",
    badge:         "∫",
    category:      "a_level",
    eligibleYears: [12, 13],
    description:   "Pure maths — calculus, sequences, trigonometry",
    difficulty:    "challenging",
  },
  {
    id:            "alevel_biology",
    label:         "A-Level Biology",
    subject:       "biology",
    curriculum:    "uk_national",
    paperSize:     "extended",
    examTag:       "a_level",
    badge:         "🦠",
    category:      "a_level",
    eligibleYears: [12, 13],
    description:   "Cell biology, photosynthesis, respiration, genetics",
    difficulty:    "challenging",
  },
  {
    id:            "alevel_chemistry",
    label:         "A-Level Chemistry",
    subject:       "chemistry",
    curriculum:    "uk_national",
    paperSize:     "extended",
    examTag:       "a_level",
    badge:         "🧪",
    category:      "a_level",
    eligibleYears: [12, 13],
    description:   "Organic chemistry, equilibria, electrode potentials",
    difficulty:    "challenging",
  },
  {
    id:            "alevel_physics",
    label:         "A-Level Physics",
    subject:       "physics",
    curriculum:    "uk_national",
    paperSize:     "extended",
    examTag:       "a_level",
    badge:         "🌌",
    category:      "a_level",
    eligibleYears: [12, 13],
    description:   "Mechanics, fields, quantum, nuclear physics",
    difficulty:    "challenging",
  },

  // ── WAEC / NECO ───────────────────────────────────────────────────────────

  {
    id:            "waec_maths",
    label:         "WAEC Mathematics",
    subject:       "maths",
    curriculum:    "nigerian",
    paperSize:     "extended",
    examTag:       "waec",
    badge:         "📏",
    category:      "waec",
    eligibleYears: [10, 11, 12],
    description:   "WAEC/NECO style — number theory, algebra, statistics",
    difficulty:    "exam",
  },
  {
    id:            "waec_english",
    label:         "WAEC English Language",
    subject:       "english",
    curriculum:    "nigerian",
    paperSize:     "extended",
    examTag:       "waec",
    badge:         "📝",
    category:      "waec",
    eligibleYears: [10, 11, 12],
    description:   "Comprehension, lexis & structure, oral English",
    difficulty:    "exam",
  },
  {
    id:            "waec_biology",
    label:         "WAEC Biology",
    subject:       "biology",
    curriculum:    "nigerian",
    paperSize:     "extended",
    examTag:       "waec",
    badge:         "🌿",
    category:      "waec",
    eligibleYears: [10, 11, 12],
    description:   "Cell biology, genetics, ecology — WAEC syllabus",
    difficulty:    "exam",
  },
  {
    id:            "waec_chemistry",
    label:         "WAEC Chemistry",
    subject:       "chemistry",
    curriculum:    "nigerian",
    paperSize:     "extended",
    examTag:       "waec",
    badge:         "⚗️",
    category:      "waec",
    eligibleYears: [10, 11, 12],
    description:   "Organic, inorganic and physical chemistry — WAEC style",
    difficulty:    "exam",
  },
  {
    id:            "waec_physics",
    label:         "WAEC Physics",
    subject:       "physics",
    curriculum:    "nigerian",
    paperSize:     "extended",
    examTag:       "waec",
    badge:         "⚡",
    category:      "waec",
    eligibleYears: [10, 11, 12],
    description:   "Mechanics, waves, electricity — WAEC syllabus",
    difficulty:    "exam",
  },

  // ── SAT / ACT ─────────────────────────────────────────────────────────────

  {
    id:            "sat_math",
    label:         "SAT Math",
    subject:       "maths",
    curriculum:    "us_common_core",
    paperSize:     "extended",
    examTag:       "sat",
    badge:         "🔢",
    category:      "sat",
    eligibleYears: [10, 11, 12],
    description:   "Algebra, problem-solving, data analysis — College Board style",
    difficulty:    "exam",
  },
  {
    id:            "sat_reading_writing",
    label:         "SAT Reading & Writing",
    subject:       "english",
    curriculum:    "us_common_core",
    paperSize:     "extended",
    examTag:       "sat",
    badge:         "📖",
    category:      "sat",
    eligibleYears: [10, 11, 12],
    description:   "Evidence-based reading, grammar, vocabulary in context",
    difficulty:    "exam",
  },
  {
    id:            "act_english",
    label:         "ACT English",
    subject:       "english",
    curriculum:    "us_common_core",
    paperSize:     "extended",
    examTag:       "act",
    badge:         "✏️",
    category:      "sat",
    eligibleYears: [10, 11, 12],
    description:   "Usage, mechanics, rhetorical skills — ACT format",
    difficulty:    "exam",
  },
  {
    id:            "act_science",
    label:         "ACT Science",
    subject:       "science",
    curriculum:    "us_common_core",
    paperSize:     "extended",
    examTag:       "act",
    badge:         "🔬",
    category:      "sat",
    eligibleYears: [10, 11, 12],
    description:   "Data interpretation, research summaries, conflicting viewpoints",
    difficulty:    "exam",
  },

  // ── DIAGNOSTIC ────────────────────────────────────────────────────────────

  {
    id:            "diagnostic_full",
    label:         "Full Diagnostic",
    subjects:      ["maths", "english", "science"],  // multi-subject
    subject:       "maths",                           // primary (for question fetching fallback)
    curriculum:    null,
    paperSize:     "no_timer",
    examTag:       null,
    badge:         "🔬",
    category:      "diagnostic",
    eligibleYears: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    description:   "See where you stand across all subjects — no time pressure",
    difficulty:    "standard",
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Get tests appropriate for a scholar's year and curriculum.
 * Optionally filter by category.
 */
// Curriculum families — used to cross-match scholar curriculum to test curricula
const CURRICULUM_FAMILIES = {
  // UK family
  uk_national:  ["uk_national", "uk_11plus"],
  uk_11plus:    ["uk_national", "uk_11plus"],
  // Nigerian family
  nigerian:     ["nigerian"],
  ng_primary:   ["nigerian"],
  ng_secondary: ["nigerian"],
  // US family
  us_common_core: ["us_common_core"],
  // Canadian family
  ca_primary:   ["ca_primary", "ca_secondary"],
  ca_secondary: ["ca_primary", "ca_secondary"],
};

// Categories that are always shown regardless of curriculum
const OPEN_CATEGORIES = new Set(["subject_practice", "diagnostic"]);

export function getTestsForScholar(yearLevel, curriculum, categoryFilter = null) {
  const year   = parseInt(yearLevel, 10) || 1;
  const family = CURRICULUM_FAMILIES[curriculum] ?? [curriculum];

  return TEST_CATALOGUE.filter(t => {
    const yearOk = t.eligibleYears.includes(year);
    const catOk  = !categoryFilter || t.category === categoryFilter;
    // Open categories: always show. Locked categories: match curriculum family.
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
 * Resolve the curriculum to use for a given test + scholar.
 * Falls back to scholar's own curriculum when test has curriculum: null.
 */
export function resolveTestCurriculum(test, scholarCurriculum) {
  return test.curriculum ?? scholarCurriculum ?? "uk_national";
}