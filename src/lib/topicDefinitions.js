/**
 * IXL-Level Topic Definitions for Every Curriculum × Subject × Grade Band
 *
 * This is the single source of truth for what topics exist and at which grade levels.
 * Used by batch-generate, backfill, and smart-question-selection to ensure full coverage.
 *
 * Structure: TOPICS[subject][gradeBand] = [topic_slug, ...]
 * Grade bands: "early" (Y1-2), "mid" (Y3-4), "upper" (Y5-6), "lower_sec" (Y7-9), "upper_sec" (Y10-12)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MATHEMATICS / MATH / MATHS — IXL-level granularity
// ═══════════════════════════════════════════════════════════════════════════════
export const MATHS_TOPICS = {
  early: [ // Y1-2 / Grade 1-2
    "counting_to_20", "counting_to_100", "counting_in_2s_5s_10s", "number_bonds_to_10",
    "number_bonds_to_20", "addition_within_10", "addition_within_20", "addition_within_100",
    "subtraction_within_10", "subtraction_within_20", "subtraction_within_100",
    "comparing_numbers", "ordering_numbers_to_100", "place_value_tens_ones",
    "halving_numbers", "doubling_numbers", "sharing_equally",
    "multiplication_by_2", "multiplication_by_5", "multiplication_by_10",
    "2d_shapes_naming", "3d_shapes_naming", "symmetry_lines",
    "measuring_length_cm", "measuring_weight_kg", "measuring_capacity_litres",
    "telling_time_oclock", "telling_time_half_past", "telling_time_quarter_past",
    "coins_and_notes", "making_amounts_money",
    "tally_charts", "pictograms", "bar_charts_simple",
    "number_patterns_sequences", "odd_and_even_numbers",
    "position_and_direction", "turns_quarter_half_full",
  ],
  mid: [ // Y3-4 / Grade 3-4
    "addition_3digit", "addition_with_regrouping", "subtraction_3digit", "subtraction_with_regrouping",
    "multiplication_tables_2_3_4_5_8_10", "multiplication_tables_all_to_12",
    "multiplication_2digit_by_1digit", "multiplication_2digit_by_2digit",
    "division_exact", "division_with_remainders", "division_facts",
    "place_value_hundreds", "place_value_thousands", "rounding_to_nearest_10_100",
    "roman_numerals", "negative_numbers_intro",
    "fractions_identifying", "fractions_equivalent", "fractions_comparing",
    "fractions_adding_same_denominator", "fractions_subtracting_same_denominator",
    "fractions_of_amounts", "fractions_on_number_line",
    "decimals_tenths", "decimals_hundredths", "decimals_ordering",
    "money_calculations", "money_making_change",
    "telling_time_5_minutes", "telling_time_to_minute", "time_duration_calculation",
    "time_24hour_clock", "time_converting_units",
    "perimeter_rectangles", "area_counting_squares", "area_rectangles",
    "angles_right_acute_obtuse", "angles_measuring_degrees",
    "2d_shapes_properties", "3d_shapes_properties", "lines_of_symmetry",
    "coordinates_first_quadrant",
    "bar_charts", "tables_and_timetables", "line_graphs_intro",
    "number_sequences_rules", "input_output_machines",
    "measurement_converting_units", "mass_capacity_problems",
  ],
  upper: [ // Y5-6 / Grade 5-6
    "addition_subtraction_multi_step", "multiplication_long", "division_long",
    "order_of_operations_BIDMAS", "factors_and_multiples", "prime_numbers",
    "square_numbers", "cube_numbers",
    "fractions_adding_different_denominator", "fractions_multiplying",
    "fractions_dividing", "fractions_mixed_numbers", "fractions_improper",
    "decimals_4_operations", "decimals_rounding", "decimals_to_fractions",
    "percentages_of_amounts", "percentages_fractions_decimals_converting",
    "percentages_increase_decrease",
    "ratio_introduction", "ratio_simplifying", "proportion_word_problems",
    "algebra_simple_equations", "algebra_expressions", "algebra_formulae",
    "algebra_sequences_nth_term", "algebra_function_machines",
    "negative_numbers_all_operations",
    "area_triangles", "area_parallelograms", "area_compound_shapes",
    "volume_cubes_cuboids", "surface_area_intro",
    "angles_in_triangle", "angles_on_straight_line", "angles_around_point",
    "angles_in_quadrilateral", "missing_angles",
    "coordinates_four_quadrants", "translation", "reflection", "rotation",
    "nets_of_3d_shapes", "circles_circumference_intro",
    "mean_average", "median_mode_range", "pie_charts", "probability_simple",
    "probability_experiments", "data_interpretation",
    "imperial_metric_converting", "speed_distance_time_intro",
    "problem_solving_multi_step", "word_problems_money",
  ],
  lower_sec: [ // Y7-9 / Grade 7-9
    "algebra_expanding_brackets", "algebra_factorising", "algebra_linear_equations",
    "algebra_simultaneous_equations", "algebra_inequalities",
    "algebra_quadratic_expressions", "algebra_sequences_quadratic",
    "number_indices_laws", "number_standard_form", "number_surds_intro",
    "fractions_algebraic", "ratio_dividing_quantities", "proportion_direct_inverse",
    "percentages_compound_interest", "percentages_reverse",
    "geometry_pythagoras_theorem", "geometry_trigonometry_intro",
    "geometry_bearings", "geometry_constructions", "geometry_loci",
    "geometry_congruence_similarity", "geometry_circle_theorems_intro",
    "transformations_enlargement", "transformations_combined",
    "area_circles", "volume_prisms", "volume_cylinders",
    "probability_combined_events", "probability_tree_diagrams",
    "statistics_frequency_tables", "statistics_histograms", "statistics_scatter_graphs",
    "statistics_cumulative_frequency",
    "real_life_graphs", "distance_time_graphs", "speed_calculations",
    "number_HCF_LCM", "number_prime_factorisation",
  ],
  upper_sec: [ // Y10-12 / Grade 10-12
    "algebra_quadratic_equations", "algebra_completing_the_square",
    "algebra_quadratic_formula", "algebra_simultaneous_nonlinear",
    "algebra_functions_composite_inverse", "algebra_proof",
    "geometry_circle_theorems_full", "geometry_vectors",
    "geometry_trigonometry_sine_cosine_rules", "geometry_3d_trigonometry",
    "statistics_standard_deviation", "statistics_distributions",
    "probability_conditional", "probability_binomial",
    "calculus_differentiation_intro", "calculus_integration_intro",
    "number_logarithms", "number_exponentials",
    "graphs_quadratic_cubic_reciprocal", "graphs_transformations",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENGLISH / ELA / ENGLISH STUDIES
// ═══════════════════════════════════════════════════════════════════════════════
export const ENGLISH_TOPICS = {
  early: [
    "phonics_cvc_words", "phonics_digraphs", "phonics_blends",
    "sight_words_common", "reading_simple_sentences",
    "capital_letters_full_stops", "question_marks_exclamation",
    "nouns_common", "verbs_action", "adjectives_describing",
    "singular_plural", "conjunctions_and_but_or",
    "vocabulary_everyday_words", "vocabulary_opposites",
    "sequencing_events", "comprehension_literal_simple",
    "writing_sentences", "handwriting_formation",
    "spelling_common_words", "spelling_patterns_ee_oo_ai",
    "reading_fiction_simple", "reading_nonfiction_simple",
  ],
  mid: [
    "grammar_nouns_expanded", "grammar_verbs_tenses_past_present",
    "grammar_adjectives_adverbs", "grammar_prepositions",
    "grammar_pronouns", "grammar_conjunctions_expanded",
    "grammar_articles_determiners", "grammar_apostrophes_possession",
    "grammar_commas_in_lists", "grammar_direct_speech",
    "grammar_fronted_adverbials", "grammar_paragraphs",
    "comprehension_literal", "comprehension_inference",
    "comprehension_vocabulary_context", "comprehension_prediction",
    "comprehension_summarising", "comprehension_authors_purpose",
    "spelling_prefixes_un_dis_mis", "spelling_suffixes_ed_ing_ly",
    "spelling_homophones", "spelling_silent_letters",
    "vocabulary_synonyms_antonyms", "vocabulary_word_families",
    "writing_narrative_structure", "writing_persuasion_basic",
    "writing_instructions", "writing_letter_writing",
    "poetry_rhyme_rhythm", "poetry_simile_metaphor",
    "reading_fiction_characters", "reading_nonfiction_features",
  ],
  upper: [
    "grammar_modal_verbs", "grammar_relative_clauses",
    "grammar_passive_active_voice", "grammar_subjunctive_mood",
    "grammar_semicolons_colons", "grammar_parenthesis_brackets_dashes",
    "grammar_ellipsis", "grammar_formal_informal_register",
    "comprehension_inference_advanced", "comprehension_comparison",
    "comprehension_evaluating_texts", "comprehension_themes",
    "comprehension_language_effects", "comprehension_bias_perspective",
    "spelling_word_origins_etymology", "spelling_challenging_words",
    "vocabulary_figurative_language", "vocabulary_technical_terms",
    "vocabulary_shades_of_meaning",
    "writing_narrative_advanced", "writing_persuasive_argument",
    "writing_formal_letter", "writing_report_writing",
    "writing_balanced_argument", "writing_descriptive_writing",
    "poetry_analysis", "poetry_forms_sonnet_haiku",
    "literature_character_analysis", "literature_setting_atmosphere",
    "literature_plot_structure", "literature_themes_messages",
    "reading_comparing_texts", "reading_evaluating_reliability",
  ],
  lower_sec: [
    "grammar_sentence_types_complex", "grammar_clause_analysis",
    "writing_analytical_essay", "writing_creative_prose",
    "writing_speech_writing", "writing_review_writing",
    "literature_shakespeare_intro", "literature_poetry_unseen",
    "literature_novel_study", "literature_drama_study",
    "comprehension_nonfiction_analysis", "comprehension_media_texts",
    "vocabulary_academic_register", "vocabulary_connotation_denotation",
    "spelling_advanced_patterns",
    "reading_viewpoint_analysis", "reading_rhetorical_devices",
  ],
  upper_sec: [
    "literature_shakespeare_analysis", "literature_essay_writing",
    "writing_discursive_essay", "writing_academic_essay",
    "comprehension_evaluation_synthesis",
    "language_analysis_persuasive_techniques",
    "media_literacy_analysis",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCIENCE / BASIC_SCIENCE
// ═══════════════════════════════════════════════════════════════════════════════
export const SCIENCE_TOPICS = {
  early: [
    "living_nonliving_things", "animal_types_mammals_birds_fish",
    "human_body_parts", "senses_five", "healthy_eating_basic",
    "plants_parts_roots_stem_leaf", "plants_what_they_need",
    "everyday_materials_wood_metal_plastic", "material_properties",
    "pushes_and_pulls", "magnets_basic",
    "seasons_weather", "day_and_night",
    "habitats_where_animals_live",
  ],
  mid: [
    "rocks_and_soils", "fossils_intro",
    "plants_water_transport", "plants_life_cycle",
    "animals_food_chains", "animals_habitats_adaptation",
    "human_body_skeleton_muscles", "human_body_digestion",
    "human_body_teeth", "nutrition_food_groups",
    "light_sources_shadows", "light_reflection",
    "sound_vibrations_pitch_volume", "sound_how_we_hear",
    "electricity_simple_circuits", "electricity_conductors_insulators",
    "forces_gravity_friction", "forces_air_resistance",
    "states_of_matter_solid_liquid_gas", "evaporation_condensation",
    "classification_grouping_living_things",
    "environments_changes_effects",
  ],
  upper: [
    "earth_and_space_solar_system", "earth_and_space_moon_phases",
    "earth_and_space_day_night_seasons",
    "forces_gravity_weight", "forces_mechanisms_levers_pulleys",
    "forces_water_air_resistance",
    "properties_of_materials_dissolving", "properties_reversible_irreversible",
    "properties_separating_mixtures",
    "electricity_series_parallel", "electricity_voltage_current",
    "light_how_we_see", "light_prisms_spectrum",
    "evolution_adaptation", "evolution_fossils_evidence",
    "evolution_inheritance", "evolution_natural_selection",
    "human_body_circulatory_system", "human_body_heart_blood",
    "classification_microorganisms",
    "reproduction_plants_animals",
  ],
  lower_sec: [
    "cells_plant_animal", "cells_specialised",
    "organ_systems_overview", "digestive_system_detail",
    "respiratory_system", "circulatory_system_detail",
    "particles_model", "atoms_elements_compounds",
    "chemical_reactions_intro", "acids_alkalis_pH",
    "periodic_table_groups", "metals_nonmetals",
    "forces_speed_acceleration", "forces_pressure",
    "energy_stores_transfers", "energy_conservation",
    "waves_transverse_longitudinal", "electromagnetic_spectrum",
    "electricity_current_voltage_resistance",
    "magnetism_electromagnets",
    "genetics_DNA_intro", "genetics_inheritance_basic",
    "ecology_ecosystems", "ecology_food_webs",
    "earth_structure_tectonic_plates", "rock_cycle",
  ],
  upper_sec: [
    "atomic_structure_detail", "bonding_ionic_covalent",
    "rates_of_reaction", "equilibria",
    "organic_chemistry_hydrocarbons",
    "genetics_mitosis_meiosis", "genetics_Punnett_squares",
    "homeostasis", "nervous_system",
    "physics_motion_equations", "physics_momentum",
    "physics_radioactivity", "physics_nuclear_energy",
    "physics_waves_properties",
    "ecology_biodiversity_conservation",
    "chemistry_quantitative",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// VERBAL REASONING
// ═══════════════════════════════════════════════════════════════════════════════
export const VERBAL_TOPICS = {
  mid: [
    "word_analogies", "odd_one_out_words", "synonyms", "antonyms",
    "code_words_letter_shift", "hidden_words", "compound_words",
    "letter_sequences", "word_within_word", "anagrams_simple",
    "closest_meaning", "word_connections", "word_classes_usage",
  ],
  upper: [
    "analogies_complex", "double_meaning_words", "word_relationships_advanced",
    "code_breaking_sentences", "logic_verbal_deduction",
    "reading_comprehension_cloze", "sentence_completion",
    "shuffled_sentences", "word_ladders", "vocabulary_in_context",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// NON-VERBAL REASONING
// ═══════════════════════════════════════════════════════════════════════════════
export const NVR_TOPICS = {
  mid: [
    "series_completion_shapes", "odd_one_out_shapes",
    "rotation_patterns", "reflection_patterns",
    "matrix_completion_2x2", "analogies_shape_pairs",
    "pattern_counting", "spatial_folding_simple",
  ],
  upper: [
    "matrix_completion_3x3", "code_breaking_shapes",
    "3d_rotation", "nets_and_cubes",
    "overlapping_shapes", "hidden_shapes",
    "spatial_reasoning_complex", "combined_series",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// GEOGRAPHY / HASS / SOCIAL STUDIES
// ═══════════════════════════════════════════════════════════════════════════════
export const GEOGRAPHY_TOPICS = {
  early: [
    "my_local_area", "maps_and_plans_simple", "continents_oceans",
    "weather_and_seasons", "hot_and_cold_places",
  ],
  mid: [
    "map_skills_compass_directions", "map_skills_grid_references",
    "rivers_water_cycle", "mountains_volcanoes",
    "countries_of_europe", "countries_of_the_world",
    "climate_zones", "settlements_rural_urban",
    "natural_resources", "recycling_sustainability",
  ],
  upper: [
    "map_skills_OS_maps", "physical_geography_coasts",
    "physical_geography_earthquakes", "physical_geography_weather_systems",
    "human_geography_population", "human_geography_migration",
    "human_geography_trade_globalisation", "human_geography_urbanisation",
    "environmental_issues_deforestation", "environmental_issues_climate_change",
    "sustainability_renewable_energy",
  ],
  lower_sec: [
    "tectonic_hazards_detail", "weather_and_climate_detail",
    "ecosystems_biomes", "development_indicators",
    "economic_activities", "resource_management",
    "globalisation_impacts", "urbanisation_challenges",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════════════════════════════
export const HISTORY_TOPICS = {
  mid: [
    "ancient_egypt", "ancient_greece", "ancient_rome",
    "stone_age_to_iron_age", "anglo_saxons_vikings",
    "local_history_study", "chronology_timelines",
  ],
  upper: [
    "maya_civilisation", "early_islamic_civilisation",
    "tudors_and_stuarts", "victorian_britain",
    "world_war_1_overview", "world_war_2_overview",
    "civil_rights_movements", "industrial_revolution",
    "british_empire_colonialism",
    "cause_and_consequence", "source_analysis_skills",
  ],
  lower_sec: [
    "medieval_period", "renaissance_reformation",
    "french_revolution", "american_independence",
    "cold_war", "decolonisation",
    "holocaust_and_genocide",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTING / COMPUTER SCIENCE / DIGITAL LITERACY
// ═══════════════════════════════════════════════════════════════════════════════
export const COMPUTING_TOPICS = {
  early: [
    "using_technology_safely", "algorithms_simple_instructions",
    "debugging_simple_programs",
  ],
  mid: [
    "algorithms_flowcharts", "programming_sequences",
    "programming_loops", "programming_selection",
    "data_collecting_presenting", "internet_safety",
    "networks_basics",
  ],
  upper: [
    "programming_variables", "programming_functions",
    "programming_data_types", "binary_numbers",
    "boolean_logic", "networks_internet",
    "cyber_security_basics", "data_representation",
  ],
  lower_sec: [
    "programming_python_basics", "programming_data_structures",
    "algorithms_searching_sorting", "databases_basics",
    "web_development_HTML_CSS", "cyber_security_threats",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// NIGERIAN-SPECIFIC SUBJECTS
// ═══════════════════════════════════════════════════════════════════════════════
export const CIVIC_EDUCATION_TOPICS = {
  early: ["national_symbols", "respect_for_elders", "rights_responsibilities_basic"],
  mid: ["nigerian_constitution_basic", "citizenship_duties", "cultural_diversity", "drug_abuse_awareness"],
  upper: ["human_rights", "democracy_governance", "rule_of_law", "national_values"],
  lower_sec: ["arms_of_government", "federalism", "youth_empowerment", "national_integration"],
  upper_sec: ["constitutional_development", "political_participation", "human_trafficking", "cultism_effects"],
};

export const ECONOMICS_TOPICS = {
  upper_sec: [
    "demand_supply", "market_structures", "national_income",
    "money_banking", "inflation_deflation", "international_trade",
    "economic_development", "fiscal_monetary_policy",
    "public_finance_taxation", "balance_of_payments",
  ],
};

export const GOVERNMENT_TOPICS = {
  upper_sec: [
    "political_concepts", "organs_of_government", "nigerian_federalism",
    "political_parties", "pressure_groups", "local_government",
    "military_in_politics", "international_organisations",
    "nigerian_constitution_history", "foreign_policy",
  ],
};

export const COMMERCE_TOPICS = {
  upper_sec: [
    "trade_types", "aids_to_trade", "business_organisations",
    "insurance_principles", "banking_services", "stock_exchange",
    "advertising_marketing", "warehousing", "transportation",
  ],
};

export const ACCOUNTING_TOPICS = {
  upper_sec: [
    "double_entry_bookkeeping", "trial_balance", "trading_profit_loss",
    "balance_sheet", "bank_reconciliation", "depreciation",
    "partnership_accounts", "company_accounts", "manufacturing_accounts",
  ],
};

export const PHYSICS_TOPICS = {
  lower_sec: [
    "measurement_units", "speed_velocity_acceleration",
    "forces_equilibrium", "pressure_solids_liquids_gases",
    "work_energy_power", "simple_machines",
    "heat_temperature", "waves_sound_light",
  ],
  upper_sec: [
    "motion_equations_suvat", "newton_laws_detail",
    "projectile_motion", "circular_motion",
    "gravitational_field", "electric_field_potential",
    "current_electricity_detail", "electromagnetic_induction",
    "nuclear_physics", "wave_optics",
    "thermodynamics", "gas_laws",
  ],
};

export const CHEMISTRY_TOPICS = {
  lower_sec: [
    "states_of_matter_particles", "elements_mixtures_compounds",
    "separation_techniques", "atomic_structure_basic",
    "chemical_symbols_equations", "acids_bases_salts",
  ],
  upper_sec: [
    "atomic_structure_electronic_config", "chemical_bonding_detail",
    "stoichiometry_mole_concept", "gas_laws_calculations",
    "redox_reactions", "electrochemistry",
    "organic_chemistry_alkanes_alkenes", "organic_chemistry_alcohols",
    "rates_of_reaction_factors", "equilibrium_le_chatelier",
    "periodic_table_trends", "metals_extraction",
  ],
};

export const BIOLOGY_TOPICS = {
  lower_sec: [
    "cell_structure_organelles", "diffusion_osmosis",
    "nutrition_enzymes", "transport_in_organisms",
    "respiration_aerobic_anaerobic", "excretion",
  ],
  upper_sec: [
    "ecology_populations_communities", "ecology_nutrient_cycles",
    "genetics_Mendelian", "genetics_variation_mutation",
    "evolution_evidence_mechanisms", "biotechnology",
    "reproduction_human", "plant_biology_photosynthesis",
    "coordination_hormones", "diseases_immunity",
    "classification_taxonomy",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Get topics for a given subject at a given year level
// ═══════════════════════════════════════════════════════════════════════════════
function getGradeBand(year) {
  if (year <= 2) return 'early';
  if (year <= 4) return 'mid';
  if (year <= 6) return 'upper';
  if (year <= 9) return 'lower_sec';
  return 'upper_sec';
}

const SUBJECT_TO_TOPICS = {
  // Maths variants
  mathematics:          MATHS_TOPICS,
  maths:                MATHS_TOPICS,
  math:                 MATHS_TOPICS,
  further_mathematics:  MATHS_TOPICS, // use upper topics

  // English variants
  english:              ENGLISH_TOPICS,
  english_studies:      ENGLISH_TOPICS,
  ela:                  ENGLISH_TOPICS,
  literature:           ENGLISH_TOPICS,

  // Science variants
  science:              SCIENCE_TOPICS,
  basic_science:        SCIENCE_TOPICS,

  // Reasoning
  verbal_reasoning:     VERBAL_TOPICS,
  verbal:               VERBAL_TOPICS,
  nvr:                  NVR_TOPICS,

  // Humanities
  geography:            GEOGRAPHY_TOPICS,
  hass:                 GEOGRAPHY_TOPICS, // AU: Humanities and Social Sciences
  social_studies:       GEOGRAPHY_TOPICS,
  history:              HISTORY_TOPICS,
  canadian_history:     HISTORY_TOPICS,
  humanities:           { ...GEOGRAPHY_TOPICS }, // IB MYP

  // Computing
  computing:            COMPUTING_TOPICS,
  computer_science:     COMPUTING_TOPICS,
  basic_digital_literacy: COMPUTING_TOPICS,

  // Nigerian-specific
  civic_education:      CIVIC_EDUCATION_TOPICS,
  economics:            ECONOMICS_TOPICS,
  government:           GOVERNMENT_TOPICS,
  commerce:             COMMERCE_TOPICS,
  financial_accounting: ACCOUNTING_TOPICS,
  physics:              PHYSICS_TOPICS,
  chemistry:            CHEMISTRY_TOPICS,
  biology:              BIOLOGY_TOPICS,

  // Fallback subjects get generic topics
  business_education:   { mid: ["business_basics", "money_management"], upper: ["entrepreneurship", "trade"] },
  business_studies:     { upper_sec: ["business_organisations", "marketing", "finance", "human_resources"] },
  agricultural_science: { mid: ["farming_basics", "crops_types"], lower_sec: ["soil_science", "animal_husbandry", "crop_production"], upper_sec: ["farm_management", "agricultural_economics"] },
  religious_studies:    { early: ["moral_values"], mid: ["religious_stories", "festivals_celebrations"], upper: ["world_religions", "ethical_questions"] },
  religious_education:  { early: ["moral_values"], mid: ["religious_stories", "festivals_celebrations"], upper: ["world_religions", "ethical_questions"] },
  design_and_technology: { mid: ["materials_properties", "design_process"], upper: ["mechanisms", "structures", "electronics_basics"] },
  cultural_and_creative_arts: { early: ["colours_shapes_art"], mid: ["drawing_painting", "music_rhythm"] },
  pre_vocational_studies: { lower_sec: ["woodwork_basics", "metalwork_basics", "technical_drawing"] },
};

/**
 * Get the topic list for a subject at a specific year level.
 * Returns an array of topic slugs suitable for question generation.
 */
