/**
 * NERDC-aligned subject and topic display labels for Nigerian curricula.
 * Provides correct official terminology per NERDC curriculum framework.
 */

/**
 * Subject display names per Nigerian curriculum
 */
export const NG_SUBJECT_LABELS = {
  // Shared across ng_primary and ng_jss
  shared: {
    mathematics: 'Mathematics',
    basic_science: 'Basic Science & Technology',
    basic_technology: 'Basic Technology',
    social_studies: 'Social Studies',
    civic_education: 'Civic Education',
    cultural_and_creative_arts: 'Cultural & Creative Arts',
    agricultural_science: 'Agricultural Science',
    religious_studies: 'Religious Studies',
    physical_health_education: 'Physical & Health Education',
  },
  ng_primary: {
    // Override shared where primary differs
    english_studies: 'English Language',
    business_education: 'Business Education',
    basic_digital_literacy: 'Digital Literacy',
    pre_vocational_studies: 'Pre-Vocational Studies',
    yoruba: 'Yoruba Language',
    hausa: 'Hausa Language',
    igbo: 'Igbo Language',
  },
  ng_jss: {
    english_studies: 'English Studies',
    business_education: 'Business Studies',
    basic_digital_literacy: 'Computer Studies',
    home_economics: 'Home Economics',
    physical_health_education: 'Physical & Health Education',
    pre_vocational_studies: 'Pre-Vocational Studies',
    yoruba: 'Yoruba Language',
    hausa: 'Hausa Language',
    igbo: 'Igbo Language',
  },
  ng_sss: {
    mathematics: 'Mathematics',
    english: 'English Language',
    english_studies: 'English Language',
    physics: 'Physics',
    chemistry: 'Chemistry',
    biology: 'Biology',
    civic_education: 'Civic Education',
    digital_technologies: 'Computer Science',
    economics: 'Economics',
    government: 'Government',
    geography: 'Geography',
    further_mathematics: 'Further Mathematics',
    accounting: 'Financial Accounting',
    agricultural_science: 'Agricultural Science',
    literature_in_english: 'Literature in English',
    technical_drawing: 'Technical Drawing',
    commerce: 'Commerce',
    yoruba: 'Yoruba Language',
    hausa: 'Hausa Language',
    igbo: 'Igbo Language',
  },
};

/**
 * Topic-level display names for Nigerian curricula.
 * Only overrides where slug doesn't format correctly.
 */
export const NG_TOPIC_LABELS = {
  // Mathematics (shared across curricula)
  bodmas: 'BODMAS',
  lcm_hcf: 'LCM & HCF',
  lcm: 'LCM',
  hcf: 'HCF',
  indices_and_logarithms: 'Indices & Logarithms',
  simultaneous_equations: 'Simultaneous Equations',
  quadratic_equations: 'Quadratic Equations',
  trigonometric_ratios: 'Trigonometric Ratios',
  coordinate_geometry: 'Coordinate Geometry',
  statistics_and_probability: 'Statistics & Probability',
  mensuration: 'Mensuration',
  vectors_and_mechanics: 'Vectors & Mechanics',
  financial_arithmetic: 'Financial Arithmetic',
  binary_numbers: 'Binary Numbers',
  word_problems: 'Word Problems',
  basic_operations: 'Basic Operations',
  fractions_decimals_percentages: 'Fractions, Decimals & Percentages',
  angles_and_triangles: 'Angles & Triangles',
  circles_and_spheres: 'Circles & Spheres',
  sequences_and_series: 'Sequences & Series',
  number_theory: 'Number Theory',
  surds_and_radicals: 'Surds & Radicals',
  inequalities_and_linear_programming: 'Inequalities & Linear Programming',
  transformations_and_symmetry: 'Transformations & Symmetry',
  rates_and_ratios: 'Rates & Ratios',
  percentage_and_profit_loss: 'Percentage & Profit/Loss',
  simple_compound_interest: 'Simple & Compound Interest',
  // Science
  states_of_matter: 'States of Matter',
  heat_and_temperature: 'Heat & Temperature',
  light_and_shadow: 'Light & Shadow',
  sound_and_vibration: 'Sound & Vibration',
  electricity_and_magnetism: 'Electricity & Magnetism',
  cells_and_tissues: 'Cells & Tissues',
  plants_and_animals: 'Plants & Animals',
  human_body_systems: 'Human Body Systems',
  food_and_nutrition: 'Food & Nutrition',
  microorganisms: 'Microorganisms',
  ecology_and_environment: 'Ecology & Environment',
  forces_and_motion: 'Forces & Motion',
  simple_machines: 'Simple Machines',
  energy_transfer: 'Energy Transfer',
  waves_and_radiation: 'Waves & Radiation',
  atoms_and_elements: 'Atoms & Elements',
  chemical_reactions: 'Chemical Reactions',
  acids_bases_salts: 'Acids, Bases & Salts',
  organic_chemistry: 'Organic Chemistry',
  dna_genetics: 'DNA & Genetics',
  evolution: 'Evolution',
  photosynthesis: 'Photosynthesis',
  respiration: 'Respiration',
  // English Language
  phonics: 'Phonics',
  spelling: 'Spelling',
  grammar: 'Grammar',
  punctuation: 'Punctuation',
  vocabulary: 'Vocabulary',
  comprehension: 'Comprehension',
  writing_skills: 'Writing Skills',
  reading_skills: 'Reading Skills',
  speaking_skills: 'Speaking Skills',
  listening_skills: 'Listening Skills',
  literature_appreciation: 'Literature Appreciation',
  essay_writing: 'Essay Writing',
  creative_writing: 'Creative Writing',
  // Social Studies
  nigeria_map_geography: 'Nigeria Map & Geography',
  african_countries: 'African Countries',
  world_capitals: 'World Capitals',
  culture_and_traditions: 'Culture & Traditions',
  family_and_community: 'Family & Community',
  government_and_citizens: 'Government & Citizens',
  rights_and_responsibilities: 'Rights & Responsibilities',
  population_and_resources: 'Population & Resources',
  trade_and_commerce: 'Trade & Commerce',
  // History
  pre_colonial_nigeria: 'Pre-Colonial Nigeria',
  colonial_period: 'Colonial Period',
  independence: 'Independence',
  nigerian_civil_war: 'Nigerian Civil War',
  national_development: 'National Development',
  // Civic Education
  national_symbols: 'National Symbols',
  constitution: 'Constitution',
  citizenship: 'Citizenship',
  democracy: 'Democracy',
  law_and_order: 'Law & Order',
  // Technology
  computer_basics: 'Computer Basics',
  data_and_databases: 'Data & Databases',
  programming: 'Programming',
  networks: 'Networks',
  cybersecurity: 'Cybersecurity',
  digital_ethics: 'Digital Ethics',
};

