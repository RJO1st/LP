// lib/gamificationEngine.js

export const BADGES = {
  first_quest:      { name: 'Launch Initiated',         icon: '🚀', tier: 'bronze', xp: 25,  coins: 5   },
  maths_bronze:     { name: 'Number Cadet',             icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  maths_silver:     { name: 'Calculation Commander',    icon: '🥈', tier: 'silver', xp: 150, coins: 30  },
  maths_gold:       { name: 'Maths Maestro',            icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  english_bronze:   { name: 'Word Cadet',               icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  english_silver:   { name: 'Grammar Guardian',         icon: '🥈', tier: 'silver', xp: 150, coins: 30  },
  english_gold:     { name: 'Grammar Guru',             icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  verbal_bronze:    { name: 'Puzzle Cadet',             icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  verbal_gold:      { name: 'Verbal Virtuoso',          icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  nvr_bronze:       { name: 'Shape Scout',              icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  nvr_gold:         { name: 'Pattern Pioneer',          icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  science_bronze:   { name: 'Science Scout',            icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  science_gold:     { name: 'Science Sage',             icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  geography_bronze: { name: 'Globe Trotter',            icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  geography_gold:   { name: 'Geography Genius',         icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  history_bronze:   { name: 'Time Traveler',            icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  history_gold:     { name: 'History Hero',             icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  streak_3:         { name: 'On Fire',                  icon: '🔥', tier: 'bronze', xp: 50,  coins: 10  },
  streak_7:         { name: 'Week Warrior',             icon: '🔥', tier: 'silver', xp: 150, coins: 30  },
  streak_30:        { name: 'Monthly Maverick',         icon: '🔥', tier: 'gold',   xp: 500, coins: 100 },
  accuracy_90:      { name: 'Sharp Shooter',            icon: '🎯', tier: 'silver', xp: 150, coins: 30  },
  accuracy_100:     { name: 'Perfect Mission',          icon: '⭐', tier: 'gold',   xp: 300, coins: 75  },
  speed_demon:      { name: 'Warp Speed',               icon: '⚡', tier: 'silver', xp: 150, coins: 30  },
  quest_master:     { name: 'Quest Master',             icon: '🏅', tier: 'gold',   xp: 400, coins: 90  },
};

export const TIER_COLORS = {
  bronze: { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300',  glow: '#f59e0b' },
  silver: { bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-300',  glow: '#94a3b8' },
  gold:   { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-400', glow: '#eab308' },
};

export const AVATAR_ITEMS = {
  hat_wizard:          { name: 'Wizard Hat',       category: 'hat',        icon: '🧙', coinCost: 50,  rarity: 'rare'      },
  hat_crown:           { name: 'Crown',            category: 'hat',        icon: '👑', coinCost: 0,   badgeRequired: 'accuracy_100', rarity: 'legendary' },
  hat_astronaut:       { name: 'Astronaut Helmet', category: 'hat',        icon: '🪖', coinCost: 0,   badgeRequired: 'maths_silver', rarity: 'rare' },
  hat_graduation:      { name: 'Graduation Cap',   category: 'hat',        icon: '🎓', coinCost: 0,   badgeRequired: 'english_silver', rarity: 'rare' },
  hat_detective:       { name: 'Detective Hat',    category: 'hat',        icon: '🕵️', coinCost: 75,  rarity: 'rare'      },
  hat_cowboy:          { name: 'Cowboy Hat',       category: 'hat',        icon: '🤠', coinCost: 60,  rarity: 'common'    },
  accessory_stars:     { name: 'Star Aura',        category: 'accessory',  icon: '✨', coinCost: 100, rarity: 'epic'      },
  accessory_flame:     { name: 'Flame Trail',      category: 'accessory',  icon: '🔥', coinCost: 0,   badgeRequired: 'streak_7', rarity: 'rare' },
  accessory_lightning: { name: 'Lightning Bolt',   category: 'accessory',  icon: '⚡', coinCost: 120, rarity: 'epic'      },
  accessory_rainbow:   { name: 'Rainbow Aura',     category: 'accessory',  icon: '🌈', coinCost: 80,  rarity: 'rare'      },
  pet_cat:             { name: 'Space Cat',        category: 'pet',        icon: '🐱', coinCost: 200, rarity: 'common'    },
  pet_robot:           { name: 'Robot Buddy',      category: 'pet',        icon: '🤖', coinCost: 0,   badgeRequired: 'maths_gold', rarity: 'legendary' },
  pet_owl:             { name: 'Owl Companion',    category: 'pet',        icon: '🦉', coinCost: 0,   badgeRequired: 'english_gold', rarity: 'legendary' },
  pet_alien:           { name: 'Alien Pal',        category: 'pet',        icon: '👽', coinCost: 500, rarity: 'epic'      },
  pet_dragon:          { name: 'Micro Dragon',     category: 'pet',        icon: '🐉', coinCost: 0,   badgeRequired: 'quest_master', rarity: 'legendary' },
  pet_rocket:          { name: 'Pet Rocket',       category: 'pet',        icon: '🚀', coinCost: 300, rarity: 'epic'      },
  background_space:    { name: 'Deep Space',       category: 'background', icon: '🪐', coinCost: 150, rarity: 'rare'      },
  background_galaxy:   { name: 'Galaxy',           category: 'background', icon: '🌌', coinCost: 0,   badgeRequired: 'verbal_gold', rarity: 'legendary' },
  background_sunset:   { name: 'Sunset Sky',       category: 'background', icon: '🌅', coinCost: 100, rarity: 'common'    },
  background_ocean:    { name: 'Ocean Depths',     category: 'background', icon: '🌊', coinCost: 180, rarity: 'rare'      },
};

export const RARITY_COLORS = {
  common:    'text-slate-500',
  rare:      'text-blue-500',
  epic:      'text-purple-500',
  legendary: 'text-yellow-500',
};

// ─── CURRICULA ────────────────────────────────────────────────────────────────
// subjects field added so any component can call getCurriculumInfo(key).subjects
export const CURRICULA = {
  // UK - Two options
  uk_national: {
    name: 'UK National Curriculum', country: '🇬🇧', gradeLabel: 'Year',
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9], currency: '£', spelling: 'british',
    subjects: ['maths', 'english', 'science'],
  },
  uk_11plus: {
    name: 'UK 11+', country: '🇬🇧', gradeLabel: 'Year',
    grades: [3, 4, 5, 6], currency: '£', spelling: 'british',
    subjects: ['maths', 'english', 'verbal', 'nvr'],
  },
  // US
  us_common_core: {
    name: 'US Common Core', country: '🇺🇸', gradeLabel: 'Grade',
    grades: [1, 2, 3, 4, 5, 6, 7, 8], currency: '$', spelling: 'american',
    subjects: ['maths', 'english', 'science'],
  },
  // Australia
  aus_acara: {
    name: 'Australian Curriculum', country: '🇦🇺', gradeLabel: 'Year',
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9], currency: 'A$', spelling: 'british',
    subjects: ['maths', 'english', 'science'],
  },
  // IB
  ib_pyp: {
    name: 'IB Primary Years (PYP)', country: '🌍', gradeLabel: 'Year',
    grades: [1, 2, 3, 4, 5, 6], currency: '$', spelling: 'american',
    subjects: ['maths', 'english', 'science'],
  },
  ib_myp: {
    name: 'IB Middle Years (MYP)', country: '🌍', gradeLabel: 'Year',
    grades: [1, 2, 3, 4, 5], currency: '$', spelling: 'american',
    subjects: ['maths', 'english', 'science'],
  },
  // Nigeria - Three stages
  ng_primary: {
    name: 'Nigerian Primary', country: '🇳🇬', gradeLabel: 'Primary',
    grades: [1, 2, 3, 4, 5, 6], currency: '₦', spelling: 'british',
    subjects: ['mathematics', 'english_studies', 'basic_science', 'social_studies',
               'civic_education', 'cultural_and_creative_arts', 'religious_studies'],
    alternateLabel: 'Basic'
  },
  ng_jss: {
    name: 'Nigerian JSS', country: '🇳🇬', gradeLabel: 'JSS',
    grades: [1, 2, 3], currency: '₦', spelling: 'british',
    subjects: ['mathematics', 'english_studies', 'basic_science', 'basic_technology', 'social_studies',
               'civic_education', 'business_education', 'cultural_and_creative_arts',
               'pre_vocational_studies', 'basic_digital_literacy', 'religious_studies', 'agricultural_science'],
    alternateLabel: 'Basic',
    alternateOffset: 6
  },
  ng_sss: {
    name: 'Nigerian SSS', country: '🇳🇬', gradeLabel: 'SS',
    grades: [1, 2, 3], currency: '₦', spelling: 'british',
    subjects: ['mathematics', 'english', 'physics', 'chemistry', 'biology',
               'civic_education', 'digital_technologies', 'economics', 'government', 'geography',
               'further_mathematics', 'accounting', 'agricultural_science'],
    exams: ['WAEC', 'NECO']
  },
};

// Kept for backward-compat; derived from CURRICULA so always in sync
export const SUBJECTS_BY_CURRICULUM = Object.fromEntries(
  Object.entries(CURRICULA).map(([key, val]) => [key, val.subjects])
);

// ─── SUBJECT METADATA ─────────────────────────────────────────────────────────
export const SUBJECT_ICONS = {
  maths: '🔢', mathematics: '🔢', english: '📚', verbal: '🧩',
  nvr: '🎨', science: '🔬', geography: '🌍', history: '📜',
  physics: '⚛️', chemistry: '🧪', biology: '🧬',
  social_studies: '🌍', hass: '🌏', commerce: '💰',
  basic_technology: '🔧', financial_accounting: '📊',
  further_mathematics: '📐', economics: '📈', government: '🏛️',
  business_studies: '💼', basic_science: '🧪',
  // Nigerian canonical names
  english_studies: '📖', basic_science: '🔬', basic_technology: '🔧',
  civic_education: '🏛️', business_education: '💼',
  cultural_and_creative_arts: '🎨', pre_vocational_studies: '🛠️',
  basic_digital_literacy: '💻', religious_studies: '📿',
  agricultural_science: '🌱', digital_technologies: '💻',
  accounting: '📒', literature_in_english: '📖',
  verbal_reasoning: '🧩', non_verbal_reasoning: '🎨',
  // UK additional
  computing: '💻', design_and_technology: '⚙️', religious_education: '✝️', citizenship: '⚖️',
};

export const SUBJECT_COLORS = {
  maths:          { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  },
  mathematics:    { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  },
  english:        { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500'    },
  english_studies: { bg: 'bg-rose-50',   text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500'    },
  verbal:         { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  dot: 'bg-purple-500'  },
  verbal_reasoning: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200',  dot: 'bg-purple-500'  },
  nvr:            { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500'    },
  non_verbal_reasoning: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200',   dot: 'bg-teal-500'    },
  science:        { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  basic_science:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  agricultural_science: { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200', dot: 'bg-lime-500' },
  digital_technologies: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  accounting:     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  literature_in_english: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  computing:      { bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200',   dot: 'bg-slate-500'   },
  design_and_technology: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  religious_education: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  citizenship:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    dot: 'bg-cyan-500'    },
  geography:      { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  history:        { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  physics:        { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-200',     dot: 'bg-sky-500'     },
  chemistry:      { bg: 'bg-lime-50',    text: 'text-lime-700',    border: 'border-lime-200',    dot: 'bg-lime-500'    },
  biology:        { bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',   dot: 'bg-green-500'   },
  social_studies: { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    dot: 'bg-cyan-500'    },
  civic_education: { bg: 'bg-blue-50',   text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  business_education: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  cultural_and_creative_arts: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
  pre_vocational_studies: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  basic_digital_literacy: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  religious_studies: { bg: 'bg-amber-50', text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  hass:           { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500'    },
  commerce:          { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  basic_technology:  { bg: 'bg-stone-50',   text: 'text-stone-700',   border: 'border-stone-200',   dot: 'bg-stone-500'   },
  financial_accounting: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  further_mathematics: { bg: 'bg-indigo-50',   text: 'text-indigo-700',  border: 'border-indigo-200',  dot: 'bg-indigo-500'  },
  economics:         { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    dot: 'bg-teal-500'    },
  government:        { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  business_studies:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  dot: 'bg-purple-500'  },
  basic_science:     { bg: 'bg-lime-50',    text: 'text-lime-700',    border: 'border-lime-200',    dot: 'bg-lime-500'    },
};

export const getLevelInfo = (totalXp) => {
  const XP_LEVELS = [
    { level: 1,  xp: 0,     title: 'Space Cadet'      },
    { level: 2,  xp: 500,   title: 'Cosmonaut'        },
    { level: 3,  xp: 1200,  title: 'Mission Pilot'    },
    { level: 4,  xp: 2500,  title: 'Star Navigator'   },
    { level: 5,  xp: 4500,  title: 'Orbit Commander'  },
    { level: 6,  xp: 7500,  title: 'Galaxy Explorer'  },
    { level: 7,  xp: 12000, title: 'Nebula Scout'     },
    { level: 8,  xp: 18000, title: 'Supernova Captain'},
    { level: 9,  xp: 26000, title: 'Black Hole Ranger'},
    { level: 10, xp: 36000, title: 'Universe Master'  },
  ];
  let current = XP_LEVELS[0];
  let next    = XP_LEVELS[1];
  for (let i = 0; i < XP_LEVELS.length; i++) {
    if (totalXp >= XP_LEVELS[i].xp) {
      current = XP_LEVELS[i];
      next    = XP_LEVELS[i + 1] || null;
    }
  }
  const progressXp  = next ? totalXp - current.xp : current.xp;
  const neededXp    = next ? next.xp - current.xp : 1;
  const progressPct = Math.min(100, Math.round((progressXp / neededXp) * 100));
  return { current, next, progressPct, progressXp, neededXp };
};

export const localise = (text, curriculum) => {
  // Add robust localisation based on the curriculum passed.
  // This is a placeholder since the full localise function wasn't in this file before.
  if(!text) return text;
  const isUS = curriculum === 'us_common_core';
  if(isUS){
      return text.replace(/maths/gi, "math").replace(/colour/gi, "color");
  }
  return text;
};

export const sounds = {
  correct:       () => {},
  wrong:         () => {},
  badgeEarned:   () => {},
  questComplete: () => {},
  toggle:        () => {},
};

export const ensureQuestsAssigned = async (scholarId) => {};

// ─── HELPER FUNCTIONS (used by student page, parent analytics, components) ────

/** Full curriculum definition; defaults to uk_11plus if key not found */
export const getCurriculumInfo = (key) => CURRICULA[key] ?? CURRICULA.uk_11plus;

/** Subject array for a curriculum */
export const getSubjectsForCurriculum = (key) =>
  (CURRICULA[key] ?? CURRICULA.uk_11plus).subjects;

/** Grades array for a curriculum */
export const getGradesForCurriculum = (key) =>
  (CURRICULA[key] ?? CURRICULA.uk_11plus).grades;

/** "Year 5" / "Grade 4" etc. formatted correctly for the curriculum */
export const formatGradeLabel = (grade, curriculum) => {
  const ci = getCurriculumInfo(curriculum);
  return `${ci.gradeLabel} ${grade}`;
};

/** Combined icon + Tailwind colour classes for a subject */
export const getSubjectMeta = (subject) => ({
  label:  subject.charAt(0).toUpperCase() + subject.slice(1).replace(/_/g, ' '),
  icon:   SUBJECT_ICONS[subject] ?? '📚',
  ...(SUBJECT_COLORS[subject] ?? {
    bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400',
  }),
});

export default {
  BADGES,
  TIER_COLORS,
  AVATAR_ITEMS,
  RARITY_COLORS,
  CURRICULA,
  SUBJECTS_BY_CURRICULUM,
  SUBJECT_ICONS,
  SUBJECT_COLORS,
  getCurriculumInfo,
  getSubjectsForCurriculum,
  getGradesForCurriculum,
  getLevelInfo,
  formatGradeLabel,
  getSubjectMeta,
  sounds,
  localise,
  ensureQuestsAssigned,
};