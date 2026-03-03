import { NextResponse } from 'next/server';

// ── Local fallback — question-aware, always instant ────────────────────────
const localFallback = (text, subject, scholarName, scholarYear, correctAnswer, question) => {
  const name = scholarName || "Cadet";
  const lower = (text || "").trim().toLowerCase();
  const year = scholarYear || 4;
  const minLen = year <= 2 ? 4 : year <= 4 ? 8 : 12;

  if ((text || "").trim().length < minLen) {
    return year <= 3
      ? `Tara: Good start, ${name}! Can you say a bit more about your thinking? 🤔`
      : `Tara: Roger that, ${name}! Tell me the *steps* you used — I want to understand your reasoning. 📡`;
  }

  // Question-specific hints based on the correct answer and question text
  const qText = (question?.q || "").toLowerCase();
  const ans = (correctAnswer || "").toLowerCase();

  // Detect if explanation engages with the correct answer
  const mentionsAnswer = ans && lower.includes(ans.substring(0, Math.min(ans.length, 8)));

  if (mentionsAnswer) {
    const praise = [
      `Tara: Excellent work, ${name}! You've identified "${correctAnswer}" correctly and explained it well. That's Commander-level thinking! 🚀`,
      `Tara: Spot on, ${name}! Mentioning "${correctAnswer}" shows you understood the core idea. Keep it up! ⭐`,
      `Tara: Great explanation, ${name}! You've got the right answer AND the right reasoning — that's what we need! 🏆`,
    ];
    return praise[Math.floor(Math.random() * praise.length)];
  }

  // Subject-specific nudges that reference the question context
  const nudges = {
    maths: [
      `Tara: Good effort, ${name}! For this one, try working through it step by step — what operation did you use first? 💡`,
      `Tara: Nearly there, ${name}! Remember: show your working. What did you calculate first to get to "${correctAnswer}"? 📊`,
      `Tara: Interesting approach, ${name}! The answer is "${correctAnswer}" — can you work backwards from that and explain why? 🔢`,
    ],
    english: [
      `Tara: Good thinking, ${name}! Try to name the *type* of language feature — is it a noun, verb, adjective, or something else? ✏️`,
      `Tara: Almost, ${name}! The answer "${correctAnswer}" — can you explain what RULE makes it correct? Naming the grammar rule helps! 📚`,
      `Tara: Nice attempt, ${name}! Think about what category "${correctAnswer}" belongs to in grammar or literary technique. 🎓`,
    ],
    verbal: [
      `Tara: Good reasoning, ${name}! Describe the *rule* or *pattern* — are letters shifting? Are words related by meaning or category? 🔍`,
      `Tara: Interesting, ${name}! The answer is "${correctAnswer}" — can you spot the pattern that leads there? 🧩`,
      `Tara: Keep digging, ${name}! In verbal reasoning, always ask: what's the relationship? What rule connects them? 💡`,
    ],
    nvr: [
      `Tara: Good observation, ${name}! Describe what *changes* between the shapes — size, rotation, colour, or number of sides? 👁️`,
      `Tara: Almost cracked it, ${name}! The answer "${correctAnswer}" — what visual rule or transformation leads there? 🔷`,
      `Tara: Sharp eye, ${name}! In NVR, look for: rotation, reflection, pattern, or missing shape. Which applies here? 🎯`,
    ],
  };

  const subNudges = nudges[subject] || nudges.maths;
  return subNudges[Math.floor(Math.random() * subNudges.length)];
};

