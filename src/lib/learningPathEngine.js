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
 *   aggregateClassMastery()    — teacher dashboard: class-level topic mastery
 *   getStrugglingStudents()    — teacher dashboard: students below threshold
 *   getGroupRecommendations()  — teacher dashboard: suggested next focus areas
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { scoreDiagnostic, masteryToTier, MASTERY_THRESHOLDS } from './masteryEngine.js';

// ─── CANONICAL TOPIC SEQUENCES ────────────────────────────────────────────────
// THE authoritative code-side source for all subjects, strands, and topic slugs.
//
// ⚠️  Slug rules:
//    - lowercase_with_underscores only
//    - must match question_bank.topic exactly
//    - must match scholar_topic_mastery.topic exactly
//    - once in production, renaming requires a DB migration on both columns
//
// To add a subject: append an entry. Zero other files need changing.
// To add a topic: append to the appropriate strand array.

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
  // Used for any subject without an explicit entry. Sufficient for basic
  // mastery tracking until a proper sequence is defined.

  default: {
    foundation:   ['introduction','core_concepts','basic_skills'],
    intermediate: ['application','problem_solving'],
    advanced:     ['analysis','evaluation'],
  },
};

// ─── SUBJECT METADATA ─────────────────────────────────────────────────────────
// UI display names, Lucide icon names, Tailwind colour classes.
// Add a row here when adding a new subject — no other file needs updating.

const SUBJECT_META = {
  mathematics:               { label: 'Mathematics',             icon: 'calculator',     colour: 'bg-blue-500'    },
  english:                   { label: 'English',                 icon: 'book-open',      colour: 'bg-purple-500'  },
  verbal_reasoning:          { label: 'Verbal Reasoning',        icon: 'message-square', colour: 'bg-violet-500'  },
  non_verbal_reasoning:      { label: 'Non-Verbal Reasoning',    icon: 'shapes',         colour: 'bg-indigo-500'  },
  science:                   { label: 'Science',                 icon: 'flask-conical',  colour: 'bg-green-500'   },
  biology:                   { label: 'Biology',                 icon: 'leaf',           colour: 'bg-emerald-500' },
  chemistry:                 { label: 'Chemistry',               icon: 'atom',           colour: 'bg-teal-500'    },
  physics:                   { label: 'Physics',                 icon: 'zap',            colour: 'bg-cyan-500'    },
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
  business_studies:          { label: 'Business Studies',        icon: 'briefcase',      colour: 'bg-yellow-600'  },
  economics:                 { label: 'Economics',               icon: 'trending-up',    colour: 'bg-emerald-600' },
  individuals_and_societies: { label: 'Individuals & Societies', icon: 'users-2',        colour: 'bg-purple-600'  },
  hass:                      { label: 'HASS',                    icon: 'compass',        colour: 'bg-orange-600'  },
};

// ─── IN-MEMORY SEQUENCE CACHE ─────────────────────────────────────────────────
// Avoids repeated DB lookups within the same process lifecycle.
// Key: `${curriculum ?? 'default'}::${subject}`
// TTL: 5 minutes (sequences change rarely; redeploy clears cache anyway)

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

// ─── DB-AWARE TOPIC SEQUENCE LOADER ──────────────────────────────────────────
/**
 * getTopicSequence — THE function to call whenever you need topic sequences.
 *
 * Resolution order:
 *   1. In-memory cache (avoids repeated DB calls within same request)
 *   2. DB table `curriculum_topic_progression` (if it exists and has rows)
 *   3. Hard-coded TOPIC_SEQUENCES fallback (always works, even without DB)
 *
 * When the DB table doesn't exist yet, this silently falls through to the
 * code-side fallback — zero errors, zero config needed.
 *
 * When you're ready to go DB-driven for a curriculum:
 *   INSERT INTO curriculum_topic_progression (curriculum, subject, strand, topic_slug, position, version, valid_from)
 *   VALUES ('uk_11plus', 'mathematics', 'foundation', 'place_value', 1, '2025', now()), ...
 * That's it. No code changes.
 *
 * @param {string}  subject
 * @param {string}  [curriculum]  - if provided, checks for curriculum-specific overrides first
 * @param {object}  [supabase]    - if omitted, skips DB check (safe for server-less contexts)
 * @returns {Promise<{foundation, intermediate, advanced}>}
 */
