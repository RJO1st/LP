import { NextResponse } from 'next/server';

// Chat uses Claude via OpenRouter — quality matters for student-facing conversation
const CHAT_MODEL = 'anthropic/claude-3.5-haiku';  // $0.80/$4.00 per 1M — fast + cheap Claude

export async function POST(req) {
  try {
    const { system, messages } = await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "Communications offline: OPENROUTER_API_KEY missing" }, { status: 500 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://launchpard.com",
        "X-Title": "LaunchPard Chat",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          {
            role: "system",
            content: system || "You are Mission Control, a warm and encouraging AI copilot helping Cadets prepare for their 11+ exams. Use space-themed metaphors (e.g., 'trajectory', 'orbit', 'fuel levels', 'liftoff') to explain concepts, but ensure the educational advice remains clear, simple, and accurate for a 7-11 year old.",
          },
          ...messages,
        ],
        max_tokens: 300,
        temperature: 0.7,
      })
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[chat] OpenRouter ${response.status}:`, errorText.slice(0, 200));
      throw new Error("AI Chat Error");
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    // Return the specific format the QuizEngine expects
    return NextResponse.json({
      content: [{ text }]
    });

  } catch (error) {
    console.error("Mission Control Link Failed:", error);
    return NextResponse.json({ error: "Communications offline." }, { status: 500 });
  }
}