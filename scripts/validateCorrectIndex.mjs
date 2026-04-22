#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// LAUNCHPARD — correct_index Validation & Repair Script
// ═══════════════════════════════════════════════════════════════════════════════
// Sweeps MCQ questions in the question_bank to find rows where correct_index
// points to the wrong answer. Fixes high-confidence errors automatically,
// logs medium-confidence cases for manual review, and skips maths questions
// (which are formula-derived and less prone to factual error).
//
// Usage:
//   node scripts/validateCorrectIndex.mjs
//   node scripts/validateCorrectIndex.mjs --dry-run
//   node scripts/validateCorrectIndex.mjs --subject geography --limit 500
//   node scripts/validateCorrectIndex.mjs --curriculum uk_national --subject science --year 7
//   node scripts/validateCorrectIndex.mjs --batch-size 15 --concurrency 3
//
// Env vars needed (in .env.local):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

// Models best suited for factual verification — prefer high-accuracy ones
const VERIFY_MODELS = [
  "anthropic/claude-3.5-haiku",
  "openai/gpt-4o-mini",
  "google/gemini-2.0-flash-lite-001",
  "deepseek/deepseek-v3.2",
  "meta-llama/llama-3.3-70b-instruct",
];
let modelIdx = 0;

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag, def = null) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const hasFlag = (flag) => args.includes(flag);

const DRY_RUN     = hasFlag("--dry-run");
const SUBJECT_ARG = getArg("--subject");       // e.g. "geography", "science"
const CURRICULUM  = getArg("--curriculum");    // e.g. "uk_national"
const YEAR_ARG    = getArg("--year");          // e.g. "7"
const LIMIT       = parseInt(getArg("--limit", "2000"), 10);
const BATCH_SIZE  = parseInt(getArg("--batch-size", "20"), 10);
const CONCURRENCY = parseInt(getArg("--concurrency", "2"), 10);

// Subjects to validate — maths is excluded because its correct_index is
// usually derived from computed answers and is rarely wrong factually.
// MCQ in maths tend to have algorithmic distractors; the risk of model
// hallucination in verification outweighs the benefit.
const SKIP_SUBJECTS = new Set([
  "mathematics", "maths", "math",
  "verbal_reasoning", "non_verbal_reasoning",
]);

// Factual subjects most at risk of wrong correct_index from AI generation
const HIGH_RISK_SUBJECTS = new Set([
  "geography", "history", "science", "basic_science",
  "english", "english_studies", "english_language",
  "social_studies", "civic_education",
  "biology", "chemistry", "physics",
]);

// ─── Logging ─────────────────────────────────────────────────────────────────
const LOG_FILE    = resolve(__dirname, "..", "logs", "validate-correct-index.log");
const REPORT_FILE = resolve(__dirname, "..", "logs", "validate-correct-index-report.json");

function logLine(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    // Ensure logs dir exists
    const logsDir = resolve(__dirname, "..", "logs");
    if (!existsSync(logsDir)) {
      import("fs").then(({ mkdirSync }) => mkdirSync(logsDir, { recursive: true }));
    }
    appendFileSync(LOG_FILE, line + "\n");
  } catch (_) {}
}

// ─── Stats ───────────────────────────────────────────────────────────────────
const stats = {
  total:          0,
  verified_ok:    0,
  fixed:          0,
  needs_review:   0,
  skipped_maths:  0,
  errors:         0,
  batches:        0,
};

const reviewQueue = [];  // { id, q, opts, stored_index, suggested_index, confidence, reason }

// ─── AI call with retry ───────────────────────────────────────────────────────
async function callAI(messages, maxRetries = 3) {
  let lastErr;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const model = VERIFY_MODELS[modelIdx % VERIFY_MODELS.length];
    modelIdx++;

    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "HTTP-Referer": "https://launchpard.com",
          "X-Title": "LaunchPard ValidateCorrectIndex",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1024,
          temperature: 0.0,   // deterministic for verification
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content?.trim() ?? "";
      return { content, model };
    } catch (err) {
      lastErr = err;
      // Brief pause before trying next model
      await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastErr || new Error("All models failed");
}

// ─── Parse JSON from AI response ─────────────────────────────────────────────
function parseJSON(text) {
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Try to find a JSON array or object in the text
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { return JSON.parse(arrMatch[0]); } catch (_2) {}
    }
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch (_3) {}
    }
    return null;
  }
}

