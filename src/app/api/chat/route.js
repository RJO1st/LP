import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { system, messages } = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229", // Updated to a currently valid model ID just in case
        max_tokens: 300,
        // REBRAND: Updated default persona to Mission Control
        system: system || "You are Mission Control, a warm and encouraging AI copilot helping Cadets prepare for their 11+ exams. Use space-themed metaphors (e.g., 'trajectory', 'orbit', 'fuel levels', 'liftoff') to explain concepts, but ensure the educational advice remains clear, simple, and accurate for a 7-11 year old.",
        messages: messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API Error:", errorText);
      throw new Error("AI Chat Error");
    }

    const data = await response.json();
    
    // Return the specific format the QuizEngine expects
    return NextResponse.json({
      content: [{ text: data.content[0].text }]
    });

  } catch (error) {
    console.error("Mission Control Link Failed:", error);
    return NextResponse.json({ error: "Communications offline." }, { status: 500 });
  }
}