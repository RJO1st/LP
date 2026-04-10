/**
 * learningPathEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * LaunchPard — Personalised Learning Path Engine
 *
 * ARCHITECTURAL PRINCIPLES:
 *
 *   1. TOPIC_SEQUENCES is the canonical code-side registry for all subjects,
 *      strands, and topic slugs. No other file should re-declare subject/topic
 *      structure. All engines and scripts import from here.
 *
 *   2. DATABASE-AWARE LOADING: getTopicSequence() checks the database first
 *      (curriculum_topic_progression table) before falling back to the
 *      hard-coded TOPIC_SEQUENCES. This means:
 *        - The platform works today without any DB migration.
 *        - When you add the DB table, sequences update without redeploys.
 *        - Schools can have custom topic orderings stored in the DB.
 *        - Curriculum versioning is handled at the DB layer.
 *      The code-side TOPIC_SEQUENCES remains the seed/fallback — never delete it.
 *
 *   3. SINGLE SOURCE OF TRUTH: To add a new subject, add it to TOPIC_SEQUENCES.
 *      smartQuestionSelection, masteryEngine, diagnostics, exam readiness, and
 *      learning path generation all derive from this automatically.
 *
 * DB SCHEMA (for future migration — not required today):
 *   curriculum_topic_progression
 *     id            uuid primary key
 *     curriculum    text  (e.g. 'uk_11plus', 'ca_primary', null = all)
 *     subject       text  (e.g. 'mathematics')
 *     strand        text  (foundation | intermediate | advanced)
 *     topic_slug    text  (must match question_bank.topic)
 *     position      int   (ordering within strand)
 *     version       text  (e.g. '2024', '2025-revised')
 *     valid_from    date
 *     valid_to      date  (null = current)
 *     created_at    timestamptz
 *
 *   When this table exists, getTopicSequence(subject, curriculum, supabase)
 *   will fetch from it. If the table is absent or empty, falls back to
 *   TOPIC_SEQUENCES below.
 *
 * EXPORTS:
 *   TOPIC_SEQUENCES            — canonical code-side topic map
 *   getTopicSequence()         — DB-aware loader (use this everywhere)
 *   getTopicList()             — flat ordered topic array
 *   getTopicStrand()           — which strand a topic belongs to
 *   getStrandTopics()          — all topics in the same strand
 *   getSubjectMeta()           — UI label, icon, colour
 *   getAllSubjects()            — all registered subject slugs
 *   selectDiagnosticQuestions()
 *   generateLearningPath()
 *   advanceLearningPath()
 *   checkMilestones()
 *   estimateExamReadiness()
 *   computeExamReadinessIndex() — enhanced: uses exam board boundaries + topic weightings
 *   predictGrade()              — maps readiness score → grade string (GCSE 9-1, WAEC A1-F9, etc.)
 *   fetchExamBoardData()        — loads board config from Supabase (with circuit breaker)
 *   fetchStandardsForPath()     — loads curriculum standards for a scholar's path
 *   generateCurriculumAwarePath() — async orchestrator: DB sequences + standards + gap priority
 *   aggregateClassMastery()    — teacher dashboard: class-level topic mastery
 *   getStrugglingStudents()    — teacher dashboard: students below threshold
 *   getGroupRecommendations()  — teacher dashboard: suggested next focus areas
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { scoreDiagnostic, masteryToTier, MASTERY_THRESHOLDS } from './masteryEngine.js';
import { cache } from './cache.js';

// Re-export key functions for convenience
// (computeExamReadinessIndex, predictGrade, fetchExamBoardData are defined below)

// ─── CANONICAL TOPIC SEQUENCES ────────────────────────────────────────────────

export const TOPIC_SEQUENCES = {

  // ── Core academic ─────────────────────────────────────────────────────────

  mathematics: {
    foundation:   ['place_value','number_bonds','addition','subtraction','multiplication','division','fractions','decimals'],
    intermediate: ['percentages','ratio_and_proportion','algebra_basics','linear_equations','area_and_perimeter','angles_and_shapes','data_handling','probability'],
    advanced:     ['pythagoras_theorem','trigonometry','quadratic_equations','simultaneous_equations','circle_theorems','vectors','statistics','calculus'],
  },

  english: {
    foundation:   ['phonics','spelling','grammar','punctuation','vocabulary','sentence_structure'],
    intermediate: ['comprehension','inference','vocabulary_in_context','authors_purpose','text_types','creative_writing'],
    advanced:     ['literary_devices','critical_analysis','persuasive_writing','essay_writing','poetry_analysis','unseen_text'],
  },

  verbal_reasoning: {
    foundation:   ['word_relationships','synonyms_antonyms','odd_one_out','word_completion','letter_sequences'],
    intermediate: ['analogies','coded_sequences','hidden_words','word_connections','double_meanings'],
    advanced:     ['logic_puzzles','compound_words','letter_substitutions','word_patterns','critical_reasoning'],
  },

  non_verbal_reasoning: {
    foundation:   ['pattern_recognition','shape_matching','odd_shape_out','mirror_images','shape_sequences'],
    intermediate: ['matrix_puzzles','cube_nets','rotations_and_reflections','figure_classification','analogous_figures'],
    advanced:     ['spatial_reasoning','complex_matrices','3d_visualisation','code_shapes','series_completion'],
  },

  science: {
    foundation:   ['living_organisms','plants_and_animals','food_chains','materials','states_of_matter','forces_basics'],
    intermediate: ['cells_and_tissues','human_body','electricity','light_and_sound','chemical_reactions','earth_and_space'],
    advanced:     ['genetics','evolution','atomic_structure','waves','forces_and_motion','thermodynamics','ecology'],
  },

  biology: {
    foundation:   ['cell_structure','plants','living_organisms','food_chains'],
    intermediate: ['human_body_systems','microorganisms','ecosystems','reproduction'],
    advanced:     ['genetics','evolution','homeostasis','dna_and_genetics'],
  },

  chemistry: {
    foundation:   ['states_of_matter','mixtures','elements_and_compounds'],
    intermediate: ['chemical_reactions','atomic_structure','periodic_table','acids_and_bases'],
    advanced:     ['mole_concept','organic_chemistry','rates_of_reaction','equilibrium'],
  },

  physics: {
    foundation:   ['forces','energy','light','sound'],
    intermediate: ['electricity','waves','motion','electromagnetism'],
    advanced:     ['nuclear_physics','quantum_physics','mechanics','thermodynamics'],
  },

  combined_science: {
    foundation:   ['cell_structure','states_of_matter','forces','living_organisms','mixtures','energy'],
    intermediate: ['human_body_systems','chemical_reactions','electricity','ecosystems','atomic_structure','waves'],
    advanced:     ['genetics','organic_chemistry','nuclear_physics','homeostasis','rates_of_reaction','mechanics'],
  },

  history: {
    foundation:   ['ancient_civilisations','local_history'],
    intermediate: ['empire_and_colonialism','world_war_1','world_war_2'],
    advanced:     ['cold_war','civil_rights','modern_history','causation_and_consequence'],
  },

  geography: {
    foundation:   ['maps_and_directions','weather_and_climate','local_area'],
    intermediate: ['physical_geography','human_geography','ecosystems'],
    advanced:     ['globalisation','development','environmental_issues','urbanisation'],
  },

  // ── Canadian ──────────────────────────────────────────────────────────────

  canadian_history: {
    foundation:   ['indigenous_peoples_and_cultures','european_exploration_and_contact','new_france_and_british_conquest','confederation_and_nationhood'],
    intermediate: ['westward_expansion','world_war_1_canada','world_war_2_canada','charter_of_rights_and_freedoms'],
    advanced:     ['multiculturalism_and_immigration','canadian_government_and_democracy','reconciliation_and_residential_schools','modern_canada_and_global_role'],
  },

  french_language: {
    foundation:   ['alphabet_and_phonics','basic_vocabulary','greetings_and_introductions','numbers_and_colours'],
    intermediate: ['nouns_and_articles','verbs_and_conjugation','sentence_structure','reading_comprehension_fr'],
    advanced:     ['writing_skills_fr','conversational_french','grammar_and_tenses','cultural_context'],
  },

  physical_education: {
    foundation:   ['movement_skills','safety_and_fair_play','fitness_and_health','healthy_lifestyle'],
    intermediate: ['team_sports','individual_sports','nutrition_basics','mental_wellbeing'],
    advanced:     ['outdoor_education','swimming_and_water_safety'],
  },

  social_studies: {
    foundation:   ['community_and_family','local_government','canadian_symbols','rights_and_responsibilities'],
    intermediate: ['provincial_government','canadian_regions','cultural_diversity','economic_systems'],
    advanced:     ['federal_government','canada_and_the_world','current_events','civic_participation'],
  },

  // ── Nigerian ──────────────────────────────────────────────────────────────

  civic_education: {
    foundation:   ['citizenship','human_rights','democracy_and_governance','rule_of_law'],
    intermediate: ['national_values','conflict_resolution','civic_responsibilities','community_development'],
    advanced:     ['electoral_process','constitutionalism','federalism','international_relations'],
  },

  agricultural_science: {
    foundation:   ['soil_science','crop_production','animal_husbandry','farm_tools_and_equipment'],
    intermediate: ['pest_and_disease_control','irrigation_and_water_management','agricultural_economics','food_processing'],
    advanced:     ['agribusiness','biotechnology_in_agriculture','sustainable_farming','agricultural_policy'],
  },

  home_economics: {
    foundation:   ['food_and_nutrition','clothing_and_textiles','family_living','consumer_education'],
    intermediate: ['home_management','childcare','food_preparation','health_and_hygiene'],
    advanced:     ['entrepreneurship_in_home_economics','interior_design','fashion_and_design','community_nutrition'],
  },

  computer_science: {
    foundation:   ['computer_basics','input_output_devices','operating_systems','word_processing'],
    intermediate: ['spreadsheets','internet_and_email','programming_basics','algorithms'],
    advanced:     ['data_structures','networks','cybersecurity','databases'],
  },

  business_studies: {
    foundation:   ['introduction_to_business','types_of_business','entrepreneurship','business_communication'],
    intermediate: ['marketing_basics','accounting_fundamentals','business_law','human_resources'],
    advanced:     ['financial_management','business_strategy','international_trade','business_ethics'],
  },

  economics: {
    foundation:   ['scarcity_and_choice','supply_and_demand','markets','money_and_banking'],
    intermediate: ['macroeconomics','microeconomics','trade_and_exchange','government_and_economy'],
    advanced:     ['fiscal_policy','monetary_policy','global_economics','development_economics'],
  },

  // ── IB ────────────────────────────────────────────────────────────────────

  individuals_and_societies: {
    foundation:   ['identity_and_culture','time_place_and_space','personal_and_cultural_expression'],
    intermediate: ['scientific_and_technical_innovation','globalization_and_sustainability'],
    advanced:     ['fairness_and_development','sharing_the_planet','orientation_in_space_and_time'],
  },

  // ── Australian ────────────────────────────────────────────────────────────

  hass: {
    foundation:   ['history_and_heritage','geography_and_place','civics_and_citizenship'],
    intermediate: ['economics_and_business','australian_history','asia_and_australia'],
    advanced:     ['global_connections','sustainability','historical_inquiry'],
  },

  // ── Fallback ──────────────────────────────────────────────────────────────

  default: {
    foundation:   ['introduction','core_concepts','basic_skills'],
    intermediate: ['application','problem_solving'],
    advanced:     ['analysis','evaluation'],
  },
};

// ─── SUBJECT METADATA ─────────────────────────────────────────────────────────

const SUBJECT_META = {
  mathematics:               { label: 'Mathematics',             icon: 'calculator',     colour: 'bg-blue-500'    },
  english:                   { label: 'English',                 icon: 'book-open',      colour: 'bg-purple-500'  },
  verbal_reasoning:          { label: 'Verbal Reasoning',        icon: 'message-square', colour: 'bg-violet-500'  },
  non_verbal_reasoning:      { label: 'Non-Verbal Reasoning',    icon: 'shapes',         colour: 'bg-indigo-500'  },
  science:                   { label: 'Science',                 icon: 'flask-conical',  colour: 'bg-green-500'   },
  biology:                   { label: 'Biology',                 icon: 'leaf',           colour: 'bg-emerald-500' },
  chemistry:                 { label: 'Chemistry',               icon: 'atom',           colour: 'bg-teal-500'    },
  physics:                   { label: 'Physics',                 icon: 'zap',            colour: 'bg-cyan-500'    },
  combined_science:          { label: 'Combined Science',        icon: 'flask-conical',  colour: 'bg-green-600'   },
  history:                   { label: 'History',                 icon: 'landmark',       colour: 'bg-amber-600'   },
  geography:                 { label: 'Geography',               icon: 'globe',          colour: 'bg-lime-600'    },
  canadian_history:          { label: 'Canadian History',        icon: 'landmark',       colour: 'bg-red-600'     },
  french_language:           { label: 'French Language',         icon: 'languages',      colour: 'bg-blue-600'    },
  physical_education:        { label: 'Physical Education',      icon: 'activity',       colour: 'bg-orange-500'  },
  social_studies:            { label: 'Social Studies',          icon: 'users',          colour: 'bg-sky-500'     },
  civic_education:           { label: 'Civic Education',         icon: 'vote',           colour: 'bg-green-600'   },
  agricultural_science:      { label: 'Agricultural Science',    icon: 'sprout',         colour: 'bg-lime-700'    },
  home_economics:            { label: 'Home Economics',          icon: 'home',           colour: 'bg-pink-500'    },
  computer_science:          { label: 'Computer Science',        icon: 'monitor',        colour: 'bg-slate-500'   },
  computing:                 { label: 'Computing',               icon: 'monitor',        colour: 'bg-slate-600'   },
  citizenship:               { label: 'Citizenship',             icon: 'vote',           colour: 'bg-green-700'   },
  citizenship_and_heritage:  { label: 'Citizenship & Heritage',  icon: 'vote',           colour: 'bg-green-700'   },
  design_technology:         { label: 'Design & Technology',     icon: 'wrench',         colour: 'bg-orange-700'  },
  english_language:          { label: 'English Language',        icon: 'book-open',      colour: 'bg-purple-500'  },
  english_literature:        { label: 'English Literature',      icon: 'book-open',      colour: 'bg-purple-600'  },
  business_studies:          { label: 'Business Studies',        icon: 'briefcase',      colour: 'bg-yellow-600'  },
  economics:                 { label: 'Economics',               icon: 'trending-up',    colour: 'bg-emerald-600' },
  individuals_and_societies: { label: 'Individuals & Societies', icon: 'users-2',        colour: 'bg-purple-600'  },
  hass:                      { label: 'HASS',                    icon: 'compass',        colour: 'bg-orange-600'  },
};

// ─── IN-MEMORY SEQUENCE CACHE ─────────────────────────────────────────────────

const _sequenceCache = new Map();
const CACHE_TTL_MS   = 5 * 60 * 1000;

function _cacheGet(key) {
  const entry = _sequenceCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { _sequenceCache.delete(key); return null; }
  return entry.value;
}
function _cacheSet(key, value) {
  _sequenceCache.set(key, { value, ts: Date.now() });
}

// ─── CIRCUIT BREAKER ──────────────────────────────────────────────────────────
// On the first 404 / "relation does not exist" response, this flag flips to
// false and all subsequent getTopicSequence() calls skip the DB entirely.
// Zero network requests, zero console 404 noise, for the rest of the module's
// lifetime. Resets automatically on server restart or hot-module reload.
// When you actually create the curriculum_topic_progression table, restart
// the dev server — the flag resets to true and DB-driven loading resumes.
let _dbTableExists = true;

// ─── DB-AWARE TOPIC SEQUENCE LOADER ──────────────────────────────────────────

export async function getTopicSequence(subject, curriculum = null, supabase = null) {
  const cacheKey = `${curriculum ?? 'default'}::${subject}`;
  const cached   = _cacheGet(cacheKey);
  if (cached) return cached;

  // ── DB lookup — skipped entirely once table confirmed missing ─────────────
  if (supabase && _dbTableExists) {
    try {
      let query = supabase
        .from('curriculum_topic_progression')
        .select('strand, topic_slug, position')
        .eq('subject', subject)
        .is('valid_to', null)
        .order('position', { ascending: true });

      if (curriculum) {
        query = query.or(`curriculum.eq.${curriculum},curriculum.is.null`);
      } else {
        query = query.is('curriculum', null);
      }

      const { data, error, status } = await query;

      // Table doesn't exist → flip circuit breaker, never query again this session
      if (
        status === 404 ||
        error?.code === 'PGRST116' ||
        error?.message?.includes('does not exist') ||
        error?.message?.includes('relation')
      ) {
        _dbTableExists = false;
        // Fall through to hardcoded sequences
      } else if (!error && data?.length > 0) {
        // Prefer curriculum-specific rows; fill gaps with global (curriculum = null) rows
        const rows = curriculum
          ? [
              ...data.filter(r => r.curriculum === curriculum),
              ...data.filter(r =>
                r.curriculum === null &&
                !data.find(r2 =>
                  r2.curriculum === curriculum &&
                  r2.strand === r.strand &&
                  r2.topic_slug === r.topic_slug
                )
              ),
            ]
          : data;

        const seq = {
          foundation:   rows.filter(r => r.strand === 'foundation').map(r => r.topic_slug),
          intermediate: rows.filter(r => r.strand === 'intermediate').map(r => r.topic_slug),
          advanced:     rows.filter(r => r.strand === 'advanced').map(r => r.topic_slug),
        };

        if (seq.foundation.length || seq.intermediate.length || seq.advanced.length) {
          _cacheSet(cacheKey, seq);
          return seq;
        }
      }
      // else: DB returned 0 rows or non-fatal error — fall through to hardcoded
    } catch {
      // Network error — don't flip circuit breaker (may be transient)
    }
  }

  // ── Code-side fallback ────────────────────────────────────────────────────
  const seq = TOPIC_SEQUENCES[subject] ?? TOPIC_SEQUENCES.default;
  _cacheSet(cacheKey, seq);
  return seq;
}

/**
 * Synchronous version — uses code-side fallback only.
 * Use when you don't have a supabase client or in non-async contexts.
 */
