"use client";
/**
 * SkillMap.jsx (v3)
 * Deploy to: src/components/dashboard/SkillMap.jsx
 *
 * v3: Treasure icons restored. Subject tab bar added.
 */

import React, { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getSubjectLabel, getSubjectIcon, getSubjectColor } from "@/lib/subjectDisplay";

const SUBJECT_META = {
  mathematics:        { label: "Maths",    icon: "🔢", color: "#6366f1" },
  maths:              { label: "Maths",    icon: "🔢", color: "#6366f1" },
  english:            { label: "English",  icon: "📖", color: "#e11d48" },
  english_studies:    { label: "English",  icon: "📖", color: "#e11d48" },
  science:            { label: "Science",  icon: "🔬", color: "#10b981" },
  basic_science:      { label: "Science",  icon: "🔬", color: "#10b981" },
  verbal_reasoning:   { label: "Verbal",   icon: "🧩", color: "#7c3aed" },
  non_verbal_reasoning:{ label: "Non-Verbal Reasoning",     icon: "🔷", color: "#0891b2" },
  history:            { label: "History",  icon: "🏛️", color: "#92400e" },
  geography:          { label: "Geography",icon: "🌍", color: "#065f46" },
  computing:          { label: "Computing",icon: "💻", color: "#475569" },
  physics:            { label: "Physics",  icon: "⚡", color: "#0ea5e9" },
  chemistry:          { label: "Chemistry",icon: "⚗️", color: "#dc2626" },
  biology:            { label: "Biology",  icon: "🧬", color: "#16a34a" },
  social_studies:     { label: "Social",   icon: "🌍", color: "#0891b2" },
  civic_education:    { label: "Civic Education", icon: "🏛️", color: "#2563eb" },
  religious_studies:   { label: "Religious Studies",    icon: "📿", color: "#a855f7" },
  religious_education: { label: "Religious Education",    icon: "📿", color: "#a855f7" },
  design_and_technology:{ label: "Design & Technology",    icon: "🔧", color: "#b45309" },
  hass:               { label: "HASS",     icon: "🌍", color: "#065f46" },
};

