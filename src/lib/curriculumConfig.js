// src/lib/curriculumConfig.js
// Single source of truth used by Nav, Student page, ProgressChart, QuizEngine

// ── Nigerian SSS Streams ─────────────────────────────────────────────────────
export const NG_SSS_STREAMS = {
  science: {
    label: "Science",
    subjects: [
      "mathematics", "english", "physics", "chemistry", "biology",
      "further_mathematics", "computer_science", "agricultural_science",
      "civic_education",
    ],
  },
  humanities: {
    label: "Humanities / Arts",
    subjects: [
      "mathematics", "english", "government", "history", "literature",
      "economics", "civic_education", "religious_studies",
    ],
  },
  business: {
    label: "Business / Commercial",
    subjects: [
      "mathematics", "english", "financial_accounting", "commerce",
      "economics", "business_studies", "civic_education",
      "computer_science",
    ],
  },
};

/**
 * Get subjects for an ng_sss scholar based on their stream.
 * Falls back to core subjects if no stream set.
 */
export function getNGSSSSubjects(stream) {
  if (stream && NG_SSS_STREAMS[stream]) {
    return NG_SSS_STREAMS[stream].subjects;
  }
  return ["mathematics", "english", "civic_education", "economics"];
}

/**
 * Get stream options for onboarding / settings UI.
 */
