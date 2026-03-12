"use client";
/**
 * WeeklyTestFlow.jsx
 * Deploy to: src/components/WeeklyTestFlow.jsx
 *
 * Three-part weekly test system:
 *
 *  1. WeeklyChallengeBanner  — appears in dashboard when 3+ quests done this week
 *  2. PaperEngine            — the actual test (imported externally)
 *  3. MissionDebrief         — full-screen narrative debrief after test completes
 *
 * Flow:
 *   Dashboard → Banner unlocks → Scholar taps → PaperEngine (via parent)
 *   → MissionDebrief → Dashboard (with weekly test marked done)
 *
 * Usage in StudentDashboard:
 *   import { WeeklyChallengeBanner, MissionDebrief, getWeeklyTestConfig,
 *            generateWeeklyNarrative, isTestEligible } from "../../components/WeeklyTestFlow";
 */

import React, { useState, useEffect, useRef } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

/** Minimum year level that can access tests and Test Centre */
export const MIN_YEAR_FOR_TESTS = 3;

/** Quests needed in a week to unlock the weekly challenge */
const QUESTS_TO_UNLOCK = 3;

/** localStorage key for tracking weekly test completion */
const WEEKLY_TEST_KEY = "lp_weekly_test_done";

// ─── REALM NAMES (match narrativeEngine) ─────────────────────────────────────
const REALM_MAP = {
  maths:              { name: "the Numeric Nebula",    emoji: "🔢" },
  english:            { name: "the Lexicon Expanse",   emoji: "📖" },
  science:            { name: "the Bio-Sphere",        emoji: "🔬" },
  biology:            { name: "the Living Matrix",     emoji: "🧬" },
  chemistry:          { name: "the Element Forge",     emoji: "⚗️" },
  physics:            { name: "the Gravity Well",      emoji: "⚡" },
  verbal_reasoning:   { name: "the Code Citadel",      emoji: "🔤" },
  nvr:                { name: "the Pattern Void",      emoji: "🔷" },
  history:            { name: "the Chronicle Archives",emoji: "📜" },
  geography:          { name: "the Atlas Frontier",    emoji: "🌍" },
};