export function getTopicSequenceSync(subject) {
  return TOPIC_SEQUENCES[subject] ?? TOPIC_SEQUENCES.default;
}

// ─── TOPIC HELPERS ────────────────────────────────────────────────────────────

export function getTopicList(sequence) {
  if (typeof sequence === 'string') {
    const seq = getTopicSequenceSync(sequence);
    return [...(seq.foundation ?? []), ...(seq.intermediate ?? []), ...(seq.advanced ?? [])];
  }
  return [...(sequence?.foundation ?? []), ...(sequence?.intermediate ?? []), ...(sequence?.advanced ?? [])];
}

export function getTopicStrand(sequence, topic) {
  if (typeof sequence === 'string') sequence = getTopicSequenceSync(sequence);
  if (sequence?.foundation?.includes(topic))   return 'foundation';
  if (sequence?.intermediate?.includes(topic)) return 'intermediate';
  if (sequence?.advanced?.includes(topic))     return 'advanced';
  return null;
}

export function getStrandTopics(sequence, topic) {
  const strand = getTopicStrand(sequence, topic);
  if (!strand) return [];
  return sequence[strand] ?? [];
}

export function getSubjectMeta(subject) {
  return SUBJECT_META[subject] ?? {
    label:  subject.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    icon:   'book',
    colour: 'bg-gray-500',
  };
}

