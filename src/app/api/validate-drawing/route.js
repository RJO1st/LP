// ═══════════════════════════════════════════════════════════════════════════
// API ROUTE: Validate Drawing Submission
// File: src/app/api/validate-drawing/route.js
// Validates scholar drawings using OpenRouter AI vision models
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

// Vision-capable model for analysing drawings
const VISION_MODEL = "openai/gpt-4o-mini"; // supports image input, cost-effective

/**
 * Validates a scholar's drawing against question criteria using AI vision.
 *
 * Accepts:
 *   - pngDataUrl: base64-encoded PNG of the drawing (preferred)
 *   - sceneData: Excalidraw scene JSON (fallback for element-based analysis)
 *   - questionText: the question prompt
 *   - drawingCriteria: specific criteria for what constitutes a correct drawing
 *   - subject, topic: for context
 */
export async function POST(request) {
  try {
    const {
      questionText,
      drawingCriteria,
      sceneData,
      pngDataUrl,
      elementCount,
      subject,
      topic,
    } = await request.json();

    // Basic validation
    if (!questionText) {
      return NextResponse.json(
        { error: "Missing questionText" },
        { status: 400 }
      );
    }

    // If no drawing content at all, mark incorrect
    if ((!pngDataUrl && !sceneData) || elementCount === 0) {
      return NextResponse.json({
        isCorrect: false,
        score: 0,
        explanation: "No drawing was submitted. Try sketching your answer!",
      });
    }

    // If no API key, use heuristic fallback
    if (!OPENROUTER_API_KEY) {
      console.warn("[validate-drawing] No OPENROUTER_API_KEY — using heuristic fallback");
      return NextResponse.json(heuristicValidation(elementCount, questionText));
    }

    // ── AI Vision Validation ──────────────────────────────────────────────
    const messages = buildValidationPrompt({
      questionText,
      drawingCriteria,
      pngDataUrl,
      sceneData,
      elementCount,
      subject,
      topic,
    });

    const response = await fetch(OPENROUTER_BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://launchpard.com",
        "X-Title": "LaunchPard Drawing Validator",
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages,
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("[validate-drawing] OpenRouter error:", response.status);
      return NextResponse.json(heuristicValidation(elementCount, questionText));
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || "";

    // Parse AI response
    const result = parseAIResponse(aiText);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[validate-drawing] Error:", err.message);
    return NextResponse.json({
      isCorrect: false,
      score: 0,
      explanation: "Something went wrong validating your drawing. Try again!",
    });
  }
}

// ─── BUILD VALIDATION PROMPT ────────────────────────────────────────────────
function buildValidationPrompt({ questionText, drawingCriteria, pngDataUrl, sceneData, elementCount, subject, topic }) {
  const systemPrompt = `You are a friendly, encouraging teacher validating a student's drawing for a ${subject || "general"} question.

TASK: Determine if the student's drawing correctly answers the question.

RULES:
- Be generous with young learners — partial credit for effort
- Focus on whether the core concept is demonstrated, not artistic quality
- Respond in this exact JSON format:
  {"isCorrect": true/false, "score": 0-100, "explanation": "brief friendly feedback"}
- The explanation should be 1-2 sentences, age-appropriate and encouraging
- Score guide: 0-30 = incorrect, 31-60 = partial, 61-80 = good, 81-100 = excellent`;

  const userContent = [];

  // Add text context
  let textPrompt = `Question: "${questionText}"\n`;
  if (drawingCriteria) {
    textPrompt += `Expected criteria: ${drawingCriteria}\n`;
  }
  if (topic) {
    textPrompt += `Topic: ${topic.replace(/_/g, " ")}\n`;
  }
  textPrompt += `The student drew ${elementCount} element(s).\n`;
  textPrompt += `Please evaluate if the drawing correctly answers the question.`;

  userContent.push({ type: "text", text: textPrompt });

  // Add image if available (vision model)
  if (pngDataUrl && pngDataUrl.startsWith("data:image/")) {
    userContent.push({
      type: "image_url",
      image_url: { url: pngDataUrl, detail: "low" },
    });
  } else if (sceneData?.elements?.length > 0) {
    // Fallback: describe the Excalidraw elements textually
    const elementDesc = sceneData.elements
      .slice(0, 20)
      .map((el) => `${el.type}${el.text ? `: "${el.text}"` : ""}`)
      .join(", ");
    userContent.push({
      type: "text",
      text: `Drawing elements: [${elementDesc}]`,
    });
  }

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];
}

// ─── PARSE AI RESPONSE ──────────────────────────────────────────────────────
function parseAIResponse(text) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isCorrect: parsed.isCorrect ?? (parsed.score > 50),
        score: Math.min(100, Math.max(0, parsed.score ?? 0)),
        explanation: parsed.explanation || "Thanks for your drawing!",
      };
    }
  } catch (e) {
    // JSON parsing failed
  }

  // Fallback: look for keywords
  const lower = text.toLowerCase();
  const isCorrect = lower.includes("correct") || lower.includes("well done") || lower.includes("good");
  return {
    isCorrect,
    score: isCorrect ? 70 : 30,
    explanation: text.slice(0, 200) || "Thanks for your drawing!",
  };
}

// ─── HEURISTIC FALLBACK ─────────────────────────────────────────────────────
function heuristicValidation(elementCount, questionText) {
  // Without AI, give generous credit based on effort (element count)
  if (elementCount >= 5) {
    return {
      isCorrect: true,
      score: 75,
      explanation: "Great effort on your drawing! You included lots of detail.",
    };
  }
  if (elementCount >= 3) {
    return {
      isCorrect: true,
      score: 60,
      explanation: "Good start! Try adding more detail to your drawing next time.",
    };
  }
  return {
    isCorrect: false,
    score: 25,
    explanation: "Try adding more to your drawing to fully answer the question.",
  };
}
