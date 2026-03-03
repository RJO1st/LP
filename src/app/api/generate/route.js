import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { year, region, subject, count, proficiency, previousQuestions, guide } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Mission Control Offline: API Key missing" }, { status: 500 });
    }

    const age = parseInt(year) + 4; // Approximates age based on UK school year
    
    // REBRAND: Persona updated to Mission Control (Flight Instructor)
    const prompt = `You are Mission Control, an expert AI flight instructor for UK Primary School students (Cadets). 
    Generate ${count} multiple-choice questions for a Year ${year} Cadet (Age ${age}-${age+1}) in ${subject}.
    
    CRITICAL FLIGHT MANUAL (CURRICULUM GUIDE): ${guide || "Standard UK National Curriculum"}
    
    INSTRUCTIONS:
    1. STRICTLY adhere to Year ${year} curriculum standards. Do NOT output 11+ exam level content unless the student is Year 5 or 6.
    2. Keep language simple, clear, and encouraging for young Cadets.
    3. For the "exp" (explanation) field, use a helpful "Mission Control" tone (e.g., "Trajectory corrected!", "Navigation check:", "Systems nominal.").
    4. Current Proficiency: ${proficiency}/100. Adjust mission difficulty accordingly.
    5. Avoid duplicating these recent questions: ${JSON.stringify(previousQuestions || []).slice(0, 500)}.
    
    OUTPUT FORMAT:
    Strict JSON only: {"questions": [{"q": "Question text", "opts": ["A","B","C","D"], "a": 0, "exp": "Explanation text"}]}`;

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

    // Safety parse
    try {
      const parsed = JSON.parse(textContent);
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