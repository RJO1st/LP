#!/usr/bin/env node
/**
 * scripts/rewriteExplanations.mjs
 *
 * Rewrite explanations for flagged questions (avg_score < 3.0) using Claude Haiku via OpenRouter.
 * Reads flagged questions from the explanation quality audit CSV.
 * Resumes from existing results to avoid re-processing.
 *
 * Usage
 * ─────
 * node scripts/rewriteExplanations.mjs [--limit=N] [--dry-run]
 *
 * Examples
 * ────────
 *   node scripts/rewriteExplanations.mjs --limit=300
 *   node scripts/rewriteExplanations.mjs --limit=10 --dry-run
 *
 * Output
 * ──────
 * CSV: scripts/output/explanation_rewrites.csv
 * SQL: scripts/output/explanation_rewrites.sql
 *
 * Columns (CSV): question_id, new_explanation
 * Prints cost estimate to stdout (tokens × Haiku rate).
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
if (!OPENROUTER_KEY) {
  console.error('Missing OPENROUTER_API_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Parse CLI args
const args = process.argv.slice(2);
let limit = 300;
const dryRun = args.includes('--dry-run');

for (const arg of args) {
  const match = arg.match(/--limit=(\d+)/);
  if (match) limit = parseInt(match[1], 10);
}

console.log('=== Explanation Rewriter ===');
console.log(`Limit: ${limit}`);
console.log(`Dry Run: ${dryRun ? 'YES' : 'NO'}`);
console.log('');

// Pricing for Claude Haiku
const HAIKU_INPUT_COST = 0.25 / 1_000_000;
const HAIKU_OUTPUT_COST = 1.25 / 1_000_000;

// Track totals
let totalInputTokens = 0;
let totalOutputTokens = 0;
let processedCount = 0;
let skippedCount = 0;

// Load existing results to support resume
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const csvOutputPath = path.join(outputDir, 'explanation_rewrites.csv');
const sqlOutputPath = path.join(outputDir, 'explanation_rewrites.sql');
const auditPath = path.join('/sessions/sleepy-serene-hopper/mnt/uploads', 'explanation_quality_audit.csv');

const existingIds = new Set();

if (fs.existsSync(csvOutputPath)) {
  const content = fs.readFileSync(csvOutputPath, 'utf-8');
  const lines = content.split('\n');
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const parts = lines[i].split(',');
      if (parts[0]) existingIds.add(parts[0]);
    }
  }
  console.log(`Found ${existingIds.size} existing rewrites, will resume from there.`);
}

// CSV header for output
const csvHeader = 'question_id,new_explanation\n';

// Escape CSV value
function escapeCsv(val) {
  if (!val) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Load flagged questions from audit CSV
 */
function loadFlaggedQuestions() {
  if (!fs.existsSync(auditPath)) {
    throw new Error(`Audit CSV not found: ${auditPath}`);
  }

  const content = fs.readFileSync(auditPath, 'utf-8');
  const records = csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  // Filter: flagged=true AND avg_score >= 1.5
  const flagged = records.filter(
    r => r.flagged === 'true' && parseFloat(r.avg_score) >= 1.5
  );

  console.log(`Loaded ${records.length} total questions from audit`);
  console.log(`Found ${flagged.length} flagged with avg_score >= 1.5`);

  return flagged;
}

/**
 * Fetch full question details from Supabase
 */
async function fetchQuestionDetails(questionIds) {
  const { data, error } = await supabase
    .from('question_bank')
    .select('id, question_text, options, correct_index, explanation, year_level, subject, topic')
    .in('id', questionIds);

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  // Index by ID for quick lookup
  const byId = {};
  for (const q of data) {
    byId[q.id] = q;
  }

  return byId;
}

/**
 * Call OpenRouter API for batch rewrite
 */
async function rewriteBatch(questions, detailsMap) {
  const batchJson = questions.map(q => {
    const full = detailsMap[q.question_id];
    if (!full) {
      console.warn(`Question ${q.question_id} not found in DB, skipping`);
      return null;
    }

    return {
      id: q.question_id,
      question_text: full.question_text || '',
      correct_answer: (full.options || [])[full.correct_index] || '',
      current_explanation: full.explanation || '',
      year_level: full.year_level || '',
      subject: full.subject || '',
      topic: full.topic || '',
    };
  }).filter(Boolean);

  if (batchJson.length === 0) {
    return {};
  }

  const systemPrompt = `You are an expert UK/Nigerian school teacher (KS1-SSS). Rewrite each explanation to score 5/5 on these criteria:
1. METHOD_CLARITY: Show the method, not just the answer. Include step-by-step working.
2. MISCONCEPTION_ADDRESS: Name common wrong approaches and explain why they fail.
3. AGE_APPROPRIATE: Match the language to year_level (Y1-2: very simple; Y7-9: clear prose; Y10-13: precise terminology).
4. WORKED_EXAMPLE: Include a concrete worked example if not already present.

Return JSON array only. Each element: {"id": "...", "explanation": "..."}
Keep explanations under 300 words. British English.`;

  const userMessage = JSON.stringify(batchJson);

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
          { role: 'user', content: userMessage },
        ],
        temperature: 0,
        top_p: 1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const data = await response.json();

    // Track token usage
    if (data.usage) {
      totalInputTokens += data.usage.prompt_tokens || 0;
      totalOutputTokens += data.usage.completion_tokens || 0;
    }

    const raw = data.choices?.[0]?.message?.content || '[]';
    // Strip markdown code fences the model sometimes adds despite instructions
    const content = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    let rewrites = [];
    try {
      rewrites = JSON.parse(content);
    } catch (e) {
      console.error(`Failed to parse LLM response: ${e.message}`);
      return {};
    }

    // Index by question ID
    const result = {};
    for (const rewrite of rewrites) {
      result[rewrite.id] = rewrite;
    }
    return result;
  } catch (err) {
    console.error(`LLM batch failed: ${err.message}`);
    return {};
  }
}

