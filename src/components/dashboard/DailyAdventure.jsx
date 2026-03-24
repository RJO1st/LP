"use client";
/**
 * DailyAdventure.jsx (v3)
 * Deploy to: src/components/dashboard/DailyAdventure.jsx
 *
 * v3: Narrative generated internally from subject + topic props.
 *     Changes when subject tab switches. Stable within same day (no flicker).
 */

import React, { useMemo } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getSubjectLabel } from "@/lib/subjectDisplay";

// ─── Subject-specific config ─────────────────────────────────────────────────
const CONFIGS = {
  mathematics: {
    icon: "🔢", gradient: "linear-gradient(135deg, #dbeafe, #ede9fe)",
    border: "#c7d2fe", titleColor: "#312e81", textColor: "#4338ca",
    btnGradient: "linear-gradient(135deg, #6366f1, #7c3aed)",
    stories: (t) => [
      `The friendly owl needs help with ${t}! Solve these puzzles to help it fly home! 🦉`,
      `Oh no! The little astronaut's ${t} machine is broken! Can you fix it? 🧑‍🚀`,
      `The star fairy is building a ${t} tower. Answer correctly to stack each block! ✨`,
      `A treasure chest is locked with a ${t} code! Crack it to see what's inside! 🗝️`,
    ],
  },
  maths: { ref: "mathematics" },
  english: {
    icon: "📖", gradient: "linear-gradient(135deg, #fce7f3, #fdf2f8)",
    border: "#f9a8d4", titleColor: "#831843", textColor: "#be185d",
    btnGradient: "linear-gradient(135deg, #ec4899, #be185d)",
    stories: (t) => [
      `The story fairy has lost some ${t} words! Help find them! 🧚`,
      `The magic quill needs your ${t} skills to finish a story! ✍️`,
      `The bookworm is stuck on a ${t} puzzle. Can you help it? 📚`,
      `A letter from a pen pal needs ${t} fixing before it can be sent! 💌`,
    ],
  },
  english_studies: { ref: "english" },
  science: {
    icon: "🔬", gradient: "linear-gradient(135deg, #d1fae5, #ecfdf5)",
    border: "#86efac", titleColor: "#064e3b", textColor: "#047857",
    btnGradient: "linear-gradient(135deg, #10b981, #059669)",
    stories: (t) => [
      `The curious fox found something strange about ${t}! Help it investigate! 🦊`,
      `Professor Owl's ${t} experiment needs a helper! That's you! 🦉`,
      `The garden has a ${t} mystery — can you solve it? 🌿`,
      `A friendly robot needs to learn about ${t}. Teach it by answering questions! 🤖`,
    ],
  },
  basic_science: { ref: "science" },
  verbal_reasoning: {
    icon: "🧩", gradient: "linear-gradient(135deg, #ede9fe, #f5f3ff)",
    border: "#c4b5fd", titleColor: "#4c1d95", textColor: "#6d28d9",
    btnGradient: "linear-gradient(135deg, #7c3aed, #5b21b6)",
    stories: (t) => [
      `The puzzle master has set a ${t} challenge! Can you crack it? 🧩`,
      `A secret ${t} code needs breaking! Use your word skills! 🔑`,
    ],
  },
  non_verbal_reasoning: {
    icon: "🔷", gradient: "linear-gradient(135deg, #cffafe, #ecfeff)",
    border: "#67e8f9", titleColor: "#155e75", textColor: "#0e7490",
    btnGradient: "linear-gradient(135deg, #06b6d4, #0891b2)",
    stories: (t) => [
      `The shape wizard has a ${t} riddle! Can you spot the pattern? 🔷`,
      `A crystal sequence about ${t} needs completing! 🔮`,
    ],
  },
  history: {
    icon: "🏛️", gradient: "linear-gradient(135deg, #fef3c7, #fffbeb)",
    border: "#fde68a", titleColor: "#78350f", textColor: "#92400e",
    btnGradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    stories: (t) => [
      `A time traveller needs your help with ${t}! Fix the timeline! ⏳`,
      `Ancient scrolls about ${t} have been found! Can you read them? 📜`,
    ],
  },
  geography: {
    icon: "🌍", gradient: "linear-gradient(135deg, #ccfbf1, #f0fdfa)",
    border: "#5eead4", titleColor: "#134e4a", textColor: "#0f766e",
    btnGradient: "linear-gradient(135deg, #14b8a6, #0d9488)",
    stories: (t) => [
      `The explorer's ${t} map has gaps! Help fill them in! 🗺️`,
      `Where in the world is ${t}? Answer questions to find out! 🌍`,
    ],
  },
  computing: {
    icon: "💻", gradient: "linear-gradient(135deg, #e2e8f0, #f1f5f9)",
    border: "#cbd5e1", titleColor: "#1e293b", textColor: "#475569",
    btnGradient: "linear-gradient(135deg, #475569, #334155)",
    stories: (t) => [
      `The robot's ${t} code has a bug! Debug it to save the day! 🤖`,
      `A ${t} program needs writing. Can you help the computer understand? 💻`,
    ],
  },
  physics: {
    icon: "⚡", gradient: "linear-gradient(135deg, #dbeafe, #eff6ff)",
    border: "#93c5fd", titleColor: "#1e3a5f", textColor: "#1d4ed8",
    btnGradient: "linear-gradient(135deg, #3b82f6, #2563eb)",
    stories: (t) => [
      `The ship's ${t} systems need fixing! Use physics to help! ⚡`,
    ],
  },
  chemistry: {
    icon: "⚗️", gradient: "linear-gradient(135deg, #fee2e2, #fef2f2)",
    border: "#fca5a5", titleColor: "#7f1d1d", textColor: "#dc2626",
    btnGradient: "linear-gradient(135deg, #ef4444, #dc2626)",
    stories: (t) => [
      `A ${t} reaction in the lab needs your help! ⚗️`,
    ],
  },
  biology: {
    icon: "🧬", gradient: "linear-gradient(135deg, #d1fae5, #ecfdf5)",
    border: "#86efac", titleColor: "#064e3b", textColor: "#16a34a",
    btnGradient: "linear-gradient(135deg, #22c55e, #16a34a)",
    stories: (t) => [
      `Life signs about ${t} detected! Study the organisms! 🧬`,
    ],
  },
  religious_education: {
    icon: "📿", gradient: "linear-gradient(135deg, #f3e8ff, #faf5ff)",
    border: "#d8b4fe", titleColor: "#581c87", textColor: "#7e22ce",
    btnGradient: "linear-gradient(135deg, #a855f7, #7e22ce)",
    stories: (t) => [
      `Ancient teachings about ${t} hold wisdom. Explore them! 📿`,
    ],
  },
  design_and_technology: {
    icon: "🔧", gradient: "linear-gradient(135deg, #fef3c7, #fffbeb)",
    border: "#fde68a", titleColor: "#78350f", textColor: "#b45309",
    btnGradient: "linear-gradient(135deg, #f59e0b, #b45309)",
    stories: (t) => [
      `A broken ${t} gadget needs redesigning! Can you fix it? 🔧`,
    ],
  },
  social_studies: {
    icon: "🌍", gradient: "linear-gradient(135deg, #cffafe, #ecfeff)",
    border: "#67e8f9", titleColor: "#155e75", textColor: "#0891b2",
    btnGradient: "linear-gradient(135deg, #06b6d4, #0891b2)",
    stories: (t) => [
      `The community needs help understanding ${t}! Can you explain? 🌍`,
    ],
  },
  civic_education: {
    icon: "🏛️", gradient: "linear-gradient(135deg, #dbeafe, #eff6ff)",
    border: "#93c5fd", titleColor: "#1e3a5f", textColor: "#2563eb",
    btnGradient: "linear-gradient(135deg, #3b82f6, #2563eb)",
    stories: (t) => [
      `The town council needs someone who understands ${t}! That's you! 🏛️`,
    ],
  },
};

