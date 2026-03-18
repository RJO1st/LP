// src/lib/curriculumConfig.js
// Single source of truth used by Nav, Student page, ProgressChart, QuizEngine

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
    subjects:   ['mathematics', 'english', 'science'],
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
  // Canonical key — matches curricula.js and DB after migration
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
  // Nigerian curricula — canonical keys match curricula.js
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
    subjects:   ['mathematics', 'english', 'civic_education', 'digital_technologies'],
    gradeLabel: 'SS',
    grades:     [1, 2, 3],
  },
};

// ── Legacy aliases — some scholars/DB rows use old keys ──────────────────────
// These resolve to the canonical entries above via getCurriculum()
const CURRICULUM_ALIASES = {
  australian:      'aus_acara',
  waec:            'ng_sss',
  nigerian_jss:    'ng_jss',
  nigerian_sss:    'ng_sss',
  nigerian_primary:'ng_primary',
};

export const SUBJECT_META = {
  maths:                         { label: 'Maths',                    icon: '🔢', tw: { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  } },
  math:                          { label: 'Math',                     icon: '🔢', tw: { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  } },
  mathematics:                   { label: 'Mathematics',              icon: '🔢', tw: { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  } },
  english:                       { label: 'English',                  icon: '📖', tw: { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    dot: 'bg-rose-500'    } },
  english_studies:               { label: 'English Studies',          icon: '📖', tw: { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    dot: 'bg-rose-500'    } },
  ela:                           { label: 'ELA',                      icon: '📖', tw: { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    dot: 'bg-rose-500'    } },
  verbal:                        { label: 'Verbal',                   icon: '💬', tw: { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200',  dot: 'bg-violet-500'  } },
  nvr:                           { label: 'Non-Verbal',               icon: '🔷', tw: { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   dot: 'bg-amber-500'   } },
  science:                       { label: 'Science',                  icon: '🔬', tw: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' } },
  basic_science:                 { label: 'Basic Science',            icon: '🔬', tw: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' } },
  basic_technology:              { label: 'Basic Technology',         icon: '🔧', tw: { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   dot: 'bg-amber-500'   } },
  agricultural_science:          { label: 'Agricultural Science',     icon: '🌱', tw: { bg: 'bg-lime-50',    text: 'text-lime-600',    border: 'border-lime-200',    dot: 'bg-lime-500'    } },
  religious_studies:              { label: 'Religious Studies',        icon: '📿', tw: { bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-200',  dot: 'bg-purple-500'  } },
  verbal_reasoning:              { label: 'Verbal Reasoning',         icon: '💬', tw: { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200',  dot: 'bg-violet-500'  } },
  computing:                     { label: 'Computing',                icon: '💻', tw: { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-500'   } },
  design_and_technology:         { label: 'Design & Technology',      icon: '⚙️', tw: { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   dot: 'bg-amber-500'   } },
  religious_education:           { label: 'Religious Education',      icon: '✝️', tw: { bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-200',  dot: 'bg-purple-500'  } },
  citizenship:                   { label: 'Citizenship',              icon: '⚖️', tw: { bg: 'bg-cyan-50',    text: 'text-cyan-600',    border: 'border-cyan-200',    dot: 'bg-cyan-500'    } },
  geography:                     { label: 'Geography',                icon: '🌍', tw: { bg: 'bg-teal-50',    text: 'text-teal-600',    border: 'border-teal-200',    dot: 'bg-teal-500'    } },
  social_studies:                { label: 'Social Studies',           icon: '🏛️', tw: { bg: 'bg-cyan-50',    text: 'text-cyan-600',    border: 'border-cyan-200',    dot: 'bg-cyan-500'    } },
  history:                       { label: 'History',                  icon: '📜', tw: { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200',  dot: 'bg-orange-500'  } },
  hass:                          { label: 'HASS',                     icon: '🌏', tw: { bg: 'bg-teal-50',    text: 'text-teal-600',    border: 'border-teal-200',    dot: 'bg-teal-500'    } },
  humanities:                    { label: 'Humanities',               icon: '📚', tw: { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    dot: 'bg-rose-500'    } },
  // Nigerian-specific subjects
  civic_education:               { label: 'Civic Education',          icon: '🏛️', tw: { bg: 'bg-cyan-50',    text: 'text-cyan-600',    border: 'border-cyan-200',    dot: 'bg-cyan-500'    } },
  business_education:            { label: 'Business Education',       icon: '💼', tw: { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200',  dot: 'bg-orange-500'  } },
  cultural_and_creative_arts:    { label: 'Cultural & Creative Arts', icon: '🎨', tw: { bg: 'bg-pink-50',    text: 'text-pink-600',    border: 'border-pink-200',    dot: 'bg-pink-500'    } },
  pre_vocational_studies:        { label: 'Pre-Vocational Studies',   icon: '🔧', tw: { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   dot: 'bg-amber-500'   } },
  basic_digital_literacy:        { label: 'Computer Studies',         icon: '💻', tw: { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-500'   } },
  computer_studies:              { label: 'Computer Studies',         icon: '💻', tw: { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-500'   } },
  // citizenship_and_heritage removed — merged into civic_education in DB
  digital_technologies:          { label: 'Digital Technologies',     icon: '💻', tw: { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-500'   } },
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