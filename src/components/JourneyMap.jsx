/**
 * JourneyMap.jsx — v4
 * Deploy to: src/components/JourneyMap.jsx
 *
 * Personalised per-subject topic progression. Read-only — algorithm picks topic.
 * Mastery % shows average mastery across attempted topics (not mastered/total).
 * Tier labels: Needs Work → Developing → On Track → Stellar
 */

"use client";
import React, { useState, useMemo } from "react";

const SUBJ = {
  mathematics:"Maths", english:"English", english_studies:"English", science:"Science",
  basic_science:"Science", basic_technology:"Technology", verbal_reasoning:"Verbal Reasoning",
  nvr:"Non-Verbal Reasoning", social_studies:"Social Studies", civic_education:"Civic Education",
  history:"History", geography:"Geography", computing:"Computing", physics:"Physics",
  chemistry:"Chemistry", biology:"Biology", religious_studies:"Religious Studies",
  agricultural_science:"Agricultural Science", business_education:"Business Education",
  cultural_and_creative_arts:"Creative Arts", pre_vocational_studies:"Pre-Vocational",
  basic_digital_literacy:"Digital Literacy", digital_technologies:"Digital Technologies",
  design_and_technology:"Design & Technology", citizenship:"Citizenship",
  economics:"Economics", government:"Government", hass:"HASS", religious_education:"Religious Education",
};

const COLORS = {
  mathematics:"#6366f1", english:"#e11d48", english_studies:"#e11d48", science:"#10b981",
  basic_science:"#10b981", basic_technology:"#d97706", verbal_reasoning:"#7c3aed", nvr:"#0d9488",
  social_studies:"#0891b2", civic_education:"#2563eb", history:"#f59e0b", geography:"#06b6d4",
  computing:"#64748b", physics:"#0ea5e9", chemistry:"#84cc16", biology:"#22c55e",
  religious_studies:"#a855f7", religious_education:"#a855f7",
};

const EMOJI = {
  mathematics:"🔢", english:"📖", english_studies:"📖", science:"🔬", basic_science:"🔬",
  basic_technology:"🔧", verbal_reasoning:"🧩", nvr:"🔷", social_studies:"🌍",
  civic_education:"⚖️", history:"📜", geography:"🌍", computing:"💻", physics:"⚡",
  chemistry:"⚗️", biology:"🧬",
};

function tierOf(score, seen) {
  if (!seen || seen === 0) return { label: "New", color: "#94a3b8", bg: "#f1f5f9", order: 2 };
  if (score >= 0.8) return { label: "Stellar", color: "#10b981", bg: "#ecfdf5", order: 4 };
  if (score >= 0.7) return { label: "On Track", color: "#3b82f6", bg: "#eff6ff", order: 3 };
  if (score >= 0.55) return { label: "Developing", color: "#eab308", bg: "#fefce8", order: 1 };
  return { label: "Needs Work", color: "#f59e0b", bg: "#fff7ed", order: 0 };
}

function topicName(t) {
  return (t || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bOf\b/g, "of").replace(/\bAnd\b/g, "&").slice(0, 28);
}

function personalSort(topics) {
  return [...topics].sort((a, b) => {
    const tA = tierOf(a.mastery_score, a.times_seen);
    const tB = tierOf(b.mastery_score, b.times_seen);
    if (tA.order !== tB.order) return tA.order - tB.order;
    const dA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const dB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return dA - dB;
  });
}

