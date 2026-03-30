"use client";
/**
 * StickerCollection.jsx
 * Deploy to: src/components/dashboard/StickerCollection.jsx
 *
 * Shows earned badges/stickers + milestone progress per age band.
 * KS1: "My Sticker Book" — warm, large sticker grid with sparkle effects
 * KS2: "Achievement Medals" — orbital/space themed medal grid
 * KS3: "Skill Badges" — professional badge cards
 * KS4: "Certifications" — minimal, exam-result style
 *
 * Props:
 *   band — "ks1" | "ks2" | "ks3" | "ks4"
 *   earnedBadgeIds — string[] of badge IDs the scholar has earned
 *   milestones — { questsCompleted, streak, accuracy, totalXP } for milestone tracking
 *   onClose — optional callback for modal mode
 */

import React, { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { BADGES, TIER_COLORS } from "@/lib/gamificationEngine";

// Milestone definitions per band
const MILESTONES = {
  ks1: [
    { id: "first_star",   label: "First Star!",         emoji: "⭐", threshold: (m) => m.questsCompleted >= 1, desc: "Complete your first adventure" },
    { id: "star_5",       label: "Star Collector",       emoji: "🌟", threshold: (m) => m.questsCompleted >= 5, desc: "Complete 5 adventures" },
    { id: "star_10",      label: "Super Star",           emoji: "💫", threshold: (m) => m.questsCompleted >= 10, desc: "Complete 10 adventures" },
    { id: "star_25",      label: "Mega Star",            emoji: "✨", threshold: (m) => m.questsCompleted >= 25, desc: "Complete 25 adventures" },
    { id: "streak_3",     label: "3-Day Explorer",       emoji: "🔥", threshold: (m) => m.streak >= 3, desc: "Learn 3 days in a row" },
    { id: "streak_7",     label: "Week Warrior",         emoji: "🏅", threshold: (m) => m.streak >= 7, desc: "Learn every day for a week" },
    { id: "accuracy_hero",label: "Perfect Score",        emoji: "🎯", threshold: (m) => m.accuracy >= 100, desc: "Get 100% on an adventure" },
    { id: "xp_100",       label: "Rising Star",          emoji: "🚀", threshold: (m) => m.totalXP >= 100, desc: "Earn 100 stars" },
    { id: "xp_500",       label: "Shining Bright",       emoji: "✨", threshold: (m) => m.totalXP >= 500, desc: "Earn 500 stars" },
    { id: "xp_1000",      label: "Constellation",        emoji: "🦄", threshold: (m) => m.totalXP >= 1000, desc: "Earn 1000 stars" },
  ],
  ks2: [
    { id: "first_mission", label: "Mission Start",       emoji: "🚀", threshold: (m) => m.questsCompleted >= 1, desc: "Complete your first mission" },
    { id: "mission_10",    label: "Space Cadet",          emoji: "🛸", threshold: (m) => m.questsCompleted >= 10, desc: "Complete 10 missions" },
    { id: "mission_25",    label: "Orbit Explorer",       emoji: "🪐", threshold: (m) => m.questsCompleted >= 25, desc: "Complete 25 missions" },
    { id: "mission_50",    label: "Galaxy Navigator",     emoji: "🌌", threshold: (m) => m.questsCompleted >= 50, desc: "Complete 50 missions" },
    { id: "streak_3",      label: "3-Day Streak",         emoji: "🔥", threshold: (m) => m.streak >= 3, desc: "3-day learning streak" },
    { id: "streak_7",      label: "Week Warrior",         emoji: "⚡", threshold: (m) => m.streak >= 7, desc: "7-day learning streak" },
    { id: "streak_14",     label: "Unstoppable",          emoji: "💎", threshold: (m) => m.streak >= 14, desc: "14-day learning streak" },
    { id: "accuracy_90",   label: "Sharp Shooter",        emoji: "🎯", threshold: (m) => m.accuracy >= 90, desc: "Score 90%+ on a mission" },
    { id: "xp_500",        label: "Stardust Collector",   emoji: "✨", threshold: (m) => m.totalXP >= 500, desc: "Earn 500 stardust" },
    { id: "xp_2000",       label: "Nebula Master",        emoji: "🌟", threshold: (m) => m.totalXP >= 2000, desc: "Earn 2000 stardust" },
  ],
  ks3: [
    // GRIT & TENACITY TROPHIES — earned through persistence, not just correctness
    { id: "first_challenge", label: "First Step",           emoji: "🏁", threshold: (m) => m.questsCompleted >= 1, desc: "Start your first challenge" },
    { id: "bounce_back",     label: "Bounce Back",          emoji: "🔄", threshold: (m) => m.questsCompleted >= 10 && (m.accuracy ?? 0) < 80, desc: "Keep going after tough rounds" },
    { id: "grinder_25",      label: "Grinder",              emoji: "⚙️", threshold: (m) => m.questsCompleted >= 25, desc: "Push through 25 challenges" },
    { id: "relentless_50",   label: "Relentless",           emoji: "💪", threshold: (m) => m.questsCompleted >= 50, desc: "50 challenges — no quitting" },
    { id: "streak_7",        label: "7-Day Warrior",        emoji: "🔥", threshold: (m) => m.streak >= 7, desc: "7 straight days of effort" },
    { id: "streak_21",       label: "Habit Forged",         emoji: "🔗", threshold: (m) => m.streak >= 21, desc: "21 days — habit formed" },
    { id: "streak_30",       label: "Iron Will",            emoji: "⚡", threshold: (m) => m.streak >= 30, desc: "30-day unbroken streak" },
    { id: "comeback",        label: "Comeback King",        emoji: "👑", threshold: (m) => (m.masteryPct ?? 0) >= 70 && m.questsCompleted >= 30, desc: "Reach 70% mastery through sheer volume" },
    { id: "mastery_90",      label: "Tenacity Trophy",      emoji: "🏆", threshold: (m) => (m.masteryPct ?? 0) >= 90, desc: "90% mastery — earned through grit" },
    { id: "xp_2000",         label: "2K Grinder",           emoji: "🎖️", threshold: (m) => m.totalXP >= 2000, desc: "Earn 2000 XP — pure effort" },
  ],
  ks4: [
    // GRIT & TENACITY TROPHIES — exam warriors, earned through discipline & persistence
    { id: "first_revision",  label: "First Rep",            emoji: "📝", threshold: (m) => m.questsCompleted >= 1, desc: "Start your revision journey" },
    { id: "deep_work_15",    label: "Deep Work",            emoji: "🧠", threshold: (m) => m.questsCompleted >= 15, desc: "15 focused revision sessions" },
    { id: "marathon_40",     label: "Marathon Runner",       emoji: "🏃", threshold: (m) => m.questsCompleted >= 40, desc: "40 revision sessions — stamina" },
    { id: "centurion",       label: "Centurion",            emoji: "💯", threshold: (m) => m.questsCompleted >= 100, desc: "100 sessions of pure dedication" },
    { id: "streak_7",        label: "Week Warrior",          emoji: "🔥", threshold: (m) => m.streak >= 7, desc: "7-day revision streak" },
    { id: "streak_30",       label: "Iron Discipline",       emoji: "⚡", threshold: (m) => m.streak >= 30, desc: "30 days without missing" },
    { id: "streak_60",       label: "Unbreakable",           emoji: "🛡️", threshold: (m) => m.streak >= 60, desc: "60-day streak — legendary" },
    { id: "mastery_80",      label: "Grade Threshold",       emoji: "🎯", threshold: (m) => (m.masteryPct ?? 0) >= 80, desc: "80% mastery — exam ready" },
    { id: "mastery_95",      label: "Elite Scholar",         emoji: "🏆", threshold: (m) => (m.masteryPct ?? 0) >= 95, desc: "95% mastery — top of class" },
    { id: "mock_master",     label: "Mock Veteran",          emoji: "📊", threshold: (m) => (m.mocksCompleted ?? 0) >= 3, desc: "Complete 3 mock exams" },
    { id: "xp_5000",         label: "5K Legend",             emoji: "💎", threshold: (m) => m.totalXP >= 5000, desc: "Earn 5000 XP — pure grind" },
  ],
};

const BAND_STYLES = {
  ks1: {
    title: "My Sticker Book",
    titleIcon: "🏅",
    font: "'Fredoka', sans-serif",
    bg: "linear-gradient(135deg, #FFF9E3 0%, #FFF1B8 100%)",
    border: "3px solid rgba(245,158,11,0.2)",
    cardBg: "#fff",
    cardBorder: "2px solid rgba(245,158,11,0.12)",
    lockedBg: "rgba(245,158,11,0.04)",
    accentColor: "#d97706",
    mutedColor: "rgba(100,80,30,0.35)",
    textColor: "#3d2e0f",
    stickerSize: "w-20 h-20",
    emojiSize: "text-3xl",
    radius: "rounded-[24px]",
    cardRadius: "rounded-2xl",
  },
  ks2: {
    title: "Achievement Medals",
    titleIcon: "🏅",
    font: "'Nunito', sans-serif",
    bg: "linear-gradient(135deg, #1e293b, #0f172a)",
    border: "1px solid rgba(129,140,248,0.12)",
    cardBg: "rgba(22,28,56,0.7)",
    cardBorder: "1px solid rgba(129,140,248,0.1)",
    lockedBg: "rgba(129,140,248,0.04)",
    accentColor: "#818cf8",
    mutedColor: "rgba(255,255,255,0.3)",
    textColor: "#e8eaf6",
    stickerSize: "w-16 h-16",
    emojiSize: "text-2xl",
    radius: "rounded-2xl",
    cardRadius: "rounded-xl",
    dark: true,
  },
  ks3: {
    title: "Grit Trophies",
    titleIcon: "💪",
    font: "'DM Sans', sans-serif",
    bg: "#fff",
    border: "1px solid rgba(91,106,191,0.1)",
    cardBg: "#f8faff",
    cardBorder: "1px solid rgba(91,106,191,0.08)",
    lockedBg: "rgba(91,106,191,0.03)",
    accentColor: "#5b6abf",
    mutedColor: "rgba(26,29,46,0.35)",
    textColor: "#1a1d2e",
    stickerSize: "w-14 h-14",
    emojiSize: "text-xl",
    radius: "rounded-xl",
    cardRadius: "rounded-lg",
  },
  ks4: {
    title: "Tenacity Awards",
    titleIcon: "🛡️",
    font: "'JetBrains Mono', monospace",
    bg: "rgba(18,24,44,0.8)",
    border: "1px solid rgba(0,229,195,0.08)",
    cardBg: "rgba(18,24,44,0.6)",
    cardBorder: "1px solid rgba(0,229,195,0.06)",
    lockedBg: "rgba(0,229,195,0.02)",
    accentColor: "#00e5c3",
    mutedColor: "rgba(255,255,255,0.25)",
    textColor: "#e0e6f0",
    stickerSize: "w-12 h-12",
    emojiSize: "text-lg",
    radius: "rounded-lg",
    cardRadius: "rounded-md",
    dark: true,
  },
};

function StickerCard({ emoji, label, desc, earned, style: s, band }) {
  return (
    <div
      className={`flex flex-col items-center text-center p-3 ${s.cardRadius} transition-all ${earned ? "hover:scale-105" : ""}`}
      style={{
        background: earned ? s.cardBg : s.lockedBg,
        border: earned ? s.cardBorder : `1px dashed ${s.mutedColor}`,
        opacity: earned ? 1 : 0.5,
        cursor: earned ? "default" : "not-allowed",
        fontFamily: s.font,
      }}
    >
      <div
        className={`${s.stickerSize} flex items-center justify-center ${s.cardRadius} mb-2`}
        style={{
          background: earned
            ? band === "ks1" ? "rgba(251,191,36,0.12)" : `${s.accentColor}15`
            : "rgba(128,128,128,0.08)",
          filter: earned ? "none" : "grayscale(1)",
        }}
      >
        <span className={s.emojiSize}>{earned ? emoji : "🔒"}</span>
      </div>
      <p
        className="text-xs font-bold leading-tight"
        style={{ color: earned ? s.textColor : s.mutedColor }}
      >
        {label}
      </p>
      <p className="text-[10px] mt-0.5 leading-snug" style={{ color: s.mutedColor }}>
        {earned ? "Earned!" : desc}
      </p>
    </div>
  );
}

function StickerGridEntrance({ tab }) {
  useEffect(() => {
    // Animate grid children when tab changes
    const timer = requestAnimationFrame(() => {
      const grid = document.querySelector(".sticker-grid");
      if (!grid) return;
      const items = grid.children;
      if (!items.length) return;
      gsap.fromTo(items,
        { opacity: 0, scale: 0.7, rotateY: 12 },
        { opacity: 1, scale: 1, rotateY: 0, duration: 0.35, stagger: 0.03, ease: "back.out(1.4)" }
      );
    });
    return () => cancelAnimationFrame(timer);
  }, [tab]);
  return null;
}

export default function StickerCollection({
  band = "ks1",
  earnedBadgeIds = [],
  milestones = {},
  onClose,
}) {
  const [tab, setTab] = useState("milestones");
  const s = BAND_STYLES[band] || BAND_STYLES.ks1;
  const bandMilestones = MILESTONES[band] || MILESTONES.ks1;

  // Merge badge data
  const allBadges = Object.entries(BADGES).map(([id, b]) => ({
    id,
    ...b,
    earned: earnedBadgeIds.includes(id),
  }));

  const earnedCount = allBadges.filter((b) => b.earned).length;
  const milestoneEarned = bandMilestones.filter((m) => m.threshold(milestones)).length;

  // Don't render empty container when nothing earned yet
  if (earnedCount === 0 && milestoneEarned === 0) return null;

  const tabs = [
    { key: "milestones", label: band === "ks1" ? "Stickers" : band === "ks2" ? "Medals" : "Badges", count: milestoneEarned },
    { key: "badges", label: "Subject Badges", count: earnedCount },
  ];

  return (
    <div id="section-trophies" className={s.radius} style={{ background: s.bg, border: s.border, fontFamily: s.font }}>
      {/* Header */}
      <div className="flex items-center justify-between p-5 pb-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">{s.titleIcon}</span>
          <h3 className="text-lg font-bold" style={{ color: s.textColor }}>
            {s.title}
          </h3>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${s.accentColor}18`, color: s.accentColor }}
          >
            {milestoneEarned + earnedCount} collected
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-sm p-1.5 rounded-lg hover:opacity-70" style={{ color: s.mutedColor }}>
            ✕
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 px-5 pt-4 pb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: tab === t.key ? `${s.accentColor}18` : "transparent",
              color: tab === t.key ? s.accentColor : s.mutedColor,
              border: tab === t.key ? `1px solid ${s.accentColor}30` : "1px solid transparent",
            }}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Grid — GSAP stagger entrance */}
      <StickerGridEntrance tab={tab} />
      <div className="sticker-grid grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 p-5 pt-1">
        {tab === "milestones"
          ? bandMilestones.map((m) => (
              <StickerCard
                key={m.id}
                emoji={m.emoji}
                label={m.label}
                desc={m.desc}
                earned={m.threshold(milestones)}
                style={s}
                band={band}
              />
            ))
          : allBadges
              .sort((a, b) => (b.earned ? 1 : 0) - (a.earned ? 1 : 0))
              .map((b) => (
                <StickerCard
                  key={b.id}
                  emoji={b.icon}
                  label={b.name}
                  desc={`${b.tier} tier · ${b.xp} XP`}
                  earned={b.earned}
                  style={s}
                  band={band}
                />
              ))}
      </div>

      {/* Motivational footer */}
      <div className="px-5 pb-5">
        <div
          className={`p-3 ${s.cardRadius} text-center`}
          style={{ background: `${s.accentColor}08`, border: `1px dashed ${s.accentColor}20` }}
        >
          <p className="text-xs" style={{ color: s.mutedColor }}>
            {band === "ks1"
              ? `🌟 ${bandMilestones.length - milestoneEarned} stickers left to collect! Keep exploring!`
              : band === "ks2"
              ? `🚀 ${bandMilestones.length - milestoneEarned} medals left to earn. You're doing great, Commander!`
              : `${bandMilestones.length - milestoneEarned} more to unlock. Keep going!`}
          </p>
        </div>
      </div>
    </div>
  );
}