/**
 * Main rewrite loop
 */
async function runRewrite() {
  const flaggedQuestions = loadFlaggedQuestions();
  const toProcess = flaggedQuestions
    .filter(q => !existingIds.has(q.question_id))
    .slice(0, limit);

  console.log(`\nWill process ${toProcess.length} new questions`);

  const results = [];
  const sqlUpdates = [];
  const llmBatchSize = 5; // Questions per LLM call

  for (let i = 0; i < toProcess.length; i += llmBatchSize) {
    const batchQuestions = toProcess.slice(i, i + llmBatchSize);
    const questionIds = batchQuestions.map(q => q.question_id);

    // Fetch full details
    const detailsMap = await fetchQuestionDetails(questionIds);

    // Rewrite
    const rewrites = await rewriteBatch(batchQuestions, detailsMap);

    for (const q of batchQuestions) {
      const rewrite = rewrites[q.question_id];
      if (!rewrite) {
        console.warn(`No rewrite for question ${q.question_id}`);
        continue;
      }

      results.push({
        question_id: q.question_id,
        new_explanation: rewrite.explanation || '',
      });

      // Generate SQL UPDATE for this question
      const escaped = rewrite.explanation.replace(/'/g, "''");
      sqlUpdates.push(
        `UPDATE question_bank SET explanation = '${escaped}' WHERE id = '${q.question_id}';`
      );

      processedCount++;
      if (processedCount % 10 === 0) {
        console.log(`  Processed ${processedCount}/${toProcess.length}...`);
      }
    }

    // Rate limiting: 150ms between batches
    if (i + llmBatchSize < toProcess.length) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }

  skippedCount = flaggedQuestions.length - toProcess.length;
  console.log(`\nProcessed: ${processedCount}, Skipped (already done): ${skippedCount}`);

  if (dryRun) {
    console.log('\n=== DRY RUN: Would write the following results ===');
    console.log(results.slice(0, 3));
    console.log('\n=== DRY RUN: Would write the following SQL ===');
    console.log(sqlUpdates.slice(0, 3).join('\n'));
    return;
  }

  // Write CSV
  if (!fs.existsSync(csvOutputPath) || fs.statSync(csvOutputPath).size === 0) {
    fs.writeFileSync(csvOutputPath, csvHeader);
  }

  const csvLines = results
    .map(r => `${r.question_id},${escapeCsv(r.new_explanation)}`)
    .join('\n');

  fs.appendFileSync(csvOutputPath, csvLines + '\n');
  console.log(`\nResults appended to ${csvOutputPath}`);

  // Write SQL in batches (100 per batch)
  const sqlBatches = [];
  for (let i = 0; i < sqlUpdates.length; i += 100) {
    const batch = sqlUpdates.slice(i, i + 100);
    sqlBatches.push('BEGIN;\n' + batch.join('\n') + '\nCOMMIT;');
  }

  fs.writeFileSync(sqlOutputPath, sqlBatches.join('\n\n') + '\n');
  console.log(`SQL updates written to ${sqlOutputPath}`);

  // Cost estimate
  const inputCost = totalInputTokens * HAIKU_INPUT_COST;
  const outputCost = totalOutputTokens * HAIKU_OUTPUT_COST;
  const totalCost = inputCost + outputCost;

  console.log(`\n=== Token Usage & Cost ===`);
  console.log(`Input tokens: ${totalInputTokens.toLocaleString()}`);
  console.log(`Output tokens: ${totalOutputTokens.toLocaleString()}`);
  console.log(`Input cost: $${inputCost.toFixed(4)}`);
  console.log(`Output cost: $${outputCost.toFixed(4)}`);
  console.log(`Total cost: $${totalCost.toFixed(4)}`);
}

runRewrite().catch(err => {
  console.error('Rewrite failed:', err);
  process.exit(1);
});
