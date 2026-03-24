import { NextResponse } from 'next/server';
import { getAgeBand, getBandConfig, getTaraSystemPrompt } from '@/lib/ageBandConfig';

// ─── Deploy to: src/app/api/tara/route.js ────────────────────────────────────
// Updated to use ageBandConfig for age-adaptive Tara personality.
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

// ─── LOCAL FALLBACK — EIB MODE (age-adaptive) ───────────────────────────────
const localFallbackEIB = (text, subject, scholarName, scholarYear, correctAnswer, question) => {
  const name   = scholarName || "Scholar";
  const band   = getAgeBand(scholarYear);
  const config = getBandConfig(band);
  const t      = config.tara;
  const lower  = (text || "").trim().toLowerCase();
  const year   = scholarYear || 4;
  const minLen = year <= 2 ? 4 : year <= 4 ? 8 : 12;

  if ((text || "").trim().length < minLen) {
    const short = {
      ks1: `${t.name}: Good start, ${name}! Can you say a bit more? Even one word helps! 🌟`,
      ks2: `${t.name}: Copy that, ${name}! We need a bit more detail — what steps did you use? 📡`,
      ks3: `${t.name}: Can you expand on that? What was your method?`,
      ks4: `${t.name}: Expand your reasoning. What's the key step?`,
    };
    return short[band] || short.ks2;
  }

  const ans = (correctAnswer || "").toLowerCase();
  const mentionsAnswer = ans && lower.includes(ans.substring(0, Math.min(ans.length, 8)));

  if (mentionsAnswer) {
    return t.correctPhrases[Math.floor(Math.random() * t.correctPhrases.length)]
      .replace(/Commander/g, name)
      .replace(/superstar/g, name);
  }

  const nudges = {
    ks1: [
      `${t.name}: Good try, ${name}! The answer is "${correctAnswer}". Can you count it out? 🌟`,
      `${t.name}: Almost! Let me show you — "${correctAnswer}" is right because... 👀`,
    ],
    ks2: [
      `${t.name}: Not quite, Commander ${name}! Let's check the mission data. The answer is "${correctAnswer}". 📡`,
      `${t.name}: Close! Work through it step by step — what operation did you use first? 💡`,
    ],
    ks3: [
      `${t.name}: Not this time. The key step is to find "${correctAnswer}". What approach would get you there?`,
      `${t.name}: Close. Think about the method — what's the first calculation you'd do?`,
    ],
    ks4: [
      `${t.name}: Incorrect. The working: you need "${correctAnswer}". Identify the key formula.`,
      `${t.name}: Wrong. Common error here. The correct method gives "${correctAnswer}".`,
    ],
  };

  const pool = nudges[band] || nudges.ks2;
  return pool[Math.floor(Math.random() * pool.length)];
};

// ─── LOCAL FALLBACK — FOLLOW-UP MODE (age-adaptive) ─────────────────────────
const localFallbackFollowup = (scholarName, scholarYear) => {
  const name   = scholarName || "Scholar";
  const band   = getAgeBand(scholarYear);
  const config = getBandConfig(band);
  const t      = config.tara;

  const responses = {
    ks1: [
      `${t.name}: Great question, ${name}! You're so curious — that's what makes you special! 🌟`,
      `${t.name}: Ooh, good thinking! That's a really smart question! 🦄`,
    ],
    ks2: [
      `${t.name}: Great question, Commander ${name}! That curiosity will take you far. 🚀`,
      `${t.name}: Excellent thinking! That's the kind of question top Commanders ask. ⭐`,
    ],
    ks3: [
      `${t.name}: Good question. That shows you're thinking beyond the surface.`,
      `${t.name}: Interesting angle. That's the kind of critical thinking that matters in real applications.`,
    ],
    ks4: [
      `${t.name}: Good question. That connects to exam technique — examiners reward this kind of depth.`,
      `${t.name}: Worth exploring. This comes up in extended response questions.`,
    ],
  };

  const pool = responses[band] || responses.ks2;
  return pool[Math.floor(Math.random() * pool.length)];
};

