"use client";
/**
 * KS1Dashboard.jsx — v3
 * Deploy to: src/components/dashboard/KS1Dashboard.jsx
 * Celestial Nursery — KS1 (Ages 5-7, Y1-2)
 * Fredoka typography, amber accent, rounded-28, TTS auto via TaraPanel
 */

import React, { useState } from "react";
import DashboardShell, { MIcon } from "./DashboardShell";
import TaraPanel from "./TaraPanel";
import StickerCollection from "./StickerCollection";
import { getSubjectDisplay } from "@/lib/subjectDisplay";

const F = { fontFamily: "Fredoka, sans-serif" };

function NurseryCard({ children, className = "", highlight = false, id }) {
  return (
    <div id={id} className={`rounded-[28px] p-6 ${className}`}
      style={{ background: "#fff", border: highlight ? "3px solid rgba(245,158,11,0.3)" : "2px solid rgba(245,158,11,0.1)",
        boxShadow: "0 8px 24px -4px rgba(82,61,166,0.06)" }}>
      {children}
    </div>
  );
}

function TopicNode({ emoji, icon, title, subtitle, percent, locked, color = "#3b82f6", onClick }) {
  return (
    <div onClick={() => !locked && onClick?.()} className={`p-5 rounded-[24px] bg-white border-2 flex items-center gap-4 transition-transform hover:-translate-y-1 ${locked ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      style={{ borderColor: locked ? "#e2e8f0" : `${color}30` }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: `${color}15` }}>
        {locked ? <MIcon name="lock" size={22} className="text-slate-300" /> : icon ? <MIcon name={icon} size={22} style={{ color }} /> : <span>{emoji}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-slate-800" style={F}>{title}</p>
        {!locked && percent != null && (
          <div className="h-2.5 w-full bg-slate-100 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: color }} />
          </div>
        )}
        {!locked && percent != null && (
          <p className="text-[10px] font-bold mt-1" style={{ color }}>{percent}% explored</p>
        )}
        {locked && <p className="text-[10px] text-slate-400 mt-0.5" style={F}>{subtitle}</p>}
      </div>
      {!locked && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <MIcon name="play_arrow" size={18} style={{ color }} />
        </div>
      )}
    </div>
  );
}

export default function KS1Dashboard({ scholar, stars = 4, streak = 3, petStage = "egg", petWarmth = 80, subjects = [],
  skillProficiency = {}, onStartQuest, onSignOut, taraMessage, onTaraSend,
  earnedBadgeIds = [], questsCompleted = 0, bestAccuracy = 0, totalXP = 0 }) {
  const [activeTab, setActiveTab] = useState("adventure");

  const PET_ICONS = { egg: "egg", hatchling: "cruelty_free", chick: "flutter", bird: "flutter_dash" };
  const name = scholar?.name || "friend";

  const mainContent = (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* ═══ ADVENTURE ════════════════════════════════════════════ */}
      <section id="section-adventure" className="relative p-6 md:p-8 rounded-[28px] overflow-hidden"
        style={{ background: "linear-gradient(135deg, #FFF9E3 0%, #FFF1B8 100%)", border: "3px solid #FFBF00" }}>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-5">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-inner shrink-0">
            <MIcon name="face_retouching_natural" filled size={44} className="text-amber-500" />
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-1" style={F}>You're a superstar!</h1>
            <p className="text-lg text-amber-700/80 max-w-md" style={F}>
              Hi {name}! Help the unicorn find its way through the Celestial Nursery today!
            </p>
          </div>
        </div>
        <MIcon name="auto_awesome" filled size={80} className="absolute -bottom-3 -right-3 text-amber-200/30 rotate-12" />
      </section>

      {/* Star Collection + Pet */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <NurseryCard className="md:col-span-2 text-center" highlight>
          <h3 className="text-xl font-bold text-violet-700 mb-3" style={F}>My Star Collection</h3>
          <div className="flex gap-2 justify-center mb-3 flex-wrap">
            {Array.from({ length: Math.min(stars, 10) }).map((_, i) => (
              <MIcon key={i} name="star" filled size={36} className="text-amber-400" />
            ))}
            {stars < 5 && Array.from({ length: 5 - stars }).map((_, i) => (
              <MIcon key={`e-${i}`} name="star" size={36} className="text-amber-200/40" />
            ))}
          </div>
          <p className="text-sm text-slate-500" style={F}>Wow! You've found {stars} shiny stars this week!</p>
        </NurseryCard>

        <NurseryCard className="text-center flex flex-col items-center justify-center">
          <h3 className="text-lg font-bold text-pink-600 mb-3" style={F}>Mystery Egg</h3>
          <div className="relative w-24 h-28 bg-gradient-to-b from-blue-50 to-blue-100 rounded-[3rem] flex items-center justify-center border-4 border-dashed border-pink-200 mb-2">
            <MIcon name={PET_ICONS[petStage] || "egg"} filled size={48} className="text-pink-300" />
          </div>
          <p className="text-xs text-pink-500 font-medium" style={F}>{petWarmth}% warmth — keep learning!</p>
          <div className="w-full h-2 bg-pink-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-300 to-pink-400 rounded-full" style={{ width: `${petWarmth}%` }} />
          </div>
        </NurseryCard>
      </div>

      {/* Today's Adventure CTA */}
      <section className="p-6 md:p-8 rounded-[28px] cursor-pointer group relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #4142e3, #6366f1)" }}
        onClick={() => onStartQuest?.("mathematics")}>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-5">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <MIcon name="map" size={36} className="text-white" />
            </div>
            <div className="text-white">
              <h2 className="text-2xl md:text-3xl font-bold" style={F}>Today's Adventure</h2>
              <p className="text-lg opacity-90" style={F}>10 fun puzzles waiting for you!</p>
            </div>
          </div>
          <div className="px-6 py-3 bg-amber-400 text-slate-900 font-black text-xl rounded-full shadow-lg group-hover:scale-105 transition-transform" style={F}>
            LET'S GO!
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
      </section>

      {/* ═══ MAP (Treasure Map) ═══════════════════════════════════ */}
      <NurseryCard id="section-map">
        <div className="flex items-center gap-2 mb-5">
          <MIcon name="explore" size={22} className="text-amber-500" />
          <h3 className="text-xl font-bold text-slate-800" style={F}>Treasure Map</h3>
        </div>
        <div className="space-y-3">
          {(subjects || ["mathematics", "english", "science"]).map((subj, i) => {
  const d = getSubjectDisplay(subj, "ks1");
  return (
    <TopicNode
      key={subj}
      emoji={null}
      icon={d.icon}
      title={d.label}
      percent={skillProficiency?.[subj] || 0}
      color={d.color}
      onClick={() => onStartQuest?.(subj)}
    />
  );
})}
        </div>
      </NurseryCard>

      {/* ═══ TROPHIES / STICKER COLLECTION ════════════════════════ */}
      <StickerCollection
        band="ks1"
        earnedBadgeIds={earnedBadgeIds}
        milestones={{ questsCompleted, streak, accuracy: bestAccuracy, totalXP }}
      />

      {/* ═══ JOURNAL ═════════════════════════════════════════════ */}
      <NurseryCard id="section-journal">
        <div className="flex items-center gap-2 mb-4">
          <MIcon name="menu_book" size={22} className="text-violet-600" />
          <h3 className="text-xl font-bold text-slate-800" style={F}>Quest Journal</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-100">
            <MIcon name="check_circle" filled size={20} className="text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-700" style={F}>The Magic Spells</p>
              <p className="text-[10px] text-slate-400" style={F}>Completed yesterday — 8/10 correct</p>
            </div>
            <div className="flex gap-0.5">
              <MIcon name="star" filled size={12} className="text-amber-400" />
              <MIcon name="star" filled size={12} className="text-amber-400" />
              <MIcon name="star" size={12} className="text-amber-200" />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-2xl border border-blue-100">
            <MIcon name="check_circle" filled size={20} className="text-blue-500" />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-700" style={F}>Counting Adventure</p>
              <p className="text-[10px] text-slate-400" style={F}>2 days ago — 9/10 correct</p>
            </div>
            <div className="flex gap-0.5">
              <MIcon name="star" filled size={12} className="text-amber-400" />
              <MIcon name="star" filled size={12} className="text-amber-400" />
              <MIcon name="star" filled size={12} className="text-amber-400" />
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center pt-1" style={F}>Complete more adventures to fill your journal!</p>
        </div>
      </NurseryCard>
    </div>
  );

  const rightSidebar = (
    <>
      {/* Tara — auto TTS for KS1 */}
      <TaraPanel band="ks1"
        message={taraMessage || `Hi ${name}! You did so well with your numbers yesterday. Today let's try some counting puzzles. Ready?`}
        onSendMessage={onTaraSend} />

      {/* Star Collectors leaderboard */}
      <div className="p-4 rounded-[24px] bg-white" style={{ border: "2px solid rgba(245,158,11,0.1)", boxShadow: "0 4px 16px rgba(0,0,0,0.03)" }}>
        <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2" style={F}>
          <MIcon name="military_tech" filled size={18} className="text-amber-400" /> Star Collectors
        </h3>
        <div className="space-y-2">
          {[
            { rank: 1, name: "Leo the Lion", s: 12, hi: false, bg: "#bfdbfe" },
            { rank: 2, name: "You!", s: stars, hi: true, bg: "#fbcfe8" },
            { rank: 3, name: "Bella Bunny", s: 3, hi: false, bg: "#d1fae5" },
            { rank: 4, name: "Max the Dog", s: 2, hi: false, bg: "#fef3c7" },
          ].map((e) => (
            <div key={e.rank} className="flex items-center justify-between p-2.5 rounded-xl"
              style={{ background: e.hi ? "#FFF9E3" : e.rank === 1 ? "#fffbeb" : "transparent",
                border: e.hi ? "1px solid rgba(245,158,11,0.2)" : "1px solid transparent" }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black w-4" style={{ ...F, color: e.rank === 1 ? "#f59e0b" : "#94a3b8" }}>{e.rank}</span>
                <div className="w-7 h-7 rounded-full" style={{ background: e.bg }} />
                <span className="text-sm font-semibold" style={F}>{e.name}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <span className="text-sm font-bold" style={F}>{e.s}</span>
                <MIcon name="star" filled size={14} className="text-amber-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Streak */}
      <div className="p-4 rounded-[24px] bg-white" style={{ border: "2px solid rgba(245,158,11,0.1)" }}>
        <div className="flex items-center gap-2 mb-2">
          <MIcon name="local_fire_department" filled size={18} className="text-orange-400" />
          <span className="text-sm font-bold text-slate-700" style={F}>Daily Streak</span>
        </div>
        {streak > 0 ? (
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
              <MIcon key={i} name="local_fire_department" filled size={20} className="text-orange-400" />
            ))}
            <span className="text-xs font-bold text-orange-600 ml-1" style={F}>{streak} days!</span>
          </div>
        ) : (
          <p className="text-xs text-slate-400" style={F}>Start an adventure to begin your streak!</p>
        )}
      </div>

      {/* Quick quest journal */}
      <div className="p-4 rounded-[24px] text-white" style={{ background: "#5e4ab3" }}>
        <h3 className="text-base font-bold mb-1 flex items-center gap-2" style={F}>
          <MIcon name="menu_book" size={18} /> Quest Journal
        </h3>
        <p className="text-sm text-white/70" style={F}>You finished 'The Magic Spells' yesterday. Great job!</p>
      </div>
    </>
  );

  return (
    <DashboardShell band="ks1" scholarName={name} activeTab={activeTab} onTabChange={setActiveTab}
      onSignOut={onSignOut} onStartQuest={() => onStartQuest?.("mathematics")}
      mainContent={mainContent} rightSidebar={rightSidebar}
      topBarLeft={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200/50">
            <MIcon name="star" filled size={16} className="text-amber-400" />
            <span className="text-sm font-bold text-amber-700" style={F}>{stars} Stars</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200/50">
              <MIcon name="local_fire_department" filled size={14} className="text-orange-400" />
              <span className="text-sm font-bold text-orange-700" style={F}>{streak}d</span>
            </div>
          )}
        </div>
      }
      topBarRight={
        <button className="text-amber-600/50 hover:text-amber-600 transition-colors p-1">
          <MIcon name="notifications" size={20} />
        </button>
      }
    />
  );
}