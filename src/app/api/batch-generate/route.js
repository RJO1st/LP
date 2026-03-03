console.log('🧪 DEBUG: OPENROUTER_API_KEY present?', !!process.env.OPENROUTER_API_KEY);
console.log('🧪 DEBUG: OPENROUTER_API_KEY value length:', process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.length : 'undefined');
console.log('🧪 DEBUG: CRON_SECRET present?', !!process.env.CRON_SECRET);
/**
 * LaunchPard — Vercel Cron API Route (using gpt-4o-mini)
 * File: src/app/api/batch-generate/route.js
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ── Config ─────────────────────────────────────────────────────────
const TARGET_PER_CELL = 20;      // per subject×year per run
const RATE_LIMIT_MS = 1500;       // comfortable delay
const BATCH_SIZE = 5;             // 5 questions per call

// ✅ Reliable paid model (you have credits)
const MODEL = 'openai/gpt-4o-mini';

// Prompt templates (unchanged, but we'll use the same model for all)
const PROMPTS = {
  maths: (year, n) => `Generate ${n} KS2 maths reasoning questions for Year ${year} on any topic.
Each question must be a word problem requiring at least two steps to solve.
For each question, provide a "steps" array containing intermediate questions and their answers.
The final answer should be the result of all steps.
Format as JSON with the following structure:
{
  "questions": [
    {
      "q": "Final question text?",
      "steps": [
        {"prompt": "First, what is X?", "answer": "5"},
        {"prompt": "Now, using X, calculate Y", "answer": "12"}
      ],
      "exp": "Explanation of the solution...",
      "topic": "fractions",
      "difficulty": 50
    }
  ]
}`,

  english: (year, n) => {
    if (year <= 4) {
      return `Generate a reading comprehension passage suitable for Year ${year} (approx. 250 words). Use rich but age‑appropriate vocabulary.
After the passage, create:
- 3 retrieval questions
- 2 inference questions
- 1 vocabulary question
- 1 explanation question

Each question must be multiple‑choice with 4 options.
Format as JSON:
{
  "passage": "the passage text",
  "questions": [
    {"q":"...","opts":["...","...","...","..."],"a":0,"exp":"...","topic":"retrieval"},
    ...
  ]
}`;
    } else {
      return `Generate a reading comprehension passage suitable for Year ${year} (approx. 350 words). Use advanced vocabulary.
After the passage, create:
- 3 retrieval questions
- 2 inference questions
- 2 vocabulary questions
- 2 explanation questions

Each question must be multiple‑choice with 4 options.
Format as JSON:
{
  "passage": "the passage text",
  "questions": [
    {"q":"...","opts":["...","...","...","..."],"a":0,"exp":"...","topic":"retrieval"},
    ...
  ]
}`;
    }
  },

  verbal: (year, n) => `Create ${n} KS2 verbal reasoning questions for Year ${year}.
Include a mix of:
- word analogies
- odd one out
- code breaking (letter shifts, number codes)
Provide 4 answer options per question.
Format as JSON:
{"questions":[{"q":"...","opts":["...","...","...","..."],"a":2,"exp":"...","topic":"verbal"}]}`,

  nvr: (year, n) => `Create ${n} non-verbal reasoning style pattern questions described in text for Year ${year}.
Use sequences of shapes, letters, or symbols (e.g., "circle, square, triangle, circle, square, ?").
Provide 4 answer options per question.
Format as JSON:
{"questions":[{"q":"...","opts":["...","...","...","..."],"a":0,"exp":"...","topic":"nvr"}]}`,
};

const getWeeklySubjects = () => ['maths', 'english', 'verbal', 'nvr'];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const callOpenRouter = async (prompt, model) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://launchpard.com',
        'X-Title': 'LaunchPard Cron',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'Output ONLY valid JSON. No markdown fences. For comprehension passages, output a JSON object with "passage" and "questions".' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 6000,
        temperature: 0.8,
      }),
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ OpenRouter ${res.status} response:`, errorText);
      throw new Error(`OpenRouter ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const raw = data.choices[0].message.content.trim()
      .replace(/^```json\s*/i, '').replace(/\s*```$/i, '');

    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('No JSON object found in response');
    }
    const cleaned = raw.substring(firstBrace, lastBrace + 1);
    return JSON.parse(cleaned);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') throw new Error('OpenRouter request timed out');
    throw err;
  }
};

const normalise = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0,60);

const generateForSubject = async (supabase, subject, year, batchId, log) => {
  log.push(`${subject} Y${year}: starting`);
  const prompt = PROMPTS[subject](year, BATCH_SIZE);

  // Fetch existing questions to avoid duplicates
  const { data: existing } = await supabase
    .from('question_bank')
    .select('question_text, passage')
    .eq('subject', subject)
    .eq('year_level', year);
  const seenTexts = new Set((existing || []).map(r => normalise(r.question_text)));

  const toInsert = [];
  const calls = Math.ceil(TARGET_PER_CELL / BATCH_SIZE);

  for (let i = 0; i < calls; i++) {
    try {
      const result = await callOpenRouter(prompt, MODEL);
      if (subject === 'english' && result.passage) {
        const passage = result.passage;
        for (const q of (result.questions || [])) {
          if (!q.q || !Array.isArray(q.opts) || q.opts.length !== 4) continue;
          if (typeof q.a !== 'number' || q.a < 0 || q.a > 3) continue;
          const norm = normalise(q.q);
          if (seenTexts.has(norm)) continue;
          seenTexts.add(norm);
          toInsert.push({
            subject, year_level: year,
            topic: q.topic || 'comprehension',
            question_text: q.q,
            options: JSON.stringify(q.opts),
            correct_index: q.a,
            explanation: q.exp || '',
            passage: passage,
            difficulty: q.difficulty || 50,
            source: 'ai',
            batch_id: batchId,
          });
        }
      } else {
        for (const q of (result.questions || [])) {
          if (!q.q) continue;
          if (q.opts && !Array.isArray(q.opts)) continue;
          const norm = normalise(q.q);
          if (seenTexts.has(norm)) continue;
          seenTexts.add(norm);

          const insertObj = {
            subject, year_level: year,
            topic: q.topic || subject,
            question_text: q.q,
            explanation: q.exp || '',
            difficulty: q.difficulty || 50,
            source: 'ai',
            batch_id: batchId,
          };

          if (q.steps && Array.isArray(q.steps)) {
            insertObj.steps = q.steps;
            insertObj.options = JSON.stringify([]);
            insertObj.correct_index = 0;
          } else if (q.opts && q.opts.length === 4 && typeof q.a === 'number') {
            insertObj.options = JSON.stringify(q.opts);
            insertObj.correct_index = q.a;
          } else {
            continue;
          }
          toInsert.push(insertObj);
        }
      }
    } catch (err) {
      log.push(`${subject} Y${year} call ${i+1} error: ${err.message}`);
    }
    if (i < calls - 1) await sleep(RATE_LIMIT_MS);
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('question_bank').insert(toInsert);
    if (error) {
      log.push(`${subject} Y${year} insert error: ${error.message}`);
      console.error(error);
    } else {
      log.push(`${subject} Y${year}: +${toInsert.length} inserted`);
    }
  } else {
    log.push(`${subject} Y${year}: nothing new`);
  }
  return toInsert.length;
};

export async function GET(req) { return handleBatch(req); }
export async function POST(req) { return handleBatch(req); }

async function handleBatch(req) {
  try {
    console.log('🚀 batch-generate route hit');
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const token = authHeader?.replace('Bearer ', '');
      const vercelCron = req.headers.get('x-vercel-cron');
      if (!vercelCron && token !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
      }
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const batchId = `cron-${new Date().toISOString().slice(0,10)}`;
    const subjects = getWeeklySubjects();
    const log = [`Batch ${batchId}: subjects=${subjects.join(',')}`];
    let total = 0;

    await supabase.from('batch_log').upsert({
      batch_id: batchId,
      subject: subjects.join(','),
      questions_generated: 0,
      model_used: MODEL,
      status: 'running',
    }, { onConflict: 'batch_id' });

    for (const subject of subjects) {
      for (const year of [1,2,3,4,5,6]) {
        total += await generateForSubject(supabase, subject, year, batchId, log);
        await sleep(600);
      }
    }

    await supabase.from('batch_log').update({
      questions_generated: total,
      status: 'complete',
    }).eq('batch_id', batchId);

    return NextResponse.json({ ok: true, total, batchId, log });
  } catch (error) {
    console.error('🔥 Unhandled exception in batch-generate:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}