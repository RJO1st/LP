"use client";
/**
 * KS2Dashboard.jsx — v4 (data-driven)
 * Deploy to: src/components/dashboard/KS2Dashboard.jsx
 *
 * Space Explorer — KS2 (Ages 8-11, Y3-6)
 * All data from props — no hardcoded subjects/percentages/names
 * Features: pulsing weakest topic, real mastery %, scholar year, real leaderboard
 */

import React, { useState, useMemo } from "react";
import DashboardShell, { MIcon } from "./DashboardShell";
import TaraPanel from "./TaraPanel";
import StickerCollection from "./StickerCollection";
import { getSubjectDisplay } from "@/lib/subjectDisplay";
import { formatGradeLabel } from "@/lib/gamificationEngine";

const N = { fontFamily: "Nunito, sans-serif" };

function SpaceCard({ children, className = "", glow = false, id }) {
  return (
    <div id={id} className={`rounded-2xl p-5 ${className}`}
      style={{ background: "rgba(30,27,75,0.6)", backdropFilter: "blur(12px)",
        border: `1px solid rgba(129,140,248,${glow ? 0.2 : 0.08})`,
        boxShadow: glow ? "0 0 24px rgba(129,140,248,0.08)" : "none" }}>
      {children}
    </div>
  );
}

function GalaxyNode({ icon, title, percent, locked, color = "#818cf8", onClick, isWeakest, isNext }) {
  return (
    <div onClick={() => !locked && onClick?.()} className={`relative flex items-center gap-4 p-4 rounded-xl transition-transform hover:-translate-y-0.5 ${locked ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
      style={{ background: locked ? "rgba(255,255,255,0.02)" : "rgba(129,140,248,0.06)", border: `1px solid ${locked ? "rgba(255,255,255,0.04)" : `${color}22`}` }}>
      {/* Pulsing ring for weakest subject */}
      {isWeakest && (
        <div className="absolute -inset-[2px] rounded-xl border-2 border-amber-400 opacity-50 animate-pulse pointer-events-none" />
      )}
      {/* "Next up" / "Weakest" badge */}
      {isWeakest && (
        <div className="absolute -top-2 left-4 z-10">
          <span className="bg-amber-500 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-slate-900 shadow-md">
            Focus here
          </span>
        </div>
      )}
      {isNext && !isWeakest && (
        <div className="absolute -top-2 left-4 z-10">
          <span className="bg-indigo-500 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white shadow-md">
            Next up
          </span>
        </div>
      )}
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: locked ? "rgba(255,255,255,0.05)" : `${color}15`, boxShadow: locked ? "none" : `0 0 12px ${color}20` }}>
        <MIcon name={locked ? "lock" : icon} size={20} style={locked ? { color: "rgba(255,255,255,0.2)" } : { color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white" style={N}>{title}</p>
        {!locked && percent != null && (
          <>
            <div className="h-1.5 w-full bg-white/5 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(percent, 100)}%`, background: color }} />
            </div>
            <p className="text-[10px] font-bold mt-1" style={{ color }}>
              {percent > 0 ? `${percent}% mastered` : "Not started"}
            </p>
          </>
        )}
      </div>
      {!locked && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <MIcon name="play_arrow" size={16} style={{ color }} />
        </div>
      )}
    </div>
  );
}

