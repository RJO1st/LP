/**
 * narrativeEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * LaunchPard — Narrative World Building Engine
 *
 * Maps each subject to a themed cosmic realm. As scholars complete topics and
 * increase mastery, they advance through chapters, unlock story powers, and
 * receive mission log entries that make learning feel like an unfolding adventure.
 *
 * Structure:
 *   World → Realms (one per subject group) → Chapters (one per topic cluster)
 *   → Missions (individual sessions)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── WORLD MAP ────────────────────────────────────────────────────────────────
// Each realm maps to one or more subjects. The visual theme, colour, icon,
// and chapter structure are all defined here.

export const REALMS = {
  number_nebula: {
    id:          'number_nebula',
    name:        'Number Nebula',
    tagline:     'Where mathematics shapes the stars',
    icon:        '🔢',
    colour:      '#6366f1',
    gradient:    'from-indigo-600 to-purple-700',
    subjects:    ['mathematics', 'maths', 'further_mathematics', 'statistics'],
    unlockAt:    0,   // always unlocked
    chapters: [
      { id: 'launch_pad',      name: 'Launch Pad',         topics: ['place_value', 'number_bonds', 'addition', 'subtraction', 'multiplication', 'division'] },
      { id: 'fraction_fields', name: 'Fraction Fields',    topics: ['fractions', 'decimals', 'percentages', 'ratio', 'proportion'] },
      { id: 'algebra_asteroid',name: 'Algebra Asteroid',   topics: ['algebra', 'equations', 'sequences', 'functions', 'graphs'] },
      { id: 'geometry_gate',   name: 'Geometry Gate',      topics: ['geometry', 'shapes', 'angles', 'area', 'perimeter', 'volume', 'trigonometry'] },
      { id: 'data_dimension',  name: 'Data Dimension',     topics: ['statistics', 'probability', 'data_handling', 'mean_median_mode'] },
      { id: 'calculus_core',   name: 'Calculus Core',      topics: ['calculus', 'differentiation', 'integration', 'limits'] },
    ],
    powers: {
      'fraction_fields':  { id: 'precision_lens',  name: 'Precision Lens',  desc: 'Eliminates one wrong answer', icon: '🔭' },
      'algebra_asteroid': { id: 'equation_shield', name: 'Equation Shield', desc: 'Protects your streak once',   icon: '🛡️' },
      'calculus_core':    { id: 'time_warp',        name: 'Time Warp',       desc: '+30 seconds on timed quests', icon: '⏱️' },
    },
  },

  word_galaxy: {
    id:          'word_galaxy',
    name:        'Word Galaxy',
    tagline:     'The universe speaks in stories',
    icon:        '📖',
    colour:      '#ec4899',
    gradient:    'from-pink-500 to-rose-600',
    subjects:    ['english', 'english_language', 'literature', 'verbal_reasoning', 'french_language'],
    unlockAt:    0,
    chapters: [
      { id: 'phonics_planet',     name: 'Phonics Planet',      topics: ['phonics', 'spelling', 'word_families'] },
      { id: 'grammar_grove',      name: 'Grammar Grove',       topics: ['grammar', 'punctuation', 'sentence_structure', 'parts_of_speech'] },
      { id: 'vocabulary_vault',   name: 'Vocabulary Vault',    topics: ['vocabulary', 'synonyms', 'antonyms', 'word_meaning', 'prefixes', 'suffixes'] },
      { id: 'comprehension_cove', name: 'Comprehension Cove',  topics: ['comprehension', 'inference', 'authors_purpose', 'text_analysis'] },
      { id: 'writing_world',      name: 'Writing World',       topics: ['creative_writing', 'persuasive_writing', 'essays', 'narrative'] },
      { id: 'literature_lair',    name: 'Literature Lair',     topics: ['poetry', 'fiction', 'drama', 'literary_devices'] },
    ],
    powers: {
      'vocabulary_vault':   { id: 'word_weaver',   name: 'Word Weaver',   desc: 'Reveals a vocabulary hint', icon: '✨' },
      'comprehension_cove': { id: 'context_clue',  name: 'Context Clue',  desc: 'Highlights key passage text', icon: '🔍' },
    },
  },

  pattern_planet: {
    id:          'pattern_planet',
    name:        'Pattern Planet',
    tagline:     'Decode the shapes that govern the cosmos',
    icon:        '🔷',
    colour:      '#6366f1',
    gradient:    'from-indigo-500 to-cyan-600',
    subjects:    ['non_verbal_reasoning', 'nvr', 'spatial_reasoning'],
    unlockAt:    0,
    chapters: [
      { id: 'shape_station',   name: 'Shape Station',    topics: ['pattern_recognition', 'shape_matching', 'odd_shape_out', 'mirror_images', 'shape_sequences'] },
      { id: 'matrix_moon',     name: 'Matrix Moon',      topics: ['matrix_puzzles', 'cube_nets', 'rotations_and_reflections', 'figure_classification', 'analogous_figures'] },
      { id: 'spatial_sector',  name: 'Spatial Sector',   topics: ['spatial_reasoning', 'complex_matrices', '3d_visualisation', 'code_shapes', 'series_completion'] },
    ],
    powers: {
      'matrix_moon':   { id: 'pattern_pulse', name: 'Pattern Pulse', desc: 'Eliminates one wrong shape',    icon: '🔷' },
      'spatial_sector':{ id: 'shape_sight',   name: 'Shape Sight',   desc: 'Highlights the key difference', icon: '👁️' },
    },
  },


  science_station: {
    id:          'science_station',
    name:        'Science Station',
    tagline:     'Discover the laws of the cosmos',
    icon:        '🔬',
    colour:      '#10b981',
    gradient:    'from-emerald-500 to-teal-600',
    subjects:    ['science', 'biology', 'chemistry', 'physics', 'basic_science', 'combined_science'],
    // combined_science is UK KS4 alias for biology+chemistry+physics taught as one subject.
    // Questions are drawn from the same topic pools as the three individual sciences.
    unlockAt:    100,  // 100 story points
    chapters: [
      { id: 'life_lab',         name: 'Life Lab',          topics: ['cells', 'living_organisms', 'plants', 'animals', 'biology', 'genetics', 'evolution'] },
      { id: 'matter_moon',      name: 'Matter Moon',       topics: ['chemistry', 'atoms', 'elements', 'compounds', 'reactions', 'periodic_table'] },
      { id: 'force_frontier',   name: 'Force Frontier',    topics: ['physics', 'forces', 'motion', 'energy', 'electricity', 'waves', 'light'] },
      { id: 'earth_engine',     name: 'Earth Engine',      topics: ['earth_science', 'rocks', 'weather', 'climate', 'ecosystems', 'food_chains'] },
      { id: 'space_sector',     name: 'Space Sector',      topics: ['space', 'solar_system', 'stars', 'gravity', 'nuclear_physics'] },
    ],
    powers: {
      'matter_moon':    { id: 'element_eye',    name: 'Element Eye',    desc: 'Shows the periodic table hint', icon: '⚗️' },
      'force_frontier': { id: 'formula_forge',  name: 'Formula Forge',  desc: 'Reveals the key formula',       icon: '⚡' },
    },
  },

  history_horizon: {
    id:          'history_horizon',
    name:        'History Horizon',
    tagline:     'Every answer unlocks a lost era',
    icon:        '🏛️',
    colour:      '#f59e0b',
    gradient:    'from-amber-500 to-orange-600',
    subjects:    ['history', 'social_studies', 'individuals_and_societies', 'hass', 'canadian_history', 'agricultural_science', 'religious_studies'],
    unlockAt:    150,
    chapters: [
      { id: 'ancient_archives', name: 'Ancient Archives',   topics: ['ancient_egypt', 'ancient_greece', 'roman_empire', 'ancient_civilisations'] },
      { id: 'empire_era',       name: 'Empire Era',         topics: ['british_empire', 'colonialism', 'trade', 'slavery', 'independence'] },
      { id: 'world_wars',       name: 'World Wars Wing',    topics: ['world_war_1', 'world_war_2', 'causes', 'consequences', 'cold_war'] },
      { id: 'modern_mission',   name: 'Modern Mission',     topics: ['civil_rights', 'democracy', 'globalisation', 'modern_history'] },
    ],
    powers: {
      'empire_era':   { id: 'timeline_trace', name: 'Timeline Trace', desc: 'Shows a date/era hint', icon: '📅' },
      'world_wars':   { id: 'source_sight',   name: 'Source Sight',   desc: 'Reveals the source context', icon: '📜' },
    },
  },

  geography_grid: {
    id:          'geography_grid',
    name:        'Geography Grid',
    tagline:     'Map every corner of the universe',
    icon:        '🌍',
    colour:      '#3b82f6',
    gradient:    'from-blue-500 to-cyan-600',
    subjects:    ['geography'],
    unlockAt:    200,
    chapters: [
      { id: 'physical_planet',  name: 'Physical Planet',   topics: ['rivers', 'mountains', 'volcanoes', 'earthquakes', 'weather', 'climate'] },
      { id: 'human_hub',        name: 'Human Hub',         topics: ['population', 'urbanisation', 'migration', 'development', 'globalisation'] },
      { id: 'eco_engine',       name: 'Eco Engine',        topics: ['ecosystems', 'biomes', 'climate_change', 'sustainability', 'deforestation'] },
      { id: 'map_matrix',       name: 'Map Matrix',        topics: ['map_skills', 'grid_references', 'contours', 'scale'] },
    ],
    powers: {
      'physical_planet': { id: 'map_marker', name: 'Map Marker', desc: 'Reveals a geographical clue', icon: '🗺️' },
    },
  },

  civic_command: {
    id:          'civic_command',
    name:        'Civic Command',
    tagline:     'Lead with knowledge and justice',
    icon:        '⚖️',
    colour:      '#8b5cf6',
    gradient:    'from-violet-500 to-purple-600',
    subjects:    ['civic_education', 'government', 'economics', 'business_studies', 'commerce', 'accounting', 'home_economics'],
    unlockAt:    250,
    chapters: [
      { id: 'government_gate',  name: 'Government Gate',    topics: ['democracy', 'parliament', 'constitution', 'arms_of_government', 'federalism'] },
      { id: 'economy_engine',   name: 'Economy Engine',     topics: ['economics', 'supply', 'demand', 'inflation', 'gdp', 'trade', 'fiscal_policy'] },
      { id: 'business_bridge',  name: 'Business Bridge',    topics: ['business', 'marketing', 'finance', 'entrepreneurship', 'accounting'] },
      { id: 'rights_realm',     name: 'Rights Realm',       topics: ['human_rights', 'citizenship', 'justice', 'law', 'civic_education'] },
    ],
    powers: {
      'economy_engine': { id: 'market_mind', name: 'Market Mind', desc: 'Shows an economic data clue', icon: '📊' },
    },
  },

  tech_terminal: {
    id:          'tech_terminal',
    name:        'Tech Terminal',
    tagline:     'Code the future of the galaxy',
    icon:        '💻',
    colour:      '#06b6d4',
    gradient:    'from-cyan-500 to-blue-600',
    subjects:    ['computer_science', 'ict', 'digital_technologies', 'basic_technology'],
    unlockAt:    300,
    chapters: [
      { id: 'binary_base',      name: 'Binary Base',        topics: ['binary', 'data_representation', 'number_systems'] },
      { id: 'algorithm_arc',    name: 'Algorithm Arc',      topics: ['algorithms', 'flowcharts', 'pseudocode', 'computational_thinking'] },
      { id: 'code_cosmos',      name: 'Code Cosmos',        topics: ['programming', 'variables', 'loops', 'functions', 'debugging'] },
      { id: 'network_nexus',    name: 'Network Nexus',      topics: ['networks', 'internet', 'protocols', 'cybersecurity', 'databases'] },
    ],
    powers: {
      'code_cosmos': { id: 'debug_droid', name: 'Debug Droid', desc: 'Highlights the logical error', icon: '🤖' },
    },
  },
  // ── Expedition Base ────────────────────────────────────────────────────────
  // Physical education, health, and outdoor learning.
  // Introduced for Canadian curricula; open to any future PE-bearing curriculum.
  expedition_base: {
    id:          'expedition_base',
    name:        'Expedition Base',
    description: 'Where scholars train their bodies and minds for the mission ahead.',
    icon:        '🏃',
    colour:      '#10b981',
    gradient:    'from-emerald-500 to-teal-600',
    subjects:    ['physical_education', 'health', 'pe'],
    unlockAt:    50,
    chapters: [
      { id: 'movement_lab',    name: 'Movement Lab',    topics: ['movement_skills', 'safety_and_fair_play', 'fitness_and_health'] },
      { id: 'team_arena',      name: 'Team Arena',      topics: ['team_sports', 'individual_sports', 'healthy_lifestyle'] },
      { id: 'wellness_world',  name: 'Wellness World',  topics: ['nutrition_basics', 'mental_wellbeing', 'outdoor_education', 'swimming_and_water_safety'] },
    ],
    powers: {
      'wellness_world': { id: 'endurance_boost', name: 'Endurance Boost', desc: 'Grants a hint on the next tough question', icon: '⚡' },
    },
  },

};

// ─── NARRATIVE: STORY CHAPTERS PER REALM ─────────────────────────────────────
// Each chapter has an intro text (shown before the quiz starts) and a
// completion text (shown after the chapter topics are mastered).

export const CHAPTER_NARRATIVES = {
  // Number Nebula
  launch_pad: {
    intro:    "Commander, the Number Nebula's Launch Pad has been hit by a rogue meteor shower! The navigation computers are scrambled. Only a scholar who masters the basics of number can restore the systems and launch us into deeper space.",
    complete: "Outstanding! The Launch Pad systems are fully restored. The crew of the LaunchPard roar with celebration. You've earned your place among the stars. The Fraction Fields await...",
  },
  fraction_fields: {
    intro:    "Beyond the Launch Pad lie the shimmering Fraction Fields — a region of space where the laws of mathematics bend. Strange creatures called Denominators guard the path. Only a scholar who truly understands fractions, decimals, and ratios can negotiate safe passage.",
    complete: "The Denominators bow before your knowledge. The Fraction Fields are now mapped and safe. You've unlocked the Precision Lens power — use it wisely on your next mission.",
  },
  algebra_asteroid: {
    intro:    "A massive asteroid is heading for the station — its surface covered in algebraic equations. Scientists say if we can solve the equations, we can redirect it. The clock is ticking, Commander.",
    complete: "Incredible. The asteroid changes course. The galaxy breathes again. You've proven that algebra isn't just symbols — it's the language the universe uses to talk to us.",
  },

  // Word Galaxy
  phonics_planet: {
    intro:    "Welcome to Phonics Planet, where every word is made of sound-crystals. The planet's communication systems have gone silent. Only a cadet who understands the sounds behind words can repair the transmitters.",
    complete: "The transmitters hum back to life! Phonics Planet is broadcasting again across the galaxy. Your mastery of sounds has connected worlds.",
  },
  comprehension_cove: {
    intro:    "Deep in the Word Galaxy lies Comprehension Cove — a hidden bay where ancient messages float in bottles. Each message holds a story. Each story holds a secret. Only a scholar who can read between the lines will find what's hidden.",
    complete: "You've decoded the final message. The Cove's ancient library is yours to explore. Every book now glows with the knowledge you've unlocked.",
  },

  // Pattern Planet
  shape_station: {
    intro:    "Commander, the Pattern Planet's signal array is scrambled — shapes are appearing in the wrong order and the crew can't decode the transmissions. Only a scholar who can spot patterns and match shapes can restore order.",
    complete: "The signal array hums back to life! Your pattern recognition has unlocked the Matrix Moon. Strange geometric puzzles await...",
  },
  matrix_moon: {
    intro:    "The Matrix Moon is covered in grids of shapes — each one a lock that can only be opened by finding what's missing. The station's engineers are baffled. Time to show them what you're made of.",
    complete: "Every matrix solved! The Moon's vaults swing open, revealing the path to the Spatial Sector. You've unlocked Pattern Pulse — use it when the going gets tough.",
  },
  spatial_sector: {
    intro:    "Deep in the Spatial Sector, 3D structures float in zero gravity. Cadets must mentally rotate, fold, and unfold them to navigate through. This is the ultimate test of your mind's eye.",
    complete: "Incredible spatial reasoning, Commander. The Spatial Sector is fully charted. The galaxy's most complex structures hold no secrets from you now.",
  },

  // Default
  default_intro: "A new challenge awaits in this sector of the LaunchPard universe. Show the galaxy what you're made of, Commander.",
  default_complete: "Mission accomplished. The galaxy records another victory for LaunchPard's finest.",
};

// ─── NARRATIVE STATE HELPERS ──────────────────────────────────────────────────

/**
 * Get the realm for a given subject.
 * @param {string} subject
 * @returns {object|null} - realm config
 */
