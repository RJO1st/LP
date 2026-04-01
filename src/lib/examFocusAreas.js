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

// ═══════════════════════════════════════════════════════════════════════════════
// ASSESSMENT TARGETS — Granular "I can..." skill statements per year/strand
// Based on UK National Curriculum Maths Assessment Targets (Twinkl reference)
// ═══════════════════════════════════════════════════════════════════════════════

export const ASSESSMENT_TARGETS = {
  mathematics: {
    1: {
      number_and_place_value: [
        "I can count to and across 100, forwards and backwards, beginning from any given number",
        "I can count to 100 in multiples of 5",
        "I can read and write numbers from 1 to 20 in digits and words",
        "I can count, read and write numbers to 100",
        "I can count to 100 in multiples of 2",
        "I can identify one more and one less of a given number",
      ],
      addition_and_subtraction: [
        "I can read, write and interpret mathematical statements with +, - and = signs",
        "I can add and subtract two-digit numbers to 20",
        "I can solve one step problems that involve addition",
        "I can represent and use number bonds to 20",
        "I can show and use subtraction facts to 20",
        "I can solve one-step problems involving subtraction",
      ],
      multiplication_and_division: [
        "I can double single-digit numbers",
        "I can complete simple number patterns",
        "I can count in twos, fives and tens",
        "I can solve one-step problems involving multiplication",
        "I can show multiplication using arrays",
        "I can solve one-step problems involving division",
      ],
      fractions: [
        "I can recognise, find and name a half of a shape",
        "I can recognise, find and name a quarter of an object",
        "I can solve simple half and quarter problems",
        "I can recognise, find and name a quarter of a shape",
        "I can recognise, find and name a half of an object",
        "I can recognise, find and name a quarter of a quantity",
        "I can find, name and write fractions of a set of objects",
      ],
      measurement: [
        "I can compare, describe and solve problems involving measures",
        "I can measure and begin to record lengths and heights",
        "I can measure and begin to record time (hours, minutes, seconds)",
        "I can tell the time to the hour and half past the hour",
        "I can recognise and know the value of different denominations of coins and notes",
        "I can measure and begin to record capacity and volume",
        "I can recognise and use language relating to dates, including days of the week, weeks, months and years",
      ],
      geometry: [
        "I can use mathematical vocabulary to describe position, direction and movement",
        "I can identify and describe the properties of 2D shapes",
        "I can identify 2D shapes on the surface of 3D shapes",
        "I can compare and sort common 2D and 3D shapes",
        "I can identify lines of symmetry in 2D shapes",
        "I can order and arrange combinations of objects in patterns",
        "I can identify and describe the properties of 3D shapes",
      ],
    },
    2: {
      number_and_place_value: [
        "I can use place value and number facts to solve problems",
        "I can count forwards and backwards in twos, threes, fives and tens from any numbers",
        "I can compare and order numbers 0 to 100",
        "I can use the signs: < , > and =",
        "I know the place value of each digit in a two-digit number",
        "I can read and write numbers to at least 100 in words and numerals",
        "I can identify, represent and estimate numbers",
      ],
      addition_and_subtraction: [
        "I can recognise and use inverse relationships between addition and subtraction",
        "I can apply mental strategies to problems",
        "I can add and subtract two-digit numbers and ones and tens",
        "I can add and subtract two-digit numbers and tens and twos, two-digit numbers",
        "I can apply written strategies to problems",
        "I can show that addition can be done in any order, subtraction can't",
        "I can recall and use addition and subtraction facts to 20 and use numbers facts to 100",
      ],
      multiplication_and_division: [
        "I can solve one step problems involving multiplication and division",
        "I can recognise odd and even numbers",
        "I can recognise and use inverse relationship between multiplication and division",
        "I can show that multiplication of two numbers can be done in any order",
        "I can calculate mathematical statements for division (within the multiplication tables)",
        "I know that division of 1 number by another cannot be done in any order",
        "I can calculate mathematical statements for multiplication (within the multiplication tables)",
      ],
      fractions: [
        "I can solve simple problems involving fractions",
        "I can recognise, find, name and write fractions of a length",
        "I can recognise, find, name and write fractions of a quantity",
        "I can write simple fractions and recognise equivalence",
        "I can recognise, find, name and write fractions of a shape",
        "I can count in fractions up to 10 starting from any number",
        "I can find, name and write fractions of a set of objects",
      ],
      measurement: [
        "I can tell and write the time to the nearest 5 minutes",
        "I can use different equipment to measure lengths accurately",
        "I can use symbols for pounds and pence",
        "I can solve simple money problems in a practical context",
        "I can compare and order length, mass, volume/capacity and record the results using >, < and =",
        "I can compare and sequence intervals of time",
        "I can read relevant scales to the nearest numbered unit",
      ],
      geometry: [
        "I can use mathematical vocabulary to describe position, direction and movement",
        "I can identify and describe the properties of 2D shapes",
        "I can identify 2D shapes on the surface of 3D shapes",
        "I can compare and sort common 2D and 3D shapes",
        "I can identify lines of symmetry in 2D shapes",
        "I can order and arrange combinations of objects in patterns",
        "I can identify and describe the properties of 3D shapes",
      ],
      statistics: [
        "I can ask and answer questions about totalling and comparing categorical data",
        "I can interpret and construct simple pictograms",
        "I can interpret and construct simple tables",
        "I can ask and answer simple questions by sorting categories by quantity",
        "I can interpret and construct simple tally charts",
        "I can ask and answer questions about totalling",
        "I can interpret and construct simple block diagrams",
      ],
    },
    3: {
      number_and_place_value: [
        "I can count from 0 in multiples of 4, 8, 50 and 100; find 10 or 100 more or less than a given number",
        "I can recognise the place value of each digit in a three-digit number (hundreds, tens, ones)",
        "I can compare and order numbers up to 1000",
        "I can identify, represent and estimate numbers using different representations",
        "I can read and write numbers up to 1000 in numerals and in words",
        "I can solve number problems and practical problems involving these ideas",
      ],
      addition_and_subtraction: [
        "I can add and subtract numbers mentally, including a three-digit number and ones, and a three-digit number and tens",
        "I can add and subtract numbers with up to three digits, using formal written methods of columnar addition and subtraction",
        "I can estimate the answer to a calculation and use inverse operations to check answers",
      ],
      multiplication_and_division: [
        "I can recall and use multiplication and division facts for the 3, 4 and 8 multiplication tables",
        "I can write and calculate mathematical statements for multiplication and division using the multiplication tables that they know",
        "I can solve problems, including missing number problems, involving multiplication and division",
      ],
      fractions: [
        "I can count up and down in tenths; recognise that tenths arise from dividing an object into 10 equal parts",
        "I can recognise, find and write fractions of a discrete set of objects: unit fractions and non-unit fractions with small denominators",
        "I can recognise and use fractions as numbers: unit fractions and non-unit fractions with small denominators",
        "I can recognise and show, using diagrams, equivalent fractions with small denominators",
        "I can add and subtract fractions with the same denominator within one whole",
        "I can compare and order unit fractions, and fractions with the same denominators",
        "I can solve problems that involve all of the above",
      ],
      measurement: [
        "I can measure, compare, add and subtract lengths (m/cm/mm), mass (kg/g), volume/capacity (l/ml)",
        "I can measure the perimeter of simple 2D shapes",
        "I can add and subtract amounts of money to give change, using both £ and p in practical contexts",
        "I can tell and write the time from an analogue clock, including using Roman numerals from I to XII",
        "I can estimate and read time with increasing accuracy to the nearest minute",
        "I can know the number of seconds in a minute and the number of days in each month, year and leap year",
        "I can compare durations of events",
      ],
      geometry: [
        "I can draw 2D shapes and make 3D shapes using modelling materials",
        "I can recognise angles as a property of shape or a description of a turn",
        "I can identify right angles, recognise that two right angles make a half-turn, three make three quarters of a turn and four a complete turn",
        "I can identify horizontal and vertical lines and pairs of perpendicular and parallel lines",
      ],
      statistics: [
        "I can interpret and present data using bar charts, pictograms and tables",
        "I can solve one-step and two-step questions using information presented in scaled bar charts and pictograms and tables",
      ],
    },
    4: {
      number_and_place_value: [
        "I can read, write, order and compare numbers up to at least 1,000 and determine the value of each digit",
        "I can round any number to the nearest 10, 100 or 1,000",
        "I can count backwards through zero to include negative numbers",
        "I can find 1,000 more or less than a given number",
        "I can recognise the place value of each digit in a four-digit number",
        "I can read Roman numerals to 100 and know that over time the numeral system changed",
      ],
      addition_and_subtraction: [
        "I can add and subtract numbers with up to 4 digits using formal written methods of columnar addition and subtraction where appropriate",
        "I can solve addition and subtraction two-step problems in contexts",
        "I can estimate and use inverse operations to check answers to a calculation",
      ],
      multiplication_and_division: [
        "I can use place value, known and derived facts to multiply and divide mentally, including multiplying by 0 and 1 and dividing by 1",
        "I can recall multiplication and division facts for multiplication tables up to 12 × 12",
        "I can multiply two-digit and three-digit numbers by a one-digit number using formal written layout",
        "I can recognise and use factor pairs and commutativity in mental calculations",
      ],
      fractions: [
        "I can recognise and show, using diagrams, families of common equivalent fractions",
        "I can add and subtract fractions with the same denominator",
        "I can recognise and write decimal equivalents of any number of tenths or hundredths",
        "I can round decimals with one decimal place to the nearest whole number",
        "I can solve problems involving increasingly harder fractions to calculate quantities",
      ],
      measurement: [
        "I can convert between different units of measure (e.g. kilometre to metre; hour to minute)",
        "I can find the area of rectilinear shapes by counting squares",
        "I can estimate, compare and calculate different measures",
        "I can read, write and convert time between analogue and digital 12- and 24-hour clocks",
        "I can solve problems involving converting from hours to minutes; minutes to seconds; years to months; weeks to days",
      ],
      geometry: [
        "I can compare and classify geometric shapes, including quadrilaterals and triangles, based on their properties and sizes",
        "I can identify acute and obtuse angles and compare and order angles up to two right angles by size",
        "I can identify lines of symmetry in 2D shapes presented in different orientations",
        "I can describe positions on a 2D grid as coordinates in the first quadrant",
        "I can describe movements between positions as translations of a given unit to the left/right and up/down",
        "I can complete a simple symmetric figure with respect to a specific line of symmetry",
      ],
      statistics: [
        "I can interpret and present discrete and continuous data using appropriate graphical methods",
        "I can solve comparison, sum and difference problems using information presented in bar charts, pictograms, tables and other graphs",
      ],
    },
    5: {
      number_and_place_value: [
        "I can read, write, order and compare numbers to at least 1,000,000 and determine the value of each digit",
        "I can round any number up to 1,000,000 to the nearest 10, 100, 1,000, 10,000 and 100,000",
        "I can interpret negative numbers in context, count forwards and backwards with positive and negative whole numbers including through zero",
        "I can read Roman numerals to 1000 (M) and recognise years written in Roman numerals",
      ],
      addition_and_subtraction: [
        "I can add and subtract whole numbers with more than 4 digits using formal written methods",
        "I can add and subtract numbers mentally with increasingly large numbers",
        "I can use rounding to check answers to calculations and determine levels of accuracy",
        "I can solve addition and subtraction multi-step problems in contexts, deciding which operations to use and why",
      ],
      multiplication_and_division: [
        "I can identify multiples and factors, including finding all factor pairs of a number and common factors of two numbers",
        "I can multiply numbers up to 4 digits by a one or two-digit number using formal written methods",
        "I can divide numbers up to 4 digits by a one-digit number using short division",
        "I can multiply and divide by 10, 100 and 1000",
        "I can recognise and use square numbers and cube numbers and the notation for squared and cubed",
        "I can know and use the vocabulary of prime numbers, prime factors and composite numbers",
        "I can solve problems involving multiplication and division, including using knowledge of factors and multiples, squares and cubes",
      ],
      fractions: [
        "I can read and write decimal numbers as fractions",
        "I can add and subtract fractions with the same denominator and denominators that are multiples of the same number",
        "I can multiply proper fractions and mixed numbers by whole numbers",
        "I can recognise mixed numbers and improper fractions and convert from one form to the other",
        "I can compare and order fractions whose denominators are all multiples of the same number",
        "I can recognise the per cent symbol (%) and relate to fractions and decimals",
        "I can solve problems which require knowing percentage and decimal equivalents",
      ],
      measurement: [
        "I can convert between different units of metric measure and know the approximate equivalences between metric and imperial units",
        "I can estimate volume and capacity",
        "I can use all four operations to solve problems involving measure using decimal notation",
        "I can calculate the perimeter and area of rectangles",
        "I can measure and calculate the perimeter of composite rectilinear shapes in cm and m",
      ],
      geometry: [
        "I can identify 3D shapes, including cubes and other cuboids, from 2D representations",
        "I can know angles are measured in degrees: estimate and compare acute, obtuse and reflex angles",
        "I can draw given angles and measure them in degrees",
        "I can identify angles at a point and one whole turn, angles at a point on a straight line and vertically opposite angles",
        "I can use the properties of rectangles to deduce related facts and find missing lengths and angles",
        "I can distinguish between regular and irregular polygons based on reasoning about equal sides and angles",
      ],
      statistics: [
        "I can solve comparison, sum and difference problems using information presented in a line graph",
        "I can complete, read and interpret information in tables, including timetables",
      ],
    },
    6: {
      number_and_place_value: [
        "I can read, write, order and compare numbers up to 10,000,000 and determine the value of each digit",
        "I can round any whole number to a required degree of accuracy",
        "I can use negative numbers in context, and calculate intervals across zero",
      ],
      addition_subtraction_multiplication_division: [
        "I can solve addition and subtraction multi-step problems in contexts",
        "I can use my knowledge of the order of operations to carry out calculations involving the four operations",
        "I can perform mental calculations",
        "I can multiply multi-digit numbers up to 4 digits by a two-digit whole number",
        "I can divide numbers up to 4 digits by a two-digit whole number using short division",
        "I can divide numbers up to 4 digits by a two-digit whole number using long division",
        "I can identify common factors, common multiples and prime numbers",
        "I can use estimation to check answers to calculations and determine levels of accuracy",
      ],
      fractions: [
        "I can multiply simple pairs of proper fractions, writing the answer in its simplest form",
        "I can divide proper fractions by whole numbers",
        "I can add and subtract fractions with different denominators and mixed numbers",
        "I can use common factors to simplify fractions",
        "I can use common multiples to express fractions in the same denomination",
        "I can associate a fraction with division and calculate decimal fraction equivalents for a simple fraction",
        "I can compare and order fractions",
      ],
      ratio_and_proportion: [
        "I can solve problems involving the calculation of percentages and the use of percentages for comparison",
        "I can solve problems involving unequal sharing and grouping using knowledge of fractions and multiples",
        "I can solve problems involving the relative sizes of two quantities",
        "I can solve problems involving similar shapes where the scale factor is known or can be found",
      ],
      algebra: [
        "I can generate and describe linear number sequences",
        "I can enumerate possibilities of combinations of two variables",
        "I can express missing number problems algebraically",
        "I can find pairs of numbers that satisfy an equation with two unknowns",
        "I can use simple formulae",
      ],
      measurement: [
        "I can recognise that shapes with the same areas can have different perimeters and vice versa",
        "I can calculate the area of parallelograms and triangles",
        "I can recognise when it is possible to use formulae for area and volume of shapes",
        "I can calculate, estimate and compare volume of cubes and cuboids using standard units",
        "I can use, read, write and convert between standard units",
        "I can convert between miles and kilometres",
        "I can solve problems involving the calculation and conversion of units of measure",
      ],
      geometry: [
        "I can know that the diameter of a circle is twice the radius",
        "I can recognise, describe and build simple 3D shapes, including making nets",
        "I can illustrate and name parts of circles, including radius, diameter and circumference",
        "I can draw 2D shapes using given dimensions and angles",
        "I can compare and classify geometric shapes based on their properties and sizes",
        "I can find unknown angles in any triangles, quadrilaterals and regular polygons",
        "I can recognise angles where they meet at a point",
      ],
      statistics: [
        "I can interpret and construct pie charts and use them to solve problems",
        "I can interpret and construct line graphs and use them to solve problems",
        "I can calculate and interpret the mean as an average",
      ],
    },
    7: {
      number_operations: [
        "I can carry out operations with integers and decimals",
        "I can multiply and divide by powers of 10",
        "I can round numbers to decimal places and significant figures",
        "I can perform calculations with fractions and mixed numbers",
        "I can order, compare and estimate numbers",
      ],
      algebra_basics: [
        "I can use symbols to represent unknown numbers",
        "I can form and solve simple linear equations",
        "I can understand and create sequences",
        "I can substitute values into algebraic expressions",
        "I can simplify algebraic expressions by collecting like terms",
      ],
      ratio_and_proportion_intro: [
        "I can understand and use ratios",
        "I can simplify ratios and scale quantities",
        "I can solve problems involving direct proportion",
        "I can use ratio in practical contexts",
        "I can compare quantities using ratios and fractions",
      ],
      geometry_angles_and_shapes: [
        "I can identify properties of 2D and 3D shapes",
        "I can calculate angles in straight lines and around points",
        "I can describe and name angles",
        "I can identify parallel and perpendicular lines",
        "I can draw and measure angles accurately",
      ],
      statistics_and_probability: [
        "I can collect, organize and interpret data",
        "I can construct and interpret pie charts and bar charts",
        "I can understand probability as a measure of likelihood",
        "I can calculate simple probabilities",
        "I can use two-way tables",
      ],
    },
    8: {
      fractions_decimals_percentages: [
        "I can convert between fractions, decimals and percentages",
        "I can find fractions and percentages of quantities",
        "I can calculate percentage change and reverse percentages",
        "I can perform calculations with fractions",
        "I can order fractions, decimals and percentages",
      ],
      equations_and_sequences: [
        "I can solve linear equations with variables on one side",
        "I can solve linear equations with variables on both sides",
        "I can identify and continue number sequences",
        "I can find the nth term of linear sequences",
        "I can set up and solve equations from problem contexts",
      ],
      geometry_transformations: [
        "I can describe translations, rotations and reflections",
        "I can perform transformations of shapes",
        "I can identify congruent shapes",
        "I can introduce Pythagoras' theorem",
        "I can calculate angles in triangles and parallel lines",
      ],
      statistics: [
        "I can calculate and compare averages (mean, median, mode, range)",
        "I can interpret frequency tables and histograms",
        "I can construct and read scatter graphs",
        "I can identify correlation between variables",
        "I can represent data in appropriate formats",
      ],
      probability: [
        "I can calculate probabilities of simple and compound events",
        "I can use frequency trees and sample space diagrams",
        "I can understand independent and dependent events",
        "I can perform probability calculations",
        "I can interpret probability in practical contexts",
      ],
    },
    9: {
      indices_and_standard_form: [
        "I can understand and use laws of indices",
        "I can write numbers in standard form",
        "I can calculate with numbers in standard form",
        "I can use indices and powers",
        "I can perform calculations involving surds",
      ],
      graphs_and_functions: [
        "I can plot and interpret graphs of linear equations",
        "I can find gradients and y-intercepts",
        "I can plot and interpret quadratic and cubic graphs",
        "I can solve equations graphically",
        "I can describe and draw graphs from equations",
      ],
      trigonometry_intro: [
        "I can use trigonometric ratios in right triangles",
        "I can calculate unknown sides and angles",
        "I can apply trigonometry to problem solving",
        "I can understand and use trigonometric functions",
        "I can solve problems in 3D using trigonometry",
      ],
      probability: [
        "I can use tree diagrams and two-way tables for probability",
        "I can calculate conditional probabilities",
        "I can understand independent and mutually exclusive events",
        "I can solve complex probability problems",
        "I can use probability in practical contexts",
      ],
      constructions_and_loci: [
        "I can construct triangles and other shapes accurately",
        "I can construct perpendicular and angle bisectors",
        "I can construct the locus of points at given distances",
        "I can combine constructions to solve problems",
        "I can identify regions satisfying inequalities",
      ],
    },
    10: {
      number: [
        "I can work with surds and rationalize denominators",
        "I can calculate with upper and lower bounds",
        "I can understand and use rounding and estimation",
        "I can perform calculations with large and small numbers",
        "I can calculate with percentages and growth",
      ],
      algebra: [
        "I can solve quadratic equations by various methods",
        "I can solve simultaneous linear and quadratic equations",
        "I can solve linear and quadratic inequalities",
        "I can solve equations by iteration",
        "I can use algebraic manipulation and reasoning",
      ],
      ratio_and_proportion: [
        "I can solve problems involving ratio and scale",
        "I can solve problems involving direct and inverse proportion",
        "I can work with compound measures",
        "I can use proportion in algebraic contexts",
        "I can apply ratio and proportion to real problems",
      ],
      geometry: [
        "I can prove and apply circle theorems",
        "I can calculate areas and perimeters of complex shapes",
        "I can work with 3D shapes and volumes",
        "I can use vectors in coordinate geometry",
        "I can apply trigonometry in various contexts",
      ],
      statistics_and_probability: [
        "I can construct and interpret histograms with unequal class widths",
        "I can calculate cumulative frequency and construct curves",
        "I can use statistical measures appropriately",
        "I can perform calculations with probability",
        "I can interpret statistical diagrams and data",
      ],
    },
    11: {
      number_and_algebra: [
        "I can manipulate surds and use rational approximations",
        "I can solve complex equations and inequalities",
        "I can work with exponential and logarithmic functions",
        "I can use calculus concepts for optimization",
        "I can perform complex algebraic manipulation",
      ],
      geometry_and_trigonometry: [
        "I can apply all circle theorems to solve problems",
        "I can use trigonometric identities and solve equations",
        "I can calculate with exact trigonometric values",
        "I can apply trigonometry and vectors to 3D problems",
        "I can solve complex geometric problems",
      ],
      statistics_and_probability: [
        "I can analyze distributions and use statistical tests",
        "I can calculate conditional probabilities and use Bayes' theorem",
        "I can interpret probability distributions",
        "I can perform hypothesis testing",
        "I can apply statistics to real-world scenarios",
      ],
      calculus_and_functions: [
        "I can differentiate and integrate polynomial functions",
        "I can find maximum and minimum points",
        "I can understand rates of change",
        "I can apply calculus to optimization problems",
        "I can work with exponential and logarithmic functions",
      ],
    },
  },
  science: {
    1: {
      plants: [
        "I can identify and name a variety of common wild and garden plants, including deciduous and evergreen trees",
        "I can identify and describe the basic structure of a variety of common flowering plants, including trees",
      ],
      animals_including_humans: [
        "I can identify and name a variety of common animals including fish, amphibians, reptiles, birds and mammals",
        "I can identify and name a variety of common animals that are carnivores, herbivores and omnivores",
        "I can describe and compare the structure of a variety of common animals (fish, amphibians, reptiles, birds and mammals including pets)",
        "I can identify, name, draw and label the basic parts of the human body and say which part of the body is associated with each sense",
      ],
      everyday_materials: [
        "I can distinguish between an object and the material from which it is made",
        "I can identify and name a variety of everyday materials, including wood, plastic, glass, metal, water, and rock",
        "I can describe the simple physical properties of a variety of everyday materials",
        "I can compare and group together a variety of everyday materials on the basis of their simple physical properties",
      ],
      seasonal_changes: [
        "I can observe changes across the 4 seasons",
        "I can observe and describe weather associated with the seasons and how day length varies",
      ],
      working_scientifically: [
        "I can ask simple questions and recognise that they can be answered in different ways",
        "I can observe closely, using simple equipment",
        "I can perform simple tests",
        "I can identify and classify",
        "I can use my observations and ideas to suggest answers to questions",
        "I can gather and record data to help me answer questions",
      ],
    },
    2: {
      living_things_and_habitats: [
        "I can explore and compare the differences between things that are living, dead, and things that have never been alive",
        "I can identify that most living things live in habitats to which they are suited and describe how different habitats provide for the basic needs of different kinds of animals and plants, and how they depend on each other",
        "I can identify and name a variety of plants and animals in their habitats, including microhabitats",
        "I can describe how animals obtain their food from plants and other animals, using the idea of a simple food chain, and identify and name different sources of food",
      ],
      plants: [
        "I can observe and describe how seeds and bulbs grow into mature plants",
        "I can find out and describe how plants need water, light and a suitable temperature to grow and stay healthy",
      ],
      animals_including_humans: [
        "I can notice that animals, including humans, have offspring which grow into adults",
        "I can find out about and describe the basic needs of animals, including humans, for survival (water, food and air)",
        "I can describe the importance for humans of exercise, eating the right amounts of different types of food, and hygiene",
      ],
      uses_of_everyday_materials: [
        "I can identify and compare the suitability of a variety of everyday materials, including wood, metal, plastic, glass, brick, rock, paper and cardboard for particular uses",
        "I can find out how the shapes of solid objects made from some materials can be changed by squashing, bending, twisting and stretching",
      ],
      working_scientifically: [
        "I can ask simple questions and recognise that they can be answered in different ways",
        "I can observe closely, using simple equipment",
        "I can perform simple tests",
        "I can identify and classify",
        "I can use my observations and ideas to suggest answers to questions",
        "I can report findings from investigations, including explaining by talking and writing about them, displaying or presenting results and conclusions",
        "I can gather and record data to help me answer questions",
      ],
    },
    3: {
      plants: [
        "I can identify and describe the functions of different parts of flowering plants",
        "I can explore the needs of plants for life and growth and how they are different from plant to plant",
        "I can investigate the way in which water is transported within plants",
        "I can explore the part that flowers play in the life cycle of flowering plants, including pollination, seed formation and seed dispersal",
      ],
      animals_including_humans: [
        "I can identify that animals, including humans, need the right types and amount of nutrition, and that they cannot make their own food; they get nutrition from what they eat",
        "I can identify that humans and some other animals have skeletons and muscles for support, protection and movement",
      ],
      rocks: [
        "I can compare and group together different kinds of rocks on the basis of their appearance and physical properties",
        "I can describe how fossils are formed when things that have lived are trapped within rock",
        "I can recognise that soils are made from rocks and organic matter",
      ],
      light: [
        "I can recognise that I need light in order to see things and that dark is the absence of light",
        "I can notice that light is reflected from surfaces",
        "I can recognise that light from the sun can be dangerous and that there are ways to protect my eyes",
        "I can recognise that shadows are formed when the light from a light source is blocked by a solid object",
        "I can find patterns in the way that the size of shadows change",
      ],
      forces_and_magnets: [
        "I can compare how things move on different surfaces",
        "I can notice that some forces need contact between two objects, but magnetic forces can act at a distance",
        "I can observe how magnets attract or repel each other and attract some materials and not others",
        "I can compare and group together a variety of everyday materials on the basis of whether they are attracted to a magnet, and identify some magnetic materials",
        "I can describe magnets as having two poles",
        "I can predict whether two magnets will attract or repel each other, depending on which poles are facing",
      ],
      working_scientifically: [
        "I can ask relevant questions and use different types of scientific enquiries to answer them",
        "I can set up simple practical investigations, compare things and make fair tests",
        "I can make organised and careful observations and take accurate measurements using the right units using a range of equipment, including thermometers and data loggers",
        "I can gather, record, sort and present data in a variety of ways to help in answering questions",
        "I can record findings using simple scientific language, drawings, labelled diagrams, keys, bar charts and tables",
        "I can report findings from investigations, including explaining by talking and writing about them, displaying or presenting results and conclusions",
        "I can use results to draw simple conclusions, make predictions, suggest improvements and ask more questions",
        "I can identify differences, similarities or changes related to simple scientific ideas and processes",
        "I can use clear scientific evidence to answer questions or to support my findings",
      ],
    },
    4: {
      animals_including_humans: [
        "I can describe the simple functions of the basic parts of the digestive system in humans",
        "I can identify the different types of teeth in humans and their simple functions",
        "I can make and understand a variety of food chains, identifying producers, predators and prey",
      ],
      living_things_and_habitats: [
        "I can recognise that living things can be grouped in a variety of ways",
        "I can explore and use keys to help group, identify and name a variety of living things in my local area and wider environment",
        "I can recognise that environments can change and that this can sometimes create dangers to living things",
      ],
      states_of_matter: [
        "I can compare and group materials together, according to whether they are solids, liquids or gases",
        "I can observe that some materials change state when they are heated or cooled, and measure or research the temperature at which this happens in degrees Celsius",
      ],
      sound: [
        "I can identify how sounds are made, associating some of them with something vibrating",
        "I can recognise that vibrations from sounds travel through a medium to the ear",
        "I can find patterns between the pitch of a sound and features of the object that produced it",
        "I can find patterns between the volume of a sound and the strength of the vibrations that produced it",
        "I can recognise that sounds get fainter as the distance from the sound source increases",
      ],
      electricity: [
        "I can identify common appliances that run on electricity",
        "I can make a simple electrical circuit, identifying and naming its basic parts, including cells, wires, bulbs, switches and buzzers",
        "I can identify whether or not a lamp will light in a simple circuit, based on whether or not the lamp is part of a complete loop with a battery",
        "I can recognise that a switch opens and closes a circuit and link this with whether or not a lamp lights in a simple circuit",
        "I can recognise some common conductors and insulators, and associate metals with being good conductors",
      ],
      working_scientifically: [
        "I can ask relevant questions and use different types of scientific enquiries to answer them",
        "I can set up simple practical investigations, compare things and make fair tests",
        "I can make organised and careful observations and take accurate measurements using the right units using a range of equipment, including thermometers and data loggers",
        "I can gather, record, sort and present data in a variety of ways to help in answering questions",
        "I can record findings using simple scientific language, drawings, labelled diagrams, keys, bar charts and tables",
        "I can report findings from investigations, including explaining by talking and writing about them, displaying or presenting results and conclusions",
        "I can use results to draw simple conclusions, make predictions, suggest improvements and ask more questions",
        "I can identify differences, similarities or changes related to simple scientific ideas and processes",
        "I can use clear scientific evidence to answer questions or to support my findings",
      ],
    },
    5: {
      living_things_and_habitats: [
        "I can describe the differences in the life cycles of a mammal, an amphibian, an insect and a bird",
        "I can describe the life process of reproduction in some plants and animals",
      ],
      animals_including_humans: [
        "I can describe the changes as humans develop to old age",
      ],
      properties_and_changes_of_materials: [
        "I can compare and group together everyday materials on the basis of their properties, including their hardness, solubility, transparency, conductivity (electrical and thermal), and response to magnets",
        "I can know that some materials will dissolve in liquid to form a solution, and describe how to recover a substance from a solution",
        "I can use knowledge of solids, liquids and gases to decide how mixtures might be separated, including through filtering, sieving and evaporating",
        "I can give reasons, based on evidence from comparative and fair tests, for the particular uses of everyday materials, including metals, wood and plastic",
        "I can demonstrate that dissolving, mixing and changes of state are reversible changes",
        "I can explain that some changes result in the formation of new materials, and that this kind of change is not usually reversible, including changes associated with burning and the action of acid on bicarbonate of soda",
      ],
      earth_and_space: [
        "I can describe the movement of the Earth and other planets relative to the sun in the solar system",
        "I can describe the movement of the moon relative to the Earth",
        "I can describe the sun, Earth and Moon as approximately spherical bodies",
        "I can use the idea of the Earth's rotation to explain the apparent movement of the sun across the sky and the occurrence of day and night and the apparent movement of the sun across the sky",
      ],
      forces: [
        "I can explain that unsupported objects fall towards the Earth because of the force of gravity acting between the Earth and the falling object",
        "I can identify the effects of air resistance, water resistance and friction that act between moving surfaces",
        "I can recognise that some mechanisms, including levers, pulleys and gears, allow a smaller force to have a greater effect",
      ],
      working_scientifically: [
        "I can plan different types of scientific enquiries to answer questions, including recognising and controlling variables where necessary",
        "I can record data and results of increasing complexity using scientific diagrams and labels, classification keys, tables, scatter graphs, bar and line graphs",
        "I can report and present findings from enquiries, including conclusions, causal relationships and explanations of and degree of trust in results, in and oral and written forms such as displays and other presentations",
        "I can use test results to make predictions to set up further comparative and fair tests",
        "I can identify scientific evidence that has been used to support or refute ideas or arguments",
      ],
    },
    6: {
      living_things_and_habitats: [
        "I can describe how living things are classified into broad groups according to common observable characteristics and based on similarities and differences, including micro-organisms, plants and animals",
        "I can give reasons for classifying plants and animals based on specific characteristics",
      ],
      animals_including_humans: [
        "I can identify and name the main parts of the human circulatory system and describe the functions of the heart, blood vessels and blood",
        "I can recognise the impact of diet, exercise, drugs and lifestyle on the way bodies function",
        "I can describe the ways in which nutrients and water are transported within animals, including humans",
      ],
      evolution_and_inheritance: [
        "I can recognise that living things have changed over time and that fossils provide information about living things that inhabited Earth millions of years ago",
        "I can recognise that living things produce offspring of the same kind but normally offspring vary and are not identical to their parents",
        "I can identify how animals and plants are adapted to suit their environment in different ways and that adaptation may lead to evolution",
      ],
      light: [
        "I can explain that we see things because light travels from light sources to our eyes or from light sources to objects and then to our eyes",
        "I can use the idea that light travels in straight lines to explain why shadows have the same shape as the objects that cast them",
        "I can use the idea that light travels in straight lines to explain that objects are seen because they give out or reflect light into the eye",
      ],
      electricity: [
        "I can link the brightness of a lamp or the volume of a buzzer with the number and voltage of cells used in the circuit",
        "I can compare and give reasons for variations in how components function, including the brightness of bulbs, the loudness of buzzers and the on/off position of switches",
        "I can use recognised symbols when drawing a simple circuit in diagram",
      ],
      working_scientifically: [
        "I can plan different types of scientific enquiries to answer questions, including recognising and controlling variables where necessary",
        "I can take measurements, using a range of scientific equipment, with increasing accuracy and precision, taking repeat readings when appropriate",
        "I can record data and results of increasing complexity using scientific diagrams and labels, classification keys, tables, scatter graphs, bar and line graphs",
        "I can use test results to make predictions to set up further comparative and fair tests",
        "I can report and present findings from enquiries, including conclusions, how one thing has affected another and explanations of and how much I trust the results, in spoken and written forms, such as displays and other presentations",
        "I can identify scientific evidence that has been used to support or refute ideas or arguments",
      ],
    },
    7: {
      cells_and_organisation: [
        "I can understand that living organisms are made of cells",
        "I can describe the structure of plant and animal cells",
        "I can explain the functions of cell components",
        "I can understand how cells divide for growth and repair",
        "I can describe tissues, organs and organ systems",
      ],
      particles_and_matter: [
        "I can describe the states of matter and particle arrangement",
        "I can explain physical and chemical changes",
        "I can understand density and its calculation",
        "I can describe the periodic table organization",
        "I can understand chemical bonding basics",
      ],
      forces_and_motion: [
        "I can describe forces and their effects",
        "I can understand Newton's laws of motion",
        "I can calculate speed, distance and time",
        "I can understand pressure and its applications",
        "I can describe forces in different contexts",
      ],
      energy: [
        "I can understand different forms of energy",
        "I can explain energy transfers and transformations",
        "I can understand conservation of energy",
        "I can describe renewable and non-renewable energy sources",
        "I can understand power and energy calculations",
      ],
      waves_and_sound: [
        "I can describe wave properties and behavior",
        "I can understand sound production and transmission",
        "I can explain reflection and refraction",
        "I can describe the electromagnetic spectrum basics",
        "I can understand frequency, wavelength and amplitude",
      ],
    },
    8: {
      organisms_and_health: [
        "I can describe the nervous system and responses",
        "I can understand hormone control and reproduction",
        "I can explain how organisms maintain homeostasis",
        "I can describe nutrient cycles and food webs",
        "I can understand defense against pathogens",
      ],
      chemical_reactions: [
        "I can write and balance chemical equations",
        "I can describe combustion and oxidation reactions",
        "I can understand exothermic and endothermic reactions",
        "I can explain reaction rates and catalysts",
        "I can describe decomposition and synthesis reactions",
      ],
      waves_and_light: [
        "I can explain light refraction and dispersion",
        "I can describe lens properties and image formation",
        "I can understand the eye as an optical instrument",
        "I can describe reflection laws and mirrors",
        "I can understand electromagnetic waves and properties",
      ],
      electricity: [
        "I can calculate resistance using Ohm's law",
        "I can describe series and parallel circuits",
        "I can understand circuit symbols and analysis",
        "I can explain electrical safety and power",
        "I can describe electromagnets and their applications",
      ],
      earth_and_atmosphere: [
        "I can describe Earth's structure and layering",
        "I can understand plate tectonics and continental drift",
        "I can explain weathering, erosion and deposition",
        "I can describe the rock cycle",
        "I can understand atmosphere composition and weather",
      ],
    },
    9: {
      genetics_and_evolution: [
        "I can describe chromosomes, DNA and genes",
        "I can explain meiosis and sexual reproduction",
        "I can understand Punnett squares and inheritance patterns",
        "I can describe natural selection and evolution",
        "I can understand adaptation and species formation",
      ],
      quantitative_chemistry: [
        "I can calculate relative atomic and molecular mass",
        "I can understand moles and Avogadro's constant",
        "I can calculate percentage yield and atom economy",
        "I can describe empirical and molecular formulae",
        "I can perform stoichiometric calculations",
      ],
      motion_and_forces: [
        "I can calculate velocity, acceleration and momentum",
        "I can understand Newton's laws in detail",
        "I can describe circular motion and satellites",
        "I can understand work, energy and power in detail",
        "I can perform force and motion calculations",
      ],
      electromagnetism: [
        "I can describe magnetic fields and magnetic forces",
        "I can understand electromagnetic induction",
        "I can explain generators and transformers",
        "I can describe motor effect and applications",
        "I can understand magnetic field patterns and behavior",
      ],
      ecosystems: [
        "I can describe photosynthesis and the light reactions",
        "I can explain nutrient cycles in ecosystems",
        "I can understand population dynamics and succession",
        "I can describe human impact on ecosystems",
        "I can understand conservation and sustainability",
      ],
    },
    10: {
      cell_biology: [
        "I can describe the structure and function of organelles",
        "I can explain diffusion, osmosis and active transport",
        "I can describe cell division: mitosis and meiosis",
        "I can understand stem cells and differentiation",
        "I can explain the cell cycle and cancer",
      ],
      organisation: [
        "I can describe tissues, organs and organ systems",
        "I can explain the structure and function of digestive system",
        "I can describe the circulatory system in detail",
        "I can explain the respiratory system and gas exchange",
        "I can understand organ coordination and regulation",
      ],
      infection_and_response: [
        "I can describe pathogens and types of disease",
        "I can explain immune responses and antibodies",
        "I can describe vaccines and immunity",
        "I can understand antibiotics and drug development",
        "I can explain treatment of infection and disease",
      ],
      bioenergetics: [
        "I can explain photosynthesis equations and factors",
        "I can describe the light-dependent and light-independent reactions",
        "I can explain respiration: aerobic and anaerobic",
        "I can describe ATP production and energy transfer",
        "I can perform photosynthesis and respiration calculations",
      ],
      atomic_structure: [
        "I can describe atoms and subatomic particles",
        "I can explain electronic configuration",
        "I can describe isotopes and relative atomic mass",
        "I can understand ionization energy and electron behavior",
        "I can explain mass spectrometry and atomic structure determination",
      ],
      bonding_structure_and_properties: [
        "I can explain ionic bonding and ionic compounds",
        "I can describe covalent bonding and structures",
        "I can understand metallic bonding and properties",
        "I can explain intermolecular forces",
        "I can describe structure-property relationships",
      ],
      quantitative_chemistry: [
        "I can calculate relative formula mass",
        "I can understand moles and molarity",
        "I can perform equation balancing and calculations",
        "I can calculate percentage composition",
        "I can understand limiting reactants and yield",
      ],
      chemical_changes: [
        "I can write and balance ionic equations",
        "I can describe redox reactions and oxidation states",
        "I can explain acid-base reactions and titrations",
        "I can describe electrolysis and its applications",
        "I can perform stoichiometric calculations",
      ],
      energy_changes: [
        "I can describe exothermic and endothermic reactions",
        "I can calculate enthalpy changes",
        "I can understand bond energy calculations",
        "I can explain factors affecting reaction energy",
        "I can describe calorimetry and energy transfer",
      ],
      rate_and_equilibrium: [
        "I can describe factors affecting reaction rates",
        "I can understand collision theory",
        "I can describe reversible reactions and equilibrium",
        "I can explain Le Chatelier's principle",
        "I can calculate rates of reaction",
      ],
      organic_chemistry: [
        "I can describe alkanes and alkenes",
        "I can explain addition reactions and polymerization",
        "I can describe functional groups and isomerism",
        "I can understand alcohols and carboxylic acids",
        "I can explain combustion and oxidation of organic compounds",
      ],
      forces: [
        "I can describe contact and non-contact forces",
        "I can perform calculations with balanced forces",
        "I can understand turning moments and equilibrium",
        "I can describe pressure in solids, liquids and gases",
        "I can explain hydraulic systems and pressure applications",
      ],
      waves: [
        "I can describe transverse and longitudinal waves",
        "I can calculate wave properties and speed",
        "I can understand reflection, refraction and diffraction",
        "I can describe interference and superposition",
        "I can understand the Doppler effect",
      ],
      magnetism: [
        "I can describe magnetic fields and forces",
        "I can explain the motor effect and applications",
        "I can describe electromagnetic induction",
        "I can understand transformers and their operation",
        "I can explain generators and dynamos",
      ],
      particle_model: [
        "I can describe states of matter at particle level",
        "I can explain density and pressure using particle theory",
        "I can understand heat transfer mechanisms",
        "I can describe kinetic theory of gases",
        "I can perform calculations involving particle behavior",
      ],
      radioactivity: [
        "I can describe alpha, beta and gamma radiation",
        "I can explain radioactive decay and half-life",
        "I can understand nuclear equations",
        "I can describe practical uses of radiation",
        "I can understand nuclear fission and fusion",
      ],
    },
    11: {
      homeostasis: [
        "I can describe the nervous and endocrine systems",
        "I can explain homeostatic control mechanisms",
        "I can understand blood glucose regulation",
        "I can describe osmoregulation and kidney function",
        "I can explain feedback mechanisms and control",
      ],
      inheritance_variation_and_evolution: [
        "I can explain DNA structure and replication",
        "I can describe meiosis and sexual reproduction",
        "I can understand inheritance patterns and Punnett squares",
        "I can explain variation and adaptation",
        "I can describe natural selection and evolution",
      ],
      ecology: [
        "I can describe ecosystems and energy transfer",
        "I can explain nutrient cycles and decomposition",
        "I can understand population dynamics and succession",
        "I can describe biodiversity and conservation",
        "I can understand human impact on ecosystems",
      ],
      using_resources: [
        "I can describe food production and agriculture",
        "I can explain water and material cycles",
        "I can understand renewable and non-renewable resources",
        "I can describe recycling and waste management",
        "I can understand sustainability and global challenges",
      ],
      space_physics: [
        "I can describe the solar system and universe",
        "I can explain gravitational effects and orbits",
        "I can understand stellar evolution and life cycles",
        "I can describe the Big Bang theory",
        "I can understand expansion of universe and evidence",
      ],
    },
  },
  english: {
    1: {
      transcription: [
        "I can spell words containing each of the 40+ phonemes already taught",
        "I can spell common exception words",
        "I can spell the days of the week",
        "I can name the letters of the alphabet using letter names to distinguish between alternative spellings of the same sound",
        "I can add prefixes and suffixes using the spelling rule for adding -s or -es as the plural marker for nouns and the third person singular marker for verbs",
        "I can add prefixes and suffixes using the prefix un-",
      ],
      handwriting: [
        "I can form capital letters",
        "I can form digits 0-9",
        "I understand which letters belong to which handwriting families (i.e. letters that are formed in similar ways) and to practise these",
      ],
      composition: [
        "I can write sentences by saying out loud what I am going to write about",
        "I can write sentences by composing a sentence orally before writing it",
        "I can write sentences in order to form short narratives",
        "I can write sentences by re-reading what I have written to check that it makes sense",
        "I can discuss what I have written with my teacher or other pupils",
        "I can read aloud my writing clearly enough to be heard by my peers and my teacher",
      ],
      vocabulary_grammar_punctuation: [
        "I can leave spaces between words",
        "I can join words and join clauses using 'and'",
        "I am beginning to punctuate sentences using a capital letter and a full stop, question mark or exclamation mark",
        "I can use a capital letter for names of people, places, the days of the week, and the personal pronoun 'I'",
        "I am learning the grammar for year 1 in English Appendix 2",
        "I can use the grammatical terminology in English Appendix 2 in discussing my writing",
      ],
      spelling_and_word_work: [
        "I can add prefixes and suffixes using -ing, -ed, -er and -est where no change is needed in the spelling of root words",
        "I can apply simple spelling rules and guidance, as listed in English Appendix 1",
        "I can write from memory simple sentences dictated by the teacher that include words using the GPCs and common exception words taught so far",
      ],
    },
    2: {
      reading_comprehension: [
        "I can listen to and read a wide range of fiction, poetry, plays, non-fiction and reference books",
        "I can answer questions about what has been read",
        "I can use strategies to understand new words",
        "I can recognise some features of written texts",
        "I can retell stories and recall key events",
      ],
      writing_composition: [
        "I can compose sentences using words they have read and practised",
        "I can write narrative sequences from my imagination",
        "I can write non-narrative texts to describe experiences or present information",
        "I can use simple time connectives to structure writing",
        "I can segment spoken words into phonemes and represent as graphemes",
      ],
      vocabulary_grammar_punctuation: [
        "I can apply spelling rules and guidance from English Appendix 1",
        "I can use expanded noun phrases to describe and specify",
        "I can use the standard form for verb 'to be'",
        "I can use co-ordination (and, or, but) to join clauses",
        "I can demarcate sentences with capital letters and full stops, question marks and exclamation marks",
      ],
      spelling: [
        "I can segment words into phonemes and represent these by graphemes, spelling many correctly",
        "I can spell some words with contracted forms",
        "I can add suffixes -ment, -ness, -ful, -less, -ly where no change is needed in the root word",
        "I can spell some common homophones",
        "I can spell many words with the 'igh' sound and other phonetically regular patterns",
      ],
      handwriting: [
        "I can form lower-case letters in the correct direction",
        "I can form lower-case letters of the correct size relative to one another",
        "I can join letters in most of my writing",
        "I can form capital letters of the appropriate size",
        "I can use spacing between words that reflects the size of the letters",
      ],
    },
    3: {
      reading_comprehension: [
        "I can read with fluency, accuracy and understanding",
        "I can answer questions about texts I have read",
        "I can infer from the text what characters are like and what they think",
        "I can identify the main ideas in texts",
        "I can use comprehension strategies to understand new vocabulary",
      ],
      writing_composition: [
        "I can write narratives about personal experiences and those of other people",
        "I can write for different purposes including letters and non-fiction accounts",
        "I can use time connectives to structure texts",
        "I can use expanded noun phrases to describe settings and characters",
        "I can plan writing by discussing ideas before writing",
      ],
      grammar_punctuation: [
        "I can use the past and present tenses correctly and consistently",
        "I can use progressive forms of the verb",
        "I can use subordination and co-ordination to join clauses",
        "I can use standard forms for verb inflections mostly correctly",
        "I can use apostrophes for contracted forms and possession",
      ],
      spelling: [
        "I can spell many words with contracted forms",
        "I can add suffixes correctly: -ment, -ness, -ful, -less, -ly",
        "I can spell words with double consonants",
        "I can apply spelling rules for adding suffixes to words ending in -e and -y",
        "I can segment words into phonemes and spell them correctly",
      ],
      handwriting: [
        "I can write with consistent formation of letters",
        "I can join letters in most of my writing",
        "I can write with spacing between words",
        "I can ensure that letter size is proportionate",
        "I can form capital letters and lower-case letters of equal height",
      ],
    },
    4: {
      reading_comprehension: [
        "I can read a wide range of texts fluently",
        "I can identify main characters and events in narratives",
        "I can make inferences from the text",
        "I can ask questions about the text to improve my understanding",
        "I can identify the features of different text types",
      ],
      writing_composition: [
        "I can write narratives, recounts and descriptions for different purposes",
        "I can use paragraphs to organize my writing",
        "I can plan my writing and check it as I write",
        "I can use a range of connectives and vocabulary",
        "I can write for different audiences and purposes",
      ],
      grammar_punctuation: [
        "I can use a range of sentence types and forms",
        "I can use standard English forms for verb inflections",
        "I can use co-ordination and subordination to join clauses",
        "I can use a range of punctuation including apostrophes, commas, and full stops",
        "I can use the correct tense consistently in my writing",
      ],
      spelling: [
        "I can spell many words with irregular spellings",
        "I can spell words with prefixes: un-, in-, im-, il-, ir-, dis-",
        "I can spell words with suffixes: -tion, -sion, -ness, -ment, -ful, -less",
        "I can spell words with double consonants and vowels",
        "I can spell homophones and near-homophones",
      ],
      handwriting: [
        "I can form letters with consistent size and spacing",
        "I can join most of the letters in my writing",
        "I can use capital letters appropriately",
        "I can write with clear and legible handwriting",
        "I can write at an appropriate speed for different contexts",
      ],
    },
    5: {
      reading_comprehension: [
        "I can read and understand a wide range of literary and non-fiction texts",
        "I can identify and summarize main ideas and supporting details",
        "I can make inferences and predictions based on the text",
        "I can identify the author's purpose and viewpoint",
        "I can use comprehension skills to analyze character and plot development",
      ],
      writing_composition: [
        "I can write for different purposes and audiences",
        "I can plan, draft and edit my writing",
        "I can use paragraphs to organize my ideas",
        "I can use a range of sentence types to create effects",
        "I can use appropriate vocabulary and tone for different contexts",
      ],
      grammar_punctuation: [
        "I can use complex sentences with multiple clauses",
        "I can use a wide range of punctuation correctly",
        "I can use tense accurately and consistently",
        "I can identify and correct common grammatical errors",
        "I can use subject-specific vocabulary appropriately",
      ],
      spelling: [
        "I can spell most words correctly including complex words",
        "I can spell words with prefixes and suffixes",
        "I can spell common homophones and near-homophones",
        "I can spell words from the National Curriculum spelling list",
        "I can apply spelling strategies to spell new and unfamiliar words",
      ],
      speaking_and_listening: [
        "I can speak clearly and coherently",
        "I can listen attentively and respond appropriately",
        "I can contribute to group discussions and presentations",
        "I can ask and answer questions to clarify understanding",
        "I can adapt my speaking for different purposes and audiences",
      ],
    },
    6: {
      reading_comprehension: [
        "I can read and understand a wide range of contemporary and classic literature",
        "I can analyze how authors use language and structure for effect",
        "I can identify themes and make connections between texts",
        "I can evaluate the effectiveness of texts and justify my opinions",
        "I can synthesize information from multiple sources",
      ],
      writing_composition: [
        "I can write effectively for different genres and audiences",
        "I can plan and draft writing with clear structure and development",
        "I can use sophisticated vocabulary and sentence structures",
        "I can revise and edit my writing for clarity and impact",
        "I can use paragraphs effectively to organize extended writing",
      ],
      grammar_punctuation: [
        "I can use a wide range of sentence types for effect",
        "I can use complex punctuation accurately (semicolons, colons, dashes)",
        "I can use tense accurately, including conditional forms",
        "I can identify and correct grammatical errors",
        "I can use subject-specific and academic vocabulary",
      ],
      spelling_vocabulary: [
        "I can spell correctly including words from the Year 5/6 spelling list",
        "I can use etymology to spell words with common affixes",
        "I can spell homophones and near-homophones correctly",
        "I can extend vocabulary through reading and writing",
        "I can use a dictionary and thesaurus to check spelling and word choice",
      ],
      speaking_and_listening: [
        "I can speak fluently and confidently in various contexts",
        "I can listen actively and respond thoughtfully",
        "I can participate effectively in group discussions and presentations",
        "I can use appropriate register for different audiences",
        "I can present information clearly and persuasively",
      ],
    },
    7: {
      reading_analysis: [
        "I can read and understand a range of fiction and non-fiction texts",
        "I can identify and analyze key ideas and themes",
        "I can make inferences and understand implicit meanings",
        "I can identify how writers use language and structure for effect",
        "I can compare and contrast texts by different authors",
      ],
      writing_for_purpose_and_audience: [
        "I can write for different purposes (narrative, descriptive, explanatory, persuasive)",
        "I can adapt my writing for different audiences",
        "I can use appropriate genre conventions and text structures",
        "I can use paragraphs to organize my ideas clearly",
        "I can plan and draft extended pieces of writing",
      ],
      grammar_vocabulary_in_context: [
        "I can use a wide range of sentence types correctly",
        "I can use the subjunctive form correctly",
        "I can use complex punctuation (semicolons, colons, parentheses)",
        "I can extend vocabulary through morphology (prefixes, suffixes, roots)",
        "I can use technical and subject-specific vocabulary",
      ],
      literary_techniques: [
        "I can identify and analyze the use of metaphor, simile, and personification",
        "I can understand how dialogue and description develop character",
        "I can identify narrative viewpoint and its effect",
        "I can analyze the impact of word choice and imagery",
        "I can understand how writers create mood and atmosphere",
      ],
      speaking_and_listening: [
        "I can speak clearly with confidence and fluency",
        "I can listen actively and respond thoughtfully to others",
        "I can participate in discussions and debates",
        "I can deliver presentations to an audience",
        "I can adapt my language and register for different situations",
      ],
    },
    8: {
      reading_analysis: [
        "I can read and analyze a wide range of texts from different periods",
        "I can identify and discuss key ideas and character development",
        "I can make sophisticated inferences from the text",
        "I can analyze how writers use language and structure to achieve effects",
        "I can evaluate texts critically and justify my interpretations",
      ],
      writing_for_purpose_and_audience: [
        "I can write extended pieces for different purposes and audiences",
        "I can use appropriate genre features and conventions",
        "I can structure writing effectively using paragraphs and linking devices",
        "I can use a range of techniques to engage the reader",
        "I can revise and refine my writing for clarity and impact",
      ],
      grammar_vocabulary_in_context: [
        "I can use complex sentence structures to convey precise meanings",
        "I can use a wide range of punctuation accurately",
        "I can extend vocabulary through understanding word origins and morphology",
        "I can recognize and correct common grammatical errors",
        "I can use formal and informal register appropriately",
      ],
      literary_techniques: [
        "I can identify and analyze a range of literary devices and techniques",
        "I can understand how character is developed through dialogue, action, and description",
        "I can analyze the effect of narrative structure and viewpoint",
        "I can identify and discuss themes and symbolism",
        "I can understand how writers create specific effects for readers",
      ],
      speaking_and_listening: [
        "I can speak fluently and persuasively in formal and informal contexts",
        "I can listen actively and engage critically with others' viewpoints",
        "I can contribute meaningfully to group discussions and debates",
        "I can deliver well-structured presentations",
        "I can adapt my communication for different purposes and audiences",
      ],
    },
    9: {
      reading_analysis: [
        "I can read and interpret complex texts from various periods and cultures",
        "I can analyze how writers use language, structure, and form to create meaning",
        "I can make sophisticated inferences and discuss implicit ideas",
        "I can identify and evaluate how context shapes interpretation",
        "I can compare texts and substantiate interpretations with evidence",
      ],
      writing_for_purpose_and_audience: [
        "I can write sustained pieces across different genres and purposes",
        "I can use sophisticated structures and techniques to engage readers",
        "I can develop ideas fully with appropriate evidence and examples",
        "I can use appropriate formality and register throughout",
        "I can revise and refine writing to enhance communication",
      ],
      grammar_vocabulary_in_context: [
        "I can use advanced sentence structures to create specific effects",
        "I can use a full range of punctuation accurately and purposefully",
        "I can analyze and use sophisticated vocabulary choices",
        "I can understand grammatical terminology and apply it",
        "I can recognize and correct complex grammatical errors",
      ],
      literary_techniques_and_analysis: [
        "I can identify and analyze the impact of linguistic and structural devices",
        "I can understand how writers create tension, irony, and pathos",
        "I can analyze the significance of setting, character, and plot",
        "I can discuss how form and context influence meaning",
        "I can evaluate the effectiveness of writers' techniques",
      ],
      speaking_and_listening: [
        "I can express myself clearly and persuasively in varied contexts",
        "I can listen critically and engage with complex ideas",
        "I can participate in formal discussions and debates with confidence",
        "I can deliver well-organized presentations on complex topics",
        "I can adapt my communication to reach and influence audiences",
      ],
    },
    10: {
      reading_explorations: [
        "I can read and analyze a wide range of literary and non-fiction texts",
        "I can identify and explore key ideas and viewpoints in texts",
        "I can analyze how writers use language and structure to create effects",
        "I can make critical evaluations of texts with detailed evidence",
        "I can compare texts and analyze similarities and differences in approaches",
      ],
      writing_composition_and_effect: [
        "I can write persuasive and creative texts for specific audiences",
        "I can use sophisticated vocabulary and varied sentence structures",
        "I can develop ideas across extended pieces of writing",
        "I can use language techniques to engage and influence readers",
        "I can edit and refine writing for maximum impact and clarity",
      ],
      creative_reading_and_writing: [
        "I can create original creative writing with a clear narrative arc",
        "I can use literary devices effectively in my own writing",
        "I can adapt genre conventions to create new meaning",
        "I can use language imaginatively to create vivid effects",
        "I can evaluate the effectiveness of my own writing",
      ],
      writers_viewpoints_and_perspectives: [
        "I can analyze and evaluate authors' viewpoints in texts",
        "I can understand how context shapes an author's message",
        "I can compare different perspectives on the same theme",
        "I can identify bias and evaluate evidence in persuasive texts",
        "I can understand how writers target different audiences",
      ],
      shakespeare_and_poetry: [
        "I can understand and analyze Shakespearean language and themes",
        "I can identify and explain the effect of poetic devices",
        "I can analyze how form and language create meaning in poetry",
        "I can understand the historical and cultural context of texts",
        "I can respond critically to Shakespeare and poetry",
      ],
    },
    11: {
      reading_exploration_and_analysis: [
        "I can analyze texts critically and evaluate interpretations",
        "I can understand writers' methods and the effects they create",
        "I can explore how context influences interpretation",
        "I can synthesize information from multiple texts",
        "I can sustain independent analytical writing",
      ],
      writers_viewpoints_and_perspectives: [
        "I can identify and analyze an author's viewpoint and purpose",
        "I can understand how writers persuade and influence audiences",
        "I can evaluate the reliability and bias in non-fiction texts",
        "I can compare viewpoints across different texts",
        "I can construct my own informed viewpoints with evidence",
      ],
      shakespeare_analysis: [
        "I can understand and analyze Shakespeare's use of language",
        "I can explore how Shakespeare develops themes and characters",
        "I can understand the historical and theatrical context of plays",
        "I can analyze the impact of structure and form",
        "I can sustain critical interpretation of Shakespeare",
      ],
      poetry_and_literary_writing: [
        "I can analyze how poets use language and form to create meaning",
        "I can identify and evaluate the use of poetic devices",
        "I can understand how poetry reflects cultural and historical contexts",
        "I can compare and contrast poetry from different periods",
        "I can respond creatively and critically to poetry",
      ],
      century_19th_novel_analysis: [
        "I can understand and analyze 19th-century narrative fiction",
        "I can analyze how 19th-century writers develop plot and character",
        "I can understand Victorian and historical contexts",
        "I can evaluate how form and narrative technique create effects",
        "I can sustain critical interpretation of complex texts",
      ],
    },
  },
};

