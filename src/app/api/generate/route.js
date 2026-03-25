import { NextResponse } from 'next/server';

// ─── POST-GENERATION VALIDATION ─────────────────────────────────────────────
/**
 * Evaluate simple arithmetic expressions like "450 + 350 - 100".
 * Returns null if the expression can't be safely evaluated.
 */
function evaluateSimpleExpression(expr) {
  const cleaned = expr.replace(/[^0-9+\-*/().× ÷]/g, '')
    .replace(/×/g, '*').replace(/÷/g, '/').trim();
  if (!cleaned || !/^[0-9+\-*/().\s]+$/.test(cleaned)) return null;
  try { return new Function(`"use strict"; return (${cleaned})`)(); }
  catch { return null; }
}

/**
 * Validates a single generated question. Returns null if the question is bad.
 */
function validateGeneratedQuestion(q, idx) {
  if (!q || typeof q !== 'object') return null;
  if (!q.q || typeof q.q !== 'string' || !q.q.trim()) return null;
  if (!Array.isArray(q.opts) || q.opts.length < 3) return null;

  // Ensure correct index is valid
  if (typeof q.a !== 'number' || q.a < 0 || q.a >= q.opts.length) return null;

  // Check for duplicate options
  const optSet = new Set(q.opts.map(o => String(o).trim().toLowerCase()));
  if (optSet.size < q.opts.length) {
    console.warn(`[generate] Q${idx + 1} rejected — duplicate options`);
    return null;
  }

  // Reject questions that reference non-existent visuals
  if (/look at|shown below|shown above|the diagram|the picture|the image|the chart shows|the graph shows|the table below|the map shows|refer to the|see the diagram|figure \d/i.test(q.q)) {
    console.warn(`[generate] Q${idx + 1} rejected — references non-existent visual`);
    return null;
  }

  // ── Math arithmetic verification ──────────────────────────────────

  const text = `${q.q} ${q.exp || ''}`;
  // Look for "expression = result" patterns
  const eqPatterns = text.match(/(\d[\d\s+\-*/×÷().]+\d)\s*=\s*(\d[\d,.]*)/g) || [];
  for (const match of eqPatterns) {
    const [exprPart, resultPart] = match.split('=').map(s => s.trim());
    const computed = evaluateSimpleExpression(exprPart);
    const claimed  = parseFloat(resultPart.replace(/,/g, ''));
    if (computed !== null && !isNaN(claimed) && Math.abs(computed - claimed) > 0.01) {
      console.warn(`[generate] Q${idx + 1} rejected — arithmetic mismatch: ${exprPart} = ${computed}, not ${claimed}`);
      return null;
    }
  }

  // Cross-check: if explanation says "answer is X" but marked answer differs
  if (q.exp) {
    const answerMention = q.exp.match(/(?:answer|result|equals|is)\s+(?:is\s+)?(\d[\d,.]*)/i);
    if (answerMention) {
      const mentionedVal = answerMention[1].replace(/,/g, '');
      const markedVal    = String(q.opts[q.a]).replace(/,/g, '').trim();
      if (mentionedVal !== markedVal) {
        // Check if the mentioned value exists at a different index
        const correctIdx = q.opts.findIndex(o => String(o).replace(/,/g, '').trim() === mentionedVal);
        if (correctIdx >= 0 && correctIdx !== q.a) {
          console.warn(`[generate] Q${idx + 1} rejected — explanation says "${mentionedVal}" but marked answer is "${markedVal}"`);
          return null;
        }
      }
    }
  }

  // Ensure correctAnswer field is present for downstream use
  q.correctAnswer = q.opts[q.a];
  return q;
}

// ─── MATH-SPECIFIC PROMPT RULES ─────────────────────────────────────────────
const MATH_ACCURACY_RULES = `
    CRITICAL MATH ACCURACY RULES (MANDATORY FOR ALL MATH QUESTIONS):
    A. COMPUTE EVERY ANSWER YOURSELF before writing the question. Double-check arithmetic.
    B. The correct option (index "a") MUST be the mathematically correct result.
    C. If the question includes a passage or context with arithmetic, the passage arithmetic MUST match the correct answer exactly.
    D. NEVER generate a question where the explanation contradicts the marked answer.
    E. ALL four options must be distinct values. No duplicates allowed.
    F. The "exp" (explanation) field must show the working and arrive at the SAME answer as option index "a".
    G. The "topic" field must accurately reflect the PRIMARY mathematical operation (e.g., "addition", "multiplication", "fractions", "geometry").
    H. SELF-CHECK: After generating each question, mentally verify: question text → compute → does option[a] match your computed answer?
    I. For word problems, ensure ALL numbers mentioned in the problem text are consistent with the question and answer.`;