export function getRealmForSubject(subject) {
  const subjectLower = subject?.toLowerCase().replace(/ /g, '_');
  return Object.values(REALMS).find(r => r.subjects.includes(subjectLower)) ?? null;
}

/**
 * Get the current chapter within a realm based on mastery records.
 * A chapter is "active" if the scholar has any mastery in its topics
 * but hasn't mastered all of them (mastery < 0.80 for all).
 *
 * @param {string} realmId
 * @param {array}  masteryRecords - scholar_topic_mastery rows for this realm
 * @returns {object}              - { chapter, chapterIndex, progressPct }
 */
export function getCurrentChapter(realmId, masteryRecords) {
  const realm = REALMS[realmId];
  if (!realm) return { chapter: realm?.chapters?.[0], chapterIndex: 0, progressPct: 0 };

  const masteryMap = {};
  for (const r of masteryRecords) {
    masteryMap[r.topic] = r.mastery_score;
  }

  for (let i = 0; i < realm.chapters.length; i++) {
    const chapter = realm.chapters[i];
    const topicScores = chapter.topics.map(t =>
      Object.keys(masteryMap).find(k => k.includes(t) || t.includes(k))
        ? masteryMap[Object.keys(masteryMap).find(k => k.includes(t) || t.includes(k))]
        : 0
    );
    const avgMastery = topicScores.length
      ? topicScores.reduce((a, b) => a + b, 0) / topicScores.length
      : 0;

    // Return the first chapter not yet mastered
    if (avgMastery < 0.80) {
      const progressPct = Math.round(avgMastery * 100);
      return { chapter, chapterIndex: i, progressPct };
    }
  }

  // All chapters mastered
  const lastChapter = realm.chapters[realm.chapters.length - 1];
  return { chapter: lastChapter, chapterIndex: realm.chapters.length - 1, progressPct: 100 };
}

