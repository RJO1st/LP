"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import dynamic from "next/dynamic";
import {
  BADGES, TIER_COLORS, AVATAR_ITEMS, RARITY_COLORS,
  CURRICULA, getSubjectsForCurriculum,
  getLevelInfo, sounds, ensureQuestsAssigned,
  formatGradeLabel, SUBJECT_ICONS, SUBJECT_COLORS
} from "../../../lib/gamificationEngine";
import { EXAM_MODES } from "../../../lib/examModes";
import SkillHeatmap  from "../../../components/parent/SkillHeatmap";
import ProgressChart from "../../../components/game/ProgressChart";
import QuestPanel from "../../../components/QuestPanel";
import { getTrialStatus } from "../../../lib/trialTracking";

// ── Tier 1 components ─────────────────────────────────────────────
import SubjectInsightCard                   from "../../../components/SubjectInsightCard";
import StreakCountdown, { fetchStreakData }  from "../../../components/StreakCountdown";
import WeeklyMissionPlan, { fetchWeeklyStats } from "../../../components/WeeklyMissionPlan";

// Route seamlessly to the correct engine via the Orchestrator
const QuestOrchestrator = dynamic(
  () => import("../../../components/game/QuestOrchestrator"),
  { loading: () => <LoadingScreen message="Loading LaunchPad Environment…" /> }
);

const MockTestHub = dynamic(
  () => import("../../../components/MockTestHub"),
  { loading: () => <LoadingScreen message="Loading Test Centre…" /> }
);

// ── Weekly test flow ───────────────────────────────────────────────
import {
  WeeklyChallengeBanner,
  MissionDebrief,
  getWeeklyTestConfig,
  isTestEligible,
  getQuestsThisWeek,
  hasCompletedWeeklyTest,
  markWeeklyTestDone,
  MIN_YEAR_FOR_TESTS,
} from "../../../components/WeeklyTestFlow";

const PaperEngine = dynamic(
  () => import("../../../components/game/PaperEngine"),
  { loading: () => <LoadingScreen message="Preparing your assessment…" /> }
);

const NebulaTrials = dynamic(
  () => import("../../../components/game/TimesTablesArena"),
  { loading: () => <LoadingScreen message="Setting up the Arena…" /> }
);

// ─── ICONS ────────────────────────────────────────────────────────
const Icon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);
const RocketIcon   = ({ size = 20 }) => <Icon size={size} d={["M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z","m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z","M9 12H4s.5-1 1-4c1.5 0 3 .5 3 .5L9 12Z","M12 15v5s1 .5 4 1c0-1.5-.5-3-.5-3L12 15Z"]} />;
const StarFull     = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const FlameIcon    = ({ size = 20 }) => <Icon size={size} d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />;
const ShieldIcon   = ({ size = 20 }) => <Icon size={size} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const TrophyIcon   = ({ size = 20 }) => <Icon size={size} d={["M6 9H4.5a2.5 2.5 0 0 1 0-5H6","M18 9h1.5a2.5 2.5 0 0 0 0-5H18","M4 22h16","M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22","M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22","M18 2H6v7a6 6 0 0 0 12 0V2z"]} />;
const CheckIcon    = ({ size = 20 }) => <Icon size={size} d="M20 6 9 17l-5-5" />;
const XIcon        = ({ size = 20 }) => <Icon size={size} d="M18 6 6 18M6 6l12 12" />;
const SoundOnIcon  = ({ size = 20 }) => <Icon size={size} d={["M11 5 6 9H2v6h4l5 4V5z","M19.07 4.93a10 10 0 0 1 0 14.14","M15.54 8.46a5 5 0 0 1 0 7.07"]} />;
const SoundOffIcon = ({ size = 20 }) => <Icon size={size} d={["M11 5 6 9H2v6h4l5 4V5z","M23 9l-6 6","M17 9l6 6"]} />;
const CoinIcon     = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500">
    <circle cx="12" cy="12" r="10"/>
    <text x="12" y="16" textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">$</text>
  </svg>
);

// ─── LOADING SCREEN ───────────────────────────────────────────────
function LoadingScreen({ message = "Loading…" }) {
  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img src="/logo.svg" alt="" width={28} height={28} style={{ objectFit: "contain" }} />
        </div>
      </div>
      <p className="text-slate-400 font-bold mt-4 text-sm uppercase tracking-widest">{message}</p>
    </div>
  );
}

// ─── BADGE UNLOCK TOAST ───────────────────────────────────────────
function BadgeToast({ badges, onDone }) {
  const [idx, setIdx] = useState(0);
  const badge = badges[idx];
  if (!badge) return null;
  const tierStyle = TIER_COLORS[badge.tier] || TIER_COLORS.bronze;
  return (
    <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-right">
      <div className={`${tierStyle.bg} ${tierStyle.border} border-2 rounded-2xl p-4 shadow-2xl max-w-xs`}>
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Badge Unlocked!</p>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{badge.icon}</span>
          <div>
            <p className={`font-black text-lg ${tierStyle.text}`}>{badge.name}</p>
            <p className="text-xs text-slate-500">+{badge.xp} XP · +{badge.coins} coins</p>
          </div>
        </div>
        <button
          onClick={() => idx + 1 < badges.length ? setIdx(idx + 1) : onDone()}
          className="mt-3 w-full bg-slate-900 text-white text-xs font-black py-2 rounded-xl"
        >
          {idx + 1 < badges.length ? `Next Badge (${idx + 2}/${badges.length})` : "Awesome!"}
        </button>
      </div>
    </div>
  );
}

