#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LaunchPard — Local Question Generator v2 (Comprehensive)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Generates questions locally via OpenRouter API and inserts into Supabase.
 * Covers ALL question types, visual types, difficulty tiers, and curricula.
 *
 * Usage:
 *   node scripts/generateQuestionsLocal.js                          # full run
 *   node scripts/generateQuestionsLocal.js --curriculum uk_national # single curriculum
 *   node scripts/generateQuestionsLocal.js --subject mathematics    # single subject
 *   node scripts/generateQuestionsLocal.js --grade 5                # single grade
 *   node scripts/generateQuestionsLocal.js --count 20               # questions per cell
 *   node scripts/generateQuestionsLocal.js --dry-run                # preview without DB writes
 *   node scripts/generateQuestionsLocal.js --fill-gaps              # only fill underpopulated cells
 *   node scripts/generateQuestionsLocal.js --concurrency 4          # parallel API calls
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *           and OPENROUTER_API_KEY
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

// ── Supabase client ──────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}
const hasFlag = (name) => args.includes(`--${name}`);

const FILTER_CURRICULUM = getArg("curriculum");
const FILTER_SUBJECT = getArg("subject");
const FILTER_GRADE = getArg("grade") ? parseInt(getArg("grade")) : null;
const QUESTIONS_PER_CELL = parseInt(getArg("count") || "10");
const DRY_RUN = hasFlag("dry-run");
const FILL_GAPS = hasFlag("fill-gaps");
const CONCURRENCY = parseInt(getArg("concurrency") || "3");
const TARGET_PER_CELL = parseInt(getArg("target") || "50"); // for fill-gaps mode

