#!/usr/bin/env node
/**
 * scripts/rewriteExplanations.mjs
 *
 * Rewrite stub explanations (< 80 chars) via OpenRouter claude-haiku-4-5.
 * Queries the DB directly for active questions with short explanations —
 * no external audit CSV required.
 *
 * Usage
 * ─────
 * node scripts/rewriteExplanations.mjs [--limit=N] [--dry-run]
 *
 * Examples
 * ────────
 *   node scripts/rewriteExplanations.mjs --limit=300
 *   node scripts/rewriteExplanations.mjs --limit=10 --dry-run
 *   node scripts/rewriteExplanations.mjs --curriculum=ng_primary --limit=500
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
let limit = 300;
const dryRun = args.includes('--dry-run');
const curriculumFilter = (() => {
  const f = args.find(a => a.startsWith('--curriculum='));
  return f ? f.split('=')[1] : null;
})();

for (const arg of args) {
  const match = arg.match(/--limit=(\d+)/);
  if (match) limit = parseInt(match[1], 10);
}

console.log('=== Explanation Rewriter ===');
console.log(`Limit:       ${limit}`);
console.log(`Dry Run:     ${dryRun ? 'YES' : 'NO'}`);
if (curriculumFilter) console.log(`Curriculum:  ${curriculumFilter}`);
console.log('');

// ─── Pricing (claude-haiku-4-5 via OpenRouter) ─────────────────────────────
const HAIKU_INPUT_COST = 0.25 / 1_000_000;
const HAIKU_OUTPUT_COST = 1.25 / 1_000_000;

let totalInputTokens = 0;
let totalOutputTokens = 0;
let processedCount = 0;

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
      .lt('explanation', '\x7f') // rough proxy — actual filter below
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

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(batchJson) },
        ],
        temperature: 0,
        top_p: 1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (data.usage) {
      totalInputTokens += data.usage.prompt_tokens ?? 0;
      totalOutputTokens += data.usage.completion_tokens ?? 0;
    }

    const raw = data.choices?.[0]?.message?.content ?? '[]';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    let rewrites = [];
    try {
      rewrites = JSON.parse(cleaned);
    } catch (e) {
      console.error(`  ⚠ Failed to parse LLM response: ${e.message}`);
      return {};
    }

    const result = {};
    for (const r of rewrites) result[r.id] = r;
    return result;

  } catch (err) {
    console.error(`  ⚠ LLM batch failed: ${err.message}`);
    return {};
  }
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

    // Rate limit: 150ms between batches
    if (i + BATCH_SIZE < toProcess.length) {
      await new Promise(r => setTimeout(r, 150));
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
  const inputCost = totalInputTokens * HAIKU_INPUT_COST;
  const outputCost = totalOutputTokens * HAIKU_OUTPUT_COST;
  console.log(`\n=== Cost ===`);
  console.log(`Input tokens:  ${totalInputTokens.toLocaleString()} ($${inputCost.toFixed(4)})`);
  console.log(`Output tokens: ${totalOutputTokens.toLocaleString()} ($${outputCost.toFixed(4)})`);
  console.log(`Total:         $${(inputCost + outputCost).toFixed(4)}`);
}

runRewrite().catch(err => {
  console.error('❌ Rewrite failed:', err);
  process.exit(1);
});
