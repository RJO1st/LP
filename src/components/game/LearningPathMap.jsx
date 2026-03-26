"use client";
/**
 * LearningPathMap.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Visual representation of a scholar's personalised learning path.
 * Shows topic nodes as a winding path — like a game map — with mastery
 * indicated by colour and star fill. Tapping a node starts a focused session.
 *
 * Props:
 *   path      - scholar_learning_path DB row (with topic_order array)
 *   mastery   - scholar_topic_mastery rows for this subject
 *   subject   - string
 *   onStartTopic(topic) - callback when scholar taps a topic node
 *
 * → src/components/game/LearningPathMap.jsx
 */

import { useState } from "react";
import { masteryColour, masteryToPercent, masteryToTier, checkRetentionGate } from "@/lib/masteryEngine";
import { getRealmForSubject } from "@/lib/narrativeEngine";
import { estimateExamReadiness } from "@/lib/learningPathEngine";
import { getSubjectLabel } from "@/lib/subjectDisplay";
import MasteryBreakdownPill from "@/components/game/MasteryBreakdownPill";

const BAND_ICONS  = { foundation: "🧱", intermediate: "⚙️", advanced: "🚀", enrichment: "🌟" };
const BAND_LABELS = { foundation: "Foundation", intermediate: "Intermediate", advanced: "Advanced", enrichment: "Enrichment" };