// ═══════════════════════════════════════════════════════════════════════════════
// CURRICULA — mirrors batch-generate/route.js
// ═══════════════════════════════════════════════════════════════════════════════
const CURRICULA = {
  uk_11plus: {
    name: "UK 11+ (GL/CEM)",
    subjects: ["mathematics", "english", "verbal_reasoning", "nvr", "science"],
    grades: [3, 4, 5, 6],
    gradeLabel: "Year",
    spelling: "British English",
    context: "UK 11+ selective secondary school entrance examination (GL Assessment / CEM format)",
    examples: "British contexts: pounds sterling (£), kilometres, UK cities/landmarks, British nature",
  },
  uk_national: {
    name: "UK National Curriculum",
    subjects: ["mathematics", "english", "science", "computing", "history", "geography"],
    grades: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    gradeLabel: "Year",
    spelling: "British English",
    context: "UK National Curriculum KS1–KS4 (SATs/GCSE-aligned)",
    examples: "British everyday contexts: pounds sterling (£), metres/kilometres, UK schools",
  },
  us_common_core: {
    name: "US Common Core",
    subjects: ["math", "ela", "science", "social_studies"],
    grades: [1, 2, 3, 4, 5, 6, 7, 8],
    gradeLabel: "Grade",
    spelling: "American English",
    context: "US Common Core State Standards",
    examples: "American contexts: dollars ($), miles/yards, US cities/states",
  },
  aus_acara: {
    name: "Australian Curriculum (ACARA)",
    subjects: ["mathematics", "english", "science", "hass"],
    grades: [1, 2, 3, 4, 5, 6],
    gradeLabel: "Year",
    spelling: "Australian English",
    context: "Australian Curriculum (ACARA), NAPLAN-style assessment",
    examples: "Australian contexts: dollars (A$), kilometres, Australian animals/geography",
  },
  ib_pyp: {
    name: "IB Primary Years (PYP)",
    subjects: ["mathematics", "english", "science", "geography", "history"],
    grades: [1, 2, 3, 4, 5],
    gradeLabel: "Grade",
    spelling: "International English",
    context: "IB Primary Years Programme — inquiry-based, conceptual",
    examples: "International contexts: global scenarios, multicultural examples",
  },
  ib_myp: {
    name: "IB Middle Years (MYP)",
    subjects: ["mathematics", "english", "science", "humanities"],
    grades: [1, 2, 3, 4, 5],
    gradeLabel: "Year",
    spelling: "International English",
    context: "IB Middle Years Programme — concept-driven, inquiry-based",
    examples: "International contexts: global scenarios, multicultural examples",
  },
  ng_primary: {
    name: "Nigerian Primary (Basic 1-6)",
    subjects: ["mathematics", "english_studies", "basic_science", "social_studies", "civic_education"],
    grades: [1, 2, 3, 4, 5, 6],
    gradeLabel: "Primary",
    spelling: "British English",
    context: "Nigerian Basic Education Curriculum (NERDC)",
    examples: "Nigerian contexts: naira (₦), Nigerian geography/culture",
  },
  ng_jss: {
    name: "Nigerian JSS (Basic 7-9)",
    subjects: ["mathematics", "english_studies", "basic_science", "social_studies", "civic_education"],
    grades: [1, 2, 3],
    gradeLabel: "JSS",
    spelling: "British English",
    context: "Nigerian Basic Education Curriculum — Junior Secondary",
    examples: "Nigerian contexts: naira (₦), Nigerian geography/history",
  },
  ng_sss: {
    name: "Nigerian SSS (SS 1-3)",
    subjects: ["mathematics", "english", "physics", "chemistry", "biology", "economics", "government", "commerce", "civic_education"],
    grades: [1, 2, 3],
    gradeLabel: "SS",
    spelling: "British English",
    context: "WAEC/NECO Nigerian Senior Secondary School curriculum",
    examples: "Nigerian contexts: naira (₦), Nigerian geography/history",
  },
  ca_primary: {
    name: "Canadian Primary (Grade 1-8)",
    subjects: ["mathematics", "english", "science", "social_studies"],
    grades: [1, 2, 3, 4, 5, 6, 7, 8],
    gradeLabel: "Grade",
    spelling: "Canadian English",
    context: "Canadian provincial curricula (Ontario/BC/Alberta aligned)",
    examples: "Canadian contexts: CAD, kilometres, Canadian geography",
  },
  ca_secondary: {
    name: "Canadian Secondary (Grade 9-12)",
    subjects: ["mathematics", "english", "science", "canadian_history", "geography"],
    grades: [9, 10, 11, 12],
    gradeLabel: "Grade",
    spelling: "Canadian English",
    context: "Canadian provincial curricula — secondary level",
    examples: "Canadian contexts: CAD, kilometres, Canadian history",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DIFFICULTY TIERS
// ═══════════════════════════════════════════════════════════════════════════════
const TIERS = [
  { label: "foundation", difficulty: 25, desc: "foundational — simple, direct, single-concept" },
  { label: "developing", difficulty: 55, desc: "developing — moderate complexity, application of concepts" },
  { label: "mastering", difficulty: 85, desc: "mastery — complex multi-step reasoning, challenge problems" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL-AWARE TOPIC BANKS — maps visual types to question topics
// These ensure questions that naturally lend themselves to our visual renderers
// ═══════════════════════════════════════════════════════════════════════════════
const VISUAL_TOPICS = {
  mathematics: {
    // Each entry: [topic_slug, visual_type, description, min_grade]
    number_line: [
      ["number_line_addition", "number_line", "Adding numbers on a number line", 1],
      ["number_line_subtraction", "number_line", "Subtracting on a number line", 1],
      ["number_line_decimals", "number_line", "Placing decimals on a number line", 4],
      ["number_line_fractions", "number_line", "Placing fractions on a number line", 3],
      ["number_line_negative", "number_line", "Negative numbers on a number line", 5],
    ],
    bar_chart: [
      ["bar_chart_reading", "bar_chart", "Reading and interpreting bar charts", 2],
      ["bar_chart_comparison", "bar_chart", "Comparing data using bar charts", 3],
    ],
    pie_chart: [
      ["pie_chart_reading", "pie_chart", "Reading pie charts and calculating fractions", 4],
      ["pie_chart_percentages", "pie_chart", "Pie charts with percentage calculations", 5],
    ],
    fraction: [
      ["fraction_basics", "fraction", "Understanding fractions — halves, thirds, quarters", 2],
      ["fraction_equivalent", "fraction", "Finding equivalent fractions", 3],
      ["fraction_operations", "fraction", "Adding and subtracting fractions", 4],
      ["fraction_mixed", "fraction", "Mixed numbers and improper fractions", 5],
    ],
    angle: [
      ["angle_types", "angle", "Identifying right, acute, obtuse, and reflex angles", 3],
      ["angle_measuring", "angle", "Measuring angles in degrees using a protractor", 4],
      ["angle_relationships", "angle", "Angles on a straight line, vertically opposite", 6],
    ],
    coordinate_graph: [
      ["coordinates_first_quadrant", "coordinate_graph", "Plotting points in the first quadrant", 4],
      ["coordinates_four_quadrants", "coordinate_graph", "Plotting points in all four quadrants", 6],
      ["linear_graphs", "coordinate_graph", "Drawing and interpreting straight-line graphs", 7],
    ],
    venn: [
      ["venn_sorting", "venn", "Sorting numbers/objects into Venn diagrams", 3],
      ["venn_factors", "venn", "Factors and multiples in Venn diagrams", 5],
      ["venn_probability", "venn", "Probability with Venn diagrams", 7],
    ],
    pictogram: [
      ["pictogram_reading", "pictogram", "Reading and interpreting pictograms", 1],
      ["pictogram_creating", "pictogram", "Creating pictograms from data", 2],
    ],
    tally_chart: [
      ["tally_reading", "tally_chart", "Reading tally charts", 1],
      ["tally_frequency", "tally_chart", "Tally charts and frequency tables", 2],
    ],
    symmetry: [
      ["symmetry_lines", "symmetry", "Lines of symmetry in 2D shapes", 3],
      ["symmetry_reflection", "symmetry", "Reflection symmetry", 4],
    ],
    area: [
      ["area_rectangles", "area", "Area of rectangles and squares", 4],
      ["area_triangles", "area", "Area of triangles", 5],
      ["area_compound", "area", "Area of compound shapes", 6],
      ["perimeter", "area", "Calculating perimeters", 3],
    ],
    clock: [
      ["time_oclock", "clock", "Telling time — o'clock and half past", 1],
      ["time_quarter", "clock", "Telling time — quarter past and quarter to", 2],
      ["time_5min", "clock", "Telling time — 5-minute intervals", 2],
      ["time_duration", "clock", "Calculating time durations", 3],
    ],
    money: [
      ["money_coins", "money", "Recognising coins and making amounts", 1],
      ["money_change", "money", "Calculating change", 2],
      ["money_word_problems", "money", "Money word problems", 3],
    ],
    place_value: [
      ["place_value_tens_ones", "place_value", "Tens and ones — place value", 1],
      ["place_value_hundreds", "place_value", "Hundreds, tens, and ones", 2],
      ["place_value_thousands", "place_value", "Place value to thousands", 3],
    ],
    percentage_bar: [
      ["percentage_of_amount", "percentage_bar", "Finding percentages of amounts", 5],
      ["percentage_increase", "percentage_bar", "Percentage increase and decrease", 6],
    ],
    probability: [
      ["probability_scale", "probability", "Probability scale — impossible to certain", 4],
      ["probability_fractions", "probability", "Probability as fractions", 5],
    ],
    ratio: [
      ["ratio_basics", "ratio", "Understanding ratios", 5],
      ["ratio_sharing", "ratio", "Sharing in a given ratio", 6],
    ],
    conversion_ladder: [
      ["metric_length", "conversion_ladder", "Converting metric lengths (mm/cm/m/km)", 3],
      ["metric_mass", "conversion_ladder", "Converting metric mass (g/kg)", 4],
      ["metric_capacity", "conversion_ladder", "Converting metric capacity (ml/l)", 4],
    ],
    thermometer: [
      ["temperature_reading", "thermometer", "Reading temperatures on a thermometer", 2],
      ["temperature_negative", "thermometer", "Negative temperatures", 4],
    ],
    quadratic: [
      ["quadratic_graphs", "quadratic", "Plotting and interpreting quadratic graphs", 8],
      ["quadratic_solving", "quadratic", "Solving quadratic equations graphically", 9],
    ],
    formula_triangle: [
      ["speed_distance_time", "formula_triangle", "Speed, distance, time calculations", 7],
    ],
  },
  science: {
    cell: [
      ["plant_animal_cells", "cell", "Comparing plant and animal cells", 5],
      ["cell_organelles", "cell", "Identifying cell organelles", 7],
    ],
    atom: [
      ["atomic_structure", "atom", "Protons, neutrons, electrons", 7],
      ["isotopes", "atom", "Understanding isotopes", 8],
    ],
    ph_scale: [
      ["acids_alkalis", "ph_scale", "Acids, alkalis, and the pH scale", 6],
    ],
    wave: [
      ["sound_waves", "wave", "Sound wave properties — amplitude, frequency", 7],
      ["light_waves", "wave", "Light waves and the electromagnetic spectrum", 8],
    ],
    free_body: [
      ["forces_balanced", "free_body", "Balanced and unbalanced forces", 6],
      ["newtons_laws", "free_body", "Newton's laws of motion", 7],
    ],
    circuit: [
      ["simple_circuits", "circuit", "Simple series and parallel circuits", 5],
      ["circuit_symbols", "circuit", "Circuit diagram symbols", 6],
    ],
    punnett: [
      ["genetics_basics", "punnett", "Punnett squares — dominant and recessive", 8],
    ],
    molecule: [
      ["chemical_formulae", "molecule", "Reading chemical formulae", 7],
      ["bonding", "molecule", "Types of chemical bonding", 8],
    ],
    state_changes: [
      ["states_of_matter", "state_changes", "Solids, liquids, gases — changes of state", 4],
    ],
    energy_stores: [
      ["energy_types", "energy_stores", "Energy stores and transfers", 6],
    ],
    periodic_element: [
      ["periodic_table", "periodic_element", "Reading the periodic table", 7],
    ],
  },
  business: {
    t_account: [
      ["double_entry", "t_account", "Double-entry bookkeeping T-accounts", 8],
    ],
    break_even: [
      ["break_even_analysis", "break_even", "Break-even analysis and charts", 8],
    ],
    supply_demand: [
      ["supply_demand_curves", "supply_demand", "Supply and demand curves", 8],
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════
const QUESTION_TYPES = {
  mcq: {
    schema: '{"q":"...","question_type":"mcq","opts":["A","B","C","D"],"a":0,"exp":"...","topic":"...","difficulty":DIFF,"hints":["Hint1","Hint2","Hint3"]}',
    desc: "Multiple choice — 4 options, one correct",
  },
  fill_blank: {
    schema: '{"q":"The ___ carries blood.","question_type":"fill_blank","opts":["A","B","C","D"],"a":0,"exp":"...","topic":"...","difficulty":DIFF,"hints":["Hint"]}',
    desc: "Fill in the blank — 4 options, one correct",
  },
  free_text: {
    schema: '{"q":"...","question_type":"free_text","answer":"exact answer","answerAliases":["alt"],"exp":"...","topic":"...","difficulty":DIFF,"hints":["Hint"]}',
    desc: "Free text — student types answer",
  },
  multi_select: {
    schema: '{"q":"Select ALL correct...","question_type":"multi_select","opts":["A","B","C","D"],"a":[0,2],"exp":"...","topic":"...","difficulty":DIFF,"hints":["Hint"]}',
    desc: "Multi-select — multiple correct options",
  },
  multi_step: {
    schema: '{"q":"...","question_type":"multi_step","steps":[{"prompt":"Step 1?","answer":"5"},{"prompt":"Step 2?","answer":"12"}],"exp":"...","topic":"...","difficulty":DIFF,"hints":["Hint"]}',
    desc: "Multi-step — scaffolded steps",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL POOL — cost-effective models via OpenRouter
// ═══════════════════════════════════════════════════════════════════════════════
const MODELS = [
  "openai/gpt-4o-mini",
  "google/gemini-2.0-flash-lite-001",
  "deepseek/deepseek-v3.2",
  "qwen/qwen3-30b-a3b-instruct-2507",
  "meta-llama/llama-3.3-70b-instruct",
  "mistralai/mistral-small-3.1-24b-instruct",
  "google/gemini-2.5-flash-lite-preview-09-2025",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "xiaomi/mimo-v2-flash",
  "arcee-ai/trinity-large-preview:free",
  "google/gemma-3-27b-it:free",
  "qwen/qwen3.5-9b",
  "microsoft/phi-4",
  "meta-llama/llama-4-scout:free",
];

function pickModel() {
  return MODELS[Math.floor(Math.random() * MODELS.length)];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

const RULES = `
HINTS: Each question MUST have a "hints" array (1-3 items). Hint 1 = directional (no spoilers). Hint 2 = structural (what to look for). Hint 3 = near-answer.
UNIQUENESS: Every question MUST be distinctly different. Vary scenario, numbers, context, wording.
VISUAL REFERENCES BAN: NEVER write "look at the diagram", "the picture shows", "shown below", "the chart shows", or ANY phrase implying a visual is attached. All information must be SELF-CONTAINED in the question text.
MATH ACCURACY: COMPUTE EVERY ANSWER before writing. Verify arithmetic. option[a] MUST be correct. No duplicate options.
`;

function buildPrompt(curriculum, config, subject, grade, tier, count, visualTopics) {
  const { name, gradeLabel, context, examples, spelling } = config;
  const tierDesc = tier.desc;
  const diff = tier.difficulty;

  // Determine question type mix based on grade and difficulty
  const useSteps = diff >= 45 && grade >= 3;
  const useFreeText = grade >= 4;
  const useMultiSelect = diff >= 55 && grade >= 5;

  // Build type examples
  const types = [`MCQ: ${QUESTION_TYPES.mcq.schema.replace("DIFF", String(diff))}`];
  types.push(`FILL_BLANK: ${QUESTION_TYPES.fill_blank.schema.replace("DIFF", String(diff))}`);
  if (useFreeText) types.push(`FREE_TEXT: ${QUESTION_TYPES.free_text.schema.replace("DIFF", String(diff))}`);
  if (useMultiSelect) types.push(`MULTI_SELECT: ${QUESTION_TYPES.multi_select.schema.replace("DIFF", String(diff))}`);
  if (useSteps) types.push(`MULTI_STEP: ${QUESTION_TYPES.multi_step.schema.replace("DIFF", String(diff))}`);

  // Build visual topic guidance
  let visualGuidance = "";
  if (visualTopics && visualTopics.length > 0) {
    const topicList = visualTopics
      .filter((vt) => vt[3] <= grade)
      .map((vt) => `- "${vt[0]}": ${vt[2]} (visual_type: ${vt[1]})`)
      .join("\n");
    if (topicList) {
      visualGuidance = `
VISUAL-FRIENDLY TOPICS — include questions on these topics so our renderer can auto-detect visuals:
${topicList}
For these topics, include numeric data inline in the question text (e.g., bar chart values, number line positions, angle degrees).
The "topic" field in your JSON MUST match the topic slug exactly.`;
    }
  }

  const typeMix = [
    `- ${Math.ceil(count * 0.35)}× MCQ`,
    `- ${Math.ceil(count * 0.2)}× fill-blank`,
    useFreeText ? `- ${Math.ceil(count * 0.15)}× free-text` : null,
    useMultiSelect ? `- ${Math.ceil(count * 0.15)}× multi-select` : null,
    useSteps ? `- ${Math.ceil(count * 0.15)}× multi-step` : null,
  ].filter(Boolean).join("\n");

  return `You are generating ${count} ${name} ${subject.replace(/_/g, " ")} questions for ${gradeLabel} ${grade} students.

Curriculum: ${context}
Difficulty: ${tierDesc}
Spelling: ${spelling}
Context examples: ${examples}

${RULES}
${visualGuidance}

Question type mix (approximate):
${typeMix}

Type schemas:
${types.join("\n")}

Output ONLY valid JSON — no markdown, no explanation:
{"questions":[...${count} questions...]}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API CALLER
// ═══════════════════════════════════════════════════════════════════════════════

async function callOpenRouter(prompt, model) {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://launchpard.com",
      "X-Title": "LaunchPard Question Generator",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 8000,
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenRouter ${resp.status}: ${err.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from model");

  // Parse JSON — handle markdown code blocks
  const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateQuestion(q, subject) {
  if (!q.q || typeof q.q !== "string" || q.q.length < 10) return null;
  if (!q.question_type) q.question_type = "mcq";

  const type = q.question_type;
  if (!["mcq", "fill_blank", "free_text", "multi_select", "multi_step"].includes(type)) return null;

  // MCQ / fill_blank / multi_select need opts + a
  if (["mcq", "fill_blank"].includes(type)) {
    if (!Array.isArray(q.opts) || q.opts.length < 3) return null;
    if (typeof q.a !== "number" || q.a < 0 || q.a >= q.opts.length) return null;
  }
  if (type === "multi_select") {
    if (!Array.isArray(q.opts) || q.opts.length < 3) return null;
    if (!Array.isArray(q.a) || q.a.length < 1) return null;
    if (q.a.some((idx) => idx < 0 || idx >= q.opts.length)) return null;
  }
  if (type === "free_text") {
    if (!q.answer || typeof q.answer !== "string") return null;
  }
  if (type === "multi_step") {
    if (!Array.isArray(q.steps) || q.steps.length < 2) return null;
    if (q.steps.some((s) => !s.prompt || !s.answer)) return null;
  }

  // Reject visual references
  if (/look at|the diagram|shown below|the picture|the image|shown above|as seen in/i.test(q.q)) return null;

  // Ensure hints
  if (!Array.isArray(q.hints) || q.hints.length < 1) {
    q.hints = ["Think carefully about the question."];
  }

  return q;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL TYPE DETECTION — mirrors MathsVisualiser.resolveVisual()
// ═══════════════════════════════════════════════════════════════════════════════

function detectVisualType(q, subject) {
  const text = (q.q || "").toLowerCase();
  const topic = (q.topic || "").toLowerCase();

  // Maths visuals
  if (["mathematics", "math", "maths"].includes(subject)) {
    if (/number\s*line/i.test(text) || topic.includes("number_line")) return "number_line";
    if (/bar\s*chart/i.test(text) || topic.includes("bar_chart")) return "bar_chart";
    if (/pie\s*chart/i.test(text) || topic.includes("pie_chart")) return "pie_chart";
    if (/fraction/i.test(text) || topic.includes("fraction")) return "fraction";
    if (/angle|degree|protractor/i.test(text) || topic.includes("angle")) return "angle";
    if (/coordinate|plot.*point|x-axis|y-axis/i.test(text) || topic.includes("coordinate")) return "coordinate_graph";
    if (/venn/i.test(text) || topic.includes("venn")) return "venn";
    if (/pictogram/i.test(text) || topic.includes("pictogram")) return "pictogram";
    if (/tally/i.test(text) || topic.includes("tally")) return "tally_chart";
    if (/symmetry|reflect/i.test(text) || topic.includes("symmetry")) return "symmetry";
    if (/area|perimeter/i.test(text) || topic.includes("area") || topic.includes("perimeter")) return "area";
    if (/o'clock|half past|quarter past|quarter to|:\d{2}/i.test(text) || topic.includes("time") || topic.includes("clock")) return "clock";
    if (/coins?|pence|£|change/i.test(text) || topic.includes("money")) return "money";
    if (/place value|tens and ones|hundreds/i.test(text) || topic.includes("place_value")) return "place_value";
    if (/percentage|percent/i.test(text) || topic.includes("percentage")) return "percentage_bar";
    if (/probability|likely|certain|impossible/i.test(text) || topic.includes("probability")) return "probability";
    if (/ratio/i.test(text) || topic.includes("ratio")) return "ratio";
    if (/convert|mm|cm|metres|km|grams|kg|millilitres|litres/i.test(text) || topic.includes("conversion")) return "conversion_ladder";
    if (/thermometer|temperature|°C|degrees? celsius/i.test(text) || topic.includes("thermometer")) return "thermometer";
    if (/quadratic|parabola|x²/i.test(text) || topic.includes("quadratic")) return "quadratic";
    if (/speed.*distance|distance.*time|formula triangle/i.test(text) || topic.includes("formula_triangle")) return "formula_triangle";
    if (/line\s*graph/i.test(text) || topic.includes("line_graph")) return "line_graph";
    if (/carroll/i.test(text) || topic.includes("carroll")) return "carroll_diagram";
    if (/ruler|cm.*long|measure.*length/i.test(text)) return "ruler";
    if (/sequence|pattern|next.*number/i.test(text)) return "number_sequence";
  }

  // Science visuals
  if (["science", "basic_science", "biology", "chemistry", "physics"].includes(subject)) {
    if (/cell|organelle|nucleus|cytoplasm|mitochondr/i.test(text)) return "cell";
    if (/atom|proton|neutron|electron|atomic number/i.test(text)) return "atom";
    if (/ph\s*scale|acid|alkali|neutral/i.test(text)) return "ph_scale";
    if (/wave|amplitude|frequency|wavelength/i.test(text)) return "wave";
    if (/force|newton|push|pull|friction|gravity/i.test(text)) return "free_body";
    if (/circuit|battery|bulb|switch|resistor/i.test(text)) return "circuit";
    if (/punnett|dominant|recessive|genotype/i.test(text)) return "punnett";
    if (/molecule|H₂O|CO₂|formula/i.test(text)) return "molecule";
    if (/solid|liquid|gas|melting|freezing|evaporat/i.test(text)) return "state_changes";
    if (/energy store|kinetic|potential|thermal/i.test(text)) return "energy_stores";
    if (/periodic table|element|atomic mass/i.test(text)) return "periodic_element";
    if (/electromagnetic|spectrum|gamma|x-ray|ultraviolet/i.test(text)) return "em_spectrum";
  }

  // Business / Economics
  if (["economics", "commerce", "business"].includes(subject)) {
    if (/t-account|debit|credit|ledger/i.test(text)) return "t_account";
    if (/break.?even|fixed cost|variable cost/i.test(text)) return "break_even";
    if (/supply.*demand|equilibrium/i.test(text)) return "supply_demand";
  }

  // NVR
  if (["nvr"].includes(subject)) {
    if (/matrix|pattern|grid/i.test(text)) return "nvr_matrix";
  }

  // English
  if (["english", "english_studies", "ela"].includes(subject)) {
    if (/grammar|tense|noun|verb|adjective|adverb/i.test(text)) return "grammar";
    if (/synonym|antonym/i.test(text)) return "synonym_ladder";
    if (/prefix|suffix|root word/i.test(text)) return "word_builder";
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CELL POPULATION CHECK
// ═══════════════════════════════════════════════════════════════════════════════

async function getCellCount(curriculum, subject, grade, tier) {
  const { count, error } = await supabase
    .from("question_bank")
    .select("id", { count: "exact", head: true })
    .eq("curriculum", curriculum)
    .eq("subject", subject)
    .eq("year_level", grade)
    .eq("difficulty_tier", tier);

  if (error) return 0;
  return count || 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEDUP — check against existing questions
// ═══════════════════════════════════════════════════════════════════════════════

function normalise(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
}

async function getExistingFingerprints(curriculum, subject, grade) {
  const { data } = await supabase
    .from("question_bank")
    .select("question_text")
    .eq("curriculum", curriculum)
    .eq("subject", subject)
    .eq("year_level", grade)
    .limit(2000);

  const set = new Set();
  (data || []).forEach((row) => set.add(normalise(row.question_text)));
  return set;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATION LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function generateCell(curriculum, config, subject, grade, tier) {
  const tierObj = TIERS.find((t) => t.label === tier);
  if (!tierObj) return { generated: 0, skipped: false };

  // Check if cell is already populated
  if (FILL_GAPS) {
    const current = await getCellCount(curriculum, subject, grade, tier);
    if (current >= TARGET_PER_CELL) {
      return { generated: 0, skipped: true, current };
    }
  }

  // Get visual topics for this subject
  const subjectVisuals = VISUAL_TOPICS[subject] || VISUAL_TOPICS[subject.replace(/_/g, "")] || {};
  const allVisualTopics = Object.values(subjectVisuals).flat().filter((vt) => vt[3] <= grade);

  // Get existing fingerprints for dedup
  const existing = await getExistingFingerprints(curriculum, subject, grade);

  const model = pickModel();
  const prompt = buildPrompt(curriculum, config, subject, grade, tierObj, QUESTIONS_PER_CELL, allVisualTopics);

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would call ${model} for ${curriculum}/${subject}/Y${grade}/${tier} (${QUESTIONS_PER_CELL} Qs)`);
    return { generated: 0, skipped: false, dryRun: true };
  }

  try {
    const result = await callOpenRouter(prompt, model);
    const rawQs = result.questions || [];

    const batchId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const toInsert = [];

    for (const q of rawQs) {
      const validated = validateQuestion(q, subject);
      if (!validated) continue;

      // Dedup check
      const norm = normalise(validated.q);
      if (existing.has(norm)) continue;
      existing.add(norm);

      // Detect visual type
      const visualType = detectVisualType(validated, subject);
      const needsVis = visualType !== null;

      toInsert.push({
        curriculum,
        subject,
        year_level: grade,
        difficulty_tier: tier,
        difficulty: tierObj.difficulty,
        question_text: validated.q,
        question_type: validated.question_type,
        question_data: JSON.stringify(validated),
        batch_id: batchId,
        created_at: new Date().toISOString(),
        needs_visual: needsVis,
        visual_status: needsVis ? "auto" : "none", // "auto" = MathsVisualiser handles it
        image_type: visualType,
        hints: JSON.stringify(validated.hints),
        topic: validated.topic || null,
        ...(validated.passage ? { passage: validated.passage } : {}),
      });
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from("question_bank").insert(toInsert);
      if (error) {
        console.error(`  ✗ Insert error: ${error.message}`);
        return { generated: 0, error: error.message };
      }
    }

    return { generated: toInsert.length, model, total: rawQs.length, rejected: rawQs.length - toInsert.length };
  } catch (err) {
    console.error(`  ✗ ${curriculum}/${subject}/Y${grade}/${tier}: ${err.message}`);
    return { generated: 0, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONCURRENCY LIMITER
// ═══════════════════════════════════════════════════════════════════════════════

async function runWithConcurrency(tasks, limit) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
      // Rate limiting — 1.5s between calls
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  LaunchPard — Local Question Generator v2");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Mode:        ${DRY_RUN ? "DRY RUN" : FILL_GAPS ? "FILL GAPS" : "GENERATE"}`);
  console.log(`  Per cell:    ${QUESTIONS_PER_CELL} questions`);
  console.log(`  Concurrency: ${CONCURRENCY}`);
  if (FILTER_CURRICULUM) console.log(`  Curriculum:  ${FILTER_CURRICULUM}`);
  if (FILTER_SUBJECT) console.log(`  Subject:     ${FILTER_SUBJECT}`);
  if (FILTER_GRADE) console.log(`  Grade:       ${FILTER_GRADE}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (!OPENROUTER_KEY) {
    console.error("ERROR: OPENROUTER_API_KEY not set in .env.local");
    process.exit(1);
  }

  // Build task list
  const tasks = [];
  let totalCells = 0;

  for (const [currKey, config] of Object.entries(CURRICULA)) {
    if (FILTER_CURRICULUM && currKey !== FILTER_CURRICULUM) continue;

    for (const subject of config.subjects) {
      if (FILTER_SUBJECT && subject !== FILTER_SUBJECT) continue;

      for (const grade of config.grades) {
        if (FILTER_GRADE && grade !== FILTER_GRADE) continue;

        for (const tier of TIERS) {
          totalCells++;
          tasks.push(async () => {
            const result = await generateCell(currKey, config, subject, grade, tier.label);
            const status = result.skipped
              ? `⏭ SKIP (${result.current}/${TARGET_PER_CELL})`
              : result.dryRun
              ? "🔍 DRY RUN"
              : result.error
              ? `✗ ERROR`
              : `✓ +${result.generated} (${result.rejected || 0} rejected)`;

            console.log(
              `  ${status}  ${currKey} / ${subject} / Y${grade} / ${tier.label}${result.model ? ` [${result.model.split("/")[1]}]` : ""}`
            );
            return result;
          });
        }
      }
    }
  }

  console.log(`Total cells to process: ${totalCells}\n`);

  const results = await runWithConcurrency(tasks, CONCURRENCY);

  // Summary
  const totalGenerated = results.reduce((s, r) => s + (r?.generated || 0), 0);
  const totalSkipped = results.filter((r) => r?.skipped).length;
  const totalErrors = results.filter((r) => r?.error).length;

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`  COMPLETE`);
  console.log(`  Generated:  ${totalGenerated} questions`);
  console.log(`  Skipped:    ${totalSkipped} cells (already populated)`);
  console.log(`  Errors:     ${totalErrors}`);
  console.log("═══════════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