const DEFAULT_CONFIG = {
  icon: "🚀", gradient: "linear-gradient(135deg, #dbeafe, #ede9fe)",
  border: "#c7d2fe", titleColor: "#312e81", textColor: "#4338ca",
  btnGradient: "linear-gradient(135deg, #6366f1, #7c3aed)",
  stories: (t) => [
    `A new ${t} quest awaits! Answer questions to complete today's adventure! ✨`,
    `Ready for a ${t} challenge? Let's see what you've got today! 🌟`,
  ],
};

function resolveConfig(subject) {
  const key = (subject || "mathematics").toLowerCase();
  let cfg = CONFIGS[key];
  if (cfg?.ref) cfg = CONFIGS[cfg.ref];
  return cfg || DEFAULT_CONFIG;
}

export default function DailyAdventure({
  totalQuestions = 10,
  completed = 0,
  subject = "mathematics",
  topic = "",
  onStart,
}) {
  const { band, theme: t } = useTheme();

  if (band !== "ks1") return null;

  const config = resolveConfig(subject);
  const topicLabel = topic || getSubjectLabel(subject);

  // Stable story selection: changes daily, not per render
  const story = useMemo(() => {
    const pool = config.stories(topicLabel);
    const dayIndex = Math.floor(Date.now() / 86400000) % pool.length;
    return pool[dayIndex];
  }, [subject, topicLabel, config]);

  const allDone = completed >= totalQuestions;

  return (
    <div style={{
      background: config.gradient, border: `2px solid ${config.border}`,
      borderRadius: t.radius.card, padding: 24, textAlign: "center",
    }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>
        {allDone ? "🎉" : config.icon}
      </div>

      <div style={{
        fontSize: 17, fontWeight: t.fontWeight.black,
        color: config.titleColor, fontFamily: t.fonts.display,
      }}>
        {allDone ? "Adventure Complete!" : "Today's Adventure"}
      </div>

      <div style={{
        fontSize: 14, color: config.textColor, fontFamily: t.fonts.body,
        lineHeight: 1.7, margin: "8px 0 16px",
      }}>
        {allDone
          ? "You helped everyone today! Come back tomorrow for a new story! 🌟"
          : story}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
        {Array.from({ length: totalQuestions }, (_, i) => (
          <div key={i} style={{
            width: 28, height: 28, borderRadius: 999,
            background: i < completed ? "#22c55e" : "#e2e8f0",
            border: "2px solid #fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, color: i < completed ? "#fff" : "#94a3b8",
            fontWeight: 800, fontFamily: t.fonts.display,
            transition: "background 0.3s",
          }}>
            {i < completed ? "✓" : i + 1}
          </div>
        ))}
      </div>

      {!allDone && (
        <button onClick={onStart} style={{
          padding: "12px 28px", background: config.btnGradient,
          color: "#fff", borderRadius: 999,
          fontFamily: t.fonts.display, fontSize: 15,
          fontWeight: t.fontWeight.black,
          border: "none", cursor: "pointer",
          boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
          borderBottom: "4px solid rgba(0,0,0,0.15)",
        }}>
          {completed > 0 ? "Continue Adventure ✨" : "Start Adventure ✨"}
        </button>
      )}
    </div>
  );
}