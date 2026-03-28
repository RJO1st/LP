"use client";
/**
 * KS4Dashboard.jsx — v3
 * Deploy to: src/components/dashboard/KS4Dashboard.jsx
 * Exam Studio — KS4 (Ages 15-17, Y10-13)
 * Plus Jakarta Sans / Inter, violet accent, deep dark, glass panels
 */

import React, { useState } from "react";
import DashboardShell, { MIcon } from "./DashboardShell";
import TaraPanel from "./TaraPanel";
import { getSubjectDisplay } from "@/lib/subjectDisplay";

function GlassCard({ children, className = "", id }) {
  return (
    <div id={id} className={`rounded-xl ${className}`}
      style={{ background: "rgba(68,65,115,0.25)", backdropFilter: "blur(16px)", border: "1px solid rgba(167,139,250,0.1)" }}>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">{children}</span>;
}

export default function KS4Dashboard({ scholar, predictedGrade = "—", examCountdown = "—", masteryPercent = 0,
  subjects = [], skillProficiency = {}, currentTopic = "Wave-Particle Duality", currentSubject = "Physics", currentUnit = "Quantum Mechanics / Unit 4.2",
  onStartQuest, onSignOut, taraMessage, taraCriteria = [], onTaraSend,
  mockTests = [], revisionSessions = [], leaderboard = [], recentQuizzes = [] }) {

  const [activeTab, setActiveTab] = useState("exams");
  const [examMode, setExamMode] = useState(true);

  const mainContent = (
    <div className="space-y-6 max-w-4xl">

      {/* ═══ EXAMS — Question + Lab ══════════════════════════════ */}
      <div id="section-exams" className="space-y-1">
        <div className="flex items-center gap-2 text-violet-400 text-[11px] font-bold uppercase tracking-[0.1em]">
          <MIcon name="science" size={14} />
          <span>{currentSubject} / {currentUnit}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{currentTopic}</h1>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "rgba(19,27,46,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Question */}
        <div className="p-6 md:p-8" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-white/70 leading-relaxed text-sm">
            Explain the evidence that suggests electromagnetic radiation behaves as both a wave and a particle. Refer to the{" "}
            <span className="text-violet-400 underline decoration-violet-400/30">photoelectric effect</span> and{" "}
            <span className="text-violet-400 underline decoration-violet-400/30">diffraction</span>. [6 Marks]
          </p>
        </div>

        {/* Lab Simulation */}
        <div className="p-6 md:p-8" style={{ background: "radial-gradient(circle at center, rgba(167,139,250,0.03) 0%, transparent 70%)" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <MIcon name="biotech" size={18} className="text-violet-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">Simulation Module</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] text-white/40 uppercase font-bold">Active</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Controls */}
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.12em] flex justify-between">
                  <span>Wavelength (λ)</span><span className="text-violet-400">450nm</span>
                </label>
                <input type="range" className="w-full accent-violet-400 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" defaultValue={45} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.12em] flex justify-between">
                  <span>Slit Separation (d)</span><span className="text-violet-400">0.25mm</span>
                </label>
                <input type="range" className="w-full accent-violet-400 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" defaultValue={25} />
              </div>
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.12em]">Mode Toggle</span>
                <div className="flex bg-white/5 p-1 rounded-lg">
                  <button className="flex-1 py-2 text-[10px] font-bold rounded-md bg-violet-500 text-white shadow-lg uppercase">Wave</button>
                  <button className="flex-1 py-2 text-[10px] font-bold rounded-md text-white/40 hover:text-white/60 uppercase">Particle</button>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="md:col-span-3 rounded-xl h-52 md:h-56 relative flex items-center justify-center overflow-hidden"
              style={{ background: "#060e20", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="absolute left-1/4 h-full flex flex-col justify-center gap-3">
                <div className="w-0.5 h-10 bg-white/20 rounded-full" />
                <div className="w-0.5 h-10 bg-white/20 rounded-full" />
              </div>
              <div className="flex items-center gap-1 opacity-80">
                {[20, 40, 70, 100, 70, 40, 20].map((h, i) => (
                  <div key={i} className="rounded-full" style={{
                    width: i === 3 ? 5 : 3, height: `${h * 0.55}px`,
                    background: i === 3 ? "#a78bfa" : `rgba(167,139,250,${h / 130})`,
                    filter: i !== 3 ? "blur(1px)" : "none",
                    boxShadow: i === 3 ? "0 0 20px rgba(167,139,250,0.4)" : "none",
                  }} />
                ))}
              </div>
              <div className="absolute bottom-3 right-3 flex gap-1.5">
                <button className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10"><MIcon name="fullscreen" size={14} className="text-violet-400" /></button>
                <button className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10"><MIcon name="refresh" size={14} className="text-violet-400" /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Answer */}
        <div className="p-6 md:p-8 pt-0">
          <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-white/30 mb-2">Your Analysis (Draft Phase)</label>
          <textarea className="w-full h-32 bg-white/[0.02] border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-violet-500/30 resize-none"
            placeholder="Explain the role of diffraction and the photoelectric effect here..." />
        </div>
      </div>

      {/* ═══ HEATMAP ═════════════════════════════════════════════ */}
      <GlassCard id="section-heatmap" className="p-5">
        <Label>Skill Heatmap</Label>
        <div className="grid grid-cols-4 gap-2 mt-3">
          {(subjects || ["mathematics", "english", "physics"]).map((subj) => {
  const d = getSubjectDisplay(subj, "ks4");
  return (
    <div key={subj} className="p-3 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform"
      onClick={() => onStartQuest?.(subj)}
      style={{ background: `${d.color}15`, border: `1px solid ${d.color}20` }}>
      <MIcon name={d.icon} size={18} style={{ color: d.color }} />
      <p className="text-[10px] font-bold text-white mt-1">{d.label}</p>
      <p className="text-[9px] text-white/40">{skillProficiency?.[subj] || 0}%</p>
    </div>
  );
})}
        </div>
      </GlassCard>

      {/* ═══ MOCKS ═══════════════════════════════════════════════ */}
      <GlassCard id="section-mocks" className="p-5">
        <Label>Mock Tests</Label>
        <div className="mt-3 space-y-2">
          {(mockTests.length > 0 ? mockTests : [
            { title: "Physics Paper 1", status: "Predicted: 9 / A*", action: "Retake", subject: "physics" },
            { title: "Advanced Maths Tier 2", status: "Available now — Predicted: 8 / A", action: "Start", subject: "mathematics" },
            { title: "Chemistry Paper 1", status: "Due in 5 days", action: "Prepare", subject: "chemistry" },
          ]).map((m, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-white/[0.03] transition-colors"
              onClick={() => onStartQuest?.(m.subject)}
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div>
                <p className="text-sm font-semibold text-white">{m.title}</p>
                <p className="text-[10px] text-white/40">{m.status}</p>
              </div>
              <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>{m.action}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* ═══ STRATEGY ════════════════════════════════════════════ */}
      <GlassCard id="section-strategy" className="p-5">
        <Label>Exam Strategy</Label>
        <div className="mt-3 space-y-3">
          <div className="p-3 rounded-lg" style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.1)" }}>
            <p className="text-xs text-white/60 leading-relaxed">
              Focus on 6-mark questions this week. Your average on extended responses is 3.8/6 — practising structured answers could push your predicted grade from 8 to 9.
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.1)" }}>
            <p className="text-xs text-green-300/70 leading-relaxed">
              <span className="font-bold text-green-400">Strength:</span> Calculation questions — you're scoring 95%+ consistently. Maintain this in timed conditions.
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.1)" }}>
            <p className="text-xs text-red-300/70 leading-relaxed">
              <span className="font-bold text-red-400">Weakness:</span> Practical-based questions — scores drop to 60% here. Review required practicals and key apparatus diagrams.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/5 text-xs font-semibold">
          <MIcon name="west" size={14} /> Previous Topic
        </button>
        <button onClick={() => onStartQuest?.("physics")}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg, #a78bfa, #7c87f3)", color: "#0b1326" }}>
          <MIcon name="lock" size={16} /> Evaluate & Submit
        </button>
      </div>
    </div>
  );

  const rightSidebar = (
    <>
      {/* Predicted Grade HUD */}
      <GlassCard className="p-5 flex items-center justify-between">
        <div>
          <Label>Real-time Performance</Label>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-bold text-violet-400">{predictedGrade}</span>
            <span className="text-xs text-white/40">Projected</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Impact +0.2</span>
          <div className="w-20 h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${masteryPercent}%`, background: "linear-gradient(135deg, #a78bfa, #7c87f3)" }} />
          </div>
        </div>
      </GlassCard>

      {/* Tara */}
      <TaraPanel band="ks4"
        message={taraMessage || "Notice how the simulation changes when you toggle to particle mode. Photons behave as discrete quanta. Link this to the 1:1 interaction in the photoelectric effect for top marks."}
        criteria={taraCriteria.length > 0 ? taraCriteria : [
          { label: "Wave Theory: Diffraction", met: true },
          { label: "Particle Theory: Threshold", met: false },
          { label: "De Broglie Relation", met: false },
        ]}
        onSendMessage={onTaraSend} />

      {/* Session Stats */}
      <GlassCard className="p-4 space-y-3">
        <Label>Session Stats</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-lg font-bold text-white">{examCountdown}</div>
            <div className="text-[9px] text-white/30 uppercase font-bold tracking-wider">Countdown</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">{masteryPercent}%</div>
            <div className="text-[9px] text-white/30 uppercase font-bold tracking-wider">Mastery</div>
          </div>
        </div>
      </GlassCard>

      {/* Revision Schedule */}
      <GlassCard className="p-4">
        <Label>Today's Revision</Label>
        <div className="mt-3 space-y-2">
          {(revisionSessions.length > 0 ? revisionSessions : [
            { time: "16:00", topic: "Quantum Physics", priority: "high" },
            { time: "17:30", topic: "Organic Chemistry", priority: "medium" },
          ]).map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
              <span className="text-[10px] font-bold text-violet-400 w-10">{r.time}</span>
              <span className="text-xs text-white/60 flex-1">{r.topic}</span>
              <span className="w-2 h-2 rounded-full" style={{ background: r.priority === "high" ? "#ef4444" : "#f59e0b" }} />
            </div>
          ))}
        </div>
      </GlassCard>
    </>
  );

  return (
    <DashboardShell band="ks4" scholarName={scholar?.name || scholar?.codename} activeTab={activeTab} onTabChange={setActiveTab}
      onSignOut={onSignOut} onStartQuest={() => onStartQuest?.("physics")}
      mainContent={mainContent} rightSidebar={rightSidebar}
      topBarLeft={
        <div className="flex items-center gap-5 text-sm">
          <span className="text-amber-400 font-bold">Predicted: {predictedGrade}</span>
          <span className="text-violet-300/60">Countdown: {examCountdown}</span>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Exam Mode</span>
            <div className="w-7 h-3.5 bg-amber-400 rounded-full relative cursor-pointer" onClick={() => setExamMode(!examMode)}>
              <div className="absolute top-0.5 w-2.5 h-2.5 bg-[#0b1326] rounded-full shadow-sm transition-all"
                style={{ right: examMode ? "2px" : "auto", left: examMode ? "auto" : "2px" }} />
            </div>
          </div>
        </div>
      }
      topBarRight={
        <button className="text-violet-300/50 hover:text-violet-300 transition-colors p-1">
          <MIcon name="notifications" size={20} />
        </button>
      }
    />
  );
}