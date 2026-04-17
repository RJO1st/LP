"use client";
/**
 * TaraEIB.jsx
 * Deploy to: src/components/game/TaraEIB.jsx
 *
 * Tara's "Teach First" explanation panel — shown after a wrong answer.
 *
 * NEW DESIGN (April 2026):
 *   • Shows the DB explanation prominently as Tara's teaching content.
 *   • If no DB explanation exists, fires a quick API call to get one.
 *   • Auto-unlocks the "Next" button after 1.5 s — scholars must SEE it,
 *     but are never blocked waiting for keyboard input.
 *   • Mandatory textarea removed entirely. No "Tell Tara" button.
 *   • Optional follow-up question still available for curious scholars.
 *
 * Exports:
 *   default  TaraEIB    — the explanation + follow-up widget
 *   named    useTaraGate — hook to track whether the panel is done
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { BookOpen, MessageCircle } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import MathsDiagram from "@/components/MathsDiagram";

// ─── PROFANITY GUARD (follow-up input) ───────────────────────────────────────
const BLOCKED_WORDS = [
  "fuck","shit","bitch","bastard","asshole","cunt","dick","cock","pussy",
  "nigger","nigga","faggot","retard","whore","slut","damn","hell","ass",
  "bollocks","wanker","twat","piss","arse","crap",
];
const containsProfanity = (text) => {
  const lower = text.toLowerCase().replace(/[^a-z\s]/g, " ");
  return BLOCKED_WORDS.some(w => lower.split(/\s+/).includes(w));
};

// ─── LOCAL FALLBACK EXPLANATION ──────────────────────────────────────────────
// Used ONLY when the API is unreachable AND the DB has no explanation.
// Gives an actual teaching statement — never "try naming the grammar rule".
const LOCAL_EXPLANATION = (correctAnswer, subject, scholarName, band) => {
  const name = scholarName || "Scholar";
  const ans  = correctAnswer || "the correct option";

  const byBand = {
    ks1: `Tara: The correct answer is "${ans}"! Look at the explanation above to understand why — that's how you'll remember it next time! 🌟`,
    ks2: `Tara: The correct answer is "${ans}", Commander ${name}. Understanding the *why* is how top Commanders learn — read the explanation carefully! 🚀`,
    ks3: `Tara: The correct answer is "${ans}". Make sure you understand the reasoning behind it, not just the answer itself.`,
    ks4: `Tara: The correct answer is "${ans}". Focus on the method — examiners award marks for working, not just the final result.`,
  };

  return byBand[band] || byBand.ks2;
};

// ─── CURRENCY-YEAR MAPPING ────────────────────────────────────────────────────
function computeScholarYear(student) {
  const rawYear = parseInt(student?.year_level || student?.year || 4);
  const cur = (student?.curriculum || "").toLowerCase();
  if (cur === "ng_jss") return rawYear + 6;
  if (cur === "ng_sss") return rawYear + 9;
  if (cur.startsWith("ng_") && rawYear <= 6) return rawYear + 5;
  return rawYear;
}

// ─── BAND-THEMED STYLING ──────────────────────────────────────────────────────
const BAND_THEMES = {
  ks1: {
    container:    "bg-purple-50 border-purple-200",
    header:       "text-purple-800",
    correct:      "text-purple-900 font-black",
    explanation:  "border-purple-200 bg-purple-50/80 text-purple-900",
    badge:        "text-purple-500",
    followUpLabel:"text-purple-700",
    followUpBtn:  "text-purple-700 border-purple-300 hover:bg-purple-50",
    input:        "border-purple-200 focus:border-purple-400 text-purple-900",
    accent:       "purple",
  },
  ks2: {
    container:    "bg-cyan-950/60 border-cyan-700/30",
    header:       "text-cyan-300",
    correct:      "text-white font-black",
    explanation:  "border-cyan-800/30 bg-cyan-950/50 text-cyan-100",
    badge:        "text-cyan-500",
    followUpLabel:"text-cyan-400",
    followUpBtn:  "text-cyan-300 border-cyan-700/40 hover:bg-cyan-900/40 bg-cyan-950/30",
    input:        "border-cyan-700/40 focus:border-cyan-400 bg-cyan-950/40 text-cyan-100 placeholder:text-cyan-600",
    accent:       "cyan",
  },
  ks3: {
    container:    "bg-slate-800/60 border-slate-600/30",
    header:       "text-teal-300",
    correct:      "text-white font-black",
    explanation:  "border-slate-700/30 bg-slate-800/50 text-slate-200",
    badge:        "text-teal-500",
    followUpLabel:"text-teal-400",
    followUpBtn:  "text-teal-300 border-slate-600/40 hover:bg-slate-700/40 bg-slate-800/30",
    input:        "border-slate-600/40 focus:border-teal-400 bg-slate-800/40 text-slate-100 placeholder:text-slate-500",
    accent:       "teal",
  },
  ks4: {
    container:    "bg-slate-900/60 border-indigo-700/30",
    header:       "text-indigo-300",
    correct:      "text-white font-black",
    explanation:  "border-indigo-800/30 bg-slate-900/50 text-indigo-200",
    badge:        "text-indigo-500",
    followUpLabel:"text-indigo-400",
    followUpBtn:  "text-indigo-300 border-indigo-700/40 hover:bg-indigo-900/40 bg-slate-900/30",
    input:        "border-indigo-700/40 focus:border-indigo-400 bg-slate-900/40 text-slate-100 placeholder:text-indigo-500",
    accent:       "indigo",
  },
};

// ─── TARA EIB COMPONENT ───────────────────────────────────────────────────────
export default function TaraEIB({
  student,
  subject,
  currentQ,
  correctAnswer,
  scholarAnswer,
  onFeedbackReceived,
  band,
  onSpeak,
}) {
  const [aiExplanation,    setAiExplanation]    = useState("");
  const [loadingAI,        setLoadingAI]        = useState(false);
  const [diagramSpec,      setDiagramSpec]      = useState(null);   // Mode 2: Tara-generated diagram

  // Follow-up state
  const [followUpText,     setFollowUpText]     = useState("");
  const [followUpFeedback, setFollowUpFeedback] = useState("");
  const [followUpDiagram,  setFollowUpDiagram]  = useState(null);   // Mode 2: diagram from follow-up
  const [followUpLoading,  setFollowUpLoading]  = useState(false);
  const [followUpLocked,   setFollowUpLocked]   = useState(false);
  const [followUpWarn,     setFollowUpWarn]     = useState(false);

  const unlockedRef = useRef(false);

  const dbExplanation = currentQ?.explanation || currentQ?.exp || "";
  const scholarYear   = computeScholarYear(student);
  const t             = BAND_THEMES[band] || BAND_THEMES.ks2;

  // ── On mount: show explanation and auto-unlock Next ───────────────────────
  useEffect(() => {
    if (unlockedRef.current) return;

    const unlock = () => {
      if (!unlockedRef.current) {
        unlockedRef.current = true;
        onFeedbackReceived?.();
      }
    };

    if (dbExplanation) {
      // DB explanation available — speak it, unlock after 1.5 s read time
      onSpeak?.(dbExplanation);
      const timer = setTimeout(unlock, 1500);
      return () => clearTimeout(timer);
    }

    // No DB explanation — ask Tara to explain it
    setLoadingAI(true);
    const controller = new AbortController();
    // Hard 5 s ceiling; unlock regardless so scholars are never stuck
    const hardUnlock = setTimeout(() => {
      if (!unlockedRef.current) {
        const fallback = LOCAL_EXPLANATION(correctAnswer, subject, student?.name, band);
        setAiExplanation(fb => fb || fallback);
        setLoadingAI(false);
        unlock();
      }
    }, 5500);

    apiFetch("/api/tara", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      signal:  controller.signal,
      body:    JSON.stringify({
        // Pass a neutral context marker — tara/route.js explains why the
        // correct answer is right when the scholar text is this phrase.
        text:         `The correct answer is ${correctAnswer}. Please explain why.`,
        subject,
        correctAnswer,
        scholarAnswer,
        scholarName:  student?.name,
        scholarYear,
        question:     currentQ,
        explanation:  "",          // no DB explanation — that's why we're here
        curriculum:   student?.curriculum || "",
        mode:         "eib",
      }),
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!unlockedRef.current) {
          const text = data?.feedback
            || LOCAL_EXPLANATION(correctAnswer, subject, student?.name, band);
          setAiExplanation(text);
          if (data?.diagram_spec) setDiagramSpec(data.diagram_spec);
          setLoadingAI(false);
          onSpeak?.(text);
          unlock();
        }
      })
      .catch(() => {
        if (!unlockedRef.current) {
          const fallback = LOCAL_EXPLANATION(correctAnswer, subject, student?.name, band);
          setAiExplanation(fallback);
          setLoadingAI(false);
          unlock();
        }
      })
      .finally(() => clearTimeout(hardUnlock));

    return () => {
      controller.abort();
      clearTimeout(hardUnlock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Follow-up submit ──────────────────────────────────────────────────────
  const handleFollowUp = useCallback(async () => {
    if (!followUpText.trim() || followUpLocked) return;

    if (containsProfanity(followUpText)) {
      setFollowUpWarn(true);
      setFollowUpText("");
      return;
    }
    setFollowUpWarn(false);
    setFollowUpLoading(true);

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await apiFetch("/api/tara", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        signal:  controller.signal,
        body:    JSON.stringify({
          text:         followUpText,
          subject,
          correctAnswer,
          scholarAnswer,
          scholarName:  student?.name,
          scholarYear,
          question:     currentQ,
          explanation:  dbExplanation,
          mode:         "followup",
          context:      dbExplanation || aiExplanation,
          curriculum:   student?.curriculum || "",
        }),
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.feedback) throw new Error("Empty");
      setFollowUpFeedback(data.feedback);
      if (data.diagram_spec) setFollowUpDiagram(data.diagram_spec);
      onSpeak?.(data.feedback);
    } catch {
      clearTimeout(timeout);
      const fallback = `Tara: Great question, ${student?.name || "Scholar"}! Keep that curiosity — it's what makes great learners. 🚀`;
      setFollowUpFeedback(fallback);
      onSpeak?.(fallback);
    } finally {
      setFollowUpLoading(false);
      setFollowUpLocked(true);
    }
  }, [followUpText, followUpLocked, subject, correctAnswer, currentQ, student, scholarYear, dbExplanation, aiExplanation, onSpeak]);

  const handleFollowUpKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !followUpLocked) {
      e.preventDefault();
      handleFollowUp();
    }
  };

  // ── What to display ───────────────────────────────────────────────────────
  const displayExplanation = dbExplanation || aiExplanation;

  return (
    <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border mb-3 ${t.container}`}>

      {/* ── Header: show correct answer ── */}
      <p className={`font-bold text-xs sm:text-sm mb-2 sm:mb-3 flex items-start gap-1.5 ${t.header}`}>
        <BookOpen size={14} className="shrink-0 mt-0.5" />
        <span>
          {scholarAnswer && scholarAnswer !== correctAnswer ? (
            <>
              You chose <span className="underline">{scholarAnswer}</span> — the correct
              answer is <span className={t.correct}>{correctAnswer}</span>.
            </>
          ) : (
            <>
              The correct answer is <span className={t.correct}>{correctAnswer}</span>.
            </>
          )}
        </span>
      </p>

      {/* ── Tara's explanation (primary teaching content) ── */}
      <div className={`p-3 sm:p-4 rounded-lg border text-xs sm:text-sm leading-relaxed ${t.explanation}`}>
        {loadingAI ? (
          <span className="opacity-50 italic">Tara is preparing an explanation…</span>
        ) : displayExplanation ? (
          <>
            <span className={`font-black uppercase tracking-wide text-[10px] block mb-1.5 opacity-60 ${t.badge}`}>
              Tara · Explanation
            </span>
            <span className="font-medium">{displayExplanation}</span>
          </>
        ) : (
          <span className="opacity-50 italic">No explanation available for this question.</span>
        )}
      </div>

      {/* ── Mode 2: Tara-generated diagram in feedback ── */}
      {diagramSpec && !loadingAI && (
        <div className="flex justify-center mt-3">
          <MathsDiagram
            spec={diagramSpec}
            width={280}
            height={280}
            className="rounded-lg border border-current/10"
          />
        </div>
      )}

      {/* ── Optional follow-up question ── */}
      {!followUpFeedback && (
        <div className="mt-3 border-t border-current/10 pt-3">
          <p className={`font-bold text-xs mb-2 flex items-center gap-1 ${t.followUpLabel}`}>
            <MessageCircle size={12} />
            Still curious? Ask Tara a follow-up question
          </p>

          {followUpWarn && (
            <p className="text-red-600 font-bold text-xs mb-2 bg-red-50 border border-red-200 rounded-lg p-2">
              ⚠️ Let's keep it respectful! Rephrase and try again.
            </p>
          )}

          <textarea
            value={followUpText}
            onChange={(e) => setFollowUpText(e.target.value)}
            onKeyDown={handleFollowUpKeyDown}
            disabled={followUpLocked}
            rows={2}
            placeholder={`e.g. "Why does that rule apply here?" or "Can you show another example?"`}
            className={`w-full p-2 sm:p-3 rounded-lg sm:rounded-xl border font-medium text-xs sm:text-sm mb-2 resize-none focus:outline-none disabled:opacity-60 ${t.input}`}
          />
          <button
            onClick={handleFollowUp}
            disabled={!followUpText.trim() || followUpLoading || followUpLocked}
            className={`w-full font-black py-2 rounded-lg text-xs uppercase tracking-widest border-2 disabled:opacity-40 flex items-center justify-center gap-1 transition-all ${t.followUpBtn}`}
          >
            <MessageCircle size={12} />
            {followUpLoading ? "Tara is thinking…" : "Ask Tara →"}
          </button>
        </div>
      )}

      {/* ── Follow-up response ── */}
      {followUpFeedback && (
        <div className="mt-3 border-t border-current/10 pt-3">
          <p className={`font-bold text-xs mb-1 flex items-center gap-1 ${t.followUpLabel}`}>
            <MessageCircle size={12} /> Your question
          </p>
          <p className={`text-xs italic mb-2 opacity-70 ${t.header}`}>"{followUpText}"</p>
          <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border font-medium italic text-xs sm:text-sm leading-relaxed ${t.explanation}`}>
            {followUpFeedback}
          </div>
          {/* Mode 2: diagram from follow-up response */}
          {followUpDiagram && (
            <div className="flex justify-center mt-3">
              <MathsDiagram
                spec={followUpDiagram}
                width={260}
                height={260}
                className="rounded-lg border border-current/10"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── useTaraGate ──────────────────────────────────────────────────────────────
export function useTaraGate() {
  const [taraComplete, setTaraComplete] = useState(false);
  const onFeedbackReceived = useCallback(() => setTaraComplete(true), []);
  const resetTara          = useCallback(() => setTaraComplete(false), []);
  return { taraComplete, onFeedbackReceived, resetTara };
}