/**
 * Returns granular assessment targets for a curriculum + subject + year.
 * Returns an object keyed by strand, each containing an array of "I can..." statements.
 */
export function getAssessmentTargets(curriculum, subject, year) {
  // Map subject names to ASSESSMENT_TARGETS keys
  let subjectKey = null;
  if (subject.includes("math")) subjectKey = "mathematics";
  else if (subject === "science" || subject === "basic_science") subjectKey = "science";
  else if (subject === "english" || subject === "english_language") subjectKey = "english";

  if (!subjectKey || !ASSESSMENT_TARGETS[subjectKey]) return null;

  // Map non-UK curricula to equivalent UK year for shared targets
  let mappedYear = year;
  if (curriculum === "ng_primary") mappedYear = year;          // Primary 1-6 ≈ Year 1-6
  if (curriculum === "ca_primary") mappedYear = year;           // Grade 1-6 ≈ Year 1-6
  if (curriculum === "uk_11plus") mappedYear = year;            // Years 3-6

  return ASSESSMENT_TARGETS[subjectKey][mappedYear] || null;
}

/**
 * Cross-curriculum topic equivalence: returns topics from another curriculum
 * that are conceptually equivalent, so questions can be reused/adapted.
 */
export const CROSS_CURRICULUM_MATHS = {
  // Primary (Year 1-6 / Grade K-5 / Year 1-6 AU)
  // Core arithmetic, fractions, geometry, measurement are near-identical across UK, Nigeria, Canada, US, Australia
  shared_primary: ["uk_national", "ng_primary", "ca_primary", "us_common_core", "aus_acara"],
  // Lower Secondary (Year 7-9 / Grade 6-8 / Year 7-9 AU)
  // Algebra, geometry, statistics fundamentals align across curricula
  shared_lower_secondary: ["uk_national", "ng_jss", "ca_secondary", "us_common_core", "aus_acara"],
  // Upper Secondary (Year 10-11 / Grade 9-10 / Year 10-11 AU)
  // Advanced algebra, trigonometry, calculus basics are universal topics
  shared_upper_secondary: ["uk_national", "ng_sss", "us_common_core", "aus_acara"],
};

