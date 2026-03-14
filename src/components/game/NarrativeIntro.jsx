"use client";
/**
 * NarrativeIntro.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown before a quiz session starts. Displays the current realm, chapter,
 * and story text — making the scholar feel they are entering a mission
 * rather than starting a quiz.
 *
 * Props:
 *   scholar      - scholar DB row
 *   subject      - e.g. "mathematics"
 *   topic        - e.g. "fractions"
 *   masteryScore - current mastery 0-1 for this topic (optional)
 *   onStart      - callback when scholar taps "Begin Mission"
 *   narrativeState - DB row from narrative_state (optional)
 *
 * → src/components/game/NarrativeIntro.jsx
 */

import { useState, useEffect } from "react";
import {
  getRealmForSubject,
  getCurrentChapter,
  getChapterIntro,
  calcStoryPoints,
  REALMS,
} from "@/lib/narrativeEngine";
import { masteryToTier, masteryToPercent, masteryColour } from "@/lib/masteryEngine";

export default function NarrativeIntro({
  scholar,
  subject,
  topic,
  masteryScore = 0,
  onStart,
  narrativeState,
  masteryRecords = [],
  isDueReview = false,
}) {
  const [phase,     setPhase]     = useState("realm");   // realm → chapter → brief → ready
  const [displayed, setDisplayed] = useState("");        // typewriter text
  const [typing,    setTyping]    = useState(false);

  const realm   = getRealmForSubject(subject);
  const chapter = realm
    ? getCurrentChapter(realm.id, masteryRecords.filter(r => realm.subjects.includes(r.subject)))
    : null;
  const chapterIntro = chapter ? getChapterIntro(chapter.chapter?.id) : null;

  const tier         = masteryToTier(masteryScore);
  const masteryPct   = masteryToPercent(masteryScore);
  const topicDisplay = topic?.replace(/_/g, " ") ?? subject;

  // Mission brief — tailored to mastery level
  const missionBrief = getMissionBrief(
    scholar?.name ?? "Commander",
    topicDisplay,
    tier,
    isDueReview,
    realm
  );

  // Typewriter effect for story text
  useEffect(() => {
    if (phase !== "chapter" || !chapterIntro) return;
    setTyping(true);
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(chapterIntro.slice(0, i + 1));
      i++;
      if (i >= chapterIntro.length) {
        clearInterval(interval);
        setTyping(false);
      }
    }, 18);
    return () => clearInterval(interval);
  }, [phase, chapterIntro]);

  if (!realm) {
    // No narrative realm for this subject yet — show a clean launch screen
    const subjectLabel = {
      verbal: "Verbal Reasoning", verbal_reasoning: "Verbal Reasoning",
      nvr: "Non-Verbal Reasoning", non_verbal_reasoning: "Non-Verbal Reasoning",
      computing: "Computing",
    }[subject] || subject?.replace(/_/g, " ") || "Mission";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0e27] p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-2xl font-black text-white mb-2">Mission Starting</h2>
          <p className="text-slate-400 mb-4 capitalize">{subjectLabel}</p>
          {topic && (
            <p className="text-indigo-400 text-sm font-bold mb-6 capitalize">
              Topic: {topicDisplay}
            </p>
          )}
          {masteryScore > 0 && (
            <div className="bg-slate-800/60 rounded-2xl p-4 mb-6 border border-slate-700">
              <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Current Mastery</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-700 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{ width: `${masteryPct}%`, backgroundColor: masteryColour(masteryScore) }}
                  />
                </div>
                <span className="font-black text-sm" style={{ color: masteryColour(masteryScore) }}>
                  {masteryPct}%
                </span>
              </div>
            </div>
          )}
          <button
            onClick={onStart}
            className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all active:scale-95 bg-indigo-600 hover:bg-indigo-700"
            style={{ boxShadow: "0 0 20px rgba(99,102,241,0.4)" }}
          >
            🚀 Begin Mission
          </button>
          <button
            onClick={onStart}
            className="w-full mt-3 py-2 text-slate-500 text-sm hover:text-slate-300 transition-colors"
          >
            Skip intro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0e27] overflow-hidden">

      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${realm.colour}44 0%, transparent 70%)`,
        }}
      />

      {/* Stars */}
      <Stars />

      <div className="relative z-10 w-full max-w-lg mx-auto p-6">

        {/* ── PHASE: REALM ARRIVAL ─────────────────────────────── */}
        {phase === "realm" && (
          <div className="text-center animate-fade-in">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-6 shadow-lg"
              style={{ backgroundColor: realm.colour + "33", border: `2px solid ${realm.colour}66` }}
            >
              {realm.icon}
            </div>
            <p className="text-indigo-400 text-sm font-bold tracking-widest uppercase mb-2">
              Entering
            </p>
            <h1 className="text-4xl font-black text-white mb-3">{realm.name}</h1>
            <p className="text-slate-400 italic mb-8">"{realm.tagline}"</p>

            {/* Current mastery for this topic */}
            {masteryScore > 0 && (
              <div className="bg-slate-800/60 rounded-2xl p-4 mb-6 border border-slate-700">
                <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide">
                  {topicDisplay} — Current Mastery
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-700 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{ width: `${masteryPct}%`, backgroundColor: masteryColour(masteryScore) }}
                    />
                  </div>
                  <span className="font-black text-sm" style={{ color: masteryColour(masteryScore) }}>
                    {masteryPct}%
                  </span>
                </div>
                {isDueReview && (
                  <p className="text-xs text-amber-400 mt-2">
                    ⏰ Scheduled review — reinforce what you've learned!
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => setPhase(chapterIntro ? "chapter" : "brief")}
              className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all active:scale-95"
              style={{ backgroundColor: realm.colour, boxShadow: `0 0 20px ${realm.colour}66` }}
            >
              Enter {realm.name} →
            </button>
          </div>
        )}

        {/* ── PHASE: CHAPTER STORY ─────────────────────────────── */}
        {phase === "chapter" && (
          <div className="animate-fade-in">
            <div className="flex items-center gap-3 mb-5">
              <div className="text-2xl">{realm.icon}</div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest">Chapter</p>
                <p className="font-black text-white">{chapter?.chapter?.name ?? "New Mission"}</p>
              </div>
              <div className="ml-auto text-xs text-slate-400">
                Ch. {(chapter?.chapterIndex ?? 0) + 1} of {realm.chapters?.length}
              </div>
            </div>

            {/* Story text with typewriter effect */}
            <div className="bg-slate-800/70 rounded-2xl p-5 border border-slate-700 min-h-[160px] mb-6">
              <p className="text-slate-200 leading-relaxed text-sm">
                {displayed}
                {typing && <span className="animate-pulse text-indigo-400">▌</span>}
              </p>
            </div>

            {/* Chapter progress */}
            {chapter && (
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 bg-slate-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${chapter.progressPct}%`,
                      backgroundColor: realm.colour,
                    }}
                  />
                </div>
                <span className="text-xs text-slate-400">{chapter.progressPct}% complete</span>
              </div>
            )}

            <button
              onClick={() => setPhase("brief")}
              disabled={typing}
              className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: realm.colour }}
            >
              {typing ? "Reading…" : "Continue →"}
            </button>
          </div>
        )}

        {/* ── PHASE: MISSION BRIEF ─────────────────────────────── */}
        {phase === "brief" && (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">📋</div>
              <h2 className="text-2xl font-black text-white">Mission Brief</h2>
            </div>

            <div className="bg-slate-800/70 rounded-2xl p-5 border border-slate-700 mb-6 space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">🎯</span>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Objective</p>
                  <p className="text-white font-bold">{missionBrief.objective}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">📚</span>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Topic</p>
                  <p className="text-white font-bold capitalize">{topicDisplay}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">⚡</span>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Tara says</p>
                  <p className="text-slate-300 italic text-sm">"{missionBrief.taraHint}"</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">🏆</span>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Reward</p>
                  <p className="text-white text-sm">
                    Up to <strong className="text-yellow-400">+{missionBrief.maxPoints}</strong> story points
                    {tier === "developing" ? " + mastery boost" : " + tier upgrade possible"}
                  </p>
                </div>
              </div>
            </div>

            {/* Powers available */}
            {narrativeState?.unlocked_powers && Object.keys(narrativeState.unlocked_powers).length > 0 && (
              <div className="bg-indigo-900/40 rounded-2xl p-4 border border-indigo-700/40 mb-6">
                <p className="text-xs text-indigo-300 uppercase tracking-wide mb-2">✨ Powers Available</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(narrativeState.unlocked_powers)
                    .filter(([, v]) => v)
                    .map(([power]) => (
                      <span key={power} className="text-xs bg-indigo-800/60 text-indigo-200 px-2 py-1 rounded-lg">
                        {power.replace(/_/g, " ")}
                      </span>
                    ))}
                </div>
              </div>
            )}

            <button
              onClick={onStart}
              className="w-full py-4 rounded-2xl font-black text-lg text-white transition-all active:scale-95"
              style={{ backgroundColor: realm.colour, boxShadow: `0 0 30px ${realm.colour}55` }}
            >
              🚀 Begin Mission
            </button>

            <button
              onClick={onStart}
              className="w-full mt-3 py-2 text-slate-500 text-sm hover:text-slate-300 transition-colors"
            >
              Skip intro
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── HELPER: mission brief copy ───────────────────────────────────────────────
function getMissionBrief(name, topic, tier, isDueReview, realm) {
  const objectives = {
    developing: `Help ${name} build foundations in ${topic}. Every correct answer strengthens the signal.`,
    expected:   `${name} is developing in ${topic}. Push deeper to reach mastery level.`,
    exceeding:  `${name} has strong foundations in ${topic}. Challenge mode: prove mastery under pressure.`,
  };

  const taraHints = {
    developing: `Take your time on each question. I'll be here if you need a hint — you've got this! 🌟`,
    expected:   `You're making great progress on ${topic}. Focus on the "why" behind each answer.`,
    exceeding:  `Elite mission! Show the galaxy what you know about ${topic}. No hints needed — trust yourself.`,
  };

  const reviewHint = `This topic is scheduled for review — your brain is about to lock this knowledge in permanently! ⚡`;

  return {
    objective:  objectives[tier] ?? objectives.developing,
    taraHint:   isDueReview ? reviewHint : (taraHints[tier] ?? taraHints.developing),
    maxPoints:  tier === "exceeding" ? 30 : tier === "expected" ? 20 : 15,
  };
}

// ─── STARS BACKGROUND ─────────────────────────────────────────────────────────
function Stars() {
  // Static positions — no Math.random() to avoid hydration errors
  const stars = [
    { top: "5%",  left: "12%", size: 2, opacity: 0.6 },
    { top: "15%", left: "78%", size: 1, opacity: 0.4 },
    { top: "25%", left: "45%", size: 3, opacity: 0.3 },
    { top: "35%", left: "92%", size: 1, opacity: 0.7 },
    { top: "50%", left: "8%",  size: 2, opacity: 0.5 },
    { top: "60%", left: "55%", size: 1, opacity: 0.4 },
    { top: "72%", left: "30%", size: 2, opacity: 0.6 },
    { top: "80%", left: "85%", size: 1, opacity: 0.3 },
    { top: "88%", left: "20%", size: 3, opacity: 0.4 },
    { top: "95%", left: "65%", size: 1, opacity: 0.5 },
    { top: "10%", left: "35%", size: 1, opacity: 0.3 },
    { top: "45%", left: "70%", size: 2, opacity: 0.4 },
    { top: "65%", left: "15%", size: 1, opacity: 0.6 },
    { top: "30%", left: "60%", size: 1, opacity: 0.3 },
    { top: "75%", left: "48%", size: 2, opacity: 0.5 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            top: s.top, left: s.left,
            width: s.size, height: s.size,
            opacity: s.opacity,
            animationDelay: `${(i * 0.3) % 2}s`,
            animationDuration: `${2 + (i % 3)}s`,
          }}
        />
      ))}
    </div>
  );
}