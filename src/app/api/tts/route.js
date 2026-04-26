// ─── src/app/api/tts/route.js ─────────────────────────────────────────────────
// Server-side Text-to-Speech endpoint using OpenAI TTS API.
//
// POST /api/tts
// Body: { text: string, voice?: string, speed?: number }
// Returns: audio/mpeg binary stream
//
// Voices available (OpenAI TTS):
//   alloy   — neutral, versatile
//   echo    — male, clear
//   fable   — male, warm narrative
//   onyx    — male, deep authoritative
//   nova    — female, warm (best for KS1)
//   shimmer — female, soft
//
// This endpoint caches responses via Cache-Control headers.
// The client useReadAloud hook maintains an in-memory blob URL cache
// so the same phrase is never re-fetched in the same session.

import { NextResponse } from "next/server";
import { ttsSchema } from "@/lib/validation";

// Map from curriculum-specific voice names to OpenAI voice IDs.
// (useReadAloud passes these through from VOICE_MAP)
const VOICE_ALIAS = {
  // UK / default → warm female voice
  "en-GB-SoniaNeural": "nova",
  "en-GB-RyanNeural":  "fable",
  // Nigerian → use shimmer (closest warm female)
  "en-NG-EzinneNeural": "shimmer",
  "en-NG-AbeoNeural":   "onyx",
  // North American
  "en-US-JennyNeural":  "nova",
  "en-US-GuyNeural":    "echo",
  // Australian
  "en-AU-NatashaNeural": "shimmer",
  // Passthrough if caller already sends OpenAI voice names
  alloy: "alloy", echo: "echo", fable: "fable", onyx: "onyx", nova: "nova", shimmer: "shimmer",
};

const VALID_VOICES = new Set(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]);
const MAX_TEXT_LENGTH = 4096; // OpenAI limit

export async function POST(req) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = ttsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const { text, voice: rawVoice = "nova", speed = 0.9 } = parsed.data;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "TTS not configured — OPENAI_API_KEY missing" },
        { status: 503 }
      );
    }

    // Resolve voice alias, default to nova
    const resolvedVoice = VOICE_ALIAS[rawVoice] || "nova";
    const voice = VALID_VOICES.has(resolvedVoice) ? resolvedVoice : "nova";

    // Clamp speed to OpenAI's supported range [0.25 – 4.0]
    const clampedSpeed = Math.max(0.25, Math.min(4.0, Number(speed) || 0.9));

    // Truncate and clean text
    const cleanText = text
      .replace(/<[^>]*>/g, "")      // strip HTML
      .replace(/\*\*|__/g, "")      // strip markdown
      .replace(/[#*_~`]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_TEXT_LENGTH);

    if (!cleanText) {
      return NextResponse.json({ error: "text is empty after cleaning" }, { status: 400 });
    }

    const ttsResp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",       // tts-1-hd for higher quality at ~2× cost
        input: cleanText,
        voice,
        speed: clampedSpeed,
      }),
    });

    if (!ttsResp.ok) {
      const errText = await ttsResp.text().catch(() => "");
      console.error(`[/api/tts] OpenAI error ${ttsResp.status}:`, errText);
      return NextResponse.json(
        { error: `TTS service error: ${ttsResp.status}` },
        { status: 502 }
      );
    }

    const audioBuffer = await ttsResp.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        // Cache for 1 hour in CDN / browser — identical text+voice = identical audio
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[/api/tts] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
