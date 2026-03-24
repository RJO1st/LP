/**
 * LaunchPard — Batch Generate v2
 * File: src/app/api/batch-generate/route.js
 *
 * Priority-queue strategy: every run calculates which curriculum×subject×year×tier
 * cells are most under-populated and fills the top MAX_CELLS_PER_RUN of them.
 *
 * vercel.json — one cron per curriculum (6 total, within Pro limit of 10):
 *   { "path": "/api/batch-generate?curriculum=uk_11plus",      "schedule": "0 1 * * *" }
 *   { "path": "/api/batch-generate?curriculum=uk_national",    "schedule": "0 5 * * *" }
 *   { "path": "/api/batch-generate?curriculum=us_common_core", "schedule": "0 9 * * *" }
 *   { "path": "/api/batch-generate?curriculum=australian",     "schedule": "0 13 * * *" }
 *   { "path": "/api/batch-generate?curriculum=ib_pyp",         "schedule": "0 17 * * *" }
 *   { "path": "/api/batch-generate?curriculum=waec",           "schedule": "0 21 * * *" }
 *
 * Manual override:
 *   /api/batch-generate?curriculum=waec&subject=maths&tier=mastering
 *
 * Per-run budget (Vercel Pro 60s): 8 cells × 1 OpenRouter call × ~6s ≈ 50s ✅
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse }  from 'next/server';

// ─── CURRICULA CONFIG ────────────────────────────────────────────────────────
const CURRICULA = {
  uk_11plus: {
    name:       'UK 11+',
    subjects:   ['maths','english','verbal','nvr'],
    grades:     [3,4,5,6],
    gradeLabel: 'Year',
    region:     'GL',
    spelling:   'British English',
    context:    'UK 11+ selective secondary school entrance examination (GL Assessment / CEM format)',
    examples:   'British contexts: pounds sterling (£), kilometres, UK cities/landmarks, British nature',
  },
  uk_national: {
    name:       'UK National Curriculum',
    subjects:   ['maths','english','verbal','nvr','science'],
    grades:     [1,2,3,4,5,6],
    gradeLabel: 'Year',
    region:     'GL',
    spelling:   'British English',
    context:    'UK National Curriculum KS1–KS2 (SATs-aligned)',
    examples:   'British everyday contexts: pounds sterling (£), metres/kilometres, UK schools, seasons',
  },
  us_common_core: {
    name:       'US Common Core',
    subjects:   ['maths','english','science','geography'],
    grades:     [1,2,3,4,5,6,7,8],
    gradeLabel: 'Grade',
    region:     'US',
    spelling:   'American English',
    context:    'US Common Core State Standards',
    examples:   'American contexts: dollars ($), miles/yards, US cities/states, American history/culture',
  },
  australian: {
    name:       'Australian Curriculum',
    subjects:   ['maths','english','verbal','science'],
    grades:     [1,2,3,4,5,6],
    gradeLabel: 'Year',
    region:     'AU',
    spelling:   'Australian English',
    context:    'Australian Curriculum (ACARA), NAPLAN-style assessment',
    examples:   'Australian contexts: dollars (A$), kilometres, Australian animals/geography, local scenarios',
  },
  ib_pyp: {
    name:       'IB Primary Years (PYP)',
    subjects:   ['maths','english','science','geography','history'],
    grades:     [1,2,3,4,5],
    gradeLabel: 'Grade',
    region:     'IB',
    spelling:   'International English',
    context:    'IB Primary Years Programme — inquiry-based, conceptual, transdisciplinary',
    examples:   'International contexts: global scenarios, multicultural examples, inclusive language',
  },
  waec: {
    name:       'WAEC / Nigerian',
    subjects:   ['maths','english','verbal','science','geography','history'],
    grades:     [7,8,9,10,11,12],
    gradeLabel: 'Year',
    region:     'NG',
    spelling:   'British English',
    context:    'WAEC/NECO Nigerian secondary school curriculum',
    examples:   'Nigerian contexts: naira (₦), Nigerian geography/history, West African scenarios',
  },
};

// ─── DIFFICULTY TIERS ────────────────────────────────────────────────────────
const DIFFICULTY_TIERS = [
  {
    label:      'foundation',
    difficulty: 25,
    desc:       'foundational level — simple vocabulary, direct single-concept questions, clear scaffolding, appropriate for students new to this topic',
  },
  {
    label:      'developing',
    difficulty: 55,
    desc:       'developing level — moderate complexity, requires application of learned concepts, standard exam difficulty',
  },
  {
    label:      'mastering',
    difficulty: 85,
    desc:       'mastery level — complex multi-step reasoning, nuanced language, challenge problems suitable for high-attaining students',
  },
];

// ── Config ──────────────────────────────────────────────────────────────────
const TARGET_PER_CELL   = 20;
const RATE_LIMIT_MS     = 1200;
const BATCH_SIZE        = 5;
const MAX_CELLS_PER_RUN = 8;
const MODEL             = 'openai/gpt-4o-mini';

const CURRICULUM_CONFIG = {
  uk_11plus: {
    label:    'UK 11+ (GL/CEM)',
    subjects: ['maths', 'english', 'verbal', 'nvr'],
    years:    [3, 4, 5, 6],
  },
  uk_ks2: {
    label:    'UK Key Stage 2',
    subjects: ['maths', 'english', 'science'],
    years:    [1, 2, 3, 4, 5, 6],
  },
  waec: {
    label:    'WAEC / Nigerian Primary',
    subjects: ['maths', 'english', 'basic_science', 'social_studies'],
    years:    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  us_common_core: {
    label:    'US Common Core',
    subjects: ['math', 'ela', 'science', 'social_studies'],
    years:    [1, 2, 3, 4, 5, 6],
  },
  australia_ac: {
    label:    'Australian Curriculum v9',
    subjects: ['maths', 'english', 'science', 'hass'],
    years:    [1, 2, 3, 4, 5, 6],
  },
};

// ─── PROMPT BUILDER ──────────────────────────────────────────────────────────
function buildPrompt(curriculumKey, currConfig, subject, grade, tier, n) {
  const { name, gradeLabel, context, examples, spelling } = currConfig;

  // Reusable JSON schemas for the model
  const MCQ    = `{"q":"...","question_type":"mcq","opts":["A","B","C","D"],"a":0,"exp":"...","topic":"...","difficulty":${tier.difficulty},"hints":["Directional hint","Structural hint","Near-answer hint"]}`;
  const FILL   = `{"q":"The ___ carries blood from the heart.","question_type":"fill_blank","opts":["A","B","C","D"],"a":0,"exp":"...","topic":"...","difficulty":${tier.difficulty},"hints":["Think about circulatory system parts"]}`;
  const FREE   = `{"q":"...","question_type":"free_text","answer":"exact answer","answerAliases":["alternate"],"exp":"...","topic":"...","difficulty":${tier.difficulty},"hints":["Hint 1","Hint 2"]}`;
  const MULTI  = `{"q":"Select ALL correct statements...","question_type":"multi_select","opts":["A","B","C","D"],"a":[0,2],"exp":"...","topic":"...","difficulty":${tier.difficulty},"hints":["There are two correct answers"]}`;
  const STEP   = `{"q":"Word problem...","question_type":"multi_step","steps":[{"prompt":"First, what is X?","answer":"5"},{"prompt":"Now using X, calculate Y.","answer":"12"}],"exp":"Full explanation","topic":"...","difficulty":${tier.difficulty},"hints":["Think about what operation is needed first"]}`;

  const HINTS_RULE = `HINTS: Each question MUST have a "hints" array (1–3 items). Hint 1 = directional (no spoilers). Hint 2 = structural (what to look for). Hint 3 = near-answer (almost gives it away). Never reveal the answer outright in hints 1 or 2.`;

  // ── MATHS ────────────────────────────────────────────────────────────────
  if (subject === 'mathematics' || subject === 'maths') {
    const useSteps = tier.difficulty >= 45 && grade >= 3;
    const topics    = grade <= 2
      ? 'addition, subtraction, counting, simple shapes, measurement'
      : grade <= 4
      ? 'multiplication, division, fractions, decimals, mental arithmetic, area & perimeter'
      : grade <= 6
      ? 'fractions, percentages, ratios, algebra foundations, geometry, data handling'
      : 'algebra, equations, indices, probability, statistics, advanced geometry';

    return `You are generating ${n} ${name} Mathematics questions for ${gradeLabel} ${grade} students.
Curriculum: ${context}
Difficulty: ${tier.desc}
Topics to cover: ${topics}
Use ${spelling} and ${examples}.
${HINTS_RULE}

Question mix:
${useSteps ? `- At least 2 multi-step word problems: ${STEP}` : ''}
- Remaining as MCQ word problems: ${MCQ}
- Avoid trick questions. Every question must be unambiguously solvable at ${gradeLabel} ${grade} level.

Output ONLY valid JSON:
{"questions":[${useSteps ? STEP : MCQ}, ${MCQ}]}`;
  }

  // ── ENGLISH ──────────────────────────────────────────────────────────────
  if (subject === 'english') {
    if (grade <= 2) {
      return `Generate ${n} ${name} English questions for ${gradeLabel} ${grade} students.
Curriculum: ${context}
Difficulty: ${tier.desc}
Use ${spelling}.
${HINTS_RULE}

Mix: 2× MCQ (grammar/vocabulary), 2× fill-blank (simple sentences), 1× MCQ (basic comprehension of a 2-sentence scenario).

Output ONLY valid JSON:
{"questions":[${FILL}, ${MCQ}]}`;
    }

    const wordCount = grade <= 3 ? 150 : grade <= 5 ? 250 : grade <= 8 ? 350 : 420;
    return `Generate a ${wordCount}-word reading passage then ${n} questions for ${name} ${gradeLabel} ${grade}.
Curriculum: ${context}
Difficulty: ${tier.desc}
Spelling & style: ${spelling}
Context: ${examples}
${HINTS_RULE}

Passage: ${grade >= 5 ? 'non-fiction or structured narrative with varied vocabulary' : 'accessible narrative or informational text'}.

Questions required:
- 2× MCQ retrieval (literal): ${MCQ}
- 1× MCQ inference: ${MCQ}
- 1× fill-blank vocabulary: ${FILL}
- ${grade >= 4 ? `1× free-text explanation (1–2 sentences expected): ${FREE}` : `1× MCQ grammar: ${MCQ}`}

Output ONLY valid JSON:
{"passage":"[${wordCount}-word passage]","questions":[...5 items...]}`;
  }

  // ── VERBAL ───────────────────────────────────────────────────────────────
  if (subject === 'verbal') {
    return `Create ${n} verbal reasoning questions for ${name} ${gradeLabel} ${grade} students.
Curriculum: ${context}
Difficulty: ${tier.desc}
Use ${spelling}.
${HINTS_RULE}

Mix: word analogies, odd-one-out, code-breaking, word relationships, synonyms/antonyms.
All MCQ, 4 options, exactly one correct answer.

Output ONLY valid JSON:
{"questions":[${MCQ}]}`;
  }

  // ── NVR ──────────────────────────────────────────────────────────────────
  if (subject === 'nvr') {
    return `Create ${n} non-verbal reasoning questions described in plain text for ${name} ${gradeLabel} ${grade}.
Difficulty: ${tier.desc}
${HINTS_RULE}

Represent shapes/patterns using ASCII-safe text only.
Types: series completion (△ ○ □ △ ○ ___), matrix problems (rows/columns of shapes), odd-one-out by property, rotation/reflection described in words, analogies.
All MCQ, 4 text-described options.

Output ONLY valid JSON:
{"questions":[${MCQ}]}`;
  }

  // ── SCIENCE ──────────────────────────────────────────────────────────────
  if (subject === 'science') {
    const sciTopics = {
      1: 'living/non-living things, animals, everyday materials, seasons',
      2: 'plants, animal habitats, uses of materials, health basics',
      3: 'rocks and soil, light and shadows, forces and magnets, plants',
      4: 'sound, electricity and circuits, habitats and food chains, digestion',
      5: 'properties of materials, Earth and space, forces: gravity and air resistance',
      6: 'evolution and inheritance, light, electricity, circulatory system',
      7: 'cells and organisation, particles, forces and motion, energy',
      8: 'elements and compounds, organ systems, waves, chemical reactions',
      9: 'atomic structure, genetics, energy transfer, chemical equations',
    };
    const topics = sciTopics[grade] || 'general science concepts';

    return `Generate ${n} ${name} Science questions for ${gradeLabel} ${grade}.
Curriculum: ${context}
Topics: ${topics}
Difficulty: ${tier.desc}
Use ${spelling} and ${examples}.
${HINTS_RULE}

Mix:
- 2× MCQ factual recall: ${MCQ}
- 1× multi-select "select ALL correct": ${MULTI}
- ${tier.difficulty >= 55 ? `1× free-text short answer: ${FREE}` : `1× MCQ application: ${MCQ}`}
- 1× MCQ experimental/analytical thinking

Output ONLY valid JSON:
{"questions":[...5 items...]}`;
  }

  // ── GEOGRAPHY ────────────────────────────────────────────────────────────
  if (subject === 'geography') {
    const geoTopics = {
      US: 'US and world geography, physical features, climate, human-environment interaction, map skills',
      IB: 'global geography, climate zones, urbanisation, sustainability, global interconnections',
      NG: 'Nigerian and West African geography, physical geography, climate, economic geography, population',
      AU: 'Australian geography, Asia-Pacific, environments, sustainable development',
    };
    const topics = geoTopics[currConfig.region] || 'world geography, physical and human geography';

    return `Generate ${n} ${name} Geography questions for ${gradeLabel} ${grade}.
Curriculum: ${context}
Topics: ${topics}
Difficulty: ${tier.desc}
Use ${spelling} and ${examples}.
${HINTS_RULE}

Mix: 3× MCQ, 1× free-text (name/locate/describe a maximum of one sentence), 1× MCQ data/map interpretation.

Output ONLY valid JSON:
{"questions":[${MCQ}, ${FREE}]}`;
  }

  // ── HISTORY ──────────────────────────────────────────────────────────────
  if (subject === 'history') {
    const histTopics = {
      IB: 'ancient civilisations, exploration, rights and responsibilities, innovation, interconnection',
      NG: 'pre-colonial West Africa, transatlantic trade, colonialism, independence movements, modern Nigeria',
    };
    const topics = histTopics[currConfig.region] || 'historical events, cause and consequence, change and continuity';

    return `Generate ${n} ${name} History questions for ${gradeLabel} ${grade}.
Curriculum: ${context}
Topics: ${topics}
Difficulty: ${tier.desc}
Use ${spelling} and ${examples}.
${HINTS_RULE}

Mix: 2× MCQ factual, 1× MCQ source/evidence interpretation, 1× free-text cause-and-consequence (1 sentence expected), 1× MCQ significance/chronology.

Output ONLY valid JSON:
{"questions":[${MCQ}, ${FREE}]}`;
  }

  // Generic fallback
  return `Generate ${n} ${name} ${subject} questions for ${gradeLabel} ${grade}. Difficulty: ${tier.desc}. ${HINTS_RULE}
Output ONLY valid JSON: {"questions":[${MCQ}]}`;
}

// ─── VALIDATE QUESTION ────────────────────────────────────────────────────────
function validateQuestion(q) {
  if (!q?.q || typeof q.q !== 'string' || q.q.trim().length < 8) return false;
  const type = q.question_type || 'mcq';
  if (type === 'free_text')    return typeof q.answer === 'string' && q.answer.length > 0;
  if (type === 'multi_step')   return Array.isArray(q.steps) && q.steps.length >= 2 && q.steps.every(s => s.prompt && s.answer !== undefined);
  if (type === 'multi_select') return Array.isArray(q.opts) && q.opts.length === 4 && Array.isArray(q.a) && q.a.length >= 2;
  // mcq / fill_blank
  return Array.isArray(q.opts) && q.opts.length === 4 && typeof q.a === 'number' && q.a >= 0 && q.a <= 3;
}

// ─── OPENROUTER CALLER ───────────────────────────────────────────────────────
async function callOpenRouter(prompt) {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', signal: controller.signal,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer':  'https://launchpard.com',
        'X-Title':       'LaunchPard Batch',
      },
      body: JSON.stringify({
        model:    MODEL,
        messages: [
          { role: 'system', content: 'Output ONLY valid JSON. No markdown fences. No trailing commas. No commentary.' },
          { role: 'user',   content: prompt },
        ],
        max_tokens: 6000, temperature: 0.8,
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) { const t = await res.text(); throw new Error(`OpenRouter ${res.status}: ${t.slice(0, 200)}`); }
    const data = await res.json();
    const raw  = (data.choices[0].message.content || '')
      .trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    const start = raw.indexOf('{'); const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found');
    return JSON.parse(raw.slice(start, end + 1));
  } catch (err) {
    clearTimeout(timeout);
    throw err.name === 'AbortError' ? new Error('OpenRouter timed out') : err;
  }
}

// ─── PRIORITY CELL SELECTOR ──────────────────────────────────────────────────
// Uses a single RPC call per curriculum (not 90+ COUNT queries)
async function getPriorityCells(supabase, curriculumKey, currConfig, subjectOverride, tierOverride) {
  // One aggregation query returns all cell counts for this curriculum
  const { data: counts, error } = await supabase.rpc('get_cell_counts', {
    p_curriculum: curriculumKey,
  });

  if (error) throw new Error(`get_cell_counts RPC error: ${error.message}`);

  // Build lookup: "subject|year|tier" → count
  const countMap = {};
  for (const row of counts ?? []) {
    countMap[`${row.subject}|${row.year_level}|${row.difficulty_tier}`] = Number(row.cell_count);
  }

  const cells = [];
  for (const subject of currConfig.subjects) {
    if (subjectOverride && subjectOverride !== subject) continue;
    for (const grade of currConfig.grades) {
      for (const tier of DIFFICULTY_TIERS) {
        if (tierOverride && tierOverride !== tier.label) continue;
        const current = countMap[`${subject}|${grade}|${tier.label}`] ?? 0;
        const deficit = TARGET_PER_CELL - current;
        if (deficit > 0) cells.push({ curriculumKey, currConfig, subject, grade, tier, current, deficit });
      }
    }
  }

  // Sort: highest deficit first; then foundation before developing before mastering
  const tierOrder = { foundation: 0, developing: 1, mastering: 2 };
  return cells.sort((a, b) => b.deficit - a.deficit || tierOrder[a.tier.label] - tierOrder[b.tier.label]);
}

// ─── CELL PROCESSOR ──────────────────────────────────────────────────────────
async function processCell(supabase, { curriculumKey, currConfig, subject, grade, tier, current }, batchId, log) {
  const needed = TARGET_PER_CELL - current;
  if (needed <= 0) { log.push(`${curriculumKey} ${subject} Y${grade} ${tier.label}: at target`); return 0; }

  // Fetch existing texts for dedup (within this cell)
  const { data: existing } = await supabase
    .from('question_bank')
    .select('question_text')
    .eq('curriculum', curriculumKey).eq('subject', subject)
    .eq('year_level', grade).eq('difficulty_tier', tier.label);
  const seenTexts = new Set((existing ?? []).map(r => normalise(r.question_text)));

  const toInsert = [];

  try {
    const prompt = buildPrompt(curriculumKey, currConfig, subject, grade, tier, BATCH_SIZE);
    const gen = await callOpenRouter(prompt);
    if (!gen?.questions || !Array.isArray(gen.questions)) throw new Error('Invalid response structure');

    for (const q of gen.questions) {
      if (!validateQuestion(q)) continue;
      const norm = normalise(q.q);
      if (seenTexts.has(norm)) continue;
      seenTexts.add(norm);
      toInsert.push({
        curriculum: curriculumKey,
        subject,
        year_level: grade,
        difficulty_tier: tier.label,
        question_text: q.q,
        question_data: JSON.stringify(q),
        batch_id: batchId,
        created_at: new Date().toISOString(),
      });
      if (toInsert.length >= needed) break;
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from('question_bank').insert(toInsert);
      if (error) throw new Error(`Insert error: ${error.message}`);
      log.push(`✓ ${curriculumKey} ${subject} Y${grade} ${tier.label}: +${toInsert.length} (${current} → ${current + toInsert.length})`);
      return toInsert.length;
    }
    log.push(`⚠ ${curriculumKey} ${subject} Y${grade} ${tier.label}: 0 new (duplicates only)`);
    return 0;
  } catch (err) {
    log.push(`✗ ${curriculumKey} ${subject} Y${grade} ${tier.label}: ${err.message}`);
    return 0;
  }
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────
function normalise(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── ROUTE HANDLERS ──────────────────────────────────────────────────────────
export async function GET(req)  { return handleBatch(req); }
export async function POST(req) { return handleBatch(req); }

async function handleBatch(req) {
  try {
    // Auth
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

    // Parse query params
    const { searchParams } = new URL(req.url);
    const curriculumOverride = searchParams.get('curriculum');
    const subjectOverride    = searchParams.get('subject')  || null;
    const tierOverride       = searchParams.get('tier')     || null;

    // Must specify a valid curriculum (or cycle by hour as fallback)
    const curriculumKeys = Object.keys(CURRICULA);
    const curriculumKey  = curriculumKeys.includes(curriculumOverride)
      ? curriculumOverride
      : curriculumKeys[new Date().getHours() % curriculumKeys.length];
    const currConfig = CURRICULA[curriculumKey];

    const batchId = `${curriculumKey}-${new Date().toISOString().slice(0,16).replace('T','-')}`;
    const log     = [`Batch ${batchId} | curriculum=${curriculumKey} subject=${subjectOverride||'all'} tier=${tierOverride||'all'}`];

    await supabase.from('batch_log').insert({
      batch_id: batchId, curriculum: curriculumKey,
      subject: subjectOverride || 'mixed', questions_generated: 0,
      model_used: MODEL, status: 'running',
    });

    // Calculate priority cells (1 RPC call)
    const cells     = await getPriorityCells(supabase, curriculumKey, currConfig, subjectOverride, tierOverride);
    const toProcess = cells.slice(0, MAX_CELLS_PER_RUN);

    log.push(`Deficient cells: ${cells.length}. Processing: ${toProcess.length}.`);
    if (cells.length === 0) {
      log.push(`🎉 ${curriculumKey} is fully stocked — nothing to do.`);
      await supabase.from('batch_log').update({ status: 'complete', questions_generated: 0 }).eq('batch_id', batchId);
      return NextResponse.json({ ok: true, total: 0, batchId, log });
    }

    let total = 0;
    for (let i = 0; i < toProcess.length; i++) {
      total += await processCell(supabase, toProcess[i], batchId, log);
      if (i < toProcess.length - 1) await sleep(RATE_LIMIT_MS);
    }

    await supabase.from('batch_log')
      .update({ questions_generated: total, status: 'complete' })
      .eq('batch_id', batchId);

    return NextResponse.json({
      ok:                  true,
      curriculum:          curriculumKey,
      total,
      batchId,
      cellsProcessed:      toProcess.length,
      totalDeficientCells: cells.length,
      remainingDeficit:    cells.slice(MAX_CELLS_PER_RUN).reduce((s, c) => s + c.deficit, 0),
      log,
    });
  } catch (err) {
    console.error('[batch-generate] unhandled error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}