/**
 * Check if a power has been unlocked based on current narrative state.
 * A power unlocks when the chapter it's tied to is first completed.
 *
 * @param {string} realmId
 * @param {object} realmProgress  - { [chapterId]: { completed: bool } }
 * @returns {array}               - array of newly unlocked power objects
 */
export function checkPowerUnlocks(realmId, realmProgress) {
  const realm = REALMS[realmId];
  if (!realm?.powers) return [];

  const newPowers = [];
  for (const [chapterId, power] of Object.entries(realm.powers)) {
    if (realmProgress?.[chapterId]?.completed && !realmProgress?.[chapterId]?.power_claimed) {
      newPowers.push({ ...power, chapterId });
    }
  }
  return newPowers;
}

/**
 * Generate a mission log entry for a completed session.
 *
 * @param {object} params - { scholarName, subject, topic, correct, total, masteryGain }
 * @returns {object}      - { text, emoji, timestamp, storyPoints }
 */
export function generateMissionLogEntry({ scholarName, subject, topic, correct, total, masteryGain }) {
  const realm   = getRealmForSubject(subject);
  const pct     = Math.round((correct / total) * 100);
  const gain    = Math.round((masteryGain ?? 0) * 100);
  const name    = scholarName ?? 'Commander';
  const topicDisplay = topic?.replace(/_/g, ' ') ?? subject;

  const entries = [
    { threshold: 90, texts: [
      `${name} blazed through ${topicDisplay} — ${pct}% accuracy! The ${realm?.name ?? 'station'} shines brighter.`,
      `Stellar performance on ${topicDisplay}. ${correct}/${total} correct. The crew erupts in applause.`,
    ]},
    { threshold: 70, texts: [
      `${name} completed a ${topicDisplay} mission — ${correct}/${total} correct. Mastery growing (+${gain}%).`,
      `Good work on ${topicDisplay}. ${pct}% accuracy recorded in the mission log.`,
    ]},
    { threshold: 0, texts: [
      `${name} battled through ${topicDisplay}. ${correct}/${total} correct. The mission continues — try again!`,
      `${topicDisplay} proved tricky today. ${pct}% accuracy. Tara has scheduled a review mission.`,
    ]},
  ];

  const entry = entries.find(e => pct >= e.threshold);
  const text  = entry.texts[Math.floor(Math.random() * entry.texts.length)];
  const storyPoints = Math.round((correct / total) * 20);

  return {
    text,
    emoji:       pct >= 90 ? '⭐' : pct >= 70 ? '📈' : '🔄',
    timestamp:   new Date().toISOString(),
    subject,
    topic,
    storyPoints,
    accuracy:    pct,
  };
}

