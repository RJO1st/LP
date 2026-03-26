"use client";
/**
 * CertificatesPanel.jsx
 * Deploy to: src/components/dashboard/CertificatesPanel.jsx
 *
 * Shows earned mastery certificates from scholar_topic_mastery.
 * Filter tabs: All / Stellar / On Track / Building
 * Tap any card to open the full MasteryCertificate modal.
 * Self-gates: returns null if no records.
 *
 * Props:
 *   records      — scholar_topic_mastery rows with current_tier
 *   scholarName  — string
 */

import React, { useState, useCallback } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getSubjectLabel } from "@/lib/subjectDisplay";

const MASTERY_STAGES = {
  developing: { label: "Building", emoji: "🌱", color: "#f59e0b", stageNum: 1, stars: 1 },
  expected:   { label: "On Track", emoji: "⭐", color: "#3b82f6", stageNum: 2, stars: 2 },
  exceeding:  { label: "Stellar",  emoji: "🏆", color: "#8b5cf6", stageNum: 3, stars: 3 },
};

const SUBJECT_ICONS = {
  mathematics: "🔢", maths: "🔢", english: "📖", english_studies: "📖",
  science: "🔬", basic_science: "🔬", biology: "🧬", chemistry: "⚗️", physics: "⚡",
  history: "🏛️", geography: "🌍", computing: "💻", verbal_reasoning: "🧩",
  nvr: "🔷", religious_education: "📿", design_and_technology: "🔧",
  social_studies: "🌍", civic_education: "🏛️", default: "📚",
};

function getSubjectIcon(subject) {
  return SUBJECT_ICONS[(subject || "").toLowerCase()] || SUBJECT_ICONS.default;
}

function CertificateCard({ record, onView }) {
  const { theme: t } = useTheme();
  const stage = MASTERY_STAGES[record.current_tier] || MASTERY_STAGES.developing;
  const pct = Math.round((record.mastery_score ?? 0) * 100);
  const topicLabel = (record.topic || record.subject || "")
    .replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()).slice(0, 28);
  const subjIcon = getSubjectIcon(record.subject);
  const dateStr = record.updated_at
    ? new Date(record.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : "";

  return (
    <button
      onClick={() => onView(record)}
      style={{
        display: "flex", flexDirection: "column", gap: 8,
        padding: 14, borderRadius: 14, cursor: "pointer",
        background: `linear-gradient(135deg, ${stage.color}08, ${stage.color}04)`,
        border: `1.5px solid ${stage.color}20`,
        textAlign: "left", width: "100%",
        transition: "all 0.2s",
      }}
    >
      {/* Stars row */}
      <div style={{ display: "flex", gap: 2 }}>
        {[1, 2, 3].map(i => (
          <svg key={i} width={14} height={14} viewBox="0 0 24 24">
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={i <= stage.stars ? stage.color : "#e2e8f0"}
              strokeWidth={1.5}
            />
          </svg>
        ))}
      </div>
      {/* Subject + topic */}
      <div style={{ display: "flex", alignItems: "start", gap: 6 }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{subjIcon}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: t.colours?.text || "#1e293b", lineHeight: 1.3 }}>
            {topicLabel}
          </p>
          <p style={{ fontSize: 10, fontWeight: 600, color: stage.color, marginTop: 1 }}>
            {stage.emoji} {stage.label}
          </p>
        </div>
      </div>
      {/* Mastery bar */}
      <div style={{ height: 5, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: stage.color, transition: "width 0.5s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>{pct}% mastery</span>
        <span style={{ fontSize: 9, fontWeight: 600, color: "#94a3b8" }}>{dateStr}</span>
      </div>
    </button>
  );
}

export default function CertificatesPanel({ records = [], scholarName = "Scholar" }) {
  const { band, theme: t } = useTheme();
  const [filter, setFilter] = useState("all");
  const [viewing, setViewing] = useState(null);
  const [LazyMC, setLazyMC] = useState(null);

  // Only show meaningful certificates — "developing" is a status, not a certificate
  const certRecords = records.filter(r =>
    r.current_tier && ["expected", "exceeding"].includes(r.current_tier)
  );

  if (certRecords.length === 0) return null;

  const handleView = useCallback(async (record) => {
    if (!LazyMC) {
      try {
        const mod = await import("@/components/game/MasteryCertificate");
        setLazyMC(() => mod.default);
      } catch (err) {
        console.warn("[CertificatesPanel] Failed to load MasteryCertificate:", err);
        return;
      }
    }
    setViewing(record);
  }, [LazyMC]);

  const filtered = filter === "all"
    ? certRecords
    : certRecords.filter(r => r.current_tier === filter);

  const counts = {
    all: certRecords.length,
    exceeding: certRecords.filter(r => r.current_tier === "exceeding").length,
    expected: certRecords.filter(r => r.current_tier === "expected").length,
  };

  const isDark = band === "ks2" || band === "ks4";

  return (
    <>
      {/* Full certificate modal */}
      {viewing && LazyMC && (
        <LazyMC
          scholarName={scholarName}
          subject={viewing.subject}
          topic={getSubjectLabel(viewing.topic || viewing.subject)}
          masteryTier={viewing.current_tier}
          masteryScore={viewing.mastery_score ?? 0}
          accuracy={Math.round((viewing.mastery_score ?? 0) * 100)}
          xpEarned={0}
          date={viewing.updated_at ? new Date(viewing.updated_at) : new Date()}
          onClose={() => setViewing(null)}
        />
      )}

      <div>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: isDark ? "#fff" : "#1e293b" }}>
            🏅 My Certificates
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b" }}>
            {certRecords.length} earned
          </span>
        </div>

        {/* Filter tabs — only meaningful tiers (no "Building" certificates) */}
        <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All", emoji: "" },
            { key: "exceeding", label: "Stellar", emoji: "🏆" },
            { key: "expected", label: "On Track", emoji: "⭐" },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: "pointer",
              background: filter === f.key ? (isDark ? "rgba(255,255,255,0.1)" : "#f1f5f9") : "transparent",
              color: filter === f.key ? (isDark ? "#fff" : "#1e293b") : "#94a3b8",
              border: `1px solid ${filter === f.key ? (isDark ? "rgba(255,255,255,0.15)" : "#e2e8f0") : "transparent"}`,
            }}>
              {f.emoji} {f.label} ({counts[f.key] || 0})
            </button>
          ))}
        </div>

        {/* Certificate grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
          maxHeight: 280, overflowY: "auto",
        }}>
          {filtered.map((record, i) => (
            <CertificateCard key={record.topic + i} record={record} onView={handleView} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <span style={{ fontSize: 24 }}>📜</span>
            <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 4 }}>
              No {filter !== "all" ? MASTERY_STAGES[filter]?.label : ""} certificates yet
            </p>
          </div>
        )}
      </div>
    </>
  );
}