import { NextResponse } from 'next/server';

// ─── Deploy to: src/app/api/tara/route.ts ────────────────────────────────────
// Handles two modes:
//   "eib"      (default) — Scholar explains why the correct answer is right
//   "followup"           — Scholar asks a curiosity question after Tara's first reply
// Safety layers:
//   1. Server-side profanity guard (fast, no API cost)
//   2. Llama Guard 4 on student input (if OPENROUTER_API_KEY set)
//   3. Llama Guard 4 on Tara's response (if OPENROUTER_API_KEY set)
//   4. Local fallback if API is down or times out

// ─── SERVER-SIDE PROFANITY GUARD ─────────────────────────────────────────────
const BLOCKED_WORDS = [
  "fuck","shit","bitch","bastard","asshole","cunt","dick","cock","pussy",
  "nigger","nigga","faggot","retard","whore","slut","bollocks","wanker","twat",
  "piss","arse","crap",
];
function containsProfanity(text) {
  const lower = text.toLowerCase().replace(/[^a-z\s]/g, " ");
  return BLOCKED_WORDS.some(w => lower.split(/\s+/).includes(w));
}

// ─── LOCAL FALLBACK — EIB MODE ────────────────────────────────────────────────
const localFallbackEIB = (text, subject, scholarName, scholarYear, correctAnswer, question) => {
  const name   = scholarName || "Cadet";
  const lower  = (text || "").trim().toLowerCase();
  const year   = scholarYear || 4;
  const minLen = year <= 2 ? 4 : year <= 4 ? 8 : 12;

  if ((text || "").trim().length < minLen) {
    return year <= 3
      ? `Tara: Good start, ${name}! Can you say a bit more about your thinking? 🤔`
      : `Tara: Roger that, ${name}! Tell me the *steps* you used — I want to understand your reasoning. 📡`;
  }

  const ans = (correctAnswer || "").toLowerCase();
  const mentionsAnswer = ans && lower.includes(ans.substring(0, Math.min(ans.length, 8)));

  if (mentionsAnswer) {
    const praise = [
      `Tara: Excellent work, ${name}! You've identified "${correctAnswer}" correctly and explained it well. That's Commander-level thinking! 🚀`,
      `Tara: Spot on, ${name}! Mentioning "${correctAnswer}" shows you understood the core idea. Keep it up! ⭐`,
      `Tara: Great explanation, ${name}! You've got the right answer AND the right reasoning — that's what we need! 🏆`,
    ];
    return praise[Math.floor(Math.random() * praise.length)];
  }

  const nudges = {
    maths: [
      `Tara: Good effort, ${name}! Try working through it step by step — what operation did you use first? 💡`,
      `Tara: Nearly there, ${name}! What did you calculate first to get to "${correctAnswer}"? 📊`,
    ],
    english: [
      `Tara: Good thinking, ${name}! Try naming the language feature — is it a noun, verb, adjective, or something else? ✏️`,
      `Tara: Almost, ${name}! Can you explain what rule makes "${correctAnswer}" correct? 📚`,
    ],
    verbal: [
      `Tara: Good reasoning, ${name}! Describe the rule or pattern — are letters shifting? Are words related by meaning? 🔍`,
      `Tara: Keep digging, ${name}! What's the relationship or rule connecting them? 💡`,
    ],
    nvr: [
      `Tara: Good observation, ${name}! Describe what *changes* — size, rotation, colour, or number of sides? 👁️`,
      `Tara: Almost, ${name}! In NVR look for: rotation, reflection, pattern, or missing shape. 🎯`,
    ],
    science: [
      `Tara: Almost, ${name}! Try using scientific terms like 'energy', 'force', or 'cell'. 🔬`,
      `Tara: Nearly there! What scientific principle explains "${correctAnswer}"? ⚗️`,
    ],
  };

  const subNudges = nudges[subject] || nudges.maths;
  return subNudges[Math.floor(Math.random() * subNudges.length)];
};