/**
 * Check which realms a scholar has unlocked based on story points.
 *
 * @param {number} storyPoints
 * @returns {array} - array of unlocked realm IDs
 */
export function getUnlockedRealms(storyPoints) {
  return Object.values(REALMS)
    .filter(r => storyPoints >= (r.unlockAt ?? 0))
    .map(r => r.id);
}

/**
 * Calculate story points earned from a session.
 *
 * @param {number} correct - questions answered correctly
 * @param {number} total   - total questions in session
 * @param {number} streak  - current streak count
 * @returns {number}
 */
export function calcStoryPoints(correct, total, streak = 0) {
  const base    = correct * 5;
  const bonus   = total > 0 && correct === total ? 10 : 0;   // perfect session bonus
  const streakB = Math.min(streak, 10) * 2;                  // streak bonus, capped
  return base + bonus + streakB;
}

/**
 * Get the narrative intro text for a chapter.
 * Falls back to default if no specific narrative exists.
 */
export function getChapterIntro(chapterId) {
  return CHAPTER_NARRATIVES[chapterId]?.intro ?? CHAPTER_NARRATIVES.default_intro;
}

export function getChapterComplete(chapterId) {
  return CHAPTER_NARRATIVES[chapterId]?.complete ?? CHAPTER_NARRATIVES.default_complete;
}

