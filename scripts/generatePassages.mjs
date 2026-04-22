#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// LAUNCHPARD — AI READING PASSAGE + COMPREHENSION QUESTION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════
// Generates age-appropriate reading passages with 5-6 linked MCQ comprehension
// questions per passage. Inserts into `passages` table and `question_bank` with
// passage_id FK set for proper grouping.
//
// Usage:
//   node scripts/generatePassages.mjs --curriculum uk_national --subject english --year 5
//   node scripts/generatePassages.mjs --curriculum uk_national --subject english --all
//   node scripts/generatePassages.mjs --curriculum ng_jss --all
//   node scripts/generatePassages.mjs --all                          # everything
//   node scripts/generatePassages.mjs --dry-run --curriculum uk_national --subject english --year 5
//   node scripts/generatePassages.mjs --count 10 --curriculum uk_national --subject english --year 7
//
// Env vars needed (in .env.local):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  throw new Error("Missing Supabase env vars — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── OpenRouter ──────────────────────────────────────────────────────────────
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// ─── Model pool (same as generateQuestionsV2) ───────────────────────────────
const PRIMARY_MODELS = [
  "openai/gpt-4o-mini",
  "google/gemini-2.0-flash-lite-001",
  "deepseek/deepseek-v3.2",
  "google/gemini-2.5-flash-lite-preview-09-2025",
  "qwen/qwen3-30b-a3b-instruct-2507",
  "meta-llama/llama-3.3-70b-instruct",
];

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

const MODELS = [...PRIMARY_MODELS, ...FALLBACK_MODELS];
let roundRobinIdx = 0;

// ─── Circuit breaker ────────────────────────────────────────────────────────
let consecutiveNetworkFailures = 0;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const CIRCUIT_BREAKER_COOLDOWN = 30000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════════
// TARGET DEFINITIONS — which curriculum/subject/year combos need passages
// ═══════════════════════════════════════════════════════════════════════════════

