#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CURRICULUM DRIFT AUDIT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Find questions whose topic_slug doesn't match their actual content.
 * Flags questions that reference no keywords for their assigned topic.
 *
 * Usage:
 *   node scripts/curriculumDriftAudit.mjs
 *   node scripts/curriculumDriftAudit.mjs --dry-run
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY
 *
 * Output:
 *   scripts/output/curriculum_drift_audit.csv
 *   scripts/output/curriculum_drift_deactivate.sql
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const outputDir = resolve(projectRoot, "scripts", "output");

// ─── Initialize Supabase ───────────────────────────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Parse CLI flags ───────────────────────────────────────────────────────
const dryRun = process.argv.includes("--dry-run");

// ─── Ensure output directory exists ─────────────────────────────────────
await mkdir(outputDir, { recursive: true });

console.log("🔍 CURRICULUM DRIFT AUDIT\n");
console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

// ─── Topic keywords map ──────────────────────────────────────────────────
// Map topic_slug to set of keywords that should appear in the question/answer
const TOPIC_KEYWORDS = {
  fractions: [
    "fraction", "numerator", "denominator", "half", "quarter", "third",
    "eighth", "sixteenth", "improper", "mixed number", "proper fraction",
    "equivalent fraction", "simplify", "unit fraction",
  ],
  decimals: [
    "decimal", "tenths", "hundredths", "thousandths", "0.", "point",
    "decimal point", "decimal place", "recurring decimal", "terminating",
  ],
  percentages: [
    "percent", "%", "per cent", "out of 100", "percentage", "proportion",
  ],
  multiplication: [
    "multiply", "multiplied", "×", "times", "product", "lots of", "groups of",
    "repeated addition", "array", "factor",
  ],
  division: [
    "divide", "divided", "÷", "quotient", "share equally", "split into",
    "distribute", "divisor", "remainder",
  ],
  addition: [
    "add", "plus", "+", "sum", "total", "altogether", "more than",
    "increase", "combine",
  ],
  subtraction: [
    "subtract", "minus", "-", "difference", "take away", "less than",
    "decrease", "fewer", "remove", "decrease",
  ],
  algebra: [
    "equation", "variable", "solve", "solve for", "expression", "coefficient",
    "unknown", "variable", "equal", "formula", "substitut",
  ],
  geometry: [
    "angle", "triangle", "circle", "rectangle", "perimeter", "area", "volume",
    "polygon", "radius", "diameter", "square", "parallelogram", "trapezium",
    "3d shape", "face", "edge", "vertex", "straight line", "parallel",
    "perpendicular", "congruent", "symmetry",
  ],
  probability: [
    "probability", "likelihood", "chance", "impossible", "certain", "likely",
    "unlikely", "outcome", "event", "random", "fair", "bias", "equally",
  ],
  place_value: [
    "place value", "units", "tens", "hundreds", "thousands", "digit",
    "million", "billion", "column", "value",
  ],
  coordinates: [
    "coordinate", "grid", "axis", "x-axis", "y-axis", "plot", "quadrant",
    "ordered pair", "origin",
  ],
  statistics: [
    "statistics", "data", "mean", "median", "mode", "range", "average",
    "frequency", "tally", "bar chart", "pie chart", "graph",
  ],
  measurement: [
    "measure", "measurement", "metre", "meter", "centimetre", "centimeter",
    "kilometre", "kilometer", "gram", "kilogram", "litre", "liter",
    "millilitre", "milliliter", "volume", "mass", "length", "width", "height",
  ],
  time: [
    "time", "hour", "minute", "second", "clock", "o'clock", "quarter past",
    "quarter to", "half past", "am", "pm", "o'clock", "day", "week", "month",
    "year", "date", "duration",
  ],
  money: [
    "money", "pound", "pence", "penny", "coin", "note", "price", "cost",
    "buy", "sell", "spend", "change", "currency", "naira", "kobo", "rupee",
    "dollar", "cent", "euro",
  ],
  rounding: [
    "round", "rounding", "nearest", "estimate", "approximate", "approximation",
  ],
  ratios: [
    "ratio", "proportion", "scale", "scaling", "scale factor", "unitary",
  ],
  functions: [
    "function", "input", "output", "rule", "map", "mapping", "domain", "range",
  ],
  sequences: [
    "sequence", "pattern", "term", "sequence rule", "arithmetic", "geometric",
    "nth term",
  ],
  exponents: [
    "power", "exponent", "square", "squared", "cube", "cubed", "root",
    "square root", "index", "indices",
  ],
  inequalities: [
    "inequality", "inequation", "greater than", "less than", ">", "<",
    "greater than or equal", "less than or equal", "≥", "≤",
  ],
  sets: [
    "set", "union", "intersection", "element", "subset", "venn diagram",
    "universal set",
  ],
  vectors: [
    "vector", "magnitude", "direction", "column vector", "scalar",
  ],
  matrices: [
    "matrix", "matrice", "element", "row", "column", "determinant", "inverse",
  ],
  transformations: [
    "transformation", "translate", "rotation", "reflection", "enlarge",
    "scale", "tessellation", "congruent", "similar",
  ],
  angles: [
    "angle", "degree", "acute", "obtuse", "reflex", "straight", "right angle",
    "complementary", "supplementary", "vertically opposite",
  ],
  trigonometry: [
    "trigonometric", "sine", "cosine", "tangent", "sin", "cos", "tan",
    "soh cah toa", "hypotenuse", "adjacent", "opposite",
  ],
  calculus: [
    "derivative", "differentiate", "differential", "integral", "integrate",
    "limit", "gradient", "stationary point", "tangent",
  ],
  biology: [
    "cell", "organism", "dna", "protein", "photosynthesis", "respiration",
    "enzyme", "mitochondria", "chloroplast", "nucleus", "tissue", "organ",
    "system", "ecosystem", "evolution", "adaptation", "species", "adaptation",
  ],
  chemistry: [
    "atom", "element", "compound", "molecule", "reaction", "chemical",
    "oxidation", "reduction", "acid", "base", "salt", "ph", "ionic",
    "covalent", "valence", "electron", "neutron", "proton", "periodic table",
  ],
  physics: [
    "force", "velocity", "acceleration", "momentum", "energy", "power",
    "work", "gravity", "motion", "speed", "distance", "time", "wave",
    "frequency", "wavelength", "light", "sound", "electricity", "magnet",
    "current", "voltage", "resistance", "newton", "joule", "watt",
  ],
  english_grammar: [
    "noun", "verb", "adjective", "adverb", "pronoun", "preposition",
    "conjunction", "sentence", "clause", "phrase", "tense", "past", "present",
    "future", "plural", "singular", "grammar",
  ],
  reading_comprehension: [
    "comprehension", "understand", "meaning", "infer", "inference", "summary",
    "main idea", "detail", "character", "setting", "plot", "theme", "author",
  ],
};