// ─── NIGERIAN SSS STREAM SUBJECT MAP ─────────────────────────────────────────
// Used by the world map to grey out subjects not in the scholar's stream.
// Each subject is tagged: 'compulsory' | 'science' | 'humanities' | 'business' | 'trade'

export const NG_SSS_SUBJECT_STREAM = {
  // Compulsory for all
  english:                    'compulsory',
  mathematics:                'compulsory',
  citizenship_and_heritage:   'compulsory',
  digital_technologies:       'compulsory',

  // Science stream
  biology:                    'science',
  chemistry:                  'science',
  physics:                    'science',
  further_mathematics:        'science',
  agricultural_science:       'science',
  health_education:           'science',
  geography:                  'science',

  // Humanities stream
  literature_in_english:      'humanities',
  government:                 'humanities',
  nigerian_history:           'humanities',
  home_management:            'humanities',

  // Business stream
  economics:                  'business',
  accounting:                 'business',
  commerce:                   'business',
  marketing:                  'business',
};

// UK KS4 compulsory subjects — always active regardless of option selection
const UK_KS4_COMPULSORY_SUBJECTS = new Set([
  'mathematics', 'english_language', 'english_literature',
  'biology', 'chemistry', 'physics', 'physical_education', 'citizenship',
]);

/**
 * Check if a subject is accessible for a given scholar.
 * Returns: 'active' | 'greyed' (not in scholar's selection)
 *
 * @param {string} subject
 * @param {string} curriculum
 * @param {string|null} stream            - NG SSS stream (science|humanities|business)
 * @param {string|null} tradeSubject      - NG SSS trade subject
 * @param {string[]|null} selectedSubjects - UK KS4 optional subjects
 * @param {number|null} yearLevel         - scholar's year level
 */