const TARGETS = {
  uk_national: {
    label: "UK National Curriculum",
    subjects: {
      english:    { years: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
      science:    { years: [5, 6, 7, 8, 9] },
      history:    { years: [5, 6, 7, 8, 9] },
      geography:  { years: [5, 6, 7, 8, 9] },
      literature: { years: [7, 8, 9, 10, 11] },
    },
  },
  uk_11plus: {
    label: "UK 11+",
    subjects: {
      english:          { years: [4, 5, 6] },
      verbal_reasoning: { years: [4, 5, 6] },
    },
  },
  ng_primary: {
    label: "Nigerian Primary",
    subjects: {
      english:        { years: [3, 4, 5, 6] },
      social_studies: { years: [3, 4, 5, 6] },
      basic_science:  { years: [4, 5, 6] },
    },
  },
  ng_jss: {
    label: "Nigerian JSS",
    subjects: {
      english:          { years: [7, 8, 9] },
      literature:       { years: [7, 8, 9] },
      social_studies:   { years: [7, 8, 9] },
      civic_education:  { years: [7, 8, 9] },
      history:          { years: [7, 8, 9] },
    },
  },
  ng_sss: {
    label: "Nigerian SSS",
    subjects: {
      english:    { years: [10, 11, 12] },
      literature: { years: [10, 11, 12] },
      commerce:   { years: [10, 11, 12] },
      economics:  { years: [10, 11, 12] },
      history:    { years: [10, 11, 12] },
      geography:  { years: [10, 11, 12] },
    },
  },
};

// ─── Passage topics by subject (guides AI on what kind of text to write) ────
const PASSAGE_GENRES = {
  english: [
    "narrative fiction", "diary entry", "letter writing", "persuasive text",
    "newspaper report", "informational text", "descriptive writing",
    "poetry", "autobiography excerpt", "travel writing", "folk tale",
    "myth or legend", "adventure story", "mystery story",
  ],
  literature: [
    "novel extract", "short story", "poem", "play extract",
    "biographical sketch of an author", "literary criticism passage",
    "classic fiction excerpt", "modern prose", "dramatic monologue",
  ],
  verbal_reasoning: [
    "informational text", "persuasive argument", "descriptive passage",
    "short story extract", "scientific explanation", "historical account",
  ],
  science: [
    "scientific article", "experiment report", "nature observation",
    "technology news", "biography of a scientist", "environmental report",
  ],
  history: [
    "primary source extract", "historical account", "diary of a historical figure",
    "newspaper from the past", "biography excerpt", "timeline narrative",
  ],
  geography: [
    "travel report", "environmental study", "climate article",
    "country profile", "natural disaster report", "urbanisation article",
  ],
  social_studies: [
    "community report", "cultural profile", "government explainer",
    "economic news article", "civic participation article",
  ],
  civic_education: [
    "constitution excerpt", "civic duties explainer", "human rights article",
    "community governance report", "election process description",
  ],
  commerce: [
    "business case study", "market report", "trade article",
    "entrepreneurship profile", "banking explainer",
  ],
  economics: [
    "economic policy article", "market analysis", "inflation explainer",
    "trade balance report", "development economics case study",
  ],
  basic_science: [
    "scientific discovery article", "nature observation", "experiment write-up",
    "health and hygiene article", "environmental awareness text",
  ],
};

// ─── Question skill categories for comprehension ────────────────────────────
const QUESTION_SKILLS = [
  "literal_comprehension",   // What does the text say?
  "inference",               // What can we infer?
  "vocabulary_in_context",   // What does this word mean here?
  "authors_purpose",         // Why did the author write this?
  "structure_and_language",  // How is the text organised / what techniques?
  "summary_and_main_idea",   // What is the main point?
];

// ─── Word count targets by year level ───────────────────────────────────────
function getWordCountRange(year) {
  if (year <= 3) return { min: 120, max: 180 };
  if (year <= 5) return { min: 150, max: 220 };
  if (year <= 7) return { min: 180, max: 280 };
  if (year <= 9) return { min: 220, max: 350 };
  return { min: 280, max: 420 };
}

// ─── Difficulty tiers by year ───────────────────────────────────────────────
function getDifficultyTiers(year) {
  if (year <= 4) return ["emerging", "developing"];
  if (year <= 6) return ["developing", "secure"];
  if (year <= 8) return ["developing", "secure", "mastering"];
  return ["secure", "mastering", "greater_depth"];
}

// ─── How many passages to generate per curriculum/subject/year ───────────────
const DEFAULT_PASSAGES_PER_SLOT = 5;

// ═══════════════════════════════════════════════════════════════════════════════
// AI CALL — same pattern as generateQuestionsV2
// ═══════════════════════════════════════════════════════════════════════════════

async function callAI(prompt, modelIdx = -1, attempt = 0, triedCount = 0) {
  if (modelIdx === -1) {
    modelIdx = roundRobinIdx % PRIMARY_MODELS.length;
    roundRobinIdx++;
  }

  if (triedCount >= MODELS.length) {
    throw new Error("All models exhausted");
  }

  if (consecutiveNetworkFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    console.warn(`  🔌 Circuit breaker tripped (${consecutiveNetworkFailures} failures). Cooling down ${CIRCUIT_BREAKER_COOLDOWN / 1000}s...`);
    await sleep(CIRCUIT_BREAKER_COOLDOWN);
    consecutiveNetworkFailures = 0;
  }

  const effectiveIdx = modelIdx % MODELS.length;
  const modelId = MODELS[effectiveIdx];

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": "https://launchpard.com",
        "X-Title": "LaunchPard Passage Generator",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.85,
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

    consecutiveNetworkFailures = 0;

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || "";
    return { content, model: modelId };
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
// PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildPrompt(curriculum, subject, year, genre, existingTitles) {
  const wordRange = getWordCountRange(year);
  const tiers = getDifficultyTiers(year);
  const questionsCount = 6;

  const curriculumLabel = TARGETS[curriculum]?.label || curriculum;
  const ageGuide = year <= 6 ? `${year + 4}-${year + 5} years old` : `${year + 4}-${year + 5} years old`;

  const avoidList = existingTitles.length > 0
    ? `\n\nDo NOT reuse these titles or very similar topics:\n${existingTitles.slice(-20).map(t => `- "${t}"`).join("\n")}`
    : "";

  return `You are an expert reading comprehension author for the ${curriculumLabel} (Year ${year}, approximately ${ageGuide}).

Generate ONE original reading passage and ${questionsCount} multiple-choice comprehension questions about it.

PASSAGE REQUIREMENTS:
- Genre/type: ${genre}
- Length: ${wordRange.min}-${wordRange.max} words (STRICT — count carefully)
- Age-appropriate vocabulary and sentence complexity for Year ${year}
- Engaging and interesting for the target age group
- Must be an ORIGINAL text (not copied from any source)
- Include a clear title
- If the subject is "${subject}", ensure the passage content is relevant to that subject area
- Use paragraphs (at least 2-3)
${curriculum.startsWith("ng_") ? "- Use Nigerian English spelling and cultural context where appropriate" : "- Use British English spelling"}

QUESTION REQUIREMENTS:
- Exactly ${questionsCount} MCQ questions
- Each question must have exactly 4 options (A, B, C, D)
- Questions must cover these skills (one each, in order):
  1. Literal comprehension (answer stated directly in the text)
  2. Inference (reading between the lines)
  3. Vocabulary in context (meaning of a word/phrase as used in the passage)
  4. Author's purpose or intention
  5. Structure and language techniques
  6. Summary / main idea
- Difficulty tiers to use: ${tiers.join(", ")} (distribute across questions)
- correct_index: 0-3 (index of correct option). Distribute roughly evenly — do NOT make all answers the same index
- Explanations must be 20-40 words, referencing the passage
- Distractors must be plausible but clearly wrong when the passage is re-read

${avoidList}

Respond with ONLY a JSON object in this exact format:
{
  "title": "Passage Title Here",
  "body": "Full passage text here with paragraphs separated by \\n\\n",
  "topic": "comprehension",
  "questions": [
    {
      "question_text": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 2,
      "explanation": "Explanation referencing the passage...",
      "skill": "literal_comprehension",
      "difficulty_tier": "developing"
    }
  ]
}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSE + VALIDATE
// ═══════════════════════════════════════════════════════════════════════════════

function parseResponse(content) {
  if (!content || typeof content !== "string") return null;

  let text = content.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) text = fencedMatch[1].trim();

  // Fix trailing commas
  text = text.replace(/,\s*([}\]])/g, "$1");

  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch (e1) {
    // Try extracting object
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0].replace(/,\s*([}\]])/g, "$1"));
      } catch (e2) { /* fall through */ }
    }
    console.warn(`  ⚠ JSON parse failed: ${e1.message}`);
    return null;
  }
}

function validatePassage(data, year) {
  if (!data || typeof data !== "object") return null;
  if (!data.title || typeof data.title !== "string" || data.title.length < 3) return null;
  if (!data.body || typeof data.body !== "string" || data.body.length < 80) return null;
  if (!Array.isArray(data.questions) || data.questions.length < 4) return null;

  const wordCount = data.body.split(/\s+/).filter(Boolean).length;
  if (wordCount < 60) {
    console.warn(`  ⚠ Passage too short: ${wordCount} words`);
    return null;
  }

  // Validate each question
  const validQuestions = [];
  for (const q of data.questions) {
    if (!q.question_text || typeof q.question_text !== "string") continue;
    if (!Array.isArray(q.options) || q.options.length !== 4) continue;
    if (q.options.some(o => typeof o !== "string" || o.length < 1)) continue;

    const ci = parseInt(q.correct_index, 10);
    if (isNaN(ci) || ci < 0 || ci > 3) continue;

    validQuestions.push({
      question_text: q.question_text.trim(),
      options: q.options.map(o => o.trim()),
      correct_index: ci,
      explanation: (q.explanation || "").trim().slice(0, 500),
      skill: QUESTION_SKILLS.includes(q.skill) ? q.skill : "literal_comprehension",
      difficulty_tier: q.difficulty_tier || getDifficultyTiers(year)[0],
    });
  }

  if (validQuestions.length < 4) {
    console.warn(`  ⚠ Only ${validQuestions.length} valid questions (need ≥4)`);
    return null;
  }

  // Check correct_index distribution — warn but don't reject
  const indexCounts = [0, 0, 0, 0];
  validQuestions.forEach(q => indexCounts[q.correct_index]++);
  const maxSameIndex = Math.max(...indexCounts);
  if (maxSameIndex > Math.ceil(validQuestions.length * 0.6)) {
    console.warn(`  ⚠ Skewed correct_index distribution: ${indexCounts.join(",")}`);
    // Redistribute: rotate excess answers
    redistributeCorrectIndices(validQuestions);
  }

  return {
    title: data.title.trim(),
    body: data.body.trim(),
    topic: data.topic || "comprehension",
    wordCount,
    questions: validQuestions,
  };
}

function redistributeCorrectIndices(questions) {
  // Simple redistribution: assign indices round-robin
  const shuffled = [0, 1, 2, 3, 0, 1, 2, 3].slice(0, questions.length);
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  for (let i = 0; i < questions.length; i++) {
    const oldIdx = questions[i].correct_index;
    const newIdx = shuffled[i];
    if (oldIdx !== newIdx) {
      // Swap options to match new correct_index
      const correctOption = questions[i].options[oldIdx];
      questions[i].options[oldIdx] = questions[i].options[newIdx];
      questions[i].options[newIdx] = correctOption;
      questions[i].correct_index = newIdx;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE INSERT
// ═══════════════════════════════════════════════════════════════════════════════

async function insertPassageAndQuestions(passage, curriculum, subject, year, batchId) {
  // 1. Insert passage
  const { data: passageRow, error: pErr } = await supabase
    .from("passages")
    .insert({
      title: passage.title,
      body: passage.body,
      curriculum,
      subject,
      year_level: year,
      word_count: passage.wordCount,
      source: "ai",
      topic: passage.topic || "comprehension",
      question_count: passage.questions.length,
    })
    .select("id")
    .single();

  if (pErr) {
    console.error(`  ✗ Passage insert failed: ${pErr.message}`);
    return { passageId: null, questionsInserted: 0 };
  }

  const passageId = passageRow.id;

  // 2. Insert linked questions
  const questionRows = passage.questions.map((q, idx) => ({
    subject,
    year_level: year,
    topic: "comprehension",
    question_text: q.question_text,
    options: q.options,
    correct_index: q.correct_index,
    explanation: q.explanation,
    curriculum,
    question_type: "mcq",
    difficulty_tier: q.difficulty_tier,
    answer_type: "choice",
    passage_id: passageId,
    context_anchor_id: null,
    group_position: idx + 1,
    batch_id: batchId,
    source: "ai",
    is_active: true,
    region: curriculum.startsWith("ng_") ? "NG" : curriculum.startsWith("uk_") ? "GB" : "GL",
    hints: [],
    answer_aliases: [],
  }));

  const { data: qRows, error: qErr } = await supabase
    .from("question_bank")
    .insert(questionRows)
    .select("id");

  if (qErr) {
    console.error(`  ✗ Question insert failed: ${qErr.message}`);
    // Update passage question_count to 0 since questions failed
    await supabase.from("passages").update({ question_count: 0 }).eq("id", passageId);
    return { passageId, questionsInserted: 0 };
  }

  const inserted = qRows?.length || 0;

  // 3. Update question_count if some were filtered
  if (inserted !== passage.questions.length) {
    await supabase.from("passages").update({ question_count: inserted }).eq("id", passageId);
  }

  return { passageId, questionsInserted: inserted };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FETCH EXISTING PASSAGES (for dedup)
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchExistingTitles(curriculum, subject, year) {
  const { data } = await supabase
    .from("passages")
    .select("title")
    .eq("curriculum", curriculum)
    .eq("subject", subject)
    .eq("year_level", year);

  return (data || []).map(r => r.title);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATION LOOP
// ═══════════════════════════════════════════════════════════════════════════════

async function generateForSlot(curriculum, subject, year, count, dryRun) {
  const genres = PASSAGE_GENRES[subject] || PASSAGE_GENRES.english;
  const existingTitles = await fetchExistingTitles(curriculum, subject, year);
  const batchId = `passages_${curriculum}_${subject}_y${year}_${Date.now()}`;

  console.log(`\n📖 ${TARGETS[curriculum]?.label || curriculum} > ${subject} > Year ${year}`);
  console.log(`   Existing passages: ${existingTitles.length} | Generating: ${count}`);

  let totalPassages = 0;
  let totalQuestions = 0;
  let failures = 0;

  for (let i = 0; i < count; i++) {
    const genre = genres[(i + existingTitles.length) % genres.length];
    console.log(`   [${i + 1}/${count}] Genre: ${genre}...`);

    const prompt = buildPrompt(curriculum, subject, year, genre, existingTitles);

    if (dryRun) {
      console.log(`   [DRY RUN] Would generate ${genre} passage for Y${year} ${subject}`);
      totalPassages++;
      totalQuestions += 6;
      continue;
    }

    try {
      const { content, model } = await callAI(prompt);
      const parsed = parseResponse(content);
      const validated = validatePassage(parsed, year);

      if (!validated) {
        console.warn(`   ✗ Validation failed (model: ${model})`);
        failures++;
        continue;
      }

      const { passageId, questionsInserted } = await insertPassageAndQuestions(
        validated, curriculum, subject, year, batchId
      );

      if (passageId && questionsInserted > 0) {
        console.log(`   ✓ "${validated.title}" — ${validated.wordCount} words, ${questionsInserted} Qs (${model.split("/")[1]})`);
        existingTitles.push(validated.title);
        totalPassages++;
        totalQuestions += questionsInserted;
      } else {
        console.warn(`   ✗ DB insert failed`);
        failures++;
      }
    } catch (err) {
      console.error(`   ✗ Error: ${err.message}`);
      failures++;
    }

    // Rate limit: small delay between AI calls
    if (i < count - 1) await sleep(1500);
  }

  return { totalPassages, totalQuestions, failures };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI PARSING
// ═══════════════════════════════════════════════════════════════════════════════

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    curriculum: null,
    subject: null,
    year: null,
    all: false,
    dryRun: false,
    count: DEFAULT_PASSAGES_PER_SLOT,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--all") opts.all = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--curriculum" && args[i + 1]) opts.curriculum = args[++i];
    else if (a === "--subject" && args[i + 1]) opts.subject = args[++i];
    else if (a === "--year" && args[i + 1]) opts.year = parseInt(args[++i], 10);
    else if (a === "--count" && args[i + 1]) opts.count = parseInt(args[++i], 10);
  }

  return opts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const opts = parseArgs();
  const startTime = Date.now();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  LAUNCHPARD — Reading Passage Generator");
  console.log("═══════════════════════════════════════════════════════════════");
  if (opts.dryRun) console.log("  🔍 DRY RUN — no database writes");

  if (!OPENROUTER_KEY) {
    console.error("✗ OPENROUTER_API_KEY not set");
    process.exit(1);
  }

  // Build work list
  const workList = [];

  if (opts.all) {
    // Generate for all targets
    for (const [cur, def] of Object.entries(TARGETS)) {
      for (const [subj, subjDef] of Object.entries(def.subjects)) {
        for (const yr of subjDef.years) {
          workList.push({ curriculum: cur, subject: subj, year: yr });
        }
      }
    }
  } else if (opts.curriculum && opts.subject && opts.year) {
    workList.push({ curriculum: opts.curriculum, subject: opts.subject, year: opts.year });
  } else if (opts.curriculum && opts.subject) {
    const subjDef = TARGETS[opts.curriculum]?.subjects?.[opts.subject];
    if (subjDef) {
      for (const yr of subjDef.years) {
        workList.push({ curriculum: opts.curriculum, subject: opts.subject, year: yr });
      }
    } else {
      console.error(`✗ Unknown subject "${opts.subject}" for curriculum "${opts.curriculum}"`);
      process.exit(1);
    }
  } else if (opts.curriculum) {
    const curDef = TARGETS[opts.curriculum];
    if (!curDef) {
      console.error(`✗ Unknown curriculum "${opts.curriculum}". Available: ${Object.keys(TARGETS).join(", ")}`);
      process.exit(1);
    }
    for (const [subj, subjDef] of Object.entries(curDef.subjects)) {
      for (const yr of subjDef.years) {
        workList.push({ curriculum: opts.curriculum, subject: subj, year: yr });
      }
    }
  } else {
    console.log("\nUsage:");
    console.log("  node scripts/generatePassages.mjs --curriculum uk_national --subject english --year 5");
    console.log("  node scripts/generatePassages.mjs --curriculum uk_national --subject english --all");
    console.log("  node scripts/generatePassages.mjs --curriculum ng_jss --all");
    console.log("  node scripts/generatePassages.mjs --all");
    console.log("  node scripts/generatePassages.mjs --dry-run --all");
    console.log("  node scripts/generatePassages.mjs --count 10 --curriculum uk_national --subject english --year 7");
    console.log(`\nAvailable curricula: ${Object.keys(TARGETS).join(", ")}`);
    process.exit(0);
  }

  console.log(`\n  Work list: ${workList.length} curriculum/subject/year slots`);
  console.log(`  Passages per slot: ${opts.count}`);
  console.log(`  Total passages to generate: ~${workList.length * opts.count}`);

  let grandPassages = 0;
  let grandQuestions = 0;
  let grandFailures = 0;

  for (const { curriculum, subject, year } of workList) {
    const { totalPassages, totalQuestions, failures } = await generateForSlot(
      curriculum, subject, year, opts.count, opts.dryRun
    );
    grandPassages += totalPassages;
    grandQuestions += totalQuestions;
    grandFailures += failures;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  COMPLETE");
  console.log(`  Passages created: ${grandPassages}`);
  console.log(`  Questions created: ${grandQuestions}`);
  console.log(`  Failures: ${grandFailures}`);
  console.log(`  Time: ${elapsed}s`);
  console.log("═══════════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
