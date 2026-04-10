// ─── src/hooks/useReadAloud.js ────────────────────────────────────────────────
// Text-to-speech hook for LaunchPard scholars.
//
// KS1  (Year 1-2):  ON by default — reads questions, options, explanations, Tara
// KS2  (Year 3-6):  OFF by default — toggle available
// KS3  (Year 7-9):  OFF by default — toggle available
// KS4  (Year 10-11): OFF by default — toggle available
//
// Primary:  /api/tts  (server-side OpenAI TTS — natural voices, no cold start)
// Fallback: Browser Web Speech API — ONLY used when /api/tts is unavailable
//           (NOT used merely because autoplay was blocked; iOS unlock handles that)
//
// iOS / Chrome on iPad fix:
//   iOS requires a user gesture before HTMLAudioElement.play() is allowed.
//   We install a one-time touchstart + click listener that plays a silent audio
//   on the first user interaction, permanently unlocking the audio context for
//   the page session.  All subsequent speak() calls then work without a gesture.
//   If play() is still blocked (e.g. speak() fires before any touch has occurred),
//   we fail silently rather than degrading to the lower-quality browser TTS —
//   the scholar can tap the speaker button (itself a user gesture) to retry.
//
// Cold-start elimination: call ra.prefetch(text) when a question LOADS so audio
// is already cached by the time the scholar clicks play or auto-play fires.
//
// Usage:
//   const ra = useReadAloud(scholar);
//   useEffect(() => { ra.prefetch(questionText); }, [questionText]);
//   useEffect(() => { ra.speak(questionText); }, [questionText]);
//   ra.speakExplanation(explanation);
//   ra.speakTaraResponse(taraText);

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

// ─── iOS audio unlock ───────────────────────────────────────────────────────
// Module-level flag: true once a silent audio has been successfully played
// in response to a user gesture.  Shared across all hook instances on the page.

let _audioUnlocked = false;

// A valid, zero-duration, single-sample silent WAV (44 bytes).
// RIFF header + PCM fmt chunk + empty data chunk.
const SILENT_WAV_SRC =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

/**
 * Registers one-time event listeners to unlock HTMLAudioElement.play() on iOS.
 * Safe to call multiple times — is a no-op after the first call.
 */
function setupAudioUnlock() {
  if (typeof window === "undefined" || _audioUnlocked) return;

  const unlock = () => {
    if (_audioUnlocked) return; // already done
    try {
      const a = new Audio();
      a.src = SILENT_WAV_SRC;
      a.volume = 0;
      const p = a.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          a.pause();
          _audioUnlocked = true;
        }).catch(() => {
          // Unlock failed — user will need to trigger it on next interaction
        });
      } else {
        // Older engines: synchronous play, assume unlocked
        _audioUnlocked = true;
      }
    } catch {
      // Ignore — environment doesn't support Audio
    }
  };

  // touchstart fires before click on mobile; capture phase so we intercept it
  // even if a child element calls stopPropagation.
  document.addEventListener("touchstart", unlock, {
    once: true,
    passive: true,
    capture: true,
  });
  document.addEventListener("click", unlock, {
    once: true,
    capture: true,
  });
}

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

// ─── Web Speech API fallback — best available voice ─────────────────────────
// Used ONLY when /api/tts returns a non-2xx response (i.e. the server is down
// or the API key is missing).  NOT used when play() is autoplay-blocked.

function getBestBrowserVoice(curriculum) {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;

  const lang = (curriculum?.startsWith("us_") || curriculum?.startsWith("ca_"))
    ? "en-US"
    : "en-GB";

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
  const cacheRef   = useRef(new Map());
  // In-flight prefetch promises: cacheKey → Promise<blobUrl|null>
  const prefetchRef = useRef(new Map());

  const ks  = useMemo(() => getKeyStage(scholar), [scholar?.year_level, scholar?.year]);
  const ks1 = ks === 1;

  const voice = VOICE_MAP[scholar?.curriculum] || VOICE_MAP.default;

  // ── Install iOS audio unlock on first mount ─────────────────────────────
  useEffect(() => {
    setupAudioUnlock();
  }, []);

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
  // null means the /api/tts call itself failed — caller may fall back to browser TTS.
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
  const prefetch = useCallback((text) => {
    if (!text) return;
    const clean = cleanForSpeech(text);
    if (!clean) return;
    const key = cacheKey(clean, voice);
    if (cacheRef.current.has(key) || prefetchRef.current.has(key)) return;
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
          return; // Success
        } catch (playErr) {
          if (playErr.name === "NotAllowedError") {
            // iOS / Chrome autoplay blocked — audio was fetched successfully
            // and is cached.  Do NOT degrade to browser TTS — the scholar can
            // tap the speaker button (a user gesture) to replay.
            // The audio unlock registered on mount will fire on their next touch
            // so subsequent questions will play automatically.
            console.info("[useReadAloud] Autoplay blocked (iOS); tap speaker to play.");
            setSpeaking(false);
            resolve();
            return;
          }
          // Other play() error (decode, network, etc) — fall through to browser TTS
          console.warn("[useReadAloud] Audio.play() error:", playErr.message);
          setSpeaking(false);
        }
      }

      // ── Fallback: Browser Web Speech API ─────────────────────────────
      // Only reached when /api/tts returned null (server error / no API key),
      // OR when play() failed for a non-autoplay reason (e.g. decode error).
      // NOT reached for NotAllowedError — that is handled above.
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(clean);
        utterance.rate   = ks1 ? 0.8 : 0.85;
        utterance.pitch  = 1.05;
        utterance.volume = 1;

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