export default function KS2Dashboard({
  scholar, subjects = [], skillProficiency = {}, leaderboard = [],
  stardust, missions, streak, ranking,
  onStartQuest, onSignOut, taraMessage, onTaraSend,
  recentQuizzes = [], nextTopic, nextTopicReason,
  earnedBadgeIds = [], bestAccuracy = 0, totalXP = 0,
}) {
  const [activeTab, setActiveTab] = useState("mission");
  const name = scholar?.name || scholar?.codename || "Scholar";
  const yearLevel = scholar?.year_level || scholar?.year || 4;
  const curriculum = scholar?.curriculum || "uk_national";
  const totalXp = stardust ?? scholar?.total_xp ?? 0;
  const streakDays = streak ?? scholar?.streak ?? 0;
  const totalMissions = missions ?? scholar?.quests_completed ?? 0;

  // Compute weakest subject from real data
  const { weakestSubject, avgMastery } = useMemo(() => {
    if (!subjects.length) return { weakestSubject: null, avgMastery: 0 };
    let weakest = subjects[0];
    let weakestVal = Infinity;
    let total = 0;
    subjects.forEach(s => {
      const p = skillProficiency[s] ?? 0;
      total += p;
      if (p < weakestVal) { weakestVal = p; weakest = s; }
    });
    return { weakestSubject: weakest, avgMastery: Math.round(total / subjects.length) };
  }, [subjects, skillProficiency]);

  // Format grade label
  const gradeLabel = formatGradeLabel ? formatGradeLabel(yearLevel, curriculum) : `Year ${yearLevel}`;

  const mainContent = (
    <div className="space-y-5 max-w-4xl">

      {/* ═══ MISSION (Hero) ══════════════════════════════════════ */}
      <section id="section-mission">
        <SpaceCard className="flex flex-col md:flex-row gap-5 items-center" glow>
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0">
            <MIcon name="rocket_launch" filled size={28} className="text-indigo-400" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl md:text-2xl font-bold text-white" style={N}>Commander {name}!</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20">
                {gradeLabel}
              </span>
            </div>
            <p className="text-sm text-indigo-200/60" style={N}>
              {weakestSubject
                ? `Your ${getSubjectDisplay(weakestSubject, "ks2").label} needs attention. Launch a mission to strengthen it!`
                : "Your stardust reserves are growing. Ready for today's galactic mission?"
              }
            </p>
          </div>
          <button onClick={() => onStartQuest?.(weakestSubject || subjects[0] || "mathematics")}
            className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-transform active:scale-95 shrink-0"
            style={{ background: "linear-gradient(135deg, #818cf8, #6366f1)", color: "#fff", boxShadow: "0 0 20px rgba(129,140,248,0.3)" }}>
            <MIcon name="rocket_launch" size={16} /> Launch Mission
          </button>
        </SpaceCard>

        {/* Stats bento */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { icon: "auto_awesome", label: "Stardust", value: totalXp.toLocaleString(), accent: "#818cf8" },
            { icon: "rocket_launch", label: "Missions", value: totalMissions },
            { icon: "local_fire_department", label: "Streak", value: streakDays > 0 ? `${streakDays}d` : "—", accent: streakDays > 0 ? "#f97316" : "#475569" },
            { icon: "trending_up", label: "Mastery", value: `${avgMastery}%`, accent: "#818cf8" },
          ].map((s, i) => (
            <SpaceCard key={i}>
              <MIcon name={s.icon} filled size={18} style={{ color: s.accent || "#818cf8" }} />
              <div className="mt-2">
                <div className="text-xl font-bold text-white" style={N}>{s.value}</div>
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/30">{s.label}</div>
              </div>
            </SpaceCard>
          ))}
        </div>
      </section>

      {/* Daily Mission CTA */}
      <SpaceCard className="cursor-pointer group" glow>
        <div className="flex items-center justify-between" onClick={() => onStartQuest?.(weakestSubject || subjects[0] || "mathematics")}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <MIcon name="bolt" filled size={28} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white" style={N}>Daily Mission</h3>
              <p className="text-xs text-indigo-200/50">AI-selected questions for you</p>
            </div>
          </div>
          <div className="px-5 py-2 rounded-xl font-bold text-sm text-white group-hover:scale-105 transition-transform"
            style={{ background: "linear-gradient(135deg, #818cf8, #6366f1)", ...N }}>LAUNCH</div>
        </div>
      </SpaceCard>

      {/* ═══ GALAXY MAP — dynamic from subjects prop ═════════════ */}
      <SpaceCard id="section-galaxy">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2" style={N}>
            <MIcon name="public" size={20} className="text-indigo-400" /> Galaxy Map
          </h2>
          <span className="text-[10px] text-white/20 font-bold uppercase tracking-wider">
            {subjects.length} sectors
          </span>
        </div>
        <div className="space-y-2">
          {subjects.map((subj) => {
            const d = getSubjectDisplay(subj, "ks2");
            const pct = skillProficiency[subj] ?? 0;
            const isWeakest = subj === weakestSubject && pct > 0;
            const isNext = subj === weakestSubject && pct === 0;
            return (
              <GalaxyNode
                key={subj}
                icon={d.icon}
                title={d.label}
                percent={pct}
                color={d.color}
                onClick={() => onStartQuest?.(subj)}
                isWeakest={isWeakest}
                isNext={isNext}
              />
            );
          })}
        </div>

        {/* Next topic insight */}
        {nextTopic && (
          <div className="mt-4 p-3 rounded-xl flex items-start gap-3"
            style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
            <MIcon name="lightbulb" filled size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-300" style={N}>AI Recommendation</p>
              <p className="text-[11px] text-amber-200/60" style={N}>
                Next topic: <span className="font-bold text-amber-300">{nextTopic}</span>
                {nextTopicReason && <span className="text-white/30"> — {nextTopicReason}</span>}
              </p>
            </div>
          </div>
        )}
      </SpaceCard>

      {/* ═══ ACHIEVEMENT MEDALS ═══════════════════════════════════ */}
      <StickerCollection
        band="ks2"
        earnedBadgeIds={earnedBadgeIds}
        milestones={{ questsCompleted: missions ?? 0, streak: streak ?? 0, accuracy: bestAccuracy, totalXP: totalXP ?? stardust ?? 0 }}
      />

      {/* ═══ JOURNAL — real data from recentQuizzes ══════════════ */}
      <SpaceCard id="section-journal">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2" style={N}>
          <MIcon name="menu_book" size={18} className="text-indigo-400" /> Mission Journal
        </h3>
        {recentQuizzes.length > 0 ? (
          <div className="space-y-2">
            {recentQuizzes.slice(0, 5).map((q, i) => {
              const d = getSubjectDisplay(q.subject, "ks2");
              const pct = q.pct ?? (q.total > 0 ? Math.round((q.score / q.total) * 100) : 0);
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <MIcon name={pct >= 80 ? "check_circle" : pct >= 50 ? "remove_circle" : "cancel"} filled size={16}
                    style={{ color: pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444" }} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-white" style={N}>{d.label}</p>
                    <p className="text-[10px] text-white/30">{q.date || "Recently"}</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444" }}>
                    {q.score}/{q.total}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <span className="text-3xl block mb-2">🛸</span>
            <p className="text-white/20 text-sm" style={N}>Complete missions to fill your journal!</p>
          </div>
        )}
      </SpaceCard>

      {/* ═══ RANKINGS — real leaderboard data ════════════════════ */}
      <SpaceCard id="section-rankings">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2" style={N}>
          <MIcon name="emoji_events" filled size={16} className="text-indigo-400" /> Commander Rankings
          <span className="ml-auto text-[10px] text-white/20 font-bold">{gradeLabel}</span>
        </h3>
        {leaderboard.length > 0 ? (
          <div className="space-y-2">
            {leaderboard.slice(0, 8).map((entry, i) => {
              const isMe = entry.id === scholar?.id;
              return (
                <div key={entry.id || i} className="flex items-center gap-2 p-2.5 rounded-lg"
                  style={{ background: isMe ? "rgba(129,140,248,0.1)" : "transparent",
                    border: isMe ? "1px solid rgba(129,140,248,0.15)" : "1px solid transparent" }}>
                  <span className="text-[10px] font-black w-5 text-center" style={{ color: isMe ? "#818cf8" : i < 3 ? "#fbbf24" : "rgba(255,255,255,0.25)" }}>
                    {i + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold"
                    style={{ background: isMe ? "rgba(129,140,248,0.2)" : "rgba(255,255,255,0.05)",
                      color: isMe ? "#818cf8" : "rgba(255,255,255,0.4)" }}>
                    {(entry.codename || entry.name || "?")[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold flex-1 text-white/70" style={N}>
                    {entry.codename || entry.name}{isMe ? " (You)" : ""}
                  </span>
                  <span className="text-[10px] font-bold text-white/30">{(entry.total_xp || 0).toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-white/20 text-sm py-4" style={N}>Be the first on the board!</p>
        )}
      </SpaceCard>
    </div>
  );

  const rightSidebar = (
    <>
      <TaraPanel band="ks2"
        message={taraMessage || `Commander ${name}, ${weakestSubject ? `your ${getSubjectDisplay(weakestSubject, "ks2").label} needs work — I've queued targeted questions.` : "ready for your next mission?"}`}
        onSendMessage={onTaraSend} />

      {/* Scholar profile card */}
      <div className="p-4 rounded-2xl" style={{ background: "rgba(30,27,75,0.6)", border: "1px solid rgba(129,140,248,0.08)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-lg font-bold text-indigo-400">
            {name[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-white" style={N}>{name}</p>
            <p className="text-[10px] text-white/30 font-bold">{gradeLabel} · {curriculum.replace(/_/g, " ").toUpperCase()}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
            <p className="text-sm font-bold text-white" style={N}>{totalXp.toLocaleString()}</p>
            <p className="text-[8px] text-white/25 font-bold uppercase">XP</p>
          </div>
          <div className="rounded-lg py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
            <p className="text-sm font-bold text-white" style={N}>{streakDays}d</p>
            <p className="text-[8px] text-white/25 font-bold uppercase">Streak</p>
          </div>
          <div className="rounded-lg py-2" style={{ background: "rgba(255,255,255,0.04)" }}>
            <p className="text-sm font-bold text-white" style={N}>{avgMastery}%</p>
            <p className="text-[8px] text-white/25 font-bold uppercase">Mastery</p>
          </div>
        </div>
      </div>

      {/* Subject mastery breakdown */}
      <div className="p-4 rounded-2xl" style={{ background: "rgba(30,27,75,0.6)", border: "1px solid rgba(129,140,248,0.08)" }}>
        <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Subject Mastery</h4>
        <div className="space-y-2.5">
          {subjects.map(subj => {
            const d = getSubjectDisplay(subj, "ks2");
            const pct = skillProficiency[subj] ?? 0;
            const isWeak = subj === weakestSubject;
            return (
              <div key={subj} className="relative">
                {isWeak && <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-amber-400" />}
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <MIcon name={d.icon} size={12} style={{ color: d.color }} />
                    <span className="text-[11px] font-semibold text-white/60">{d.label}</span>
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: pct >= 70 ? "#22c55e" : pct >= 40 ? d.color : "#f59e0b" }}>
                    {pct > 0 ? `${pct}%` : "—"}
                  </span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: d.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Career Connection */}
      <div className="p-4 rounded-2xl" style={{ background: "rgba(30,27,75,0.6)", border: "1px solid rgba(129,140,248,0.08)" }}>
        <div className="flex items-start gap-3">
          <MIcon name="work" size={18} className="text-indigo-400 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-white" style={N}>Career Connection</p>
            <p className="text-[10px] text-white/40">Engineers use forces to design bridges. Game designers use probability to balance rewards.</p>
          </div>
        </div>
      </div>

      {/* This week activity */}
      <div className="p-4 rounded-2xl" style={{ background: "rgba(30,27,75,0.6)", border: "1px solid rgba(129,140,248,0.08)" }}>
        <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">This Week</h4>
        <div className="grid grid-cols-7 gap-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => {
            const today = new Date().getDay();
            const dayIdx = today === 0 ? 6 : today - 1; // Mon=0
            const isPast = i < dayIdx;
            const isToday = i === dayIdx;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[8px] text-white/20 font-bold">{d}</span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isToday ? "bg-indigo-500/30 ring-1 ring-indigo-400" : isPast ? "bg-indigo-500/10" : "bg-white/5"
                }`}>
                  {isPast && <MIcon name="check" size={10} className="text-indigo-400" />}
                  {isToday && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <DashboardShell band="ks2" scholarName={name} activeTab={activeTab} onTabChange={setActiveTab}
      onSignOut={onSignOut} onStartQuest={() => onStartQuest?.(weakestSubject || subjects[0] || "mathematics")}
      mainContent={mainContent} rightSidebar={rightSidebar}
      topBarLeft={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/10">
            <MIcon name="auto_awesome" filled size={14} className="text-indigo-400" />
            <span className="font-bold text-indigo-300 text-sm" style={N}>{totalXp.toLocaleString()} Stardust</span>
          </div>
          <span className="text-[10px] text-white/20 font-bold uppercase tracking-wider">{gradeLabel}</span>
          {streakDays > 0 && (
            <div className="flex items-center gap-1 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/10">
              <MIcon name="local_fire_department" filled size={14} className="text-orange-400" />
              <span className="font-bold text-orange-300 text-sm" style={N}>{streakDays}d</span>
            </div>
          )}
        </div>
      }
      topBarRight={
        <button className="text-indigo-300/40 hover:text-indigo-300 transition-colors p-1">
          <MIcon name="notifications" size={20} />
        </button>
      }
    />
  );
}