"use client";
/**
 * KS3Dashboard.jsx — v3
 * Deploy to: src/components/dashboard/KS3Dashboard.jsx
 * Career Lab — KS3 (Ages 12-14, Y7-9)
 * DM Sans typography, sky blue accent, clean slate theme
 */

import React, { useState } from "react";
import DashboardShell, { MIcon } from "./DashboardShell";
import TaraPanel from "./TaraPanel";
import { getSubjectDisplay, getSubjectLabel } from "@/lib/subjectDisplay";

function StatCard({ icon, value, label, border, accent = "#0ea5e9" }) {
  return (
    <div className="p-4 rounded-xl flex flex-col justify-between gap-3"
      style={{ background: "#fff", border: border ? `3px solid ${accent}22` : "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
      <MIcon name={icon} size={20} className="text-sky-500" />
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</div>
      </div>
    </div>
  );
}

function SkillBar({ label, percent, color = "#0ea5e9", onClick }) {
  return (
    <div onClick={onClick} className="p-3 rounded-lg bg-white border border-slate-100 cursor-pointer hover:border-sky-200 transition-colors">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{percent}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  );
}

function PracticeRow({ icon, title, subtitle, action, actionColor, onClick }) {
  return (
    <div onClick={onClick} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-all rounded-xl cursor-pointer group">
      <div className="w-11 h-11 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-colors text-slate-400">
        <MIcon name={icon} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-slate-800">{title}</h4>
        <p className="text-xs text-slate-400 truncate">{subtitle}</p>
      </div>
      <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: `${actionColor}10`, color: actionColor }}>{action}</span>
    </div>
  );
}

function FocusCard({ time, title, priority }) {
  const colors = { high: { dot: "#ef4444", text: "#dc2626" }, medium: { dot: "#f59e0b", text: "#d97706" }, low: { dot: "#22c55e", text: "#16a34a" } };
  const p = colors[priority] || colors.medium;
  return (
    <div className="p-4 rounded-xl" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
      <div className="text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-1">{time}</div>
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ background: p.dot }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: p.text }}>{priority} priority</span>
      </div>
    </div>
  );
}

