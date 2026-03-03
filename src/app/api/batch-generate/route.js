/**
 * LaunchPard — Vercel Cron API Route
 * File: src/app/api/batch-generate/route.js
 *
 * Round-robin strategy: each invocation processes ONE subject across all years.
 * Schedule 4 cron jobs at different hours (or pass ?subject= manually).
 * Per-run cost: 6 years × ceil(20/5)=4 calls × ~3s ≈ 72s  ✅ safe on Pro plan
 *
 * vercel.json crons:
 *   { "path": "/api/batch-generate?subject=maths",   "schedule": "0 1 * * *" }
 *   { "path": "/api/batch-generate?subject=english",  "schedule": "0 2 * * *" }
 *   { "path": "/api/batch-generate?subject=verbal",   "schedule": "0 3 * * *" }
 *   { "path": "/api/batch-generate?subject=nvr",      "schedule": "0 4 * * *" }
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ── Config ──────────────────────────────────────────────────────────────────
const TARGET_PER_CELL = 20;   // target total stored per subject×year
const RATE_LIMIT_MS   = 1200; // ms between OpenRouter calls
const BATCH_SIZE      = 5;    // questions per API call
const MODEL           = 'openai/gpt-4o-mini';
const ALL_SUBJECTS    = ['maths', 'english', 'verbal', 'nvr'];
const ALL_YEARS       = [1, 2, 3, 4, 5, 6];

// ── Prompt templates ─────────────────────────────────────────────────────────
const PROMPTS = {
  maths: (year, n) => `Generate ${n} KS2 maths reasoning questions for Year ${year} on any topic.
Each question must be a word problem requiring at least two steps to solve.
For each question provide a "steps" array of intermediate questions and answers.
Format as JSON:
{
  "questions": [
    {
      "q": "Final question text?",
      "steps": [
        {"prompt": "First, what is X?", "answer": "5"},
        {"prompt": "Now calculate Y using X.", "answer": "12"}
      ],
      "exp": "Explanation...",
      "topic": "fractions",
      "difficulty": 50
    }
  ]
}`,

  english: (year, n) => {
    const wordCount  = year <= 4 ? 250 : 350;
    const extraQs    = year <= 4 ? '' : '\n- 2 vocabulary questions\n- 2 explanation questions';
    return `Generate a ${wordCount}-word reading comprehension passage for Year ${year}.
After the passage create:
- 3 retrieval questions
- 2 inference questions${extraQs}
Each question: 4 MCQ options.
Format as JSON:
{
  "passage": "...",
  "questions": [
    {"q":"...","opts":["...","...","...","..."],"a":0,"exp":"...","topic":"retrieval"}
  ]
}`;
  },

  verbal: (year, n) => `Create ${n} KS2 verbal reasoning questions for Year ${year}.
Mix of: word analogies, odd one out, code breaking.
4 options per question.
Format as JSON:
{"questions":[{"q":"...","opts":["...","...","...","..."],"a":2,"exp":"...","topic":"analogies"}]}`,

  nvr: (year, n) => `Create ${n} non-verbal reasoning pattern questions described in text for Year ${year}.
Use sequences of shapes/letters/symbols (e.g. "circle, square, triangle, circle, square, ?").
4 options per question.
Format as JSON:
{"questions":[{"q":"...","opts":["...","...","...","..."],"a":0,"exp":"...","topic":"patterns"}]}`,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const sleep     = ms => new Promise(r => setTimeout(r, ms));
const normalise = s  => s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);

/** Pick which subject to process this invocation */
const resolveSubject = (req) => {
  const { searchParams } = new URL(req.url);
  const explicit = searchParams.get('subject');
  if (explicit && ALL_SUBJECTS.includes(explicit)) return explicit;
  // Fallback: rotate by day-of-week
  return ALL_SUBJECTS[new Date().getDay() % ALL_SUBJECTS.length];
};