console.log(`📋 Loaded ${Object.keys(TOPIC_KEYWORDS).length} topic patterns\n`);

// ─── Fetch all active questions in pages ────────────────────────────────
let allQuestions = [];
let pageNum = 0;
const pageSize = 1000;

console.log("📖 Fetching active questions...");

while (true) {
  const offset = pageNum * pageSize;
  const { data, error } = await supabase
    .from("question_bank")
    .select("id, topic, subject, curriculum, year_level, question_text, options, explanation, correct_index, also_curricula")
    .eq("is_active", true)
    .order("curriculum, subject, year_level")
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error(`❌ Fetch error at page ${pageNum}:`, error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    break;
  }

  allQuestions = allQuestions.concat(data);
  pageNum++;
  console.log(`  Page ${pageNum} processed... (${allQuestions.length} total)`);
}

console.log(`✅ Fetched ${allQuestions.length} active questions\n`);

// ─── Helper: extract correct answer text ────────────────────────────────
function getCorrectAnswerText(q) {
  if (q.options && typeof q.correct_index === "number" && q.correct_index >= 0 && q.correct_index < q.options.length) {
    return q.options[q.correct_index] || "";
  }
  return "";
}

// ─── Helper: normalize and check keyword match ──────────────────────────
function checkTopicKeywordMatch(topicSlug, questionText, answerText) {
  if (!TOPIC_KEYWORDS[topicSlug]) {
    return { matched: false, keywords: [] };
  }

  const keywords = TOPIC_KEYWORDS[topicSlug];
  const fullText = `${questionText || ""} ${answerText || ""}`.toLowerCase();
  const matchedKeywords = [];

  for (const kw of keywords) {
    // Case-insensitive substring match (word-boundary aware for short keywords)
    const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(fullText)) {
      matchedKeywords.push(kw);
    }
  }

  return {
    matched: matchedKeywords.length > 0,
    keywords: matchedKeywords,
  };
}

// ─── Analyze each question ──────────────────────────────────────────────
const results = [];
const deactivateCandidates = [];
let flaggedCount = 0;
const flagByTopic = {};

console.log("🔬 Analyzing topic drift...\n");