export function getSubjectAccessibility(subject, curriculum, stream, tradeSubject, selectedSubjects, yearLevel) {
  // ── Nigerian SSS ──────────────────────────────────────────────────────────
  if (curriculum === 'ng_sss') {
    const subjectStream = NG_SSS_SUBJECT_STREAM[subject];
    if (!subjectStream || subjectStream === 'compulsory') return 'active';
    if (subject === tradeSubject) return 'active';
    if (subjectStream === stream) return 'active';
    return 'greyed';
  }

  // ── UK National KS4 (Y10–Y11) ─────────────────────────────────────────────
  if (curriculum === 'uk_national' && (yearLevel === 10 || yearLevel === 11)) {
    if (UK_KS4_COMPULSORY_SUBJECTS.has(subject)) return 'active';
    if (!selectedSubjects || selectedSubjects.length === 0) return 'active';
    // combined_science: active if scholar takes it OR takes any of the triple sciences
    if (subject === 'combined_science') {
      return (selectedSubjects.includes('combined_science') ||
              selectedSubjects.includes('biology') ||
              selectedSubjects.includes('chemistry') ||
              selectedSubjects.includes('physics')) ? 'active' : 'greyed';
    }
    if (selectedSubjects.includes(subject)) return 'active';
    return 'greyed';
  }

  // ── All other curricula/years — always active ─────────────────────────────
  return 'active';
}