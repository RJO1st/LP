#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// LAUNCHPARD — AI QUESTION GENERATION ENGINE v2
// ═══════════════════════════════════════════════════════════════════════════════
// Generates high-quality, age-appropriate questions using AI models via OpenRouter.
//
// Usage:
//   node scripts/generateQuestionsV2.mjs --curriculum ng_sss --subject mathematics --year 2
//   node scripts/generateQuestionsV2.mjs --curriculum ng_sss --all
//   node scripts/generateQuestionsV2.mjs --all                     # everything
//   node scripts/generateQuestionsV2.mjs --dry-run --curriculum ng_sss --subject physics --year 1
//
// Env vars needed (in .env.local):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import JSON5 from "json5";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Exam focus areas + per-year topic expansions ─────────────────────────────
import {
  EXAM_FOCUS,
  YEAR_TOPICS,
  getYearTopics,
  getExamFocusTopics,
  getExamsForCurriculum,
  getAssessmentTargets,
  getEquivalentCurricula,
} from "../src/lib/examFocusAreas.js";

// ─── Visual hint detection ───────────────────────────────────────────────────
import { resolveVisualType } from "../src/lib/visualDetectors.js";

// ─── Cross-curriculum tagging ────────────────────────────────────────────────
// Returns an array of additional curricula where a question is also valid.
// e.g. uk_national maths Y3 → also valid for ng_primary, ca_primary
function getAlsoCurricula(curriculum, subject, year) {
  // Only maths and science share across curricula (for now)
  const isMaths   = subject === "mathematics" || subject === "maths";
  const isScience = subject === "science" || subject === "basic_science";
  if (!isMaths && !isScience) return [];

  const equiv = getEquivalentCurricula(curriculum, year);
  // Remove self from the list
  return equiv.filter(c => c !== curriculum);
}

// ─── Curriculum Standards RAG ────────────────────────────────────────────────
// Fetches official curriculum standards from curriculum_standards table for a
// given subject/year. These are injected into the AI prompt so generated
// questions are aligned to specific NC statements (e.g. "NC-Y3-N-AS-1").
// This is the single most impactful change for curriculum alignment — the AI
// now knows EXACTLY what the National Curriculum expects at each year level.
const _stdCache = new Map();

async function fetchCurriculumStandards(curriculum, subject, year) {
  const curId = curriculum.toLowerCase();
  // Map subject to DB format
  const subMap = { maths: "mathematics", math: "mathematics", basic_science: "science" };
  const dbSubject = subMap[subject] || subject;
  const yr = parseInt(year, 10) || 1;

  const cacheKey = `${curId}:${dbSubject}:${yr}`;
  if (_stdCache.has(cacheKey)) return _stdCache.get(cacheKey);

  try {
    const { data, error } = await supabase
      .from("curriculum_standards")
      .select(`
        standard_code,
        statement,
        year_level,
        bloom_level,
        difficulty_band,
        is_statutory,
        strand:curriculum_strands!inner ( strand_name, strand_code )
      `)
      .eq("curriculum_id", curId)
      .eq("subject", dbSubject)
      .eq("year_level", yr)
      .order("standard_code");

    if (error) {
      console.warn(`  ⚠ Standards lookup failed: ${error.message}`);
      _stdCache.set(cacheKey, []);
      return [];
    }

    const standards = (data || []).map(s => ({
      code:       s.standard_code,
      statement:  s.statement,
      bloom:      s.bloom_level,
      difficulty: s.difficulty_band,
      statutory:  s.is_statutory,
      strand:     s.strand?.strand_name,
    }));

    _stdCache.set(cacheKey, standards);
    return standards;
  } catch (err) {
    console.warn(`  ⚠ Standards fetch error: ${err.message}`);
    _stdCache.set(cacheKey, []);
    return [];
  }
}

/**
 * Fetch coverage gaps from curriculum_coverage_stats for a subject/year.
 * Returns standards grouped by severity so the generator can prioritize.
 */
// ─── Concept Card fetcher ────────────────────────────────────────────────────
// Fetches the best concept card for a given topic/curriculum/year_band from the
// concept_cards table, following the same fallback chain as /api/concept-cards:
//   1. Exact match (curriculum + year_band)
//   2. Universal + year_band
//   3. Curriculum, any year_band
//   4. Universal, any year_band → null if nothing
//
// The card's key_concept, worked_example, and memory_hook are injected into the
// question generation prompt so questions test exactly what the card teaches.
const _cardCache = new Map();
async function fetchConceptCard(topicSlug, curriculum, subject, yearBand) {
  if (!topicSlug) return null;
  const cacheKey = `${topicSlug}::${curriculum}::${yearBand}`;
  if (_cardCache.has(cacheKey)) return _cardCache.get(cacheKey);

  try {
    // Build fallback chain as a single query: fetch all matching rows, then pick best
    const { data, error } = await supabase
      .from("concept_cards")
      .select("topic_slug, curriculum, year_band, subject, title, hook, key_concept, worked_example, memory_hook, difficulty_hint")
      .eq("topic_slug", topicSlug)
      .eq("subject", subject.toLowerCase())
      .in("curriculum", [curriculum, "universal"])
      .limit(10);

    if (error || !data?.length) {
      _cardCache.set(cacheKey, null);
      return null;
    }

    // Pick best card: exact > universal+band > curriculum+any > universal+any
    const score = (c) =>
      (c.curriculum === curriculum ? 2 : 0) +
      (c.year_band === yearBand   ? 1 : 0);
    const best = data.sort((a, b) => score(b) - score(a))[0];
    _cardCache.set(cacheKey, best);
    return best;
  } catch (err) {
    console.warn(`  ⚠ Concept card fetch error: ${err.message}`);
    _cardCache.set(cacheKey, null);
    return null;
  }
}

// Map numeric year level to year_band string (matches concept_cards schema)
function yearToYearBand(curriculum, year) {
  const yr = parseInt(year, 10) || 4;
  const cur = (curriculum || "").toLowerCase();
  if (cur.startsWith("ng_")) {
    return cur === "ng_sss" ? "sss" : "jss";
  }
  if (yr <= 2) return "ks1";
  if (yr <= 6) return "ks2";
  if (yr <= 9) return "ks3";
  return "ks4";
}

async function fetchCoverageGaps(curriculum, subject, year) {
  const subMap = { maths: "mathematics", math: "mathematics", basic_science: "science" };
  const dbSubject = subMap[subject] || subject;
  const yr = parseInt(year, 10) || 1;

  try {
    const { data, error } = await supabase
      .from("curriculum_coverage_stats")
      .select(`
        total_questions,
        gap_severity,
        coverage_score,
        standard:curriculum_standards!inner (
          standard_code,
          statement,
          strand:curriculum_strands!inner ( strand_name )
        )
      `)
      .eq("curriculum_id", curriculum.toLowerCase())
      .eq("subject", dbSubject)
      .eq("year_level", yr)
      .in("gap_severity", ["critical", "high", "medium"]);

    if (error || !data?.length) return { critical: [], high: [], medium: [] };

    const result = { critical: [], high: [], medium: [] };
    for (const row of data) {
      const entry = {
        code:      row.standard?.standard_code,
        statement: row.standard?.statement,
        strand:    row.standard?.strand?.strand_name,
        questions: row.total_questions,
      };
      if (row.gap_severity === "critical") result.critical.push(entry);
      else if (row.gap_severity === "high") result.high.push(entry);
      else result.medium.push(entry);
    }
    return result;
  } catch (err) {
    console.warn(`  ⚠ Coverage gap fetch error: ${err.message}`);
    return { critical: [], high: [], medium: [] };
  }
}

// ─── Load .env.local ─────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const envPath = resolve(__dirname, "..", ".env.local");
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (e) {
    console.warn("⚠ Could not load .env.local:", e.message);
  }
}
loadEnv();

// ─── Supabase ────────────────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase env vars — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── OpenRouter ──────────────────────────────────────────────────────────────
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// ─── Model pool: distributed round-robin, with fallback cascade ──────────────
// PRIMARY_MODELS — high-quality, reliable JSON output; rotated round-robin
const PRIMARY_MODELS = [
  "openai/gpt-4o-mini",
  "google/gemini-2.0-flash-lite-001",
  "deepseek/deepseek-v3.2",
  "google/gemini-2.5-flash-lite-preview-09-2025",
  "qwen/qwen3-30b-a3b-instruct-2507",
  "meta-llama/llama-3.3-70b-instruct",
];

// FALLBACK_MODELS — used only when all primary models fail on a given request
const FALLBACK_MODELS = [
  "mistralai/mistral-small-3.1-24b-instruct",
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "xiaomi/mimo-v2-flash",
  "google/gemma-3-27b-it:free",
  "qwen/qwen3.5-9b",
  "microsoft/phi-4",
  "meta-llama/llama-4-scout:free",
  "arcee-ai/trinity-large-preview:free",
];

// Combined list for fallback cascade (primary first, then fallback)
const MODELS = [...PRIMARY_MODELS, ...FALLBACK_MODELS];