export default function JourneyMap({ scholar, subjects, masteryData, onStartTopic }) {
  const [activeSubject, setActiveSubject] = useState(null);

  const subjectData = useMemo(() => {
    const m = {};
    (subjects || []).forEach(s => { m[s] = { topics: [], mastered: 0, total: 0, seen: 0, avgMastery: 0 }; });
    (masteryData || []).forEach(r => {
      if (!m[r.subject]) m[r.subject] = { topics: [], mastered: 0, total: 0, seen: 0, avgMastery: 0 };
      m[r.subject].topics.push(r);
    });
    Object.values(m).forEach(s => {
      s.total = s.topics.length;
      s.mastered = s.topics.filter(t => (t.mastery_score || 0) >= 0.8).length;
      s.seen = s.topics.filter(t => (t.times_seen || 0) > 0).length;
      // Average mastery across SEEN topics only — not inflated by unseen
      const seenTopics = s.topics.filter(t => (t.times_seen || 0) > 0);
      s.avgMastery = seenTopics.length > 0
        ? Math.round(seenTopics.reduce((sum, t) => sum + (t.mastery_score || 0), 0) / seenTopics.length * 100)
        : 0;
      s.topics = personalSort(s.topics);
    });
    return m;
  }, [subjects, masteryData]);

  if (!subjects?.length) return null;

  const currentSubject = activeSubject || subjects[0];
  const sd = subjectData[currentSubject] || { topics: [], avgMastery: 0, mastered: 0, total: 0, seen: 0 };
  const color = COLORS[currentSubject] || "#6366f1";

  return (
    <div>
      {/* Subject tabs */}
      {subjects.length > 1 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none">
          {subjects.map(subj => {
            const active = subj === currentSubject;
            const s = subjectData[subj] || { avgMastery: 0 };
            return (
              <button key={subj} onClick={() => setActiveSubject(subj)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
                  active ? "text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
                style={active ? { background: COLORS[subj] || "#6366f1" } : {}}>
                <span className="text-xs">{EMOJI[subj] || "📚"}</span>
                {SUBJ[subj] || subj.replace(/_/g, " ")}
                {s.avgMastery > 0 && <span className={`text-[9px] ${active ? "text-white/70" : "text-slate-300"}`}>{s.avgMastery}%</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Topic path */}
      {sd.topics.length > 0 ? (
        <div className="relative">
          <div className="absolute left-[17px] top-2 bottom-8 w-0.5 bg-slate-100" style={{ zIndex: 0 }} />
          <div className="space-y-0.5 relative" style={{ zIndex: 1 }}>
            {sd.topics.map((topic, i) => {
              const score = topic.mastery_score || 0;
              const seen = (topic.times_seen || 0) > 0;
              const tier = tierOf(score, topic.times_seen);
              const isNextUp = i === 0 && tier.order < 3;

              return (
                <div key={i}
                  className={`flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-lg transition-all ${
                    isNextUp ? "bg-white border border-indigo-100 shadow-sm" : ""
                  }`}>
                  {/* Node */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 relative"
                    style={{ background: tier.bg, border: `2px solid ${tier.color}` }}>
                    {tier.label === "Stellar" ? (
                      <span className="text-xs">✓</span>
                    ) : tier.label === "New" ? (
                      <span className="text-[9px] font-black" style={{ color: tier.color }}>?</span>
                    ) : (
                      <span className="text-[9px] font-black" style={{ color: tier.color }}>{Math.round(score * 100)}</span>
                    )}
                    {isNextUp && (
                      <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ border: `2px solid ${color}` }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] font-bold text-slate-700 truncate">{topicName(topic.topic)}</p>
                      {isNextUp && (
                        <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                          style={{ background: `${color}15`, color }}>Next</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-bold" style={{ color: tier.color }}>{tier.label}</span>
                      {seen && topic.times_seen > 0 && (
                        <span className="text-[8px] text-slate-300 font-bold">
                          · {topic.times_seen} att. · {topic.times_correct ? Math.round((topic.times_correct / topic.times_seen) * 100) : 0}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mini bar */}
                  <div className="w-10 shrink-0">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.round(score * 100)}%`, background: tier.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-50 px-1">
            {[
              { l: "Needs Work", c: "#f59e0b" },
              { l: "Developing", c: "#eab308" },
              { l: "New", c: "#94a3b8" },
              { l: "On Track", c: "#3b82f6" },
              { l: "Stellar", c: "#10b981" },
            ].map(x => (
              <div key={x.l} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: x.c }} />
                <span className="text-[7px] text-slate-400 font-bold">{x.l}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-xs text-slate-400 font-bold">Start a mission to see your learning path</p>
        </div>
      )}
    </div>
  );
}