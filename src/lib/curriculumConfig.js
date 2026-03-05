// src/lib/curriculumConfig.js
// Single source of truth used by Nav, Student page, ProgressChart, QuizEngine

export const CURRICULUM_CONFIG = {
  uk_11plus: {
    name:       'UK 11+',
    shortName:  '11+',
    emoji:      '🇬🇧',
    subjects:   ['maths', 'english', 'verbal', 'nvr'],
    gradeLabel: 'Year',
    grades:     [3, 4, 5, 6],
  },
  uk_national: {
    name:       'UK National Curriculum',
    shortName:  'UK NC',
    emoji:      '🇬🇧',
    subjects:   ['maths', 'english', 'science'],
    gradeLabel: 'Year',
    grades:     [1, 2, 3, 4, 5, 6],
  },
  us_common_core: {
    name:       'US Common Core',
    shortName:  'Common Core',
    emoji:      '🇺🇸',
    subjects:   ['math', 'ela', 'science', 'social_studies'],
    gradeLabel: 'Grade',
    grades:     [1, 2, 3, 4, 5, 6, 7, 8],
  },
  australian: {
    name:       'Australian Curriculum',
    shortName:  'AUS',
    emoji:      '🇦🇺',
    subjects:   ['maths', 'english', 'science'],
    gradeLabel: 'Year',
    grades:     [1, 2, 3, 4, 5, 6],
  },
  ib_pyp: {
    name:       'IB Primary Years',
    shortName:  'IB PYP',
    emoji:      '🌍',
    subjects:   ['maths', 'english', 'science', 'geography', 'history'],
    gradeLabel: 'Grade',
    grades:     [1, 2, 3, 4, 5],
  },
  waec: {
    name:       'WAEC / Nigerian',
    shortName:  'WAEC',
    emoji:      '🇳🇬',
    subjects:   ['maths', 'english', 'science', 'geography', 'history'],
    gradeLabel: 'Year',
    grades:     [7, 8, 9, 10, 11, 12],
  },
};

export const SUBJECT_META = {
  maths:          { label: 'Maths',          icon: '🔢', tw: { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  } },
  math:           { label: 'Math',           icon: '🔢', tw: { bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  } },
  english:        { label: 'English',        icon: '📖', tw: { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    dot: 'bg-rose-500'    } },
  ela:            { label: 'ELA',            icon: '📖', tw: { bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-200',    dot: 'bg-rose-500'    } },
  verbal:         { label: 'Verbal',         icon: '💬', tw: { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-200',  dot: 'bg-violet-500'  } },
  nvr:            { label: 'Non-Verbal',     icon: '🔷', tw: { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   dot: 'bg-amber-500'   } },
  science:        { label: 'Science',        icon: '🔬', tw: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' } },
  basic_science:  { label: 'Basic Science',  icon: '🔬', tw: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' } },
  geography:      { label: 'Geography',      icon: '🌍', tw: { bg: 'bg-teal-50',    text: 'text-teal-600',    border: 'border-teal-200',    dot: 'bg-teal-500'    } },
  social_studies: { label: 'Social Studies', icon: '🏛️', tw: { bg: 'bg-cyan-50',    text: 'text-cyan-600',    border: 'border-cyan-200',    dot: 'bg-cyan-500'    } },
  history:        { label: 'History',        icon: '📜', tw: { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200',  dot: 'bg-orange-500'  } },
  hass:           { label: 'HASS',           icon: '🌏', tw: { bg: 'bg-teal-50',    text: 'text-teal-600',    border: 'border-teal-200',    dot: 'bg-teal-500'    } },
};

/** Returns config for a curriculum key, defaulting to uk_11plus */
export const getCurriculum = (key) =>
  CURRICULUM_CONFIG[key] ?? CURRICULUM_CONFIG.uk_11plus;

/** Returns display meta for a subject key */
export const getSubjectMeta = (subject) =>
  SUBJECT_META[subject] ?? {
    label: subject.replace(/_/g, ' '),
    icon:  '📚',
    tw: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
  };