// ─── Build verification prompt for a batch ───────────────────────────────────
function buildVerifyPrompt(questions) {
  const items = questions.map((q, i) => {
    const optsList = q.options.map((o, idx) => `  ${idx}: "${o}"`).join("\n");
    return `QUESTION ${i + 1} (id: ${q.id}):
Subject: ${q.subject} | Year: ${q.year_level} | Curriculum: ${q.curriculum}
Q: ${q.question_text}
Options (0-indexed):
${optsList}
Stored correct_index: ${q.correct_index}`;
  }).join("\n\n---\n\n");

  return `You are a subject-matter expert verifying whether multiple-choice questions have the correct answer marked.

For each question below, determine:
1. Is the stored correct_index pointing to the right answer?
2. If not, which index (0-based) IS correct?
3. How confident are you? ("high", "medium", or "low")

IMPORTANT RULES:
- Only flag an error when you are CERTAIN the stored answer is factually wrong
- "high" confidence = you are sure beyond reasonable doubt (e.g. "Latitude" vs "Longitude" — lines of latitude run east-west, lines of longitude run north-south)
- "medium" confidence = likely wrong but there's some ambiguity
- "low" confidence = uncertain — leave this alone
- For any question where the stored answer COULD be correct in any reasonable interpretation, mark status "ok"
- Do NOT second-guess trick questions or questions testing specific curriculum definitions
- For English grammar questions, trust the stored answer unless it is clearly factually wrong

Return ONLY a JSON array — no prose, no markdown:
[
  {
    "id": "<question id>",
    "status": "ok" | "wrong",
    "stored_index": <number>,
    "correct_index": <number>,
    "confidence": "high" | "medium" | "low",
    "reason": "<brief explanation if wrong, null if ok>"
  },
  ...
]

Questions to verify:

${items}`;
}

// ─── Fetch a page of MCQ questions ───────────────────────────────────────────
async function fetchQuestions(offset, pageSize) {
  let query = supabase
    .from("question_bank")
    .select("id, question_text, options, correct_index, subject, year_level, curriculum, explanation")
    .eq("is_active", true)
    .eq("question_type", "mcq")
    .not("options", "is", null)
    .not("correct_index", "is", null)
    .range(offset, offset + pageSize - 1)
    .order("created_at", { ascending: true });

  if (SUBJECT_ARG) {
    query = query.eq("subject", SUBJECT_ARG);
  } else {
    // Exclude maths and reasoning unless explicitly requested
    query = query.not("subject", "in", `(${[...SKIP_SUBJECTS].map(s => `"${s}"`).join(",")})`);
  }

  if (CURRICULUM) query = query.eq("curriculum", CURRICULUM);
  if (YEAR_ARG)   query = query.eq("year_level", parseInt(YEAR_ARG, 10));

  const { data, error } = await query;
  if (error) throw new Error(`Supabase fetch error: ${error.message}`);
  return data || [];
}

// ─── Process a single batch ───────────────────────────────────────────────────
async function processBatch(batch) {
  stats.batches++;

  // Filter out questions with fewer than 2 options or invalid correct_index
  const valid = batch.filter(q => {
    if (!Array.isArray(q.options) || q.options.length < 2) return false;
    if (q.correct_index < 0 || q.correct_index >= q.options.length) return false;
    return true;
  });

  if (!valid.length) return;

  const prompt = buildVerifyPrompt(valid);

  let result;
  try {
    const { content, model } = await callAI([
      { role: "user", content: prompt }
    ]);
    result = parseJSON(content);
    if (!Array.isArray(result)) {
      logLine(`  ⚠ Batch ${stats.batches}: model returned non-array (model: ${model}), skipping`);
      stats.errors += valid.length;
      return;
    }
  } catch (err) {
    logLine(`  ✗ Batch ${stats.batches} AI error: ${err.message}`);
    stats.errors += valid.length;
    return;
  }

  // Map results by id for quick lookup
  const resultMap = new Map(result.map(r => [String(r.id), r]));

  for (const q of valid) {
    stats.total++;
    const r = resultMap.get(String(q.id));

    if (!r) {
      // Model didn't return a result for this question — skip safely
      continue;
    }

    if (r.status === "ok" || r.status == null) {
      stats.verified_ok++;
      continue;
    }

    if (r.status === "wrong") {
      const storedAnswer  = q.options[q.correct_index];
      const correctAnswer = q.options[r.correct_index];

      if (r.correct_index === undefined || r.correct_index === null ||
          r.correct_index < 0 || r.correct_index >= q.options.length) {
        // Invalid suggestion — put in review queue
        reviewQueue.push({
          id:               q.id,
          q:                q.question_text,
          opts:             q.options,
          stored_index:     q.correct_index,
          stored_answer:    storedAnswer,
          suggested_index:  r.correct_index,
          suggested_answer: "(invalid index)",
          confidence:       r.confidence || "low",
          reason:           r.reason,
        });
        stats.needs_review++;
        continue;
      }

      if (r.confidence === "high") {
        // Auto-fix
        if (!DRY_RUN) {
          const { error: updateErr } = await supabase
            .from("question_bank")
            .update({ correct_index: r.correct_index })
            .eq("id", q.id);

          if (updateErr) {
            logLine(`  ✗ Failed to update id=${q.id}: ${updateErr.message}`);
            stats.errors++;
            continue;
          }
        }

        stats.fixed++;
        logLine(`  ✔ FIXED${DRY_RUN ? " (dry-run)" : ""} id=${q.id} | ${q.subject} Y${q.year_level} | "${q.question_text.slice(0, 70)}..." | ${q.correct_index} ("${storedAnswer}") → ${r.correct_index} ("${correctAnswer}") | ${r.reason}`);

      } else if (r.confidence === "medium") {
        // Flag for manual review
        reviewQueue.push({
          id:               q.id,
          q:                q.question_text,
          opts:             q.options,
          stored_index:     q.correct_index,
          stored_answer:    storedAnswer,
          suggested_index:  r.correct_index,
          suggested_answer: correctAnswer,
          confidence:       "medium",
          reason:           r.reason,
          subject:          q.subject,
          year_level:       q.year_level,
          curriculum:       q.curriculum,
        });
        stats.needs_review++;
        logLine(`  ? REVIEW  id=${q.id} | ${q.subject} Y${q.year_level} | "${q.question_text.slice(0, 70)}..." | stored="${storedAnswer}" → suggested="${correctAnswer}" (medium confidence)`);

      } else {
        // Low confidence — leave alone
        stats.verified_ok++;
      }
    }
  }
}