export function getAllSubjects() {
  return Object.keys(TOPIC_SEQUENCES).filter(s => s !== 'default');
}

// ─── MILESTONES ───────────────────────────────────────────────────────────────

const MILESTONES = {
  first_correct:   { label: 'First correct answer!',        emoji: '🎯', storyPoints: 5   },
  topic_started:   { label: 'Started a new topic',          emoji: '🚀', storyPoints: 10  },
  topic_halfway:   { label: '50% mastery reached',          emoji: '📈', storyPoints: 20  },
  topic_mastered:  { label: 'Topic mastered!',              emoji: '⭐', storyPoints: 50  },
  subject_halfway: { label: 'Halfway through subject path', emoji: '🌟', storyPoints: 75  },
  path_complete:   { label: 'Learning path complete!',      emoji: '🏆', storyPoints: 200 },
};

// ─── DIAGNOSTIC QUESTION SAMPLER ──────────────────────────────────────────────

export function selectDiagnosticQuestions(questionBank, subject, curriculum, yearLevel, sequence = null) {
  const seq       = sequence ?? getTopicSequenceSync(subject);
  const allTopics = getTopicList(seq);
  const selected  = [];
  const shuffled  = [...questionBank].sort(() => Math.random() - 0.5);

  for (const topic of allTopics) {
    const developing = shuffled.find(q =>
      q.topic === topic && q.difficulty_tier === 'developing' && !selected.find(s => s.id === q.id)
    );
    const expected = shuffled.find(q =>
      q.topic === topic && q.difficulty_tier === 'expected' && !selected.find(s => s.id === q.id)
    );
    if (developing) selected.push({ ...developing, _diagnostic_topic: topic });
    if (expected)   selected.push({ ...expected,   _diagnostic_topic: topic });
    if (selected.length >= 20) break;
  }

  return selected;
}

// ─── GENERATE LEARNING PATH ───────────────────────────────────────────────────

export function generateLearningPath(
  curriculum, subject, yearLevel,
  diagnosticScores = {}, masteryRecords = [],
  sequence = null,
) {
  const seq = sequence ?? getTopicSequenceSync(subject);

  const masteryMap = {};
  for (const r of masteryRecords) masteryMap[r.topic] = r.mastery_score;

  const scores = { ...diagnosticScores };
  for (const [topic, score] of Object.entries(masteryMap)) {
    scores[topic] = Math.max(scores[topic] ?? 0, score);
  }

  const categorise = (topic) => {
    const s = scores[topic] ?? 0;
    if (s >= MASTERY_THRESHOLDS.mastered)   return 'mastered';
    if (s >= MASTERY_THRESHOLDS.developing) return 'developing';
    return 'struggling';
  };

  const ordered = [];
  const strands = [
    { strand: 'foundation',   topics: seq.foundation   ?? [] },
    { strand: 'intermediate', topics: seq.intermediate ?? [] },
    { strand: 'advanced',     topics: seq.advanced     ?? [] },
  ];

  for (const { strand, topics } of strands) {
    for (const pass of ['struggling', 'developing']) {
      for (const topic of topics) {
        if (categorise(topic) === pass) {
          ordered.push(_buildPathItem(topic, subject, curriculum, yearLevel, scores[topic] ?? 0, strand));
        }
      }
    }
  }

  if (ordered.length === 0) {
    const enrichment = seq.advanced ?? seq.intermediate ?? [];
    for (const topic of enrichment) {
      ordered.push(_buildPathItem(topic, subject, curriculum, yearLevel, scores[topic] ?? 0.8, 'enrichment'));
    }
  }

  return ordered;
}

