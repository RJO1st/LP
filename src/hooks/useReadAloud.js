// ─── src/hooks/useReadAloud.js ────────────────────────────────────────────────
// Text-to-speech hook for LaunchPard scholars.
//
// KS1  (Year 1-2):  ON by default — reads questions, options, explanations, Tara
// KS2  (Year 3-6):  OFF by default — toggle available
// KS3  (Year 7-9):  OFF by default — toggle available
// KS4  (Year 10-11): OFF by default — toggle available
//
// Primary:  /api/tts  (server-side OpenAI TTS — natural voices, no cold start)
// Fallback: Browser Web Speech API (always available, lower quality)
//
// Cold-start elimination: call ra.prefetch(text) when a question LOADS so audio
// is already cached by the time the scholar clicks play or auto-play fires.
//
// Usage:
//   const ra = useReadAloud(scholar);
//   // Pre-load as soon as question is known:
//   useEffect(() => { ra.prefetch(questionText); }, [questionText]);
//   // Play:
//   useEffect(() => { ra.speak(questionText); }, [questionText]);
//   // After answer:
//   ra.speakExplanation(explanation);
//   // After Tara:
//   ra.speakTaraResponse(taraText);

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

// ─── Key Stage helpers ──────────────────────────────────────────────────────

/** Determine KS from year level (works across all curricula) */
export function getKeyStage(scholar) {
  const year = Number(scholar?.year_level || scholar?.year || 99);
  if (year <= 2) return 1;
  if (year <= 6) return 2;
  if (year <= 9) return 3;
  if (year <= 11) return 4;
  return 4;
}

const isKS1 = (scholar) => getKeyStage(scholar) === 1;

// Voice preferences by curriculum (resolved server-side to OpenAI voice IDs).
// These names are sent to /api/tts which converts them to the correct OpenAI voice.
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

// ─── Web Speech API fallback — best available voice ────────────────────────

function getBestBrowserVoice(curriculum) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;

  const lang = (curriculum?.startsWith("us_") || curriculum?.startsWith("ca_"))
    ? "en-US"
    : "en-GB";

  // Priority order: named high-quality voices > lang match > any English
  const priorities = [
    // macOS / iOS high-quality voices
    v => /Samantha|Karen|Tessa|Serena|Daniel|Moira|Fiona/i.test(v.name),
    // Any local (not network) voice for the right language
    v => v.lang.startsWith(lang) && v.localService,
    // Any voice for the right language
    v => v.lang.startsWith(lang),
    // Any English voice
    v => v.lang.startsWith("en"),
  ];

  for (const test of priorities) {
    const match = voices.find(test);
    if (match) return match;
  }
  return voices[0] || null;
}

// ─── Clean text util ────────────────────────────────────────────────────────