// ─── QUEST COMPLETE TOAST ─────────────────────────────────────────
function QuestToast({ quest, onDone }) {
  if (!quest) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top">
      <div className="bg-indigo-600 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3 max-w-sm">
        <TrophyIcon size={32} />
        <div>
          <p className="text-xs font-black uppercase tracking-widest opacity-80">Quest Complete!</p>
          <p className="font-black">{quest.title}</p>
          <p className="text-xs opacity-80">+{quest.xp} XP · +{quest.coins} coins</p>
        </div>
        <button onClick={onDone} className="ml-auto opacity-60 hover:opacity-100">
          <XIcon size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── AVATAR DISPLAY ───────────────────────────────────────────────
function AvatarDisplay({ avatar, size = "md", onClick }) {
  const sizeCfg = {
    sm: { cls: "w-10 h-10",         emoji: "text-2xl",  hat: "text-sm",   pet: "text-xs"   },
    md: { cls: "w-16 h-16",         emoji: "text-4xl",  hat: "text-base", pet: "text-sm"   },
    lg: { cls: "w-24 h-24",         emoji: "text-5xl",  hat: "text-xl",   pet: "text-base" },
    xl: { cls: "w-[88px] h-[88px]", emoji: "text-[52px]", hat: "text-2xl", pet: "text-lg"  },
  }[size] || { cls: "w-16 h-16", emoji: "text-4xl", hat: "text-base", pet: "text-sm" };
  const bgMap = {
    "🌌": "from-indigo-900 to-purple-900",
    "🪐": "from-blue-800 to-slate-900",
    "🔥": "from-orange-800 to-red-900",
  };
  const bg = bgMap[avatar?.background] || "from-indigo-700 to-violet-800";
  return (
    <button
      onClick={onClick}
      className={`${sizeCfg.cls} rounded-full bg-gradient-to-br ${bg} flex items-center
                  justify-center relative shadow-xl border-[3px] border-white/30
                  hover:scale-105 transition-transform`}
    >
      <span className={sizeCfg.emoji} style={{ lineHeight: 1 }}>
        {avatar?.base === "astronaut" ? "👨‍🚀" : "🚀"}
      </span>
      {avatar?.hat && (
        <span className={`absolute -top-1.5 -right-1.5 ${sizeCfg.hat}`}>{AVATAR_ITEMS[avatar.hat]?.icon}</span>
      )}
      {avatar?.pet && (
        <span className={`absolute -bottom-1 -right-1 ${sizeCfg.pet}`}>{AVATAR_ITEMS[avatar.pet]?.icon}</span>
      )}
    </button>
  );
}

// ─── CERTIFICATES PANEL ───────────────────────────────────────────
const STAGE_META = {
  developing: { label: "Building",  emoji: "🌱", stars: 1, color: "#0891b2", bg: "#ecfeff",  border: "#a5f3fc" },
  expected:   { label: "On Track",  emoji: "⭐", stars: 2, color: "#7c3aed", bg: "#f5f3ff",  border: "#ddd6fe" },
  exceeding:  { label: "Stellar",   emoji: "🏆", stars: 3, color: "#d97706", bg: "#fffbeb",  border: "#fde68a" },
};

function CertificateCard({ record, scholarName, onView }) {
  const stage = STAGE_META[record.current_tier] || STAGE_META.exceeding;
  const subjIcon = SUBJECT_ICONS[record.subject] ?? "📚";
  const topicLabel = record.topic
    ? record.topic.replace(/_/g, " ").replace(/\w/g, c => c.toUpperCase())
    : record.subject;
  const dateStr = record.updated_at
    ? new Date(record.updated_at).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })
    : "";
  const pct = Math.round((record.mastery_score ?? 0) * 100);

  return (
    <div
      onClick={() => onView(record)}
      style={{ background: stage.bg, borderColor: stage.border }}
      className="border-2 rounded-xl p-3 cursor-pointer hover:scale-[1.02] active:scale-[0.98]
                 transition-all flex flex-col gap-2 relative overflow-hidden"
    >
      {/* Stage badge top-right */}
      <div className="absolute top-2 right-2 flex gap-0.5">
        {Array.from({ length: 3 }, (_, i) => (
          <svg key={i} width="10" height="10" viewBox="0 0 10 10">
            <path d="M5 1 L6.2 3.7 L9.5 4 L7.2 6.1 L7.9 9.5 L5 7.9 L2.1 9.5 L2.8 6.1 L0.5 4 L3.8 3.7 Z"
              fill={i < stage.stars ? stage.color : "#e2e8f0"}/>
          </svg>
        ))}
      </div>
      {/* Subject icon + topic */}
      <div className="flex items-start gap-2 pr-8">
        <span className="text-2xl shrink-0">{subjIcon}</span>
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-800 leading-tight truncate">{topicLabel}</p>
          <p className="text-[10px] font-bold capitalize" style={{ color: stage.color }}>
            {stage.emoji} {stage.label}
          </p>
        </div>
      </div>
      {/* Mastery bar */}
      <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: stage.color }}/>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold text-slate-500">{pct}% mastery</span>
        <span className="text-[9px] font-semibold text-slate-400">{dateStr}</span>
      </div>
    </div>
  );
}

