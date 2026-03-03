export const BADGES = {
  first_quest:    { name: 'Launch Initiated', icon: '🚀', tier: 'bronze', xp: 25,  coins: 5   },
  maths_bronze:   { name: 'Number Cadet',     icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  maths_silver:   { name: 'Calculation Commander', icon: '🥈', tier: 'silver', xp: 150, coins: 30 },
  maths_gold:     { name: 'Maths Maestro',    icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  english_bronze: { name: 'Word Cadet',       icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  english_silver: { name: 'Grammar Guardian', icon: '🥈', tier: 'silver', xp: 150, coins: 30  },
  english_gold:   { name: 'Grammar Guru',     icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  verbal_bronze:  { name: 'Puzzle Cadet',     icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  verbal_gold:    { name: 'Verbal Virtuoso',  icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  nvr_bronze:     { name: 'Shape Scout',      icon: '🥉', tier: 'bronze', xp: 50,  coins: 10  },
  nvr_gold:       { name: 'Pattern Pioneer',  icon: '🏆', tier: 'gold',   xp: 500, coins: 100 },
  streak_3:       { name: 'On Fire',          icon: '🔥', tier: 'bronze', xp: 50,  coins: 10  },
  streak_7:       { name: 'Week Warrior',     icon: '🔥', tier: 'silver', xp: 150, coins: 30  },
  streak_30:      { name: 'Monthly Maverick', icon: '🔥', tier: 'gold',   xp: 500, coins: 100 },
  accuracy_90:    { name: 'Sharp Shooter',    icon: '🎯', tier: 'silver', xp: 150, coins: 30  },
  accuracy_100:   { name: 'Perfect Mission',  icon: '⭐', tier: 'gold',   xp: 300, coins: 75  },
  speed_demon:    { name: 'Warp Speed',       icon: '⚡', tier: 'silver', xp: 150, coins: 30  },
};

export const TIER_COLORS = {
  bronze: { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300',  glow: '#f59e0b' },
  silver: { bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-300',  glow: '#94a3b8' },
  gold:   { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-400', glow: '#eab308' },
};

export const AVATAR_ITEMS = {
  hat_wizard:       { name: 'Wizard Hat',    category: 'hat',       icon: '🧙', coinCost: 50,  rarity: 'rare'      },
  hat_crown:        { name: 'Crown',         category: 'hat',       icon: '👑', coinCost: 0,   badgeRequired: 'accuracy_100', rarity: 'legendary' },
  hat_astronaut:    { name: 'Astronaut Helmet', category: 'hat',    icon: '🪖', coinCost: 0,   badgeRequired: 'maths_silver', rarity: 'rare' },
  hat_graduation:   { name: 'Graduation Cap',category: 'hat',       icon: '🎓', coinCost: 0,   badgeRequired: 'english_silver', rarity: 'rare' },
  accessory_stars:  { name: 'Star Aura',     category: 'accessory', icon: '✨', coinCost: 100, rarity: 'epic'      },
  accessory_flame:  { name: 'Flame Trail',   category: 'accessory', icon: '🔥', coinCost: 0,   badgeRequired: 'streak_7', rarity: 'rare' },
  pet_cat:          { name: 'Space Cat',     category: 'pet',       icon: '🐱', coinCost: 200, rarity: 'common'    },
  pet_robot:        { name: 'Robot Buddy',   category: 'pet',       icon: '🤖', coinCost: 0,   badgeRequired: 'maths_gold', rarity: 'legendary' },
  pet_owl:          { name: 'Owl Companion', category: 'pet',       icon: '🦉', coinCost: 0,   badgeRequired: 'english_gold', rarity: 'legendary' },
  pet_alien:        { name: 'Alien Pal',     category: 'pet',       icon: '👽', coinCost: 500, rarity: 'epic'      },
  background_space: { name: 'Deep Space',    category: 'background',icon: '🪐', coinCost: 150, rarity: 'rare'      },
  background_galaxy:{ name: 'Galaxy',        category: 'background',icon: '🌌', coinCost: 0,   badgeRequired: 'verbal_gold', rarity: 'legendary' },
};

export const RARITY_COLORS = {
  common:    'text-slate-500',
  rare:      'text-blue-500',
  epic:      'text-purple-500',
  legendary: 'text-yellow-500',
};

export const CURRICULA = {
  uk_11plus:      { name: 'UK 11+',                country: '🇬🇧', gradeLabel: 'Year',  grades: [1,2,3,4,5,6],  currency: '£',  spelling: 'british' },
  uk_national:    { name: 'UK National Curriculum', country: '🇬🇧', gradeLabel: 'Year',  grades: [1,2,3,4,5,6],  currency: '£',  spelling: 'british' },
  us_common_core: { name: 'US Common Core',         country: '🇺🇸', gradeLabel: 'Grade', grades: [1,2,3,4,5,6,7,8], currency: '$', spelling: 'american' },
  australian:     { name: 'Australian Curriculum',  country: '🇦🇺', gradeLabel: 'Year',  grades: [1,2,3,4,5,6],  currency: 'A$', spelling: 'british' },
  ib_pyp:         { name: 'IB Primary Years (PYP)', country: '🌐', gradeLabel: 'Grade', grades: [1,2,3,4,5],    currency: '$',  spelling: 'american' },
  waec:           { name: 'WAEC / Nigerian',         country: '🇳🇬', gradeLabel: 'Year',  grades: [7,8,9,10,11,12], currency: '₦', spelling: 'british' },
};

export const SUBJECTS_BY_CURRICULUM = {
  uk_11plus:      ['maths', 'english', 'verbal', 'nvr'],
  uk_national:    ['maths', 'english', 'verbal', 'nvr', 'science'],
  us_common_core: ['maths', 'english', 'science', 'geography'],
  australian:     ['maths', 'english', 'verbal', 'science'],
  ib_pyp:         ['maths', 'english', 'science', 'geography', 'history'],
  waec:           ['maths', 'english', 'verbal', 'science', 'geography', 'history'],
};

export const getLevelInfo = (totalXp) => {
  const XP_LEVELS = [
    { level: 1,  xp: 0,     title: 'Space Cadet'     },
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

export const sounds = {
  correct: () => {},
  wrong: () => {},
  badgeEarned: () => {},
  questComplete: () => {},
  toggle: () => {},
};

export const ensureQuestsAssigned = async (scholarId) => {};