export function getTopicsForSubjectYear(subject, year) {
  const topicMap = SUBJECT_TO_TOPICS[subject];
  if (!topicMap) return ["general_knowledge"];

  const band = getGradeBand(year);
  const topics = topicMap[band];

  // If no topics at this band, try adjacent bands
  if (!topics || topics.length === 0) {
    const bands = ['early', 'mid', 'upper', 'lower_sec', 'upper_sec'];
    const idx = bands.indexOf(band);
    // Try one band lower, then one higher
    if (idx > 0 && topicMap[bands[idx - 1]]) return topicMap[bands[idx - 1]];
    if (idx < bands.length - 1 && topicMap[bands[idx + 1]]) return topicMap[bands[idx + 1]];
    // Return first available band
    for (const b of bands) {
      if (topicMap[b] && topicMap[b].length > 0) return topicMap[b];
    }
    return ["general_knowledge"];
  }

  return topics;
}

/**
 * Get ALL topics across ALL subjects for a curriculum config.
 * Returns [{subject, year, topic}, ...] for every cell that needs filling.
 */
export function getAllCells(subjects, grades) {
  const cells = [];
  for (const subject of subjects) {
    for (const year of grades) {
      const topics = getTopicsForSubjectYear(subject, year);
      for (const topic of topics) {
        cells.push({ subject, year, topic });
      }
    }
  }
  return cells;
}