const getRealm = (subject) => REALM_MAP[subject] ?? { name: "the Training Ground", emoji: "📋" };

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Get ISO week number */
function getWeekKey() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${week}`;
}

/** Check if scholar has already done the weekly test this week */
export function hasCompletedWeeklyTest(scholarId) {
  try {
    const stored = JSON.parse(localStorage.getItem(WEEKLY_TEST_KEY) || "{}");
    return stored[scholarId] === getWeekKey();
  } catch { return false; }
}

/** Mark weekly test as done */
export function markWeeklyTestDone(scholarId) {
  try {
    const stored = JSON.parse(localStorage.getItem(WEEKLY_TEST_KEY) || "{}");
    stored[scholarId] = getWeekKey();
    localStorage.setItem(WEEKLY_TEST_KEY, JSON.stringify(stored));
  } catch {}
}

/** Whether scholar's year level makes them eligible for tests */
export function isTestEligible(yearLevel) {
  return parseInt(yearLevel, 10) >= MIN_YEAR_FOR_TESTS;
}

/** How many quests completed this week from weeklyStats */
export function getQuestsThisWeek(weeklyStats = []) {
  if (!Array.isArray(weeklyStats)) return 0;
  // weeklyStats is an array of daily counts — sum them
  return weeklyStats.reduce((sum, d) => sum + (d?.count ?? d?.sessions ?? d ?? 0), 0);
}

/**
 * Pick the best weekly test for this scholar based on what they studied.
 * Returns a testConfig object compatible with PaperEngine / mockTestCatalogue.
 */
export function getWeeklyTestConfig(scholar, weeklyStats = []) {
  const curriculum = scholar?.curriculum ?? "uk_national";
  const year       = parseInt(scholar?.year_level ?? scholar?.year ?? 1, 10);

  // Find most-studied subject this week
  const subjectCounts = {};
  weeklyStats.forEach(d => {
    if (d?.subject) subjectCounts[d.subject] = (subjectCounts[d.subject] ?? 0) + (d.count ?? 1);
  });
  const topSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "maths";

  return {
    id:            `weekly_${topSubject}_${getWeekKey()}`,
    label:         `Weekly Challenge · ${topSubject.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`,
    subject:       topSubject,
    curriculum,
    paperSize:     "standard",   // 20 questions, 25 min
    examTag:       null,
    badge:         "⭐",
    category:      "subject_practice",
    eligibleYears: Array.from({ length: 13 }, (_, i) => i + 1),
    description:   "Your weekly mission assessment",
    difficulty:    "standard",
    isWeeklyChallenge: true,
  };
}

// ─── NARRATIVE GENERATION ─────────────────────────────────────────────────────

const NARRATIVE_TEMPLATES = {
  triumph: [
    (name, realm, subject, score) =>
      `TRANSMISSION RECEIVED · MISSION COMPLETE\n\nCommander ${name} — your performance in ${realm.name} has been logged in the Galactic Academy records. ${score}% accuracy. The council has reviewed your assessment and declared it a resounding success.\n\nThe ${subject} sectors are more stable because of your work this week. Tara has already filed the Mission Report with Command. Your rank advances. The next frontier awaits.`,
    (name, realm, subject, score) =>
      `CLASSIFIED: MISSION DEBRIEF\n\nAgent ${name} — this week's operations in ${realm.name} exceeded Command's projections. A ${score}% completion rate on the final assessment confirms what your instructors suspected — you're ready for more.\n\nThe Academy's scanners recorded every answer. Every correct response added signal to the noise. The mission arc closes here. A new one begins at dawn.`,
  ],
  solid: [
    (name, realm, subject, score) =>
      `MISSION DEBRIEF · STATUS: GOOD STANDING\n\nCommander ${name} — your week in ${realm.name} is on record. The final assessment returned ${score}%. Solid. Not perfect. But solid.\n\nTara's analysis: "The core concepts are taking hold. There are gaps — and that's exactly why we train. Come back next week. The Galactic Academy doesn't graduate cadets who stop after one mission."`,
    (name, realm, subject, score) =>
      `ACADEMY LOG · WEEK ASSESSMENT FILED\n\nCadet ${name} — ${score}% on the ${subject} assessment. Command reviews all scores before the next mission briefing. Yours qualifies.\n\nThe weak points are mapped. Tara has updated your training sequence accordingly. Next week's missions will target the gaps. That's how this works — you identify, you improve, you advance.`,
  ],
  persist: [
    (name, realm, subject, score) =>
      `DEBRIEF RECEIVED · STATUS: TRAINING CONTINUES\n\nCommander ${name} — ${score}% this week. ${realm.name} proved challenging. That's in the log now, alongside every other cadet who found it hard before mastering it.\n\nThis is not failure. This is data. Tara's already prepared a targeted training sequence. The Academy doesn't lose cadets to a difficult week — it forges them through it. Report for duty next week.`,
    (name, realm, subject, score) =>
      `TRANSMISSION LOGGED · MISSION CONTINUES\n\nCadet ${name} — the ${subject} assessment returned ${score}%. Command has reviewed the report. Their verdict: keep going.\n\nThe Academy's records show every great commander had a week like this. What separates them from the ones who faded is simple — they came back. Your next mission is already queued. Tara will be there.`,
  ],
};

/**
 * Generate the narrative text for the mission debrief.
 */
export function generateWeeklyNarrative(scholar, weeklyStats, testResult) {
  const name    = scholar?.name ?? "Commander";
  const subject = testResult?.subject ?? "maths";
  const realm   = getRealm(subject);
  const score   = testResult?.score ?? 0;

  const tier = score >= 75 ? "triumph" : score >= 50 ? "solid" : "persist";
  const templates = NARRATIVE_TEMPLATES[tier];
  const template  = templates[Math.floor(Math.random() * templates.length)];

  return {
    text:    template(name, realm, subject, score),
    tier,
    realm,
    medals:  getMedals(score, weeklyStats),
    tara:    getTaraComment(score, subject),
  };
}

function getMedals(score, weeklyStats) {
  const medals = [];
  const quests = getQuestsThisWeek(weeklyStats);
  if (score >= 90)  medals.push({ emoji: "🏆", label: "Distinction" });
  else if (score >= 70) medals.push({ emoji: "🥈", label: "Merit" });
  else if (score >= 50) medals.push({ emoji: "🥉", label: "Pass" });
  if (quests >= 5)  medals.push({ emoji: "⚡", label: "Power Week" });
  if (quests >= 3)  medals.push({ emoji: "🎯", label: "On Mission" });
  if (score === 100) medals.push({ emoji: "⭐", label: "Perfect Score" });
  return medals;
}

