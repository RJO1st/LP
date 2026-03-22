"use client";
/**
 * GoalSetting.jsx
 * Deploy to: src/components/dashboard/GoalSetting.jsx
 *
 * KS3 scholars set weekly goals. Tracks progress and celebrates completion.
 * Goals are stored in localStorage (no DB table needed for beta).
 *
 * Props:
 *   scholarId — string
 *   stats     — { questsCompleted, masteryPct, streak }
 */

import React, { useState, useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

const GOAL_TEMPLATES = [
  { id: "quests", label: "Complete quests", icon: "🎯", targets: [3, 5, 7, 10], unit: "quests" },
  { id: "streak", label: "Maintain streak", icon: "🔥", targets: [3, 5, 7], unit: "days" },
  { id: "topics", label: "Master topics", icon: "📊", targets: [1, 2, 3], unit: "topics" },
];

function getStorageKey(scholarId) {
  return `lp_goals_${scholarId}`;
}

function loadGoals(scholarId) {
  try {
    const raw = localStorage.getItem(getStorageKey(scholarId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Reset if from a different week
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    if (new Date(data.weekStart) < weekStart) return null;
    return data;
  } catch { return null; }
}

function saveGoals(scholarId, goals) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  localStorage.setItem(getStorageKey(scholarId), JSON.stringify({ ...goals, weekStart: weekStart.toISOString() }));
}

export default function GoalSetting({ scholarId, stats = {} }) {
  const { band, theme: t } = useTheme();
  const [goals, setGoals] = useState(null);
  const [editing, setEditing] = useState(false);

  // Only KS3
  if (band !== "ks3") return null;

  useEffect(() => {
    if (scholarId) setGoals(loadGoals(scholarId));
  }, [scholarId]);

  const handleSetGoal = (templateId, target) => {
    const updated = { ...goals, [templateId]: { target, startValue: getCurrentValue(templateId) } };
    setGoals(updated);
    saveGoals(scholarId, updated);
  };

  const getCurrentValue = (templateId) => {
    switch (templateId) {
      case "quests": return stats.questsCompleted ?? 0;
      case "streak": return stats.streak ?? 0;
      case "topics": return stats.topicCount ?? 0;
      default: return 0;
    }
  };

  const getProgress = (templateId) => {
    const goal = goals?.[templateId];
    if (!goal) return null;
    const current = getCurrentValue(templateId);
    const progress = current - (goal.startValue ?? 0);
    const pct = Math.min(100, Math.round((progress / goal.target) * 100));
    return { progress, target: goal.target, pct, complete: progress >= goal.target };
  };

  const hasGoals = goals && Object.keys(goals).some(k => k !== "weekStart");

  return (
    <div style={{
      background: t.colours.card,
      border: `1px solid ${t.colours.cardBorder}`,
      borderRadius: t.radius.card,
      padding: 18,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: t.fontWeight.bold, color: t.colours.text, fontFamily: t.fonts.display }}>
          🎯 Weekly Goals
        </span>
        <button onClick={() => setEditing(!editing)} style={{
          fontSize: 10, fontWeight: 600, color: t.colours.accent, background: "none",
          border: "none", cursor: "pointer", fontFamily: t.fonts.body,
        }}>
          {editing ? "Done" : hasGoals ? "Edit" : "Set goals"}
        </button>
      </div>

      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {GOAL_TEMPLATES.map(tmpl => (
            <div key={tmpl.id} style={{
              padding: "10px 12px", borderRadius: t.radius.button,
              border: `1px solid ${t.colours.cardBorder}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>{tmpl.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: t.colours.text, fontFamily: t.fonts.body }}>
                  {tmpl.label}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {tmpl.targets.map(target => {
                  const isActive = goals?.[tmpl.id]?.target === target;
                  return (
                    <button key={target} onClick={() => handleSetGoal(tmpl.id, target)} style={{
                      padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                      background: isActive ? t.colours.accent : "transparent",
                      color: isActive ? "#fff" : t.colours.textMuted,
                      border: `1.5px solid ${isActive ? t.colours.accent : t.colours.cardBorder}`,
                      cursor: "pointer", fontFamily: t.fonts.body,
                    }}>
                      {target} {tmpl.unit}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : hasGoals ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {GOAL_TEMPLATES.map(tmpl => {
            const p = getProgress(tmpl.id);
            if (!p) return null;
            return (
              <div key={tmpl.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{tmpl.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: t.colours.text, fontFamily: t.fonts.body }}>
                      {tmpl.label}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: p.complete ? "#22c55e" : t.colours.accent }}>
                      {p.complete ? "✓ Done!" : `${p.progress}/${p.target}`}
                    </span>
                  </div>
                  <div style={{ height: 5, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      width: `${p.pct}%`, height: "100%", borderRadius: 3,
                      background: p.complete ? "#22c55e" : t.colours.accent,
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <p style={{ fontSize: 12, color: t.colours.textMuted, fontFamily: t.fonts.body }}>
            Set weekly goals to track your progress
          </p>
        </div>
      )}
    </div>
  );
}