function CertificatesPanel({ records, scholarName, subjects }) {
  const [filter,   setFilter]   = React.useState("all");
  const [viewing,  setViewing]  = React.useState(null);
  const [LazyMC,   setLazyMC]   = React.useState(null);

  // Lazy-load MasteryCertificate only when needed
  const handleView = React.useCallback(async (record) => {
    if (!LazyMC) {
      const mod = await import("../../../components/game/MasteryCertificate");
      setLazyMC(() => mod.default);
    }
    setViewing(record);
  }, [LazyMC]);

  const filtered = filter === "all"
    ? records
    : records.filter(r => r.current_tier === filter);

  const totalByTier = {
    developing: records.filter(r => r.current_tier === "developing").length,
    expected:   records.filter(r => r.current_tier === "expected").length,
    exceeding:  records.filter(r => r.current_tier === "exceeding").length,
  };

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-2 py-6">
        <span className="text-3xl">📜</span>
        <p className="text-slate-500 text-sm font-bold">No certificates yet</p>
        <p className="text-slate-400 text-xs">Complete missions to earn mastery certificates!</p>
      </div>
    );
  }

  return (
    <>
      {/* Overlay cert viewer */}
      {viewing && LazyMC && (
        <LazyMC
          scholarName={scholarName}
          subject={viewing.subject}
          topic={(viewing.topic || viewing.subject).replace(/_/g," ").replace(/\w/g,c=>c.toUpperCase())}
          masteryTier={viewing.current_tier}
          masteryScore={viewing.mastery_score ?? 0}
          accuracy={Math.round((viewing.mastery_score ?? 0) * 100)}
          xpEarned={0}
          date={viewing.updated_at ? new Date(viewing.updated_at) : new Date()}
          onClose={() => setViewing(null)}
        />
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {[
          { key:"all",        label:`All (${records.length})`,                  color:"#4f46e5" },
          { key:"exceeding",  label:`🏆 Stellar (${totalByTier.exceeding})`,   color:"#d97706" },
          { key:"expected",   label:`⭐ On Track (${totalByTier.expected})`,   color:"#7c3aed" },
          { key:"developing", label:`🌱 Building (${totalByTier.developing})`, color:"#0891b2" },
        ].map(({ key, label, color }) => (
          <button key={key} onClick={() => setFilter(key)}
            className="text-[10px] font-black px-2.5 py-1 rounded-lg transition-all"
            style={{
              background: filter === key ? color : "#f1f5f9",
              color:      filter === key ? "white" : "#64748b",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Grid of certificates */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-0.5">
        {filtered.map((r, i) => (
          <CertificateCard key={i} record={r} scholarName={scholarName} onView={handleView} />
        ))}
      </div>
    </>
  );
}

// ─── AVATAR SHOP MODAL ────────────────────────────────────────────
function AvatarShop({ scholar, earnedBadgeIds, onClose, onPurchase }) {
  const [tab, setTab] = useState("hat");
  const tabs  = ["hat", "accessory", "pet", "background"];
  const items = Object.entries(AVATAR_ITEMS).filter(([, v]) => v.category === tab);

  const canAfford  = (item) => !item.badgeRequired
    ? (scholar.coins || 0) >= item.coinCost
    : earnedBadgeIds.includes(item.badgeRequired);

  const isUnlocked = (itemId) => {
    const av = scholar.avatar || {};
    return av.hat === itemId || av.pet === itemId ||
           av.accessory === itemId || av.background === itemId;
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[8000] flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-[32px] p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-black">Avatar Shop</h2>
          <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
            <CoinIcon size={16} />
            <span className="font-black text-yellow-700">{scholar.coins || 0}</span>
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-black rounded-xl capitalize
                ${tab === t ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {items.map(([id, item]) => {
            const unlocked   = isUnlocked(id);
            const affordable = canAfford(item);
            return (
              <button key={id}
                onClick={() => affordable && !unlocked && onPurchase(id, item)}
                className={`p-3 rounded-2xl border-2 text-center transition-all ${
                  unlocked   ? "border-indigo-400 bg-indigo-50" :
                  affordable ? "border-slate-200 hover:border-indigo-300 hover:bg-slate-50" :
                               "border-slate-100 opacity-50 cursor-not-allowed"
                }`}>
                <div className="text-3xl mb-1">{item.icon}</div>
                <p className="text-xs font-black text-slate-700 truncate">{item.name}</p>
                <p className={`text-xs font-bold ${RARITY_COLORS[item.rarity]}`}>{item.rarity}</p>
                {unlocked ? (
                  <p className="text-xs text-indigo-600 font-black">Equipped</p>
                ) : item.badgeRequired ? (
                  <p className="text-xs text-slate-400">🏆 {BADGES[item.badgeRequired]?.name}</p>
                ) : (
                  <p className="text-xs text-yellow-600 font-black">{item.coinCost} coins</p>
                )}
              </button>
            );
          })}
        </div>
        <button onClick={onClose}
          className="mt-4 w-full bg-slate-900 text-white font-black py-3 rounded-2xl">
          Done
        </button>
      </div>
    </div>
  );
}

// ─── LEVEL PROGRESS BAR ───────────────────────────────────────────
function LevelBar({ totalXp }) {
  const { current, next, progressPct } = getLevelInfo(totalXp || 0);
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-black text-white/80 uppercase tracking-wider">
          {current.title}
        </span>
        {next && <span className="text-xs text-white/60 font-bold">→ {next.title}</span>}
      </div>
      <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-white/60 font-bold">Lv {current.level}</span>
        <span className="text-[10px] text-white/60 font-bold">{progressPct}%</span>
      </div>
    </div>
  );
}

// ─── LEADERBOARD ──────────────────────────────────────────────────
function Leaderboard({ entries, currentScholarId }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-400 italic">Be first on the board!</p>;
  }
  return (
    <div className="space-y-2">
      {entries.map((entry, i) => {
        const isMe   = entry.id === currentScholarId;
        const medal  = ["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`;
        return (
          <div key={entry.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
              isMe
                ? "bg-indigo-50 border-2 border-indigo-200"
                : "bg-slate-50 border-2 border-transparent"
            }`}>
            <span className="text-lg w-8 text-center">{medal}</span>
            <AvatarDisplay avatar={entry.avatar} size="sm" />
            <div className="flex-1 min-w-0">
              <p className={`font-black text-sm truncate ${isMe ? "text-indigo-700" : "text-slate-700"}`}>
                {entry.codename || entry.name}{isMe ? " (You)" : ""}
              </p>
              <p className="text-xs text-slate-400 font-bold">{entry.personal_best || 0}% best</p>
            </div>
            <p className={`font-black text-sm ${isMe ? "text-indigo-600" : "text-slate-700"}`}>
              {entry.total_xp} XP
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── HERO AVATAR ──────────────────────────────────────────────────
// Large illustrated character for hero card — all accessories layered
const BG_GRADIENTS_MAP = {
  planet:  "from-blue-900 via-slate-800 to-blue-950",
  galaxy:  "from-indigo-900 via-purple-900 to-slate-900",
  sunset:  "from-orange-700 via-rose-800 to-purple-900",
  ocean:   "from-blue-800 via-cyan-900 to-slate-900",
};
function HeroAvatar({ avatar, onClick }) {
  // Background gradient from avatar.background icon key or default
  const bgKey = avatar?.background === "🪐" ? "planet"
              : avatar?.background === "🌌" ? "galaxy"
              : avatar?.background === "🌅" ? "sunset"
              : avatar?.background === "🌊" ? "ocean"
              : null;
  const bg  = bgKey ? BG_GRADIENTS_MAP[bgKey] : "from-indigo-700 via-violet-800 to-indigo-900";
  const baseEmoji = avatar?.base === "astronaut" ? "👨‍🚀" : "🚀";
  const hat = avatar?.hat       ? AVATAR_ITEMS[avatar.hat]       : null;
  const acc = avatar?.accessory ? AVATAR_ITEMS[avatar.accessory] : null;
  const pet = avatar?.pet       ? AVATAR_ITEMS[avatar.pet]       : null;

  return (
    <button
      onClick={onClick}
      className={`w-[100px] h-[100px] rounded-full bg-gradient-to-br ${bg}
                  flex items-center justify-center relative overflow-visible
                  shadow-2xl border-[3px] border-white/25
                  hover:scale-105 transition-transform select-none`}
    >
      {/* Accessory aura (behind) */}
      {acc && (
        <span className="absolute inset-0 flex items-center justify-center text-4xl opacity-60 pointer-events-none select-none">
          {acc.icon}
        </span>
      )}
      {/* Base character — large */}
      <span className="text-[58px] leading-none z-10 select-none"
        style={{ filter: "drop-shadow(0 3px 10px rgba(0,0,0,0.5))" }}>
        {baseEmoji}
      </span>
      {/* Hat overlay top-right */}
      {hat && (
        <span className="absolute -top-3 -right-2 text-[28px] z-20 select-none"
          style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }}>
          {hat.icon}
        </span>
      )}
      {/* Pet bottom-right */}
      {pet && (
        <span className="absolute -bottom-2 -right-3 text-2xl z-20 select-none"
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}>
          {pet.icon}
        </span>
      )}
    </button>
  );
}

// ─── STREAK TIMER DISPLAY ─────────────────────────────────────────
// Standalone countdown showing HH:MM:SS until midnight
function StreakTimerDisplay({ lastActivityAt }) {
  const [timeLeft, setTimeLeft] = React.useState("");
  React.useEffect(() => {
    function calc() {
      const now  = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      let secs = Math.max(0, Math.floor((midnight - now) / 1000));
      const h = String(Math.floor(secs / 3600)).padStart(2, "0");
      const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
      const s = String(secs % 60).padStart(2, "0");
      setTimeLeft(`${h}:${m}:${s}`);
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-2xl font-black tabular-nums tracking-tight text-slate-800 leading-none">
      {timeLeft}
    </span>
  );
}

// ─── BADGE GRID ───────────────────────────────────────────────────
function BadgeGrid({ earnedIds }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(BADGES).map(([id, b]) => {
        const earned    = earnedIds.includes(id);
        const tierStyle = TIER_COLORS[b.tier];
        return (
          <div key={id} title={`${b.name}${earned ? " ✓" : " (locked)"}`}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl border-2 transition-all ${
              earned
                ? `${tierStyle.bg} ${tierStyle.border} shadow-md scale-105`
                : "bg-slate-100 border-slate-200 grayscale opacity-40"
            }`}>
            {b.icon}
          </div>
        );
      })}
    </div>
  );
}

// ─── SUBJECT CARD ─────────────────────────────────────────────────
function SubjectCard({ subjectId, onClick, proficiency = 0 }) {
  const colors = SUBJECT_COLORS[subjectId] || SUBJECT_COLORS.maths;
  const icon = SUBJECT_ICONS[subjectId] || "📚";
  
  return (
    <button onClick={onClick}
      className={`group relative ${colors.bg} p-6 rounded-[28px] border-2 ${colors.border} text-left
                  hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden`}>
      {proficiency > 0 && (
        <div className="absolute top-3 right-3">
          <div className="relative w-8 h-8">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="13" fill="none" stroke="#e2e8f0" strokeWidth="3"/>
              <circle cx="16" cy="16" r="13" fill="none" stroke="#6366f1" strokeWidth="3"
                strokeDasharray={`${proficiency * 0.817} 100`} strokeLinecap="round"/>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-indigo-600">
              {proficiency}%
            </span>
          </div>
        </div>
      )}
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className={`text-lg font-black ${colors.text} capitalize`}>{subjectId}</h3>
      <p className="text-xs text-slate-600 font-bold mt-1">Start Mission →</p>
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════════
export default function StudentDashboard() {
  const router   = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [scholar,          setScholar]          = useState(null);
  const [activeSubject,    setActiveSubject]    = useState(null);
  const [showNebulaTrials,   setShowNebulaTrials]   = useState(false);
  const [view,             setView]             = useState("dashboard"); // "dashboard" | "tests" | "weekly_test" | "debrief"
  const [prevQuestionIds,  setPrevQuestionIds]  = useState([]);
  const [weeklyTestConfig, setWeeklyTestConfig] = useState(null);
  const [weeklyTestResult, setWeeklyTestResult] = useState(null);
  const [weeklyTestQs,     setWeeklyTestQs]     = useState([]);
  const [fullSkills,       setFullSkills]       = useState([]);
  const [chartData,        setChartData]        = useState([]);
  const [showProgress,     setShowProgress]     = useState(false);

  // Gamification state
  const [earnedBadges,     setEarnedBadges]     = useState([]);
  const [newBadges,        setNewBadges]        = useState([]);
  const [activeQuests,     setActiveQuests]     = useState([]);
  const [newQuestComplete, setNewQuestComplete] = useState(null);
  const [leaderboard,      setLeaderboard]      = useState([]);
  const [masteryRecords,   setMasteryRecords]   = useState([]);   // for certificates
  const [skillProficiency, setSkillProficiency] = useState({});
  const [recentQuizzes,    setRecentQuizzes]    = useState([]);
  const [showAvatarShop,   setShowAvatarShop]   = useState(false);
  const [soundOn,          setSoundOn]          = useState(true);
  const [lbMode,           setLbMode]           = useState("year");
  const [trialInfo,        setTrialInfo]        = useState(null);
  const [parentInfo,       setParentInfo]       = useState(null);

  // ── Tier 1 state ──────────────────────────────────────────────────
  const [weeklyStats,   setWeeklyStats]   = useState([]);
  const [lastWeekStats, setLastWeekStats] = useState([]);
  const [streakData,    setStreakData]    = useState({ streak: 0, lastActivityAt: null });

  // ── Boot: load scholar from localStorage ─────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("active_scholar");
    if (saved) {
      const scholar = JSON.parse(saved);
      console.log("✅ Loaded:", scholar.name, "curriculum:", scholar.curriculum, "exam_mode:", scholar.exam_mode ?? "none");
      setScholar(scholar);
      if (scholar.parent_id) {
        loadTrialStatus(scholar.parent_id);
      }
    } else {
      router.push("/");
    }
  }, [router]);

  // ── Load trial status ────────────────────────────────────────────
  const loadTrialStatus = useCallback(async (parentId) => {
    try {
      const { data: parentData } = await supabase
        .from('parents')
        .select('*')
        .eq('id', parentId)
        .single();

      if (parentData) {
        setParentInfo(parentData);
        const status = await getTrialStatus(parentId);
        setTrialInfo(status);
        if (status.status === 'expired') {
          router.push('/subscribe?expired=true');
        }
      }
    } catch (error) {
      console.error('Error loading trial status:', error);
    }
  }, [supabase, router]);

  // ── Data loaders ─────────────────────────────────────────────────
  const refreshHistory = useCallback(async (id) => {
    const { data } = await supabase
      .from("scholar_question_history")
      .select("question_id")
      .eq("scholar_id", id);
    if (data) setPrevQuestionIds(data.map(h => h.question_id));
  }, [supabase]);

  const loadMasteryRecords = useCallback(async (id) => {
    const { data } = await supabase
      .from("scholar_topic_mastery")
      .select("subject, topic, mastery_score, current_tier, updated_at")
      .eq("scholar_id", id)
      .in("current_tier", ["developing", "expected", "exceeding"])
      .order("updated_at", { ascending: false });
    if (data) setMasteryRecords(data);
  }, [supabase]);

  const loadLeaderboard = useCallback(async (yearLevel, curriculum) => {
    const { data } = await supabase
      .from("scholars")
      .select("id, codename, total_xp, personal_best, avatar")
      .eq("year_level", yearLevel)
      .eq("curriculum", curriculum)
      .order("total_xp", { ascending: false })
      .limit(10);
    if (data) setLeaderboard(data);
  }, [supabase]);

  const loadBadges = useCallback(async (id) => {
    const { data } = await supabase
      .from("scholar_badges")
      .select("badge_id")
      .eq("scholar_id", id);
    if (data) setEarnedBadges(data.map(b => b.badge_id));
  }, [supabase]);

  const loadQuests = useCallback(async (id) => {
    const { data } = await supabase
      .from("scholar_quests")
      .select("*, quest_templates(*)")
      .eq("scholar_id", id)
      .gt("expires_at", new Date().toISOString())
      .order("completed")
      .limit(6);
    if (data) setActiveQuests(data);
  }, [supabase]);

  const loadSkills = useCallback(async (id) => {
    const { data } = await supabase
      .from("scholar_skills")
      .select("subject, proficiency")
      .eq("scholar_id", id);
    if (data) {
      const map = {};
      data.forEach(s => { map[s.subject] = Math.round(s.proficiency); });
      setSkillProficiency(map);
    }
  }, [supabase]);

  const loadFullSkills = useCallback(async (id, curriculum) => {
    const res = await fetch(`/api/parent/skills?scholar_id=${id}&curriculum=${curriculum}`);
    if (res.ok) setFullSkills(await res.json());
  }, []);

  const loadAccuracyData = useCallback(async (id, curriculum) => {
    const res = await fetch(
      `/api/parent/accuracy?scholar_id=${id}&period=month&curriculum=${curriculum}`
    );
    if (res.ok) setChartData(await res.json());
  }, []);

  const loadRecentQuizzes = useCallback(async (id) => {
    const { data } = await supabase
      .from("quiz_results")
      .select("subject, score, total_questions, completed_at")
      .eq("scholar_id", id)
      .order("completed_at", { ascending: false })
      .limit(5);
    if (data) {
      setRecentQuizzes(data.map(q => ({
        subject: q.subject,
        score:   q.score,
        total:   q.total_questions,
        pct:     Math.round((q.score / q.total_questions) * 100),
        date:    new Date(q.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      })));
    }
  }, [supabase]);

  // ── Tier 1: fetch weekly stats + streak ───────────────────────────
  const refreshTier1 = useCallback(async (id) => {
    const [weekly, streak] = await Promise.all([
      fetchWeeklyStats(supabase, id),
      fetchStreakData(supabase, id),
    ]);
    setWeeklyStats(weekly);
    setStreakData(streak);

    // Last week (days 7–14 ago) for week-on-week comparison in SubjectInsightCard
    const twoAgo = new Date(); twoAgo.setDate(twoAgo.getDate() - 14);
    const oneAgo = new Date(); oneAgo.setDate(oneAgo.getDate() - 7);
    const { data: lw } = await supabase
      .from("quiz_results")
      .select("subject, questions_correct, questions_total")
      .eq("scholar_id", id)
      .gte("completed_at", twoAgo.toISOString())
      .lt("completed_at",  oneAgo.toISOString());
    if (lw) {
      const agg = {};
      lw.forEach(({ subject, questions_correct, questions_total }) => {
        if (!agg[subject]) agg[subject] = { subject, questions_correct: 0, questions_total: 0 };
        agg[subject].questions_correct += questions_correct || 0;
        agg[subject].questions_total   += questions_total   || 0;
      });
      setLastWeekStats(Object.values(agg));
    }
  }, [supabase]);

  // ── Data effect ──────────────────────────────────────────────────
  useEffect(() => {
    if (!scholar?.id) return;
    const { id, curriculum } = scholar;
    const yearLevel = scholar.year_level ?? scholar.year ?? 5;
    
    console.log('🎯 Loading data for:', curriculum, 'Year', yearLevel);

    Promise.all([
      refreshHistory(id),
      loadBadges(id),
      loadMasteryRecords(id),
      loadQuests(id),
      loadLeaderboard(yearLevel, curriculum),
      loadSkills(id),
      loadRecentQuizzes(id),
      loadFullSkills(id, curriculum),
      loadAccuracyData(id, curriculum),
      ensureQuestsAssigned(id),
      refreshTier1(id),          // ← Tier 1
    ]);
  }, [
    scholar?.id,
    scholar?.curriculum,
    scholar?.year_level ?? scholar?.year,
    refreshHistory,
    loadBadges,
    loadQuests,
    loadLeaderboard,
    loadSkills,
    loadRecentQuizzes,
    loadFullSkills,
    loadAccuracyData,
    refreshTier1,                // ← Tier 1
  ]);

  // ── After quiz completes ─────────────────────────────────────────
  const handleQuestComplete = useCallback(async (payload) => {
    // DO NOT call setActiveSubject(null) here — that unmounts QuestOrchestrator
    // before EngineFinished can render. The scholar closes via onClose.
    if (!scholar?.id) return;

    await Promise.all([
      refreshHistory(scholar.id),
      loadRecentQuizzes(scholar.id),
      loadQuests(scholar.id),
    ]);

    // check_and_award_badges — non-fatal, skip gracefully if RPC doesn't exist
    try {
      const { data: newBadgeData, error: badgeErr } = await supabase.rpc("check_and_award_badges", {
        p_scholar_id: scholar.id,
      });
      if (!badgeErr && newBadgeData?.length) {
        const details = newBadgeData
          .map(b => ({ ...BADGES[b.badge_id], xp: b.xp_reward, coins: b.coin_reward }))
          .filter(Boolean);
        setNewBadges(details);
        sounds.badgeEarned();
        loadBadges(scholar.id);
      }
    } catch (e) {
      // Badge RPC not yet deployed — skip silently
    }

    const { data: fresh } = await supabase
      .from("scholars")
      .select("*")
      .eq("id", scholar.id)
      .single();

    if (fresh) {
      setScholar(fresh);
      localStorage.setItem("active_scholar", JSON.stringify(fresh));
    }

    // ← Tier 1: refresh insight + streak after each completed mission
    await refreshTier1(scholar.id);
  }, [scholar, supabase, refreshHistory, loadRecentQuizzes, loadQuests, loadBadges, refreshTier1]);

  // ── Launch weekly challenge ──────────────────────────────────────
  const handleWeeklyChallengeStart = useCallback(async () => {
    if (!scholar) return;
    const config = getWeeklyTestConfig(scholar, weeklyStats);
    setWeeklyTestConfig(config);

    // Fetch questions for this test
    try {
      const curriculum = config.curriculum ?? scholar.curriculum ?? "uk_national";
      const year       = parseInt(scholar.year_level ?? scholar.year ?? 1, 10);
      const { data } = await supabase
        .from("question_bank")
        .select("id, question_text, options, correct_index, explanation, passage, subject, topic")
        .eq("curriculum", curriculum)
        .eq("subject", config.subject)
        .eq("year_level", year)
        .limit(80);

      const questions = (data ?? [])
        .sort(() => Math.random() - 0.5)
        .slice(0, 20)
        .map(r => ({
          ...r,
          q:   r.question_text,
          opts: Array.isArray(r.options) ? r.options : JSON.parse(r.options ?? "[]"),
          a:   r.correct_index,
          exp: r.explanation ?? "",
        }));

      setWeeklyTestQs(questions);
      setView("weekly_test");
    } catch (err) {
      console.error("[WeeklyTest] Failed to load questions:", err);
    }
  }, [scholar, supabase, weeklyStats]);

  // ── Weekly test complete ─────────────────────────────────────────
  const handleWeeklyTestComplete = useCallback((result) => {
    setWeeklyTestResult({ ...result, subject: weeklyTestConfig?.subject ?? "maths" });
    setView("debrief");
  }, [weeklyTestConfig]);

  // ── Avatar purchase ──────────────────────────────────────────────
  const handleAvatarPurchase = async (itemId, item) => {
    if (!scholar) return;
    const avatar = { ...(scholar.avatar || {}), [item.category]: itemId };
    const coins  = (scholar.coins || 0) - (item.coinCost || 0);
    if (coins < 0) return;

    await supabase.from("scholars").update({ avatar, coins }).eq("id", scholar.id);
    const updated = { ...scholar, avatar, coins };
    setScholar(updated);
    localStorage.setItem("active_scholar", JSON.stringify(updated));
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sounds.toggle(next);
  };

  const handleSignOut = () => {
    localStorage.removeItem("active_scholar");
    router.push("/");
  };

  // ── Guards ───────────────────────────────────────────────────────
  if (!scholar) return <LoadingScreen />;

  const curriculum   = scholar.curriculum ?? "uk_national";
  const currDef      = CURRICULA[curriculum] ?? CURRICULA["uk_national"];
  const examModeDef  = EXAM_MODES[scholar.exam_mode] ?? null;
  const examYear     = Number(scholar.year_level || scholar.year || 1);
  const examExtras   = examModeDef?.eligibleYears.includes(examYear) ? (examModeDef.extraSubjects ?? []) : [];
  const subjects     = [...new Set([...getSubjectsForCurriculum(curriculum), ...examExtras])];
  const levelInfo    = getLevelInfo(scholar.total_xp || 0);

  // ── Test Centre ──────────────────────────────────────────────────
  if (view === "tests") {
    return (
      <MockTestHub
        scholar={scholar}
        supabase={supabase}
        onBack={() => setView("dashboard")}
      />
    );
  }

  // ── Weekly challenge test ────────────────────────────────────────
  if (view === "weekly_test" && weeklyTestConfig) {
    return (
      <PaperEngine
        testConfig={weeklyTestConfig}
        questions={weeklyTestQs}
        onClose={() => setView("dashboard")}
        onComplete={handleWeeklyTestComplete}
      />
    );
  }

  // ── Mission debrief ──────────────────────────────────────────────
  if (view === "debrief" && weeklyTestResult) {
    return (
      <MissionDebrief
        scholar={scholar}
        testResult={weeklyTestResult}
        weeklyStats={weeklyStats}
        onDone={() => {
          markWeeklyTestDone(scholar?.id);
          setView("dashboard");
          setWeeklyTestResult(null);
          setWeeklyTestConfig(null);
          setWeeklyTestQs([]);
          // Refresh stats so banner disappears
          refreshTier1(scholar.id);
        }}
      />
    );
  }

  // ── Nebula Trials ───────────────────────────────────────────
  if (showNebulaTrials) {
    return (
      <NebulaTrials
        student={scholar}
        onClose={() => setShowNebulaTrials(false)}
        onXPEarned={async (xp) => {
          // Award XP to scholar (reuse existing mastery update flow)
          if (scholar?.id && xp > 0) {
            await supabase.from("scholar_skill_levels").upsert({
              scholar_id: scholar.id,
              subject:    "maths",
              skill:      "times_tables",
              xp_total:   xp,
            }, { onConflict: "scholar_id,subject,skill", ignoreDuplicates: false });
          }
        }}
      />
    );
  }

  // ── Active quiz (Routed via QuestOrchestrator) ───────────────────
  if (activeSubject) {
    return (
      <QuestOrchestrator
        student={scholar}
        subject={activeSubject}
        curriculum={curriculum}
        onClose={() => setActiveSubject(null)}
        onComplete={handleQuestComplete}
        questionCount={10}
        previousQuestionIds={prevQuestionIds}
      />
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">

      {/* Toasts */}
      {newBadges.length > 0 && (
        <BadgeToast badges={newBadges} onDone={() => setNewBadges([])} />
      )}
      {newQuestComplete && (
        <QuestToast quest={newQuestComplete} onDone={() => setNewQuestComplete(null)} />
      )}
      {showAvatarShop && (
        <AvatarShop
          scholar={scholar}
          earnedBadgeIds={earnedBadges}
          onClose={() => setShowAvatarShop(false)}
          onPurchase={handleAvatarPurchase}
        />
      )}

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-slate-100 px-3 sm:px-5 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="LaunchPard" width={32} height={32} style={{ objectFit: "contain" }} />
          <span className="font-black text-lg text-slate-800">LaunchPard</span>
          <span className="text-xs text-slate-300 font-bold hidden sm:inline">·</span>
          <span className="text-xs text-slate-400 font-bold hidden sm:inline">
            {currDef.country} {examModeDef ? `${examModeDef.emoji} ${examModeDef.label}` : currDef.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProgress(v => !v)}
            className="hidden md:flex items-center gap-2 bg-indigo-50 text-indigo-700
                       font-bold px-4 py-2.5 rounded-2xl hover:bg-indigo-100 transition-colors"
          >
            <span className="text-sm">{showProgress ? "Hide Progress" : "Show Progress"}</span>
          </button>

          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-200">
            <CoinIcon size={16} />
            <span className="font-black text-yellow-700 text-sm">{scholar.coins || 0}</span>
          </div>
          <button
            onClick={() => setShowAvatarShop(true)}
            className="flex items-center gap-2 bg-purple-50 text-purple-700 font-bold px-3 py-2 rounded-xl hover:bg-purple-100 transition-colors"
            title="Customize Avatar"
          >
            <span className="text-lg">👤</span>
            <span className="hidden md:inline text-xs">Avatar</span>
          </button>
          <button
            onClick={handleSignOut}
            className="text-xs text-slate-400 hover:text-rose-500 font-bold uppercase tracking-wider px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* ── TRIAL BANNER ────────────────────────────────────────── */}
      {trialInfo && trialInfo.status === 'trial' && (
        <div className={`
          ${trialInfo.daysLeft <= 2 
            ? 'bg-gradient-to-r from-orange-500 to-red-600' 
            : 'bg-gradient-to-r from-indigo-500 to-purple-600'
          } px-4 py-3 shadow-lg
        `}>
          <div className="max-w-[1440px] mx-auto px-3 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {trialInfo.daysLeft <= 2 ? '⚠️' : '🎉'}
              </div>
              <div className="text-white">
                <p className="font-bold text-sm">
                  {trialInfo.daysLeft <= 2 ? '⏰ Trial Ending Soon!' : '✨ Free Trial Active'}
                </p>
                <p className="text-xs opacity-90">
                  {trialInfo.message}
                </p>
              </div>
            </div>
            <a
              href="/subscribe"
              className={`
                px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all text-sm
                ${trialInfo.daysLeft <= 2
                  ? 'bg-white text-orange-600 hover:bg-orange-50 shadow-lg'
                  : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white'
                }
              `}
            >
              {trialInfo.ctaText}
            </a>
          </div>
        </div>
      )}

      <main className="max-w-[1440px] mx-auto px-3 sm:px-5 pt-6 space-y-5">

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-[28px] p-6 text-white shadow-xl relative overflow-hidden">
          {/* Star dust */}
          {["top-3 left-10", "top-8 right-24", "bottom-5 left-1/3", "top-5 right-44", "bottom-8 right-1/4"].map((pos, i) => (
            <div key={i} className={`absolute ${pos} rounded-full bg-white pointer-events-none`}
              style={{ width: 2 + (i % 2), height: 2 + (i % 2), opacity: [0.5,0.3,0.7,0.4,0.6][i] }} />
          ))}
          {/* Decorative planet blob top-right */}
          <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(167,139,250,0.35) 0%, rgba(99,102,241,0.12) 60%, transparent 80%)" }} />

          <div className="flex items-center gap-5 relative z-10">
            {/* Scholar avatar — large illustrated character with customisation ring */}
            <div className="relative shrink-0 cursor-pointer group" onClick={() => setShowAvatarShop(true)}>
              {/* Outer cyan glow ring — matches PDF design */}
              <div className="absolute -inset-[4px] rounded-full pointer-events-none"
                style={{ boxShadow: "0 0 0 3px rgba(34,211,238,0.6), 0 0 28px rgba(34,211,238,0.25)" }} />
              <HeroAvatar avatar={scholar.avatar} onClick={() => setShowAvatarShop(true)} />
              {/* Edit badge */}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-cyan-400 border-2 border-white
                              flex items-center justify-center text-xs shadow-md
                              group-hover:scale-110 transition-transform z-10" title="Customise avatar">
                ✏️
              </div>
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <p className="text-indigo-200 text-[11px] font-black uppercase tracking-widest mb-0.5">
                {levelInfo.current.title} · Lv {levelInfo.current.level}
              </p>
              <h1 className="text-2xl font-black leading-tight truncate">
                Welcome back, <span className="text-cyan-300">{scholar.name}!</span>
              </h1>
              <div className="flex flex-wrap gap-2 mt-2 mb-3">
                <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-black backdrop-blur-sm">
                  {currDef.country} {formatGradeLabel(scholar.year_level || scholar.year, curriculum)}
                </span>
                <span className="bg-amber-400 text-amber-900 px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1">
                  <StarFull size={11} /> {scholar.total_xp || 0} XP
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1
                  ${(scholar.streak || 0) > 0 ? "bg-orange-400 text-orange-900" : "bg-white/20"}`}>
                  <FlameIcon size={11} /> {scholar.streak || 0} day streak
                </span>
                {(scholar.streak_shields || 0) > 0 && (
                  <span className="bg-blue-400/80 text-blue-900 px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1">
                    <ShieldIcon size={11} /> {scholar.streak_shields} shield{scholar.streak_shields > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <LevelBar totalXp={scholar.total_xp || 0} />
            </div>
          </div>
        </div>

        {/* ── WEEKLY CHALLENGE BANNER (Y3+ only) ───────────────────────── */}
        <WeeklyChallengeBanner
          scholar={scholar}
          weeklyStats={weeklyStats}
          onStart={handleWeeklyChallengeStart}
        />

        {/* ══════════════════════════════════════════════════════════════════
            ROW 1: Quick Launch · Mission Control · Daily Streak  (3-col)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* ── QUICK LAUNCH ────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2.5">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Quick Launch</p>

            <button
              onClick={() => setShowNebulaTrials(true)}
              className="flex items-center gap-3 w-full text-left rounded-xl p-3 transition-all hover:scale-[1.01] active:scale-[0.98] group"
              style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", border: "1.5px solid rgba(99,102,241,0.5)" }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform"
                style={{ background: "rgba(99,102,241,0.3)" }}>⚡</div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm leading-tight">Nebula Trials</p>
                <p className="text-indigo-300 text-[10px] font-medium">Learn your Times Tables</p>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(129,140,248,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:translate-x-0.5 transition-transform"><polyline points="9 18 15 12 9 6"/></svg>
            </button>

            {isTestEligible(examYear) && (
              <button
                onClick={() => setView("tests")}
                className="flex items-center gap-3 w-full text-left rounded-xl p-3 transition-all hover:scale-[1.01] active:scale-[0.98] group"
                style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", border: "1.5px solid rgba(99,102,241,0.3)" }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:scale-110 transition-transform"
                  style={{ background: "rgba(99,102,241,0.2)" }}>📋</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-sm leading-tight">Test Centre</p>
                  <p className="text-slate-400 text-[10px] font-medium">11+ · SATs · WAEC · SAT</p>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(99,102,241,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:translate-x-0.5 transition-transform"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )}
          </div>

          {/* ── MISSION CONTROL (SubjectInsightCard) ────────────── */}
          <SubjectInsightCard
            scholar={scholar}
            weeklyStats={weeklyStats}
            lastWeekStats={lastWeekStats}
            streak={streakData.streak}
          />

          {/* ── DAILY STREAK ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between gap-3">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Daily Streak</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl shrink-0">🔥</span>
              <div className="min-w-0">
                <StreakTimerDisplay lastActivityAt={streakData.lastActivityAt} />
                <p className="text-[11px] text-slate-400 font-bold leading-tight mt-0.5">left to keep your streak</p>
              </div>
            </div>
            <div>
              {(streakData.streak || 0) > 0 ? (
                <p className="text-xs font-bold text-emerald-600">
                  🔥 {streakData.streak} day streak — keep it going!
                </p>
              ) : (
                <p className="text-xs font-bold text-slate-500">
                  Start a mission to begin your streak
                </p>
              )}
            </div>
            <button
              onClick={() => {
                // Pick: weakest subject (lowest proficiency) or first available
                const weakest = subjects.reduce((best, s) => {
                  const p = skillProficiency[s] ?? 0;
                  return (p < (skillProficiency[best] ?? 0)) ? s : best;
                }, subjects[0]);
                setActiveSubject(weakest || subjects[0] || "maths");
              }}
              className="w-full py-2.5 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 shadow-sm"
            >
              Start Weakest Subject →
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            ROW 2: Choose Your Mission — full-width subject grid
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-0.5">
            Choose Your Mission
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {subjects.map(s => (
              <SubjectCard
                key={s}
                subjectId={s}
                proficiency={skillProficiency[s]}
                onClick={() => setActiveSubject(s)}
              />
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            ROW 3: Active Quests · This Week · Leaderboard  (3-col)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Active Quests */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Active Quests</span>
              <span className="text-base">🚀</span>
            </div>
            <div className="px-3 pb-3">
              <QuestPanel scholarId={scholar.id} />
            </div>
          </div>

          {/* This Week */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">This Week</span>
              <span className="text-base">📅</span>
            </div>
            <div className="px-3 pb-3">
              <WeeklyMissionPlan
                scholar={scholar}
                weeklyStats={weeklyStats}
                onStartSubject={(subject) => setActiveSubject(subject)}
              />
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Leaderboard</span>
              <div className="flex gap-1">
                {["year", "friends"].map(m => (
                  <button key={m} onClick={() => setLbMode(m)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg font-black capitalize
                      ${lbMode === m ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-600"}`}>
                    {m === "year" ? formatGradeLabel(scholar.year_level || scholar.year, curriculum) : "Friends"}
                  </button>
                ))}
              </div>
            </div>
            <Leaderboard entries={leaderboard.slice(0, 5)} currentScholarId={scholar.id} />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            ROW 4: Badges · Recent Missions  (2-col)
        ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Badges</span>
              <span className="text-[10px] font-bold text-slate-400">{earnedBadges.length}/{Object.keys(BADGES).length}</span>
            </div>
            <BadgeGrid earnedIds={earnedBadges} />
          </div>

          {recentQuizzes.length > 0 ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-3">Recent Missions</span>
              <div className="space-y-2">
                {recentQuizzes.map((q, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-lg">{SUBJECT_ICONS[q.subject] ?? "📚"}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-slate-700 capitalize">{q.subject}</span>
                        <span className="text-slate-400 text-xs">{q.date}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div className={`h-full rounded-full ${q.pct >= 80 ? "bg-emerald-500" : q.pct >= 50 ? "bg-amber-400" : "bg-rose-400"}`}
                          style={{ width: `${q.pct}%` }} />
                      </div>
                    </div>
                    <span className={`font-black text-sm w-10 text-right ${q.pct >= 80 ? "text-emerald-600" : q.pct >= 50 ? "text-amber-600" : "text-rose-500"}`}>
                      {q.score}/{q.total}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center gap-2">
              <span className="text-3xl">🛸</span>
              <p className="text-slate-500 text-sm font-bold">No missions yet</p>
              <p className="text-slate-400 text-xs">Complete your first mission to see your history here</p>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            ROW 5: Certificates earned
        ══════════════════════════════════════════════════════════════════ */}
        {masteryRecords.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-0.5">
                🏅 My Certificates
              </h2>
              <span className="text-[10px] font-bold text-slate-400">
                {masteryRecords.length} earned
              </span>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <CertificatesPanel
                records={masteryRecords}
                scholarName={scholar?.name || "Cadet"}
                subjects={subjects}
              />
            </div>
          </section>
        )}

        {/* Progress section (toggle) */}
        {showProgress && (
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 animate-in slide-in-from-top-4">
            <h2 className="text-xl font-black text-slate-800 mb-5">Your Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SkillHeatmap
                skills={fullSkills}
                curriculum={curriculum}
                subjects={subjects}
                grades={(currDef.grades ?? []).filter(g => g >= examYear)}
                gradeLabel={currDef.gradeLabel}
                startYear={examYear}
              />
              <ProgressChart
                data={chartData}
                subjects={subjects}
                color="#6366f1"
              />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}