function getTaraComment(score, subject) {
  if (score >= 90) return `Brilliant work. Your ${subject.replace(/_/g, " ")} fundamentals are strong. I'm pushing your next missions to a higher tier.`;
  if (score >= 70) return `Good results. A few areas to tighten — I've flagged them in your next training sequence.`;
  if (score >= 50) return `You're building the foundation. The gaps are clear now, which means we can fix them. I'll focus your next missions there.`;
  return `A tough week. That's okay — it happens. I've restructured your training to reinforce the areas that caused difficulty. Let's go again.`;
}

// ─── WEEKLY CHALLENGE BANNER ─────────────────────────────────────────────────

const BANNER_STYLES = `
  @keyframes lp-amber-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); }
    50%       { box-shadow: 0 0 0 8px rgba(251,191,36,0.15); }
  }
  @keyframes lp-star-spin {
    0%   { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(180deg) scale(1.2); }
    100% { transform: rotate(360deg) scale(1); }
  }
  @keyframes lp-slide-in {
    from { opacity: 0; transform: translateY(-12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

/**
 * WeeklyChallengeBanner
 * Shows in the dashboard when 3+ quests completed this week and test not yet done.
 *
 * Props:
 *   scholar       — scholar object
 *   weeklyStats   — array from fetchWeeklyStats
 *   onStart       — () => void — called when scholar taps to start
 */
export function WeeklyChallengeBanner({ scholar, weeklyStats = [], onStart }) {
  const year       = parseInt(scholar?.year_level ?? scholar?.year ?? 1, 10);
  const questsDone = getQuestsThisWeek(weeklyStats);
  const alreadyDone = hasCompletedWeeklyTest(scholar?.id);

  // Not eligible
  if (!isTestEligible(year)) return null;
  // Already done this week
  if (alreadyDone) return null;
  // Not enough quests yet
  if (questsDone < QUESTS_TO_UNLOCK) {
    // Show progress teaser if close (2/3)
    if (questsDone < 2) return null;
    return (
      <>
        <style>{BANNER_STYLES}</style>
        <div style={{
          background: "linear-gradient(135deg, #1c1917, #292524)",
          border: "1px solid #44403c", borderRadius: 16, padding: "14px 18px",
          display: "flex", alignItems: "center", gap: 14,
          animation: "lp-slide-in 0.4s ease",
        }}>
          <div style={{ fontSize: 20 }}>🔒</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#78716c", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>
              Weekly Challenge
            </div>
            <div style={{ fontSize: 13, color: "#d6d3d1", fontWeight: 600 }}>
              Complete {QUESTS_TO_UNLOCK - questsDone} more quest{QUESTS_TO_UNLOCK - questsDone !== 1 ? "s" : ""} to unlock your weekly assessment
            </div>
          </div>
          <div style={{
            display: "flex", gap: 4,
          }}>
            {Array.from({ length: QUESTS_TO_UNLOCK }, (_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i < questsDone ? "#f59e0b" : "#44403c",
                transition: "background 0.3s",
              }} />
            ))}
          </div>
        </div>
      </>
    );
  }

  // UNLOCKED — show the full banner
  const testConfig = getWeeklyTestConfig(scholar, weeklyStats);
  const realm      = getRealm(testConfig.subject);

  return (
    <>
      <style>{BANNER_STYLES}</style>
      <button
        onClick={onStart}
        style={{
          width: "100%", textAlign: "left", border: "none", cursor: "pointer", padding: 0,
          borderRadius: 18, overflow: "hidden",
          animation: "lp-amber-pulse 2.5s ease-in-out infinite, lp-slide-in 0.4s ease",
        }}
      >
        <div style={{
          background: "linear-gradient(135deg, #1c1108 0%, #1a1205 40%, #0f172a 100%)",
          border: "1.5px solid #78350f",
          borderRadius: 18, padding: "18px 20px",
          position: "relative", overflow: "hidden",
        }}>
          {/* Decorative grid lines */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.04,
            backgroundImage: "repeating-linear-gradient(0deg, #f59e0b 0px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, #f59e0b 0px, transparent 1px, transparent 20px)",
            backgroundSize: "20px 20px",
          }} />

          <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 16 }}>
            {/* Spinning star */}
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: "linear-gradient(135deg, #92400e, #b45309)",
              border: "1px solid #f59e0b44",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
              animation: "lp-star-spin 4s linear infinite",
            }}>⭐</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10, fontWeight: 900, color: "#f59e0b",
                textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 3,
                fontFamily: "monospace",
              }}>
                ◆ WEEKLY CHALLENGE UNLOCKED ◆
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#fef3c7", lineHeight: 1.2, marginBottom: 4 }}>
                {realm.emoji} Your Assessment Is Ready
              </div>
              <div style={{ fontSize: 12, color: "#a16207", fontWeight: 600 }}>
                {testConfig.label} · 20 questions · 25 minutes
              </div>
            </div>

            <div style={{
              flexShrink: 0,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#1c1107", borderRadius: 10, padding: "8px 14px",
              fontSize: 12, fontWeight: 900, letterSpacing: "0.04em",
              fontFamily: "monospace",
            }}>
              BEGIN →
            </div>
          </div>

          {/* Progress completed */}
          <div style={{
            marginTop: 12, display: "flex", alignItems: "center", gap: 8,
            borderTop: "1px solid #44403c", paddingTop: 10,
          }}>
            <span style={{ fontSize: 11, color: "#78716c", fontFamily: "monospace" }}>
              QUESTS FILED:
            </span>
            {Array.from({ length: Math.max(questsDone, QUESTS_TO_UNLOCK) }, (_, i) => (
              <div key={i} style={{
                width: 18, height: 6, borderRadius: 3,
                background: i < questsDone ? "#f59e0b" : "#292524",
                border: "1px solid #44403c",
              }} />
            ))}
            <span style={{ fontSize: 11, color: "#f59e0b", fontFamily: "monospace", marginLeft: 4 }}>
              {questsDone} COMPLETE
            </span>
          </div>
        </div>
      </button>
    </>
  );
}

// ─── MISSION DEBRIEF ──────────────────────────────────────────────────────────

const DEBRIEF_STYLES = `
  @keyframes lp-debrief-in {
    from { opacity: 0; transform: scale(0.96); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes lp-scanline {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }
  @keyframes lp-typewriter-blink {
    0%, 100% { opacity: 1; } 50% { opacity: 0; }
  }
  @keyframes lp-medal-drop {
    0%   { opacity: 0; transform: translateY(-20px) scale(0.8); }
    60%  { transform: translateY(4px) scale(1.05); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
`;

function TypewriterText({ text, speed = 18 }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone]           = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    setDone(false);
    const interval = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && (
        <span style={{
          display: "inline-block", width: 2, height: "1em",
          background: "#f59e0b", marginLeft: 2, verticalAlign: "text-bottom",
          animation: "lp-typewriter-blink 0.7s ease-in-out infinite",
        }} />
      )}
    </span>
  );
}

/**
 * MissionDebrief — full-screen narrative debrief after weekly test.
 *
 * Props:
 *   scholar     — scholar object
 *   testResult  — { score, correct, total, timeTaken, subject }
 *   weeklyStats — array from fetchWeeklyStats
 *   onDone      — () => void — back to dashboard
 */
export function MissionDebrief({ scholar, testResult, weeklyStats, onDone }) {
  const [phase, setPhase] = useState("intro"); // "intro" | "narrative" | "medals" | "done"

  const narrative = generateWeeklyNarrative(scholar, weeklyStats, testResult);
  const score     = testResult?.score ?? 0;

  const scoreColor = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const scoreLabel = score >= 75 ? "MISSION SUCCESS" : score >= 50 ? "MISSION COMPLETE" : "MISSION LOGGED";

  // Auto-advance from intro
  useEffect(() => {
    if (phase === "intro") {
      const t = setTimeout(() => setPhase("narrative"), 1800);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <>
      <style>{DEBRIEF_STYLES}</style>
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#09090b",
        display: "flex", flexDirection: "column",
        fontFamily: "monospace",
        animation: "lp-debrief-in 0.5s ease",
        overflowY: "auto",
      }}>
        {/* Scanline effect */}
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, #f59e0b44, transparent)",
          animation: "lp-scanline 3s linear infinite",
          pointerEvents: "none", zIndex: 1,
        }} />

        {/* Top status bar */}
        <div style={{
          background: "#111827", borderBottom: "1px solid #1f2937",
          padding: "10px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", background: scoreColor,
              boxShadow: `0 0 8px ${scoreColor}`,
            }} />
            <span style={{ fontSize: 11, color: "#6b7280", letterSpacing: "0.1em" }}>
              LAUNCHPARD ACADEMY · MISSION DEBRIEF
            </span>
          </div>
          <span style={{ fontSize: 10, color: "#374151" }}>
            {new Date().toISOString().slice(0, 10)}
          </span>
        </div>

        <div style={{ flex: 1, maxWidth: 640, margin: "0 auto", width: "100%", padding: "32px 20px 40px" }}>

          {/* Phase: INTRO */}
          {phase === "intro" && (
            <div style={{ textAlign: "center", paddingTop: 80 }}>
              <div style={{ fontSize: 11, color: "#f59e0b", letterSpacing: "0.2em", marginBottom: 20 }}>
                DECRYPTING MISSION REPORT…
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: "50%", background: "#f59e0b",
                    animation: `lp-typewriter-blink 1s ease-in-out ${i * 0.3}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Phase: NARRATIVE */}
          {phase !== "intro" && (
            <>
              {/* Score header */}
              <div style={{
                border: `1px solid ${scoreColor}33`,
                borderRadius: 12, padding: "16px 20px", marginBottom: 28,
                background: scoreColor + "08",
              }}>
                <div style={{ fontSize: 10, color: scoreColor, letterSpacing: "0.15em", marginBottom: 6 }}>
                  FINAL ASSESSMENT RESULT
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontSize: 42, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                    {score}%
                  </span>
                  <div>
                    <div style={{ fontSize: 14, color: "#e5e7eb", fontWeight: 700 }}>{scoreLabel}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>
                      {testResult?.correct ?? 0}/{testResult?.total ?? 20} correct
                      {testResult?.timeTaken ? ` · ${Math.round(testResult.timeTaken / 60)}min` : ""}
                    </div>
                  </div>
                </div>
              </div>

              {/* Narrative text */}
              <div style={{
                background: "#111827", border: "1px solid #1f2937",
                borderRadius: 12, padding: "20px",
                fontSize: 13, lineHeight: 1.9, color: "#d1d5db",
                marginBottom: 24, whiteSpace: "pre-line",
                minHeight: 180,
              }}>
                {phase === "narrative" ? (
                  <TypewriterText text={narrative.text} speed={14} />
                ) : (
                  narrative.text
                )}
              </div>

              {/* Tara comment */}
              {(phase === "medals" || phase === "done") && (
                <div style={{
                  background: "#1e1b4b", border: "1px solid #3730a3",
                  borderRadius: 12, padding: "14px 16px", marginBottom: 24,
                  animation: "lp-debrief-in 0.4s ease",
                }}>
                  <div style={{ fontSize: 10, color: "#818cf8", letterSpacing: "0.1em", marginBottom: 6 }}>
                    🤖 TARA — AI TUTOR
                  </div>
                  <div style={{ fontSize: 13, color: "#c7d2fe", lineHeight: 1.6, fontFamily: "system-ui, sans-serif" }}>
                    {narrative.tara}
                  </div>
                </div>
              )}

              {/* Medals */}
              {(phase === "medals" || phase === "done") && narrative.medals.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: "0.1em", marginBottom: 12 }}>
                    COMMENDATIONS AWARDED
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {narrative.medals.map((m, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        background: "#1f2937", border: "1px solid #374151",
                        borderRadius: 10, padding: "8px 14px",
                        animation: `lp-medal-drop 0.5s ease ${i * 0.15}s both`,
                      }}>
                        <span style={{ fontSize: 18 }}>{m.emoji}</span>
                        <span style={{ fontSize: 12, color: "#e5e7eb", fontWeight: 700 }}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTAs */}
              <div style={{ display: "flex", gap: 10 }}>
                {phase === "narrative" && (
                  <button
                    onClick={() => setPhase("medals")}
                    style={{
                      flex: 1, padding: "12px",
                      background: "linear-gradient(135deg, #92400e, #b45309)",
                      border: "none", borderRadius: 10,
                      color: "#fef3c7", fontSize: 13, fontWeight: 700,
                      cursor: "pointer", letterSpacing: "0.05em",
                      fontFamily: "monospace",
                    }}
                  >
                    CONTINUE →
                  </button>
                )}

                {(phase === "medals" || phase === "done") && (
                  <>
                    <button
                      onClick={() => {
                        markWeeklyTestDone(scholar?.id);
                        onDone();
                      }}
                      style={{
                        flex: 1, padding: "12px",
                        background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                        border: "none", borderRadius: 10,
                        color: "white", fontSize: 13, fontWeight: 700,
                        cursor: "pointer", letterSpacing: "0.05em",
                        fontFamily: "monospace",
                      }}
                    >
                      FILE REPORT · RETURN TO BASE
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}