// ─── LLAMA GUARD SAFETY CHECK ────────────────────────────────────────────────
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

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────
export async function POST(req) {
  let body;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ feedback: "Tara: Great effort! Tell me more about your thinking. 🌟" });
  }

  const {
    text, subject = "mathematics", correctAnswer = "", scholarAnswer = "",
    scholarName = "Scholar", scholarYear = 4, question = null,
    mode = "eib", context = "",
  } = body;

  // ── Resolve age band ─────────────────────────────────────────────────────
  const band   = getAgeBand(scholarYear);
  const config = getBandConfig(band);
  const tara   = config.tara;

  if (!text || text.trim().length < 3) {
    const minPrompt = {
      ks1: `${tara.name}: I'd love to hear your thoughts, ${scholarName}! Write something for me! 🌟`,
      ks2: `${tara.name}: Tell me your thinking, Commander ${scholarName}! Even a short answer helps. 📡`,
      ks3: `${tara.name}: Write at least a sentence explaining your reasoning.`,
      ks4: `${tara.name}: Provide your working. Minimum one sentence.`,
    };
    return NextResponse.json({ feedback: minPrompt[band] || minPrompt.ks2 });
  }

  // ── 1. Server-side profanity guard ──────────────────────────────────────────
  if (containsProfanity(text)) {
    return NextResponse.json({
      feedback: `${tara.name}: Let's keep things respectful! Rephrase that and try again. 🌟`
    });
  }

  // ── 2. Llama Guard on student input ─────────────────────────────────────────
  const inputSafe = await isSafe(text);
  if (!inputSafe) {
    return NextResponse.json({
      feedback: `${tara.name}: That's an interesting thought. Let's keep our focus on learning! 🌟`
    });
  }

  // ── 3. Local fallback if no API key ─────────────────────────────────────────
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('[Tara] OPENROUTER_API_KEY not set — using local fallback');
    const fallback = mode === "followup"
      ? localFallbackFollowup(scholarName, scholarYear)
      : localFallbackEIB(text, subject, scholarName, scholarYear, correctAnswer, question);
    return NextResponse.json({ feedback: fallback });
  }

  // ── 4. Build system prompt with age-band personality ────────────────────────
  const ageMin = scholarYear + 4;
  const ageMax = scholarYear + 5;
  const topic  = question?.topic?.replace(/_/g, ' ') || subject;

  // Get the base personality from ageBandConfig
  const bandPersonality = getTaraSystemPrompt(band);

  // Age-appropriate language guidance (detailed, per-band)
  const ageGuidance = {
    ks1: `CRITICAL: This child is ${ageMin}–${ageMax} years old (Reception/KS1). Use very simple words (1-2 syllable). No jargon. No abstract concepts. Think "mummy-explaining-at-bedtime" level. Use concrete examples: "If you have 3 sweets and get 2 more..." Never mention place value, column methods, or formal terminology. Praise effort warmly. Add emojis to every sentence.`,
    ks2: `This child is ${ageMin}–${ageMax} years old (KS2). Use clear, age-appropriate language. You can introduce proper terms (e.g., "numerator", "denominator") but always explain them. Keep it conversational. Use space/mission metaphors occasionally. Call them "Commander" if appropriate. Moderate emoji use.`,
    ks3: `This student is ${ageMin}–${ageMax} years old (KS3). Use appropriate academic vocabulary. Be direct and respectful — they don't want to be talked down to. Connect answers to real-world applications where possible. Minimal emojis. Treat them as a young adult.`,
    ks4: `This student is ${ageMin}–${ageMax} years old (KS4/GCSE+). Be precise and efficient. No emojis. Reference exam technique and mark schemes where relevant. Focus on method and common errors. They want accuracy, not encouragement.`,
  }[band] || `This student is ${ageMin}–${ageMax} years old.`;

  const systemPrompt = mode === "followup"
    ? `${bandPersonality}

You are responding to a curiosity follow-up question from ${scholarName} (Year ${scholarYear}, age ${ageMin}–${ageMax}).

Subject: ${subject}
Topic: ${topic}
Original question: "${question?.q || 'unknown'}"
Correct answer: "${correctAnswer}"
Student originally chose: "${scholarAnswer || 'unknown'}"
Your previous reply: "${context}"
Their follow-up question: "${text}"

${ageGuidance}

INSTRUCTIONS:
- This is a curiosity/depth question, NOT an assessment
- Go slightly deeper than the original answer — add one interesting fact or "why"
- Keep it to 2–3 sentences, age-appropriate
- Start with "${tara.name}:" so it's clear who is speaking
- Never mention exams, marks, or scores unless KS4`

    : `${bandPersonality}

Student: ${scholarName}, Year ${scholarYear} (age ${ageMin}–${ageMax}).
Subject: ${subject}.
Topic: ${topic}.
Question: "${question?.q || 'unknown'}"
Options: ${(question?.opts || []).map((o, i) => `${i + 1}. ${o}`).join(', ')}
Correct answer: "${correctAnswer}"
Student chose: "${scholarAnswer || 'unknown'}"${scholarAnswer && scholarAnswer !== correctAnswer ? ' (INCORRECT)' : ''}
Student's reasoning: "${text}"

${ageGuidance}

INSTRUCTIONS:
- Acknowledge what the student chose — explain briefly why it might have seemed right, then guide them to "${correctAnswer}"
- Be specific to THIS question about ${topic}
- For number bonds: use "parts" and "whole" language
- For counting/addition: use concrete objects
- For subtraction: use taking-away language
- For fractions: use sharing/pizza/cake analogies
- For English/grammar: name the rule simply, give an example
- For verbal/NVR: explain the pattern step by step
- For science: connect to real-world experience
- Keep it to ${tara.maxWords ? `${tara.maxWords} words maximum` : '2–3 sentences'}
- Start with "${tara.name}:" so it's clear who is speaking
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
        max_tokens: tara.maxWords ? Math.min(tara.maxWords * 2, 200) : 150,
        temperature: band === "ks4" ? 0.4 : 0.6,
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
        ? localFallbackFollowup(scholarName, scholarYear)
        : localFallbackEIB(text, subject, scholarName, scholarYear, correctAnswer, question);
      return NextResponse.json({ feedback: fallback });
    }

    const taraPrefix = `${tara.name}:`;
    const normalised = feedback.startsWith(taraPrefix) || feedback.startsWith('Tara:')
      ? feedback
      : `${taraPrefix} ${feedback}`;
    return NextResponse.json({ feedback: normalised });

  } catch (err) {
    clearTimeout(timeoutId);
    const reason = err?.name === 'AbortError' ? 'timeout' : String(err);
    console.warn(`[Tara] API failed (${reason}), using local fallback`);
    const fallback = mode === "followup"
      ? localFallbackFollowup(scholarName, scholarYear)
      : localFallbackEIB(text, subject, scholarName, scholarYear, correctAnswer, question);
    return NextResponse.json({ feedback: fallback });
  }
}