// ─── Semaphore for concurrency control ───────────────────────────────────────
function createSemaphore(limit) {
  let running = 0;
  const queue = [];
  return function acquire() {
    return new Promise(resolve => {
      const tryRun = () => {
        if (running < limit) {
          running++;
          resolve(() => {
            running--;
            if (queue.length) queue.shift()();
          });
        } else {
          queue.push(tryRun);
        }
      };
      tryRun();
    });
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  logLine("═".repeat(72));
  logLine("LaunchPard — validateCorrectIndex");
  logLine(`DRY_RUN=${DRY_RUN} | SUBJECT=${SUBJECT_ARG || "all factual"} | CURRICULUM=${CURRICULUM || "all"} | YEAR=${YEAR_ARG || "all"} | LIMIT=${LIMIT} | BATCH=${BATCH_SIZE} | CONCURRENCY=${CONCURRENCY}`);
  logLine("═".repeat(72));

  if (!OPENROUTER_KEY) {
    console.error("✗ OPENROUTER_API_KEY not set");
    process.exit(1);
  }

  const semaphore = createSemaphore(CONCURRENCY);
  let offset = 0;
  let processed = 0;

  while (processed < LIMIT) {
    const pageSize = Math.min(BATCH_SIZE * CONCURRENCY, LIMIT - processed, 100);
    const rows = await fetchQuestions(offset, pageSize);
    if (!rows.length) break;

    // Split into batches of BATCH_SIZE
    const batches = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(rows.slice(i, i + BATCH_SIZE));
    }

    // Process batches with controlled concurrency
    await Promise.all(batches.map(async (batch) => {
      const release = await semaphore();
      try {
        await processBatch(batch);
      } finally {
        release();
      }
    }));

    processed += rows.length;
    offset += rows.length;

    logLine(`  Progress: ${processed} questions processed | fixed=${stats.fixed} | needs_review=${stats.needs_review} | errors=${stats.errors}`);

    if (rows.length < pageSize) break;  // no more rows
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  logLine("═".repeat(72));
  logLine("VALIDATION COMPLETE");
  logLine(`  Total processed : ${stats.total}`);
  logLine(`  Verified OK     : ${stats.verified_ok}`);
  logLine(`  Auto-fixed      : ${stats.fixed}${DRY_RUN ? " (dry-run — no DB writes)" : ""}`);
  logLine(`  Needs review    : ${stats.needs_review}`);
  logLine(`  Errors          : ${stats.errors}`);
  logLine(`  Batches sent    : ${stats.batches}`);
  logLine("═".repeat(72));

  // Write review report
  if (reviewQueue.length) {
    const report = {
      generated_at: new Date().toISOString(),
      dry_run:      DRY_RUN,
      stats,
      needs_manual_review: reviewQueue,
    };
    try {
      // Ensure logs dir
      const logsDir = resolve(__dirname, "..", "logs");
      try {
        const { mkdirSync } = await import("fs");
        mkdirSync(logsDir, { recursive: true });
      } catch (_) {}

      writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
      logLine(`  Review report written to: ${REPORT_FILE}`);
      logLine(`  ${reviewQueue.length} question(s) require manual review — check the report.`);
    } catch (err) {
      logLine(`  ⚠ Could not write report: ${err.message}`);
    }
  } else {
    logLine("  No manual review items.");
  }

  // Exit with error code if errors occurred
  if (stats.errors > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error("✗ Fatal error:", err);
  process.exit(1);
});