export async function getTopicSequence(subject, curriculum = null, supabase = null) {
  const cacheKey = `${curriculum ?? 'default'}::${subject}`;
  const cached   = _cacheGet(cacheKey);
  if (cached) return cached;

  // ── DB lookup ─────────────────────────────────────────────────────────────
  if (supabase) {
    try {
      let query = supabase
        .from('curriculum_topic_progression')
        .select('strand, topic_slug, position')
        .eq('subject', subject)
        .is('valid_to', null)          // current version only
        .order('position', { ascending: true });

      // Prefer curriculum-specific rows; fall back to global (curriculum = null)
      if (curriculum) {
        query = query.or(`curriculum.eq.${curriculum},curriculum.is.null`);
      } else {
        query = query.is('curriculum', null);
      }

      const { data, error } = await query;

      if (!error && data?.length > 0) {
        // If both curriculum-specific and global rows exist, curriculum-specific wins
        const rows = curriculum
          ? [
              ...data.filter(r => r.curriculum === curriculum),
              ...data.filter(r => r.curriculum === null &&
                !data.find(r2 => r2.curriculum === curriculum && r2.strand === r.strand && r2.topic_slug === r.topic_slug)
              ),
            ]
          : data;

        const seq = {
          foundation:   rows.filter(r => r.strand === 'foundation').map(r => r.topic_slug),
          intermediate: rows.filter(r => r.strand === 'intermediate').map(r => r.topic_slug),
          advanced:     rows.filter(r => r.strand === 'advanced').map(r => r.topic_slug),
        };

        // Only use DB result if it has at least one strand populated
        if (seq.foundation.length || seq.intermediate.length || seq.advanced.length) {
          _cacheSet(cacheKey, seq);
          return seq;
        }
      }
    } catch {
      // Table doesn't exist yet or query failed — fall through to code fallback silently
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

/**
 * Get a flat ordered topic list (foundation → intermediate → advanced).
 * @param {object} sequence - result of getTopicSequence()
 */
export function getTopicList(sequence) {
  if (typeof sequence === 'string') {
    // Called with subject string directly — sync fallback
    const seq = getTopicSequenceSync(sequence);
    return [...(seq.foundation ?? []), ...(seq.intermediate ?? []), ...(seq.advanced ?? [])];
  }
  return [...(sequence?.foundation ?? []), ...(sequence?.intermediate ?? []), ...(sequence?.advanced ?? [])];
}

/**
 * Get which strand (foundation | intermediate | advanced) a topic belongs to.
 */
export function getTopicStrand(sequence, topic) {
  if (typeof sequence === 'string') sequence = getTopicSequenceSync(sequence);
  if (sequence?.foundation?.includes(topic))   return 'foundation';
  if (sequence?.intermediate?.includes(topic)) return 'intermediate';
  if (sequence?.advanced?.includes(topic))     return 'advanced';
  return null;
}

/**
 * Get all topics in the same strand as the given topic.
 * Used by smartQuestionSelection for quest coherence.
 */
export function getStrandTopics(sequence, topic) {
  const strand = getTopicStrand(sequence, topic);
  if (!strand) return [];
  return sequence[strand] ?? [];
}

/** Get subject display metadata (label, Lucide icon, Tailwind colour). */
export function getSubjectMeta(subject) {
  return SUBJECT_META[subject] ?? {
    label:  subject.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    icon:   'book',
    colour: 'bg-gray-500',
  };
}

/** All registered subject slugs — useful for admin UIs and population scripts. */
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
/**
 * Select diagnostic questions for entry assessment.
 * 2 questions per topic (1 developing + 1 expected), up to 20 total.
 *
 * @param {array}  questionBank
 * @param {string} subject
 * @param {string} curriculum
 * @param {number} yearLevel
 * @param {object} [sequence]   - pre-fetched sequence (avoids re-fetching)
 * @returns {array}
 */
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
/**
 * Generate a personalised topic path from diagnostic scores + existing mastery.
 *
 * Priority per strand: struggling first, then developing, mastered topics skipped.
 * If everything is mastered, returns enrichment from the advanced strand.
 *
 * @param {string} curriculum
 * @param {string} subject
 * @param {number} yearLevel
 * @param {object} diagnosticScores  { topic: score 0–1 }
 * @param {array}  masteryRecords    scholar_topic_mastery rows
 * @param {object} [sequence]        pre-fetched sequence
 * @returns {array}
 */
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

// ─── ADVANCE PATH ─────────────────────────────────────────────────────────────
/**
 * Recompute path state after new mastery data. Returns fields to upsert.
 *
 * @param {object} savedPath      scholar_learning_path DB row
 * @param {array}  masteryRecords updated mastery rows
 * @returns {object}
 */
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
/**
 * Detect which milestones were crossed after an answer.
 * @param {object} prevMastery  mastery record before
 * @param {object} newMastery   mastery record after
 * @returns {array}
 */
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
/**
 * Weighted exam readiness score (0–100). Foundation topics weighted 1.5×.
 *
 * @param {array}  masteryRecords
 * @param {string} subject
 * @param {object} [sequence]  pre-fetched sequence
 * @returns {{ score, label, topicsNeeded, colour }}
 */
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

// ─── TEACHER DASHBOARD AGGREGATIONS ──────────────────────────────────────────
// These functions operate on arrays of per-student mastery data.
// They are intentionally stateless and pure — no DB calls — so they can run
// on cached/pre-fetched data and be reused by REST endpoints, LTI responses,
// and materialized view refresh jobs.

/**
 * Aggregate mastery across all scholars in a class, per topic.
 *
 * Input:  array of { scholar_id, topic, mastery_score } rows
 * Output: array of { topic, avg_mastery, pct_mastered, pct_struggling,
 *                    scholar_count, strand } sorted weakest-first
 *
 * @param {array}  masteryRows    all scholar_topic_mastery rows for the class
 * @param {string} subject
 * @param {object} [sequence]    pre-fetched sequence (avoids re-lookup)
 * @returns {array}
 */
export function aggregateClassMastery(masteryRows, subject, sequence = null) {
  const seq       = sequence ?? getTopicSequenceSync(subject);
  const allTopics = getTopicList(seq);

  // Group by topic
  const byTopic = {};
  for (const row of masteryRows) {
    if (!byTopic[row.topic]) byTopic[row.topic] = [];
    byTopic[row.topic].push(row.mastery_score ?? 0);
  }

  return allTopics.map(topic => {
    const scores  = byTopic[topic] ?? [];
    const count   = scores.length;
    const avg     = count > 0 ? scores.reduce((a, b) => a + b, 0) / count : 0;
    const mastered   = scores.filter(s => s >= MASTERY_THRESHOLDS.mastered).length;
    const struggling = scores.filter(s => s < MASTERY_THRESHOLDS.developing).length;

    return {
      topic,
      display_name:    topic.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      strand:          getTopicStrand(seq, topic),
      scholar_count:   count,
      avg_mastery:     Math.round(avg * 100) / 100,
      pct_mastered:    count > 0 ? Math.round((mastered   / count) * 100) : 0,
      pct_struggling:  count > 0 ? Math.round((struggling / count) * 100) : 0,
    };
  }).sort((a, b) => a.avg_mastery - b.avg_mastery); // weakest topics first
}

/**
 * Identify scholars who are struggling (below threshold) on a given topic.
 * Used for targeted teacher interventions.
 *
 * @param {array}  masteryRows    all scholar_topic_mastery rows for the class
 * @param {string} topic
 * @param {number} [threshold]   mastery score below which a scholar is "struggling" (default 0.4)
 * @returns {array}              { scholar_id, mastery_score, attempts_total }
 */
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

/**
 * Generate group-level recommendations for a teacher.
 * Returns the top N topics to focus on next, with suggested tier and rationale.
 *
 * @param {array}  masteryRows   all scholar_topic_mastery rows for the class
 * @param {string} subject
 * @param {number} [topN]        how many recommendations to return (default 3)
 * @param {object} [sequence]
 * @returns {array}              { topic, display_name, strand, rationale, suggested_tier, pct_struggling }
 */
export function getGroupRecommendations(masteryRows, subject, topN = 3, sequence = null) {
  const aggregated = aggregateClassMastery(masteryRows, subject, sequence);

  // Focus on topics where >30% of the class is struggling and not yet mastered by most
  const candidates = aggregated.filter(t =>
    t.pct_struggling > 30 && t.pct_mastered < 70 && t.scholar_count > 0
  );

  return candidates.slice(0, topN).map(t => {
    const tier = t.avg_mastery < 0.3  ? 'developing'
               : t.avg_mastery < 0.6  ? 'expected'
               :                         'exceeding';

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
/**
 * Serialise a scholar's current learning state into a portable object
 * suitable for LTI 1.3 responses, REST API endpoints, and webhook payloads.
 *
 * This is a pure transform — no DB calls. Pass in pre-fetched data.
 * The shape is intentionally stable: adding fields is safe, removing is a breaking change.
 *
 * @param {object} params
 * @param {object} params.scholar         scholars row
 * @param {object} params.learningPath    scholar_learning_path row
 * @param {array}  params.masteryRecords  scholar_topic_mastery rows
 * @param {string} params.subject
 * @param {object} [params.sequence]
 * @returns {object}  LTI-compatible learning state payload
 */
export function serialiseLearningState({ scholar, learningPath, masteryRecords, subject, sequence = null }) {
  const { score, label: readinessLabel } = estimateExamReadiness(masteryRecords, subject, sequence);
  const currentTopic = learningPath?.current_topic ?? null;
  const completionPct = learningPath?.completion_pct ?? 0;

  const masteryMap = {};
  for (const r of masteryRecords) masteryMap[r.topic] = r.mastery_score;

  return {
    // Scholar identifiers (safe for external systems)
    scholar_id:       scholar.id,
    display_name:     scholar.name,
    year_group:       scholar.year_group,
    curriculum:       scholar.curriculum,

    // Current learning state
    subject,
    current_topic:    currentTopic,
    next_milestone:   learningPath?.next_milestone ?? null,
    completion_pct:   completionPct,

    // Readiness
    exam_readiness:   { score, label: readinessLabel },

    // Per-topic mastery summary (for LMS grade passback)
    topic_mastery:    masteryMap,

    // Recommended next action (for LTI deep linking)
    recommended_action: {
      type:    'quiz',
      subject,
      topic:   currentTopic,
      tier:    masteryMap[currentTopic] != null ? masteryToTier(masteryMap[currentTopic]) : 'developing',
    },

    // Metadata
    generated_at: new Date().toISOString(),
    schema_version: '1.0',
  };
}