function _buildPathItem(topic, subject, curriculum, yearLevel, currentScore, band) {
  const sessionsNeeded = currentScore >= 0.55 ? 2 : currentScore >= 0.30 ? 4 : 6;
  return {
    topic,
    display_name:       topic.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    subject,
    curriculum,
    year_level:         yearLevel,
    current_mastery:    currentScore,
    target_mastery:     0.80,
    estimated_sessions: sessionsNeeded,
    difficulty_band:    band,
    tier:               masteryToTier(currentScore),
    status:             currentScore >= 0.80 ? 'mastered' : currentScore > 0 ? 'in_progress' : 'not_started',
  };
}

// ─── CURRICULUM-AWARE PATH GENERATION ────────────────────────────────────────

/**
 * Fetch curriculum standards relevant to a scholar's learning path.
 *
 * OPTIMIZATIONS:
 *   - Parallel queries: standards + coverage stats run concurrently (Promise.all)
 *   - In-memory cache: keyed on curriculum:subject:yearLevel with 5min TTL
 *   - Graceful degradation: if either query fails, returns partial result
 *
 * Returns an object with:
 *   - standards: array of { code, statement, strand_name, year_level }
 *   - coverageGaps: { critical: [...], high: [...] } — standards with few/no questions
 *   - standardsByTopic: Map<topic_slug, standard[]> — standards mapped to topics
 *
 * @param {string} curriculum   - e.g. 'uk_national'
 * @param {string} subject      - e.g. 'mathematics'
 * @param {number} yearLevel    - e.g. 7
 * @param {object} supabase     - Supabase client
 * @returns {object|null}
 */