for (let i = 0; i < allQuestions.length; i++) {
  const q = allQuestions[i];
  const topicSlug = q.topic || "general";
  const answerText = getCorrectAnswerText(q);
  const questionPreview = (q.question_text || "").substring(0, 80);
  const answerPreview = (answerText || "").substring(0, 80);

  const { matched, keywords } = checkTopicKeywordMatch(topicSlug, q.question_text || "", answerText);

  let flag = "ok";
  let isDriftCandidate = false;

  // Cross-curricula questions use intentionally neutral language that spans
  // multiple curricula — they should never be flagged as drift.
  const isCrosscurricula = Array.isArray(q.also_curricula) && q.also_curricula.length > 0;

  if (!matched && TOPIC_KEYWORDS[topicSlug] && !isCrosscurricula) {
    flag = "drift_candidate";
    flaggedCount++;
    flagByTopic[topicSlug] = (flagByTopic[topicSlug] || 0) + 1;

    // High-confidence drift: topic in map, zero keywords, >20 chars
    if ((q.question_text || "").length > 20) {
      isDriftCandidate = true;
      deactivateCandidates.push(q.id);
    }
  } else if (!matched && TOPIC_KEYWORDS[topicSlug] && isCrosscurricula) {
    // Skipped: cross-curricula question with no topic keywords
    // This is expected — neutral language is intentional for cross-curricula use
    flag = "cross_curricula_skip";
  }

  results.push({
    question_id: q.id,
    topic_slug: topicSlug,
    subject: q.subject,
    curriculum: q.curriculum,
    year_level: q.year_level,
    question_text_preview: questionPreview,
    correct_answer_preview: answerPreview,
    flag,
    matched_keywords: keywords.join("; ") || "",
    also_curricula: Array.isArray(q.also_curricula) ? q.also_curricula.join("|") : "",
  });

  if ((i + 1) % 5000 === 0) {
    console.log(`  Processed ${i + 1}/${allQuestions.length} questions...`);
  }
}

console.log(`✅ Analysis complete. Flagged: ${flaggedCount} questions\n`);

// ─── Write output CSV ──────────────────────────────────────────────────
const csvPath = resolve(outputDir, "curriculum_drift_audit.csv");

if (!dryRun) {
  const headers = [
    "question_id",
    "topic_slug",
    "subject",
    "curriculum",
    "year_level",
    "question_text_preview",
    "correct_answer_preview",
    "flag",
    "matched_keywords",
    "also_curricula",
  ].join(",");

  const rows = results.map(r =>
    [
      r.question_id,
      `"${r.topic_slug}"`,
      r.subject,
      r.curriculum,
      r.year_level,
      `"${r.question_text_preview.replace(/"/g, '""')}"`,
      `"${r.correct_answer_preview.replace(/"/g, '""')}"`,
      r.flag,
      `"${r.matched_keywords.replace(/"/g, '""')}"`,
      `"${(r.also_curricula || "").replace(/"/g, '""')}"`,
    ].join(",")
  );

  const csvContent = [headers, ...rows].join("\n");
  await writeFile(csvPath, csvContent, "utf-8");
  console.log(`📁 CSV written to: ${csvPath}\n`);
} else {
  console.log(`📋 [DRY RUN] Would write ${results.length} rows to CSV\n`);
}

// ─── Write deactivation SQL ─────────────────────────────────────────────
const sqlPath = resolve(outputDir, "curriculum_drift_deactivate.sql");

if (!dryRun && deactivateCandidates.length > 0) {
  const idList = deactivateCandidates.map(id => `'${id}'`).join(", ");
  const sqlContent = `-- AUTO-GENERATED: Deactivate high-confidence curriculum drift candidates
-- Generated: ${new Date().toISOString()}
-- High-confidence criteria: topic_slug in TOPIC_KEYWORDS, zero keyword matches,
--   question_text > 20 chars, AND also_curricula IS empty (cross-curricula questions excluded)
-- Count: ${deactivateCandidates.length} questions

UPDATE question_bank
SET is_active = false
WHERE id IN (${idList});
`;
  await writeFile(sqlPath, sqlContent, "utf-8");
  console.log(`📁 SQL deactivation script written to: ${sqlPath}\n`);
} else if (deactivateCandidates.length > 0) {
  console.log(`📋 [DRY RUN] Would write ${deactivateCandidates.length} deactivation candidates to SQL\n`);
} else {
  console.log(`✅ No high-confidence drift candidates to deactivate\n`);
}

// ─── Print summary ──────────────────────────────────────────────────────
console.log("═".repeat(60));
console.log("SUMMARY");
console.log("═".repeat(60));
console.log(`Total questions checked:      ${allQuestions.length}`);
console.log(`Total flagged (drift):        ${flaggedCount}`);
console.log(`Flagged %:                    ${((flaggedCount / allQuestions.length) * 100).toFixed(2)}%`);
console.log(`High-confidence deactivate:   ${deactivateCandidates.length}`);

if (Object.keys(flagByTopic).length > 0) {
  console.log("\nFlagged by topic:");
  const sorted = Object.entries(flagByTopic).sort((a, b) => b[1] - a[1]);
  for (const [topic, count] of sorted.slice(0, 15)) {
    console.log(`  • ${topic}: ${count}`);
  }
  if (sorted.length > 15) {
    console.log(`  ... and ${sorted.length - 15} more topics`);
  }
}

console.log("\n✅ Audit complete.");
process.exit(0);
