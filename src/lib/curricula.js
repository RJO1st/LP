// ═══════════════════════════════════════════════════════════════════
// COMPREHENSIVE CURRICULUM DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

export const CURRICULA = {
  // ────────────────────────────────────────────────────────────────
  // UNITED KINGDOM
  // ────────────────────────────────────────────────────────────────
  uk_national: {
    country: "🇬🇧",
    name: "UK National",
    description: "National Curriculum for England",
    gradeLabel: "Year",
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    stages: {
      "Key Stage 1": [1, 2],
      "Key Stage 2": [3, 4, 5, 6],
      "Key Stage 3": [7, 8, 9]
    }
  },
  uk_11plus: {
    country: "🇬🇧",
    name: "UK 11+",
    description: "Grammar School Entry Exam",
    gradeLabel: "Year",
    grades: [3, 4, 5, 6], // Years preparing for 11+ (typically Year 6)
    examAge: 11
  },

  // ────────────────────────────────────────────────────────────────
  // UNITED STATES
  // ────────────────────────────────────────────────────────────────
  us_common_core: {
    country: "🇺🇸",
    name: "US Common Core",
    description: "Common Core State Standards",
    gradeLabel: "Grade",
    grades: [1, 2, 3, 4, 5, 6, 7, 8],
    stages: {
      "Elementary": [1, 2, 3, 4, 5],
      "Middle School": [6, 7, 8]
    }
  },

  // ────────────────────────────────────────────────────────────────
  // AUSTRALIA
  // ────────────────────────────────────────────────────────────────
  aus_acara: {
    country: "🇦🇺",
    name: "Australian",
    description: "Australian Curriculum (ACARA)",
    gradeLabel: "Year",
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    stages: {
      "Foundation": [1, 2],
      "Primary": [3, 4, 5, 6],
      "Junior Secondary": [7, 8, 9]
    }
  },

  // ────────────────────────────────────────────────────────────────
  // INTERNATIONAL BACCALAUREATE
  // ────────────────────────────────────────────────────────────────
  ib_pyp: {
    country: "🌍",
    name: "IB PYP",
    description: "Primary Years Programme",
    gradeLabel: "Year",
    grades: [1, 2, 3, 4, 5, 6],
    ageRange: "3-12 years"
  },
  ib_myp: {
    country: "🌍",
    name: "IB MYP",
    description: "Middle Years Programme",
    gradeLabel: "Year",
    grades: [1, 2, 3, 4, 5],
    ageRange: "11-16 years"
  },

  // ────────────────────────────────────────────────────────────────
  // NIGERIA
  // ────────────────────────────────────────────────────────────────
  ng_primary: {
    country: "🇳🇬",
    name: "Nigerian Primary",
    description: "Primary Education (Basic 1-6)",
    gradeLabel: "Primary",
    grades: [1, 2, 3, 4, 5, 6],
    alternateLabels: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6"]
  },
  ng_jss: {
    country: "🇳🇬",
    name: "Nigerian JSS",
    description: "Junior Secondary School",
    gradeLabel: "JSS",
    grades: [1, 2, 3],
    alternateLabels: ["Basic 7", "Basic 8", "Basic 9"]
  },
  ng_sss: {
    country: "🇳🇬",
    name: "Nigerian SSS",
    description: "Senior Secondary School (WAEC/NECO)",
    gradeLabel: "SS",
    grades: [1, 2, 3],
    exams: ["WAEC", "NECO", "JAMB"]
  }
};

// ═══════════════════════════════════════════════════════════════════
// SUBJECTS BY CURRICULUM
// ═══════════════════════════════════════════════════════════════════
export const SUBJECTS_BY_CURRICULUM = {
  // UK
  uk_national: ['maths', 'english', 'science', 'computing'],
  uk_11plus: ['maths', 'english', 'verbal', 'nvr'],
  
  // US
  us_common_core: ['maths', 'english', 'science', 'social_studies'],
  
  // Australia
  aus_acara: ['maths', 'english', 'science', 'humanities'],
  
  // IB
  ib_pyp: ['maths', 'english', 'science', 'social_studies'],
  ib_myp: ['maths', 'english', 'science', 'humanities'],
  
  // Nigeria
  ng_primary: ['maths', 'english', 'science', 'social_studies'],
  ng_jss: ['maths', 'english', 'science', 'basic_tech'],
  ng_sss: ['maths', 'english', 'physics', 'chemistry', 'biology', 'economics']
};

// ═══════════════════════════════════════════════════════════════════
// SUBJECT METADATA
// ═══════════════════════════════════════════════════════════════════
export const SUBJECT_META = {
  maths: { emoji: "🔢", label: "Maths", color: "blue" },
  english: { emoji: "📖", label: "English", color: "purple" },
  science: { emoji: "🔬", label: "Science", color: "green" },
  verbal: { emoji: "🧩", label: "Verbal Reasoning", color: "indigo" },
  nvr: { emoji: "🔷", label: "Non-Verbal Reasoning", color: "cyan" },
  computing: { emoji: "💻", label: "Computing", color: "slate" },
  social_studies: { emoji: "🌍", label: "Social Studies", color: "amber" },
  humanities: { emoji: "📚", label: "Humanities", color: "rose" },
  basic_tech: { emoji: "🔧", label: "Basic Technology", color: "orange" },
  physics: { emoji: "⚛️", label: "Physics", color: "blue" },
  chemistry: { emoji: "🧪", label: "Chemistry", color: "emerald" },
  biology: { emoji: "🧬", label: "Biology", color: "lime" },
  economics: { emoji: "📊", label: "Economics", color: "yellow" }
};

// ═══════════════════════════════════════════════════════════════════
// CURRICULUM GROUPINGS (For UI Organization)
// ═══════════════════════════════════════════════════════════════════
export const CURRICULUM_GROUPS = {
  "United Kingdom": ['uk_national', 'uk_11plus'],
  "United States": ['us_common_core'],
  "Australia": ['aus_acara'],
  "International": ['ib_pyp', 'ib_myp'],
  "Nigeria": ['ng_primary', 'ng_jss', 'ng_sss']
};

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════
export function getGradeLabel(curriculum, grade) {
  const curr = CURRICULA[curriculum];
  if (!curr) return `Grade ${grade}`;
  
  // Check for alternate labels (like Nigerian "Basic 7" instead of "JSS 1")
  if (curr.alternateLabels && curr.alternateLabels[grade - 1]) {
    return curr.alternateLabels[grade - 1];
  }
  
  return `${curr.gradeLabel} ${grade}`;
}

export function getCurriculumsByCountry(country) {
  return Object.entries(CURRICULUM_GROUPS)
    .filter(([groupName]) => groupName === country)
    .flatMap(([, curricula]) => curricula);
}

export function getSubjectsForCurriculum(curriculum) {
  return SUBJECTS_BY_CURRICULUM[curriculum] || [];
}

export function getCurriculumInfo(curriculum) {
  return CURRICULA[curriculum] || null;
}