export function getStreamOptions() {
  return Object.entries(NG_SSS_STREAMS).map(([key, val]) => ({
    value: key,
    label: val.label,
    subjectCount: val.subjects.length,
    subjects: val.subjects,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════

export const CURRICULUM_CONFIG = {
  uk_11plus: {
    name:       'UK 11+',
    shortName:  '11+',
    emoji:      '🇬🇧',
    subjects:   ['mathematics', 'english', 'verbal_reasoning', 'nvr', 'science'],
    gradeLabel: 'Year',
    grades:     [3, 4, 5, 6],
  },
  uk_national: {
    name:       'UK National Curriculum',
    shortName:  'UK NC',
    emoji:      '🇬🇧',
    subjects:   ['mathematics', 'english', 'science', 'computing', 'history', 'geography', 'design_and_technology', 'religious_education'],
    gradeLabel: 'Year',
    grades:     [1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
  us_common_core: {
    name:       'US Common Core',
    shortName:  'Common Core',
    emoji:      '🇺🇸',
    subjects:   ['math', 'ela', 'science', 'social_studies'],
    gradeLabel: 'Grade',
    grades:     [1, 2, 3, 4, 5, 6, 7, 8],
  },
  aus_acara: {
    name:       'Australian Curriculum',
    shortName:  'AUS',
    emoji:      '🇦🇺',
    subjects:   ['mathematics', 'english', 'science', 'hass'],
    gradeLabel: 'Year',
    grades:     [1, 2, 3, 4, 5, 6],
  },
  ib_pyp: {
    name:       'IB Primary Years',
    shortName:  'IB PYP',
    emoji:      '🌍',
    subjects:   ['mathematics', 'english', 'science', 'geography', 'history'],
    gradeLabel: 'Grade',
    grades:     [1, 2, 3, 4, 5],
  },
  ib_myp: {
    name:       'IB Middle Years',
    shortName:  'IB MYP',
    emoji:      '🌍',
    subjects:   ['mathematics', 'english', 'science', 'humanities'],
    gradeLabel: 'Year',
    grades:     [1, 2, 3, 4, 5],
  },
  ng_primary: {
    name:       'Nigerian Primary',
    shortName:  'NG Primary',
    emoji:      '🇳🇬',
    subjects:   ['mathematics', 'english_studies', 'basic_science', 'social_studies', 'civic_education', 'cultural_and_creative_arts', 'religious_studies'],
    gradeLabel: 'Primary',
    grades:     [1, 2, 3, 4, 5, 6],
  },
  ng_jss: {
    name:       'Nigerian JSS',
    shortName:  'JSS',
    emoji:      '🇳🇬',
    subjects:   ['mathematics', 'english_studies', 'basic_science', 'basic_technology', 'social_studies', 'business_education', 'cultural_and_creative_arts', 'pre_vocational_studies', 'civic_education', 'basic_digital_literacy', 'religious_studies', 'agricultural_science'],
    gradeLabel: 'JSS',
    grades:     [1, 2, 3],
  },
  ng_sss: {
    name:       'Nigerian SSS',
    shortName:  'SSS',
    emoji:      '🇳🇬',
    // Default subjects shown when no stream is selected
    subjects:   ['mathematics', 'english', 'civic_education', 'economics'],
    // Stream-specific subjects resolved via getNGSSSSubjects()
    streams:    NG_SSS_STREAMS,
    gradeLabel: 'SS',
    grades:     [1, 2, 3],
  },
  ca_primary: {
    name:       'Canadian Curriculum',
    shortName:  'Canada',
    emoji:      '🇨🇦',
    subjects:   ['mathematics', 'english', 'science', 'social_studies'],
    gradeLabel: 'Grade',
    grades:     [1, 2, 3, 4, 5, 6, 7, 8],
  },
  ca_secondary: {
    name:       'Canadian Secondary',
    shortName:  'Canada',
    emoji:      '🇨🇦',
    subjects:   ['mathematics', 'english', 'science', 'canadian_history', 'geography', 'physics', 'chemistry', 'biology', 'computer_science'],
    gradeLabel: 'Grade',
    grades:     [9, 10, 11, 12],
  },
};

// ── Legacy aliases ───────────────────────────────────────────────────────────
const CURRICULUM_ALIASES = {
  australian:       'aus_acara',
  waec:             'ng_sss',
  nigerian_jss:     'ng_jss',
  nigerian_sss:     'ng_sss',
  nigerian_primary: 'ng_primary',
};

export const SUBJECT_META = {
  maths:                         { label: 'Maths',                    icon: '🔢', tw: { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  } },
  math:                          { label: 'Math',                     icon: '🔢', tw: { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  } },
  mathematics:                   { label: 'Mathematics',              icon: '🔢', tw: { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  } },
  further_mathematics:           { label: 'Further Maths',            icon: '🔢', tw: { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  } },
  english:                       { label: 'English',                  icon: '📖', tw: { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    dot: 'bg-rose-500'    } },
  english_studies:               { label: 'English Studies',          icon: '📖', tw: { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    dot: 'bg-rose-500'    } },
  ela:                           { label: 'ELA',                      icon: '📖', tw: { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    dot: 'bg-rose-500'    } },
  literature:                    { label: 'Literature',               icon: '📖', tw: { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    dot: 'bg-rose-500'    } },
  verbal:                        { label: 'Verbal',                   icon: '💬', tw: { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200',  dot: 'bg-violet-500'  } },
  verbal_reasoning:              { label: 'Verbal Reasoning',         icon: '💬', tw: { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200',  dot: 'bg-violet-500'  } },
  nvr:                           { label: 'Non-Verbal',               icon: '🔷', tw: { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   dot: 'bg-amber-500'   } },
  science:                       { label: 'Science',                  icon: '🔬', tw: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' } },
  basic_science:                 { label: 'Basic Science',            icon: '🔬', tw: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' } },
  physics:                       { label: 'Physics',                  icon: '⚡', tw: { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200',    dot: 'bg-blue-500'    } },
  chemistry:                     { label: 'Chemistry',                icon: '⚗️', tw: { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',     dot: 'bg-red-500'     } },
  biology:                       { label: 'Biology',                  icon: '🌿', tw: { bg: 'bg-green-50',   text: 'text-green-600',   border: 'border-green-200',   dot: 'bg-green-500'   } },
  basic_technology:              { label: 'Basic Technology',         icon: '🔧', tw: { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   dot: 'bg-amber-500'   } },
  agricultural_science:          { label: 'Agricultural Science',     icon: '🌱', tw: { bg: 'bg-lime-50',    text: 'text-lime-600',    border: 'border-lime-200',    dot: 'bg-lime-500'    } },
  religious_studies:              { label: 'Religious Studies',        icon: '📿', tw: { bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-200',  dot: 'bg-purple-500'  } },
  religious_education:           { label: 'Religious Education',      icon: '✝️', tw: { bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-200',  dot: 'bg-purple-500'  } },
  computing:                     { label: 'Computing',                icon: '💻', tw: { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-500'   } },
  computer_science:              { label: 'Computer Science',         icon: '💻', tw: { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-500'   } },
  design_and_technology:         { label: 'Design & Technology',      icon: '⚙️', tw: { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   dot: 'bg-amber-500'   } },
  citizenship:                   { label: 'Citizenship',              icon: '⚖️', tw: { bg: 'bg-cyan-50',    text: 'text-cyan-600',    border: 'border-cyan-200',    dot: 'bg-cyan-500'    } },
  geography:                     { label: 'Geography',                icon: '🌍', tw: { bg: 'bg-teal-50',    text: 'text-teal-600',    border: 'border-teal-200',    dot: 'bg-teal-500'    } },
  social_studies:                { label: 'Social Studies',           icon: '🏛️', tw: { bg: 'bg-cyan-50',    text: 'text-cyan-600',    border: 'border-cyan-200',    dot: 'bg-cyan-500'    } },
  history:                       { label: 'History',                  icon: '📜', tw: { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200',  dot: 'bg-orange-500'  } },
  hass:                          { label: 'HASS',                     icon: '🌏', tw: { bg: 'bg-teal-50',    text: 'text-teal-600',    border: 'border-teal-200',    dot: 'bg-teal-500'    } },
  humanities:                    { label: 'Humanities',               icon: '📚', tw: { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    dot: 'bg-rose-500'    } },
  civic_education:               { label: 'Civic Education',          icon: '🏛️', tw: { bg: 'bg-cyan-50',    text: 'text-cyan-600',    border: 'border-cyan-200',    dot: 'bg-cyan-500'    } },
  business_education:            { label: 'Business Education',       icon: '💼', tw: { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200',  dot: 'bg-orange-500'  } },
  business_studies:              { label: 'Business Studies',         icon: '💼', tw: { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200',  dot: 'bg-orange-500'  } },
  cultural_and_creative_arts:    { label: 'Cultural & Creative Arts', icon: '🎨', tw: { bg: 'bg-pink-50',    text: 'text-pink-600',    border: 'border-pink-200',    dot: 'bg-pink-500'    } },
  pre_vocational_studies:        { label: 'Pre-Vocational Studies',   icon: '🔧', tw: { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   dot: 'bg-amber-500'   } },
  basic_digital_literacy:        { label: 'Computer Studies',         icon: '💻', tw: { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-500'   } },
  computer_studies:              { label: 'Computer Studies',         icon: '💻', tw: { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-500'   } },
  digital_technologies:          { label: 'Digital Technologies',     icon: '💻', tw: { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-500'   } },
  // SSS-specific
  financial_accounting:          { label: 'Accounting',               icon: '📊', tw: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' } },
  commerce:                      { label: 'Commerce',                 icon: '🏪', tw: { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200',  dot: 'bg-orange-500'  } },
  economics:                     { label: 'Economics',                icon: '📈', tw: { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200',    dot: 'bg-blue-500'    } },
  government:                    { label: 'Government',               icon: '🏛️', tw: { bg: 'bg-cyan-50',    text: 'text-cyan-600',    border: 'border-cyan-200',    dot: 'bg-cyan-500'    } },
  office_practice:               { label: 'Office Practice',          icon: '📋', tw: { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-500'   } },
  // Canadian
  canadian_history:              { label: 'Canadian History',         icon: '🍁', tw: { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',     dot: 'bg-red-500'     } },
};

/** Resolves a curriculum key to its canonical form */
export const resolveCurriculumKey = (key) =>
  CURRICULUM_ALIASES[key] || key;

/** Returns config for a curriculum key, resolving aliases, defaulting to uk_11plus */
export const getCurriculum = (key) =>
  CURRICULUM_CONFIG[resolveCurriculumKey(key)] ?? CURRICULUM_CONFIG[key] ?? CURRICULUM_CONFIG.uk_11plus;

/** Returns display meta for a subject key */
export const getSubjectMeta = (subject) =>
  SUBJECT_META[subject] ?? {
    label: subject.replace(/_/g, ' '),
    icon:  '📚',
    tw: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  };

/**
 * Get the resolved subject list for a scholar, handling ng_sss streams.
 * Use this everywhere subjects are needed — it's stream-aware.
 */
export function getSubjectsForScholar(scholar) {
  const curriculum = resolveCurriculumKey(scholar?.curriculum);
  const config = getCurriculum(curriculum);

  if (curriculum === 'ng_sss' && scholar?.stream) {
    return getNGSSSSubjects(scholar.stream);
  }

  return config.subjects || [];
}