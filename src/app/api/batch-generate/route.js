/**
 * LaunchPard — Batch Generate v3 (Topic-Aware, IXL-Level Coverage)
 * File: src/app/api/batch-generate/route.js
 *
 * Daily cron per curriculum — fills under-populated topic cells.
 * Topic definitions from src/lib/topicDefinitions.js ensure IXL-level granularity.
 *
 * Manual override:
 *   /api/batch-generate?curriculum=uk_national&subject=mathematics&tier=developing
 *
 * Per-run budget (Vercel Pro 60s): 12 cells × 1 OpenRouter call × ~4s ≈ 48s ✅
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse }  from 'next/server';
import { getTopicsForSubjectYear } from '@/lib/topicDefinitions';

// Vercel cron invocations need extended timeout (Pro plan: 60s max)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// ─── UNIFIED CURRICULUM CONFIG ────────────────────────────────────────────────
// Merged: canonical subjects/years from curriculumConfig.js + prompt context for buildPrompt
const CURRICULA = {
  uk_11plus: {
    name:       'UK 11+ (GL/CEM)',
    subjects:   ['mathematics', 'english', 'verbal_reasoning', 'nvr', 'science'],
    grades:     [3, 4, 5, 6],
    gradeLabel: 'Year',
    region:     'GL',
    spelling:   'British English',
    context:    'UK 11+ selective secondary school entrance examination (GL Assessment / CEM format)',
    examples:   'British contexts: pounds sterling (£), kilometres, UK cities/landmarks, British nature',
  },
  uk_national: {
    name:       'UK National Curriculum',
    subjects:   ['mathematics', 'english', 'science', 'computing', 'history', 'geography'],
    grades:     [1, 2, 3, 4, 5, 6, 7, 8, 9],
    gradeLabel: 'Year',
    region:     'GL',
    spelling:   'British English',
    context:    'UK National Curriculum KS1–KS4 (SATs/GCSE-aligned)',
    examples:   'British everyday contexts: pounds sterling (£), metres/kilometres, UK schools, seasons',
  },
  us_common_core: {
    name:       'US Common Core',
    subjects:   ['math', 'ela', 'science', 'social_studies'],
    grades:     [1, 2, 3, 4, 5, 6, 7, 8],
    gradeLabel: 'Grade',
    region:     'US',
    spelling:   'American English',
    context:    'US Common Core State Standards',
    examples:   'American contexts: dollars ($), miles/yards, US cities/states, American history/culture',
  },
  aus_acara: {
    name:       'Australian Curriculum (ACARA)',
    subjects:   ['mathematics', 'english', 'science', 'hass'],
    grades:     [1, 2, 3, 4, 5, 6],
    gradeLabel: 'Year',
    region:     'AU',
    spelling:   'Australian English',
    context:    'Australian Curriculum (ACARA), NAPLAN-style assessment',
    examples:   'Australian contexts: dollars (A$), kilometres, Australian animals/geography, local scenarios',
  },
  ib_pyp: {
    name:       'IB Primary Years (PYP)',
    subjects:   ['mathematics', 'english', 'science', 'geography', 'history'],
    grades:     [1, 2, 3, 4, 5],
    gradeLabel: 'Grade',
    region:     'IB',
    spelling:   'International English',
    context:    'IB Primary Years Programme — inquiry-based, conceptual, transdisciplinary',
    examples:   'International contexts: global scenarios, multicultural examples, inclusive language',
  },
  ib_myp: {
    name:       'IB Middle Years (MYP)',
    subjects:   ['mathematics', 'english', 'science', 'humanities'],
    grades:     [1, 2, 3, 4, 5],
    gradeLabel: 'Year',
    region:     'IB',
    spelling:   'International English',
    context:    'IB Middle Years Programme — concept-driven, inquiry-based, interdisciplinary',
    examples:   'International contexts: global scenarios, multicultural examples, inclusive language',
  },
  ng_primary: {
    name:       'Nigerian Primary (Basic 1-6)',
    subjects:   ['mathematics', 'english_studies', 'basic_science', 'social_studies', 'civic_education'],
    grades:     [1, 2, 3, 4, 5, 6],
    gradeLabel: 'Primary',
    region:     'NG',
    spelling:   'British English',
    context:    'Nigerian Basic Education Curriculum (NERDC) — Primary school level',
    examples:   'Nigerian contexts: naira (₦), Nigerian geography/culture, West African scenarios',
  },
  ng_jss: {
    name:       'Nigerian JSS (Basic 7-9)',
    subjects:   ['mathematics', 'english_studies', 'basic_science', 'social_studies', 'civic_education'],
    grades:     [1, 2, 3],
    gradeLabel: 'JSS',
    region:     'NG',
    spelling:   'British English',
    context:    'Nigerian Basic Education Curriculum (NERDC) — Junior Secondary School level',
    examples:   'Nigerian contexts: naira (₦), Nigerian geography/history, West African scenarios',
  },
  ng_sss: {
    name:       'Nigerian SSS (SS 1-3)',
    subjects:   ['mathematics', 'english', 'physics', 'chemistry', 'biology', 'economics', 'government', 'commerce', 'civic_education'],
    grades:     [1, 2, 3],
    gradeLabel: 'SS',
    region:     'NG',
    spelling:   'British English',
    context:    'WAEC/NECO Nigerian Senior Secondary School curriculum',
    examples:   'Nigerian contexts: naira (₦), Nigerian geography/history, West African scenarios',
  },
  ca_primary: {
    name:       'Canadian Primary (Grade 1-8)',
    subjects:   ['mathematics', 'english', 'science', 'social_studies'],
    grades:     [1, 2, 3, 4, 5, 6, 7, 8],
    gradeLabel: 'Grade',
    region:     'CA',
    spelling:   'Canadian English',
    context:    'Canadian provincial curricula (Ontario / BC / Alberta aligned)',
    examples:   'Canadian contexts: Canadian dollars (CAD), kilometres, Canadian geography/history, multicultural scenarios',
  },
  ca_secondary: {
    name:       'Canadian Secondary (Grade 9-12)',
    subjects:   ['mathematics', 'english', 'science', 'canadian_history', 'geography'],
    grades:     [9, 10, 11, 12],
    gradeLabel: 'Grade',
    region:     'CA',
    spelling:   'Canadian English',
    context:    'Canadian provincial curricula — secondary level (Ontario / BC / Alberta aligned)',
    examples:   'Canadian contexts: Canadian dollars (CAD), kilometres, Canadian history/geography, diverse communities',
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

// ── Config (1000 questions/day target across 11 curricula) ──────────────────
const TARGET_PER_CELL   = 50;   // 50 questions per cell — deep coverage per topic
const RATE_LIMIT_MS     = 1500; // 1.5s between calls — balanced pacing
const BATCH_SIZE        = 8;    // 8 questions per API call — higher yield per call
const MAX_CELLS_PER_RUN = 16;   // 16 cells × 1 call × 8 Qs ≈ ~90 raw Qs per cron
                                // 11 crons × 90 × 70% validation ≈ ~700 net/day
                                // + some cells generate 2 calls → ~1000/day

// Ultra-cheap model rotation — all under $0.20/1M input tokens
const BATCH_MODELS = [
  'openai/gpt-4o-mini',                          // $0.15/$0.60 per 1M — reliable baseline
  'google/gemini-2.5-flash-lite-preview-09-2025', // ultra-cheap Gemini
  'google/gemini-2.0-flash-lite-001',             // fast Gemini lite
  'deepseek/deepseek-v3.2',                       // strong reasoning
  'qwen/qwen3-30b-a3b-instruct-2507',            // strong maths
  'openai/gpt-oss-20b',                           // compact OpenAI
  'openai/gpt-oss-120b',                          // larger OpenAI
  'xiaomi/mimo-v2-flash',                         // fast + cheap
  'meta-llama/llama-3.3-70b-instruct',           // strong instruction following
  'mistralai/mistral-small-3.1-24b-instruct',    // fast Mistral
  'arcee-ai/trinity-large-preview:free',          // free tier
  'google/gemma-3-27b-it:free',                   // free tier
  'qwen/qwen3.5-9b',                              // compact Qwen
  'microsoft/phi-4',                               // strong reasoning for size
  'meta-llama/llama-4-scout:free',                // free tier
];
function pickBatchModel() {
  return BATCH_MODELS[Math.floor(Math.random() * BATCH_MODELS.length)];
}

// ─── PROMPT BUILDER ──────────────────────────────────────────────────────────
function buildPrompt(curriculumKey, currConfig, subject, grade, tier, n, topicHint) {
  const { name, gradeLabel, context, examples, spelling } = currConfig;

  // Reusable JSON schemas for the model
  const MCQ    = `{"q":"...","question_type":"mcq","opts":["A","B","C","D"],"a":0,"exp":"...","topic":"...","difficulty":${tier.difficulty},"hints":["Directional hint","Structural hint","Near-answer hint"]}`;
  const FILL   = `{"q":"The ___ carries blood from the heart.","question_type":"fill_blank","opts":["A","B","C","D"],"a":0,"exp":"...","topic":"...","difficulty":${tier.difficulty},"hints":["Think about circulatory system parts"]}`;
  const FREE   = `{"q":"...","question_type":"free_text","answer":"exact answer","answerAliases":["alternate"],"exp":"...","topic":"...","difficulty":${tier.difficulty},"hints":["Hint 1","Hint 2"]}`;
  const MULTI  = `{"q":"Select ALL correct statements...","question_type":"multi_select","opts":["A","B","C","D"],"a":[0,2],"exp":"...","topic":"...","difficulty":${tier.difficulty},"hints":["There are two correct answers"]}`;
  const STEP   = `{"q":"Word problem...","question_type":"multi_step","steps":[{"prompt":"First, what is X?","answer":"5"},{"prompt":"Now using X, calculate Y.","answer":"12"}],"exp":"Full explanation","topic":"...","difficulty":${tier.difficulty},"hints":["Think about what operation is needed first"]}`;

  const HINTS_RULE = `HINTS: Each question MUST have a "hints" array (1–3 items). Hint 1 = directional (no spoilers). Hint 2 = structural (what to look for). Hint 3 = near-answer (almost gives it away). Never reveal the answer outright in hints 1 or 2.`;

  const UNIQUENESS_RULE = `UNIQUENESS: Every question MUST be distinctly different. Vary the scenario, numbers, context, and wording. Do NOT produce two questions that test the same concept with only superficial changes (e.g., swapping "apples" for "oranges"). Each question should feel like a fresh challenge.`;

  const NO_VISUAL_REFS_RULE = `VISUAL REFERENCES BAN: NEVER write "look at the diagram", "the picture shows", "shown below", "as seen in the image", "refer to the graph", "the table below", "the chart shows", "the map shows", or ANY phrase that implies a visual/image/diagram/picture/table/chart/map/graph is attached. The student will ONLY see your text — there is no accompanying image. All information must be SELF-CONTAINED in the question text. If a question needs data, write it inline (e.g., "The heights in cm are: 12, 15, 18, 22"). If a question involves a shape, describe it in words (e.g., "A rectangle has length 8cm and width 5cm").`;

  // ── MATHS ────────────────────────────────────────────────────────────────
  if (subject === 'mathematics' || subject === 'maths' || subject === 'math' || subject === 'further_mathematics') {
    const useSteps = tier.difficulty >= 45 && grade >= 3;
    const topics = topicHint || (grade <= 2
      ? 'addition, subtraction, counting, simple shapes, measurement'
      : grade <= 4
      ? 'multiplication, division, fractions, decimals, mental arithmetic, area & perimeter'
      : grade <= 6
      ? 'fractions, percentages, ratios, algebra foundations, geometry, data handling'
      : 'algebra, equations, indices, probability, statistics, advanced geometry');

    return `You are generating ${n} ${name} Mathematics questions for ${gradeLabel} ${grade} students.
Curriculum: ${context}
Difficulty: ${tier.desc}
Topics to cover (MUST generate questions specifically on these): ${topics}
Use ${spelling} and ${examples}.
${HINTS_RULE}
${UNIQUENESS_RULE}
${NO_VISUAL_REFS_RULE}

CRITICAL MATH ACCURACY RULES — FOLLOW EXACTLY:
1. COMPUTE EVERY ANSWER YOURSELF before writing the question. Double-check arithmetic.
2. The correct option (index "a") MUST be the mathematically correct result. Verify: if the question says "450 + 350 - 100", the answer MUST be 700, not 650 or any other number.
3. If the question includes a passage or context with arithmetic, the passage arithmetic MUST match the correct answer exactly.
4. NEVER generate a question where the explanation contradicts the marked answer.
5. ALL four options must be distinct numbers. No duplicates.
6. The "exp" (explanation) field must show the working and arrive at the SAME answer as option index "a".
7. The "topic" field must accurately reflect the PRIMARY operation: use "addition" only if the main skill is adding, "subtraction" for subtracting, "word_problems" for multi-step problems mixing operations.
8. SELF-CHECK: After generating each question, mentally verify: question text → compute → does option[a] match? Does explanation match? If not, fix it before including.

Question mix:
${useSteps ? `- At least 2 multi-step word problems: ${STEP}` : ''}
- Remaining as MCQ word problems: ${MCQ}
- Avoid trick questions. Every question must be unambiguously solvable at ${gradeLabel} ${grade} level.

Output ONLY valid JSON:
{"questions":[${useSteps ? STEP : MCQ}, ${MCQ}]}`;
  }

  // ── ENGLISH ──────────────────────────────────────────────────────────────
  if (subject === 'english' || subject === 'english_studies' || subject === 'ela' || subject === 'literature') {
    if (grade <= 2) {
      return `Generate ${n} ${name} English questions for ${gradeLabel} ${grade} students.
Curriculum: ${context}
Difficulty: ${tier.desc}
${topicHint ? `Focus topics: ${topicHint}` : ''}
Use ${spelling}.
${HINTS_RULE}
${UNIQUENESS_RULE}
${NO_VISUAL_REFS_RULE}

Mix: 2× MCQ (grammar/vocabulary), 2× fill-blank (simple sentences), 1× MCQ (basic comprehension of a 2-sentence scenario).

Output ONLY valid JSON:
{"questions":[${FILL}, ${MCQ}]}`;
    }

    const wordCount = grade <= 3 ? 150 : grade <= 5 ? 250 : grade <= 8 ? 350 : 420;
    return `Generate a ${wordCount}-word reading passage then ${n} questions for ${name} ${gradeLabel} ${grade}.
Curriculum: ${context}
Difficulty: ${tier.desc}
${topicHint ? `Focus topics: ${topicHint}` : ''}
Spelling & style: ${spelling}
Context: ${examples}
${HINTS_RULE}
${UNIQUENESS_RULE}
${NO_VISUAL_REFS_RULE}

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
  if (subject === 'verbal' || subject === 'verbal_reasoning') {
    return `Create ${n} verbal reasoning questions for ${name} ${gradeLabel} ${grade} students.
Curriculum: ${context}
Difficulty: ${tier.desc}
${topicHint ? `Focus types: ${topicHint}` : ''}
Use ${spelling}.
${HINTS_RULE}
${UNIQUENESS_RULE}
${NO_VISUAL_REFS_RULE}

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
${UNIQUENESS_RULE}
${NO_VISUAL_REFS_RULE}

Represent shapes/patterns using ASCII-safe text only.
Types: series completion (△ ○ □ △ ○ ___), matrix problems (rows/columns of shapes), odd-one-out by property, rotation/reflection described in words, analogies.
All MCQ, 4 text-described options.

Output ONLY valid JSON:
{"questions":[${MCQ}]}`;
  }

  // ── SCIENCE ──────────────────────────────────────────────────────────────
  if (subject === 'science' || subject === 'basic_science') {
    const sciTopicsFallback = {
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
    const topics = topicHint || sciTopicsFallback[grade] || 'general science concepts';

    return `Generate ${n} ${name} Science questions for ${gradeLabel} ${grade}.
Curriculum: ${context}
Topics (generate questions specifically on these): ${topics}
Difficulty: ${tier.desc}
Use ${spelling} and ${examples}.
${HINTS_RULE}
${UNIQUENESS_RULE}
${NO_VISUAL_REFS_RULE}

Mix:
- 2× MCQ factual recall: ${MCQ}
- 1× multi-select "select ALL correct": ${MULTI}
- ${tier.difficulty >= 55 ? `1× free-text short answer: ${FREE}` : `1× MCQ application: ${MCQ}`}
- 1× MCQ experimental/analytical thinking

Output ONLY valid JSON:
{"questions":[...5 items...]}`;
  }

  // ── GEOGRAPHY / HASS / SOCIAL STUDIES ────────────────────────────────────
  if (subject === 'geography' || subject === 'hass' || subject === 'social_studies' || subject === 'humanities') {
    const geoTopicsFallback = {
      US: 'US and world geography, physical features, climate, human-environment interaction, map skills',
      IB: 'global geography, climate zones, urbanisation, sustainability, global interconnections',
      NG: 'Nigerian and West African geography, physical geography, climate, economic geography, population',
      AU: 'Australian geography, Asia-Pacific, environments, sustainable development',
    };
    const topics = topicHint || geoTopicsFallback[currConfig.region] || 'world geography, physical and human geography';

    return `Generate ${n} ${name} ${subject === 'hass' ? 'HASS (Humanities & Social Sciences)' : subject === 'social_studies' ? 'Social Studies' : 'Geography'} questions for ${gradeLabel} ${grade}.
Curriculum: ${context}
Topics (generate questions specifically on these): ${topics}
Difficulty: ${tier.desc}
Use ${spelling} and ${examples}.
${HINTS_RULE}
${UNIQUENESS_RULE}
${NO_VISUAL_REFS_RULE}

Mix: 3× MCQ, 1× free-text (name/locate/describe a maximum of one sentence), 1× MCQ data/map interpretation.

Output ONLY valid JSON:
{"questions":[${MCQ}, ${FREE}]}`;
  }

  // ── HISTORY ──────────────────────────────────────────────────────────────
  if (subject === 'history' || subject === 'canadian_history') {
    const histTopicsFallback = {
      IB: 'ancient civilisations, exploration, rights and responsibilities, innovation, interconnection',
      NG: 'pre-colonial West Africa, transatlantic trade, colonialism, independence movements, modern Nigeria',
    };
    const topics = topicHint || histTopicsFallback[currConfig.region] || 'historical events, cause and consequence, change and continuity';

    return `Generate ${n} ${name} ${subject === 'canadian_history' ? 'Canadian History' : 'History'} questions for ${gradeLabel} ${grade}.
Curriculum: ${context}
Topics (generate questions specifically on these): ${topics}
Difficulty: ${tier.desc}
Use ${spelling} and ${examples}.
${HINTS_RULE}
${UNIQUENESS_RULE}
${NO_VISUAL_REFS_RULE}

Mix: 2× MCQ factual, 1× MCQ source/evidence interpretation, 1× free-text cause-and-consequence (1 sentence expected), 1× MCQ significance/chronology.

Output ONLY valid JSON:
{"questions":[${MCQ}, ${FREE}]}`;
  }

  // ── COMPUTING / COMPUTER SCIENCE ────────────────────────────────────────
  if (subject === 'computing' || subject === 'computer_science' || subject === 'basic_digital_literacy') {
    return `Generate ${n} ${name} Computing questions for ${gradeLabel} ${grade}.
Curriculum: ${context}
${topicHint ? `Topics: ${topicHint}` : ''}
Difficulty: ${tier.desc}
Use ${spelling} and ${examples}.
${HINTS_RULE}
${UNIQUENESS_RULE}
${NO_VISUAL_REFS_RULE}

All MCQ, 4 options, exactly one correct answer. Focus on computational thinking and digital literacy.

Output ONLY valid JSON:
{"questions":[${MCQ}]}`;
  }

  // ── NIGERIAN SSS SUBJECTS ──────────────────────────────────────────────
  if (['physics', 'chemistry', 'biology', 'economics', 'government', 'commerce',
       'financial_accounting', 'civic_education', 'business_studies', 'business_education',
       'agricultural_science', 'religious_studies', 'religious_education'].includes(subject)) {
    const displayName = subject.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `Generate ${n} ${name} ${displayName} questions for ${gradeLabel} ${grade}.
Curriculum: ${context}
${topicHint ? `Topics (generate questions specifically on these): ${topicHint}` : ''}
Difficulty: ${tier.desc}
Use ${spelling} and ${examples}.
${HINTS_RULE}
${UNIQUENESS_RULE}
${NO_VISUAL_REFS_RULE}

Mix: 3× MCQ, 1× fill-blank: ${FILL}, 1× MCQ application/analysis.

Output ONLY valid JSON:
{"questions":[${MCQ}, ${FILL}]}`;
  }

  // Generic fallback — uses topicHint if available
  const displayName = subject.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return `Generate ${n} ${name} ${displayName} questions for ${gradeLabel} ${grade}.
Difficulty: ${tier.desc}
${topicHint ? `Topics: ${topicHint}` : ''}
${HINTS_RULE}
${UNIQUENESS_RULE}
${NO_VISUAL_REFS_RULE}
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
  if (!(Array.isArray(q.opts) && q.opts.length === 4 && typeof q.a === 'number' && q.a >= 0 && q.a <= 3)) return false;

  // ── Duplicate option check ─────────────────────────────────────────────
  const uniqOpts = new Set(q.opts.map(o => String(o).toLowerCase().trim()));
  if (uniqOpts.size < q.opts.length) return false;

  // ── Orphan visual reference gate ──────────────────────────────────────
  // Reject questions that reference images/diagrams that don't exist
  const qLower = (q.q || '').toLowerCase();
  if (/look at|shown below|shown above|the diagram|the picture|the image|the chart shows|the graph shows|the table below|the map shows|refer to the|see the diagram|figure \d/i.test(qLower)) {
    return false; // AI hallucinated a visual reference — reject
  }

  // ── Math verification gate ─────────────────────────────────────────────
  // For questions with arithmetic expressions, verify the answer is correct
  const allText = [q.q, q.exp || '', q.passage || ''].join(' ');
  const exprMatch = allText.match(/(\d+(?:\s*[+\-*/×÷]\s*\d+)+)\s*=\s*(\d+(?:\.\d+)?)/);
  if (exprMatch) {
    const expr = exprMatch[1].replace(/×/g, '*').replace(/÷/g, '/');
    const claimed = parseFloat(exprMatch[2]);
    try {
      // eslint-disable-next-line no-new-func
      const actual = new Function(`"use strict"; return (${expr.replace(/[^0-9+\-*/().]/g, '')})`)();
      if (typeof actual === 'number' && isFinite(actual) && Math.abs(actual - claimed) > 0.01) {
        console.warn(`[batch-validate] Math error rejected: "${expr} = ${claimed}" (actual: ${actual}) in: "${q.q.slice(0, 60)}"`);
        return false;
      }
    } catch { /* skip if can't evaluate */ }
  }

  // ── Explanation-answer consistency ─────────────────────────────────────
  if (q.exp && q.opts[q.a]) {
    const expLower = (q.exp || '').toLowerCase();
    const markedAnswer = String(q.opts[q.a]).toLowerCase().trim();
    const answerMatch = expLower.match(/\b(?:the\s+)?(?:correct\s+)?answer\s+is\s+["']?(\d+[\d,.]*)/i)
      || expLower.match(/\b(?:=|equals?)\s+["']?(\d+[\d,.]*)/i);
    if (answerMatch) {
      const expAnswer = answerMatch[1].replace(/,/g, '').trim();
      const markedClean = markedAnswer.replace(/,/g, '').replace(/[^0-9.\-]/g, '');
      if (expAnswer !== markedClean && expAnswer.length > 0 && markedClean.length > 0) {
        // Check if explanation answer matches a DIFFERENT option
        const expOptIdx = q.opts.findIndex(o => {
          const clean = String(o).toLowerCase().replace(/,/g, '').replace(/[^0-9.\-]/g, '');
          return clean === expAnswer;
        });
        if (expOptIdx >= 0 && expOptIdx !== q.a) {
          console.warn(`[batch-validate] Explanation mismatch rejected: exp says "${expAnswer}" but a=${q.a} ("${markedAnswer}") in: "${q.q.slice(0, 60)}"`);
          return false;
        }
      }
    }
  }

  return true;
}

// ─── OPENROUTER CALLER (with model rotation) ────────────────────────────────
async function callOpenRouter(prompt) {
  const model = pickBatchModel();
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
        model,
        messages: [
          { role: 'system', content: 'Output ONLY valid JSON. No markdown fences. No trailing commas. No commentary.' },
          { role: 'user',   content: prompt },
        ],
        max_tokens: 4000, temperature: 0.8,
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) { const t = await res.text(); throw new Error(`OpenRouter ${res.status} (${model}): ${t.slice(0, 200)}`); }
    const data = await res.json();
    const raw  = (data.choices[0].message.content || '')
      .trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    const start = raw.indexOf('{'); const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error(`No JSON object found (model: ${model})`);
    return JSON.parse(raw.slice(start, end + 1));
  } catch (err) {
    clearTimeout(timeout);
    throw err.name === 'AbortError' ? new Error(`OpenRouter timed out (${model})`) : err;
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

  // Get IXL-level topic list for this subject+year and pick under-covered topics
  const topicPool = getTopicsForSubjectYear(subject, grade);
  // Rotate through topics based on current count to spread coverage evenly
  const topicIdx = current % topicPool.length;
  const topicSlice = topicPool.slice(topicIdx, topicIdx + 4).concat(
    topicPool.slice(0, Math.max(0, 4 - (topicPool.length - topicIdx)))
  );
  const topicHint = topicSlice.map(t => t.replace(/_/g, ' ')).join(', ');

  // ── DEDUP: Fetch existing texts + build fingerprint index ────────────────
  const { data: existing } = await supabase
    .from('question_bank')
    .select('question_text')
    .eq('curriculum', curriculumKey).eq('subject', subject)
    .eq('year_level', grade).eq('difficulty_tier', tier.label);

  const seenTexts = new Set((existing ?? []).map(r => normalise(r.question_text)));
  const seenFingerprints = new Set((existing ?? []).map(r => fingerprint(r.question_text)));

  const toInsert = [];
  let dupeCount = 0;

  try {
    const prompt = buildPrompt(curriculumKey, currConfig, subject, grade, tier, BATCH_SIZE, topicHint);
    const gen = await callOpenRouter(prompt);
    if (!gen?.questions || !Array.isArray(gen.questions)) throw new Error('Invalid response structure');

    for (const q of gen.questions) {
      if (!validateQuestion(q)) continue;

      // Triple-layer dedup: exact normalised text → fingerprint → within-batch
      if (isDuplicate(q.q, seenTexts, seenFingerprints)) {
        dupeCount++;
        continue;
      }

      // Mark as seen for within-batch dedup
      seenTexts.add(normalise(q.q));
      seenFingerprints.add(fingerprint(q.q));

      // ── Detect if this question needs a generated visual ───────────────
      const qLower = (q.q || '').toLowerCase();
      const refersToVisual = /look at|the diagram|the graph|the chart|the table|the picture|the image|the map|shown below|shown above/.test(qLower);
      const benefitsFromVisual = (
        (['science', 'basic_science', 'biology', 'chemistry', 'physics'].includes(subject)
          && /cell|organ|skeleton|food chain|circuit|magnet|solar system|water cycle|photosynthesis|respiration|atom|molecule|force/.test(qLower))
        || (['geography', 'hass', 'social_studies'].includes(subject)
          && /continent|country|ocean|river|mountain|climate|map|region/.test(qLower))
        || (['mathematics', 'math'].includes(subject) && grade >= 5
          && /graph|plot|coordinate|quadratic|parabola|bar chart|pie chart|histogram|y\s*=/.test(qLower))
      );
      const needsVis = refersToVisual || benefitsFromVisual;
      const imgType = needsVis ? (
        /graph|parabola|quadratic|coordinate|plot|y\s*=/.test(qLower) ? 'graph' :
        /map|continent|country|ocean|region/.test(qLower) ? 'map' :
        /chart|bar chart|pie chart|histogram|tally/.test(qLower) ? 'chart' :
        /table|data table|timetable|frequency/.test(qLower) ? 'data_table' :
        'diagram'
      ) : null;

      toInsert.push({
        curriculum: curriculumKey,
        subject,
        year_level: grade,
        difficulty_tier: tier.label,
        question_text: q.q,
        question_data: JSON.stringify(q),
        batch_id: batchId,
        created_at: new Date().toISOString(),
        needs_visual:  needsVis,
        visual_status: needsVis ? 'pending' : 'none',
        image_type:    imgType,
      });
      if (toInsert.length >= needed) break;
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from('question_bank').insert(toInsert);
      if (error) throw new Error(`Insert error: ${error.message}`);
      log.push(`✓ ${curriculumKey} ${subject} Y${grade} ${tier.label}: +${toInsert.length} (${current}→${current + toInsert.length})${dupeCount ? ` [${dupeCount} dupes blocked]` : ''}`);
      return toInsert.length;
    }
    log.push(`⚠ ${curriculumKey} ${subject} Y${grade} ${tier.label}: 0 new (${dupeCount} dupes blocked)`);
    return 0;
  } catch (err) {
    log.push(`✗ ${curriculumKey} ${subject} Y${grade} ${tier.label}: ${err.message}`);
    return 0;
  }
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

/**
 * Aggressive normalisation for dedup — strips all non-alphanumeric characters,
 * collapses whitespace, lowercases. This catches near-duplicates like:
 * "What is 5 + 3?" vs "What is 5+3?" vs "what is 5 + 3"
 */
function normalise(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')  // strip punctuation, symbols, operators
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract a "fingerprint" from a question — the core numbers and keywords.
 * Used for fuzzy dedup: catches "A bag has 5 apples and 3 oranges. How many fruits?"
 * vs "There are 5 apples and 3 oranges in a bag. How many fruits in total?"
 */
function fingerprint(text) {
  const lower = text.toLowerCase();
  // Extract all numbers in order
  const nums = (lower.match(/\d+/g) || []).join(',');
  // Extract key mathematical/topical words
  const keywords = lower
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)  // skip short words (the, is, a, etc.)
    .sort()
    .slice(0, 8)  // keep top 8 keywords
    .join(',');
  return `${nums}|${keywords}`;
}

/**
 * Check if a question is too similar to any existing question.
 * Uses both exact normalised match AND fingerprint similarity.
 */
function isDuplicate(questionText, seenTexts, seenFingerprints) {
  const norm = normalise(questionText);
  if (seenTexts.has(norm)) return true;

  const fp = fingerprint(questionText);
  if (fp.length > 3 && seenFingerprints.has(fp)) return true;

  return false;
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
      model_used: 'rotating', status: 'running',
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