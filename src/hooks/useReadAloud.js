// ─── Deploy to: src/hooks/useReadAloud.js ────────────────────────────────────
// Text-to-speech hook for KS1 scholars (Year 1-2, age 5-7).
// Primary: Voice Magic (Edge TTS) for natural voices
// Fallback: Browser Web Speech API (always available)
//
// Usage in QuizShell:
//   const { speak, stop, speaking, enabled, setEnabled } = useReadAloud(scholar);
//   useEffect(() => { if (enabled) speak(questionText); }, [questionText]);

import { useState, useCallback, useRef, useEffect } from "react";

// Scholars in Year 1-2 (any curriculum) get read-aloud enabled by default
const isKS1 = (scholar) => {
  const year = Number(scholar?.year_level || scholar?.year || 99);
  return year <= 2;
};

// Voice preferences by curriculum
const VOICE_MAP = {
  uk_national:  "en-GB-SoniaNeural",
  uk_11plus:    "en-GB-SoniaNeural",
  ng_primary:   "en-NG-EzinneNeural",
  ng_jss:       "en-NG-EzinneNeural",
  ng_sss:       "en-NG-AbeoNeural",
  ca_primary:   "en-US-JennyNeural",
  ca_secondary: "en-US-GuyNeural",
  us_common_core: "en-US-JennyNeural",
  aus_acara:    "en-AU-NatashaNeural",
  default:      "en-GB-SoniaNeural",
};

// Web Speech API fallback voice selection
function getWebSpeechVoice(curriculum) {
  const voices = window.speechSynthesis?.getVoices() || [];
  const lang = curriculum?.startsWith("us_") || curriculum?.startsWith("ca_") ? "en-US" : "en-GB";
  
  // Prefer female voices for younger scholars
  const preferred = voices.find(v => 
    v.lang.startsWith(lang) && v.name.toLowerCase().includes("female")
  );
  const fallback = voices.find(v => v.lang.startsWith(lang));
  return preferred || fallback || voices[0] || null;
}

export function useReadAloud(scholar) {
  const [enabled, setEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);
  const abortRef = useRef(null);

  // Auto-enable for KS1 scholars
  useEffect(() => {
    if (isKS1(scholar)) {
      // Check localStorage preference (parent may have toggled off)
      try {
        const pref = localStorage.getItem(`lp_readaloud_${scholar?.id}`);
        setEnabled(pref !== "false"); // default ON for KS1
      } catch {
        setEnabled(true);
      }
    }
  }, [scholar?.id, scholar?.year_level]);

  // Save preference when toggled
  const toggleEnabled = useCallback((val) => {
    setEnabled(val);
    try { localStorage.setItem(`lp_readaloud_${scholar?.id}`, String(val)); } catch {}
  }, [scholar?.id]);

  const stop = useCallback(() => {
    setSpeaking(false);
    // Stop audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    // Stop Web Speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // Abort fetch
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const speak = useCallback(async (text) => {
    if (!text || !enabled) return;
    stop();

    // Clean text: remove markdown, HTML, excess whitespace
    const clean = text
      .replace(/<[^>]*>/g, "")
      .replace(/\*\*|__/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!clean) return;
    setSpeaking(true);

    const ttsUrl = process.env.NEXT_PUBLIC_TTS_API_URL;
    const voice = VOICE_MAP[scholar?.curriculum] || VOICE_MAP.default;

    // Primary: Cloudflare Worker with OpenAI TTS (if configured)
    if (ttsUrl) {
      try {
        abortRef.current = new AbortController();
        
        const resp = await fetch(`${ttsUrl}/v1/audio/speech`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortRef.current.signal,
          body: JSON.stringify({
            input: clean,
            voice,
            speed: 0.9,
          }),
        });

        if (resp.ok) {
          const blob = await resp.blob();
          if (blob.size > 100) { // valid audio, not an error message
            const url = URL.createObjectURL(blob);
            audioRef.current = new Audio(url);
            audioRef.current.onended = () => {
              setSpeaking(false);
              URL.revokeObjectURL(url);
            };
            audioRef.current.onerror = () => setSpeaking(false);
            await audioRef.current.play();
            return; // success — do NOT fall through to browser speech
          }
        }
        // API returned error — fall through to browser speech
        console.warn("[useReadAloud] TTS API returned non-ok, falling back");
      } catch (err) {
        if (err.name === "AbortError") { setSpeaking(false); return; }
        console.warn("[useReadAloud] TTS API failed:", err.message);
      }
    }

    // Fallback: Web Speech API (only used when no TTS API URL is configured, or API fails)
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 0.85;
      utterance.pitch = 1.05;
      utterance.volume = 1;
      
      const browserVoice = getWebSpeechVoice(scholar?.curriculum);
      if (browserVoice) utterance.voice = browserVoice;

      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    } else {
      setSpeaking(false);
    }
  }, [enabled, stop, scholar?.curriculum]);

  // Also speak options when they appear (for KS1)
  const speakOptions = useCallback(async (options) => {
    if (!enabled || !options?.length) return;
    const text = options.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt}`).join(". ");
    await speak(text);
  }, [enabled, speak]);

  return {
    speak,
    speakOptions,
    stop,
    speaking,
    enabled,
    setEnabled: toggleEnabled,
    isKS1: isKS1(scholar),
  };
}