export default function KS3Dashboard({ scholar, masteryPercent = 72, timeSpent = "8.3h", streak = 7, ranking = "Top 15%",
  subjects = [], skillProficiency = {}, onStartQuest, onSignOut, taraMessage, onTaraSend }) {
  const [activeTab, setActiveTab] = useState("dashboard");

  const mainContent = (
    <div className="space-y-6 max-w-4xl">

      {/* ═══ DASHBOARD ═══════════════════════════════════════════ */}
      <section id="section-dashboard" className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-5 items-start">
        <div className="w-14 h-14 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
          <MIcon name="satellite_alt" size={28} className="text-sky-500" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800 mb-1">Let's make progress.</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your data shows strong aptitude in <span className="text-sky-600 font-semibold">{getSubjectLabel(subjects[0]) || "Mathematics"}</span>.
            Your weakest area needs focus — the AI has queued targeted questions for you.
          </p>
        </div>
        <button onClick={() => onStartQuest?.(subjects[0] || "mathematics")}
          className="bg-sky-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-sky-600 transition-colors shrink-0">
          <MIcon name="bolt" filled size={16} /> Fix Weak Spot
        </button>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="electric_bolt" value={`${masteryPercent}%`} label="Mastery" border />
        <StatCard icon="schedule" value={timeSpent} label="Time" />
        <StatCard icon="local_fire_department" value={streak} label="Streak" />
        <StatCard icon="trending_up" value={ranking} label="Ranking" />
      </div>

      {/* ═══ SKILLS ══════════════════════════════════════════════ */}
      <section id="section-skills" className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-5">Skill Map</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          // REPLACE WITH:
 
{(subjects || ["mathematics", "english", "science"]).map((subj) => {
  const d = getSubjectDisplay(subj, "ks3");
  return (
    <SkillBar
      key={subj}
      label={d.label}
      percent={skillProficiency?.[subj] || 0}
      color={d.color}
      onClick={() => onStartQuest?.(subj)}
    />
  );
})}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-sky-50 border border-sky-100 flex items-start gap-3">
          <MIcon name="work" size={18} className="text-sky-600 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-sky-800">Career Connection</p>
            <p className="text-xs text-sky-600">Your Maths + Science profile aligns with <span className="font-bold">Engineering</span> and <span className="font-bold">Data Science</span> pathways.</p>
          </div>
        </div>
      </section>

      {/* ═══ PRACTICE ════════════════════════════════════════════ */}
      <section id="section-practice" className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Practice Hub</h2>
        <div className="space-y-1">
          <PracticeRow icon="functions" title="Algebra & Equations Mock" subtitle="AI-selected based on your weaknesses" action="Start" actionColor="#0ea5e9" onClick={() => onStartQuest?.("mathematics")} />
          <PracticeRow icon="science" title="Forces & Energy Review" subtitle="Completed yesterday — predicted grade: 7" action="Retake" actionColor="#059669" onClick={() => onStartQuest?.("science")} />
          <PracticeRow icon="history_edu" title="Source Analysis Practice" subtitle="New — unlocked based on your progress" action="New" actionColor="#d97706" onClick={() => onStartQuest?.("history")} />
          <PracticeRow icon="translate" title="English Comprehension" subtitle="Reading skills — 3 passages" action="Start" actionColor="#e11d48" onClick={() => onStartQuest?.("english")} />
        </div>
      </section>

      {/* ═══ PLANNER ═════════════════════════════════════════════ */}
      <section id="section-planner" className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <MIcon name="event_note" size={20} className="text-sky-500" /> Focus Sessions
        </h2>
        <div className="space-y-3">
          <FocusCard time="Today — 16:30" title="Algebra: Solving Equations" priority="high" />
          <FocusCard time="Tomorrow — 14:00" title="Science: Forces Revision" priority="medium" />
          <FocusCard time="Wednesday — 10:00" title="History: Source Analysis" priority="low" />
          <button className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-xs font-semibold text-slate-400 hover:border-sky-300 hover:text-sky-500 transition-colors">
            + Add Study Block
          </button>
        </div>
      </section>
    </div>
  );

  const rightSidebar = (
    <>
      <TaraPanel band="ks3" message={taraMessage || "Your recent quiz showed improvement in algebra, but ratio questions are still below target. I've queued 5 focused questions. Ready?"} onSendMessage={onTaraSend} />

      {/* Weekly Goals */}
      <div className="p-4 rounded-xl" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <MIcon name="flag" size={16} className="text-sky-500" /> Weekly Goals
        </h3>
        <div className="space-y-2">
          {[
            { label: "Complete 5 quests", done: 3, total: 5 },
            { label: "90% accuracy in Maths", done: 85, total: 100, pct: true },
            { label: "Review 3 weak topics", done: 1, total: 3 },
          ].map((g, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">{g.label}</span>
                <span className="text-slate-400 font-semibold">{g.pct ? `${g.done}%` : `${g.done}/${g.total}`}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-sky-400" style={{ width: `${g.pct ? g.done : (g.done / g.total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Year Group Standings */}
      <div className="p-4 rounded-xl" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Year 9 Standings</h3>
        <div className="space-y-2">
          {[
            { rank: 3, name: "Alex M.", xp: "9,100" },
            { rank: 4, name: "You", xp: "8,290", hi: true },
            { rank: 5, name: "Jamie L.", xp: "7,100" },
            { rank: 6, name: "Sarah W.", xp: "6,950" },
            { rank: 7, name: "Tom R.", xp: "6,400" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg"
              style={{ background: s.hi ? "rgba(14,165,233,0.06)" : "transparent", border: s.hi ? "1px solid rgba(14,165,233,0.15)" : "1px solid transparent" }}>
              <span className="text-[10px] font-black w-4" style={{ color: s.hi ? "#0ea5e9" : "#94a3b8" }}>{s.rank}</span>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: s.hi ? "#e0f2fe" : "#f1f5f9", color: s.hi ? "#0369a1" : "#64748b" }}>{s.name[0]}</div>
              <span className="text-xs font-semibold flex-1 text-slate-700">{s.name}{s.hi ? " (You)" : ""}</span>
              <span className="text-[10px] font-bold text-slate-400">{s.xp} XP</span>
            </div>
          ))}
        </div>
        <button className="w-full mt-3 text-[10px] font-bold text-sky-500 uppercase tracking-wider">View Full Leaderboard</button>
      </div>

      {/* Streak */}
      <div className="p-4 rounded-xl" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.05)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MIcon name="local_fire_department" filled size={18} className="text-orange-400" />
            <span className="text-sm font-bold text-slate-700">{streak} day streak</span>
          </div>
          <span className="text-[10px] text-slate-400">Keep it going!</span>
        </div>
      </div>
    </>
  );

  return (
    <DashboardShell band="ks3" scholarName={scholar?.name || scholar?.codename} activeTab={activeTab} onTabChange={setActiveTab}
      onSignOut={onSignOut} onStartQuest={() => onStartQuest?.(subjects[0] || "mathematics")}
      mainContent={mainContent} rightSidebar={rightSidebar}
      topBarLeft={
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500 flex items-center gap-1">
            <MIcon name="local_fire_department" size={16} className="text-orange-400" />{streak} day streak
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-sky-500 font-semibold">{masteryPercent}% mastery</span>
        </div>
      }
      topBarRight={
        <button className="text-slate-400 hover:text-sky-500 transition-colors p-1.5 rounded-lg hover:bg-slate-50">
          <MIcon name="notifications" size={20} />
        </button>
      }
    />
  );
}