// Round-robin counter — each call starts at the next primary model
let roundRobinIdx = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// CURRICULUM DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const CURRICULA = {
  // ─── UK ──────────────────────────────────────────────────────────────────
  uk_national: {
    label: "UK National Curriculum",
    years: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    subjects: {
      mathematics: { topics: null }, // topics resolved per year below
      english:     { topics: null },
      science:     { topics: null },
    },
  },
  uk_11plus: {
    label: "UK 11+ Entrance",
    years: [3, 4, 5, 6],
    subjects: {
      maths:              { topics: null },
      english:            { topics: null },
      verbal_reasoning:   { topics: null },
      non_verbal_reasoning: { topics: null },
    },
  },

  // ─── Nigeria ─────────────────────────────────────────────────────────────
  ng_primary: {
    label: "Nigerian Primary (Primary 1–6)",
    years: [1, 2, 3, 4, 5, 6],
    subjects: {
      mathematics:     { topics: null },
      english_studies: { topics: null },
      basic_science:   { topics: null },
      social_studies:  { topics: null },
      civic_education: { topics: null },
    },
  },
  ng_jss: {
    label: "Nigerian Junior Secondary (JSS 1–3)",
    years: [1, 2, 3],
    subjects: {
      mathematics:             { topics: null },
      english_studies:         { topics: null },
      basic_science:           { topics: null },
      basic_technology:        { topics: null },
      social_studies:          { topics: null },
      civic_education:         { topics: null },
      business_education:      { topics: null },
      cultural_and_creative_arts: { topics: null },
      religious_studies:       { topics: null },
      pre_vocational_studies:  { topics: null },
    },
  },
  ng_sss: {
    label: "Nigerian Senior Secondary (SSS 1–3)",
    years: [1, 2, 3],
    subjects: {
      mathematics:        { topics: null },
      further_mathematics: { topics: null },
      english:            { topics: null },
      literature:         { topics: null },
      physics:            { topics: null },
      chemistry:          { topics: null },
      biology:            { topics: null },
      economics:          { topics: null },
      government:         { topics: null },
      geography:          { topics: null },
      history:            { topics: null },
      commerce:           { topics: null },
      accounting:         { topics: null },
      civic_education:    { topics: null },
    },
  },

  // ─── Canada ──────────────────────────────────────────────────────────────
  ca_primary: {
    label: "Canadian Primary",
    years: [1, 2, 3, 4, 5, 6],
    subjects: {
      mathematics: { topics: null },
      english:     { topics: null },
      science:     { topics: null },
    },
  },
  ca_secondary: {
    label: "Canadian Secondary",
    years: [7, 8, 9, 10],
    subjects: {
      mathematics: { topics: null },
      english:     { topics: null },
      science:     { topics: null },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const QUESTION_TYPES = ["mcq", "true_false", "fill_in_blank", "multi_select", "short_answer"];
const DIFFICULTY_TIERS = ["foundation", "developing", "expected", "advanced"];

// Weights — MCQ most common, others mixed in (base pool for non-maths)
const TYPE_WEIGHTS = { mcq: 0.50, true_false: 0.12, fill_in_blank: 0.15, multi_select: 0.13, short_answer: 0.10 };

// Interactive types reserved for maths + appropriate age bands
// ordering  — sequence steps/fractions/events (KS1–KS3 maths)
// number_line — place a value on a number line (KS1–KS3 maths)
// fraction_bar — shade a fraction bar (KS1–KS3 maths, not KS4)
const MATHS_INTERACTIVE_WEIGHTS = {
  ks1: { ordering: 0.06, number_line: 0.06, fraction_bar: 0.04 },
  ks2: { ordering: 0.05, number_line: 0.05, fraction_bar: 0.04 },
  ks3: { ordering: 0.04, number_line: 0.03, fraction_bar: 0.02 },
  ks4: {},  // no interactive types at KS4 — GCSE is entirely text/MCQ
};

function pickQuestionType() {
  const r = Math.random();
  let cum = 0;
  for (const [type, w] of Object.entries(TYPE_WEIGHTS)) {
    cum += w;
    if (r <= cum) return type;
  }
  return "mcq";
}

// Context-aware picker: supplements base pool with interactive types for maths
function pickQuestionTypeForContext(subject, band) {
  const isMaths = /^(mathematics|maths|math|further_mathematics)$/i.test(subject);
  if (!isMaths) return pickQuestionType();

  const interactiveWeights = MATHS_INTERACTIVE_WEIGHTS[band] || {};
  const totalInteractive = Object.values(interactiveWeights).reduce((s, w) => s + w, 0);

  const r = Math.random();
  // Check interactive pool first
  let cum = 0;
  for (const [type, w] of Object.entries(interactiveWeights)) {
    cum += w;
    if (r <= cum) return type;
  }
  // Remaining probability → base pool, rescaled
  const remaining = r - cum;
  const scale = 1 - totalInteractive;
  let baseCum = 0;
  for (const [type, w] of Object.entries(TYPE_WEIGHTS)) {
    baseCum += w * scale;
    if (remaining <= baseCum) return type;
  }
  return "mcq";
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGE-BAND CONTEXT (for prompt engineering)
// ═══════════════════════════════════════════════════════════════════════════════

function getAgeBandContext(curriculum, year) {
  const cur = curriculum.toLowerCase();
  if (cur === "ng_primary") {
    return year <= 2
      ? { band: "ks1", ageRange: "5–7", label: "Primary 1–2" }
      : { band: "ks2", ageRange: "8–11", label: `Primary ${year}` };
  }
  if (cur === "ng_jss") {
    return { band: "ks3", ageRange: "11–14", label: `JSS ${year}` };
  }
  if (cur === "ng_sss") {
    return { band: "ks4", ageRange: "15–17", label: `SSS ${year}` };
  }
  if (cur === "ca_secondary") {
    return year <= 8
      ? { band: "ks3", ageRange: "12–14", label: `Grade ${year}` }
      : { band: "ks4", ageRange: "14–16", label: `Grade ${year}` };
  }
  // Default UK-style
  if (year <= 2) return { band: "ks1", ageRange: "5–7", label: `Year ${year}` };
  if (year <= 6) return { band: "ks2", ageRange: "7–11", label: `Year ${year}` };
  if (year <= 9) return { band: "ks3", ageRange: "11–14", label: `Year ${year}` };
  return { band: "ks4", ageRange: "14–17", label: `Year ${year}` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildPrompt({ curriculum, subject, year, batchSize, questionTypes, difficultyTier, existingTopics, yearTopics, examFocusTopics, examTips, recentQuestions, assessmentTargets, curriculumStandards, coverageGaps, conceptCard }) {
  const ctx = getAgeBandContext(curriculum, year);
  const curDef = CURRICULA[curriculum];

  const typeInstructions = {
    mcq: `"mcq": 4 options (A-D), one correct. Set correct_index (0-3).`,
    true_false: `"true_false": A statement that is either true or false. Options: ["True", "False"]. Set correct_index 0 or 1.`,
    fill_in_blank: `"fill_in_blank": Question MUST contain a blank shown as ___ (three underscores) where the answer goes. Example: "The capital of France is ___." Set answer_text to the word/phrase that fills the blank. CRITICAL: Every fill_in_blank question_text MUST include ___ — never omit it.`,
    multi_select: `"multi_select": 4-6 options, 2-3 correct. Set correct_indices as array of correct indices.`,
    short_answer: `"short_answer": Open question requiring 1-3 sentence answer. Set answer_text to model answer. Set answer_aliases to array of acceptable alternative phrasings.`,
    ordering: `"ordering": Scholar must arrange 4–6 items into the correct sequence. Set "items" as the array of display strings (already in a shuffled order — do NOT provide them in correct order). Set "correct_order" as the array of 0-based indices that produces the correct sequence when items are re-arranged. Example: items: ["Step C","Step A","Step B"], correct_order: [1,2,0] means the correct sequence is items[1], items[2], items[0] = "Step A, Step B, Step C". Use for: ordering fractions smallest→largest, sequencing a scientific process, ordering historical events, arranging steps in a method. ONLY for mathematics or science.`,
    number_line: `"number_line": Scholar clicks/taps a point on a number line to indicate a value. Set "number_line": {"min": number, "max": number, "step": number, "correct": number}. The "correct" value MUST be exactly reachable as min + (integer × step). Keep (max−min)/step ≤ 20 ticks for mobile usability. Examples: {"min":0,"max":10,"step":1,"correct":7}; {"min":0,"max":1,"step":0.1,"correct":0.6}; {"min":0,"max":100,"step":5,"correct":35}. Use for: placing a value on a number line, reading scales, locating fractions/decimals, estimating position. ONLY for mathematics.`,
    fraction_bar: `"fraction_bar": Scholar clicks segments to shade the correct fraction. Set "fraction": {"numerator": N, "denominator": D} where D is 2–12 and 0 ≤ N ≤ D. The question_text MUST tell the scholar which fraction to shade (e.g. "Shade 3/8 of the fraction bar."). Do NOT set numerator === denominator (trivially all-filled). Do NOT set numerator === 0 (trivially empty). Use for: visualising fractions, equivalent fractions, comparing parts of a whole. ONLY for mathematics.`,
  };

  const requestedTypes = questionTypes.map(t => typeInstructions[t]).join("\n");

  // ─── Topic guidance: prefer per-year topics, fall back to DB topics ────
  let topicGuidance = "";
  if (yearTopics?.length) {
    topicGuidance = `\nCURRICULUM TOPICS FOR THIS EXACT YEAR (generate questions covering ALL of these):\n${yearTopics.join(", ")}`;
    if (existingTopics?.length) {
      // Show which DB topics exist but aren't in the year list (may need coverage too)
      const yearSet = new Set(yearTopics);
      const extraDB = existingTopics.filter(t => !yearSet.has(t)).slice(0, 15);
      if (extraDB.length) {
        topicGuidance += `\n\nAdditional topics already in DB for this year (also cover if relevant):\n${extraDB.join(", ")}`;
      }
    }
  } else if (existingTopics?.length) {
    topicGuidance = `\nExisting topics in DB for this subject/year (generate questions on THESE topics plus any missing curriculum topics):\n${existingTopics.slice(0, 30).join(", ")}`;
  }

  // ─── Exam focus guidance ───────────────────────────────────────────────
  let examGuidance = "";
  if (examFocusTopics?.length) {
    examGuidance = `\nEXAM PRIORITY TOPICS (these topics are heavily tested in exams — generate MORE questions on these):\n${examFocusTopics.join(", ")}`;
    if (examTips) {
      examGuidance += `\n\nEXAM TIP: ${examTips}`;
    }
  }

  // ─── Dedup guidance: show recent questions to avoid ──────────────────
  let dedupGuidance = "";
  if (recentQuestions?.length) {
    const samples = recentQuestions.slice(0, 10).map(q => `- "${q}"`).join("\n");
    dedupGuidance = `\nALREADY GENERATED (do NOT repeat these or create very similar questions):\n${samples}`;
  }

  // ─── Assessment target guidance: granular "I can..." skills ─────────
  let assessmentGuidance = "";
  if (assessmentTargets && typeof assessmentTargets === "object") {
    const strands = Object.entries(assessmentTargets)
      .map(([strand, targets]) => {
        const strandLabel = strand.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        return `${strandLabel}:\n${targets.map(t => `  • ${t}`).join("\n")}`;
      })
      .join("\n");
    assessmentGuidance = `\nASSESSMENT TARGETS — Each question should test one of these specific skills:\n${strands}`;
  }

  // ─── Curriculum standards guidance (RAG from curriculum_standards DB) ──
  let standardsGuidance = "";
  if (curriculumStandards?.length) {
    // Group by strand for readability
    const byStrand = {};
    for (const s of curriculumStandards) {
      const key = s.strand || "General";
      if (!byStrand[key]) byStrand[key] = [];
      byStrand[key].push(s);
    }
    const formatted = Object.entries(byStrand)
      .map(([strand, stds]) => {
        const lines = stds.map(s =>
          `  [${s.code}] ${s.statement}${s.bloom ? ` (Bloom: ${s.bloom})` : ""}`
        ).join("\n");
        return `${strand}:\n${lines}`;
      })
      .join("\n");
    standardsGuidance = `\nOFFICIAL CURRICULUM STANDARDS — Every question MUST align to one of these National Curriculum statements. Tag each question's "standard_code" field with the matching code:\n${formatted}`;
  }

  // ─── Coverage gap guidance: prioritise under-served standards ──────────
  let gapGuidance = "";
  if (coverageGaps) {
    const criticalStds = coverageGaps.critical || [];
    const highStds = coverageGaps.high || [];
    if (criticalStds.length || highStds.length) {
      const lines = [];
      if (criticalStds.length) {
        lines.push("CRITICAL GAPS (0 questions exist — generate AT LEAST 2 questions for each):");
        for (const g of criticalStds.slice(0, 12)) {
          lines.push(`  ★ [${g.code}] ${g.statement} (${g.strand || "General"})`);
        }
      }
      if (highStds.length) {
        lines.push("HIGH GAPS (<5 questions exist — generate at least 1 question for each):");
        for (const g of highStds.slice(0, 8)) {
          lines.push(`  ◆ [${g.code}] ${g.statement} — currently ${g.questions} Qs`);
        }
      }
      gapGuidance = `\nCOVERAGE GAP PRIORITY — These curriculum standards are under-served in our question bank. Prioritise generating questions that fill these gaps:\n${lines.join("\n")}`;
    }
  }

  // ─── Concept card grounding block ──────────────────────────────────────────
  // When a concept card exists for the topic being generated, we inject it so
  // all questions are grounded in the same teaching context the scholar just read.
  // This guarantees question-card alignment (what they learned = what they're tested on).
  let conceptCardGuidance = "";
  if (conceptCard) {
    const workedSteps = Array.isArray(conceptCard.worked_example)
      ? conceptCard.worked_example.flatMap(ex =>
          Array.isArray(ex.steps) ? ex.steps.slice(0, 4) : []
        ).slice(0, 5).map(s => `    ${s}`).join("\n")
      : "";
    conceptCardGuidance = `
CONCEPT CARD FOR THIS TOPIC — Align all questions to this teaching material:
  Title: ${conceptCard.title || ""}
  Core concept: ${conceptCard.key_concept || ""}
${workedSteps ? `  Worked example steps:\n${workedSteps}` : ""}
  Memory hook: ${conceptCard.memory_hook || ""}

CONCEPT CARD RULES:
- At least 60% of questions must directly test the core concept above
- The worked example demonstrates the correct METHOD — generate questions that test this method
- Do NOT test knowledge outside the scope of this concept card for this batch
- The memory hook reveals a common pitfall or shortcut — at least one question should test whether scholars know when to apply it correctly vs incorrectly`;
  }

  return `You are an expert educational content creator for ${curDef.label}.
Generate exactly ${batchSize} high-quality questions for:
- Subject: ${subject}
- Year/Grade: ${ctx.label} (ages ${ctx.ageRange}, equivalent to UK ${ctx.band.toUpperCase()})
- Curriculum: ${curriculum}
- Difficulty tier: ${difficultyTier}
${conceptCardGuidance}
${topicGuidance}
${examGuidance}
${dedupGuidance}
${assessmentGuidance}
${standardsGuidance}
${gapGuidance}

CRITICAL RULES:
1. Questions MUST be age-appropriate for ${ctx.ageRange} year olds at ${ctx.band.toUpperCase()} level
2. ${ctx.band === "ks4" ? "These are SENIOR SECONDARY students. Questions must be at GCSE/WAEC/NECO difficulty. NO primary-school questions like 'how many sides does a triangle have' or 'what is 3+5'. Think: quadratic equations, organic chemistry, literary analysis, advanced physics." : ""}
3. ${ctx.band === "ks3" ? "These are JUNIOR SECONDARY students (11-14). Questions should test analytical thinking, not just recall. Think: algebraic expressions, cell biology, comprehension analysis." : ""}
4. ${ctx.band === "ks2" ? "Upper primary level. Questions should involve multi-step thinking, not just basic recall." : ""}
5. ${ctx.band === "ks1" ? `Early years (5-7). CRITICAL: Use ONLY simple vocabulary, max 10 words per sentence, max 2 syllables per word. AVOID: dispersal, perpendicular, photosynthesis, metamorphosis, bisect, numerator, denominator, equilateral, circumference, parallelogram, hypothesis, evaporation, condensation, precipitation, vertebrate, invertebrate, amphibian, carnivore, herbivore, omnivore, ecosystem, adaptation, respiration, reproduction, fertilisation, germination, pollination, decomposition, translucent, transparent, opaque, conductor, insulator, magnetism, electricity, chromosome, molecule, atom, nucleus, electron, proton, neutron, algorithm, variable, coefficient, equation, inequality, integer, percentage, quotient, remainder, dividend, divisor, multiplication, addition (use "add" or "plus" instead), perimeter, symmetry, reflection, rotation, translation, coordinates, quadrilateral, polygon, pentagon, hexagon, octagon, rhombus, trapezoid, congruent, adjacent, corresponding, alternate, supplementary, complementary, isosceles, scalene, obtuse, reflex, capacity, millilitre, kilogram, centimetre, kilometre, probability, statistics, frequency, tally. Use familiar contexts ONLY: home, family, pets, toys, food, school, playground, weather, body parts, garden, farm animals, colours, simple shapes. Single-step problems. Teach WHY answers are right, not just state it.` : ""}
6. Every question MUST have a thorough explanation (minimum 3 sentences): explain WHY the correct answer is right, then briefly explain why EACH wrong option is wrong. For MCQ, address all 4 options
7. Distractors (wrong answers) must be plausible — common misconceptions, not random
8. ${yearTopics?.length ? `Distribute questions across the listed curriculum topics — every topic should get at least one question` : "Vary topics broadly across the subject curriculum"}
9. ${
  (curriculum === "ng_sss" || curriculum === "ng_jss" || curriculum === "ng_primary") ? `
NIGERIAN CURRICULUM CONTEXT — these questions are for Nigerian scholars preparing for BECE / WAEC SSCE / NECO.
  a) Use Nigerian real-world examples throughout. Replace any UK context (£, miles, GCSE) with Nigerian equivalents:
     - Money: naira (₦). Example: "₦500 shared equally among 4 friends" not "£5 shared among 4 friends"
     - Names: use Nigerian names (Emeka, Amina, Chidi, Taiwo, Ngozi, Babatunde, Fatima, Adaobi, Tolu, Yemi)
     - Places: Lagos, Abuja, Port Harcourt, Kano, Ibadan, Enugu — not London or Manchester
     - Food: jollof rice, suya, yam, plantain, garri, akara, moi moi, egusi, eba — not fish and chips
     - Agriculture: cassava, palm oil, groundnut, cocoa, maize — not wheat or barley
     - Animals: Nigerian animals (agama lizard, hornbill, warthog, vervet monkey) where relevant
     - Commerce: market stalls, Alaba market, trade by barter, local businesses
  b) WAEC/NECO question style: questions should mirror actual WAEC/NECO exam phrasing and complexity
     - Computation questions: WAEC always requires showing full working — build this expectation
     - Essay-style reasoning should be concise but complete
  c) ${curriculum === "ng_sss" ? "SSS level (WAEC SSCE): think quadratic equations, organic chemistry, literature analysis, civic education, economics" : ""}
     ${curriculum === "ng_jss" ? "JSS level (BECE): think algebraic expressions, basic science, comprehension, social studies, civic duties" : ""}
     ${curriculum === "ng_primary" ? "Primary level (Common Entrance): think multiplication, fractions, phonics, social habits, basic science" : ""}
` : curriculum.startsWith("ca_") ? "Canadian curriculum context — use Canadian examples, metric units, Canadian history/geography" : "UK curriculum context — use British examples, British spellings, relevant UK contexts"
}
10. NEVER generate questions that reference charts, tables, diagrams, or images unless you provide the data inline in the question text
11. For maths: include the actual numbers/equations in the question. Never say "look at the diagram"
12. Each question must be self-contained — answerable from the question text alone
13. NO duplicate questions — each question must test a DIFFERENT concept or skill
14. Explanations must teach — explain WHY the answer is correct, not just restate it
15. For MCQ: all 4 options must be distinct and non-overlapping. No "All of the above" or "None of the above"
16. CRITICAL for grammar questions (nouns, verbs, adjectives, adverbs): if the question asks "which word is a [word class]", ensure ONLY ONE of the four options belongs to that word class. Never include two nouns, two verbs, or two adjectives among the options — this creates ambiguous questions with multiple correct answers
17. OPTIONS QUALITY — MCQ options must each be a complete phrase or ≥2 words, unless the question is purely arithmetic (e.g. "What is 5 + 3?"). Single-character or single-digit options like ["9", "7", "8", "6"] are NEVER acceptable — they make the answer trivially identifiable from its label, not its content
18. NEVER reveal the answer in the question stem. The correct answer text MUST NOT appear verbatim in the question text. BAD: "A cat that is fluffy and white sits on a mat. What is the cat like?" with correct answer "Fluffy and white". GOOD: Rephrase the question to ask about something not in the stem
19. CAPITALISATION CONSISTENCY — All options must follow the same capitalisation pattern. Do NOT capitalise only the correct option mid-sentence. If options are sentence fragments, start each with a capital. If they are single words, use lowercase for all. Never use capitalisation as a distinguishing clue
20. DECIMAL PRECISION — When numeric options include decimals, all options must use the same number of decimal places. BAD: ["0.3", "0.30", "0.300", "0.3000"]. GOOD: ["0.30", "0.45", "0.75", "0.20"]. Pick the precision that matches the question context
21. BRITISH ENGLISH — For UK, Nigerian, and most other curricula: use British spelling throughout. colour (not color), centre (not center), favourite (not favorite), practise (verb)/practice (noun), recognise (not recognize). For US/Canada curricula only: use American spelling
22. CIRCULAR ANSWERS — The correct answer must not be a paraphrase of the question stem. If the question already contains the key phrase, the answer adds NO value. Rewrite to ask something the stem genuinely omits
23. "All of the above" and "None of the above" are BANNED in ALL options — not just as the correct answer. Even as a distractor they reward pattern-guessing. Replace with a specific, independently verifiable alternative

NEGATIVE EXAMPLES (never generate these patterns):
BAD MCQ — answer-label artifact: "What is 5 × 2?" Options: ["6", "8", "10", "12"] — digits alone give no pedagogical context
GOOD MCQ: "Tom has 5 bags with 2 apples each. How many apples in total?" Options: ["6 apples", "8 apples", "10 apples", "14 apples"]

BAD MCQ — answer in stem: "The process by which green plants make food using sunlight is called photosynthesis. What is this process called?" — the answer is in the question
GOOD MCQ: "What is the process by which green plants convert sunlight into energy called?" Options: ["Respiration", "Photosynthesis", "Digestion", "Osmosis"]

BAD MCQ — capital giveaway: "Which of these is the name of a continent?" Options: ["ocean", "desert", "Africa", "mountain"] — only correct option is capitalised
GOOD MCQ: All options should follow the same capitalisation: ["Ocean", "Desert", "Africa", "Mountain"]

BAD MCQ — circular: "A square has four equal sides and four right angles. Which statement correctly describes a square?" with answer "A shape with four equal sides and four right angles" — this is a verbatim repeat
GOOD MCQ: "Which property is unique to a square compared to a rectangle?" with a specific distinguishing property

QUESTION TYPES TO GENERATE (mix these across the batch):
${requestedTypes}

DIFFICULTY: "${difficultyTier}"
- foundation: Core knowledge, straightforward application
- developing: Requires understanding, some application
- expected: Grade-level competency, multi-step reasoning
- advanced: Challenging, synthesis, evaluation

Return ONLY a JSON array. Each object must have:
{
  "question_text": "...",
  "question_type": "mcq" | "true_false" | "fill_in_blank" | "multi_select" | "short_answer" | "ordering" | "number_line" | "fraction_bar",
  "options": ["A", "B", "C", "D"],       // for mcq, true_false, multi_select — omit for other types
  "correct_index": 0,                     // for mcq, true_false (0-based)
  "correct_indices": [0, 2],              // for multi_select only
  "answer_text": "...",                   // for fill_in_blank, short_answer
  "answer_aliases": ["alt1", "alt2"],     // for short_answer (acceptable alternatives)
  "items": ["item1","item2","item3","item4"],         // for ordering ONLY — display strings in shuffled order
  "correct_order": [2, 0, 3, 1],                     // for ordering ONLY — indices producing correct sequence
  "number_line": {"min": 0, "max": 20, "step": 1, "correct": 7},  // for number_line ONLY
  "fraction": {"numerator": 3, "denominator": 8},    // for fraction_bar ONLY
  "explanation": "...",                   // REQUIRED for all types (min 2 sentences)
  "topic": "snake_case_topic",
  "difficulty_tier": "${difficultyTier}",
  "hints": ["hint1"],                     // 1-2 hints
  "needs_visual": false,                  // true only if YOU provide visual_prompt
  "visual_prompt": null,                  // description to generate a diagram (optional)
  "standard_code": "NC-Y3-N-AS-1",       // curriculum standard code this question tests (from OFFICIAL CURRICULUM STANDARDS above, or null if none provided)
  "misconceptions": [                     // 1-3 student misconceptions this question targets
    {
      "label": "short phrase (≤10 words)",       // e.g. "Confuses numerator with denominator"
      "description": "one sentence",             // what the misconception is
      "common_trigger": "one sentence"           // when/why students fall into this error
    }
  ]
}

Return ONLY the JSON array, no markdown fences, no commentary.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI CALL WITH RETRY + MODEL FALLBACK
// ═══════════════════════════════════════════════════════════════════════════════

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Circuit breaker state ─────────────────────────────────────────────────
let consecutiveNetworkFailures = 0;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_COOLDOWN = 30_000; // 30 seconds

async function callAI(prompt, modelIdx = -1, attempt = 0, triedCount = 0) {
  // First call: pick next primary model via round-robin
  if (modelIdx === -1) {
    modelIdx = roundRobinIdx % PRIMARY_MODELS.length;
    roundRobinIdx++;
  }

  if (triedCount >= MODELS.length) {
    throw new Error("All models exhausted");
  }

  // Circuit breaker: if too many consecutive network failures, pause before retrying
  if (consecutiveNetworkFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    console.warn(`  🔌 Circuit breaker tripped (${consecutiveNetworkFailures} consecutive failures). Cooling down ${CIRCUIT_BREAKER_COOLDOWN / 1000}s...`);
    await sleep(CIRCUIT_BREAKER_COOLDOWN);
    consecutiveNetworkFailures = 0; // reset after cooldown
  }

  // Wrap around the MODELS array for fallback cascade from any starting point
  const effectiveIdx = modelIdx % MODELS.length;
  const modelId = MODELS[effectiveIdx];

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": "https://launchpard.com",
        "X-Title": "LaunchPard Question Generator",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429 || res.status === 503) {
      console.warn(`  ⚠ ${modelId} returned ${res.status}, trying next model...`);
      consecutiveNetworkFailures++;
      return callAI(prompt, modelIdx + 1, 0, triedCount + 1);
    }

    if (!res.ok) {
      const body = await res.text();
      if (triedCount + 1 < MODELS.length) {
        console.warn(`  ⚠ ${modelId} error (${res.status}), trying next model...`);
        consecutiveNetworkFailures++;
        return callAI(prompt, modelIdx + 1, 0, triedCount + 1);
      }
      throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
    }

    // Success — reset circuit breaker
    consecutiveNetworkFailures = 0;

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || "";
    const usage = json.usage ?? null; // { prompt_tokens, completion_tokens, total_tokens }
    return { content, model: modelId, usage };
  } catch (err) {
    consecutiveNetworkFailures++;
    if (attempt < 2) {
      console.warn(`  ⚠ ${modelId} attempt ${attempt + 1} failed: ${err.message}. Retrying...`);
      await sleep(2000 * (attempt + 1));
      return callAI(prompt, modelIdx, attempt + 1, triedCount);
    }
    if (triedCount + 1 < MODELS.length) {
      console.warn(`  ⚠ ${modelId} exhausted retries, trying next model...`);
      return callAI(prompt, modelIdx + 1, 0, triedCount + 1);
    }
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSE + VALIDATE AI RESPONSE
// ═══════════════════════════════════════════════════════════════════════════════

function parseAIResponse(content) {
  if (!content || typeof content !== "string") {
    console.warn("  ⚠ Empty or non-string AI response");
    return [];
  }

  let text = content.trim();

  // Strip markdown fences if present (handle multiple fence styles)
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  // Also strip if fences appear mid-text (some models wrap with extra text)
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) text = fencedMatch[1].trim();

  let arr = null;

  // Try parsing as-is
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      arr = parsed;
    } else if (typeof parsed === "object" && parsed !== null) {
      // Wrapped in object like { questions: [...] } or { data: [...] }
      const keys = Object.keys(parsed);
      for (const k of keys) {
        if (Array.isArray(parsed[k])) { arr = parsed[k]; break; }
      }
    }
  } catch {}

  // JSON5 fallback — handles trailing commas, unquoted keys, comments.
  // Some models emit JSON5-valid but JSON-invalid output (especially for
  // complex multi-field objects where they add trailing commas).
  if (!arr) {
    try {
      const parsed = JSON5.parse(text);
      if (Array.isArray(parsed)) {
        arr = parsed;
      } else if (parsed && typeof parsed === "object") {
        for (const k of Object.keys(parsed)) {
          if (Array.isArray(parsed[k])) { arr = parsed[k]; break; }
        }
      }
    } catch {}
  }

  // Try to find array in text (handles leading/trailing prose from AI)
  if (!arr) {
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      // Attempt JSON5 first (more permissive), then strict JSON with manual cleanup
      try { arr = JSON5.parse(arrMatch[0]); } catch {}
      if (!arr) {
        try {
          arr = JSON.parse(arrMatch[0]);
        } catch {
          try {
            const cleaned = arrMatch[0]
              .replace(/,\s*([}\]])/g, "$1")     // trailing commas
              .replace(/'/g, '"')                 // single quotes → double
              .replace(/\n/g, " ");               // newlines in strings
            arr = JSON.parse(cleaned);
          } catch {}
        }
      }
    }
  }

  if (!arr || !Array.isArray(arr)) {
    console.warn("  ⚠ Could not parse AI response as JSON array");
    return [];
  }

  // ─── Type guard: filter out non-object items (strings, numbers, nulls) ──
  const filtered = arr.filter(item => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return false; // skip strings, numbers, nulls, nested arrays
    }
    // Must have at minimum a question_text field to be a valid question
    if (!item.question_text || typeof item.question_text !== "string") {
      return false;
    }
    return true;
  });

  if (filtered.length < arr.length) {
    console.warn(`  ⚠ Filtered ${arr.length - filtered.length} non-object/invalid items from AI response (${arr.length} → ${filtered.length})`);
  }

  return filtered;
}

// ─── Phoneme families for D4/D7 phonics guards ──────────────────────────────
// Shared across multiple validation checks — words grouped by phoneme
const PHONEME_FAMILIES = [
  { name: 'short-a', words: ['cat', 'bat', 'hat', 'mat', 'rat', 'sat', 'cap', 'map', 'tap', 'gap', 'lap', 'nap', 'flat', 'chat', 'that', 'clap', 'snap', 'trap', 'band', 'hand', 'land', 'sand', 'fan', 'ran', 'pan', 'man', 'van', 'can', 'ban', 'tan'] },
  { name: 'short-e', words: ['red', 'bed', 'fed', 'led', 'wed', 'shed', 'hen', 'ten', 'pen', 'den', 'men', 'pet', 'set', 'get', 'jet', 'let', 'met', 'net', 'wet', 'bet'] },
  { name: 'short-i', words: ['big', 'pig', 'dig', 'fig', 'wig', 'bit', 'fit', 'hit', 'kit', 'sit', 'swim', 'dim', 'him', 'rim', 'win', 'bin', 'fin', 'pin', 'tin', 'trip', 'ship', 'chip', 'dip', 'hip', 'lip', 'rip', 'sip'] },
  { name: 'short-o', words: ['hot', 'pot', 'dot', 'got', 'lot', 'not', 'rot', 'stop', 'shop', 'chop', 'drop', 'hop', 'mop', 'pop', 'top', 'dog', 'fog', 'hog', 'log', 'jog'] },
  { name: 'short-u', words: ['bug', 'mug', 'tug', 'jug', 'rug', 'dug', 'hug', 'bun', 'fun', 'gun', 'run', 'sun', 'bus', 'cup', 'pup', 'duck', 'luck', 'muck', 'suck', 'buck'] },
  { name: 'long-a', words: ['cake', 'bake', 'lake', 'make', 'take', 'rake', 'late', 'gate', 'hate', 'made', 'shade', 'grade', 'plate', 'skate', 'snake', 'brave', 'cave', 'wave', 'name', 'game', 'fame', 'came', 'same', 'train', 'rain', 'main', 'pain', 'gain', 'day', 'say', 'play', 'stay', 'way'] },
  { name: 'long-e', words: ['feet', 'meet', 'seed', 'feed', 'need', 'feel', 'heel', 'peel', 'bee', 'see', 'tree', 'free', 'green', 'keen', 'queen', 'sleep', 'deep', 'keep', 'team', 'dream', 'cream', 'lean', 'clean', 'mean', 'bean', 'heat', 'meat', 'beat', 'seat'] },
  { name: 'long-i', words: ['bike', 'like', 'time', 'lime', 'mine', 'fine', 'line', 'vine', 'pine', 'shine', 'bride', 'pride', 'ride', 'hide', 'kite', 'bite', 'site', 'quite', 'white', 'night', 'light', 'right', 'sight', 'fight', 'might', 'sky', 'fly', 'cry', 'try', 'dry', 'pie', 'die', 'lie', 'tie'] },
  { name: 'long-o', words: ['home', 'bone', 'cone', 'lone', 'stone', 'phone', 'rope', 'hope', 'mole', 'hole', 'pole', 'vote', 'note', 'joke', 'poke', 'smoke', 'spoke', 'snow', 'flow', 'grow', 'blow', 'glow', 'show', 'slow', 'know', 'boat', 'coat', 'goat', 'road', 'load', 'foam', 'loan', 'moan'] },
  { name: 'ar', words: ['car', 'bar', 'far', 'jar', 'star', 'scar', 'cart', 'part', 'art', 'start', 'bark', 'dark', 'mark', 'park', 'spark', 'farm', 'harm', 'arm', 'charm'] },
  { name: 'or', words: ['for', 'nor', 'or', 'born', 'corn', 'horn', 'worn', 'torn', 'form', 'storm', 'fork', 'work', 'port', 'sort', 'short', 'sport', 'floor', 'door', 'poor', 'more', 'store', 'score', 'core', 'bore', 'shore'] },
];

// ─── Known categories for NOT/EXCEPT question validation (D26) ────────────────
const KNOWN_CATEGORIES_D26 = {
  vowel: new Set(['a', 'e', 'i', 'o', 'u']),
  consonant: new Set(['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z']),
  planet: new Set(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']),
  continent: new Set(['africa', 'asia', 'europe', 'australia', 'antarctica', 'oceania', 'americas']),
  mammal: new Set(['dog', 'cat', 'horse', 'cow', 'whale', 'dolphin', 'elephant', 'lion', 'tiger', 'bear', 'rabbit', 'mouse', 'rat', 'bat', 'human', 'monkey', 'ape', 'pig', 'sheep', 'goat', 'deer', 'zebra', 'giraffe']),
  reptile: new Set(['snake', 'lizard', 'crocodile', 'alligator', 'turtle', 'tortoise', 'gecko', 'iguana', 'chameleon', 'komodo']),
  bird: new Set(['eagle', 'parrot', 'penguin', 'ostrich', 'owl', 'hawk', 'sparrow', 'robin', 'pigeon', 'duck', 'swan', 'crow', 'flamingo', 'peacock', 'hummingbird', 'vulture']),
  insect: new Set(['ant', 'bee', 'wasp', 'butterfly', 'moth', 'beetle', 'fly', 'mosquito', 'grasshopper', 'cricket', 'ladybird', 'ladybug', 'dragonfly', 'caterpillar']),
  'primary colour': new Set(['red', 'blue', 'yellow']),
  'primary color': new Set(['red', 'blue', 'yellow']),
  shape: new Set(['circle', 'square', 'triangle', 'rectangle', 'pentagon', 'hexagon', 'oval', 'star']),
};

// ─── Levenshtein similarity ratio ────────────────────────────────────────────
// Returns 0.0 (totally different) → 1.0 (identical).
// Used by D34b to detect fuzzy explanation-answer mismatches.
// Capped at 200 chars each to keep cost O(1) for typical MCQ option lengths.
function levenshteinRatio(a, b) {
  const s = String(a || '').slice(0, 200);
  const t = String(b || '').slice(0, 200);
  if (s === t) return 1.0;
  if (!s || !t) return 0.0;
  const m = s.length, n = t.length;
  // Use two-row DP to keep memory O(min(m,n))
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = s[i-1] === t[j-1]
        ? prev[j-1]
        : 1 + Math.min(prev[j-1], prev[j], curr[j-1]);
    }
    [prev, curr] = [curr, prev];
  }
  return 1 - prev[n] / Math.max(m, n);
}

function validateQuestion(q, curriculum, subject, year, batchSeenTexts) {
  const ctx = getAgeBandContext(curriculum, year);
  const errors = [];

  // ─── Convenience aliases used by D15 onwards ───────────────────────────
  // Declared at function scope so all guards below can reference them.
  const isMcq   = q.question_type === 'mcq';
  const opts    = Array.isArray(q.options) ? q.options.map(o => String(o ?? '')) : [];
  const corrIdx = typeof q.correct_index === 'number' ? q.correct_index : null;

  // ─── Required fields ───────────────────────────────────────────────────
  if (!q.question_text || q.question_text.length < 15) errors.push("question_text too short (<15 chars)");
  if (!q.explanation || q.explanation.length < 20) errors.push("explanation too short (<20 chars) — must teach, not just state");
  if (!q.topic) errors.push("missing topic");
  if (!q.question_type) q.question_type = "mcq"; // default

  // ─── Type-specific validation ──────────────────────────────────────────
  switch (q.question_type) {
    case "mcq":
      if (!Array.isArray(q.options) || q.options.length < 3) errors.push("mcq needs 3-4 options");
      if (typeof q.correct_index !== "number" || q.correct_index < 0) errors.push("invalid correct_index");
      if (q.correct_index >= (q.options?.length || 0)) errors.push("correct_index out of range");
      // Check for duplicate options
      if (q.options) {
        const normalised = q.options.map(o => String(o).trim().toLowerCase());
        if (new Set(normalised).size !== normalised.length) errors.push("duplicate options");
      }
      // Reject "All of the above" / "None of the above"
      if (q.options?.some(o => /^(all|none) of the above$/i.test(String(o).trim()))) {
        errors.push("contains 'All/None of the above' — lazy option");
      }
      break;
    case "true_false":
      q.options = ["True", "False"];
      if (typeof q.correct_index !== "number" || q.correct_index > 1) errors.push("true_false correct_index must be 0 or 1");
      break;
    case "fill_in_blank":
      if (!q.answer_text) errors.push("fill_in_blank needs answer_text");
      if (q.question_text && !q.question_text.includes("___") && !q.question_text.includes("____")) {
        // Auto-repair: try to insert ___ where the answer should be
        if (q.answer_text && q.question_text.includes(q.answer_text)) {
          // Replace the first occurrence of the answer with ___
          q.question_text = q.question_text.replace(q.answer_text, "___");
        } else if (q.question_text.includes("?")) {
          // Question form — acceptable as-is (e.g. "What is the capital of France?")
        } else if (q.answer_text) {
          // Append blank to end of question
          q.question_text = q.question_text.replace(/[.\s]*$/, "") + " ___.";
        } else {
          errors.push("fill_in_blank should contain ___ blank marker");
        }
      }
      break;
    case "multi_select":
      if (!Array.isArray(q.options) || q.options.length < 4) errors.push("multi_select needs 4+ options");
      if (!Array.isArray(q.correct_indices) || q.correct_indices.length < 2) errors.push("multi_select needs 2+ correct_indices");
      if (q.correct_indices?.some(i => i >= (q.options?.length || 0))) errors.push("correct_indices out of range");
      break;
    case "short_answer":
      if (!q.answer_text) errors.push("short_answer needs answer_text");
      break;

    case "ordering": {
      if (!Array.isArray(q.items) || q.items.length < 3) errors.push("ordering needs items array (min 3 items)");
      if (!Array.isArray(q.items) || q.items.length > 8) errors.push("ordering items array too long (max 8)");
      const co = Array.isArray(q.correct_order) ? q.correct_order : (Array.isArray(q.answer) ? q.answer : null);
      if (!co) {
        errors.push("ordering needs correct_order array");
      } else {
        if (q.items && co.length !== q.items.length) errors.push("ordering correct_order length must match items length");
        if (new Set(co).size !== co.length) errors.push("ordering correct_order has duplicate indices");
        if (q.items && co.some(i => i < 0 || i >= q.items.length)) errors.push("ordering correct_order index out of range");
        // Normalise to correct_order field
        if (!Array.isArray(q.correct_order)) q.correct_order = co;
      }
      // Check it's not already in correct order (trivially easy)
      if (q.items && q.correct_order && q.correct_order.every((v, i) => v === i)) {
        errors.push("ordering items are already in correct order — shuffle them in the 'items' array");
      }
      break;
    }

    case "number_line": {
      const nl = q.number_line || {};
      if (typeof nl.min !== "number") errors.push("number_line.min must be a number");
      if (typeof nl.max !== "number") errors.push("number_line.max must be a number");
      if (typeof nl.step !== "number" || nl.step <= 0) errors.push("number_line.step must be a positive number");
      if (typeof nl.correct !== "number") errors.push("number_line.correct must be a number");
      if (typeof nl.min === "number" && typeof nl.max === "number" && nl.min >= nl.max) errors.push("number_line min must be < max");
      // D37: too many ticks kills mobile UX
      if (typeof nl.min === "number" && typeof nl.max === "number" && typeof nl.step === "number" && nl.step > 0) {
        const ticks = (nl.max - nl.min) / nl.step;
        if (ticks > 20) errors.push(`D37: number_line has ${Math.round(ticks)} ticks — max 20 for mobile usability. Increase step or reduce range.`);
        // correct must be exactly reachable
        if (typeof nl.correct === "number") {
          const stepsFromMin = (nl.correct - nl.min) / nl.step;
          if (Math.abs(stepsFromMin - Math.round(stepsFromMin)) > 1e-9) {
            errors.push(`number_line correct=${nl.correct} is not reachable from min=${nl.min} with step=${nl.step}`);
          }
          if (nl.correct < nl.min || nl.correct > nl.max) errors.push("number_line correct is outside [min, max]");
        }
      }
      break;
    }

    case "fraction_bar": {
      const fr = q.fraction || {};
      if (typeof fr.numerator !== "number") errors.push("fraction_bar.fraction.numerator must be a number");
      if (typeof fr.denominator !== "number") errors.push("fraction_bar.fraction.denominator must be a number");
      if (typeof fr.denominator === "number") {
        if (fr.denominator < 2 || fr.denominator > 12) errors.push("fraction_bar denominator must be 2–12");
        if (typeof fr.numerator === "number") {
          if (fr.numerator < 0 || fr.numerator > fr.denominator) errors.push("fraction_bar numerator must be 0..denominator");
          // D38: trivial all-filled or all-empty fraction
          if (fr.numerator === fr.denominator) errors.push("D38: fraction_bar numerator equals denominator (trivially all filled) — use a proper fraction");
          if (fr.numerator === 0) errors.push("D38: fraction_bar numerator is 0 (trivially empty) — shade at least 1 segment");
        }
      }
      break;
    }

    default:
      q.question_type = "mcq"; // fallback
  }

  // ─── D36: interactive type in non-maths subject ──────────────────────────
  // ordering/number_line/fraction_bar only make pedagogical sense in maths.
  if (["ordering", "number_line", "fraction_bar"].includes(q.question_type)) {
    const isMaths = /^(mathematics|maths|math|further_mathematics|basic_science|science)$/i.test(subject);
    if (!isMaths) {
      errors.push(`D36: question_type "${q.question_type}" is only valid for mathematics/science subjects — found subject "${subject}"`);
    }
  }

  // ─── Visual reference gate ─────────────────────────────────────────────
  const VISUAL_REF_RE = /\b(the chart|the graph|the table|the diagram|the bar chart|the pie chart|the line graph|the histogram|look at the|refer to the|the picture shows|the image shows|shown in the|displayed in the|according to the figure|in the figure|from the table|from the graph)\b/i;
  if (VISUAL_REF_RE.test(q.question_text) && !q.needs_visual) {
    errors.push("references visual but needs_visual=false — reject");
  }

  // ─── Age-appropriateness: KS4 (senior secondary) ──────────────────────
  if (ctx.band === "ks4" && (subject.includes("math") || subject === "further_mathematics")) {
    const PRIMARY_PATTERNS = /^(what is \d{1,2} [+\-×x÷] \d{1,2}\??|how many sides|what is the name of a shape|which number is (biggest|smallest)|what comes (after|before) \d{1,2}\??|count the|what colour|is \d{1,2} (odd|even))/i;
    if (PRIMARY_PATTERNS.test(q.question_text.trim())) {
      errors.push("primary-level question in KS4");
    }
    // Also catch simple addition/subtraction (e.g. "What is 5 + 3?")
    if (/^what is \d{1,3} [+\-] \d{1,3}\??$/i.test(q.question_text.trim())) {
      errors.push("simple arithmetic in KS4");
    }
  }

  // ─── Age-appropriateness: KS3 (junior secondary) ──────────────────────
  if (ctx.band === "ks3" && (subject.includes("math") || subject.includes("science"))) {
    const TOO_EASY = /^(what is \d{1,2} [+\-×x÷] \d{1,2}\??|how many legs|what colour is|name the shape|is \d{1,2} (odd|even))/i;
    if (TOO_EASY.test(q.question_text.trim())) {
      errors.push("primary-level question in KS3");
    }
  }

  // ─── Age-appropriateness: KS1 shouldn't have advanced concepts ─────────
  if (ctx.band === "ks1" && subject.includes("math")) {
    const TOO_HARD = /\b(algebra|equation|quadratic|fraction.*denominator|percentage|ratio|trigonometry|pythagoras|simultaneous)\b/i;
    if (TOO_HARD.test(q.question_text)) {
      errors.push("advanced concept in KS1 question");
    }
  }

  // ─── Explanation quality gate ──────────────────────────────────────────
  if (q.explanation) {
    const expLower = q.explanation.toLowerCase();
    // Reject explanations that just restate the answer
    if (expLower.startsWith("the correct answer is") && expLower.length < 60) {
      errors.push("explanation just restates answer — must teach");
    }
    if (expLower === "true" || expLower === "false" || expLower.length < 15) {
      errors.push("explanation too minimal");
    }
    // For MCQ: explanation should be substantial enough to cover distractors (~50+ words)
    if (q.question_type === "mcq" && q.explanation) {
      const wordCount = q.explanation.split(/\s+/).length;
      if (wordCount < 25) {
        errors.push("MCQ explanation too brief (<25 words) — should address all options");
      }
    }
  }

  // ─── Duplicate detection within batch (SHA-256) ─────────────────────────
  // SHA-256 over normalised question text + sorted options catches:
  //   1. Identical questions (same text)
  //   2. Same question with shuffled options (which the old 80-char slice missed)
  // batchSeenTexts is a Set<string> of 16-char hash prefixes — plenty of entropy
  // for a batch of ≤500 questions with negligible false-positive rate.
  if (q.question_text && batchSeenTexts) {
    const normText   = q.question_text.toLowerCase().replace(/\s+/g, " ").trim();
    const sortedOpts = Array.isArray(q.options) ? [...q.options].map(String).sort() : [];
    const hashInput  = JSON.stringify({ t: normText, o: sortedOpts });
    const hash       = crypto.createHash("sha256").update(hashInput).digest("hex").slice(0, 16);
    if (batchSeenTexts.has(hash)) {
      errors.push("duplicate question in batch (same text + options)");
    } else {
      batchSeenTexts.add(hash);
    }
  }

  // ─── Answer-in-question check ──────────────────────────────────────────
  if (q.question_text && q.options?.[q.correct_index] === q.question_text) {
    errors.push("answer same as question");
  }

  // ─── MCQ: option length balance (word-count spread) ──────────────────
  if ((q.question_type === "mcq" || q.question_type === "multi_select") && q.options?.length >= 3) {
    const wordCounts = q.options.map(o => String(o).trim().split(/\s+/).length);
    const minWords = Math.min(...wordCounts);
    const maxWords = Math.max(...wordCounts);
    // Flag if any option is 4x+ longer than shortest (pattern-guessing risk)
    if (maxWords > 2 && maxWords >= minWords * 4) {
      errors.push(`option length imbalance (${minWords}–${maxWords} words) — students can guess by length`);
    }
    // Flag if correct answer is always the longest
    const correctWords = wordCounts[q.correct_index] || 0;
    if (correctWords === maxWords && correctWords > minWords * 2.5 && correctWords > 8) {
      errors.push("correct answer is suspiciously longest option");
    }
  }

  // ─── Recall-question detector for KS3/KS4 ──────────────────────────
  if ((ctx.band === "ks3" || ctx.band === "ks4") && q.question_text) {
    const RECALL_PATTERNS = /^(what is (a|an|the) |define |name the |list the |what does .{1,20} stand for|who (invented|discovered|created) |what year (did|was) |which (country|city|continent) )/i;
    if (RECALL_PATTERNS.test(q.question_text.trim()) && q.question_type === "mcq") {
      // Soft warning — don't reject, but flag. These are still valid for "foundation" tier
      if (q.difficulty_tier !== "foundation") {
        errors.push("recall-only question at developing+ tier in KS3/KS4 — should test application");
      }
    }
  }

  // ─── E3: Question text too short / too vague ────────────────────────
  // Catches fragments like "What is it?", "Name one." — not answerable by any student.
  if (q.question_text) {
    const wordCount = q.question_text.trim().split(/\s+/).length;
    if (wordCount <= 4) {
      errors.push(`question_text too short (${wordCount} words) — too vague to answer`);
    }
  }

  // ─── B3: Arithmetic mismatch ────────────────────────────────────────
  // If the question is "X op Y = ?" the marked answer must equal X op Y.
  // Catches AI hallucinations like marking 7 correct for "3 + 5 = ?".
  if (q.question_text && q.question_type === "mcq" && typeof q.correct_index === "number") {
    const correctOptStr = String(q.options?.[q.correct_index] ?? "").trim();
    const arithmeticResult = _tryEvalArithmetic(q.question_text);
    if (arithmeticResult !== null) {
      const markedNum = parseFloat(correctOptStr.replace(/[^0-9.\-]/g, ""));
      if (!isNaN(markedNum) && Math.abs(markedNum - arithmeticResult) > 0.05) {
        errors.push(`arithmetic mismatch: question implies answer is ${arithmeticResult} but option[${q.correct_index}] is "${correctOptStr}"`);
      }
    }
  }

  // ─── C1: Passage-reference without a passage field ──────────────────
  // Questions that say "read the passage" / "according to the text" but have
  // no `passage` field cannot be answered — they are broken stubs from AI.
  if (q.question_text && !q.passage) {
    const PASSAGE_REF = /\b(according to the (passage|text|story|extract|article|reading)|based on the (passage|text|story|extract)|from the (passage|text|story|extract)|the (passage|text) (says|states|describes|mentions)|what does the (passage|text|author|writer) (say|mean|suggest)|in the (passage|text|story|extract)|read the (passage|text|story|extract))\b/i;
    if (PASSAGE_REF.test(q.question_text)) {
      errors.push("references passage/text but no passage field provided — question is unanswerable");
    }
  }

  // ─── C2: Exam-artifact patterns ─────────────────────────────────────
  // Phrases that suggest the question was lifted verbatim from an exam paper
  // and references context that only exists in that paper (other questions,
  // parts, page numbers, etc.).
  if (q.question_text) {
    const EXAM_ARTIFACT = /(\bquestion\s+\d+\b|\bpart\s+\(?[a-e]\)?[\s:]|\b\([a-e]\)\s+\w|\bsee (page|question|section|part)\s+\d+|\b(above|below|previous|following) question\b|\band (part|question)\s+\(?[a-e0-9]\)?)/i;
    if (EXAM_ARTIFACT.test(q.question_text)) {
      errors.push("exam-artifact: references 'question N', 'part (a)', 'see page N' — question depends on missing context");
    }
  }

  // ─── D2: Correct answer duplicated in another option ────────────────
  // Catches AI mistakes like options: ["Paris", "London", "Paris", "Berlin"]
  // where the correct answer appears in 2 positions — making the question ambiguous.
  if (q.question_type === "mcq" && Array.isArray(q.options) && typeof q.correct_index === "number") {
    const corrText = String(q.options[q.correct_index] ?? "").trim().toLowerCase();
    if (corrText) {
      const dupeCount = q.options.filter((o, i) =>
        i !== q.correct_index &&
        String(o ?? "").trim().toLowerCase() === corrText
      ).length;
      if (dupeCount > 0) {
        errors.push(`correct answer "${corrText}" appears in ${dupeCount + 1} options — ambiguous`);
      }
    }
  }

  // ─── B1a: Numeric explanation-answer mismatch ───────────────────────
  // If explanation says "the answer is 42" but the marked option is 15, reject.
  // Only match explicit "the answer is X" phrasing — NOT "= X" or "equals X" which
  // appear in working steps and cause false positives (coordinates, dimensions, etc.)
  if (q.question_type === "mcq" && q.explanation && typeof q.correct_index === "number" && q.options) {
    const corrText = String(q.options[q.correct_index] ?? "").trim();
    const numMatch = q.explanation.match(
      /\bthe\s+(?:correct\s+)?answer\s+is\s+([-\d,.]+)\b/i
    );
    if (numMatch) {
      const expNum = parseFloat(numMatch[1].replace(/,/g, ""));
      const corrNum = parseFloat(corrText.replace(/[^0-9.\-]/g, ""));
      if (!isNaN(expNum) && !isNaN(corrNum) && Math.abs(expNum - corrNum) > 0.01) {
        // Make sure expNum doesn't match another option (it might be explaining a distractor)
        const matchesOther = (q.options || []).some((o, i) =>
          i !== q.correct_index && Math.abs(parseFloat(String(o).replace(/[^0-9.\-]/g, "")) - expNum) < 0.01
        );
        if (!matchesOther) {
          errors.push(`explanation says answer is ${expNum} but marked option is "${corrText}" — mismatch`);
        }
      }
    }
  }

  // ─── F1: Pure arithmetic operation in wrong subject ─────────────────
  // Catches "What is 5 + 3?" tagged under english, social_studies, biology, etc.
  // Pure maths operations have no place in humanities/science subjects at any level.
  if (q.question_text) {
    const PURE_MATHS = /^\s*\d+\s*[\+\-×÷\*\/]\s*\d+\s*=\s*[?_]+\s*$|^what is \d+\s*[\+\-×÷\*\/]\s*\d+\??\s*$/i;
    const NON_MATHS_SUBJECTS = /^(english|english_language|english_literature|english_studies|social_studies|civic_education|civics|history|geography|biology|chemistry|physics|science|basic_science|religious_studies|art|music|business_studies|economics)/i;
    if (PURE_MATHS.test(q.question_text.trim()) && NON_MATHS_SUBJECTS.test(subject)) {
      errors.push(`pure arithmetic question "${q.question_text.trim().slice(0, 50)}" in non-maths subject "${subject}"`);
    }
  }

  // ─── D3: Odd-one-out with multiple defensible answers ────────────────
  // Catches "Which is the odd one out?" questions where MULTIPLE options are
  // independently defensible as the correct answer for different reasons.
  //
  // Primary case: circle/oval (no sides or corners, not a polygon) AND
  // star/heart/crescent (irregular, non-standard points or organic form) both
  // appear as options. A circle is the odd one out among polygons because it
  // has no corners; a star is the odd one out because it has points/is irregular.
  // Both are defensible for entirely different reasons → structurally ambiguous.
  //
  // Secondary case: 2+ no-sides shapes (circle + oval) — two options share the
  // same "no corners" property, making the question unanswerable without extra
  // context the student doesn't have.
  if (q.question_text && q.options && Array.isArray(q.options)) {
    const ODD_ONE_OUT_Q = /odd.one.out|odd.shape.out|which.{0,15}doesn.t.belong|which.{0,15}is.{0,10}different|which.{0,15}does.{0,10}not.{0,10}belong|which.{0,15}is.{0,10}unlike/i;
    if (ODD_ONE_OUT_Q.test(q.question_text)) {
      const opts = q.options.map(o => String(o).toLowerCase().trim());
      // Shapes with zero sides/corners — not polygons
      const NO_SIDE_RE   = /\b(circle|oval|ellipse|disc|disk)\b/i;
      // Irregular/non-standard shapes whose "oddness" is for a different reason
      const IRREGULAR_RE = /\b(star|heart|crescent|arrow|cross|plus sign|lightning bolt|droplet|teardrop|cloud)\b/i;

      const noSideOpts    = opts.filter(o => NO_SIDE_RE.test(o));
      const irregularOpts = opts.filter(o => IRREGULAR_RE.test(o));

      if (noSideOpts.length >= 1 && irregularOpts.length >= 1) {
        errors.push(
          `odd-one-out question has multiple defensible answers: ` +
          `"${noSideOpts[0]}" (no sides/corners) and "${irregularOpts[0]}" (irregular/pointed) ` +
          `are each independently the odd one out for different reasons — structurally ambiguous`
        );
      }

      if (noSideOpts.length >= 2) {
        errors.push(
          `odd-one-out question has 2+ no-sides shapes (${noSideOpts.join(', ')}) — ` +
          `multiple options share the "no corners" property, making the correct answer ambiguous`
        );
      }
    }
  }

  // ─── D4: Phonics "sound as in X" ambiguity ─────────────────────────────
  // Catches questions like "Which word has the same sound as in 'cake'?"
  // where multiple options (bake, made, late) all have the same /eɪ/ phoneme.
  if (
    q.question_type === 'mcq' &&
    /sound.{0,15}as\s+in|has\s+the\s+same\s+sound|contains\s+the\s+.{0,20}sound|rhymes?\s+with|same\s+vowel\s+sound/i.test(q.question_text) &&
    Array.isArray(q.options) && q.options.length >= 4
  ) {
    // Extract target word from question text (word in quotes or after "as in")
    const targetMatch = q.question_text.match(/as\s+in\s+['""]?(\w+)['""]?|sound\s+of\s+['""]?(\w+)['""]?/i);
    if (targetMatch) {
      const targetWord = (targetMatch[1] || targetMatch[2] || '').toLowerCase();
      const optionWords = q.options.map(o => (typeof o === 'string' ? o : o.text || '').toLowerCase().trim());

      for (const family of PHONEME_FAMILIES) {
        if (family.words.includes(targetWord.toLowerCase())) {
          const matchingOptions = optionWords.filter(opt => family.words.includes(opt));
          if (matchingOptions.length >= 2) {
            errors.push(`D4: Phonics phoneme ambiguity — target word "${targetWord}" shares phoneme family with ${matchingOptions.length} options: ${matchingOptions.join(', ')} — all are valid answers`);
            break;
          }
        }
      }
    }
  }

  // ─── D5: Homophone isolation without reference word ────────────────────
  // Catches "Which of the following is a homophone?" without specifying what
  // word it is a homophone OF. Any word with a homophone is a valid answer.
  if (
    q.question_type === 'mcq' &&
    /which\s+(of\s+(the\s+following|these)\s+)?(word\s+)?is\s+a\s+homophone/i.test(q.question_text) &&
    !/homophone\s+(of|for|to)\s+['""]?\w+['""]?|homophone\s+pair|homophones?\s+of\s+['""]?\w+/i.test(q.question_text)
  ) {
    errors.push(`D5: Homophone question does not specify what word it is a homophone OF — any word with a homophone is a valid answer. Add "Which word is a homophone of [X]?" to make it unambiguous.`);
  }

  // ─── D6: Antonym/synonym with near-synonym cluster in options ──────────
  // Catches "What is the opposite of 'old'?" where both 'new' and 'young'
  // are valid antonyms, or "What means the same as 'happy'?" where multiple
  // options are synonyms.
  if (q.question_type === 'mcq' && Array.isArray(q.options) && q.options.length >= 3) {
    const isAntonymQ = /opposite\s+of|antonym\s+(of|for)|antonym\s+is/i.test(q.question_text);
    const isSynonymQ = /synonym\s+(of|for)|means?\s+the\s+same\s+as|closest\s+in\s+meaning/i.test(q.question_text);

    if (isAntonymQ || isSynonymQ) {
      const synonymClusters = [
        ['new', 'modern', 'fresh', 'recent', 'novel'],
        ['young', 'youthful', 'juvenile'],
        ['shut', 'close', 'closed', 'seal', 'lock'],
        ['end', 'finish', 'stop', 'conclude', 'cease', 'halt', 'terminate'],
        ['sad', 'unhappy', 'miserable', 'sorrowful', 'gloomy', 'melancholy', 'downcast', 'dejected'],
        ['small', 'little', 'tiny', 'miniature', 'petite', 'minute'],
        ['big', 'large', 'huge', 'enormous', 'gigantic', 'vast', 'immense', 'massive'],
        ['cold', 'cool', 'chilly', 'freezing', 'icy', 'frosty', 'frigid'],
        ['hot', 'warm', 'boiling', 'scorching', 'burning', 'blazing'],
        ['slow', 'sluggish', 'leisurely', 'gradual', 'plodding'],
        ['fast', 'quick', 'rapid', 'swift', 'speedy', 'hasty', 'brisk'],
        ['quiet', 'silent', 'soft', 'hushed', 'noiseless', 'still'],
        ['loud', 'noisy', 'boisterous', 'thunderous', 'deafening'],
        ['scared', 'afraid', 'frightened', 'fearful', 'timid', 'cowardly'],
        ['brave', 'courageous', 'bold', 'daring', 'fearless', 'heroic', 'valiant'],
        ['kind', 'gentle', 'caring', 'warm', 'compassionate', 'tender'],
        ['cruel', 'mean', 'unkind', 'harsh', 'wicked', 'nasty', 'spiteful'],
        ['hate', 'dislike', 'despise', 'loathe', 'detest', 'abhor'],
        ['love', 'adore', 'cherish', 'like', 'enjoy', 'treasure'],
        ['dark', 'dim', 'gloomy', 'shadowy', 'murky'],
        ['bright', 'light', 'luminous', 'brilliant', 'radiant', 'gleaming', 'shining'],
        ['happy', 'glad', 'joyful', 'cheerful', 'pleased', 'delighted', 'content', 'elated', 'thrilled'],
        ['angry', 'furious', 'enraged', 'irate', 'livid', 'irritated', 'annoyed', 'mad'],
        ['clever', 'smart', 'intelligent', 'bright', 'wise', 'sharp', 'brilliant'],
        ['beautiful', 'pretty', 'lovely', 'gorgeous', 'attractive', 'stunning'],
        ['walk', 'stroll', 'stride', 'march', 'amble', 'wander', 'saunter'],
        ['run', 'sprint', 'dash', 'jog', 'race', 'bolt'],
        ['said', 'stated', 'replied', 'answered', 'remarked', 'exclaimed', 'declared', 'responded'],
      ];

      const optionWords = q.options.map(o => (typeof o === 'string' ? o : o.text || '').toLowerCase().trim().replace(/['"]/g, ''));

      for (const cluster of synonymClusters) {
        const matchingOptions = optionWords.filter(opt => cluster.some(cw => opt === cw || opt.startsWith(cw) || cw.startsWith(opt)));
        if (matchingOptions.length >= 2) {
          errors.push(`D6: Antonym/synonym multi-valid — options contain ${matchingOptions.length} words from the same synonym cluster (${matchingOptions.join(', ')}), making multiple options valid answers`);
          break;
        }
      }
    }
  }

  // ─── D7: "Different phoneme from others" — 2+ valid odd-ones-out ────────
  // Catches "Which word has a different phoneme from the others?"
  // where multiple options could be the odd one out for phoneme reasons.
  if (
    q.question_type === 'mcq' &&
    /different\s+(vowel\s+)?sound|different\s+phoneme|phoneme\s+from\s+the\s+others?|does\s+not\s+(rhyme|sound)|odd\s+one\s+out.{0,30}sound|sound.{0,30}odd\s+one/i.test(q.question_text) &&
    Array.isArray(q.options) && q.options.length >= 4
  ) {
    const optionWords = q.options.map(o => (typeof o === 'string' ? o : o.text || '').toLowerCase().trim());

    // For each option, find which phoneme family it belongs to
    const optionFamilies = optionWords.map(word => {
      for (const family of PHONEME_FAMILIES) {
        if (family.words.includes(word)) return family.name;
      }
      return null;
    });

    // Count how many options belong to each phoneme family
    const familyCounts = {};
    optionFamilies.forEach(f => { if (f) familyCounts[f] = (familyCounts[f] || 0) + 1; });

    if (Object.keys(familyCounts).length > 0) {
      const maxCount = Math.max(...Object.values(familyCounts));
      const minorityFamilies = Object.entries(familyCounts).filter(([, count]) => count < maxCount);

      // If there are 2+ options NOT in the majority phoneme family, there are 2+ valid "odd ones out"
      const minorityCount = minorityFamilies.reduce((sum, [, count]) => sum + count, 0);
      if (minorityCount >= 2) {
        const minorityWords = optionWords.filter((word, i) => {
          const f = optionFamilies[i];
          return f && familyCounts[f] < maxCount;
        });
        errors.push(`D7: Phoneme "odd one out" ambiguity — ${minorityCount} options (${minorityWords.join(', ')}) each have a different phoneme from the majority group, making multiple valid odd-ones-out`);
      }
    }
  }

  // ─── D8: Grammar word-class — multiple options belong to target class ────
  // Catches "Which of the following is an adjective?" where both 'beautiful'
  // and 'lovely' are valid adjectives. Also catches "What is the noun in
  // 'The teacher gave students homework'?" where teacher/students/homework are
  // ALL nouns — the sentence context does NOT disambiguate when multiple options
  // are valid members of the target class within that sentence.
  if (q.question_type === 'mcq' && Array.isArray(q.options) && q.options.length >= 3) {
    const wordClassMatch = q.question_text.match(/which\s+(?:of\s+the\s+following\s+)?(?:word\s+)?is\s+(?:a[n]?\s+)(noun|verb|adjective|adverb|pronoun|conjunction|preposition|article)/i)
      || q.question_text.match(/identify\s+the\s+(noun|verb|adjective|adverb|pronoun|conjunction|preposition)/i)
      || q.question_text.match(/which\s+word\s+is\s+(?:a[n]?\s+)?(noun|verb|adjective|adverb|pronoun|conjunction|preposition)/i)
      || q.question_text.match(/what\s+is\s+the\s+(noun|verb|adjective|adverb)/i)
      || q.question_text.match(/find\s+the\s+(noun|verb|adjective|adverb)/i);

    // Detect whether a sentence is embedded in the question
    const hasSentenceContext = /in the sentence|in this sentence|the sentence (below|above)|underlined|highlighted|passage|text/i.test(q.question_text)
      || /['"""'].{5,}['"""']/.test(q.question_text); // quoted phrase ≥5 chars

    const D8_WORD_CLASSES = {
      noun: ['dog', 'cat', 'bird', 'fish', 'tree', 'book', 'table', 'chair', 'house', 'school', 'teacher', 'doctor', 'child', 'mother', 'father', 'sister', 'brother', 'friend', 'apple', 'water', 'sun', 'moon', 'star', 'river', 'mountain', 'city', 'town', 'car', 'bus', 'train', 'happiness', 'love', 'anger', 'beauty', 'friendship', 'strength', 'courage', 'wisdom', 'justice', 'truth', 'freedom', 'peace', 'hope', 'fear', 'joy', 'sadness', 'kindness', 'bravery', 'honesty', 'loyalty', 'creativity', 'imagination', 'hospital', 'library', 'market', 'garden', 'forest', 'ocean', 'island', 'village', 'soldier', 'king', 'queen', 'prince', 'princess', 'farmer', 'baker', 'artist', 'scientist', 'captain', 'pilot', 'homework', 'students', 'student', 'class', 'lesson', 'playground', 'dinner', 'lunch', 'breakfast', 'holiday', 'birthday', 'money', 'game', 'sport', 'music', 'story', 'picture', 'colour', 'color', 'animal', 'plant', 'flower', 'weather', 'season'],
      verb: ['run', 'jump', 'swim', 'eat', 'sleep', 'read', 'write', 'play', 'laugh', 'cry', 'walk', 'talk', 'sing', 'dance', 'climb', 'fly', 'kick', 'throw', 'catch', 'push', 'pull', 'open', 'close', 'start', 'finish', 'carry', 'drop', 'break', 'build', 'grow', 'cook', 'clean', 'wash', 'paint', 'draw', 'cut', 'sew', 'knit', 'dig', 'plant', 'water', 'pick', 'smell', 'taste', 'hear', 'see', 'feel', 'touch', 'think', 'know', 'believe', 'want', 'need', 'help', 'hurt', 'save', 'protect', 'create', 'destroy', 'explore', 'discover', 'gave', 'give', 'take', 'took', 'bring', 'brought', 'send', 'sent', 'show', 'told', 'tell', 'ask', 'answer', 'learn', 'teach', 'study', 'try', 'stop', 'wait', 'watch', 'listen', 'follow', 'lead'],
      adjective: ['beautiful', 'pretty', 'lovely', 'ugly', 'large', 'small', 'tiny', 'big', 'happy', 'sad', 'angry', 'brave', 'kind', 'clever', 'silly', 'tall', 'short', 'fast', 'slow', 'hot', 'cold', 'bright', 'dark', 'old', 'young', 'new', 'good', 'bad', 'sweet', 'bitter', 'sour', 'loud', 'quiet', 'hard', 'soft', 'rough', 'smooth', 'heavy', 'light', 'clean', 'dirty', 'healthy', 'sick', 'rich', 'poor', 'strong', 'weak', 'smart', 'wise', 'gentle', 'fierce', 'wild', 'tame', 'sharp', 'blunt', 'deep', 'shallow', 'wide', 'narrow', 'thick', 'thin', 'round', 'square', 'flat', 'curved', 'straight', 'crooked', 'colourful', 'dull', 'shiny', 'matte', 'fluffy', 'prickly', 'sticky', 'slippery', 'fragile', 'sturdy', 'enormous', 'gigantic', 'microscopic', 'average', 'ordinary', 'extraordinary', 'magical', 'mysterious', 'cowardly', 'honest', 'dishonest'],
      adverb: ['quickly', 'slowly', 'happily', 'sadly', 'carefully', 'loudly', 'quietly', 'gently', 'suddenly', 'always', 'never', 'sometimes', 'often', 'very', 'quite', 'really', 'softly', 'bravely', 'kindly', 'cleverly', 'stupidly', 'easily', 'hardly', 'nearly', 'almost', 'already', 'still', 'yet', 'soon', 'now', 'then', 'here', 'there', 'everywhere', 'nowhere', 'anywhere', 'somewhere', 'together', 'apart', 'away', 'back', 'forward', 'upward', 'downward', 'inward', 'outward', 'sideways', 'across', 'through', 'above', 'below', 'nearby', 'far', 'early', 'late', 'again', 'also', 'too', 'just', 'only', 'even', 'mainly', 'mostly', 'partly', 'clearly', 'obviously', 'certainly', 'definitely', 'probably', 'possibly', 'perhaps'],
    };

    if (wordClassMatch) {
      const targetClass = wordClassMatch[1].toLowerCase();
      const wordList = D8_WORD_CLASSES[targetClass];

      if (wordList) {
        const optionWords = q.options.map(o => (typeof o === 'string' ? o : o.text || '').toLowerCase().trim().replace(/['".,!?]/g, ''));

        if (!hasSentenceContext) {
          // No sentence → straightforward: flag if 2+ options are in the word class list
          const matchingOptions = optionWords.filter(opt => wordList.includes(opt));
          if (matchingOptions.length >= 2) {
            errors.push(`D8: Grammar word-class ambiguity — ${matchingOptions.length} options (${matchingOptions.join(', ')}) are all valid ${targetClass}s, making multiple answers correct`);
          }
        } else {
          // Sentence IS present → extract it, check which options appear IN the sentence
          // and also belong to the target word class. If 2+ qualify, the question is
          // still ambiguous (multiple valid answers within the given sentence).
          const sentenceMatch = q.question_text.match(/['"""']([^'"""']{5,})['"""']/);
          const sentenceText = sentenceMatch ? sentenceMatch[1].toLowerCase() : q.question_text.toLowerCase();

          const sentenceAndClassOptions = optionWords.filter(opt =>
            wordList.includes(opt) && sentenceText.includes(opt)
          );
          if (sentenceAndClassOptions.length >= 2) {
            errors.push(`D8: Grammar word-class ambiguity (in-sentence) — ${sentenceAndClassOptions.length} options (${sentenceAndClassOptions.join(', ')}) are all valid ${targetClass}s present in the given sentence, making multiple answers correct`);
          }
        }
      }
    }
  }

  // ─── D9: Comparison question marked "they are the same" but values differ ───
  // Catches "Which number is smaller: 12 or 1 ten and 1 one?" where correct_index
  // points to "They are the same" but the two quantities are demonstrably unequal,
  // or the explanation itself says one is larger/smaller.
  if (q.question_type === 'mcq' && Array.isArray(q.options) && typeof q.correct_index === 'number') {
    const isComparisonQ = /which\s+(is|number|value|amount|quantity)\s+(is\s+)?(smaller|larger|greater|bigger|fewer|more|less|higher|lower)/i.test(q.question_text)
      || /compare|which\s+has\s+(more|fewer|less|more)/i.test(q.question_text);

    if (isComparisonQ) {
      const correctOpt = (typeof q.options[q.correct_index] === 'string'
        ? q.options[q.correct_index]
        : (q.options[q.correct_index]?.text || '')).toLowerCase();

      const claimsEquality = /same|equal|neither|both|no difference/i.test(correctOpt);

      if (claimsEquality) {
        // Check explanation for evidence of inequality
        const exp = (q.explanation || '').toLowerCase();
        const explanationShowsInequality = /is larger|is smaller|is greater|is more|is fewer|is less|is bigger|is higher|is lower/i.test(exp);

        if (explanationShowsInequality) {
          errors.push(`D9: Comparison equality false-positive — marked answer is "${correctOpt}" (claims values are equal) but the explanation states one value is larger/smaller. Fix correct_index to point to the genuinely smaller/larger option.`);
        } else {
          // Parse two numeric values from the question text and compare them
          const nums = q.question_text.match(/\b(\d+)\b/g);
          if (nums && nums.length >= 2) {
            const [a, b] = [parseInt(nums[0], 10), parseInt(nums[1], 10)];
            if (!isNaN(a) && !isNaN(b) && a !== b) {
              errors.push(`D9: Comparison equality false-positive — marked answer claims values are equal but question contains two different numbers (${a} vs ${b}). Verify correct_index.`);
            }
          }
        }
      }
    }
  }

  // ─── D10: "Starts with sound/letter X" — marked answer only has X at word-END ─
  // Catches "Which word starts with 'sh'?" where correct option is "fish" (ends in sh)
  // or "Which word starts with 'ch'?" where correct option is "each" (ends in ch).
  if (q.question_type === 'mcq' && Array.isArray(q.options) && typeof q.correct_index === 'number') {
    const phonemeStartMatch = q.question_text.match(
      /(?:which|what)\s+word\s+(?:starts|begins)\s+with\s+(?:the\s+(?:sound|letter)\s+)?['"]?([a-z]{1,3})['"]?/i
    );

    if (phonemeStartMatch) {
      const targetPhoneme = phonemeStartMatch[1].toLowerCase();
      const correctOption = (typeof q.options[q.correct_index] === 'string'
        ? q.options[q.correct_index]
        : (q.options[q.correct_index]?.text || '')).toLowerCase().trim().replace(/['".,!?\s]/g, '');

      if (correctOption.length > 0 && !correctOption.startsWith(targetPhoneme)) {
        // Confirmed: the marked answer does NOT start with the target phoneme
        const doesEndWith = correctOption.endsWith(targetPhoneme);
        const position = doesEndWith ? 'end' : 'middle/end';
        errors.push(`D10: Phoneme position error — question asks which word "starts with '${targetPhoneme}'" but marked correct option "${correctOption}" does not start with "${targetPhoneme}" (has it at ${position}). No option may correctly start with "${targetPhoneme}".`);
      }
    }
  }

  // ─── D11: Ambiguous repeated-digit place value question ─────────────────────
  // Catches "What is the value of the digit '1' in the number 11?" where '1' appears
  // in both the ones AND tens position — two valid answers (One and Ten).
  // Also catches "value of '2' in 22", "value of '3' in 333", etc.
  if (q.question_type === 'mcq') {
    const digitInNumberMatch = q.question_text.match(
      /value\s+of\s+(?:the\s+)?(?:digit|number)\s+['"]?(\d)['"]?\s+in\s+(?:the\s+(?:number|numeral)\s+)?['"]?(\d+)['"]?/i
    );

    if (digitInNumberMatch) {
      const targetDigit = digitInNumberMatch[1];
      const wholeNumber  = digitInNumberMatch[2];
      const occurrences  = (wholeNumber.split('').filter(d => d === targetDigit)).length;

      if (occurrences > 1) {
        errors.push(`D11: Ambiguous repeated-digit place value — digit '${targetDigit}' appears ${occurrences} times in "${wholeNumber}", making both its ones and tens (or hundreds) positions valid answers. Use a number where the target digit appears exactly once.`);
      }
    }
  }

  // ─── D12: "Find the misspelled word" with multiple misspellings in options ──
  // Catches "Find the misspelled word: tress / tre / treee / tree" where both "tre"
  // and "treee" are misspellings — scholar cannot distinguish which is THE answer.
  // Heuristic: if 2+ options share the same first 2 chars AND similar length to the
  // correct option, they're likely all misspellings of the same root word.
  if (q.question_type === 'mcq' && Array.isArray(q.options) && q.options.length >= 3) {
    const isMisspellingQ = /(?:find|choose|identify|select|spot)\s+the\s+mis(?:spelled|spelt)\s+word/i.test(q.question_text)
      || /which\s+(?:word|one)\s+is\s+mis(?:spelled|spelt)/i.test(q.question_text)
      || /which\s+(?:word|one)\s+(?:has|contains)\s+a\s+spelling\s+(?:mistake|error)/i.test(q.question_text);

    if (isMisspellingQ && typeof q.correct_index === 'number') {
      // Simple Levenshtein distance
      const lev = (a, b) => {
        const dp = Array.from({ length: a.length + 1 }, (_, i) =>
          Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
        );
        for (let i = 1; i <= a.length; i++) {
          for (let j = 1; j <= b.length; j++) {
            dp[i][j] = a[i-1] === b[j-1]
              ? dp[i-1][j-1]
              : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
          }
        }
        return dp[a.length][b.length];
      };

      // The "correct" option is the misspelled word; the other options are meant to be correct spellings.
      // Find the one correctly-spelled option (the non-answer option closest to a real word).
      // Simpler: look for multiple options that are close in edit distance to EACH OTHER
      // and all differ from the correct_index option by the same amount — they're all misspellings of same root.
      const optTexts = q.options.map(o => (typeof o === 'string' ? o : o?.text || '').toLowerCase().trim());
      const nonAnswerOptions = optTexts.filter((_, i) => i !== q.correct_index);

      // If 2+ non-answer options have edit distance <= 2 from the correct (misspelled) option,
      // they're also likely misspellings of the same root word → ambiguous
      const markedMisspelling = optTexts[q.correct_index];
      const otherLookingMisspelled = nonAnswerOptions.filter(opt => {
        const dist = lev(opt, markedMisspelling);
        return dist >= 1 && dist <= 2 && Math.abs(opt.length - markedMisspelling.length) <= 1;
      });

      if (otherLookingMisspelled.length >= 1) {
        errors.push(`D12: Multiple misspellings in options — "${markedMisspelling}" is marked as the misspelled word, but ${otherLookingMisspelled.length} other option(s) [${otherLookingMisspelled.join(', ')}] also appear to be misspellings of the same root word. Scholar cannot distinguish which is the single misspelling. Use options where only ONE is misspelled.`);
      }
    }
  }

  // ─── D13: Explanation states a different numeric answer than correct_index ──
  // Catches cases where AI computes the right answer in the explanation but
  // writes the wrong index (e.g., "The answer is 9" but correct_index → "3").
  // Skips "find the error/misspelled word" questions where explanation correctly
  // names the right spelling while the marked index points to the wrong spelling.
  {
    const expl = (q.explanation || '').toLowerCase();
    const qText = (q.question_text || q.question || '').toLowerCase();

    const isSpellingError = /(?:find|spot|identify|which is|choose).{0,30}(?:misspell|spelling error|spelled incorrectly|spelt incorrectly|incorrect spelling|spelling mistake)/i.test(qText + ' ' + expl);
    const isStepProblem = /(?:step [12]|first,?\s+(?:add|subtract|multiply|divide)|then\s+(?:add|subtract|multiply|divide))/i.test(expl);

    if (!isSpellingError && !isStepProblem && Array.isArray(q.options) && q.correct_index != null) {
      // Extract what the explanation claims the final numeric answer is
      const answerPatterns = [
        /(?:correct answer|the answer|answer is|therefore[,\s]+x\s*=|x\s*=\s*|result is|equals?)\s*[=:'""]?\s*(-?\d+(?:\.\d+)?)\s*[.,'""\s)]/i,
        /(?:so|thus|hence|therefore)\s+(?:the\s+)?(?:answer\s+is\s+)?(-?\d+(?:\.\d+)?)\s*[.,\s]/i,
      ];

      let namedNum = null;
      for (const pat of answerPatterns) {
        const m = expl.match(pat);
        if (m) { namedNum = parseFloat(m[1]); break; }
      }

      if (namedNum !== null && !isNaN(namedNum)) {
        const currentOpt = String(q.options[q.correct_index] || '').trim();
        const currentNum = parseFloat(currentOpt);

        if (!isNaN(currentNum) && Math.abs(currentNum - namedNum) > 0.5) {
          // Check if the named number exists at a DIFFERENT option index
          const namedIdx = q.options.findIndex(opt => {
            const n = parseFloat(String(opt).trim());
            return !isNaN(n) && Math.abs(n - namedNum) < 0.01;
          });

          if (namedIdx !== -1 && namedIdx !== q.correct_index) {
            errors.push(`D13: Explanation-answer mismatch — explanation states the answer is ${namedNum} (at option index ${namedIdx}: "${q.options[namedIdx]}") but correct_index=${q.correct_index} points to "${currentOpt}". Verify arithmetic and set correct_index=${namedIdx}.`);
          }
        }
      }
    }
  }

  // ─── D14: Leaked generator monologue in explanation ──────────────────────
  // Catches explanations that contain the AI's internal reasoning/corrections
  // instead of clean, student-facing text. These phrases indicate the model
  // was revising mid-generation and left its scratchpad in the explanation.
  {
    const expl = q.explanation || '';
    const MONOLOGUE_PATTERNS = [
      /\bwait,?\s+(let me|re-read|actually)/i,
      /\blet me (correct|re-?calculate|re-?read|re-?check|reconsider|re-?examine)/i,
      /\bI will correct\b/i,
      /\bI need to correct\b/i,
      /\brevising based on (options|the question)/i,
      /\bre-reading the (options|question)\b/i,
      /\bactually[,\s]+(?:the answer|this is wrong|I made|re-?read)/i,
      /\bthere seems to be a mismatch\b/i,
      /\blet'?s re-?calculate\b/i,
      /\blet'?s re-?read\b/i,
      /\blet'?s (?:re-)?assume\b/i,
      /\blet'?s select\b.*\bas the (mathematically|correct)/i,
      /\bI (?:made|see) an error\b/i,
      /\bcorrection:\s/i,
      /\bupon reflection[,\s]/i,
    ];

    for (const pat of MONOLOGUE_PATTERNS) {
      if (pat.test(expl)) {
        errors.push(`D14: Leaked generator monologue — explanation contains internal reasoning/correction text (matched: "${expl.slice(0, 80).replace(/\n/g, ' ')}..."). Rewrite the explanation as clean, student-facing text without self-correction phrases.`);
        break; // one error is enough per question
      }
    }
  }

  // ─── D15: Grammar article giveaway ───────────────────────────────────────
  // Flags when the question stem ends with "a" or "an" and the marked correct
  // answer is grammatically incompatible — a test-taker can guess without
  // knowing the answer just from the article.
  if (isMcq && opts.length >= 3 && corrIdx != null && opts[corrIdx] != null) {
    const stemWords = (q.question_text || '').replace(/[?.!]+$/, '').trim().split(/\s+/);
    const lastWord = (stemWords[stemWords.length - 1] || '').toLowerCase();
    if (lastWord === 'a' || lastWord === 'an') {
      const NEEDS_AN_SET = new Set(['hour','honest','honour','honor','heir','herb']);
      const NEEDS_A_SET  = new Set(['uniform','university','union','unit','unique','user','useful','usual','eucalyptus','ewe','euro','european']);
      const correctFirstWord = String(opts[corrIdx]).trim().split(/\s+/)[0] || '';
      const fw = correctFirstWord.toLowerCase();
      const needsAn = NEEDS_AN_SET.has(fw) ? true : NEEDS_A_SET.has(fw) ? false : /^[aeiou]/i.test(fw);
      if (lastWord === 'an' && !needsAn) {
        errors.push(`D15: Grammar article giveaway — stem ends "an" but correct answer "${correctFirstWord}" starts with consonant sound. Fix the stem to end "a" or rewrite the question.`);
      } else if (lastWord === 'a' && needsAn) {
        errors.push(`D15: Grammar article giveaway — stem ends "a" but correct answer "${correctFirstWord}" starts with vowel sound. Fix the stem to end "an" or rewrite the question.`);
      }
    }
  }

  // ─── D16: "All of the above" / "None of the above" marked correct ──────────
  // AOTA/NOTA as the marked correct answer is a test-design anti-pattern — it
  // rewards test-wise guessing over subject knowledge and is rarely justified.
  if (isMcq && corrIdx != null && opts[corrIdx] != null) {
    const ct = String(opts[corrIdx]).trim().toLowerCase();
    const AOTA = [/^all\s+of\s+the\s+above/, /^all\s+the\s+above/, /^all\s+of\s+these/, /^all\s+of\s+them/];
    const NOTA = [/^none\s+of\s+the\s+above/, /^none\s+of\s+these/, /^not\s+listed/, /^neither\s+of\s+the\s+above/];
    if (AOTA.some(p => p.test(ct))) {
      errors.push(`D16: "All of the above" (or equivalent) is the marked correct answer — this is a lazy catch-all that is guessable without subject knowledge. Use specific, independently verifiable answer options.`);
    } else if (NOTA.some(p => p.test(ct))) {
      errors.push(`D16: "None of the above" (or equivalent) is the marked correct answer — only valid when every other option has been independently verified wrong. Provide a concrete correct answer instead.`);
    }
  }

  // ─── D17: Correct-answer length outlier ──────────────────────────────────
  // When the correct answer is substantially longer than all distractors, test-
  // takers can guess by selecting the longest option — a well-documented bias.
  if (isMcq && opts.length >= 3 && corrIdx != null && opts[corrIdx] != null) {
    const wc = s => String(s).trim().split(/\s+/).filter(w => w.length > 0).length;
    const correctLen = wc(opts[corrIdx]);
    const distractorLens = opts.filter((_, i) => i !== corrIdx).map(o => wc(o)).filter(l => l > 0);
    if (distractorLens.length > 0 && correctLen > 0) {
      const avgDist = distractorLens.reduce((a, b) => a + b, 0) / distractorLens.length;
      const maxDist = Math.max(...distractorLens);
      if (avgDist > 0 && correctLen / avgDist >= 2.5 && correctLen > maxDist) {
        errors.push(`D17: Correct-answer length outlier — correct answer is ${correctLen} words vs avg distractor ${avgDist.toFixed(1)} words (${(correctLen/avgDist).toFixed(1)}× ratio). Trim the correct answer or expand distractors to remove length bias.`);
      }
    }
  }

  // ─── D18: Leading / biased question phrasing ─────────────────────────────
  // These phrases presuppose an answer and bias the student toward a particular
  // response, undermining validity and fairness.
  {
    const qt = q.question_text || '';
    const LEADING = [
      /\bdon'?t\s+you\s+(think|agree|believe)\b/i,
      /\bisn'?t\s+it\s+true\s+that\b/i,
      /\bwouldn'?t\s+you\s+agree\b/i,
      /\bsurely\s+[a-z]/i,
      /\bobviously[,\s]/i,
      /\bas\s+we\s+all\s+know\b/i,
      /\bclearly[,\s]+the\s+(best|correct|right|answer)\b/i,
      /\beveryone\s+knows\s+that\b/i,
      /\bof\s+course[,\s]/i,
    ];
    for (const p of LEADING) {
      if (p.test(qt)) {
        const m = qt.match(p);
        errors.push(`D18: Leading/biased question phrasing — "${(m ? m[0] : 'matched phrase').trim()}" presupposes an answer and undermines assessment validity. Rewrite as a neutral question.`);
        break;
      }
    }
  }

  // ─── D19: Missing question mark for interrogative stem ────────────────────
  // Questions starting with interrogative words (What/Which/Who/Where/When/How/Why)
  // must end with "?" — absence is a punctuation error that may confuse readers.
  {
    const qt = (q.question_text || '').trim();
    const INTERROGATIVES = /^(what|which|who|where|when|how|why|whose|whom)\s+/i;
    if (INTERROGATIVES.test(qt) && !qt.endsWith('?')) {
      // Skip fill-in-blank patterns which legitimately end without ?
      if (!/_{2,}$/.test(qt) && !/\.{3}$/.test(qt)) {
        errors.push(`D19: Missing question mark — interrogative question starting with "${qt.split(/\s+/)[0]}" should end with "?". Add the question mark.`);
      }
    }
  }

  // ─── D20: Overlapping numeric ranges in options ───────────────────────────
  // When options contain ranges like "1–5" and "5–10", the boundary value (5)
  // belongs to both, making it impossible to assign a unique correct answer
  // for a value at the boundary.
  if (isMcq && opts.length >= 2) {
    const extractRange = text => {
      const m = String(text).match(/(\d+(?:\.\d+)?)\s*(?:[-–—]|to)\s*(\d+(?:\.\d+)?)/);
      if (!m) return null;
      return [parseFloat(m[1]), parseFloat(m[2])];
    };
    const withRanges = opts.map(o => extractRange(String(o))).filter(Boolean);
    if (withRanges.length >= 2) {
      const conflicts = [];
      for (let i = 0; i < withRanges.length; i++) {
        for (let j = i + 1; j < withRanges.length; j++) {
          const a = withRanges[i], b = withRanges[j];
          if (a[1] >= b[0] && b[1] >= a[0]) {
            conflicts.push(`[${a}] and [${b}]`);
          }
        }
      }
      if (conflicts.length > 0) {
        errors.push(`D20: Overlapping numeric ranges in options — ${conflicts.join('; ')}. Boundary values belong to multiple options. Use exclusive upper bounds (e.g. "1–4" and "5–9") to eliminate ambiguity.`);
      }
    }
  }

  // ─── D21: Ambiguous "does not belong" / "odd one out" with competing criteria ──
  // Detects questions where 3 options share a rhyme-family ending (2-letter rime)
  // but the marked correct answer is ALSO a member of that rhyme group, meaning the
  // non-rhyming option is an equally valid correct answer.  Classic case: hat/bat/cat/dog
  // — if correct_index points to "hat" (not an animal), "dog" (doesn't rhyme) is also
  // a valid answer.  The question must specify its criterion explicitly to be unambiguous.
  if (isMcq && opts.length === 4) {
    const qt = String(q.question_text || "").toLowerCase();
    const isOddOneOut = /\b(does not belong|doesn't belong|odd one out|which.{0,20}is different|which.{0,20}does not belong|which.{0,20}doesn't belong|which is the odd|find the odd)\b/.test(qt);
    if (isOddOneOut) {
      // Extract 2-letter endings of all options
      const endings = opts.map(o => String(o).trim().toLowerCase().replace(/[^a-z]/g, "").slice(-2));
      const endingCounts = {};
      endings.forEach(e => { endingCounts[e] = (endingCounts[e] || 0) + 1; });
      // Find dominant ending (shared by ≥3 options)
      const dominant = Object.keys(endingCounts).find(e => endingCounts[e] >= 3);
      if (dominant) {
        const dominantIdxs = endings.map((e, i) => e === dominant ? i : -1).filter(i => i >= 0);
        const nonDominantIdxs = endings.map((e, i) => e !== dominant ? i : -1).filter(i => i >= 0);
        // Ambiguous if correct_index is in the dominant rhyme group AND there's a non-rhyming option
        if (dominantIdxs.includes(q.correct_index) && nonDominantIdxs.length >= 1) {
          const markedOpt = opts[q.correct_index];
          const altOpt = opts[nonDominantIdxs[0]];
          errors.push(
            `D21: Ambiguous "does not belong" — correct_index points to "${markedOpt}" (shares "-${dominant}" ending with ${dominantIdxs.length - 1} other options), ` +
            `but "${altOpt}" is equally valid as the odd-one-out by rhyme criterion. ` +
            `The question must explicitly state its grouping criterion (e.g. "which is NOT an animal?" or "which does NOT rhyme?") to be unambiguous.`
          );
        }
      }
    }
  }

  // ─── D22: All-rhyme broken "does not rhyme" question ─────────────────────────
  // If the question asks "which word does NOT rhyme with X?" but ALL 4 options share
  // the same 3-letter ending (or all belong to known heterographic rhyme families),
  // every option rhymes with every other option — the question is unanswerable.
  if (isMcq && opts.length >= 4) {
    const qt = String(q.question_text || "").toLowerCase();
    const isDoesNotRhyme = /\b(does not rhyme|doesn't rhyme|which.{0,25}does not rhyme|which.{0,25}doesn't rhyme|which word.{0,20}not rhyme)\b/.test(qt);
    if (isDoesNotRhyme) {
      const endings3 = opts.slice(0, 4).map(o =>
        String(o).trim().toLowerCase().replace(/[^a-z]/g, "").slice(-3)
      );
      const allSame3 = endings3.every(e => e === endings3[0] && e.length === 3);
      if (allSame3) {
        errors.push(
          `D22: All-rhyme broken phonics question — all ${opts.length} options share the same "-${endings3[0]}" ending, ` +
          `so every option rhymes with every other option. ` +
          `The question "does not rhyme" has no valid answer. Replace at least one option with a word that genuinely does NOT share this rime.`
        );
      } else {
        // Also check well-known heterographic rhyme families (same sound, different spelling)
        const AIR_FAMILY = new Set(["chair","stair","bear","hair","bare","care","dare","fair","hare","mare","pair","rare","stare","share","spare","wear","pear","there","where","prayer","layer","player","mayor","swear","tear","pear"]);
        const IGH_FAMILY = new Set(["light","night","right","fight","might","sight","tight","bright","flight","slight","knight","white","bite","kite","quite","write","spite","trite","height","yte","site","mite","lite","rite"]);
        const ORE_FAMILY = new Set(["more","bore","core","door","floor","gore","lore","oar","ore","pore","pour","roar","score","shore","snore","soar","store","tore","wore","yore","four","your","war","saw","raw","jaw","paw","draw","law","caw"]);
        const OOL_FAMILY = new Set(["pool","fool","tool","cool","rule","school","stool","spool","wool","full","bull","pull","mule","duel","fuel","gruel","jewel"]);
        const families = [AIR_FAMILY, IGH_FAMILY, ORE_FAMILY, OOL_FAMILY];
        const optWords = opts.slice(0, 4).map(o => String(o).trim().toLowerCase());
        for (const family of families) {
          if (optWords.every(w => family.has(w))) {
            errors.push(
              `D22: All-rhyme broken phonics question — all options (${optWords.join(", ")}) belong to the same rhyme family. ` +
              `The question "does not rhyme" has no valid answer. Replace at least one option with a genuinely non-rhyming word.`
            );
            break;
          }
        }
      }
    }
  }

  // ─── D23: UK/US spelling conflict — American spelling in UK curriculum ────────
  // For uk_national and uk_11plus, every option and especially the marked correct answer
  // must use British spellings.  American spellings appearing as the marked correct
  // answer directly harms UK scholars (as seen in parent feedback: "favourite" marked wrong,
  // "favorite" marked correct for a UK scholar).
  if (isMcq && (curriculum === "uk_national" || curriculum === "uk_11plus")) {
    const US_TO_GB = {
      "favorite": "favourite", "color": "colour", "behavior": "behaviour",
      "honor": "honour", "neighbor": "neighbour", "humor": "humour",
      "rumor": "rumour", "flavor": "flavour", "center": "centre",
      "theater": "theater", "meter": "metre", "liter": "litre",
      "organize": "organise", "recognize": "recognise", "realize": "realise",
      "analyze": "analyse", "traveling": "travelling", "traveler": "traveller",
      "fulfill": "fulfil", "catalog": "catalog", "dialog": "dialogue",
      "program": "programme", "defense": "defence", "offense": "offence",
      "license": "licence", "gray": "grey", "skeptic": "sceptic",
      "skeptical": "sceptical", "maneuver": "manoeuvre", "pajama": "pyjama",
      "aging": "ageing", "artifact": "artefact", "judgement": "judgment",
    };
    const correctOpt = String(opts[q.correct_index] || "").trim().toLowerCase();
    const britishForm = US_TO_GB[correctOpt];
    if (britishForm) {
      // Only flag if the British form also appears as an option
      const britishInOptions = opts.some(o => String(o).trim().toLowerCase() === britishForm);
      if (britishInOptions) {
        errors.push(
          `D23: UK/US spelling conflict — correct_index points to "${opts[q.correct_index]}" (American spelling) ` +
          `but the British spelling "${britishForm}" is also an option. For ${curriculum} curriculum, ` +
          `"${britishForm}" must be the correct answer. Update correct_index to point to the British spelling.`
        );
      } else {
        // Flag even if British form not present — American form should not appear as correct
        errors.push(
          `D23: UK/US spelling conflict — correct_index points to "${opts[q.correct_index]}" (American spelling) ` +
          `in a ${curriculum} question. Replace with the British spelling "${britishForm}".`
        );
      }
    }
    // Also check all options — American spellings should not appear anywhere in UK curriculum questions
    opts.forEach((opt, i) => {
      const o = String(opt).trim().toLowerCase();
      const gb = US_TO_GB[o];
      if (gb && i !== q.correct_index) {
        // Only warn (not block) when American spelling is a distractor — it can confuse scholars
        // who have learned British spellings and might doubt their correct answer
        errors.push(
          `D23: UK/US spelling — option ${i} ("${opt}") uses American spelling; replace with British form "${gb}" ` +
          `to avoid confusing ${curriculum} scholars.`
        );
      }
    });
  }

  // ─── D24: Anagram question with multiple valid answers ───────────────────────
  // Catches "which word can be made from rearranging X?" where 2+ options are valid anagrams
  if (q.question_type === 'mcq' && Array.isArray(q.options) && q.question_text) {
    const anagramPatterns = [
      /rearranging\s+(?:the\s+)?letters?\s+(?:in|of)\s+['"]?([A-Za-z]+)['"]?/i,
      /anagram\s+(?:of|for)\s+['"]?([A-Za-z]+)['"]?/i,
      /unscramble\s+['"]?([A-Za-z]+)['"]?/i,
      /made\s+(?:by\s+)?(?:from|using)\s+(?:the\s+)?letters?\s+(?:in|of)\s+['"]?([A-Za-z]+)['"]?/i,
      /scrambled\s+(?:form|version|letters?)\s+(?:of|is)\s+['"]?([A-Za-z]+)['"]?/i,
    ];
    let sourceWord = null;
    for (const pattern of anagramPatterns) {
      const m = q.question_text.match(pattern);
      if (m && m[1]) {
        sourceWord = m[1].toLowerCase();
        break;
      }
    }
    if (sourceWord) {
      // Compute sorted-letter signature for source word
      const sourceSignature = [...sourceWord].sort().join('');
      const matchingOptions = [];
      let validCount = 0;
      q.options.forEach(opt => {
        const optClean = String(opt).replace(/[^a-zA-Z]/g, '').toLowerCase();
        const optSignature = [...optClean].sort().join('');
        if (optSignature === sourceSignature) {
          matchingOptions.push(String(opt));
          validCount++;
        }
      });
      if (validCount >= 2) {
        errors.push(
          `D24: Anagram question has ${validCount} valid answers — ${matchingOptions.join(', ')} are all valid anagrams of "${sourceWord}". ` +
          `Reword the question to specify a unique answer (e.g., "starts with the letter X", "most common English word").`
        );
      }
    }
  }

  // ─── D25: "Does not rhyme" question where multiple options don't rhyme ────────
  // Catches "which word does NOT rhyme with X?" where 2+ options don't rhyme
  if (q.question_type === 'mcq' && Array.isArray(q.options) && q.question_text) {
    const rhymeNotPattern = /which\s+(?:word|one)\s+does\s+not\s+rhyme|does\s+not\s+rhyme\s+with\s+['"]?([A-Za-z]+)['"]?/i;
    const rhymeMatch = q.question_text.match(/rhyme\s+with\s+['"]?([A-Za-z]+)['"]?/i);
    if (rhymeNotPattern.test(q.question_text) && rhymeMatch && rhymeMatch[1]) {
      const targetWord = rhymeMatch[1].toLowerCase();
      const rime2 = targetWord.slice(-2).toLowerCase();
      const rime3 = targetWord.length >= 5 ? targetWord.slice(-3).toLowerCase() : null;

      const nonRhymers = [];
      let nonRhymingCount = 0;
      q.options.forEach(opt => {
        const optLower = String(opt).toLowerCase().trim();
        const endsWithRime2 = optLower.endsWith(rime2);
        const endsWithRime3 = rime3 && optLower.endsWith(rime3);
        if (!endsWithRime2 && !endsWithRime3) {
          nonRhymers.push(String(opt));
          nonRhymingCount++;
        }
      });
      if (nonRhymingCount >= 2) {
        errors.push(
          `D25: "Does not rhyme" question is ambiguous — ${nonRhymingCount} options don't rhyme with "${targetWord}" (${nonRhymers.join(', ')}). ` +
          `Ensure exactly one option is the non-rhymer by either removing distractor non-rhymers or clarifying the rhyme pattern.`
        );
      }
    }
  }

  // ─── D26: NOT/EXCEPT question where multiple options satisfy "NOT" ───────────
  // Catches "which is NOT a mammal?" where 2+ options validly satisfy "NOT"
  if (q.question_type === 'mcq' && Array.isArray(q.options) && q.question_text) {
    const notPattern = /which\s+(?:of\s+(?:the\s+)?(?:these|the\s+following)|one)\s+is\s+not\s+(?:a\s+|an\s+)?(\w+)|which\s+(?:word|letter|number)\s+is\s+not\s+(?:a\s+|an\s+)?(\w+)/i;
    const notMatch = q.question_text.match(notPattern);
    if (notMatch) {
      const categoryName = (notMatch[1] || notMatch[2] || '').toLowerCase();
      const categoryKey = Object.keys(KNOWN_CATEGORIES_D26).find(k => k.toLowerCase() === categoryName);

      if (categoryKey) {
        const categorySet = KNOWN_CATEGORIES_D26[categoryKey];
        const nonMembers = [];
        let nonMemberCount = 0;
        q.options.forEach(opt => {
          const optClean = String(opt).toLowerCase().trim().replace(/[^\w\s]/g, '');
          if (!categorySet.has(optClean)) {
            nonMembers.push(String(opt));
            nonMemberCount++;
          }
        });
        if (nonMemberCount >= 2) {
          errors.push(
            `D26: NOT/EXCEPT question is ambiguous — ${nonMemberCount} options qualify as "NOT a ${categoryName}" (${nonMembers.join(', ')}). ` +
            `Either add more specific criteria ("NOT a mammal AND weighs <10kg") or reduce distractor options that satisfy the "NOT" criterion.`
          );
        }
      }
    }
  }

  // ─── D27: Answer text appears verbatim in question stem ────────────────────
  // Prevents trivially guessable questions where the correct answer is spelled out
  // in the question itself, making the question answerable without knowledge.
  if (q.question_type === 'mcq' && Array.isArray(q.options) && typeof q.correct_index === 'number' && q.question_text) {
    const isFillInBlank = q.question_type === 'fill_in_blank';
    const isTrueFalse = q.question_type === 'true_false';
    const isEnglish = /english|verbal_reasoning/i.test(subject);
    const isKS1 = year <= 2;

    if (!isFillInBlank && !isTrueFalse && !isEnglish && !isKS1) {
      const correctOption = String(q.options[q.correct_index] || '').trim();
      const qTextLower = String(q.question_text).toLowerCase();
      const correctLower = correctOption.toLowerCase();
      const answerLen = correctOption.length;

      // Only flag if answer is 4-40 characters (substantial but not a paragraph)
      if (answerLen >= 4 && answerLen <= 40 && qTextLower.includes(correctLower)) {
        errors.push(
          `D27: Answer verbatim in question — "${correctOption}" appears in the question stem itself. ` +
          `Reword the question to avoid revealing the answer (e.g., use "This process is called..." instead of "This process is called photosynthesis...").`
        );
      }
    }
  }

  // ─── D28: Definition/meaning question — multiple options are valid synonyms ──
  // Catches "What does 'happy' mean?" where both "Joyful" and "Excited" are
  // valid answers. D6 only fires for "means the same as / synonym of" phrasing;
  // D28 targets the "What does X mean?" / "What is the meaning of X?" pattern.
  if (q.question_type === 'mcq' && Array.isArray(q.options) && q.options.length >= 3) {
    const defMatch = q.question_text.match(
      /what\s+does\s+['"""']?(\w+)['"""']?\s+mean/i
    ) || q.question_text.match(
      /what\s+is\s+the\s+meaning\s+of\s+['"""']?(\w+)['"""']?/i
    ) || q.question_text.match(
      /which\s+word\s+means\s+(?:the\s+same\s+as\s+)?['"""']?(\w+)['"""']?/i
    ) || q.question_text.match(
      /another\s+word\s+for\s+['"""']?(\w+)['"""']?/i
    );

    if (defMatch) {
      const targetWord = defMatch[1].toLowerCase();

      // Reuse D6 synonym clusters — if 2+ options are in the same cluster as
      // the target word, the question has multiple valid answers.
      const D28_CLUSTERS = [
        ['happy', 'glad', 'joyful', 'cheerful', 'pleased', 'delighted', 'content', 'elated', 'thrilled', 'excited'],
        ['sad', 'unhappy', 'miserable', 'sorrowful', 'gloomy', 'depressed', 'mournful', 'melancholy', 'downcast'],
        ['angry', 'furious', 'enraged', 'irate', 'livid', 'irritated', 'annoyed', 'mad', 'cross'],
        ['big', 'large', 'huge', 'enormous', 'gigantic', 'vast', 'massive', 'immense', 'colossal'],
        ['small', 'little', 'tiny', 'miniature', 'minute', 'petite', 'compact', 'microscopic'],
        ['fast', 'quick', 'rapid', 'swift', 'speedy', 'hasty', 'brisk', 'fleet'],
        ['slow', 'sluggish', 'gradual', 'leisurely', 'unhurried', 'plodding', 'dawdling'],
        ['bright', 'brilliant', 'luminous', 'radiant', 'vivid', 'gleaming', 'shining', 'glowing'],
        ['dark', 'dim', 'gloomy', 'shadowy', 'murky', 'dusky', 'sombre'],
        ['brave', 'courageous', 'bold', 'fearless', 'valiant', 'daring', 'heroic', 'intrepid'],
        ['scared', 'afraid', 'frightened', 'terrified', 'fearful', 'timid', 'anxious', 'nervous'],
        ['clever', 'smart', 'intelligent', 'bright', 'gifted', 'sharp', 'astute', 'brilliant'],
        ['tired', 'exhausted', 'weary', 'sleepy', 'fatigued', 'drained', 'worn out'],
        ['beautiful', 'pretty', 'lovely', 'gorgeous', 'attractive', 'stunning', 'charming'],
        ['ugly', 'hideous', 'unsightly', 'unattractive', 'grotesque'],
        ['old', 'ancient', 'aged', 'elderly', 'antique', 'archaic', 'vintage'],
        ['new', 'modern', 'fresh', 'recent', 'novel', 'current', 'contemporary'],
        ['kind', 'caring', 'gentle', 'warm', 'considerate', 'compassionate', 'generous', 'thoughtful'],
        ['mean', 'unkind', 'cruel', 'harsh', 'nasty', 'spiteful', 'heartless', 'callous'],
        ['walk', 'stroll', 'march', 'stride', 'trudge', 'wander', 'amble', 'pace'],
        ['run', 'sprint', 'dash', 'jog', 'race', 'rush', 'hurry'],
        ['talk', 'speak', 'say', 'utter', 'chat', 'converse', 'communicate', 'tell'],
        ['look', 'see', 'watch', 'observe', 'gaze', 'stare', 'glance', 'peer'],
        ['like', 'enjoy', 'love', 'adore', 'appreciate', 'fancy', 'relish'],
        ['hate', 'dislike', 'despise', 'detest', 'loathe', 'abhor'],
        ['help', 'assist', 'support', 'aid', 'guide', 'back', 'serve'],
        ['strange', 'odd', 'weird', 'unusual', 'peculiar', 'bizarre', 'curious'],
      ];

      const targetCluster = D28_CLUSTERS.find(cluster => cluster.includes(targetWord));
      if (targetCluster) {
        const optionWords = q.options.map(o =>
          (typeof o === 'string' ? o : o.text || '').toLowerCase().trim().replace(/['".,!?]/g, '')
        );
        // Check how many options are valid synonyms of the target word
        const validSynonyms = optionWords.filter(opt => targetCluster.includes(opt));
        if (validSynonyms.length >= 2) {
          errors.push(
            `D28: Definition ambiguity — "what does '${targetWord}' mean?" has ${validSynonyms.length} valid synonym options ` +
            `(${validSynonyms.join(', ')}). Only one option should be a valid synonym; rephrase or replace distractors.`
          );
        }
      }
    }
  }

  // ─── D29: Single-char / single-digit MCQ options (answer-label artifact) ────
  // All options are ≤2 characters — e.g. ["9","7","8","6"]. This makes the
  // answer identifiable from its label position, not its content.
  // Exception: questions explicitly about single letters or single digits
  // (e.g. "Which of these is a vowel?" Options: ["a","e","i","o"]).
  if (q.question_type === 'mcq' && Array.isArray(q.options) && q.options.length >= 2) {
    const allShort = q.options.every(o => String(o).trim().length <= 2);
    const isLetterQ = /which (?:of these )?(?:letter|vowel|consonant)|ends? with the letter|starts? with/i.test(q.question_text);
    if (allShort && !isLetterQ) {
      errors.push(
        `D29: Answer-label artifact — all ${q.options.length} options are ≤2 characters ` +
        `(${q.options.map(o => `"${o}"`).join(", ")}). ` +
        `Single-char/digit options trivially reveal the answer by position, not content. ` +
        `Expand each option to a full phrase (e.g. "${q.options[0]} units" or "${q.options[0]} apples").`
      );
    }
  }

  // ─── D30: Proper-noun capitalisation giveaway ─────────────────────────────
  // If EXACTLY ONE option has a mid-sentence capital letter (proper noun) and
  // that option is the correct answer, it reveals the answer via capitalisation.
  if (q.question_type === 'mcq' && Array.isArray(q.options) && typeof q.correct_index === 'number') {
    const hasMidCap = (opt) => {
      const words = String(opt).trim().split(/\s+/);
      // Skip first word (expected to start with capital); check the rest
      return words.slice(1).some(w => w.length > 1 && w[0] === w[0].toUpperCase() && /[A-Z]/.test(w[0]));
    };
    const midCapIndices = q.options.map((o, i) => hasMidCap(o) ? i : -1).filter(i => i >= 0);
    if (midCapIndices.length === 1 && midCapIndices[0] === q.correct_index) {
      errors.push(
        `D30: Proper-noun capitalisation giveaway — only the correct option ` +
        `("${q.options[q.correct_index]}") has a mid-sentence capital letter. ` +
        `Ensure all options follow the same capitalisation pattern, or rewrite ` +
        `distractors to also include proper nouns.`
      );
    }
  }

  // ─── D31: Inconsistent decimal places across numeric options ─────────────
  // Numeric options with different decimal places look the same mathematically
  // but confuse scholars and can hint at the answer by precision.
  if (q.question_type === 'mcq' && Array.isArray(q.options)) {
    const isNumeric = q.options.every(o => /^-?\d+(\.\d+)?$/.test(String(o).trim()));
    if (isNumeric) {
      const decimalPlaces = q.options.map(o => {
        const s = String(o).trim();
        const dot = s.indexOf(".");
        return dot === -1 ? 0 : s.length - dot - 1;
      });
      const uniqueDecimals = new Set(decimalPlaces);
      if (uniqueDecimals.size > 1) {
        errors.push(
          `D31: Inconsistent decimal places — options have ${[...uniqueDecimals].join(", ")} decimal places ` +
          `(${q.options.map(o => `"${o}"`).join(", ")}). ` +
          `Round all options to the same decimal precision (e.g., all 2 d.p.).`
        );
      }
    }
  }

  // ─── D32: Circular answer — correct option is a substring of the question stem ─
  // More nuanced than D27: catches cases where the answer paraphrases the stem
  // closely (Jaccard similarity on stopword-stripped token sets).
  if (q.question_type === 'mcq' && Array.isArray(q.options) && typeof q.correct_index === 'number' && q.question_text) {
    const STOP = new Set(["a","an","the","is","are","was","were","be","been","being",
      "have","has","had","do","does","did","will","would","shall","should","may","might",
      "must","can","could","to","of","in","on","at","for","with","by","from","as",
      "into","through","during","before","after","above","below","between","each",
      "few","more","most","other","some","such","than","then","that","this","which",
      "who","what","when","where","how","not","and","or","but","if","so"]);
    const tokenise = (s) =>
      (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
    const stemTokens   = new Set(tokenise(q.question_text));
    const answerTokens = new Set(tokenise(String(q.options[q.correct_index])));
    if (stemTokens.size > 0 && answerTokens.size > 0) {
      const intersection = [...answerTokens].filter(t => stemTokens.has(t));
      const jaccard      = intersection.length / (stemTokens.size + answerTokens.size - intersection.length);
      if (jaccard > 0.55 && answerTokens.size >= 3) {
        errors.push(
          `D32: Circular answer — the correct option shares ~${Math.round(jaccard * 100)}% content ` +
          `with the question stem (Jaccard similarity after stop-word removal). ` +
          `Common tokens: ${intersection.slice(0, 5).join(", ")}. ` +
          `Rewrite the answer to add information the stem does not already contain.`
        );
      }
    }
  }

  // ─── D33: "All of the above" / "None of the above" appears in ANY option ───
  // D16 only catches these when they are the CORRECT answer.
  // D33 extends the check to distractors — even as a wrong option they reward
  // pattern-guessing (scholars know "all of the above" is often correct on bad tests).
  if (Array.isArray(q.options)) {
    const AOTA_NOTA = /\ball\s+of\s+the\s+above\b|\bnone\s+of\s+the\s+above\b|\bboth\s+[a-d]\s+and\s+[a-d]\b|\bneither\s+[a-d]\s+nor\s+[a-d]\b/i;
    const bad = q.options.filter(o => AOTA_NOTA.test(String(o)));
    if (bad.length) {
      errors.push(
        `D33: Banned option phrasing in ${bad.length === 1 ? "an option" : "options"} — ` +
        `"${bad[0]}" is never acceptable, even as a distractor. ` +
        `Replace with a specific, independently verifiable alternative.`
      );
    }
  }

  // ─── D34: String explanation-answer mismatch (extends D13 beyond numeric) ─
  // D13 catches numeric mismatches in explanations. D34 catches string answers
  // where the explanation names a different answer than correct_index points to.
  if (q.question_type === 'mcq' && typeof q.correct_index === 'number' && q.explanation && Array.isArray(q.options)) {
    const expl       = (q.explanation || "").toLowerCase();
    const correctOpt = String(q.options[q.correct_index] || "").toLowerCase().trim();
    // Look for "the answer is X" / "the correct answer is X" / "therefore X" patterns
    const namedPatterns = [
      /the\s+(?:correct\s+)?answer\s+is\s+["']?([^"'.!?,\n]{3,50})["']?/i,
      /therefore(?:\s*,\s*|\s+)(?:the\s+answer\s+is\s+)?["']?([^"'.!?,\n]{3,40})["']?/i,
      /so\s+the\s+(?:correct\s+)?(?:answer|option)\s+is\s+["']?([^"'.!?,\n]{3,40})["']?/i,
    ];
    for (const rx of namedPatterns) {
      const m = (q.explanation || "").match(rx);
      if (m) {
        const stated = m[1].toLowerCase().trim();
        // Skip if the stated text IS the correct option (or a very close match)
        if (stated.length >= 3 && !correctOpt.includes(stated) && !stated.includes(correctOpt)) {
          // Check if the stated text matches a DIFFERENT option
          const matchIdx = q.options.findIndex(o =>
            String(o).toLowerCase().includes(stated) || stated.includes(String(o).toLowerCase().trim())
          );
          if (matchIdx >= 0 && matchIdx !== q.correct_index) {
            errors.push(
              `D34: Explanation-answer mismatch (string) — explanation says the answer is ` +
              `"${m[1].trim()}" (matches option ${matchIdx}: "${q.options[matchIdx]}") ` +
              `but correct_index=${q.correct_index} points to "${q.options[q.correct_index]}". ` +
              `Verify and correct correct_index or rewrite the explanation.`
            );
          }
        }
        break; // only fire once per question
      }
    }
  }

  // ─── D34b: Fuzzy explanation-answer mismatch (Levenshtein) ────────────────
  // Extends D34 (regex-only) with similarity scoring. Catches cases where the
  // explanation names an answer that is semantically the same as a DIFFERENT
  // option (e.g. explanation says "photosynthetic process", correct option is
  // "Respiration", but option 2 is "Photosynthesis" — ratio > 0.7 with option 2
  // but < 0.4 with the marked correct option → mismatch).
  //
  // Guard is conservative: only fires if:
  //   - A named phrase is extracted after standard answer-signal words
  //   - The named phrase has LOW similarity to the marked answer (< 0.55)
  //   - The named phrase has HIGH similarity to a DIFFERENT option (> 0.75)
  // This prevents false positives on paraphrases.
  if (q.question_type === 'mcq' && typeof q.correct_index === 'number' &&
      q.explanation && Array.isArray(q.options) && q.options.length >= 2) {
    const explLower = (q.explanation || "").toLowerCase();
    const correctOpt = String(q.options[q.correct_index] || "").toLowerCase().trim();
    // Extract phrase after common answer-signal markers
    const answerSignalRx = /(?:the\s+(?:correct\s+)?answer\s+is|therefore(?:\s*,\s*|\s+)the\s+answer\s+is|so\s+the\s+(?:correct\s+)?answer\s+is|answer:\s*|hence,?\s+the\s+answer\s+is)\s+["']?([^"'.!?,\n]{3,50})["']?/i;
    const m = (q.explanation || "").match(answerSignalRx);
    if (m) {
      const statedRaw = m[1].toLowerCase().trim();
      const simToCorrect = levenshteinRatio(statedRaw, correctOpt);
      if (simToCorrect < 0.55) {
        // Low similarity to the marked correct answer — check if it matches another option better
        let bestAltIdx = -1, bestAltSim = 0;
        for (let i = 0; i < q.options.length; i++) {
          if (i === q.correct_index) continue;
          const altSim = levenshteinRatio(statedRaw, String(q.options[i] || "").toLowerCase().trim());
          if (altSim > bestAltSim) { bestAltSim = altSim; bestAltIdx = i; }
        }
        if (bestAltIdx >= 0 && bestAltSim > 0.75) {
          errors.push(
            `D34b: Fuzzy explanation-answer mismatch — explanation names "${m[1].trim()}" ` +
            `(similarity ${Math.round(bestAltSim * 100)}% to option ${bestAltIdx}: "${q.options[bestAltIdx]}") ` +
            `but correct_index=${q.correct_index} points to "${q.options[q.correct_index]}" ` +
            `(only ${Math.round(simToCorrect * 100)}% similar). ` +
            `Verify correct_index or rewrite the explanation.`
          );
        }
      }
    }
  }

  // ─── D35: KS1 — hard rejection on banned vocabulary ────────────────────────
  // validateKS1Readability logs warnings but does NOT reject. D35 closes that gap:
  // any KS1 question containing a banned word is rejected outright at validation
  // time, not just flagged. Run this inline so it produces a proper error entry.
  if (year <= 2) {
    const allText = [q.question_text, ...(q.options || []), q.explanation].join(" ").toLowerCase();
    const bannedFound = [...KS1_BANNED_WORDS].filter(w => {
      const rx = new RegExp(`\\b${w}\\b`);
      return rx.test(allText);
    });
    if (bannedFound.length) {
      errors.push(
        `D35: KS1 vocabulary violation — found ${bannedFound.length} banned word(s): ` +
        `${bannedFound.slice(0, 4).join(", ")}. ` +
        `KS1 scholars (ages 5-7) cannot read these words. ` +
        `Rewrite using only simple everyday vocabulary.`
      );
    }
  }

  return errors;
}

// ─── Arithmetic evaluator (used by validateQuestion B3) ─────────────────────
// Moved out as a module-level helper so it can be called cleanly.
function _tryEvalArithmetic(questionText) {
  const m = questionText.match(
    /(\d+(?:\.\d+)?)\s*([\+\-×÷\*\/])\s*(\d+(?:\.\d+)?)\s*[=?]/
  );
  if (!m) return null;
  const a = parseFloat(m[1]);
  const b = parseFloat(m[3]);
  const op = m[2];
  if (isNaN(a) || isNaN(b)) return null;
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "×" || op === "*") return a * b;
  if (op === "÷" || op === "/") return b !== 0 ? parseFloat((a / b).toFixed(6)) : null;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// KS1 READABILITY VALIDATION (vocabulary + syllable counting)
// ═══════════════════════════════════════════════════════════════════════════════

const KS1_BANNED_WORDS = new Set([
  "dispersal", "perpendicular", "photosynthesis", "metamorphosis", "bisect",
  "numerator", "denominator", "equilateral", "photosynthetic", "circumference",
  "parallelogram", "hypothesis", "evaporation", "condensation", "precipitation",
  "vertebrate", "invertebrate", "amphibian", "carnivore", "herbivore", "omnivore",
  "ecosystem", "biodiversity", "adaptation", "respiration", "reproduction",
  "fertilisation", "germination", "pollination", "decomposition", "translucent",
  "transparent", "opaque", "conductor", "insulator", "magnetism", "electricity",
  "chromosome", "molecule", "atom", "nucleus", "electron", "proton", "neutron",
  "algorithm", "variable", "coefficient", "equation", "inequality", "integer",
  "fraction", "decimal", "percentage", "quotient", "remainder", "dividend", "divisor",
  "multiplication", "addition", "perimeter", "symmetry", "reflection", "rotation",
  "translation", "coordinates", "quadrilateral", "polygon", "pentagon", "hexagon",
  "octagon", "rhombus", "trapezoid", "congruent", "adjacent", "corresponding",
  "alternate", "supplementary", "complementary", "isosceles", "scalene", "obtuse",
  "acute", "reflex", "capacity", "millilitre", "kilogram", "centimetre", "kilometre",
  "probability", "statistics", "data", "frequency", "tally", "division", "subtract"
]);

/**
 * Count syllables in a word using simple vowel-group algorithm.
 * E.g. "cat" = 1, "table" = 2, "education" = 3
 */
function countSyllables(word) {
  if (!word || word.length === 0) return 1;
  word = word.toLowerCase().trim();
  // Count vowel groups (consecutive vowels = 1 syllable)
  const matches = word.match(/[aeiouy]+/g);
  let count = matches ? matches.length : 0;
  // Adjust for silent e at end
  if (word.endsWith("e")) count--;
  // Ensure at least 1 syllable per word
  return Math.max(1, count);
}

/**
 * Flesch-Kincaid Grade Level formula:
 * Grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
 * Returns grade level (0-18+)
 */
function computeFleschKincaidGrade(text) {
  if (!text || text.length === 0) return 0;

  // Count sentences (split by . ! ?)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  if (sentences === 0) return 0;

  // Count words
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  if (words === 0) return 0;

  // Count syllables across all words
  const wordArray = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  let totalSyllables = 0;
  for (const word of wordArray) {
    totalSyllables += countSyllables(word);
  }

  // Flesch-Kincaid formula
  const grade = 0.39 * (words / sentences) + 11.8 * (totalSyllables / words) - 15.59;
  return Math.max(0, grade);
}

/**
 * Validate KS1 question readability (vocabulary, sentence length, etc).
 * Returns { pass, grade, bannedWordsFound, longWords }
 */
function validateKS1Readability(question) {
  const result = {
    pass: true,
    grade: 0,
    bannedWordsFound: [],
    longWords: [],
    issues: []
  };

  const questionText = (question.question_text || "").trim();
  const explanation = (question.explanation || "").trim();

  if (!questionText) {
    result.pass = false;
    result.issues.push("No question text");
    return result;
  }

  // Compute Flesch-Kincaid grade
  result.grade = computeFleschKincaidGrade(questionText);

  // Check for banned words (case-insensitive, whole-word match)
  const wordArray = questionText.toLowerCase().match(/\b[a-z]+\b/g) || [];
  for (const word of wordArray) {
    if (KS1_BANNED_WORDS.has(word)) {
      result.bannedWordsFound.push(word);
    }
  }

  // Check for long words (>2 syllables)
  for (const word of wordArray) {
    const syllables = countSyllables(word);
    if (syllables > 2 && word.length > 4) {
      result.longWords.push({ word, syllables });
    }
  }

  // Check sentence length (should be max ~10 words)
  const sentences = questionText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/).length;
    if (words > 12) {
      result.issues.push(`Sentence too long (${words} words): "${sentence.trim().substring(0, 60)}..."`);
    }
  }

  // Flag high grade levels (Grade 3+ is too hard for KS1)
  if (result.grade > 3.5) {
    result.issues.push(`FK Grade ${result.grade.toFixed(1)} (too hard for KS1, target ≤3)`);
  }

  // Flag if banned words found
  if (result.bannedWordsFound.length > 0) {
    result.issues.push(`Uses ${result.bannedWordsFound.length} banned word(s): ${[...new Set(result.bannedWordsFound)].slice(0, 3).join(", ")}`);
  }

  // Flag if too many long words (>25% of content)
  const longWordRatio = result.longWords.length / wordArray.length;
  if (longWordRatio > 0.25) {
    result.issues.push(`${Math.round(longWordRatio * 100)}% long words (target <25%)`);
  }

  // Hard rejection: KS1 questions with ANY readability issue are rejected, not
  // just warned. D35 in validateQuestion() also catches banned words — this
  // function covers grade level, sentence length, and long-word ratio.
  if (result.bannedWordsFound.length > 0 ||
      result.grade > 3.5 ||
      result.issues.some(i => i.includes("Sentence too long")) ||
      result.longWords.length / Math.max(1, wordArray.length) > 0.3) {
    result.pass = false;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECIMAL NORMALISATION — ensures uniform precision across numeric options
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * If all options are numeric but have different decimal places, normalise
 * them to the maximum precision found. This prevents D31 flagging in the
 * audit and removes the formatting-as-hint problem.
 *
 * Returns the question with options (and correct answer) normalised, or the
 * original question unchanged if the options are not uniformly numeric.
 */
function normaliseDecimalOptions(question) {
  if (question.question_type !== 'mcq' || !Array.isArray(question.options)) return question;
  const numericRx = /^-?\d+(\.\d+)?$/;
  const allNumeric = question.options.every(o => numericRx.test(String(o).trim()));
  if (!allNumeric) return question;

  const decimalPlaces = question.options.map(o => {
    const s = String(o).trim();
    const dot = s.indexOf(".");
    return dot === -1 ? 0 : s.length - dot - 1;
  });
  const maxDp = Math.max(...decimalPlaces);
  if (new Set(decimalPlaces).size <= 1) return question; // already uniform

  const normalised = question.options.map(o => parseFloat(String(o).trim()).toFixed(maxDp));
  return { ...question, options: normalised };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANSWER DISTRIBUTION BALANCING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Redistributes correct_index across MCQ questions to prevent AI bias
 * (LLMs tend to cluster answers on index 0 or 2).
 * Also shuffles options to break consecutive-answer patterns.
 * Also normalises decimal precision in numeric option sets.
 */
function redistributeAnswers(questions) {
  // Pre-pass: normalise decimal options across the whole batch
  questions = questions.map(q => normaliseDecimalOptions(q));
  const mcqs = questions.filter(q => q.question_type === "mcq" && Array.isArray(q.options) && q.options.length === 4);
  if (mcqs.length < 4) return questions; // not enough to redistribute

  // Count current distribution
  const counts = [0, 0, 0, 0];
  mcqs.forEach(q => { if (typeof q.correct_index === "number") counts[q.correct_index]++; });
  const target = Math.ceil(mcqs.length / 4);

  // Find overrepresented indices and underrepresented ones
  const over = [];  // indices with too many correct answers
  const under = []; // indices that need more
  for (let i = 0; i < 4; i++) {
    if (counts[i] > target + 1) over.push(i);
    if (counts[i] < target - 1) under.push(i);
  }

  if (!over.length || !under.length) return questions; // already balanced enough

  // Redistribute: for questions with overrepresented correct_index, swap to underrepresented
  let redistributed = 0;
  for (const q of mcqs) {
    if (!over.includes(q.correct_index) || !under.length) continue;
    if (counts[q.correct_index] <= target) continue; // this index is now fine

    const newIdx = under[0];
    // Swap options: move current correct to newIdx position
    const correctOpt = q.options[q.correct_index];
    const targetOpt = q.options[newIdx];
    q.options[q.correct_index] = targetOpt;
    q.options[newIdx] = correctOpt;
    counts[q.correct_index]--;
    counts[newIdx]++;
    q.correct_index = newIdx;
    redistributed++;

    // If this under-index is now satisfied, remove it
    if (counts[newIdx] >= target) under.shift();
    // If over-index is now satisfied, remove it
    if (counts[q.correct_index] <= target) {
      const idx = over.indexOf(q.correct_index);
      if (idx >= 0) over.splice(idx, 1);
    }
  }

  if (redistributed > 0) {
    console.log(`    🔄 Redistributed ${redistributed} MCQ answers for even distribution [${counts.join(",")}]`);
  }

  // ─── Break consecutive-answer runs (no 3+ same index in a row) ──────
  let consecutiveFixes = 0;
  for (let i = 2; i < questions.length; i++) {
    const q = questions[i];
    if (q.question_type !== "mcq" || !Array.isArray(q.options) || q.options.length !== 4) continue;
    const prev1 = questions[i - 1];
    const prev2 = questions[i - 2];
    if (prev1?.question_type !== "mcq" || prev2?.question_type !== "mcq") continue;

    if (q.correct_index === prev1.correct_index && q.correct_index === prev2.correct_index) {
      // 3 in a row — swap this question's correct with an adjacent index
      const oldIdx = q.correct_index;
      const newIdx = (oldIdx + 1) % 4;
      const correctOpt = q.options[oldIdx];
      q.options[oldIdx] = q.options[newIdx];
      q.options[newIdx] = correctOpt;
      q.correct_index = newIdx;
      consecutiveFixes++;
    }
  }

  if (consecutiveFixes > 0) {
    console.log(`    🔀 Fixed ${consecutiveFixes} consecutive-answer runs`);
  }

  return questions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DB INSERTION
// ═══════════════════════════════════════════════════════════════════════════════

function toDbRow(q, curriculum, subject, year, batchId) {
  const ctx = getAgeBandContext(curriculum, year);
  const region = curriculum.startsWith("ng_") ? "NG"
    : curriculum.startsWith("uk_") ? "UK"
    : curriculum.startsWith("ca_") ? "CA"
    : curriculum.startsWith("aus_") ? "AU"
    : curriculum.startsWith("us_") ? "US"
    : curriculum.startsWith("ib_") ? "INT"
    : "UK";

  // Map difficulty_tier to numeric difficulty
  const diffMap = { foundation: 25, developing: 40, expected: 55, advanced: 75 };

  // Detect visual hint from options + question text (covers clock/fraction/money/shape from
  // options AND probability/venn/coordinates/number_line/bar chart/15+ text-pattern types)
  const visualHint = resolveVisualType(q.options, q.question_text || '');

  const row = {
    subject,
    year_level: year,
    curriculum,
    topic: (q.topic || "general").toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
    question_text: q.question_text,
    question_type: q.question_type || "mcq",
    options: q.options || null,
    correct_index: typeof q.correct_index === "number" ? q.correct_index : null,
    correct_indices: q.correct_indices || null,
    answer_text: q.answer_text || null,
    answer_aliases: q.answer_aliases || [],
    explanation: q.explanation,
    difficulty: diffMap[q.difficulty_tier] || 50,
    difficulty_tier: q.difficulty_tier || "expected",
    grade: year,
    region,
    hints: q.hints || [],
    source: "ai_v2",
    batch_id: batchId,
    times_used: 0,
    is_active: true,
    needs_visual: q.needs_visual || false,
    visual_prompt: q.visual_prompt || null,
    visual_status: q.needs_visual ? "pending" : "none",
    visual_hint: visualHint || null,
    answer_type: (q.question_type === "mcq" || q.question_type === "true_false" || q.question_type === "multi_select")
      ? "choice"
      : (q.question_type === "ordering" || q.question_type === "number_line" || q.question_type === "fraction_bar")
        ? "interactive"
        : "text",
    question_data: {
      q: q.question_text,
      opts: q.options || null,
      a: q.correct_index ?? null,
      exp: q.explanation,
      topic: q.topic,
      standard_code: q.standard_code || null, // NC standard this question tests
      // ─── ordering type fields ───────────────────────────────────────────
      ...(q.question_type === "ordering" ? {
        items:         q.items || null,
        correct_order: Array.isArray(q.correct_order) ? q.correct_order
                       : (Array.isArray(q.answer) ? q.answer : null),
      } : {}),
      // ─── number_line type fields ────────────────────────────────────────
      ...(q.question_type === "number_line" ? {
        number_line: q.number_line || null,
        // answer mirrors number_line.correct for QuizEngine compat
        answer: typeof q.number_line?.correct === "number" ? q.number_line.correct : (q.answer ?? null),
      } : {}),
      // ─── fraction_bar type fields ───────────────────────────────────────
      ...(q.question_type === "fraction_bar" ? {
        fraction: q.fraction || null,
        // answer is numerator for QuizEngine compat
        answer: typeof q.fraction?.numerator === "number" ? q.fraction.numerator : (q.answer ?? null),
      } : {}),
    },
    // Cross-curriculum tagging: auto-tag questions that are valid across curricula
    also_curricula: getAlsoCurricula(curriculum, subject, year),
    // 32-char SHA-256 prefix for UPSERT dedup across runs (cross-run guard, not just batch)
    content_hash: (() => {
      const normText   = (q.question_text || "").toLowerCase().replace(/\s+/g, " ").trim();
      const sortedOpts = Array.isArray(q.options) ? [...q.options].map(String).sort() : [];
      return crypto.createHash("sha256").update(JSON.stringify({ t: normText, o: sortedOpts })).digest("hex").slice(0, 32);
    })(),
    // Preserve standard_code at top level for post-insert mapping
    _standard_code: q.standard_code || null,
    // Misconceptions tagged by the AI (array of {label, description, common_trigger})
    // Stripped before DB insert; used by insertBatch for misconception_registry writes.
    _misconceptions: Array.isArray(q.misconceptions) ? q.misconceptions : [],
  };

  return row;
}

async function insertBatch(rows, dryRun) {
  if (dryRun) {
    console.log(`  📋 [DRY RUN] Would insert ${rows.length} questions`);
    return { inserted: rows.length, skipped: 0 };
  }

  // Separate out non-DB metadata fields before upsert
  const standardCodes     = rows.map(r => r._standard_code   || null);
  const misconceptionSets = rows.map(r => r._misconceptions  || []);
  const topicMeta         = rows.map(r => ({ topic: r.topic, subject: r.subject, curriculum: r.curriculum, year_level: r.year_level }));

  const cleanRows = rows.map(r => {
    const { _standard_code, _misconceptions, ...rest } = r;
    return rest;
  });

  // Upsert in chunks of 50; ignoreDuplicates skips rows that conflict on content_hash
  let inserted = 0;
  let skipped  = 0;
  const insertedQuestionIds = []; // track for standard mapping

  for (let i = 0; i < cleanRows.length; i += 50) {
    const chunk = cleanRows.slice(i, i + 50);
    const { data: insertedData, error } = await supabase
      .from("question_bank")
      .upsert(chunk, { onConflict: "content_hash", ignoreDuplicates: true })
      .select("id");

    if (error) {
      console.error(`  ❌ Upsert error (chunk ${i}–${i + chunk.length}):`, error.message);
      // Try one-by-one for this chunk
      for (let j = 0; j < chunk.length; j++) {
        const { data: singleData, error: e2 } = await supabase
          .from("question_bank")
          .upsert(chunk[j], { onConflict: "content_hash", ignoreDuplicates: true })
          .select("id");
        if (!e2 && singleData?.[0]) {
          inserted++;
          insertedQuestionIds.push({ id: singleData[0].id, stdCode: standardCodes[i + j] });
        } else if (!e2 && (!singleData || singleData.length === 0)) {
          skipped++; // content_hash conflict — already in DB
        } else {
          console.error(`    ❌ Single upsert fail:`, e2?.message?.slice(0, 100));
        }
      }
    } else {
      // insertedData contains only the rows actually written (skipped rows are absent)
      const actualInserted = insertedData ? insertedData.length : chunk.length;
      inserted += actualInserted;
      skipped  += chunk.length - actualInserted;
      if (insertedData) {
        insertedData.forEach((d, j) => {
          insertedQuestionIds.push({ id: d.id, stdCode: standardCodes[i + j] });
        });
      }
    }
  }

  // ─── Create question_standard_mapping entries ──────────────────────────
  // Maps each inserted question to its curriculum standard (if AI provided one)
  const mappings = [];
  for (const { id, stdCode } of insertedQuestionIds) {
    if (!stdCode || !id) continue;
    // Look up standard UUID by code
    const { data: stdRow } = await supabase
      .from("curriculum_standards")
      .select("id")
      .eq("standard_code", stdCode)
      .maybeSingle();

    if (stdRow?.id) {
      mappings.push({
        question_id: id,
        standard_id: stdRow.id,
        relevance: 1.0,
        is_primary: true,
        tagged_by: "ai_generator_v2",
      });
    }
  }

  if (mappings.length > 0) {
    const { error: mapErr } = await supabase
      .from("question_standard_mapping")
      .upsert(mappings, { onConflict: "question_id,standard_id" });
    if (mapErr) {
      console.warn(`    ⚠ Standard mapping insert error: ${mapErr.message}`);
    } else {
      console.log(`    📜 Mapped ${mappings.length}/${insertedQuestionIds.length} questions to curriculum standards`);
    }
  }

  // ─── Misconception registry + join writes ─────────────────────────────────
  // For each inserted question, upsert its AI-tagged misconceptions and create
  // question_misconceptions rows. Fail-open: errors are warnings only.
  try {
    const allMiscRows = [];   // { topic_slug, subject, year_band, label, description, common_trigger }
    const allJoinRows = [];   // { question_id, label } — resolved to IDs after upsert

    for (const { id, stdCode } of insertedQuestionIds) {
      const idx = insertedQuestionIds.indexOf(insertedQuestionIds.find(x => x.id === id));
      const misconceptions = misconceptionSets[idx] || [];
      const meta = topicMeta[idx] || {};

      // Derive year_band from year_level + curriculum
      const yearBand = (() => {
        const yr = meta.year_level;
        const cur = meta.curriculum || "";
        if (cur.startsWith("ng_jss")) return "jss";
        if (cur.startsWith("ng_sss")) return "sss";
        if (cur.startsWith("ng_primary")) return yr <= 3 ? "ks1" : "ks2";
        if (yr <= 2) return "ks1";
        if (yr <= 6) return "ks2";
        if (yr <= 9) return "ks3";
        return "ks4";
      })();

      for (const m of misconceptions) {
        if (!m.label) continue;
        allMiscRows.push({
          topic_slug:       meta.topic || "general",
          subject:          meta.subject || "unknown",
          year_band:        yearBand,
          label:            m.label.slice(0, 200),
          description:      m.description?.slice(0, 500) || null,
          common_trigger:   m.common_trigger?.slice(0, 300) || null,
          remediation_hint: m.remediation_hint?.slice(0, 300) || null,
          source:           "ai_generated",
        });
        allJoinRows.push({ questionId: id, label: m.label, topic_slug: meta.topic, subject: meta.subject, year_band: yearBand });
      }
    }

    if (allMiscRows.length > 0) {
      // Upsert misconceptions (ON CONFLICT DO NOTHING — label+topic+subject+year_band is unique)
      const { data: miscData, error: miscErr } = await supabase
        .from("misconceptions")
        .upsert(allMiscRows, { onConflict: "topic_slug,subject,year_band,label", ignoreDuplicates: true })
        .select("id, label, topic_slug, subject, year_band");

      if (miscErr) {
        console.warn(`    ⚠ Misconception upsert error: ${miscErr.message}`);
      } else if (miscData?.length > 0) {
        // Build label→id map
        const miscIdMap = {};
        for (const m of miscData) {
          const key = `${m.topic_slug}|${m.subject}|${m.year_band}|${m.label}`;
          miscIdMap[key] = m.id;
        }
        // Also fetch existing rows for conflicts that were ignored
        const labelSet = [...new Set(allMiscRows.map(m => m.label))];
        const { data: existingMisc } = await supabase
          .from("misconceptions")
          .select("id, label, topic_slug, subject, year_band")
          .in("label", labelSet);
        for (const m of (existingMisc || [])) {
          const key = `${m.topic_slug}|${m.subject}|${m.year_band}|${m.label}`;
          if (!miscIdMap[key]) miscIdMap[key] = m.id;
        }

        // Build join rows
        const joinRows = [];
        for (const { questionId, label, topic_slug, subject, year_band } of allJoinRows) {
          const key = `${topic_slug}|${subject}|${year_band}|${label}`;
          const misconceptionId = miscIdMap[key];
          if (misconceptionId && questionId) {
            joinRows.push({ question_id: questionId, misconception_id: misconceptionId, relevance: 1.0 });
          }
        }

        if (joinRows.length > 0) {
          const { error: joinErr } = await supabase
            .from("question_misconceptions")
            .upsert(joinRows, { onConflict: "question_id,misconception_id", ignoreDuplicates: true });
          if (joinErr) {
            console.warn(`    ⚠ Misconception join insert error: ${joinErr.message}`);
          } else {
            console.log(`    🧠 Tagged ${joinRows.length} misconception link(s)`);
          }
        }
      }
    }
  } catch (miscGenErr) {
    console.warn(`    ⚠ Misconception registry write failed (non-fatal): ${miscGenErr.message}`);
  }

  if (skipped > 0) console.log(`    ♻ ${skipped} duplicate(s) skipped (already in DB)`);
  return { inserted, skipped };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FETCH EXISTING TOPICS (to avoid generating off-curriculum questions)
// ═══════════════════════════════════════════════════════════════════════════════

async function getExistingTopics(curriculum, subject, year) {
  const { data } = await supabase
    .from("question_bank")
    .select("topic")
    .eq("curriculum", curriculum)
    .eq("subject", subject)
    .gte("year_level", Math.max(1, year - 1))
    .lte("year_level", year + 1)
    .not("topic", "is", null)
    .limit(500);

  if (!data) return [];
  const topics = [...new Set(data.map(r => r.topic).filter(Boolean))];
  return topics;
}

async function getExistingCount(curriculum, subject, year) {
  const { count } = await supabase
    .from("question_bank")
    .select("id", { count: "exact", head: true })
    .eq("curriculum", curriculum)
    .eq("subject", subject)
    .eq("year_level", year);
  return count || 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATION LOOP
// ═══════════════════════════════════════════════════════════════════════════════

const TARGET_PER_SUBJECT_YEAR = 500; // target questions per subject/year
const BATCH_SIZE = 15; // questions per AI call (sweet spot for quality)
const GAP_FILL_BATCH_SIZE = 8; // smaller batches for gap-fill (more focused)

async function generateForSubjectYear(curriculum, subject, year, dryRun, examFilter) {
  const existing = await getExistingCount(curriculum, subject, year);
  const needed = Math.max(0, TARGET_PER_SUBJECT_YEAR - existing);

  if (needed <= 0) {
    console.log(`  ✅ ${curriculum}/${subject}/Y${year} — ${existing} exist, target met`);
    return { generated: 0, inserted: 0, skipped: existing };
  }

  console.log(`  🎯 ${curriculum}/${subject}/Y${year} — ${existing} exist, generating ${needed} more`);

  // ─── Resolve per-year topics from examFocusAreas.js ────────────────────
  const yearTopics = getYearTopics(curriculum, subject, year);
  if (yearTopics?.length) {
    console.log(`    📚 Year topics: ${yearTopics.length} topics from curriculum map`);
  }

  // ─── Resolve exam focus priorities ─────────────────────────────────────
  let examFocusTopics = null;
  let examTips = null;
  const relevantExams = examFilter ? [examFilter] : getExamsForCurriculum(curriculum);
  for (const examKey of relevantExams) {
    const exam = EXAM_FOCUS[examKey];
    if (!exam) continue;
    // Check if this year is in the exam's target range
    const targetYears = exam.targetYears || [];
    // Map ng_sss years (1-3) to effective years (10-12) for comparison
    let effectiveYear = year;
    if (curriculum === "ng_sss") effectiveYear = year + 9; // SSS1=Y10, SSS2=Y11, SSS3=Y12
    if (curriculum === "ng_jss") effectiveYear = year + 6; // JSS1=Y7, JSS2=Y8, JSS3=Y9
    if (targetYears.includes(effectiveYear) || targetYears.includes(year)) {
      const focus = exam.subjects?.[subject];
      if (focus) {
        examFocusTopics = focus.highPriority;
        examTips = focus.examTips;
        console.log(`    🎓 Exam focus: ${exam.label} — ${examFocusTopics?.length || 0} priority topics`);
        break;
      }
    }
  }

  const existingTopics = await getExistingTopics(curriculum, subject, year);
  const assessmentTargets = getAssessmentTargets(curriculum, subject, year);
  if (assessmentTargets) {
    const totalTargets = Object.values(assessmentTargets).reduce((s, arr) => s + arr.length, 0);
    console.log(`    🎯 Assessment targets: ${totalTargets} "I can..." skills across ${Object.keys(assessmentTargets).length} strands`);
  }

  // ─── Fetch official curriculum standards from DB ──────────────────────
  const curriculumStandards = await fetchCurriculumStandards(curriculum, subject, year);
  if (curriculumStandards.length) {
    console.log(`    📜 Curriculum standards: ${curriculumStandards.length} NC statements loaded for Y${year} ${subject}`);
  }

  // ─── Coverage gap analysis: prioritize under-served standards ─────────
  const coverageGaps = await fetchCoverageGaps(curriculum, subject, year);
  if (coverageGaps.critical.length || coverageGaps.high.length) {
    console.log(
      `    📉 Coverage gaps: ${coverageGaps.critical.length} critical (0 Qs), ` +
      `${coverageGaps.high.length} high (<5 Qs) — AI will prioritize these`
    );
  }

  // ─── Concept card pre-fetch ────────────────────────────────────────────
  // Fetch concept cards for the active year topics so batches can be grounded
  // in teaching material. Cards are fetched once and reused across batches
  // for the same topic slug. If no card exists, prompt runs card-free.
  const yearBand = yearToYearBand(curriculum, year);
  const topicsForCards = yearTopics?.length ? yearTopics : existingTopics?.slice(0, 20) || [];
  const conceptCardMap = {};
  if (topicsForCards.length) {
    const cardFetches = topicsForCards.slice(0, 30).map(async (slug) => {
      const card = await fetchConceptCard(slug, curriculum, subject.toLowerCase(), yearBand);
      if (card) conceptCardMap[slug] = card;
    });
    await Promise.all(cardFetches);
    const cardCount = Object.keys(conceptCardMap).length;
    if (cardCount) {
      console.log(`    🎴 Concept cards: ${cardCount}/${topicsForCards.length} topics have cards — questions will be grounded`);
    } else {
      console.log(`    🎴 Concept cards: none found for this subject/year — run generateConceptCards.mjs first`);
    }
  }

  // Log cross-curriculum equivalence
  const equivalentCurricula = getEquivalentCurricula(curriculum, year);
  if (equivalentCurricula.length > 1) {
    console.log(`    🔗 Cross-curriculum: questions applicable to ${equivalentCurricula.join(", ")}`);
  }

  const batchId = `v2_${curriculum}_${subject}_y${year}_${Date.now()}`;
  let totalGenerated = 0;
  let totalInserted = 0;
  let totalRejected = 0;
  // Token cost tracking (#53)
  let runPromptTokens     = 0;
  let runCompletionTokens = 0;
  const runModels         = new Set();

  // ─── Batch planning ────────────────────────────────────────────────────
  // If exam focus exists, weight more batches toward exam-priority topics
  const batches = [];
  for (const tier of DIFFICULTY_TIERS) {
    const tierCount = Math.ceil(needed / DIFFICULTY_TIERS.length);
    const numBatches = Math.ceil(tierCount / BATCH_SIZE);
    for (let b = 0; b < numBatches; b++) {
      const size = Math.min(BATCH_SIZE, tierCount - b * BATCH_SIZE);
      if (size <= 0) break;
      batches.push({ tier, size });
    }
  }

  // Track seen question texts within this subject/year to catch cross-batch dupes
  const batchSeenTexts = new Set();
  // Track recent question texts to send as dedup context to AI
  const recentQuestionTexts = [];

  for (const { tier, size } of batches) {
    if (totalGenerated >= needed) break;

    const questionTypes = [];
    for (let i = 0; i < size; i++) questionTypes.push(pickQuestionTypeForContext(subject, ctx.band));
    const uniqueTypes = [...new Set(questionTypes)];

    // Pick the concept card for this batch: prioritise coverage-gap topics, then
    // exam-focus topics, then the first year topic, then fall back to null.
    const batchFocusTopic =
      coverageGaps?.critical?.[0]?.statement?.split(" ").slice(0, 3).join("_").toLowerCase() ||
      examFocusTopics?.[0] ||
      yearTopics?.[0] ||
      existingTopics?.[0] ||
      null;
    const conceptCard = batchFocusTopic
      ? (conceptCardMap[batchFocusTopic] ||
         // try underscore normalisation
         conceptCardMap[batchFocusTopic.replace(/\s+/g, "_")] ||
         null)
      : null;

    const prompt = buildPrompt({
      curriculum, subject, year,
      batchSize: size,
      questionTypes: uniqueTypes,
      difficultyTier: tier,
      existingTopics,
      yearTopics,
      examFocusTopics,
      examTips,
      recentQuestions: recentQuestionTexts.slice(-15),
      assessmentTargets,
      curriculumStandards,
      coverageGaps,
      conceptCard,
    });

    try {
      const { content, model, usage } = await callAI(prompt);
      if (usage) {
        runPromptTokens     += usage.prompt_tokens     || 0;
        runCompletionTokens += usage.completion_tokens || 0;
      }
      runModels.add(model);
      const questions = parseAIResponse(content);

      if (!questions.length) {
        console.warn(`    ⚠ Empty response from ${model} for ${tier}`);
        continue;
      }

      // Validate and filter
      const validQuestions = [];
      const ctx = getAgeBandContext(curriculum, year);
      for (const q of questions) {
        q.difficulty_tier = q.difficulty_tier || tier; // ensure tier is set
        const errors = validateQuestion(q, curriculum, subject, year, batchSeenTexts);
        if (errors.length) {
          totalRejected++;
          // Only log first few rejections
          if (totalRejected <= 5) console.warn(`    ⚠ Rejected: ${errors.join(", ")} — "${(q.question_text || "").slice(0, 60)}"`);
          continue;
        }

        // KS1 READABILITY CHECK (vocabulary + sentence length + syllable count)
        if (ctx.band === "ks1") {
          const readability = validateKS1Readability(q);
          if (readability.issues.length > 0) {
            // Log warning but don't reject — just flag for review
            console.warn(`    ⚠ KS1 readability: ${readability.issues.join("; ")} — "${(q.question_text || "").slice(0, 50)}"`);
          }
        }

        validQuestions.push(q);
        // Track for dedup context in future batches
        recentQuestionTexts.push(q.question_text.slice(0, 80));
      }

      // Redistribute MCQ answers for even distribution + break consecutive runs
      const balanced = redistributeAnswers(validQuestions);

      // Convert to DB rows
      const validRows = balanced.map(q => toDbRow(q, curriculum, subject, year, batchId));

      if (validRows.length) {
        const { inserted: ins, skipped: deduped } = await insertBatch(validRows, dryRun);
        totalInserted += ins;
        totalGenerated += validRows.length;
        const dedupNote = deduped > 0 ? ` (${deduped} deduped)` : "";
        console.log(`    ✓ ${tier}: ${validRows.length}/${questions.length} valid, ${ins} inserted${dedupNote} [${model}]`);
      }

      // Rate limiting — be gentle with free models
      await sleep(1500);
    } catch (err) {
      console.error(`    ❌ Batch error (${tier}):`, err.message);
    }
  }

  if (totalRejected > 5) console.warn(`    ⚠ Total rejected: ${totalRejected}`);

  // ─── Topic coverage report ─────────────────────────────────────────────
  if (yearTopics?.length && totalGenerated > 0) {
    const coveredTopics = new Set();
    batchSeenTexts.forEach(() => {}); // batchSeenTexts tracks questions, not topics
    console.log(`    📊 Generated ${totalGenerated} questions across ${yearTopics.length} target topics`);
  }

  return {
    generated: totalGenerated,
    inserted:  totalInserted,
    skipped:   existing,
    promptTokens:     runPromptTokens,
    completionTokens: runCompletionTokens,
    models:           [...runModels],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAP-FILL MODE — Generate questions targeting specific under-covered standards
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetches the work list for gap-fill mode from curriculum_coverage_stats.
 * Returns an array of { curriculum, subject, yearLevel, standards[] } objects,
 * grouped by curriculum/subject/year, sorted by severity (critical first).
 *
 * @param {Object} opts - Filter options
 * @param {string} [opts.curriculum] - Limit to specific curriculum
 * @param {string} [opts.subject] - Limit to specific subject
 * @param {number} [opts.year] - Limit to specific year
 * @param {string[]} [opts.severity] - Gap severities to target (default: critical, high)
 * @param {number} [opts.limit] - Max standards to process (default: 200)
 */
async function fetchGapFillWorkList(opts = {}) {
  const severities = opts.severity || ["critical", "high"];
  const limit = opts.limit || 200;

  let query = supabase
    .from("curriculum_coverage_stats")
    .select(`
      curriculum_id,
      subject,
      year_level,
      total_questions,
      gap_severity,
      standard:curriculum_standards!inner (
        id,
        standard_code,
        statement,
        bloom_level,
        strand:curriculum_strands!inner ( strand_name )
      )
    `)
    .in("gap_severity", severities)
    .order("total_questions", { ascending: true })
    .limit(limit);

  if (opts.curriculum) query = query.eq("curriculum_id", opts.curriculum);
  if (opts.subject) {
    const subMap = { maths: "mathematics", math: "mathematics", basic_science: "science" };
    query = query.eq("subject", subMap[opts.subject] || opts.subject);
  }
  if (opts.year) query = query.eq("year_level", opts.year);

  const { data, error } = await query;
  if (error) {
    console.error(`❌ Failed to fetch gap-fill work list: ${error.message}`);
    return [];
  }
  if (!data?.length) {
    console.log("✅ No coverage gaps found matching criteria — question bank is well-covered!");
    return [];
  }

  // Group by curriculum/subject/year
  const grouped = new Map();
  for (const row of data) {
    const key = `${row.curriculum_id}:${row.subject}:${row.year_level}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        curriculum: row.curriculum_id,
        subject: row.subject,
        yearLevel: row.year_level,
        standards: [],
      });
    }
    grouped.get(key).standards.push({
      id: row.standard?.id,
      code: row.standard?.standard_code,
      statement: row.standard?.statement,
      bloom: row.standard?.bloom_level,
      strand: row.standard?.strand?.strand_name,
      existingQuestions: row.total_questions,
      severity: row.gap_severity,
    });
  }

  // Sort each group's standards: critical first, then by existingQuestions ascending
  const workList = [...grouped.values()];
  for (const group of workList) {
    group.standards.sort((a, b) => {
      const sevOrder = { critical: 0, high: 1, medium: 2 };
      const diff = (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3);
      if (diff !== 0) return diff;
      return a.existingQuestions - b.existingQuestions;
    });
  }

  // Sort work groups: prioritise groups with the most critical gaps
  workList.sort((a, b) => {
    const aCritical = a.standards.filter(s => s.severity === "critical").length;
    const bCritical = b.standards.filter(s => s.severity === "critical").length;
    return bCritical - aCritical;
  });

  return workList;
}

/**
 * Builds a gap-fill prompt targeting specific standards.
 * Unlike buildPrompt() which covers the whole subject/year curriculum,
 * this focuses the AI laser-like on a small set of under-covered standards.
 */
function buildGapFillPrompt({ curriculum, subject, year, standards, batchSize, difficultyTier }) {
  const ctx = getAgeBandContext(curriculum, year);
  const curDef = CURRICULA[curriculum];
  const curLabel = curDef?.label || curriculum;

  const standardLines = standards.map(s =>
    `  [${s.code}] ${s.statement} (${s.strand || "General"})${s.bloom ? ` — Bloom: ${s.bloom}` : ""} — currently ${s.existingQuestions} questions`
  ).join("\n");

  const typeInstructions = {
    mcq: `"mcq": 4 options (A-D), one correct. Set correct_index (0-3).`,
    true_false: `"true_false": A statement that is either true or false. Options: ["True", "False"]. Set correct_index 0 or 1.`,
    fill_in_blank: `"fill_in_blank": Question MUST contain a blank shown as ___ (three underscores). Set answer_text to the word/phrase that fills the blank.`,
    multi_select: `"multi_select": 4-6 options, 2-3 correct. Set correct_indices as array.`,
    short_answer: `"short_answer": Open question requiring 1-3 sentence answer. Set answer_text to model answer.`,
  };
  const allTypes = Object.values(typeInstructions).join("\n");

  return `You are an expert educational content creator for ${curLabel}.
Your task is to FILL COVERAGE GAPS — generate exactly ${batchSize} high-quality questions specifically targeting these under-covered curriculum standards:

${standardLines}

Context:
- Subject: ${subject}
- Year/Grade: ${ctx.label} (ages ${ctx.ageRange}, ${ctx.band.toUpperCase()})
- Curriculum: ${curriculum}
- Difficulty tier: ${difficultyTier}

CRITICAL RULES:
1. EVERY question MUST directly test one of the listed standards — set "standard_code" to the matching code
2. Distribute questions evenly across the listed standards — don't cluster all questions on one standard
3. Questions MUST be age-appropriate for ${ctx.ageRange} year olds at ${ctx.band.toUpperCase()} level
4. ${ctx.band === "ks4" ? "Senior secondary level. Think: GCSE/WAEC difficulty. No primary-school trivia." : ctx.band === "ks3" ? "Junior secondary. Test analytical thinking, not just recall." : ctx.band === "ks2" ? "Upper primary. Multi-step thinking required." : "Early years (5-7). Simple, clear, familiar contexts."}
5. Every question MUST have a thorough explanation (minimum 3 sentences): explain WHY the correct answer is right, address why each wrong option is wrong
6. Distractors must be plausible common misconceptions
7. NEVER reference charts, tables, diagrams, or images unless you provide the data inline
8. Each question must be self-contained — answerable from the question text alone
9. NO duplicate questions — each must test a DIFFERENT aspect of the standard
10. CRITICAL for grammar questions: if asking "which word is a [word class]", ensure ONLY ONE option belongs to that word class. Never include two nouns, two verbs, or two adjectives among the options

QUESTION TYPES (mix across the batch):
${allTypes}

DIFFICULTY: "${difficultyTier}"
- foundation: Core knowledge, straightforward application
- developing: Requires understanding, some application
- expected: Grade-level competency, multi-step reasoning
- advanced: Challenging, synthesis, evaluation

Return ONLY a JSON array. Each object must have:
{
  "question_text": "...",
  "question_type": "mcq" | "true_false" | "fill_in_blank" | "multi_select" | "short_answer",
  "options": ["A", "B", "C", "D"],
  "correct_index": 0,
  "correct_indices": [0, 2],
  "answer_text": "...",
  "answer_aliases": ["alt1", "alt2"],
  "explanation": "...",
  "topic": "snake_case_topic",
  "difficulty_tier": "${difficultyTier}",
  "hints": ["hint1"],
  "needs_visual": false,
  "visual_prompt": null,
  "standard_code": "THE_STANDARD_CODE_THIS_TESTS"
}

Return ONLY the JSON array, no markdown fences, no commentary.`;
}

/**
 * Generates questions for a specific set of under-covered standards.
 * This is the gap-fill equivalent of generateForSubjectYear().
 */
async function generateForStandards(curriculum, subject, year, standards, dryRun) {
  const criticalCount = standards.filter(s => s.severity === "critical").length;
  const highCount = standards.filter(s => s.severity === "high").length;
  console.log(`  🎯 Gap-fill: ${curriculum}/${subject}/Y${year} — ${criticalCount} critical, ${highCount} high gaps across ${standards.length} standards`);

  // Calculate how many questions to generate:
  // - Critical (0 questions): generate 5 per standard
  // - High (<5 questions): generate 3 per standard
  // - Medium (5-9 questions): generate 2 per standard
  const questionsPerSeverity = { critical: 5, high: 3, medium: 2 };
  let totalNeeded = 0;
  for (const s of standards) {
    totalNeeded += questionsPerSeverity[s.severity] || 2;
  }
  totalNeeded = Math.min(totalNeeded, 60); // cap per group to avoid runaway

  console.log(`    📊 Targeting ${totalNeeded} questions across ${standards.length} standards`);

  const batchId = `gapfill_${curriculum}_${subject}_y${year}_${Date.now()}`;
  let totalGenerated = 0;
  let totalInserted = 0;
  let totalRejected = 0;
  // Token cost tracking (#53)
  let runPromptTokens     = 0;
  let runCompletionTokens = 0;
  const runModels         = new Set();

  // Process in batches of GAP_FILL_BATCH_SIZE
  const tiers = ["foundation", "developing", "expected", "advanced"];
  const batchSeenTexts = new Set();
  let tierIdx = 0;

  // Chunk standards into groups of 4-6 per prompt (so AI can focus)
  const standardChunks = [];
  for (let i = 0; i < standards.length; i += 5) {
    standardChunks.push(standards.slice(i, i + 5));
  }

  for (const chunk of standardChunks) {
    if (totalGenerated >= totalNeeded) break;

    const chunkNeeded = chunk.reduce((sum, s) => sum + (questionsPerSeverity[s.severity] || 2), 0);
    const batchSize = Math.min(chunkNeeded, GAP_FILL_BATCH_SIZE);
    const tier = tiers[tierIdx % tiers.length];
    tierIdx++;

    const prompt = buildGapFillPrompt({
      curriculum, subject, year,
      standards: chunk,
      batchSize,
      difficultyTier: tier,
    });

    try {
      const { content, model, usage } = await callAI(prompt);
      if (usage) {
        runPromptTokens     += usage.prompt_tokens     || 0;
        runCompletionTokens += usage.completion_tokens || 0;
      }
      runModels.add(model);
      const questions = parseAIResponse(content);

      if (!questions.length) {
        console.warn(`    ⚠ Empty response from ${model} for gap-fill batch`);
        continue;
      }

      const validQuestions = [];
      for (const q of questions) {
        q.difficulty_tier = q.difficulty_tier || tier;
        const errors = validateQuestion(q, curriculum, subject, year, batchSeenTexts);
        if (errors.length) {
          totalRejected++;
          if (totalRejected <= 3) console.warn(`    ⚠ Rejected: ${errors.join(", ")} — "${(q.question_text || "").slice(0, 60)}"`);
          continue;
        }
        validQuestions.push(q);
      }

      const balanced = redistributeAnswers(validQuestions);
      const validRows = balanced.map(q => toDbRow(q, curriculum, subject, year, batchId));

      if (validRows.length) {
        const { inserted: ins, skipped: deduped } = await insertBatch(validRows, dryRun);
        totalInserted += ins;
        totalGenerated += validRows.length;

        // Log which standards got questions
        const stdCodes = balanced.map(q => q.standard_code).filter(Boolean);
        const uniqueStds = [...new Set(stdCodes)];
        const dedupNote = deduped > 0 ? ` (${deduped} deduped)` : "";
        console.log(`    ✓ ${tier}: ${validRows.length}/${questions.length} valid, ${ins} inserted${dedupNote} [${model}] → standards: ${uniqueStds.join(", ") || "untagged"}`);
      }

      await sleep(1500);
    } catch (err) {
      console.error(`    ❌ Gap-fill batch error:`, err.message);
    }
  }

  if (totalRejected > 3) console.warn(`    ⚠ Total rejected: ${totalRejected}`);
  return {
    generated: totalGenerated,
    inserted:  totalInserted,
    standards: standards.length,
    promptTokens:     runPromptTokens,
    completionTokens: runCompletionTokens,
    models:           [...runModels],
  };
}

/**
 * Refreshes curriculum_coverage_stats for standards that were just filled.
 * Call after gap-fill to update the stats so subsequent runs see the new counts.
 */
async function refreshCoverageStats(curriculumFilter, subjectFilter) {
  console.log("\n🔄 Refreshing curriculum_coverage_stats...");

  // Build the subject alias map for matching
  const subMap = { maths: "mathematics", math: "mathematics", basic_science: "science" };
  const dbSubject = subjectFilter ? (subMap[subjectFilter] || subjectFilter) : null;

  // For each standard, recount questions from question_standard_mapping
  let query = supabase
    .from("curriculum_coverage_stats")
    .select("id, standard_id, curriculum_id, subject, year_level");

  if (curriculumFilter) query = query.eq("curriculum_id", curriculumFilter);
  if (dbSubject) query = query.eq("subject", dbSubject);

  const { data: statsRows, error } = await query.limit(3000);
  if (error || !statsRows?.length) {
    console.warn(`  ⚠ Could not fetch coverage stats to refresh: ${error?.message || "no rows"}`);
    return;
  }

  let updated = 0;
  // Process in batches of 50
  for (let i = 0; i < statsRows.length; i += 50) {
    const batch = statsRows.slice(i, i + 50);
    const standardIds = batch.map(r => r.standard_id);

    // Count questions per standard
    const { data: counts, error: cErr } = await supabase
      .from("question_standard_mapping")
      .select("standard_id")
      .in("standard_id", standardIds);

    if (cErr) continue;

    // Tally
    const countMap = {};
    for (const c of (counts || [])) {
      countMap[c.standard_id] = (countMap[c.standard_id] || 0) + 1;
    }

    // Update each stat row
    for (const row of batch) {
      const newCount = countMap[row.standard_id] || 0;
      const newSeverity = newCount === 0 ? "critical"
        : newCount < 5 ? "high"
        : newCount < 10 ? "medium"
        : newCount < 20 ? "low"
        : "covered";

      const { error: uErr } = await supabase
        .from("curriculum_coverage_stats")
        .update({ total_questions: newCount, gap_severity: newSeverity })
        .eq("id", row.id);

      if (!uErr) updated++;
    }
  }

  console.log(`  ✅ Refreshed ${updated}/${statsRows.length} coverage stats`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    curriculum: null, subject: null, year: null, exam: null,
    all: false, dryRun: false, target: TARGET_PER_SUBJECT_YEAR,
    gapFill: false, severity: null, gapLimit: 200, refreshCoverage: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--curriculum": opts.curriculum = args[++i]; break;
      case "--subject":    opts.subject = args[++i]; break;
      case "--year":       opts.year = parseInt(args[++i], 10); break;
      case "--exam":       opts.exam = args[++i]; break;
      case "--all":        opts.all = true; break;
      case "--dry-run":    opts.dryRun = true; break;
      case "--target":     opts.target = parseInt(args[++i], 10); break;
      case "--gap-fill":   opts.gapFill = true; break;
      case "--severity":   opts.severity = args[++i]?.split(","); break;
      case "--gap-limit":  opts.gapLimit = parseInt(args[++i], 10); break;
      case "--refresh-coverage": opts.refreshCoverage = true; break;
      case "--help":
        console.log(`
LaunchPard Question Generator v2

Usage:
  node scripts/generateQuestionsV2.mjs [options]

Options:
  --curriculum <name>   Generate for specific curriculum (e.g., ng_sss)
  --subject <name>      Generate for specific subject (e.g., mathematics)
  --year <num>          Generate for specific year level
  --exam <key>          Focus on specific exam (waec_ssce, neco, uk_gcse, uk_11plus, uk_sats, ng_common_entrance, ca_assessments)
  --all                 Generate for ALL curricula (when used with --curriculum, all subjects/years)
  --target <num>        Target questions per subject/year (default: ${TARGET_PER_SUBJECT_YEAR})
  --dry-run             Preview what would be generated without inserting
  --gap-fill            GAP-FILL MODE: generate questions targeting under-covered standards
  --severity <levels>   Comma-separated gap severities to target (default: critical,high)
  --gap-limit <num>     Max standards to process in gap-fill mode (default: 200)
  --refresh-coverage    Refresh curriculum_coverage_stats after generation
  --help                Show this help

Standard generation:
  node scripts/generateQuestionsV2.mjs --curriculum ng_sss --subject mathematics --year 2
  node scripts/generateQuestionsV2.mjs --exam waec_ssce --all
  node scripts/generateQuestionsV2.mjs --all

Gap-fill mode (targeted standard coverage):
  node scripts/generateQuestionsV2.mjs --gap-fill                              # all critical+high gaps
  node scripts/generateQuestionsV2.mjs --gap-fill --curriculum uk_national     # UK gaps only
  node scripts/generateQuestionsV2.mjs --gap-fill --severity critical          # only 0-question standards
  node scripts/generateQuestionsV2.mjs --gap-fill --severity critical,high,medium --gap-limit 500
  node scripts/generateQuestionsV2.mjs --gap-fill --curriculum ng_jss --subject mathematics --refresh-coverage

Available exams: ${Object.keys(EXAM_FOCUS).join(", ")}
        `);
        process.exit(0);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs();

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  LAUNCHPARD QUESTION GENERATOR v2");
  console.log("═══════════════════════════════════════════════════════════");
  if (opts.dryRun) console.log("  🔍 DRY RUN MODE — no database writes");
  if (opts.gapFill) console.log("  🔬 GAP-FILL MODE — targeting under-covered standards");
  if (opts.exam) console.log(`  🎓 EXAM FOCUS: ${opts.exam}`);
  if (opts.refreshCoverage) console.log("  🔄 Will refresh coverage stats after generation");
  console.log();

  if (!OPENROUTER_KEY) {
    console.error("❌ OPENROUTER_API_KEY not set in .env.local");
    process.exit(1);
  }

  const startTime = Date.now();
  // Stable run identifier for generation_runs table (#53)
  const runId = `v2_${new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)}_${Math.random().toString(36).slice(2, 6)}`;

  // ═══════════════════════════════════════════════════════════════════════
  // GAP-FILL MODE
  // ═══════════════════════════════════════════════════════════════════════
  if (opts.gapFill) {
    const gapWorkList = await fetchGapFillWorkList({
      curriculum: opts.curriculum,
      subject: opts.subject,
      year: opts.year,
      severity: opts.severity,
      limit: opts.gapLimit,
    });

    if (!gapWorkList.length) {
      console.log("No gaps to fill. Exiting.");
      process.exit(0);
    }

    const totalStandards = gapWorkList.reduce((s, g) => s + g.standards.length, 0);
    const criticalTotal = gapWorkList.reduce((s, g) => s + g.standards.filter(st => st.severity === "critical").length, 0);
    const highTotal = gapWorkList.reduce((s, g) => s + g.standards.filter(st => st.severity === "high").length, 0);

    console.log(`📋 Gap-fill work list: ${gapWorkList.length} groups, ${totalStandards} standards`);
    console.log(`   ${criticalTotal} critical (0 Qs) + ${highTotal} high (<5 Qs)`);
    console.log();

    const stats = {
      total: 0, inserted: 0, standards: 0, errors: 0,
      promptTokens: 0, completionTokens: 0, modelsUsed: new Set(),
    };

    for (let i = 0; i < gapWorkList.length; i++) {
      const group = gapWorkList[i];
      console.log(`[${i + 1}/${gapWorkList.length}] ${group.curriculum} > ${group.subject} > Y${group.yearLevel} (${group.standards.length} standards)`);

      try {
        const result = await generateForStandards(
          group.curriculum, group.subject, group.yearLevel,
          group.standards, opts.dryRun
        );
        stats.total     += result.generated;
        stats.inserted  += result.inserted;
        stats.standards += result.standards;
        stats.promptTokens     += result.promptTokens     || 0;
        stats.completionTokens += result.completionTokens || 0;
        (result.models || []).forEach(m => stats.modelsUsed.add(m));
      } catch (err) {
        console.error(`  ❌ Fatal error:`, err.message);
        stats.errors++;
      }
    }

    // Optionally refresh coverage stats
    if (opts.refreshCoverage && !opts.dryRun) {
      await refreshCoverageStats(opts.curriculum, opts.subject);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalTokens = stats.promptTokens + stats.completionTokens;
    const estCost = ((stats.promptTokens * 0.15 + stats.completionTokens * 0.60) / 1_000_000).toFixed(6);
    console.log();
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  GAP-FILL COMPLETE");
    console.log(`  Standards targeted: ${stats.standards} | Generated: ${stats.total} | Inserted: ${stats.inserted} | Errors: ${stats.errors}`);
    console.log(`  Tokens: ${totalTokens.toLocaleString()} (prompt ${stats.promptTokens.toLocaleString()} + completion ${stats.completionTokens.toLocaleString()}) | Est. cost: $${estCost}`);
    console.log(`  Time: ${elapsed}s`);
    console.log("═══════════════════════════════════════════════════════════");

    // ─── Write generation_runs audit record ───────────────────────────────
    if (!opts.dryRun) {
      const { error: runErr } = await supabase.from("generation_runs").insert({
        run_id:               runId,
        started_at:           new Date(startTime).toISOString(),
        finished_at:          new Date().toISOString(),
        duration_seconds:     parseFloat(elapsed),
        mode:                 "gap-fill",
        dry_run:              false,
        curriculum:           opts.curriculum || null,
        subject:              opts.subject    || null,
        year_level:           opts.year       || null,
        questions_generated:  stats.total,
        questions_inserted:   stats.inserted,
        errors:               stats.errors,
        prompt_tokens:        stats.promptTokens,
        completion_tokens:    stats.completionTokens,
        total_tokens:         totalTokens,
        estimated_cost_usd:   parseFloat(estCost),
        models_used:          [...stats.modelsUsed],
        cli_args:             process.argv.slice(2),
      });
      if (runErr) console.warn(`  ⚠ Could not write generation_runs record: ${runErr.message}`);
      else        console.log(`  📋 Run logged: ${runId}`);
    }

    return;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STANDARD GENERATION MODE (existing behaviour)
  // ═══════════════════════════════════════════════════════════════════════

  // Override target if set
  if (opts.target !== TARGET_PER_SUBJECT_YEAR) {
    console.log(`  🎯 Custom target: ${opts.target} questions per subject/year`);
  }

  // Build work list
  const workList = [];

  if (opts.exam) {
    // ─── EXAM-DRIVEN GENERATION ────────────────────────────────────────
    const examDef = EXAM_FOCUS[opts.exam];
    if (!examDef) {
      console.error(`❌ Unknown exam: ${opts.exam}`);
      console.error(`   Available: ${Object.keys(EXAM_FOCUS).join(", ")}`);
      process.exit(1);
    }

    const examCurriculum = examDef.curriculum || (
      opts.exam.startsWith("uk_") ? (opts.exam === "uk_11plus" ? "uk_11plus" : "uk_national")
      : opts.exam.startsWith("ng_") ? "ng_primary"
      : opts.exam.startsWith("ca_") ? "ca_primary"
      : opts.curriculum || "uk_national"
    );

    const targetYears = examDef.targetYears || [];
    const examSubjects = Object.keys(examDef.subjects);

    const subjects = opts.subject
      ? examSubjects.filter(s => s === opts.subject)
      : examSubjects;

    const years = opts.year
      ? targetYears.filter(y => y === opts.year)
      : targetYears;

    for (const subj of subjects) {
      for (const yr of years) {
        let curYear = yr;
        if (examCurriculum === "ng_sss" && yr >= 10) curYear = yr - 9;
        if (examCurriculum === "ng_jss" && yr >= 7) curYear = yr - 6;
        workList.push({ curriculum: examCurriculum, subject: subj, year: curYear });
      }
    }

    if (!workList.length) {
      console.error(`❌ No matching subject/year for exam ${opts.exam}${opts.subject ? ` subject=${opts.subject}` : ""}${opts.year ? ` year=${opts.year}` : ""}`);
      console.error(`   Exam subjects: ${examSubjects.join(", ")}`);
      console.error(`   Exam years: ${targetYears.join(", ")}`);
      process.exit(1);
    }
  } else if (opts.all && !opts.curriculum) {
    for (const [cur, def] of Object.entries(CURRICULA)) {
      for (const [subj] of Object.entries(def.subjects)) {
        for (const yr of def.years) {
          workList.push({ curriculum: cur, subject: subj, year: yr });
        }
      }
    }
  } else if (opts.curriculum) {
    const curDef = CURRICULA[opts.curriculum];
    if (!curDef) {
      console.error(`❌ Unknown curriculum: ${opts.curriculum}`);
      console.error(`   Available: ${Object.keys(CURRICULA).join(", ")}`);
      process.exit(1);
    }

    if (opts.subject && opts.year) {
      workList.push({ curriculum: opts.curriculum, subject: opts.subject, year: opts.year });
    } else if (opts.subject) {
      for (const yr of curDef.years) {
        workList.push({ curriculum: opts.curriculum, subject: opts.subject, year: yr });
      }
    } else if (opts.year) {
      for (const [subj] of Object.entries(curDef.subjects)) {
        workList.push({ curriculum: opts.curriculum, subject: subj, year: opts.year });
      }
    } else {
      for (const [subj] of Object.entries(curDef.subjects)) {
        for (const yr of curDef.years) {
          workList.push({ curriculum: opts.curriculum, subject: subj, year: yr });
        }
      }
    }
  } else if (opts.refreshCoverage) {
    // Just refresh coverage stats without generating
    await refreshCoverageStats(opts.curriculum, opts.subject);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  Time: ${elapsed}s`);
    return;
  } else {
    console.error("❌ Specify --curriculum <name>, --exam <key>, --gap-fill, or --all");
    process.exit(1);
  }

  console.log(`📋 Work list: ${workList.length} subject/year combinations`);
  console.log();

  const stats = {
    total: 0, inserted: 0, skipped: 0, errors: 0,
    promptTokens: 0, completionTokens: 0, modelsUsed: new Set(),
  };

  for (let i = 0; i < workList.length; i++) {
    const { curriculum, subject, year } = workList[i];
    console.log(`[${i + 1}/${workList.length}] ${curriculum} > ${subject} > Y${year}`);

    try {
      const result = await generateForSubjectYear(curriculum, subject, year, opts.dryRun, opts.exam);
      stats.total   += result.generated;
      stats.inserted += result.inserted;
      stats.skipped  += result.skipped;
      stats.promptTokens     += result.promptTokens     || 0;
      stats.completionTokens += result.completionTokens || 0;
      (result.models || []).forEach(m => stats.modelsUsed.add(m));
    } catch (err) {
      console.error(`  ❌ Fatal error:`, err.message);
      stats.errors++;
    }
  }

  // Optionally refresh coverage stats
  if (opts.refreshCoverage && !opts.dryRun) {
    await refreshCoverageStats(opts.curriculum, opts.subject);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalTokens = stats.promptTokens + stats.completionTokens;
  const estCost = ((stats.promptTokens * 0.15 + stats.completionTokens * 0.60) / 1_000_000).toFixed(6);
  console.log();
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  COMPLETE");
  console.log(`  Generated: ${stats.total} | Inserted: ${stats.inserted} | Already existed: ${stats.skipped} | Errors: ${stats.errors}`);
  console.log(`  Tokens: ${totalTokens.toLocaleString()} (prompt ${stats.promptTokens.toLocaleString()} + completion ${stats.completionTokens.toLocaleString()}) | Est. cost: $${estCost}`);
  console.log(`  Time: ${elapsed}s`);
  console.log("═══════════════════════════════════════════════════════════");

  // ─── Write generation_runs audit record ─────────────────────────────────
  if (!opts.dryRun) {
    const { error: runErr } = await supabase.from("generation_runs").insert({
      run_id:               runId,
      started_at:           new Date(startTime).toISOString(),
      finished_at:          new Date().toISOString(),
      duration_seconds:     parseFloat(elapsed),
      mode:                 opts.exam ? "exam" : "standard",
      dry_run:              false,
      curriculum:           opts.curriculum || null,
      subject:              opts.subject    || null,
      year_level:           opts.year       || null,
      exam_filter:          opts.exam       || null,
      questions_generated:  stats.total,
      questions_inserted:   stats.inserted,
      questions_skipped:    stats.skipped,
      errors:               stats.errors,
      prompt_tokens:        stats.promptTokens,
      completion_tokens:    stats.completionTokens,
      total_tokens:         totalTokens,
      estimated_cost_usd:   parseFloat(estCost),
      models_used:          [...stats.modelsUsed],
      cli_args:             process.argv.slice(2),
    });
    if (runErr) console.warn(`  ⚠ Could not write generation_runs record: ${runErr.message}`);
    else        console.log(`  📋 Run logged: ${runId}`);
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