/**
 * Cross-curriculum equivalence for Science topics (Year 1-6 / K-5 / Year 1-6 AU)
 * Cells, forces, energy, states of matter, simple machines are universal
 * Excludes culture/region-specific content (e.g., Australian native animals in science)
 */
export const CROSS_CURRICULUM_SCIENCE_PRIMARY = {
  shared_primary: ["uk_national", "ng_primary", "ca_primary", "us_common_core", "aus_acara"],
};

/**
 * Cross-curriculum equivalence for Science (Year 7-9 / Grade 6-8 / Year 7-9 AU)
 * Photosynthesis, cells, forces, waves, chemistry basics are universal
 */
export const CROSS_CURRICULUM_SCIENCE_SECONDARY = {
  shared_lower_secondary: ["uk_national", "ng_jss", "ca_secondary", "us_common_core", "aus_acara"],
};

/**
 * Cross-curriculum equivalence for Science (Year 10-11 / Grade 9-10 / Year 10-11 AU)
 * Advanced biology, chemistry, physics topics
 */
export const CROSS_CURRICULUM_SCIENCE_UPPER = {
  shared_upper_secondary: ["uk_national", "ng_sss", "us_common_core", "aus_acara"],
};

/**
 * Cross-curriculum equivalence for English (grammar, comprehension, vocabulary)
 * Excludes culture-specific literature (Shakespeare for UK, American authors for US, etc.)
 * Includes: phonics, grammar, punctuation, vocabulary, comprehension strategies, literary devices
 */