export default function SkillMap({ topics = [], subjects = [], subject, onTopicClick, onSubjectChange }) {
  const { band, theme: t, isDark } = useTheme();
  const [activeSubject, setActiveSubject] = useState(subject || subjects[0] || "mathematics");

  const titles = {
    ks1: "🗺️ Treasure Map",
    ks2: "🌌 Galaxy Map",
    ks3: "📊 Skill Map",
    ks4: "🔥 Topic Heatmap",
  };

  // Filter topics by active subject
  const filteredTopics = topics.filter(t =>
    t.subject === activeSubject ||
    (!t.subject && activeSubject === (subject || subjects[0] || "mathematics"))
  );

  const handleSubjectSwitch = (subj) => {
    setActiveSubject(subj);
    onSubjectChange?.(subj);
  };

  return (
    <div style={{
      background: t.colours.card,
      border: `1px solid ${t.colours.cardBorder}`,
      borderRadius: t.radius.card,
      padding: band === "ks1" ? 24 : 20,
      backdropFilter: isDark ? "blur(12px)" : undefined,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: subjects.length > 1 ? 10 : 14 }}>
        <span style={{ fontSize: band === "ks1" ? 15 : 13, fontWeight: t.fontWeight.black, color: t.colours.text, fontFamily: t.fonts.display }}>
          {titles[band]}
        </span>
        {subjects.length <= 1 && (
          <span style={{ fontSize: 10, color: t.colours.textMuted, fontWeight: 500, fontFamily: t.fonts.body }}>
            {getSubjectLabel(activeSubject)}
          </span>
        )}
      </div>

      {/* Subject tabs */}
      {subjects.length > 1 && (
        <div style={{
          display: "flex", gap: 4, marginBottom: 14, overflowX: "auto",
          paddingBottom: 2,
        }}>
          {subjects.map(subj => {
            const meta = SUBJECT_META[subj] || { label: getSubjectLabel(subj), icon: "📚", color: "#6366f1" };
            const isActive = subj === activeSubject;
            return (
              <button
                key={subj}
                onClick={() => handleSubjectSwitch(subj)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: band === "ks1" ? "8px 12px" : "6px 10px",
                  borderRadius: band === "ks1" ? 999 : t.radius.button,
                  background: isActive ? meta.color : "transparent",
                  border: isActive ? "none" : `1.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
                  color: isActive ? "#fff" : t.colours.textMuted,
                  fontSize: band === "ks1" ? 12 : 11,
                  fontWeight: 700,
                  fontFamily: t.fonts.body,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: band === "ks1" ? 14 : 12 }}>{meta.icon}</span>
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Topic grid */}
      {filteredTopics.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: band === "ks1" ? 10 : band === "ks4" ? 4 : 8 }}>
          {filteredTopics.map((topic, i) => (
            <TopicNode key={topic.slug || i} topic={topic} band={band} theme={t} isDark={isDark} onClick={onTopicClick} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "28px 16px" }}>
          <span style={{ fontSize: 36, display: "block", marginBottom: 8 }}>
            {band === "ks1" ? "🌟" : band === "ks2" ? "🚀" : band === "ks3" ? "💼" : "🎯"}
          </span>
          <p style={{ fontSize: band === "ks1" ? 14 : 13, fontWeight: 700, color: t.colours.text, fontFamily: t.fonts.display, marginBottom: 4 }}>
            {band === "ks1" ? "Ready for an adventure?" : band === "ks2" ? "Mission awaits, Commander!" : band === "ks3" ? "Start your career challenge" : "Begin revision session"}
          </p>
          <p style={{ fontSize: 12, color: t.colours.textMuted, fontFamily: t.fonts.body, marginBottom: 16 }}>
            Launch a {band === "ks1" ? "quest" : band === "ks2" ? "mission" : band === "ks3" ? "challenge" : "session"} in {getSubjectLabel(activeSubject)} to build your progress
          </p>
          <button
            onClick={() => onTopicClick?.({ subject: activeSubject, slug: activeSubject, label: getSubjectLabel(activeSubject), status: "current", mastery: 0 })}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: band === "ks1" ? "14px 28px" : "12px 24px",
              borderRadius: band === "ks1" ? 999 : t.radius.button || 12,
              background: t.colours.accent,
              color: "#fff",
              fontSize: band === "ks1" ? 15 : 14,
              fontWeight: 800,
              fontFamily: t.fonts.display,
              border: "none",
              cursor: "pointer",
              boxShadow: `0 4px 16px ${t.colours.accent}40`,
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: band === "ks1" ? 18 : 16 }}>
              {band === "ks1" ? "✨" : band === "ks2" ? "🚀" : band === "ks3" ? "⚡" : "▶"}
            </span>
            {band === "ks1" ? "Start Adventure" : band === "ks2" ? "Launch Mission" : band === "ks3" ? "Start Challenge" : "Start Revision"}
          </button>
        </div>
      )}

      <style>{`@keyframes lp-skill-pulse{0%,100%{box-shadow:0 0 0 0 ${t.colours.accent}40}50%{box-shadow:0 0 0 8px ${t.colours.accent}00}}`}</style>
    </div>
  );
}

function TopicNode({ topic, band, theme: t, isDark, onClick }) {
  const isCurrent  = topic.status === "current";
  const isLocked   = topic.status === "locked";
  const isMastered = topic.mastery >= 0.8;
  const isStarted  = topic.status === "started" || topic.status === "developing";

  // ── KS4: Heatmap cell ─────────────────────────────────────────────────
  if (band === "ks4") {
    const intensity = topic.mastery > 0 ? 0.15 + topic.mastery * 0.6 : 0;
    const heat = intensity > 0 ? `rgba(167,139,250,${intensity})` : "rgba(255,255,255,0.02)";
    return (
      <div onClick={() => !isLocked && onClick?.(topic)} style={{
        width: "calc(16.66% - 3px)", background: heat,
        border: `1px solid ${topic.mastery > 0.7 ? "rgba(167,139,250,0.3)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 5, padding: "5px 4px", cursor: isLocked ? "default" : "pointer",
        textAlign: "center", transition: "all 0.2s",
      }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: topic.mastery > 0 ? t.colours.text : t.colours.textMuted, fontFamily: t.fonts.body, lineHeight: 1.15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {topic.label}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: t.colours.accent, fontFamily: t.fonts.display, marginTop: 2 }}>
          {topic.mastery > 0 ? `${Math.round(topic.mastery * 100)}%` : "—"}
        </div>
      </div>
    );
  }

  // ── KS1/KS2/KS3: Treasure-style icons ────────────────────────────────
  const icons = {
    ks1: { mastered: "🏝️", current: "🧭", started: "🗺️", locked: "🔒" },
    ks2: { mastered: "🌍", current: "🛸", started: "🪐", locked: "🌑" },
    ks3: { mastered: "✅", current: "◉", started: "◎", locked: "○" },
  };
  const icon = isMastered  ? icons[band]?.mastered
             : isCurrent   ? icons[band]?.current
             : isLocked    ? icons[band]?.locked
             : icons[band]?.started;

  let bg = t.colours.accentLight;
  let border = t.colours.cardBorder;
  let glow = "none";
  let textCol = t.colours.text;

  if (isMastered) {
    bg = isDark ? "rgba(52,211,153,0.12)" : "#dcfce7";
    border = isDark ? "rgba(52,211,153,0.35)" : "#86efac";
    glow = `0 0 8px ${isDark ? "rgba(52,211,153,0.2)" : "rgba(34,197,94,0.12)"}`;
  }
  if (isCurrent) {
    bg = t.colours.accentLight;
    border = t.colours.accent;
    glow = `0 0 12px ${t.colours.accent}35`;
  }
  if (isLocked) {
    bg = "transparent";
    border = isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0";
    textCol = t.colours.textMuted;
  }

  const pad = band === "ks1" ? "12px 14px" : band === "ks2" ? "10px 14px" : "8px 12px";
  const fs  = band === "ks1" ? 13 : 12;

  return (
    <div onClick={() => !isLocked && onClick?.(topic)} style={{
      display: "flex", alignItems: "center", gap: 8,
      background: bg, border: `1.5px solid ${border}`, borderRadius: t.radius.card * 0.6,
      padding: pad, cursor: isLocked ? "default" : "pointer",
      boxShadow: glow, transition: "all 0.2s",
      ...(isCurrent ? { animation: "lp-skill-pulse 2s ease-in-out infinite" } : {}),
      flex: band === "ks3" ? "1 1 calc(50% - 8px)" : "0 0 auto",
      opacity: isLocked ? 0.5 : 1,
    }}>
      <span style={{ fontSize: band === "ks1" ? 18 : 14 }}>{icon}</span>
      <div>
        <div style={{ fontSize: fs, fontWeight: t.fontWeight.black, color: textCol, fontFamily: t.fonts.display }}>
          {topic.label}
        </div>
        {(band === "ks3" || band === "ks2") && topic.mastery > 0 && (
          <div style={{ fontSize: 10, color: t.colours.accent, fontWeight: 600, fontFamily: t.fonts.body }}>
            {Math.round(topic.mastery * 100)}%
          </div>
        )}
      </div>
    </div>
  );
}