// ── OpenRouter caller ────────────────────────────────────────────────────────
const callOpenRouter = async (prompt) => {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer':  'https://launchpard.com',
        'X-Title':       'LaunchPard Cron',
      },
      body: JSON.stringify({
        model:    MODEL,
        messages: [
          {
            role:    'system',
            content: 'Output ONLY valid JSON. No markdown fences, no commentary.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens:  6000,
        temperature: 0.8,
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${txt}`);
    }

    const data = await res.json();
    const raw  = data.choices[0].message.content.trim()
      .replace(/^```json\s*/i, '').replace(/\s*```$/i, '');

    const start = raw.indexOf('{');
    const end   = raw.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found in response');

    return JSON.parse(raw.slice(start, end + 1));
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('OpenRouter timed out');
    throw err;
  }
};

// ── Per-cell generator ───────────────────────────────────────────────────────
const generateForCell = async (supabase, subject, year, batchId, log) => {
  // How many do we already have?
  const { count } = await supabase
    .from('question_bank')
    .select('id', { count: 'exact', head: true })
    .eq('subject', subject)
    .eq('year_level', year);

  const needed = Math.max(0, TARGET_PER_CELL - (count ?? 0));
  if (needed === 0) {
    log.push(`${subject} Y${year}: already at target (${count}), skipping`);
    return 0;
  }

  log.push(`${subject} Y${year}: have ${count ?? 0}, generating up to ${needed}`);

  // Existing question texts for dedup
  const { data: existing } = await supabase
    .from('question_bank')
    .select('question_text')
    .eq('subject', subject)
    .eq('year_level', year);
  const seenTexts = new Set((existing ?? []).map(r => normalise(r.question_text)));

  const toInsert = [];
  const calls    = Math.ceil(needed / BATCH_SIZE);

  for (let i = 0; i < calls; i++) {
    try {
      const prompt = PROMPTS[subject](year, BATCH_SIZE);
      const result = await callOpenRouter(prompt);

      if (subject === 'english' && result.passage) {
        // ── English comprehension ──────────────────────────────────────────
        for (const q of (result.questions ?? [])) {
          if (!q.q || !Array.isArray(q.opts) || q.opts.length !== 4) continue;
          if (typeof q.a !== 'number' || q.a < 0 || q.a > 3) continue;
          const norm = normalise(q.q);
          if (seenTexts.has(norm)) continue;
          seenTexts.add(norm);
          toInsert.push({
            subject, year_level: year,
            topic:         q.topic        || 'comprehension',
            question_text: q.q,
            options:       JSON.stringify(q.opts),
            correct_index: q.a,
            explanation:   q.exp          || '',
            passage:       result.passage,
            difficulty:    q.difficulty   || 50,
            source:        'ai',
            batch_id:      batchId,
          });
        }
      } else {
        // ── Maths / Verbal / NVR ──────────────────────────────────────────
        for (const q of (result.questions ?? [])) {
          if (!q.q) continue;
          const norm = normalise(q.q);
          if (seenTexts.has(norm)) continue;
          seenTexts.add(norm);

          const row = {
            subject, year_level: year,
            topic:         q.topic       || subject,
            question_text: q.q,
            explanation:   q.exp         || '',
            difficulty:    q.difficulty  || 50,
            source:        'ai',
            batch_id:      batchId,
          };

          if (q.steps && Array.isArray(q.steps)) {
            // Multi-step maths question — store steps in dedicated column
            row.steps         = JSON.stringify(q.steps);
            row.options       = JSON.stringify([]);   // empty; UI uses steps
            row.correct_index = 0;
          } else if (
            Array.isArray(q.opts) && q.opts.length === 4 &&
            typeof q.a === 'number' && q.a >= 0 && q.a <= 3
          ) {
            row.options       = JSON.stringify(q.opts);
            row.correct_index = q.a;
          } else {
            log.push(`  ⚠ skipped malformed question: "${q.q?.slice(0, 40)}"`);
            continue;
          }

          toInsert.push(row);
        }
      }
    } catch (err) {
      log.push(`${subject} Y${year} call ${i + 1} error: ${err.message}`);
    }

    if (i < calls - 1) await sleep(RATE_LIMIT_MS);
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('question_bank').insert(toInsert);
    if (error) {
      log.push(`${subject} Y${year} insert error: ${error.message}`);
    } else {
      log.push(`${subject} Y${year}: +${toInsert.length} inserted`);
    }
  } else {
    log.push(`${subject} Y${year}: no new rows`);
  }

  return toInsert.length;
};

// ── Route handlers ───────────────────────────────────────────────────────────
export async function GET(req)  { return handleBatch(req); }
export async function POST(req) { return handleBatch(req); }

async function handleBatch(req) {
  // ── Debug (remove before production hardening) ───────────────────────────
  console.log('🚀 batch-generate hit');
  console.log('OPENROUTER_API_KEY present:', !!process.env.OPENROUTER_API_KEY);
  console.log('CRON_SECRET present:', !!process.env.CRON_SECRET);

  try {
    // ── Auth ───────────────────────────────────────────────────────────────
    const cronSecret  = process.env.CRON_SECRET;
    const vercelCron  = req.headers.get('x-vercel-cron');
    const bearerToken = req.headers.get('authorization')?.replace('Bearer ', '');

    if (cronSecret && !vercelCron && bearerToken !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ── Resolve subject for this run ───────────────────────────────────────
    const subject = resolveSubject(req);
    const batchId = `${subject}-${new Date().toISOString().slice(0, 10)}`;
    const log     = [`Batch ${batchId}: processing subject=${subject}`];

    await supabase.from('batch_log').upsert(
      { batch_id: batchId, subject, questions_generated: 0, model_used: MODEL, status: 'running' },
      { onConflict: 'batch_id' }
    );

    let total = 0;
    for (const year of ALL_YEARS) {
      total += await generateForCell(supabase, subject, year, batchId, log);
      await sleep(500); // brief pause between years
    }

    await supabase.from('batch_log')
      .update({ questions_generated: total, status: 'complete' })
      .eq('batch_id', batchId);

    return NextResponse.json({ ok: true, subject, total, batchId, log });
  } catch (err) {
    console.error('🔥 Unhandled exception in batch-generate:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}