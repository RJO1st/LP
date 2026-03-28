// ─── src/hooks/useReadAloud.js ────────────────────────────────────────────────
// Text-to-speech hook for LaunchPard scholars.
//
// KS1  (Year 1-2):  ON by default — reads questions, options, explanations, Tara
// KS2  (Year 3-6):  OFF by default — toggle available, reads questions when on
// KS3  (Year 7-9):  OFF by default — toggle available, reads questions when on
// KS4  (Year 10-11): OFF by default — toggle available, reads questions when on
//
// Primary: Voice Magic (Edge TTS) for natural voices
// Fallback: Browser Web Speech API (always available)
//
// Usage:
//   const ra = useReadAloud(scholar);
//   useEffect(() => { ra.speak(questionText); }, [questionText]);
//   // After answer: ra.speakExplanation(explanation);
//   // After Tara:   ra.speakTaraResponse(taraText);

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

// ─── Key Stage helpers ──────────────────────────────────────────────────────

/** Determine KS from year level (works across all curricula) */
export function getKeyStage(scholar) {
  const year = Number(scholar?.year_level || scholar?.year || 99);
  if (year <= 2) return 1;
  if (year <= 6) return 2;
  if (year <= 9) return 3;
  if (year <= 11) return 4;
  return 4; // fallback
}

const isKS1 = (scholar) => getKeyStage(scholar) === 1;