/**
 * Get the official Nigerian curriculum display name for a subject slug.
 * Falls back to shared labels, then to formatted slug.
 * @param {string} subject - The subject slug (e.g. 'basic_science')
 * @param {string} curriculum - The curriculum ID (e.g. 'ng_jss', 'ng_sss', 'ng_primary')
 * @returns {string} Official display name
 */
export function getNigerianSubjectLabel(subject, curriculum) {
  // Curriculum-specific label takes priority
  const curriculumLabels = NG_SUBJECT_LABELS[curriculum] ?? {};
  if (curriculumLabels[subject]) return curriculumLabels[subject];

  // Shared Nigerian label
  if (NG_SUBJECT_LABELS.shared[subject]) return NG_SUBJECT_LABELS.shared[subject];

  // Fallback: format the slug
  return subject.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Get topic display label, Nigerian-aware.
 * @param {string} topicSlug - The topic slug (e.g. 'bodmas')
 * @param {string} curriculum - Optional curriculum ID for context (not currently used but future-proofing)
 * @returns {string} Display label
 */
export function getNigerianTopicLabel(topicSlug, curriculum = null) {
  if (NG_TOPIC_LABELS[topicSlug]) return NG_TOPIC_LABELS[topicSlug];
  // Default: format slug
  return topicSlug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Check if a curriculum is Nigerian
 * @param {string} curriculum - The curriculum ID
 * @returns {boolean} True if curriculum is a Nigerian curriculum
 */
export function isNigerianCurriculum(curriculum) {
  return ['ng_primary', 'ng_jss', 'ng_sss'].includes(curriculum);
}

/**
 * Get the exam board label for a Nigerian curriculum
 * @param {string} curriculum - The curriculum ID
 * @param {number} yearLevel - Optional year level (not used but provided for context)
 * @returns {string|null} Exam board name or null
 */
export function getNigerianExamBoard(curriculum, yearLevel = null) {
  if (curriculum === 'ng_sss') return 'WAEC/NECO';
  if (curriculum === 'ng_jss') return 'BECE';
  if (curriculum === 'ng_primary') return 'Primary Leaving Certificate';
  return null;
}

/**
 * Get the Nigerian grade band label (e.g., "JSS1", "SS2", "Primary 3")
 * @param {string} curriculum - The curriculum ID
 * @param {number} yearLevel - The year level (1-3 for JSS, 1-3 for SS, 1-6 for primary)
 * @returns {string|null} Grade band label or null
 */
export function getNigerianBandLabel(curriculum, yearLevel = null) {
  if (curriculum === 'ng_sss') return `SS${yearLevel}`;
  if (curriculum === 'ng_jss') return `JSS${yearLevel}`;
  if (curriculum === 'ng_primary') return `Primary ${yearLevel}`;
  return null;
}