// ── Safety classifier using free Llama Guard 4 ────────────────────────────
async function isSafe(text) {
  if (!process.env.OPENROUTER_API_KEY) return true; // If no key, skip safety check
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-guard-4-12b', // free safety model
        messages: [
          {
            role: 'user',
            content: `Classify the following message for child safety. Only respond with "safe" or "unsafe".\n\nMessage: "${text}"`
          }
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    });
    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content?.trim().toLowerCase();
    return result === 'safe';
  } catch (err) {
    console.warn('[Safety] Llama Guard error, defaulting to safe:', err);
    return true;
  }
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ feedback: "Tara: Great effort! Tell me more about your thinking. 🌟" });
  }

  const { text, subject, correctAnswer, scholarName, scholarYear, question } = body;

  if (!text || text.trim().length < 3) {
    return NextResponse.json({
      feedback: `Tara: I'd love to hear your thoughts, ${scholarName || 'Cadet'}! Write at least a sentence about your reasoning. 🤔`
    });
  }

  // 1. Safety check on student's input
  const inputSafe = await isSafe(text);
  if (!inputSafe) {
    return NextResponse.json({
      feedback: "Tara: That's an interesting question. Let's focus on our learning! 🌟"
    });
  }

  // 2. If no API key, use local fallback
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('[Tara] OPENROUTER_API_KEY not set — using local fallback');
    const fallback = localFallback(text, subject, scholarName, scholarYear, correctAnswer, question);
    return NextResponse.json({ feedback: fallback });
  }

  // 3. Main AI call using Claude-3.5-Haiku (top safety)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://launchpard.com",
        "X-Title": "LaunchPard",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-haiku", // ⭐ excellent safety & age‑appropriate responses
        messages: [
          {
            role: "system",
            content: `You are Tara, a warm, expert UK primary school tutor for children in Year ${scholarYear || 4} (age ${(scholarYear || 4) + 4}–${(scholarYear || 4) + 5}).

You are responding to: ${scholarName || 'a student'} in Year ${scholarYear || 4}.
Subject: ${subject}.
Question they answered: "${question?.q || 'unknown'}"
Correct answer: "${correctAnswer}"
The student's explanation of their reasoning: "${text}"

INSTRUCTIONS:
- Be specific to THIS question and THIS answer — don't give generic praise
- If their reasoning is correct or shows understanding, praise the specific insight they showed
- If their reasoning is wrong or incomplete, gently explain WHY the correct answer is right, referencing the specific concept (e.g. "The subjunctive uses 'were' because it's a hypothetical situation")
- For maths: refer to the specific operation or method (division, fractions, algebra etc.)
- For English: name the grammar rule or literary device specifically  
- For verbal/NVR: explain the pattern or rule that leads to the answer
- Keep it to 2–3 sentences maximum
- Use encouraging language appropriate for age ${(scholarYear || 4) + 4}
- Start with "Tara:" so it's clear who is speaking
- Never be sycophantic — be genuinely helpful and specific`
          }
        ],
        max_tokens: 150,
        temperature: 0.6,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Tara] OpenRouter HTTP ${response.status}`);
      throw new Error(`HTTP ${response.status}`);
    }

    const raw = await response.text();
    if (!raw || raw.trim() === '') throw new Error('Empty body');

    const data = JSON.parse(raw);
    const feedback = data?.choices?.[0]?.message?.content?.trim();
    if (!feedback) throw new Error('No content');

    // 4. Safety check on Tara's response
    const responseSafe = await isSafe(feedback);
    if (!responseSafe) {
      console.warn('[Tara] Response flagged unsafe, using fallback');
      const fallback = localFallback(text, subject, scholarName, scholarYear, correctAnswer, question);
      return NextResponse.json({ feedback: fallback });
    }

    const normalised = feedback.startsWith('Tara:') ? feedback : `Tara: ${feedback}`;
    return NextResponse.json({ feedback: normalised });

  } catch (err) {
    clearTimeout(timeoutId);
    const reason = err.name === 'AbortError' ? 'timeout' : err.message;
    console.warn(`[Tara] API failed (${reason}), using local fallback`);
    const fallback = localFallback(text, subject, scholarName, scholarYear, correctAnswer, question);
    return NextResponse.json({ feedback: fallback });
  }
}