// ─── OPENROUTER CHEAP MODEL ROTATION ────────────────────────────────────────
// Rotate through ultra-cheap models to spread cost and avoid rate limits.
// All are $0.10–$0.20 per 1M input tokens — orders of magnitude cheaper than Claude.
const GENERATE_MODELS = [
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
let modelIndex = 0;
function getNextModel() {
  const model = GENERATE_MODELS[modelIndex % GENERATE_MODELS.length];
  modelIndex++;
  return model;
}

export async function POST(req) {
  try {
    const { year, region, subject, count, proficiency, previousQuestions, guide } = await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "Mission Control Offline: OPENROUTER_API_KEY missing" }, { status: 500 });
    }

    const age = parseInt(year) + 4; // Approximates age based on UK school year
    const isMathSubject = /math|maths|mathematics/i.test(subject);

    const prompt = `You are Mission Control, an expert AI flight instructor for UK Primary School students (Cadets).
    Generate ${count} multiple-choice questions for a Year ${year} Cadet (Age ${age}-${age+1}) in ${subject}.

    CRITICAL FLIGHT MANUAL (CURRICULUM GUIDE): ${guide || "Standard UK National Curriculum"}
    ${isMathSubject ? MATH_ACCURACY_RULES : ''}
    INSTRUCTIONS:
    1. STRICTLY adhere to Year ${year} curriculum standards. Do NOT output 11+ exam level content unless the student is Year 5 or 6.
    2. Keep language simple, clear, and encouraging for young Cadets.
    3. For the "exp" (explanation) field, use a helpful "Mission Control" tone (e.g., "Trajectory corrected!", "Navigation check:", "Systems nominal.").${isMathSubject ? ' MUST include step-by-step working that arrives at the correct answer.' : ''}
    4. Current Proficiency: ${proficiency}/100. Adjust mission difficulty accordingly.
    5. Avoid duplicating these recent questions: ${JSON.stringify(previousQuestions || []).slice(0, 500)}.
    6. Each question MUST include a "topic" field describing the specific topic area.
    7. VISUAL REFERENCES BAN: NEVER write "look at the diagram", "the picture shows", "shown below", "as seen in the image", "refer to the graph", "the table below", or ANY phrase implying an image/diagram/picture/chart/map is attached. The student sees ONLY your text — no images. All information must be self-contained in the question text. Describe shapes in words. Write data inline.

    OUTPUT FORMAT:
    Strict JSON only: {"questions": [{"q": "Question text", "opts": ["A","B","C","D"], "a": 0, "exp": "Explanation text", "topic": "specific topic"}]}`;

    const model = getNextModel();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://launchpard.com",
        "X-Title": "LaunchPard Generate",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a JSON generator. You output valid raw JSON only. No markdown fences. No preamble. No trailing commas." },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      })
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[generate] OpenRouter ${response.status} (${model}):`, errorText.slice(0, 200));
      throw new Error("Mission Control uplink failed");
    }

    const data = await response.json();
    const raw = (data.choices?.[0]?.message?.content || '')
      .trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');

    // Extract JSON object safely
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object in response');
    const textContent = raw.slice(start, end + 1);

    // Safety parse + post-generation validation
    try {
      const parsed = JSON.parse(textContent);

      if (parsed.questions && Array.isArray(parsed.questions)) {
        const before = parsed.questions.length;
        parsed.questions = parsed.questions
          .map((q, i) => validateGeneratedQuestion(q, i))
          .filter(Boolean);

        const rejected = before - parsed.questions.length;
        if (rejected > 0) {
          console.warn(`[generate] Post-validation: ${rejected}/${before} questions rejected (model: ${model})`);
        }

        if (parsed.questions.length === 0) {
          console.error(`[generate] All questions failed validation (model: ${model})`);
          return NextResponse.json({ error: "All generated questions failed quality checks" }, { status: 500 });
        }
      }

      return NextResponse.json(parsed);
    } catch (e) {
      console.error("JSON Parse Error:", textContent?.slice(0, 200));
      return NextResponse.json({ error: "Corrupted flight data received" }, { status: 500 });
    }

  } catch (error) {
    console.error("Generation API Error:", error);
    return NextResponse.json({ error: "Mission generation failed" }, { status: 500 });
  }
}