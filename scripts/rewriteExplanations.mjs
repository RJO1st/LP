#!/usr/bin/env node
/**
 * scripts/rewriteExplanations.mjs
 *
 * Rewrite stub explanations (< 80 chars) via OpenRouter.
 * Default model: deepseek/deepseek-chat:free (DeepSeek V3 — free tier).
 * Use --paid to switch to claude-haiku-4-5 for guaranteed JSON compliance.
 *
 * Usage
 * ─────
 * node scripts/rewriteExplanations.mjs [--limit=N] [--dry-run] [--paid]
 *
 * Examples
 * ────────
 *   node scripts/rewriteExplanations.mjs --limit=300
 *   node scripts/rewriteExplanations.mjs --limit=10 --dry-run
 *   node scripts/rewriteExplanations.mjs --curriculum=ng_primary --limit=500
 *   node scripts/rewriteExplanations.mjs --limit=100 --paid   # haiku fallback
 *   node scripts/rewriteExplanations.mjs --model=meta-llama/llama-3.3-70b-instruct:free
 *
 * Output
 * ──────
 * CSV: scripts/output/explanation_rewrites.csv   (appended — resume-safe)
 * SQL: scripts/output/explanation_rewrites.sql   (overwritten each run)
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY,
 *           OPENROUTER_API_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
if (!OPENROUTER_KEY) {
  console.error('❌ Missing OPENROUTER_API_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Parse CLI args ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let limit = 300000;
const dryRun  = args.includes('--dry-run');
const usePaid = args.includes('--paid');

const curriculumFilter = (() => {
  const f = args.find(a => a.startsWith('--curriculum='));
  return f ? f.split('=')[1] : null;
})();

const modelOverride = (() => {
  const f = args.find(a => a.startsWith('--model='));
  return f ? f.split('=').slice(1).join('=') : null;
})();

for (const arg of args) {
  const match = arg.match(/--limit=(\d+)/);
  if (match) limit = parseInt(match[1], 10);
}

// ─── Model selection ────────────────────────────────────────────────────────
// Free models ranked for this task (structured JSON + curriculum-aware prose):
//   meta-llama/llama-3.3-70b-instruct:free   — 876M tok/wk, proven JSON compliance  ✅ DEFAULT
//   openai/gpt-oss-120b:free                 — 68.2B tok/wk, highest quality
//   nousresearch/hermes-3-405b-instruct:free — 88.7M tok/wk, tuned for JSON
//   nvidia/nemotron-3-nano-30b-a3b:free      — 45.5B tok/wk, 256K context
//   qwen/qwen3-next-80b-a3b:free             — 778M tok/wk, strong multilingual
//   deepseek/deepseek-chat:free              — solid fallback
//
// Avoid for this task: image models (FLUX, Seedream), <4B models (LFM 1.2B, Gemma 3n 2B)
//
// Use --paid for haiku-4-5 if free model produces malformed JSON.
// Use --model=<id> to override without editing this file.
const FREE_MODEL  = 'meta-llama/llama-3.3-70b-instruct:free';
const PAID_MODEL  = 'anthropic/claude-haiku-4-5';
const MODEL       = modelOverride ?? (usePaid ? PAID_MODEL : FREE_MODEL);
const BATCH_DELAY = usePaid ? 200 : 2000; // ms — free tier ~20 RPM

// ─── Cost tracking (only meaningful for paid runs) ─────────────────────────
const PAID_INPUT_COST  = 0.25 / 1_000_000;   // haiku-4-5
const PAID_OUTPUT_COST = 1.25 / 1_000_000;

let totalInputTokens  = 0;
let totalOutputTokens = 0;
let processedCount    = 0;

console.log('=== Explanation Rewriter ===');
console.log(`Model:       ${MODEL}`);
console.log(`Limit:       ${limit}`);
console.log(`Dry Run:     ${dryRun ? 'YES' : 'NO'}`);
if (curriculumFilter) console.log(`Curriculum:  ${curriculumFilter}`);
console.log('');

// ─── Output paths ──────────────────────────────────────────────────────────
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const csvOutputPath = path.join(outputDir, 'explanation_rewrites.csv');
const sqlOutputPath = path.join(outputDir, 'explanation_rewrites.sql');

// ─── Resume: load IDs already processed ────────────────────────────────────
const existingIds = new Set();
if (fs.existsSync(csvOutputPath)) {
  const lines = fs.readFileSync(csvOutputPath, 'utf-8').split('\n');
  for (let i = 1; i < lines.length; i++) {
    const id = lines[i].split(',')[0]?.trim();
    if (id && id.length === 36) existingIds.add(id); // UUID length guard
  }
  console.log(`Found ${existingIds.size} existing rewrites — will skip these.`);
}

// ─── Escape CSV ────────────────────────────────────────────────────────────
function escapeCsv(val) {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─── Load stub questions directly from DB ──────────────────────────────────
async function loadStubQuestions() {
  console.log('📖 Querying DB for stub explanations (< 80 chars)...');
  const all = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    let query = supabase
      .from('question_bank')
      .select('id, question_text, options, correct_index, explanation, year_level, subject, topic, curriculum')
      .eq('is_active', true)
      .not('explanation', 'is', null)
      .order('curriculum, subject, year_level')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (curriculumFilter) query = query.eq('curriculum', curriculumFilter);

    const { data, error } = await query;
    if (error) { console.error('❌ DB error:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;

    // Client-side length filter — Supabase JS doesn't expose LENGTH() in filters
    const stubs = data.filter(q => (q.explanation ?? '').trim().length < 80);
    all.push(...stubs);
    page++;
    process.stdout.write(`\r  Scanned ${page * pageSize} rows, found ${all.length} stubs...`);
  }

  console.log(`\n✅ Found ${all.length} stub explanations\n`);
  return all;
}

// ─── Rewrite a batch of questions via LLM ─────────────────────────────────
async function rewriteBatch(questions) {
  const batchJson = questions.map(q => ({
    id: q.id,
    question_text: q.question_text ?? '',
    correct_answer: Array.isArray(q.options) ? (q.options[q.correct_index] ?? '') : '',
    current_explanation: q.explanation ?? '',
    year_level: q.year_level ?? '',
    subject: q.subject ?? '',
    topic: q.topic ?? '',
  }));

  const systemPrompt = `You are an expert UK/Nigerian school teacher (KS1–SSS). Rewrite each explanation to score 5/5 on all criteria:
1. METHOD_CLARITY: Show the method, not just the answer. Include step-by-step working.
2. MISCONCEPTION_ADDRESS: Name common wrong approaches and explain why they fail.
3. AGE_APPROPRIATE: Match language to year_level (Y1–2: very simple; Y7–9: clear prose; Y10–13: precise terminology).
4. WORKED_EXAMPLE: Include a concrete worked example if not already present.

Return a JSON array ONLY — no markdown fences, no extra text.
Each element: {"id": "...", "explanation": "..."}
Keep explanations under 300 words. British English. No LaTeX.`;

  const MAX_RETRIES = 4;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(batchJson) },
          ],
          temperature: 0,
          top_p: 1,
        }),
      });

      // Rate-limited — back off and retry
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') ?? '0', 10);
        const wait = retryAfter > 0 ? retryAfter * 1000 : Math.pow(2, attempt + 2) * 1000;
        console.warn(`\n  ⏳ Rate limited (attempt ${attempt + 1}). Waiting ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        attempt++;
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      if (data.usage) {
        totalInputTokens  += data.usage.prompt_tokens ?? 0;
        totalOutputTokens += data.usage.completion_tokens ?? 0;
      }

      const raw = data.choices?.[0]?.message?.content ?? '[]';
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      let rewrites = [];
      try {
        rewrites = JSON.parse(cleaned);
      } catch (e) {
        console.error(`  ⚠ Failed to parse LLM response: ${e.message}`);
        if (!usePaid) console.error(`  💡 Tip: re-run with --paid to use haiku-4-5 for this batch`);
        return {};
      }

      const result = {};
      for (const r of rewrites) result[r.id] = r;
      return result;

    } catch (err) {
      console.error(`  ⚠ LLM batch failed (attempt ${attempt + 1}): ${err.message}`);
      attempt++;
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }

  console.error(`  ✖ Batch abandoned after ${MAX_RETRIES} attempts`);
  return {};
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function runRewrite() {
  const stubs = await loadStubQuestions();

  const toProcess = stubs
    .filter(q => !existingIds.has(q.id))
    .slice(0, limit);

  console.log(`Will process: ${toProcess.length} questions (limit=${limit}, already done=${existingIds.size})\n`);

  if (toProcess.length === 0) {
    console.log('Nothing to do — all stub explanations already rewritten.');
    return;
  }

  const results = [];
  const sqlUpdates = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    const rewrites = await rewriteBatch(batch);

    for (const q of batch) {
      const rewrite = rewrites[q.id];
      if (!rewrite?.explanation) {
        console.warn(`  ⚠ No rewrite returned for ${q.id}`);
        continue;
      }

      results.push({ question_id: q.id, new_explanation: rewrite.explanation });

      const escaped = rewrite.explanation.replace(/'/g, "''");
      sqlUpdates.push(`UPDATE question_bank SET explanation = '${escaped}' WHERE id = '${q.id}';`);
      processedCount++;
    }

    const done = Math.min(i + BATCH_SIZE, toProcess.length);
    process.stdout.write(`\r  ${done}/${toProcess.length} questions processed...`);

    // Rate limit pause — free tier needs ~2 s to stay under 20 RPM
    if (i + BATCH_SIZE < toProcess.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY));
    }
  }

  console.log(`\n\n✅ Done: ${processedCount} explanations rewritten\n`);

  if (dryRun) {
    console.log('=== DRY RUN: sample output ===');
    console.log(JSON.stringify(results.slice(0, 2), null, 2));
    return;
  }

  // ── Write CSV (append for resume safety) ──────────────────────────────
  if (!fs.existsSync(csvOutputPath) || fs.statSync(csvOutputPath).size === 0) {
    fs.writeFileSync(csvOutputPath, 'question_id,new_explanation\n');
  }
  const csvLines = results.map(r => `${r.question_id},${escapeCsv(r.new_explanation)}`).join('\n');
  fs.appendFileSync(csvOutputPath, csvLines + '\n');
  console.log(`📁 CSV appended → ${csvOutputPath}`);

  // ── Write SQL (batched in transactions of 100) ─────────────────────────
  const sqlBatches = [];
  for (let i = 0; i < sqlUpdates.length; i += 100) {
    const batch = sqlUpdates.slice(i, i + 100);
    sqlBatches.push('BEGIN;\n' + batch.join('\n') + '\nCOMMIT;');
  }
  fs.writeFileSync(sqlOutputPath, sqlBatches.join('\n\n') + '\n');
  console.log(`📁 SQL written  → ${sqlOutputPath}`);

  // ── Cost summary ───────────────────────────────────────────────────────
  console.log(`\n=== Cost ===`);
  console.log(`Model:         ${MODEL}`);
  if (usePaid) {
    const inputCost  = totalInputTokens  * PAID_INPUT_COST;
    const outputCost = totalOutputTokens * PAID_OUTPUT_COST;
    console.log(`Input tokens:  ${totalInputTokens.toLocaleString()} ($${inputCost.toFixed(4)})`);
    console.log(`Output tokens: ${totalOutputTokens.toLocaleString()} ($${outputCost.toFixed(4)})`);
    console.log(`Total:         $${(inputCost + outputCost).toFixed(4)}`);
  } else {
    console.log(`Input tokens:  ${totalInputTokens.toLocaleString()} ($0.0000 — free tier)`);
    console.log(`Output tokens: ${totalOutputTokens.toLocaleString()} ($0.0000 — free tier)`);
    console.log(`Total:         $0.0000`);
  }
}

runRewrite().catch(err => {
  console.error('❌ Rewrite failed:', err);
  process.exit(1);
});