// Voice preferences by curriculum
const VOICE_MAP = {
  uk_national:    "en-GB-SoniaNeural",
  uk_11plus:      "en-GB-SoniaNeural",
  ng_primary:     "en-NG-EzinneNeural",
  ng_jss:         "en-NG-EzinneNeural",
  ng_sss:         "en-NG-AbeoNeural",
  ca_primary:     "en-US-JennyNeural",
  ca_secondary:   "en-US-GuyNeural",
  us_common_core: "en-US-JennyNeural",
  aus_acara:      "en-AU-NatashaNeural",
  default:        "en-GB-SoniaNeural",
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

// ─── Clean text util ────────────────────────────────────────────────────────

function cleanForSpeech(text) {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "")          // strip HTML
    .replace(/\*\*|__/g, "")          // strip markdown bold
    .replace(/[#*_~`]/g, "")          // strip remaining markdown
    .replace(/\s+/g, " ")             // collapse whitespace
    .replace(/Tara:\s*/gi, "")        // strip "Tara:" prefix for natural speech
    .trim();
}

// ─── HOOK ───────────────────────────────────────────────────────────────────

export function useReadAloud(scholar) {
  const [enabled, setEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);
  const abortRef = useRef(null);
  const queueRef = useRef([]); // speech queue for sequential reads

  const ks = useMemo(() => getKeyStage(scholar), [scholar?.year_level, scholar?.year]);
  const ks1 = ks === 1;

  // ── Auto-enable based on key stage ─────────────────────────────────────
  useEffect(() => {
    try {
      const pref = localStorage.getItem(`lp_readaloud_${scholar?.id}`);
      if (ks1) {
        // KS1: ON by default unless parent explicitly toggled off
        setEnabled(pref !== "false");
      } else {
        // KS2-4: OFF by default unless scholar explicitly toggled on
        setEnabled(pref === "true");
      }
    } catch {
      setEnabled(ks1);
    }
  }, [scholar?.id, ks1]);

  // Save preference when toggled
  const toggleEnabled = useCallback((val) => {
    setEnabled(val);
    try { localStorage.setItem(`lp_readaloud_${scholar?.id}`, String(val)); } catch {}
  }, [scholar?.id]);

  // ── Stop all speech ────────────────────────────────────────────────────
  const stop = useCallback(() => {
    setSpeaking(false);
    queueRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // ── Core speak function ────────────────────────────────────────────────
  const speak = useCallback(async (text, { force = false } = {}) => {
    // force: speak even if globally disabled (used for one-off speaker button taps)
    if (!text || (!enabled && !force)) return;
    stop();

    const clean = cleanForSpeech(text);
    if (!clean) return;
    setSpeaking(true);

    const ttsUrl = process.env.NEXT_PUBLIC_TTS_API_URL;
    const voice = VOICE_MAP[scholar?.curriculum] || VOICE_MAP.default;

    // Primary: Cloudflare Worker with OpenAI TTS
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
            speed: ks1 ? 0.85 : 0.9, // slightly slower for KS1
          }),
        });

        if (resp.ok) {
          const blob = await resp.blob();
          if (blob.size > 100) {
            const url = URL.createObjectURL(blob);
            audioRef.current = new Audio(url);
            audioRef.current.onended = () => {
              setSpeaking(false);
              URL.revokeObjectURL(url);
              // Process queue if there are pending items
              processQueue();
            };
            audioRef.current.onerror = () => { setSpeaking(false); processQueue(); };
            await audioRef.current.play();
            return;
          }
        }
        console.warn("[useReadAloud] TTS API returned non-ok, falling back");
      } catch (err) {
        if (err.name === "AbortError") { setSpeaking(false); return; }
        console.warn("[useReadAloud] TTS API failed:", err.message);
      }
    }

    // Fallback: Web Speech API
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = ks1 ? 0.8 : 0.85;
      utterance.pitch = 1.05;
      utterance.volume = 1;

      const browserVoice = getWebSpeechVoice(scholar?.curriculum);
      if (browserVoice) utterance.voice = browserVoice;

      utterance.onend = () => { setSpeaking(false); processQueue(); };
      utterance.onerror = () => { setSpeaking(false); processQueue(); };

      window.speechSynthesis.speak(utterance);
    } else {
      setSpeaking(false);
    }
  }, [enabled, stop, scholar?.curriculum, ks1]);

  // ── Queue processor for sequential speech ──────────────────────────────
  const processQueue = useCallback(() => {
    if (queueRef.current.length > 0) {
      const next = queueRef.current.shift();
      // Small gap between sequential reads
      setTimeout(() => next(), 300);
    }
  }, []);

  // ── Speak options (A, B, C, D) ─────────────────────────────────────────
  const speakOptions = useCallback(async (options) => {
    if (!enabled || !options?.length) return;
    const text = options
      .map((opt, i) => `${String.fromCharCode(65 + i)}: ${typeof opt === "string" ? opt : opt?.text || opt}`)
      .join(". ");
    await speak(text);
  }, [enabled, speak]);

  // ── Speak explanation after answer (KS1 auto, KS2-4 only if enabled) ──
  const speakExplanation = useCallback((explanationText) => {
    if (!explanationText || !enabled) return;
    // For KS1: always read explanations when enabled (which is default)
    // For KS2-4: only if they've toggled read-aloud on
    const clean = cleanForSpeech(explanationText);
    if (!clean) return;

    // Queue it so it plays after any current speech finishes
    if (speaking) {
      queueRef.current.push(() => speak(clean));
    } else {
      // Short delay so the visual explanation renders first
      setTimeout(() => speak(clean), 600);
    }
  }, [enabled, speaking, speak]);

  // ── Speak Tara's response (KS1 auto, KS2-4 only if enabled) ───────────
  const speakTaraResponse = useCallback((taraText) => {
    if (!taraText || !enabled) return;
    const clean = cleanForSpeech(taraText);
    if (!clean) return;

    // Queue after any current speech
    if (speaking) {
      queueRef.current.push(() => speak(clean));
    } else {
      setTimeout(() => speak(clean), 400);
    }
  }, [enabled, speaking, speak]);

  return {
    speak,
    speakOptions,
    speakExplanation,
    speakTaraResponse,
    stop,
    speaking,
    enabled,
    setEnabled: toggleEnabled,
    isKS1: ks1,
    keyStage: ks,
  };
}