// ─── LOCAL FALLBACK — FOLLOW-UP MODE ─────────────────────────────────────────
const localFallbackFollowup = (scholarName) => {
  const name = scholarName || "Cadet";
  const responses = [
    `Tara: Great question, ${name}! That curiosity will take you far. Keep asking why — it's what the best thinkers do. 🚀`,
    `Tara: Love the curiosity, ${name}! That's exactly the right instinct. Keep exploring! 🌟`,
    `Tara: Brilliant follow-up, ${name}! Questions like that are what deepen real understanding. 🏆`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};

// ─── LLAMA GUARD SAFETY CHECK ─────────────────────────────────────────────────
async function isSafe(text) {
  if (!process.env.OPENROUTER_API_KEY) return true;
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-guard-4-12b',
        messages: [{
          role: 'user',
          content: `Classify the following message for child safety. Only respond with "safe" or "unsafe".\n\nMessage: "${text}"`
        }],
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

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
export async function POST(req) {
  let body;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ feedback: "Tara: Great effort! Tell me more about your thinking. 🌟" });
  }

  const {
    text, subject = "maths", correctAnswer = "", scholarAnswer = "",
    scholarName = "Cadet", scholarYear = 4, question = null,
    mode = "eib", context = "",
  } = body;

  if (!text || text.trim().length < 3) {
    return NextResponse.json({
      feedback: `Tara: I'd love to hear your thoughts, ${scholarName}! Write at least a sentence. 🤔`
    });
  }

  // ── 1. Server-side profanity guard ──────────────────────────────────────────
  if (containsProfanity(text)) {
    return NextResponse.json({
      feedback: "Tara: Let's keep things respectful! Rephrase that and try again. 🌟"
    });
  }

  // ── 2. Llama Guard on student input ─────────────────────────────────────────
  const inputSafe = await isSafe(text);
  if (!inputSafe) {
    return NextResponse.json({
      feedback: "Tara: That's an interesting thought. Let's keep our focus on learning! 🌟"
    });
  }

  // ── 3. Local fallback if no API key ─────────────────────────────────────────
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('[Tara] OPENROUTER_API_KEY not set — using local fallback');
    const fallback = mode === "followup"
      ? localFallbackFollowup(scholarName)
      : localFallbackEIB(text, subject, scholarName, scholarYear, correctAnswer, question);
    return NextResponse.json({ feedback: fallback });
  }

  // ── 4. Build system prompt based on mode ────────────────────────────────────
  const ageMin = scholarYear + 4;
  const ageMax = scholarYear + 5;

  const systemPrompt = mode === "followup"
    ? `You are Tara, a warm expert UK tutor for children in Year ${scholarYear} (age ${ageMin}–${ageMax}).

The student has already completed an Explain It Back challenge and is now asking a curiosity follow-up question.

Subject: ${subject}
Original question: "${question?.q || 'unknown'}"
Correct answer: "${correctAnswer}"
Student originally chose: "${scholarAnswer || 'unknown'}"
Your previous reply to them: "${context}"
Their follow-up question: "${text}"

INSTRUCTIONS:
- This is a curiosity/depth question, NOT an assessment — don't evaluate their reasoning
- Engage genuinely with what they're curious about
- Go slightly deeper than the original answer — add one interesting fact, connection, or "why"
- Keep it to 2–3 sentences, age-appropriate for Year ${scholarYear}
- Be warm and encouraging — reward their curiosity explicitly
- Start with "Tara:" so it's clear who is speaking
- Never mention exams, marks, or scores`

    : `You are Tara, a warm expert UK tutor for children in Year ${scholarYear} (age ${ageMin}–${ageMax}).

Student: ${scholarName}, Year ${scholarYear}.
Subject: ${subject}.
Question: "${question?.q || 'unknown'}"
Options: ${(question?.opts || []).map((o, i) => `${i + 1}. ${o}`).join(', ')}
Correct answer: "${correctAnswer}"
Student chose: "${scholarAnswer || 'unknown'}"${scholarAnswer && scholarAnswer !== correctAnswer ? ' (INCORRECT)' : ''}
Student's reasoning: "${text}"

INSTRUCTIONS:
- Acknowledge what the student chose ("${scholarAnswer}") — explain briefly why it might have seemed right, then guide them to understand why "${correctAnswer}" is correct
- Be specific to THIS question and THIS answer — no generic praise
- If their reasoning is correct, praise the specific insight they showed
- If their reasoning is wrong or incomplete, gently explain WHY the correct answer is right, referencing the specific concept
- For maths: refer to the specific operation or method
- For English: name the grammar rule or literary device
- For verbal/NVR: explain the pattern or rule that leads to the answer
- Keep it to 2–3 sentences maximum
- Use encouraging language appropriate for age ${ageMin}
- Start with "Tara:" so it's clear who is speaking
- Never be sycophantic — be genuinely helpful and specific`;

  // ── 5. Main AI call ──────────────────────────────────────────────────────────
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 8000);

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
        model: "anthropic/claude-3.5-haiku",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: mode === "followup"
            ? `My follow-up question: "${text}"`
            : `Here is my explanation of why "${correctAnswer}" is the correct answer:\n\n"${text}"`
          },
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

    // ── 6. Llama Guard on Tara's response ─────────────────────────────────────
    const responseSafe = await isSafe(feedback);
    if (!responseSafe) {
      console.warn('[Tara] Response flagged unsafe, using fallback');
      const fallback = mode === "followup"
        ? localFallbackFollowup(scholarName)
        : localFallbackEIB(text, subject, scholarName, scholarYear, correctAnswer, question);
      return NextResponse.json({ feedback: fallback });
    }

    const normalised = feedback.startsWith('Tara:') ? feedback : `Tara: ${feedback}`;
    return NextResponse.json({ feedback: normalised });

  } catch (err) {
    clearTimeout(timeoutId);
    const reason = err?.name === 'AbortError' ? 'timeout' : String(err);
    console.warn(`[Tara] API failed (${reason}), using local fallback`);
    const fallback = mode === "followup"
      ? localFallbackFollowup(scholarName)
      : localFallbackEIB(text, subject, scholarName, scholarYear, correctAnswer, question);
    return NextResponse.json({ feedback: fallback });
  }
}