export async function fetchStandardsForPath(curriculum, subject, yearLevel, supabase) {
  if (!supabase || !curriculum || !subject) return null;

  // Check in-memory cache first (5 min TTL)
  const cacheKey = `curriculum_standards:${curriculum}:${subject}:${yearLevel}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const yearMin = Math.max(1, yearLevel - 1);
    const yearMax = yearLevel + 1;

    // Run standards + coverage queries in parallel
    const [standardsResult, coverageResult] = await Promise.allSettled([
      supabase
        .from('curriculum_standards')
        .select(`
          standard_code,
          statement,
          year_level,
          bloom_level,
          difficulty_band,
          strand:strand_id ( strand_name, strand_code )
        `)
        .eq('curriculum_id', curriculum)
        .eq('subject', subject)
        .gte('year_level', yearMin)
        .lte('year_level', yearMax)
        .order('year_level', { ascending: true }),
      supabase
        .from('curriculum_coverage_stats')
        .select('standard_code, question_count')
        .eq('curriculum_id', curriculum)
        .eq('subject', subject),
    ]);

    // Extract results with graceful degradation
    const standards = standardsResult.status === 'fulfilled' ? (standardsResult.value?.data ?? []) : [];
    const coverage = coverageResult.status === 'fulfilled' ? (coverageResult.value?.data ?? []) : [];

    // Bail if no standards could be fetched
    if (!standards?.length) return null;

    // Build coverage map (safe even if coverage array is empty)
    const coverageMap = {};
    for (const c of coverage) {
      coverageMap[c.standard_code] = c.question_count ?? 0;
    }

    // Categorise gaps
    const critical = [];
    const high = [];
    for (const s of standards) {
      const qCount = coverageMap[s.standard_code] ?? 0;
      const entry = {
        code: s.standard_code,
        statement: s.statement,
        strand: s.strand?.strand_name ?? null,
        strand_code: s.strand?.strand_code ?? null,
        year_level: s.year_level,
        bloom_level: s.bloom_level,
        questions: qCount,
      };
      if (qCount === 0) critical.push(entry);
      else if (qCount < 5) high.push(entry);
    }

    // Map standards to topic slugs
    const standardsByTopic = _mapStandardsToTopics(standards);

    const result = {
      standards: standards.map(s => ({
        code: s.standard_code,
        statement: s.statement,
        strand_name: s.strand?.strand_name ?? null,
        strand_code: s.strand?.strand_code ?? null,
        year_level: s.year_level,
        bloom_level: s.bloom_level,
        difficulty_band: s.difficulty_band,
      })),
      coverageGaps: { critical, high },
      standardsByTopic,
      totalStandards: standards.length,
      coveredStandards: standards.length - critical.length,
    };

    // Cache for 5 minutes
    cache.set(cacheKey, result, 300);
    return result;
  } catch {
    return null;
  }
}

/**
 * Map curriculum standards to topic slugs using keyword matching.
 * This bridges the gap between fine-grained standards and coarse topic_slugs.
 */
function _mapStandardsToTopics(standards) {
  const TOPIC_KEYWORDS = {
    // Mathematics
    place_value: ['place value', 'numeral', 'count', 'number system'],
    number_bonds: ['number bond', 'pairs', 'complement'],
    addition: ['add', 'sum', 'plus', 'addition'],
    subtraction: ['subtract', 'minus', 'difference', 'subtraction'],
    multiplication: ['multipl', 'times', 'product', 'times table'],
    division: ['divid', 'quotient', 'division', 'remainder'],
    fractions: ['fraction', 'numerator', 'denominator', 'half', 'quarter', 'third'],
    decimals: ['decimal', 'tenth', 'hundredth'],
    percentages: ['percent', '%'],
    ratio_and_proportion: ['ratio', 'proportion', 'scale'],
    algebra_basics: ['algebra', 'variable', 'expression', 'simplif'],
    linear_equations: ['linear equation', 'solve.*equation', 'simultaneous.*linear'],
    area_and_perimeter: ['area', 'perimeter', 'surface area'],
    angles_and_shapes: ['angle', 'triangle', 'polygon', 'shape', 'quadrilateral', 'parallel'],
    data_handling: ['data', 'chart', 'graph', 'tally', 'pictograph', 'bar chart', 'pie chart', 'histogram'],
    probability: ['probability', 'chance', 'likely', 'certain', 'impossible', 'event'],
    pythagoras_theorem: ['pythagoras', 'hypotenuse'],
    trigonometry: ['trigonometr', 'sine', 'cosine', 'tangent', 'sin', 'cos', 'tan', 'soh.*cah'],
    quadratic_equations: ['quadratic', 'factoris', 'completing the square'],
    simultaneous_equations: ['simultaneous', 'two variables'],
    circle_theorems: ['circle theorem', 'tangent.*circle', 'cyclic', 'arc', 'sector', 'circumference'],
    vectors: ['vector', 'magnitude', 'direction', 'scalar product'],
    statistics: ['standard deviation', 'cumulative frequency', 'quartile', 'interquartile'],
    calculus: ['differenti', 'integrat', 'gradient.*curve', 'rate of change', 'area under'],
    // English
    phonics: ['phonics', 'phonic', 'letter sound', 'decode'],
    spelling: ['spell', 'spelling'],
    grammar: ['grammar', 'tense', 'noun', 'verb', 'adjective', 'adverb', 'concord', 'clause'],
    punctuation: ['punctuat', 'comma', 'full stop', 'apostrophe', 'semicolon'],
    vocabulary: ['vocabular', 'word meaning', 'synonym', 'antonym'],
    sentence_structure: ['sentence', 'clause', 'phrase', 'complex sentence'],
    comprehension: ['comprehension', 'passage', 'summary', 'inference', 'cloze'],
    creative_writing: ['creative writing', 'narrative', 'descriptive', 'story writing'],
    essay_writing: ['essay', 'argumentative', 'expository', 'persuasive writing'],
    literary_devices: ['literary device', 'metaphor', 'simile', 'alliteration', 'personification'],
    poetry_analysis: ['poetry', 'poem', 'verse', 'stanza', 'rhyme'],
    // Science
    living_organisms: ['living', 'organism', 'classify', 'classification'],
    plants_and_animals: ['plant', 'animal', 'habitat', 'life cycle'],
    food_chains: ['food chain', 'food web', 'predator', 'prey', 'producer', 'consumer'],
    materials: ['material', 'property', 'hard', 'soft', 'transparent'],
    states_of_matter: ['states of matter', 'solid', 'liquid', 'gas', 'particle', 'melting', 'boiling'],
    forces_basics: ['force', 'push', 'pull', 'friction', 'gravity', 'magnet'],
    cells_and_tissues: ['cell', 'tissue', 'organelle', 'nucleus', 'membrane', 'mitosis'],
    human_body: ['human body', 'organ', 'skeleton', 'digestion', 'circulation', 'respiration'],
    electricity: ['electric', 'circuit', 'current', 'voltage', 'resistance', 'ohm'],
    light_and_sound: ['light', 'shadow', 'reflect', 'refract', 'sound', 'vibrat', 'wave'],
    chemical_reactions: ['chemical reaction', 'reactant', 'product', 'equation', 'exothermic', 'endothermic'],
    earth_and_space: ['earth', 'space', 'planet', 'solar system', 'rock', 'weathering'],
    genetics: ['genetic', 'gene', 'dna', 'heredit', 'inherit', 'allele', 'dominant', 'recessive'],
    evolution: ['evolution', 'natural selection', 'adaptation', 'species', 'fossil'],
    atomic_structure: ['atom', 'proton', 'neutron', 'electron', 'element', 'periodic table', 'isotope'],
    ecology: ['ecology', 'ecosystem', 'biodiversity', 'conservation', 'population', 'sustainability'],
    waves: ['wave', 'frequency', 'amplitude', 'wavelength', 'electromagnetic'],
    forces_and_motion: ['motion', 'velocity', 'acceleration', 'momentum', 'newton'],
    thermodynamics: ['thermodynamic', 'heat transfer', 'conduction', 'convection', 'radiation', 'entropy'],
    // History
    ancient_civilisations: ['ancient', 'civilisation', 'civilization', 'egypt', 'rome', 'greece', 'mesopotamia'],
    empire_and_colonialism: ['empire', 'colonial', 'imperialism', 'slave trade', 'colonisation'],
    world_war_1: ['world war 1', 'world war i', 'wwi', 'first world war', 'trench'],
    world_war_2: ['world war 2', 'world war ii', 'wwii', 'second world war', 'holocaust'],
    cold_war: ['cold war', 'soviet', 'berlin wall', 'cuban missile'],
    civil_rights: ['civil rights', 'segregation', 'apartheid', 'equality', 'suffrage'],
    // Geography
    weather_and_climate: ['weather', 'climate', 'temperature', 'rainfall', 'season'],
    physical_geography: ['physical geography', 'volcano', 'earthquake', 'tectonic', 'erosion', 'river', 'mountain'],
    human_geography: ['human geography', 'settlement', 'migration', 'urban', 'rural'],
    environmental_issues: ['environment', 'pollution', 'climate change', 'deforestation', 'renewable'],
    globalisation: ['globali', 'trade', 'international', 'import', 'export'],
    // Civic Education / Social Studies
    citizenship: ['citizen', 'nationality', 'civic duty', 'belong'],
    human_rights: ['human rights', 'fundamental rights', 'freedom', 'dignity', 'discrimination'],
    democracy_and_governance: ['democracy', 'govern', 'constitution', 'parliament', 'legislature', 'executive'],
    rule_of_law: ['rule of law', 'justice', 'court', 'legal', 'law enforcement'],
    national_values: ['national value', 'integrity', 'patriotism', 'unity', 'national anthem'],
    conflict_resolution: ['conflict', 'peace', 'mediation', 'reconciliation', 'dispute'],
    electoral_process: ['election', 'vote', 'ballot', 'campaign', 'political party', 'candidate'],
    community_development: ['community', 'development', 'social welfare', 'infrastructure'],
    // Computing
    programming_basics: ['program', 'coding', 'algorithm', 'debug', 'loop', 'variable', 'function'],
    cybersecurity: ['cybersecurity', 'online safety', 'password', 'phishing', 'data protection'],
  };

  const result = new Map();

  for (const std of standards) {
    const text = (std.statement ?? '').toLowerCase();
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      const match = keywords.some(kw => {
        if (kw.includes('.*')) return new RegExp(kw, 'i').test(text);
        return text.includes(kw);
      });
      if (match) {
        if (!result.has(topic)) result.set(topic, []);
        result.get(topic).push({
          code: std.standard_code,
          statement: std.statement,
          strand: std.strand?.strand_name ?? null,
          year_level: std.year_level,
        });
      }
    }
  }

  return result;
}

/**
 * Generate a curriculum-aware personalised learning path.
 *
 * This is the top-level async function that:
 *   1. Loads DB-driven topic sequences (via getTopicSequence)
 *   2. Fetches curriculum standards for the scholar's year level
 *   3. Generates the learning path with standard-based prioritisation
 *   4. Annotates each path item with relevant curriculum standards
 *   5. Saves to scholar_learning_path table
 *
 * @param {object} params
 * @param {string} params.curriculum
 * @param {string} params.subject
 * @param {number} params.yearLevel
 * @param {object} params.diagnosticScores  - { topic: score } from diagnostic
 * @param {array}  params.masteryRecords    - from mastery_records table
 * @param {object} params.supabase          - Supabase client
 * @param {string} params.scholarId         - for saving the path
 * @returns {object} { path: [...], curriculumInfo: {...}, saved: boolean }
 */
export async function generateCurriculumAwarePath({
  curriculum, subject, yearLevel,
  diagnosticScores = {}, masteryRecords = [],
  supabase = null, scholarId = null,
}) {
  // 1. Load DB-driven topic sequence (falls back to code-side TOPIC_SEQUENCES)
  const sequence = await getTopicSequence(subject, curriculum, supabase);

  // 2. Fetch curriculum standards
  const curriculumInfo = await fetchStandardsForPath(curriculum, subject, yearLevel, supabase);

  // 3. Generate base learning path using existing logic
  const basePath = generateLearningPath(
    curriculum, subject, yearLevel,
    diagnosticScores, masteryRecords, sequence,
  );

  // 4. Enrich with curriculum standards
  const enrichedPath = _enrichPathWithStandards(basePath, curriculumInfo);

  // 5. Re-prioritise based on coverage gaps
  const prioritisedPath = _prioritiseByGaps(enrichedPath, curriculumInfo);

  // 6. Save to DB if scholar ID provided
  let saved = false;
  if (supabase && scholarId && prioritisedPath.length > 0) {
    try {
      const pathRecord = {
        scholar_id: scholarId,
        curriculum,
        subject,
        topic_order: prioritisedPath,
        current_topic: prioritisedPath[0]?.topic ?? null,
        current_index: 0,
        completion_pct: 0,
        next_milestone: prioritisedPath[0]
          ? `Start ${prioritisedPath[0].display_name}`
          : 'All topics mastered!',
        diagnostic_done: Object.keys(diagnosticScores).length > 0,
        diagnostic_scores: diagnosticScores,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('scholar_learning_path')
        .upsert(pathRecord, { onConflict: 'scholar_id,curriculum,subject' });

      saved = !error;
    } catch {
      // Non-fatal — path is still returned
    }
  }

  return {
    path: prioritisedPath,
    curriculumInfo: curriculumInfo ? {
      totalStandards: curriculumInfo.totalStandards,
      coveredStandards: curriculumInfo.coveredStandards,
      criticalGaps: curriculumInfo.coverageGaps?.critical?.length ?? 0,
      highGaps: curriculumInfo.coverageGaps?.high?.length ?? 0,
    } : null,
    saved,
  };
}

/**
 * Annotate path items with curriculum standards they cover.
 */
function _enrichPathWithStandards(path, curriculumInfo) {
  if (!curriculumInfo?.standardsByTopic) return path;

  return path.map(item => {
    const standards = curriculumInfo.standardsByTopic.get(item.topic) ?? [];
    return {
      ...item,
      curriculum_standards: standards.map(s => ({
        code: s.code,
        statement: s.statement,
        strand: s.strand,
      })),
      standards_count: standards.length,
    };
  });
}

/**
 * Re-prioritise path items so topics covering gap standards come first
 * within their mastery tier (struggling topics still come before developing).
 */
function _prioritiseByGaps(path, curriculumInfo) {
  if (!curriculumInfo?.coverageGaps) return path;

  const criticalCodes = new Set(
    (curriculumInfo.coverageGaps.critical ?? []).map(g => g.code)
  );
  const highCodes = new Set(
    (curriculumInfo.coverageGaps.high ?? []).map(g => g.code)
  );

  return path.map(item => {
    // Calculate gap priority score: higher = more urgent gaps
    const itemStandards = item.curriculum_standards ?? [];
    let gapScore = 0;
    for (const std of itemStandards) {
      if (criticalCodes.has(std.code)) gapScore += 3;
      else if (highCodes.has(std.code)) gapScore += 1;
    }
    return { ...item, _gap_priority: gapScore };
  }).sort((a, b) => {
    // Primary: mastery status (struggling before developing before mastered)
    const statusOrder = { not_started: 0, in_progress: 1, mastered: 2 };
    const statusDiff = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
    if (statusDiff !== 0) return statusDiff;

    // Secondary: gap priority (higher gaps first)
    if (b._gap_priority !== a._gap_priority) return b._gap_priority - a._gap_priority;

    // Tertiary: strand order (foundation → intermediate → advanced)
    const bandOrder = { foundation: 0, intermediate: 1, advanced: 2, enrichment: 3 };
    return (bandOrder[a.difficulty_band] ?? 1) - (bandOrder[b.difficulty_band] ?? 1);
  }).map(({ _gap_priority, ...item }) => item); // Strip internal field
}

// ─── ADVANCE PATH ─────────────────────────────────────────────────────────────

export function advanceLearningPath(savedPath, masteryRecords) {
  const masteryMap = {};
  for (const r of masteryRecords) masteryMap[r.topic] = r.mastery_score;

  const updated = (savedPath.topic_order ?? []).map(item => ({
    ...item,
    current_mastery: masteryMap[item.topic] ?? item.current_mastery,
    status: (masteryMap[item.topic] ?? 0) >= 0.80 ? 'mastered'
          : (masteryMap[item.topic] ?? 0) > 0      ? 'in_progress'
          :                                           'not_started',
  }));

  const currentItem   = updated.find(i => i.status !== 'mastered');
  const currentTopic  = currentItem?.topic ?? updated.at(-1)?.topic ?? null;
  const currentIdx    = updated.findIndex(i => i.topic === currentTopic);
  const mastered      = updated.filter(i => i.status === 'mastered').length;
  const completionPct = updated.length > 0 ? Math.round((mastered / updated.length) * 100) : 0;

  const nextMilestone = currentItem
    ? ((masteryMap[currentItem.topic] ?? 0) < 0.55
        ? `Build foundations in ${currentItem.display_name}`
        : `Master ${currentItem.display_name}`)
    : 'All topics mastered! Explore advanced challenges.';

  return {
    topic_order:    updated,
    current_topic:  currentTopic,
    current_index:  currentIdx,
    completion_pct: completionPct,
    next_milestone: nextMilestone,
    updated_at:     new Date().toISOString(),
  };
}

// ─── MILESTONE CHECK ──────────────────────────────────────────────────────────

export function checkMilestones(prevMastery, newMastery) {
  const achieved = [];
  const prev = prevMastery?.mastery_score ?? 0;
  const next = newMastery?.mastery_score  ?? 0;

  if (prev === 0 && next > 0)                                                     achieved.push(MILESTONES.first_correct);
  if (prev < 0.5  && next >= 0.5)                                                 achieved.push(MILESTONES.topic_halfway);
  if (prev < MASTERY_THRESHOLDS.mastered && next >= MASTERY_THRESHOLDS.mastered)  achieved.push(MILESTONES.topic_mastered);

  return achieved;
}

// ─── EXAM READINESS ───────────────────────────────────────────────────────────

export function estimateExamReadiness(masteryRecords, subject, sequence = null) {
  if (!masteryRecords?.length) return { score: 0, label: 'Not started', topicsNeeded: [], colour: '#ef4444' };

  const seq = sequence ?? getTopicSequenceSync(subject);
  const masteryMap = {};
  for (const r of masteryRecords) masteryMap[r.topic] = r.mastery_score;

  const weights = { foundation: 1.5, intermediate: 1.0, advanced: 0.8 };
  let totalWeight = 0, weightedScore = 0;

  for (const [strand, w] of Object.entries(weights)) {
    for (const topic of seq[strand] ?? []) {
      totalWeight   += w;
      weightedScore += (masteryMap[topic] ?? 0) * w;
    }
  }

  const score        = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;
  const topicsNeeded = getTopicList(seq).filter(t => (masteryMap[t] ?? 0) < 0.55).map(t => t.replace(/_/g, ' '));
  const label        = score >= 80 ? 'Exam Ready' : score >= 60 ? 'On Track' : score >= 40 ? 'Developing' : 'Needs Focus';
  const colour       = score >= 80 ? '#22c55e'    : score >= 60 ? '#f59e0b'   : '#ef4444';

  return { score, label, topicsNeeded, colour };
}

// ─── EXAM BOARD DATA LOADER ──────────────────────────────────────────────────

let _examBoardTableExists = true;
const _examBoardCache = new Map();
const EXAM_BOARD_CACHE_TTL = 10 * 60 * 1000; // 10 min

/**
 * Fetch exam board configuration from Supabase.
 * Returns { board, subjects, topicWeightings } or null if unavailable.
 *
 * @param {string} boardId    - UUID of the exam board
 * @param {string} subject    - subject slug (e.g. 'mathematics')
 * @param {object} supabase   - Supabase client
 * @returns {object|null}
 */
export async function fetchExamBoardData(boardId, subject, supabase) {
  if (!boardId || !supabase || !_examBoardTableExists) return null;

  const cacheKey = `${boardId}::${subject}`;
  const cached = _examBoardCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < EXAM_BOARD_CACHE_TTL) return cached.value;

  try {
    // Fetch board info + subject config + topic weightings in parallel
    const [boardRes, subjectRes, weightingsRes] = await Promise.all([
      supabase.from('exam_boards').select('*').eq('id', boardId).single(),
      supabase.from('exam_board_subjects').select('*').eq('board_id', boardId).eq('subject', subject).single(),
      supabase.from('topic_exam_mapping').select('*').eq('board_id', boardId).eq('subject', subject),
    ]);

    // Circuit breaker: if tables don't exist, stop querying
    for (const res of [boardRes, subjectRes, weightingsRes]) {
      if (
        res.status === 404 ||
        res.error?.code === 'PGRST116' ||
        res.error?.message?.includes('does not exist') ||
        res.error?.message?.includes('relation')
      ) {
        _examBoardTableExists = false;
        return null;
      }
    }

    const board = boardRes.data;
    const subjectConfig = subjectRes.data;
    const weightings = weightingsRes.data ?? [];

    if (!board) return null;

    const result = {
      board,
      gradeScale: board.grade_scale,
      gradeBoundaries: subjectConfig?.grade_boundaries ?? null,
      weighting: subjectConfig?.weighting ?? null,
      topicWeightings: weightings.reduce((acc, tw) => {
        acc[tw.topic_slug] = parseFloat(tw.weighting) || 0;
        return acc;
      }, {}),
    };

    _examBoardCache.set(cacheKey, { value: result, ts: Date.now() });
    return result;
  } catch {
    return null;
  }
}

// ─── PREDICT GRADE FROM READINESS SCORE ──────────────────────────────────────

/**
 * Default grade scales for when no exam board is configured.
 * Each entry: { grade, minPercent } — sorted highest-first.
 */
const DEFAULT_GRADE_SCALES = {
  gcse_9_1: [
    { grade: '9', minPercent: 90 },
    { grade: '8', minPercent: 80 },
    { grade: '7', minPercent: 70 },
    { grade: '6', minPercent: 60 },
    { grade: '5', minPercent: 50 },
    { grade: '4', minPercent: 40 },
    { grade: '3', minPercent: 30 },
    { grade: '2', minPercent: 20 },
    { grade: '1', minPercent: 10 },
  ],
  waec: [
    { grade: 'A1', minPercent: 85 },
    { grade: 'B2', minPercent: 75 },
    { grade: 'B3', minPercent: 65 },
    { grade: 'C4', minPercent: 60 },
    { grade: 'C5', minPercent: 55 },
    { grade: 'C6', minPercent: 50 },
    { grade: 'D7', minPercent: 40 },
    { grade: 'E8', minPercent: 30 },
    { grade: 'F9', minPercent: 0  },
  ],
  eleven_plus: [
    { grade: 'Pass (High)',   minPercent: 85 },
    { grade: 'Pass',          minPercent: 70 },
    { grade: 'Near Pass',     minPercent: 55 },
    { grade: 'Below',         minPercent: 0  },
  ],
};

/**
 * Convert a readiness percentage (0-100) to a predicted grade string.
 *
 * Uses exam board grade boundaries if available, otherwise falls back to
 * DEFAULT_GRADE_SCALES based on curriculum.
 *
 * @param {number} readinessPercent  - 0-100
 * @param {object|null} examBoardData - from fetchExamBoardData()
 * @param {string} curriculum        - e.g. 'uk_gcse', 'nigerian_waec', 'uk_11plus'
 * @returns {object} { grade, nextGrade, pointsToNext, scale }
 */
export function predictGrade(readinessPercent, examBoardData = null, curriculum = 'uk_gcse') {
  let boundaries = null;

  // 1. Try exam board grade boundaries (from DB)
  if (examBoardData?.gradeBoundaries?.boundaries) {
    boundaries = examBoardData.gradeBoundaries.boundaries;
  }

  // 2. Fall back to default scales
  if (!boundaries) {
    if (curriculum?.includes('waec') || curriculum?.includes('nigerian')) {
      boundaries = DEFAULT_GRADE_SCALES.waec;
    } else if (curriculum?.includes('11plus') || curriculum?.includes('eleven')) {
      boundaries = DEFAULT_GRADE_SCALES.eleven_plus;
    } else {
      boundaries = DEFAULT_GRADE_SCALES.gcse_9_1;
    }
  }

  // Sort boundaries highest-first
  const sorted = [...boundaries].sort((a, b) => (b.minPercent ?? b.min_percent ?? 0) - (a.minPercent ?? a.min_percent ?? 0));

  let currentGrade = sorted[sorted.length - 1]?.grade ?? '—';
  let nextGrade = null;
  let pointsToNext = 0;

  for (let i = 0; i < sorted.length; i++) {
    const threshold = sorted[i].minPercent ?? sorted[i].min_percent ?? 0;
    if (readinessPercent >= threshold) {
      currentGrade = sorted[i].grade;
      // Next grade is one step above
      if (i > 0) {
        const nextThreshold = sorted[i - 1].minPercent ?? sorted[i - 1].min_percent ?? 0;
        nextGrade = sorted[i - 1].grade;
        pointsToNext = Math.max(0, Math.round(nextThreshold - readinessPercent));
      }
      break;
    }
  }

  return {
    grade: currentGrade,
    nextGrade,
    pointsToNext,
    scale: examBoardData?.gradeScale?.name ?? (curriculum?.includes('waec') ? 'WAEC A1-F9' : curriculum?.includes('11plus') ? 'Standardised' : 'GCSE 9-1'),
  };
}

// ─── ENHANCED EXAM READINESS INDEX ──────────────────────────────────────────

/**
 * Compute a comprehensive exam readiness index that factors in:
 *   1. Topic-weighted mastery (using exam board topic weightings if available)
 *   2. Coverage percentage (how many exam topics have been attempted)
 *   3. Time-until-exam urgency factor
 *   4. Retention health (proportion of topics with strong stability)
 *
 * @param {array}  masteryRecords   - all mastery rows for this scholar + subject
 * @param {string} subject          - subject slug
 * @param {object} options
 * @param {object} options.examBoardData   - from fetchExamBoardData()
 * @param {string} options.examDate        - ISO date string
 * @param {object} options.sequence        - topic sequence override
 * @returns {object} { score, grade, label, colour, coverage, retention, topicsNeeded, nextGrade, pointsToNext, daysUntilExam, urgency }
 */
export function computeExamReadinessIndex(masteryRecords, subject, options = {}) {
  const { examBoardData = null, examDate = null, sequence = null, curriculum = 'uk_gcse' } = options;

  if (!masteryRecords?.length) {
    const fallbackGrade = predictGrade(0, examBoardData, curriculum);
    return {
      score: 0, grade: fallbackGrade.grade, label: 'Not started', colour: '#ef4444',
      coverage: 0, retention: 0, topicsNeeded: [], nextGrade: fallbackGrade.nextGrade,
      pointsToNext: fallbackGrade.pointsToNext, daysUntilExam: null, urgency: 'low',
      scale: fallbackGrade.scale,
    };
  }

  const seq = sequence ?? getTopicSequenceSync(subject);
  const allTopics = getTopicList(seq);
  const masteryMap = {};
  const stabilityMap = {};

  for (const r of masteryRecords) {
    masteryMap[r.topic] = r.mastery_score ?? 0;
    // Stability: SM-2 repetitions + interval as proxy
    const reps = r.sm2_repetitions ?? r.repetitions ?? 0;
    const interval = r.sm2_interval ?? r.interval_days ?? 1;
    stabilityMap[r.topic] = Math.min(1, (reps * interval) / 100); // normalised 0-1
  }

  // ── Topic-weighted mastery ──────────────────────────────────────────────
  const topicWeightings = examBoardData?.topicWeightings ?? {};
  const strandWeights = { foundation: 1.5, intermediate: 1.0, advanced: 0.8 };

  let totalWeight = 0;
  let weightedScore = 0;

  for (const [strand, w] of Object.entries(strandWeights)) {
    for (const topic of seq[strand] ?? []) {
      // Use exam board weighting if available, otherwise use strand weight
      const topicWeight = topicWeightings[topic] != null
        ? parseFloat(topicWeightings[topic])
        : w;
      totalWeight += topicWeight;
      weightedScore += (masteryMap[topic] ?? 0) * topicWeight;
    }
  }

  const rawScore = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;

  // ── Coverage ───────────────────────────────────────────────────────────
  const attemptedTopics = allTopics.filter(t => masteryMap[t] != null && masteryMap[t] > 0);
  const coverage = allTopics.length > 0 ? Math.round((attemptedTopics.length / allTopics.length) * 100) : 0;

  // ── Retention health ──────────────────────────────────────────────────
  const stableTopics = allTopics.filter(t => stabilityMap[t] >= 0.3);
  const retention = allTopics.length > 0 ? Math.round((stableTopics.length / allTopics.length) * 100) : 0;

  // ── Time urgency factor ───────────────────────────────────────────────
  let daysUntilExam = null;
  let urgencyMultiplier = 1.0;
  let urgency = 'low';

  if (examDate) {
    const now = new Date();
    const exam = new Date(examDate);
    daysUntilExam = Math.max(0, Math.ceil((exam - now) / (1000 * 60 * 60 * 24)));

    if (daysUntilExam <= 7)       { urgency = 'critical'; urgencyMultiplier = 0.85; }
    else if (daysUntilExam <= 30) { urgency = 'high';     urgencyMultiplier = 0.92; }
    else if (daysUntilExam <= 90) { urgency = 'medium';   urgencyMultiplier = 0.96; }
    // Urgency slightly penalises the score to encourage action
  }

  // ── Composite score ───────────────────────────────────────────────────
  // 60% topic-weighted mastery + 25% coverage + 15% retention
  const compositeScore = Math.round(
    (rawScore * 0.60 + coverage * 0.25 + retention * 0.15) * urgencyMultiplier
  );

  const finalScore = Math.min(100, Math.max(0, compositeScore));

  // ── Grade prediction ──────────────────────────────────────────────────
  const gradeResult = predictGrade(finalScore, examBoardData, curriculum);

  // ── Topics needing work ───────────────────────────────────────────────
  const topicsNeeded = allTopics
    .filter(t => (masteryMap[t] ?? 0) < 0.55)
    .sort((a, b) => {
      // Prioritise high-weight topics
      const wA = topicWeightings[a] ?? 1;
      const wB = topicWeightings[b] ?? 1;
      return wB - wA || (masteryMap[a] ?? 0) - (masteryMap[b] ?? 0);
    })
    .map(t => ({
      topic: t,
      displayName: t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      mastery: Math.round((masteryMap[t] ?? 0) * 100),
      weight: topicWeightings[t] ?? null,
    }));

  // ── Label + colour ────────────────────────────────────────────────────
  const label  = finalScore >= 80 ? 'Exam Ready' : finalScore >= 60 ? 'On Track' : finalScore >= 40 ? 'Developing' : 'Needs Focus';
  const colour = finalScore >= 80 ? '#22c55e'    : finalScore >= 60 ? '#f59e0b'   : finalScore >= 40 ? '#fb923c' : '#ef4444';

  return {
    score: finalScore,
    grade: gradeResult.grade,
    nextGrade: gradeResult.nextGrade,
    pointsToNext: gradeResult.pointsToNext,
    scale: gradeResult.scale,
    label,
    colour,
    coverage,
    retention,
    topicsNeeded,
    daysUntilExam,
    urgency,
  };
}

// ─── TEACHER DASHBOARD AGGREGATIONS ──────────────────────────────────────────

export function aggregateClassMastery(masteryRows, subject, sequence = null) {
  const seq       = sequence ?? getTopicSequenceSync(subject);
  const allTopics = getTopicList(seq);

  const byTopic = {};
  for (const row of masteryRows) {
    if (!byTopic[row.topic]) byTopic[row.topic] = [];
    byTopic[row.topic].push(row.mastery_score ?? 0);
  }

  return allTopics.map(topic => {
    const scores     = byTopic[topic] ?? [];
    const count      = scores.length;
    const avg        = count > 0 ? scores.reduce((a, b) => a + b, 0) / count : 0;
    const mastered   = scores.filter(s => s >= MASTERY_THRESHOLDS.mastered).length;
    const struggling = scores.filter(s => s < MASTERY_THRESHOLDS.developing).length;

    return {
      topic,
      display_name:   topic.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      strand:         getTopicStrand(seq, topic),
      scholar_count:  count,
      avg_mastery:    Math.round(avg * 100) / 100,
      pct_mastered:   count > 0 ? Math.round((mastered   / count) * 100) : 0,
      pct_struggling: count > 0 ? Math.round((struggling / count) * 100) : 0,
    };
  }).sort((a, b) => a.avg_mastery - b.avg_mastery);
}

export function getStrugglingStudents(masteryRows, topic, threshold = 0.4) {
  return masteryRows
    .filter(r => r.topic === topic && (r.mastery_score ?? 0) < threshold)
    .map(r => ({
      scholar_id:     r.scholar_id,
      mastery_score:  r.mastery_score ?? 0,
      attempts_total: r.attempts_total ?? 0,
      last_seen:      r.updated_at ?? null,
    }))
    .sort((a, b) => a.mastery_score - b.mastery_score);
}

export function getGroupRecommendations(masteryRows, subject, topN = 3, sequence = null) {
  const aggregated = aggregateClassMastery(masteryRows, subject, sequence);

  const candidates = aggregated.filter(t =>
    t.pct_struggling > 30 && t.pct_mastered < 70 && t.scholar_count > 0
  );

  return candidates.slice(0, topN).map(t => {
    const tier = t.avg_mastery < 0.3 ? 'developing'
               : t.avg_mastery < 0.6 ? 'expected'
               :                        'exceeding';

    const rationale = t.pct_struggling > 60
      ? `${t.pct_struggling}% of the class is struggling — consider a group lesson`
      : t.avg_mastery < 0.5
      ? `Class average is ${Math.round(t.avg_mastery * 100)}% — topic needs reinforcement`
      : `${t.pct_struggling}% still finding this challenging — targeted support recommended`;

    return {
      topic:          t.topic,
      display_name:   t.display_name,
      strand:         t.strand,
      avg_mastery:    t.avg_mastery,
      pct_struggling: t.pct_struggling,
      suggested_tier: tier,
      rationale,
    };
  });
}

// ─── LTI / API SHAPE ──────────────────────────────────────────────────────────

export function serialiseLearningState({ scholar, learningPath, masteryRecords, subject, sequence = null }) {
  const { score, label: readinessLabel } = estimateExamReadiness(masteryRecords, subject, sequence);
  const currentTopic  = learningPath?.current_topic ?? null;
  const completionPct = learningPath?.completion_pct ?? 0;

  const masteryMap = {};
  for (const r of masteryRecords) masteryMap[r.topic] = r.mastery_score;

  return {
    scholar_id:      scholar.id,
    display_name:    scholar.name,
    year_group:      scholar.year_group,
    curriculum:      scholar.curriculum,
    subject,
    current_topic:   currentTopic,
    next_milestone:  learningPath?.next_milestone ?? null,
    completion_pct:  completionPct,
    exam_readiness:  { score, label: readinessLabel },
    topic_mastery:   masteryMap,
    recommended_action: {
      type:  'quiz',
      subject,
      topic: currentTopic,
      tier:  masteryMap[currentTopic] != null ? masteryToTier(masteryMap[currentTopic]) : 'developing',
    },
    generated_at:    new Date().toISOString(),
    schema_version:  '1.0',
  };
}