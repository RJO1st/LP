import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { year, region, subject, count, proficiency, previousQuestions, guide } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 });
    }

    const age = parseInt(year) + 4; // Approximates age based on UK school year
    const prompt = `You are Sage, an expert UK Primary School tutor. Generate ${count} multiple-choice questions for a Year ${year} student (Age ${age}-${age+1}) in ${subject}. 
    
    CRITICAL YEAR ${year} CURRICULUM GUIDE: ${guide}
    
    DO NOT output 11+ exam level content unless the student is Year 5 or 6. Stick EXACTLY to the Year ${year} abilities. Keep language simple for young readers.
    Proficiency: ${proficiency}/100.
    Output strict JSON: {"questions": [{"q": "text", "opts": ["A","B","C","D"], "a": 0, "exp": "logic"}]}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", 
        max_tokens: 1500,
        system: "You output valid raw JSON only. No text outside JSON.",
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) throw new Error("Anthropic rejection");

    const data = await response.json();
    return NextResponse.json(JSON.parse(data.content[0].text));

  } catch (error) {
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
