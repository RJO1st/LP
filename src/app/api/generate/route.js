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

export async function POST(req) {
  try {
    const { year, region, subject, count, proficiency, previousQuestions, guide } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Mission Control Offline: API Key missing" }, { status: 500 });
    }

    const age = parseInt(year) + 4; // Approximates age based on UK school year
    const isMathSubject = /math|maths|mathematics/i.test(subject);

    // REBRAND: Persona updated to Mission Control (Flight Instructor)
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

    OUTPUT FORMAT:
    Strict JSON only: {"questions": [{"q": "Question text", "opts": ["A","B","C","D"], "a": 0, "exp": "Explanation text", "topic": "specific topic"}]}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", // Restored your specific model ID
        max_tokens: 1500,
        system: "You are a JSON generator. You output valid raw JSON only. No preamble.",
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API Error:", errorText);
      throw new Error("Mission Control uplink failed");
    }

    const data = await response.json();
    const textContent = data.content[0].text;

    // Safety parse + post-generation validation
    try {
      const parsed = JSON.parse(textContent);

      // Validate each question, filtering out bad ones
      if (parsed.questions && Array.isArray(parsed.questions)) {
        const before = parsed.questions.length;
        parsed.questions = parsed.questions
          .map((q, i) => validateGeneratedQuestion(q, i))
          .filter(Boolean);

        const rejected = before - parsed.questions.length;
        if (rejected > 0) {
          console.warn(`[generate] Post-validation: ${rejected}/${before} questions rejected`);
        }

        // If all questions were rejected, return an error
        if (parsed.questions.length === 0) {
          console.error('[generate] All generated questions failed validation');
          return NextResponse.json({ error: "All generated questions failed quality checks" }, { status: 500 });
        }
      }

      return NextResponse.json(parsed);
    } catch (e) {
      console.error("JSON Parse Error:", textContent);
      return NextResponse.json({ error: "Corrupted flight data received" }, { status: 500 });
    }

  } catch (error) {
    console.error("Generation API Error:", error);
    return NextResponse.json({ error: "Mission generation failed" }, { status: 500 });
  }
}