export default function LearningPathMap({ path, mastery = [], subject, onStartTopic }) {
  const [expandedBand, setExpandedBand] = useState(null);
  const [hoveredTopic, setHoveredTopic] = useState(null);

  const topicOrder   = path?.topic_order ?? [];
  const currentTopic = path?.current_topic;
  const realm        = getRealmForSubject(subject);

  // Build mastery lookup
  const masteryMap = {};
  for (const r of mastery) masteryMap[r.topic] = r;

  // Group by difficulty band
  const bands = {};
  for (const item of topicOrder) {
    const band = item.difficulty_band ?? "foundation";
    if (!bands[band]) bands[band] = [];
    bands[band].push({
      ...item,
      masteryRecord: masteryMap[item.topic] ?? null,
      masteryScore:  masteryMap[item.topic]?.mastery_score ?? item.current_mastery ?? 0,
    });
  }

  const bandOrder   = ["foundation", "intermediate", "advanced", "enrichment"];
  const activeOrder = bandOrder.filter(b => bands[b]?.length > 0);

  const examReadiness = estimateExamReadiness(mastery, subject);
  const totalMastered = topicOrder.filter(t =>
    (masteryMap[t.topic]?.mastery_score ?? 0) >= 0.8
  ).length;

  if (!topicOrder.length) return <EmptyPath subject={subject} realm={realm} />;

  return (
    <div className="min-h-screen bg-[#0a0e27] p-4 md:p-6">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 mb-6 text-white"
        style={{
          background: realm
            ? `linear-gradient(135deg, ${realm.colour}33 0%, #1e1b4b 100%)`
            : "linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)",
          border: `1px solid ${realm?.colour ?? "#6366f1"}44`,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{realm?.icon ?? "📚"}</span>
          <div>
            <h1 className="text-xl font-black capitalize">
              {getSubjectLabel(subject)} Path
            </h1>
            <p className="text-sm opacity-70">
              {realm?.name ?? "Learning Path"} · {topicOrder.length} topics
            </p>
          </div>
        </div>

        {/* Overall progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-white/20 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-700"
              style={{
                width: `${path?.completion_pct ?? 0}%`,
                backgroundColor: realm?.colour ?? "#6366f1",
              }}
            />
          </div>
          <span className="text-sm font-black">{path?.completion_pct ?? 0}%</span>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs opacity-70">
          <span>⭐ {totalMastered}/{topicOrder.length} mastered</span>
          <span
            className="font-bold px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: examReadiness.colour + "33", color: examReadiness.colour }}
          >
            {examReadiness.label} · {examReadiness.score}%
          </span>
        </div>

        {path?.next_milestone && (
          <div className="mt-3 text-xs bg-white/10 rounded-xl px-3 py-2">
            🏁 <strong>Next milestone:</strong> {path.next_milestone}
          </div>
        )}
      </div>

      {/* ── BAND SECTIONS ──────────────────────────────────────────── */}
      <div className="space-y-4">
        {activeOrder.map(band => {
          const items     = bands[band] ?? [];
          const isOpen    = expandedBand === null || expandedBand === band;
          const bandMastered = items.filter(i => i.masteryScore >= 0.8).length;
          const bandPct   = Math.round((bandMastered / items.length) * 100);

          return (
            <div
              key={band}
              className="bg-slate-900/80 rounded-2xl border border-slate-700 overflow-hidden"
            >
              {/* Band header */}
              <button
                onClick={() => setExpandedBand(expandedBand === band ? null : band)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <span className="text-xl">{BAND_ICONS[band]}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white">{BAND_LABELS[band]}</span>
                    <span className="text-xs text-slate-400">
                      {bandMastered}/{items.length} mastered
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${bandPct}%`, backgroundColor: "#6366f1" }}
                    />
                  </div>
                </div>
                <span className="text-slate-400 text-sm ml-2">{isOpen ? "▲" : "▼"}</span>
              </button>

              {/* Topic nodes */}
              {isOpen && (
                <div className="px-4 pb-4">
                  <div className="relative">
                    {/* Connecting line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-700" />

                    <div className="space-y-2">
                      {items.map((item, idx) => {
                        const isActive   = item.topic === currentTopic;
                        const mastered   = item.masteryScore >= 0.8;
                        const inProgress = item.masteryScore > 0 && !mastered;
                        // Retention gate: previous topic must pass retention check to unlock next
                        const prevRecord = idx > 0 ? items[idx - 1]?.masteryRecord : null;
                        const prevGate = idx > 0 ? checkRetentionGate(prevRecord, 0.40) : { ready: true, reasons: [] };
                        const locked     = item.masteryScore === 0 && idx > 0 && !prevGate.ready;

                        const colour = masteryColour(item.masteryScore);
                        const pct    = masteryToPercent(item.masteryScore);
                        const tier   = masteryToTier(item.masteryScore);

                        return (
                          <div
                            key={item.topic}
                            className={`relative flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                              isActive
                                ? "bg-indigo-500/20 border border-indigo-500/50"
                                : locked
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-slate-800/60 border border-transparent hover:border-slate-600"
                            }`}
                            onClick={() => !locked && onStartTopic?.(item.topic)}
                            onMouseEnter={() => setHoveredTopic(item.topic)}
                            onMouseLeave={() => setHoveredTopic(null)}
                          >
                            {/* Node circle */}
                            <div
                              className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 border-2"
                              style={{
                                backgroundColor: mastered ? colour + "33" : "#1e293b",
                                borderColor: isActive ? "#6366f1" : mastered ? colour : locked ? "#334155" : "#475569",
                                color: mastered ? colour : isActive ? "#818cf8" : "#94a3b8",
                              }}
                            >
                              {mastered ? "⭐" : isActive ? "▶" : locked ? "🔒" : idx + 1}
                            </div>

                            {/* Topic info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`font-bold text-sm capitalize truncate ${
                                  isActive ? "text-indigo-300" : "text-white"
                                }`}>
                                  {item.display_name ?? item.topic.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                                </p>
                                {isActive && (
                                  <span className="text-xs bg-indigo-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    Current
                                  </span>
                                )}
                              </div>

                              {/* Mastery bar */}
                              {!locked && (
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 bg-slate-700 rounded-full h-1.5">
                                    <div
                                      className="h-1.5 rounded-full transition-all"
                                      style={{ width: `${pct}%`, backgroundColor: colour }}
                                    />
                                  </div>
                                  <span className="text-xs font-bold flex-shrink-0" style={{ color: colour }}>
                                    {pct}%
                                  </span>
                                </div>
                              )}

                              {!locked && (
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-slate-500 capitalize">{tier}</span>
                                  {item.masteryRecord?.times_seen > 0 && (
                                    <span className="text-xs text-slate-600">
                                      · {item.masteryRecord.times_seen} attempts
                                    </span>
                                  )}
                                  {item.masteryRecord?.next_review_at &&
                                    new Date(item.masteryRecord.next_review_at) <= new Date() && (
                                    <span className="text-xs text-amber-400">· 🔄 Due review</span>
                                  )}
                                </div>
                              )}

                              {/* v2: Mastery breakdown pill — shows acquisition/stability/recency */}
                              {!locked && item.masteryRecord && item.masteryRecord.times_seen > 0 && (
                                <div className="mt-1">
                                  <MasteryBreakdownPill
                                    masteryRecord={item.masteryRecord}
                                    compact={true}
                                    showTooltip={hoveredTopic === item.topic}
                                  />
                                </div>
                              )}

                              {/* Retention gate warning for locked topics */}
                              {locked && !prevGate.ready && prevGate.reasons.length > 0 && (
                                <p className="text-xs text-slate-600 mt-0.5">
                                  🔒 {prevGate.reasons[0]}
                                </p>
                              )}
                            </div>

                            {/* CTA arrow */}
                            {!locked && (
                              <span className="text-slate-500 text-sm flex-shrink-0">→</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── ALL MASTERED STATE ──────────────────────────────────────── */}
      {totalMastered === topicOrder.length && topicOrder.length > 0 && (
        <div className="mt-6 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-2xl p-6 text-center">
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="text-2xl font-black text-white mb-2">Path Complete!</h2>
          <p className="text-slate-300 text-sm">
            Every topic mastered. Explore enrichment challenges or start a new subject path.
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyPath({ subject, realm }) {
  return (
    <div className="min-h-screen bg-[#0a0e27] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">{realm?.icon ?? "🗺️"}</div>
        <h2 className="text-2xl font-black text-white mb-3">No Path Yet</h2>
        <p className="text-slate-400 mb-6">
          Complete the quick assessment for{" "}
          <span className="text-indigo-400 font-bold capitalize">{subject.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>{" "}
          and Tara will build your personalised learning path.
        </p>
      </div>
    </div>
  );
}