export const CROSS_CURRICULUM_ENGLISH = {
  // Year 1-6: Phonics, basic grammar, vocabulary, comprehension
  shared_primary: ["uk_national", "ng_primary", "ca_primary", "us_common_core", "aus_acara"],
  // Year 7-9: Grammar, punctuation, vocabulary, comprehension, literary analysis (no specific texts)
  shared_lower_secondary: ["uk_national", "ng_jss", "ca_secondary", "us_common_core", "aus_acara"],
  // Year 10-11: Advanced grammar, essay writing, analysis (no specific texts)
  shared_upper_secondary: ["uk_national", "ng_sss", "us_common_core", "aus_acara"],
};

/**
 * Returns curricula that share equivalent content for a given year band across all subjects.
 * Useful for identifying questions that can be tagged for multiple curricula.
 * Includes UK, Nigeria, Canada, US, and Australia.
 */
export function getEquivalentCurricula(curriculum, year, subject = "mathematics") {
  // Normalize subject name
  const subjectKey = subject?.toLowerCase().replace(/_/g, "").replace(" ", "");

  // Determine year band
  let yearBand = "primary";
  if (year >= 7 && year <= 9) yearBand = "lower_secondary";
  else if (year >= 10) yearBand = "upper_secondary";

  // Maths: universal across all subjects
  if (subjectKey?.includes("math") || subjectKey?.includes("maths")) {
    if (yearBand === "primary") return CROSS_CURRICULUM_MATHS.shared_primary;
    if (yearBand === "lower_secondary") return CROSS_CURRICULUM_MATHS.shared_lower_secondary;
    if (yearBand === "upper_secondary") return CROSS_CURRICULUM_MATHS.shared_upper_secondary;
  }

  // Science: universal core topics (cells, forces, energy, etc.)
  if (subjectKey?.includes("science") || subjectKey?.includes("basic_science") ||
      subjectKey?.includes("physics") || subjectKey?.includes("chemistry") ||
      subjectKey?.includes("biology")) {
    if (yearBand === "primary") return CROSS_CURRICULUM_SCIENCE_PRIMARY.shared_primary;
    if (yearBand === "lower_secondary") return CROSS_CURRICULUM_SCIENCE_SECONDARY.shared_lower_secondary;
    if (yearBand === "upper_secondary") return CROSS_CURRICULUM_SCIENCE_UPPER.shared_upper_secondary;
  }

  // English: grammar, vocabulary, comprehension (not literature-specific texts)
  if (subjectKey?.includes("english") && !subjectKey?.includes("literature")) {
    if (yearBand === "primary") return CROSS_CURRICULUM_ENGLISH.shared_primary;
    if (yearBand === "lower_secondary") return CROSS_CURRICULUM_ENGLISH.shared_lower_secondary;
    if (yearBand === "upper_secondary") return CROSS_CURRICULUM_ENGLISH.shared_upper_secondary;
  }

  return [curriculum];
}
