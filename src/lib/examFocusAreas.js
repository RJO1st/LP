/**
 * examFocusAreas.js — Exam-specific focus areas and per-year topic expansions
 *
 * This supplements topicDefinitions.js with:
 * 1. Exam board focus areas (GCSE, WAEC, NECO, 11+, SAT, etc.)
 * 2. Per-year granular topic breakdowns (not just per-band)
 * 3. Priority weightings for question generation
 *
 * Used by generateQuestionsV2.mjs and the analytics dashboard.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EXAM FOCUS AREAS — What each exam emphasises
// ═══════════════════════════════════════════════════════════════════════════════

export const EXAM_FOCUS = {
  // ─── UK 11+ (selective school entrance) ─────────────────────────────
  "uk_11plus": {
    label: "UK 11+ Entrance Exam",
    targetYears: [4, 5, 6],
    subjects: {
      mathematics: {
        highPriority: [
          "fractions_adding_different_denominator", "fractions_multiplying", "fractions_of_amounts",
          "percentages_of_amounts", "percentages_fractions_decimals_converting",
          "ratio_introduction", "ratio_simplifying", "proportion_word_problems",
          "algebra_simple_equations", "algebra_expressions", "algebra_sequences_nth_term",
          "area_triangles", "area_compound_shapes", "volume_cubes_cuboids",
          "angles_in_triangle", "angles_on_straight_line", "missing_angles",
          "mean_average", "median_mode_range", "probability_simple",
          "problem_solving_multi_step", "word_problems_money",
          "order_of_operations_BIDMAS", "prime_numbers", "factors_and_multiples",
          "coordinates_four_quadrants", "speed_distance_time_intro",
        ],
        examTips: "11+ maths tests speed and accuracy. Multi-step word problems and ratio/proportion are heavily tested.",
      },
      english: {
        highPriority: [
          "comprehension_inference_advanced", "comprehension_comparison",
          "comprehension_language_effects", "vocabulary_figurative_language",
          "grammar_passive_active_voice", "grammar_semicolons_colons",
          "writing_narrative_advanced", "writing_persuasive_argument",
          "spelling_challenging_words", "vocabulary_shades_of_meaning",
        ],
        examTips: "Comprehension requires inference and PEE paragraphs. Creative writing is timed.",
      },
      verbal_reasoning: {
        highPriority: [
          "word_analogies", "odd_one_out_words", "synonyms", "antonyms",
          "code_words_letter_shift", "hidden_words", "letter_sequences",
          "analogies_complex", "logic_verbal_deduction", "sentence_completion",
        ],
        examTips: "Speed is critical. Practice all 21 VR question types.",
      },
      nvr: {
        highPriority: [
          "series_completion_shapes", "matrix_completion_2x2", "matrix_completion_3x3",
          "rotation_patterns", "reflection_patterns", "3d_rotation", "nets_and_cubes",
          "spatial_reasoning_complex",
        ],
        examTips: "Pattern recognition under time pressure. Focus on spatial reasoning.",
      },
    },
  },

  // ─── UK GCSE (Year 10-11, age 14-16) ───────────────────────────────
  "uk_gcse": {
    label: "UK GCSE Exams",
    targetYears: [10, 11],
    subjects: {
      mathematics: {
        highPriority: [
          "algebra_quadratic_equations", "algebra_simultaneous_equations",
          "algebra_completing_the_square", "algebra_functions_composite_inverse",
          "geometry_pythagoras_theorem", "geometry_trigonometry_intro",
          "geometry_circle_theorems_full", "geometry_vectors",
          "probability_combined_events", "probability_tree_diagrams",
          "statistics_cumulative_frequency", "statistics_histograms",
          "number_indices_laws", "number_standard_form",
          "graphs_quadratic_cubic_reciprocal",
          "percentages_compound_interest", "percentages_reverse",
          "ratio_dividing_quantities", "proportion_direct_inverse",
        ],
        examTips: "Higher tier includes vectors, circle theorems, and quadratics. Show full working.",
      },
      english: {
        highPriority: [
          "literature_shakespeare_analysis", "literature_essay_writing",
          "writing_discursive_essay", "comprehension_evaluation_synthesis",
          "language_analysis_persuasive_techniques",
        ],
        examTips: "AQA: Paper 1 explorations in creative reading/writing. Paper 2 viewpoints and perspectives.",
      },
      science: {
        highPriority: [
          "atomic_structure_detail", "bonding_ionic_covalent",
          "rates_of_reaction", "organic_chemistry_hydrocarbons",
          "genetics_mitosis_meiosis", "genetics_Punnett_squares",
          "physics_motion_equations", "physics_momentum",
          "ecology_biodiversity_conservation",
          "homeostasis", "nervous_system",
        ],
        examTips: "Required practicals are heavily examined. Learn method, results, and evaluation.",
      },
    },
  },

  // ─── NIGERIAN WAEC/SSCE ─────────────────────────────────────────────
  "waec_ssce": {
    label: "WAEC Senior School Certificate Exam",
    targetYears: [10, 11, 12],
    curriculum: "ng_sss",
    subjects: {
      mathematics: {
        highPriority: [
          "algebra_quadratic_equations", "algebra_simultaneous_equations",
          "number_indices_laws", "number_logarithms", "number_surds_intro",
          "geometry_circle_theorems_full", "geometry_trigonometry_sine_cosine_rules",
          "statistics_standard_deviation", "statistics_distributions",
          "probability_conditional",
          "number_standard_form",
          "graphs_quadratic_cubic_reciprocal",
          "calculus_differentiation_intro",
          "percentages_compound_interest",
          "mensuration_area_volume",
        ],
        examTips: "WAEC Maths: 2 papers — objective (MCQ) and theory. Surds, indices, and logs are frequent.",
      },
      english: {
        highPriority: [
          "comprehension_evaluation_synthesis",
          "grammar_sentence_types_complex", "grammar_clause_analysis",
          "writing_analytical_essay", "writing_creative_prose",
          "vocabulary_academic_register",
          "literature_essay_writing",
          "spelling_advanced_patterns",
          "oral_english_consonants_vowels",
          "summary_writing",
          "letter_writing_formal_informal",
        ],
        examTips: "Paper 1: Essay. Paper 2: Comprehension. Paper 3: Oral English (stress/intonation).",
      },
      physics: {
        highPriority: [
          "motion_equations_suvat", "newton_laws_detail",
          "projectile_motion", "circular_motion",
          "electric_field_potential", "current_electricity_detail",
          "electromagnetic_induction", "wave_optics",
          "thermodynamics", "gas_laws", "nuclear_physics",
        ],
        examTips: "Theory + practical. Electricity and mechanics are most tested.",
      },
      chemistry: {
        highPriority: [
          "atomic_structure_electronic_config", "chemical_bonding_detail",
          "stoichiometry_mole_concept", "gas_laws_calculations",
          "redox_reactions", "electrochemistry",
          "organic_chemistry_alkanes_alkenes", "organic_chemistry_alcohols",
          "periodic_table_trends", "metals_extraction",
          "rates_of_reaction_factors", "equilibrium_le_chatelier",
        ],
        examTips: "Calculations (mole concept, gas laws) are heavily weighted. Organic chemistry is mandatory.",
      },
      biology: {
        highPriority: [
          "cell_structure_organelles", "ecology_populations_communities",
          "genetics_Mendelian", "genetics_variation_mutation",
          "evolution_evidence_mechanisms",
          "reproduction_human", "plant_biology_photosynthesis",
          "coordination_hormones", "diseases_immunity",
        ],
        examTips: "Genetics and ecology dominate. Diagrams must be well-labelled.",
      },
      economics: {
        highPriority: [
          "demand_supply", "market_structures", "national_income",
          "money_banking", "inflation_deflation", "international_trade",
          "fiscal_monetary_policy", "public_finance_taxation",
        ],
        examTips: "Theory of demand/supply and national income are most frequent. Use diagrams.",
      },
      government: {
        highPriority: [
          "political_concepts", "organs_of_government", "nigerian_federalism",
          "political_parties", "nigerian_constitution_history",
          "local_government", "international_organisations",
        ],
        examTips: "Nigerian political history and constitutional development are staples.",
      },
    },
  },

  // ─── NIGERIAN NECO ──────────────────────────────────────────────────
  "neco": {
    label: "NECO Senior School Certificate Exam",
    targetYears: [10, 11, 12],
    curriculum: "ng_sss",
    subjects: {
      mathematics: {
        highPriority: [
          "algebra_quadratic_equations", "algebra_simultaneous_equations",
          "number_indices_laws", "number_logarithms",
          "geometry_trigonometry_sine_cosine_rules",
          "statistics_standard_deviation",
          "number_standard_form", "number_surds_intro",
          "mensuration_area_volume",
        ],
        examTips: "Similar to WAEC but with different weighting. More emphasis on statistics.",
      },
    },
  },

  // ─── NIGERIAN COMMON ENTRANCE (Primary → JSS) ──────────────────────
  "ng_common_entrance": {
    label: "Nigerian Common Entrance Exam",
    targetYears: [5, 6],
    curriculum: "ng_primary",
    subjects: {
      mathematics: {
        highPriority: [
          "addition_subtraction_multi_step", "multiplication_long", "division_long",
          "fractions_adding_different_denominator", "fractions_of_amounts",
          "decimals_4_operations", "percentages_of_amounts",
          "money_calculations", "time_duration_calculation",
          "perimeter_rectangles", "area_rectangles", "volume_cubes_cuboids",
          "mean_average", "bar_charts", "pie_charts",
          "word_problems_money",
        ],
        examTips: "Speed-based MCQ. Arithmetic accuracy and word problems are key.",
      },
      english: {
        highPriority: [
          "comprehension_literal", "comprehension_inference",
          "grammar_nouns_expanded", "grammar_verbs_tenses_past_present",
          "spelling_homophones", "vocabulary_synonyms_antonyms",
          "writing_narrative_structure",
        ],
        examTips: "Focus on comprehension passages and grammar/vocabulary MCQs.",
      },
      science: {
        highPriority: [
          "human_body_digestion", "human_body_skeleton_muscles",
          "plants_life_cycle", "animals_food_chains",
          "electricity_simple_circuits", "forces_gravity_friction",
          "states_of_matter_solid_liquid_gas",
        ],
        examTips: "Basic science concepts. Living things and human body are most tested.",
      },
    },
  },

  // ─── UK SATs (Year 6 assessment) ────────────────────────────────────
  "uk_sats": {
    label: "UK Key Stage 2 SATs",
    targetYears: [6],
    subjects: {
      mathematics: {
        highPriority: [
          "fractions_adding_different_denominator", "fractions_multiplying",
          "fractions_dividing", "fractions_mixed_numbers",
          "decimals_4_operations", "decimals_rounding",
          "percentages_of_amounts", "ratio_introduction",
          "algebra_simple_equations", "algebra_expressions",
          "area_triangles", "area_compound_shapes", "volume_cubes_cuboids",
          "mean_average", "pie_charts", "coordinates_four_quadrants",
          "problem_solving_multi_step", "order_of_operations_BIDMAS",
        ],
        examTips: "Paper 1: Arithmetic (speed). Papers 2+3: Reasoning (multi-step problems).",
      },
      english: {
        highPriority: [
          "comprehension_inference_advanced", "comprehension_language_effects",
          "grammar_passive_active_voice", "grammar_subjunctive_mood",
          "grammar_semicolons_colons", "grammar_parenthesis_brackets_dashes",
          "spelling_challenging_words",
        ],
        examTips: "GPS paper tests grammar, punctuation, spelling. Reading paper requires inference + PEE.",
      },
    },
  },

  // ─── CANADIAN PROVINCIAL (Literacy/Numeracy assessments) ────────────
  "ca_assessments": {
    label: "Canadian Provincial Assessments",
    targetYears: [3, 6, 9],
    curriculum: "ca_primary",
    subjects: {
      mathematics: {
        highPriority: [
          "place_value_thousands", "fractions_identifying", "fractions_equivalent",
          "multiplication_tables_all_to_12", "division_exact",
          "measurement_converting_units", "perimeter_rectangles", "area_rectangles",
          "data_interpretation", "probability_simple",
        ],
        examTips: "Emphasises problem-solving and mathematical reasoning over pure calculation.",
      },
    },
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
// PER-YEAR GRANULAR TOPIC EXPANSIONS
// Provides year-specific breakdowns for more precise question targeting
// ═══════════════════════════════════════════════════════════════════════════════

export const YEAR_TOPICS = {
  // ─── UK National Curriculum — Mathematics per year ──────────────────
  uk_national: {
    mathematics: {
      1: [
        "counting_to_20", "counting_to_100", "number_bonds_to_10", "number_bonds_to_20",
        "addition_within_10", "addition_within_20", "subtraction_within_10", "subtraction_within_20",
        "comparing_numbers", "place_value_tens_ones", "2d_shapes_naming", "3d_shapes_naming",
        "measuring_length_cm", "measuring_weight_kg", "telling_time_oclock", "telling_time_half_past",
        "coins_and_notes", "position_and_direction",
      ],
      2: [
        "counting_in_2s_5s_10s", "addition_within_100", "subtraction_within_100",
        "ordering_numbers_to_100", "multiplication_by_2", "multiplication_by_5", "multiplication_by_10",
        "halving_numbers", "doubling_numbers", "sharing_equally",
        "fractions_identifying", "symmetry_lines", "measuring_capacity_litres",
        "telling_time_quarter_past", "making_amounts_money",
        "tally_charts", "pictograms", "bar_charts_simple",
        "number_patterns_sequences", "odd_and_even_numbers", "turns_quarter_half_full",
      ],
      3: [
        "addition_3digit", "subtraction_3digit", "multiplication_tables_2_3_4_5_8_10",
        "multiplication_2digit_by_1digit", "division_exact", "division_facts",
        "place_value_hundreds", "rounding_to_nearest_10_100",
        "fractions_identifying", "fractions_equivalent", "fractions_on_number_line",
        "fractions_adding_same_denominator",
        "telling_time_5_minutes", "time_duration_calculation",
        "perimeter_rectangles", "angles_right_acute_obtuse",
        "2d_shapes_properties", "3d_shapes_properties",
        "bar_charts", "tables_and_timetables",
        "measurement_converting_units",
      ],
      4: [
        "addition_with_regrouping", "subtraction_with_regrouping",
        "multiplication_tables_all_to_12", "multiplication_2digit_by_2digit",
        "division_with_remainders",
        "place_value_thousands", "negative_numbers_intro", "roman_numerals",
        "fractions_comparing", "fractions_subtracting_same_denominator", "fractions_of_amounts",
        "decimals_tenths", "decimals_hundredths", "decimals_ordering",
        "money_calculations", "money_making_change",
        "telling_time_to_minute", "time_24hour_clock", "time_converting_units",
        "area_counting_squares", "area_rectangles", "angles_measuring_degrees",
        "lines_of_symmetry", "coordinates_first_quadrant",
        "line_graphs_intro", "number_sequences_rules", "input_output_machines",
      ],
      5: [
        "addition_subtraction_multi_step", "multiplication_long",
        "order_of_operations_BIDMAS", "factors_and_multiples", "prime_numbers",
        "square_numbers", "cube_numbers",
        "fractions_adding_different_denominator", "fractions_multiplying",
        "fractions_mixed_numbers", "fractions_improper",
        "decimals_4_operations", "decimals_rounding",
        "percentages_of_amounts", "percentages_fractions_decimals_converting",
        "algebra_simple_equations", "algebra_expressions",
        "area_triangles", "area_parallelograms",
        "angles_in_triangle", "angles_on_straight_line", "angles_around_point",
        "translation", "reflection",
        "mean_average", "data_interpretation",
        "imperial_metric_converting",
      ],
      6: [
        "division_long", "negative_numbers_all_operations",
        "fractions_dividing", "decimals_to_fractions",
        "percentages_increase_decrease",
        "ratio_introduction", "ratio_simplifying", "proportion_word_problems",
        "algebra_formulae", "algebra_sequences_nth_term", "algebra_function_machines",
        "area_compound_shapes", "volume_cubes_cuboids", "surface_area_intro",
        "angles_in_quadrilateral", "missing_angles",
        "coordinates_four_quadrants", "rotation",
        "nets_of_3d_shapes", "circles_circumference_intro",
        "median_mode_range", "pie_charts",
        "probability_simple", "probability_experiments",
        "speed_distance_time_intro", "problem_solving_multi_step", "word_problems_money",
      ],
    },
    english: {
      1: [
        "phonics_cvc_words", "phonics_digraphs", "sight_words_common",
        "reading_simple_sentences", "capital_letters_full_stops",
        "nouns_common", "verbs_action", "writing_sentences",
        "spelling_common_words", "handwriting_formation",
      ],
      2: [
        "phonics_blends", "question_marks_exclamation",
        "adjectives_describing", "singular_plural", "conjunctions_and_but_or",
        "vocabulary_everyday_words", "vocabulary_opposites",
        "sequencing_events", "comprehension_literal_simple",
        "spelling_patterns_ee_oo_ai", "reading_fiction_simple", "reading_nonfiction_simple",
      ],
      3: [
        "grammar_nouns_expanded", "grammar_verbs_tenses_past_present",
        "grammar_prepositions", "grammar_conjunctions_expanded",
        "grammar_paragraphs", "comprehension_literal",
        "spelling_prefixes_un_dis_mis", "spelling_suffixes_ed_ing_ly",
        "vocabulary_word_families", "writing_narrative_structure",
        "poetry_rhyme_rhythm", "reading_fiction_characters",
      ],
      4: [
        "grammar_adjectives_adverbs", "grammar_pronouns",
        "grammar_articles_determiners", "grammar_apostrophes_possession",
        "grammar_commas_in_lists", "grammar_direct_speech",
        "grammar_fronted_adverbials",
        "comprehension_inference", "comprehension_vocabulary_context",
        "comprehension_prediction", "comprehension_summarising",
        "spelling_homophones", "spelling_silent_letters",
        "vocabulary_synonyms_antonyms",
        "writing_persuasion_basic", "writing_instructions", "writing_letter_writing",
        "poetry_simile_metaphor", "reading_nonfiction_features",
      ],
      5: [
        "grammar_modal_verbs", "grammar_relative_clauses",
        "grammar_passive_active_voice", "grammar_parenthesis_brackets_dashes",
        "comprehension_inference_advanced", "comprehension_themes",
        "comprehension_language_effects",
        "spelling_word_origins_etymology",
        "vocabulary_figurative_language", "vocabulary_technical_terms",
        "writing_narrative_advanced", "writing_persuasive_argument",
        "writing_balanced_argument", "writing_descriptive_writing",
        "poetry_analysis", "literature_character_analysis",
        "literature_plot_structure",
      ],
      6: [
        "grammar_subjunctive_mood", "grammar_semicolons_colons",
        "grammar_ellipsis", "grammar_formal_informal_register",
        "comprehension_comparison", "comprehension_evaluating_texts",
        "comprehension_bias_perspective",
        "spelling_challenging_words",
        "vocabulary_shades_of_meaning",
        "writing_formal_letter", "writing_report_writing",
        "poetry_forms_sonnet_haiku",
        "literature_setting_atmosphere", "literature_themes_messages",
        "reading_comparing_texts", "reading_evaluating_reliability",
      ],
    },
  },

  // ─── Nigerian SSS — per year (SSS1=Y10, SSS2=Y11, SSS3=Y12) ───────
  ng_sss: {
    mathematics: {
      1: [ // SSS1
        "number_indices_laws", "number_standard_form", "number_logarithms",
        "algebra_expanding_brackets", "algebra_factorising",
        "algebra_linear_equations", "algebra_simultaneous_equations",
        "geometry_pythagoras_theorem", "geometry_trigonometry_intro",
        "statistics_frequency_tables", "statistics_histograms",
        "fractions_algebraic", "ratio_dividing_quantities",
      ],
      2: [ // SSS2
        "algebra_quadratic_equations", "algebra_completing_the_square",
        "geometry_circle_theorems_full", "geometry_trigonometry_sine_cosine_rules",
        "percentages_compound_interest", "percentages_reverse",
        "probability_combined_events", "probability_tree_diagrams",
        "number_surds_intro", "proportion_direct_inverse",
        "statistics_cumulative_frequency",
        "graphs_quadratic_cubic_reciprocal",
      ],
      3: [ // SSS3 (exam prep year)
        "algebra_quadratic_formula", "algebra_functions_composite_inverse",
        "geometry_vectors", "geometry_3d_trigonometry",
        "statistics_standard_deviation",
        "probability_conditional",
        "calculus_differentiation_intro", "calculus_integration_intro",
        "number_exponentials",
        "graphs_transformations",
        "mensuration_area_volume",
      ],
    },
    physics: {
      1: [
        "measurement_units", "speed_velocity_acceleration",
        "forces_equilibrium", "work_energy_power",
        "simple_machines", "heat_temperature",
      ],
      2: [
        "pressure_solids_liquids_gases", "waves_sound_light",
        "electric_field_potential", "current_electricity_detail",
        "electromagnetic_induction",
      ],
      3: [
        "motion_equations_suvat", "newton_laws_detail",
        "projectile_motion", "circular_motion",
        "nuclear_physics", "wave_optics",
        "thermodynamics", "gas_laws", "gravitational_field",
      ],
    },
    chemistry: {
      1: [
        "states_of_matter_particles", "elements_mixtures_compounds",
        "separation_techniques", "atomic_structure_basic",
        "chemical_symbols_equations", "acids_bases_salts",
      ],
      2: [
        "atomic_structure_electronic_config", "chemical_bonding_detail",
        "stoichiometry_mole_concept", "gas_laws_calculations",
        "periodic_table_trends",
      ],
      3: [
        "redox_reactions", "electrochemistry",
        "organic_chemistry_alkanes_alkenes", "organic_chemistry_alcohols",
        "rates_of_reaction_factors", "equilibrium_le_chatelier",
        "metals_extraction", "chemistry_quantitative",
      ],
    },
    biology: {
      1: [
        "cell_structure_organelles", "diffusion_osmosis",
        "nutrition_enzymes", "transport_in_organisms",
      ],
      2: [
        "respiration_aerobic_anaerobic", "excretion",
        "ecology_populations_communities", "ecology_nutrient_cycles",
        "reproduction_human",
      ],
      3: [
        "genetics_Mendelian", "genetics_variation_mutation",
        "evolution_evidence_mechanisms", "biotechnology",
        "plant_biology_photosynthesis",
        "coordination_hormones", "diseases_immunity",
        "classification_taxonomy",
      ],
    },
    economics: {
      1: ["demand_supply", "market_structures", "money_banking"],
      2: ["national_income", "inflation_deflation", "public_finance_taxation"],
      3: ["international_trade", "economic_development", "fiscal_monetary_policy", "balance_of_payments"],
    },
    government: {
      1: ["political_concepts", "organs_of_government", "nigerian_federalism"],
      2: ["political_parties", "pressure_groups", "local_government"],
      3: ["military_in_politics", "international_organisations", "nigerian_constitution_history", "foreign_policy"],
    },
    commerce: {
      1: ["trade_types", "aids_to_trade", "business_organisations"],
      2: ["insurance_principles", "banking_services", "stock_exchange"],
      3: ["advertising_marketing", "warehousing", "transportation"],
    },
  },

  // ─── Nigerian JSS — per year (JSS1=Y7, JSS2=Y8, JSS3=Y9) ─────────
  ng_jss: {
    mathematics: {
      1: [ // JSS1
        "algebra_expanding_brackets", "algebra_linear_equations",
        "number_HCF_LCM", "number_prime_factorisation",
        "fractions_algebraic", "ratio_dividing_quantities",
        "area_circles", "volume_prisms",
        "real_life_graphs",
      ],
      2: [ // JSS2
        "algebra_factorising", "algebra_simultaneous_equations",
        "algebra_inequalities", "algebra_sequences_quadratic",
        "geometry_pythagoras_theorem", "geometry_bearings",
        "geometry_constructions",
        "probability_combined_events",
        "statistics_frequency_tables", "statistics_scatter_graphs",
      ],
      3: [ // JSS3
        "algebra_quadratic_expressions",
        "geometry_trigonometry_intro", "geometry_congruence_similarity",
        "transformations_enlargement", "transformations_combined",
        "volume_cylinders", "probability_tree_diagrams",
        "statistics_histograms", "statistics_cumulative_frequency",
        "distance_time_graphs", "speed_calculations",
        "number_indices_laws", "number_standard_form",
      ],
    },
    science: {
      1: [
        "cells_plant_animal", "organ_systems_overview",
        "particles_model", "atoms_elements_compounds",
        "forces_speed_acceleration", "energy_stores_transfers",
      ],
      2: [
        "cells_specialised", "digestive_system_detail",
        "respiratory_system", "chemical_reactions_intro",
        "acids_alkalis_pH", "waves_transverse_longitudinal",
        "electricity_current_voltage_resistance",
      ],
      3: [
        "circulatory_system_detail", "genetics_DNA_intro",
        "ecology_ecosystems", "ecology_food_webs",
        "periodic_table_groups", "metals_nonmetals",
        "forces_pressure", "energy_conservation",
        "electromagnetic_spectrum", "magnetism_electromagnets",
        "earth_structure_tectonic_plates", "rock_cycle",
      ],
    },
    english: {
      1: [
        "grammar_sentence_types_complex", "comprehension_nonfiction_analysis",
        "vocabulary_academic_register", "writing_creative_prose",
      ],
      2: [
        "grammar_clause_analysis", "writing_analytical_essay",
        "comprehension_media_texts", "vocabulary_connotation_denotation",
      ],
      3: [
        "writing_speech_writing", "literature_novel_study",
        "literature_poetry_unseen", "reading_viewpoint_analysis",
        "reading_rhetorical_devices", "spelling_advanced_patterns",
      ],
    },
  },

  // ─── Nigerian Primary — per year ───────────────────────────────────
  ng_primary: {
    mathematics: {
      1: ["counting_to_20", "counting_to_100", "number_bonds_to_10", "addition_within_10", "subtraction_within_10", "2d_shapes_naming", "measuring_length_cm"],
      2: ["number_bonds_to_20", "addition_within_20", "subtraction_within_20", "counting_in_2s_5s_10s", "multiplication_by_2", "telling_time_oclock", "coins_and_notes"],
      3: ["addition_3digit", "subtraction_3digit", "multiplication_tables_2_3_4_5_8_10", "division_exact", "fractions_identifying", "telling_time_5_minutes", "bar_charts"],
      4: ["multiplication_2digit_by_2digit", "division_with_remainders", "fractions_equivalent", "decimals_tenths", "money_calculations", "perimeter_rectangles", "area_counting_squares"],
      5: ["multiplication_long", "fractions_adding_different_denominator", "decimals_4_operations", "percentages_of_amounts", "area_rectangles", "mean_average", "word_problems_money"],
      6: ["division_long", "ratio_introduction", "algebra_simple_equations", "volume_cubes_cuboids", "probability_simple", "pie_charts", "problem_solving_multi_step"],
    },
    english: {
      1: ["phonics_cvc_words", "sight_words_common", "capital_letters_full_stops", "nouns_common", "writing_sentences"],
      2: ["phonics_digraphs", "adjectives_describing", "singular_plural", "vocabulary_everyday_words", "reading_simple_sentences"],
      3: ["grammar_nouns_expanded", "grammar_verbs_tenses_past_present", "comprehension_literal", "spelling_prefixes_un_dis_mis", "writing_narrative_structure"],
      4: ["grammar_pronouns", "grammar_apostrophes_possession", "comprehension_inference", "spelling_homophones", "writing_letter_writing"],
      5: ["grammar_modal_verbs", "grammar_passive_active_voice", "comprehension_inference_advanced", "vocabulary_figurative_language", "writing_persuasive_argument"],
      6: ["grammar_semicolons_colons", "comprehension_comparison", "comprehension_evaluating_texts", "writing_formal_letter", "reading_comparing_texts"],
    },
    science: {
      1: ["living_nonliving_things", "human_body_parts", "senses_five"],
      2: ["animal_types_mammals_birds_fish", "plants_parts_roots_stem_leaf", "everyday_materials_wood_metal_plastic"],
      3: ["plants_life_cycle", "animals_food_chains", "light_sources_shadows", "forces_gravity_friction"],
      4: ["human_body_skeleton_muscles", "human_body_digestion", "electricity_simple_circuits", "states_of_matter_solid_liquid_gas"],
      5: ["earth_and_space_solar_system", "forces_gravity_weight", "properties_of_materials_dissolving", "electricity_series_parallel"],
      6: ["evolution_adaptation", "human_body_circulatory_system", "classification_microorganisms", "reproduction_plants_animals"],
    },
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Get exam focus topics for a curriculum + subject + year
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns high-priority topics for a given exam context.
 * Falls back to all topics if no specific exam focus is defined.
 */
export function getExamFocusTopics(examKey, subject) {
  const exam = EXAM_FOCUS[examKey];
  if (!exam?.subjects?.[subject]) return null;
  return exam.subjects[subject].highPriority || null;
}

/**
 * Returns per-year topics for a curriculum + subject + year.
 * Falls back to null if not defined (caller should use topicDefinitions.js).
 */
export function getYearTopics(curriculum, subject, year) {
  return YEAR_TOPICS[curriculum]?.[subject]?.[year] || null;
}

/**
 * Map a curriculum to its relevant exam focus keys.
 */
export function getExamsForCurriculum(curriculum) {
  const mapping = {
    uk_11plus: ["uk_11plus"],
    uk_national: ["uk_sats", "uk_gcse"],
    ng_sss: ["waec_ssce", "neco"],
    ng_jss: [],
    ng_primary: ["ng_common_entrance"],
    ca_primary: ["ca_assessments"],
    us_common_core: [],
    au_national: [],
    ib_pyp: [],
    ib_myp: [],
  };
  return mapping[curriculum] || [];
}