function cleanForSpeech(text) {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "")        // strip HTML
    .replace(/\*\*|__/g, "")        // strip markdown bold
    .replace(/[#*_~`]/g, "")        // strip remaining markdown
    .replace(/\s+/g, " ")           // collapse whitespace
    .replace(/Tara:\s*/gi, "")      // strip "Tara:" prefix for natural speech
    .trim();
}

// ─── Cache key ──────────────────────────────────────────────────────────────

function cacheKey(text, voice) {
  return `${voice}::${text.slice(0, 200)}`;
}

// ─── HOOK ───────────────────────────────────────────────────────────────────

export function useReadAloud(scholar) {
  const [enabled, setEnabled]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef   = useRef(null);
  const abortRef   = useRef(null);
  const queueRef   = useRef([]);
  // In-memory blob URL cache: cacheKey → blobUrl
  // Prevents re-fetching the same phrase multiple times in a session.
  const cacheRef   = useRef(new Map());
  // In-flight prefetch promises: cacheKey → Promise<blobUrl|null>
  const prefetchRef = useRef(new Map());

  const ks  = useMemo(() => getKeyStage(scholar), [scholar?.year_level, scholar?.year]);
  const ks1 = ks === 1;

  const voice = VOICE_MAP[scholar?.curriculum] || VOICE_MAP.default;

  // ── Auto-enable based on key stage ─────────────────────────────────────
  useEffect(() => {
    try {
      const pref = localStorage.getItem(`lp_readaloud_${scholar?.id}`);
      if (ks1) {
        setEnabled(pref !== "false");
      } else {
        setEnabled(pref === "true");
      }
    } catch {
      setEnabled(ks1);
    }
  }, [scholar?.id, ks1]);

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
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  // ── Fetch audio blob (with cache) ──────────────────────────────────────
  // Returns a blobUrl string or null on failure.
  const fetchAudio = useCallback(async (clean, signal) => {
    const key = cacheKey(clean, voice);

    // 1. Already cached — instant return
    if (cacheRef.current.has(key)) {
      return cacheRef.current.get(key);
    }

    // 2. Pre-fetch already in flight — wait for it
    if (prefetchRef.current.has(key)) {
      return prefetchRef.current.get(key);
    }

    // 3. Fetch from /api/tts
    const fetchPromise = (async () => {
      try {
        const resp = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            text: clean,
            voice,
            speed: ks1 ? 0.82 : 0.9,
          }),
        });

        if (!resp.ok) throw new Error(`TTS API ${resp.status}`);

        const blob = await resp.blob();
        if (blob.size < 100) throw new Error("Empty audio response");

        const url = URL.createObjectURL(blob);
        cacheRef.current.set(key, url);
        prefetchRef.current.delete(key);
        return url;
      } catch (err) {
        prefetchRef.current.delete(key);
        if (err.name === "AbortError") return null;
        console.warn("[useReadAloud] /api/tts failed:", err.message);
        return null;
      }
    })();

    prefetchRef.current.set(key, fetchPromise);
    return fetchPromise;
  }, [voice, ks1]);

  // ── Prefetch (fire-and-forget) ─────────────────────────────────────────
  // Call this when a question LOADS to eliminate cold-start lag.
  const prefetch = useCallback((text) => {
    if (!text) return;
    const clean = cleanForSpeech(text);
    if (!clean) return;
    const key = cacheKey(clean, voice);
    if (cacheRef.current.has(key) || prefetchRef.current.has(key)) return;
    // Start fetch without awaiting — result is cached for speak()
    fetchAudio(clean, new AbortController().signal);
  }, [fetchAudio, voice]);

  // ── Queue processor ────────────────────────────────────────────────────
  const processQueue = useCallback(() => {
    if (queueRef.current.length > 0) {
      const next = queueRef.current.shift();
      setTimeout(() => next(), 250);
    }
  }, []);

  // ── Core speak function ────────────────────────────────────────────────
  const speak = useCallback((text, { force = false } = {}) => {
    return new Promise(async (resolve) => {
      if (!text || (!enabled && !force)) { resolve(); return; }
      stop();

      const clean = cleanForSpeech(text);
      if (!clean) { resolve(); return; }
      setSpeaking(true);

      // ── Try /api/tts (OpenAI Neural TTS) ──────────────────────────────
      abortRef.current = new AbortController();
      const blobUrl = await fetchAudio(clean, abortRef.current.signal);

      if (blobUrl) {
        // Reuse existing Audio element or create new one
        if (!audioRef.current) audioRef.current = new Audio();
        audioRef.current.src = blobUrl;
        audioRef.current.playbackRate = 1.0;

        audioRef.current.onended = () => {
          setSpeaking(false);
          resolve();
          processQueue();
        };
        audioRef.current.onerror = () => {
          setSpeaking(false);
          resolve();
          processQueue();
        };

        try {
          await audioRef.current.play();
          return; // Success — we're done
        } catch (playErr) {
          // Autoplay blocked or other error → fall through to browser TTS
          console.warn("[useReadAloud] Audio.play() failed:", playErr.message);
          setSpeaking(false);
        }
      }

      // ── Fallback: Browser Web Speech API ─────────────────────────────
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate   = ks1 ? 0.8 : 0.85;
        utterance.pitch  = 1.05;
        utterance.volume = 1;

        // Voices may not be loaded yet — retry once if empty
        const trySetVoice = () => {
          const bv = getBestBrowserVoice(scholar?.curriculum);
          if (bv) utterance.voice = bv;
        };
        trySetVoice();
        if (!utterance.voice && window.speechSynthesis.onvoiceschanged !== undefined) {
          window.speechSynthesis.onvoiceschanged = trySetVoice;
        }

        utterance.onend   = () => { setSpeaking(false); resolve(); processQueue(); };
        utterance.onerror = () => { setSpeaking(false); resolve(); processQueue(); };

        setSpeaking(true);
        window.speechSynthesis.speak(utterance);
      } else {
        setSpeaking(false);
        resolve();
      }
    });
  }, [enabled, stop, fetchAudio, processQueue, scholar?.curriculum, ks1]);

  // ── Speak options (A, B, C, D) ─────────────────────────────────────────
  const speakOptions = useCallback(async (options) => {
    if (!enabled || !options?.length) return;
    const text = options
      .map((opt, i) => `${String.fromCharCode(65 + i)}: ${typeof opt === "string" ? opt : opt?.text || String(opt)}`)
      .join(". ");
    await speak(text);
  }, [enabled, speak]);

  // ── Speak explanation after answer ────────────────────────────────────
  const speakExplanation = useCallback((explanationText) => {
    if (!explanationText || !enabled) return;
    const clean = cleanForSpeech(explanationText);
    if (!clean) return;
    // Pre-fetch immediately in case it isn't cached yet
    prefetch(explanationText);
    if (speaking) {
      queueRef.current.push(() => speak(clean));
    } else {
      setTimeout(() => speak(clean), 600);
    }
  }, [enabled, speaking, speak, prefetch]);

  // ── Speak Tara's response ─────────────────────────────────────────────
  const speakTaraResponse = useCallback((taraText) => {
    if (!taraText || !enabled) return;
    const clean = cleanForSpeech(taraText);
    if (!clean) return;
    if (speaking) {
      queueRef.current.push(() => speak(clean));
    } else {
      setTimeout(() => speak(clean), 400);
    }
  }, [enabled, speaking, speak]);

  // ── Cleanup blob URLs on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      cacheRef.current.forEach((url) => {
        try { URL.revokeObjectURL(url); } catch {}
      });
      cacheRef.current.clear();
    };
  }, []);

  return {
    speak,
    speakOptions,
    speakExplanation,
    speakTaraResponse,
    prefetch,
    stop,
    speaking,
    enabled,
    setEnabled: toggleEnabled,
    isKS1: ks1,
    keyStage: ks,
  };
}
