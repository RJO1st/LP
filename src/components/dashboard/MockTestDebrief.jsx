"use client";
/**
 * MockTestDebrief.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * KS4 — Post-Mock-Test Analysis & Debrief Screen
 *
 * After completing a mock test, shows:
 *   - Score summary with predicted grade
 *   - Strengths & weaknesses by topic
 *   - Direct "Revise" links for weak topics
 *   - Comparison with previous mock attempts
 *   - Actionable next steps
 *
 * Dependencies: Zero new
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo, useState } from "react";

function StatusBadge({ label, colour }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 9,
      fontWeight: 700,
      background: `${colour}15`,
      color: colour,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    }}>
      {label}
    </span>
  );
}

export default function MockTestDebrief({
  mockResult,      // { score, total, answers: [{topic, correct, timeTaken}], subject, createdAt }
  masteryData = [],
  examData,
  onReviseTopic,   // (topic, subject) => void
  onRetake,        // () => void
  onClose,         // () => void
}) {
  const [showAllTopics, setShowAllTopics] = useState(false);

  // Analyse results by topic
  const analysis = useMemo(() => {
    if (!mockResult?.answers?.length) return null;

    const topicMap = {};
    mockResult.answers.forEach(a => {
      if (!topicMap[a.topic]) topicMap[a.topic] = { correct: 0, total: 0, times: [] };
      topicMap[a.topic].total++;
      if (a.correct) topicMap[a.topic].correct++;
      if (a.timeTaken) topicMap[a.topic].times.push(a.timeTaken);
    });

    const topics = Object.entries(topicMap).map(([topic, data]) => {
      const pct = Math.round((data.correct / data.total) * 100);
      const avgTime = data.times.length > 0
        ? Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length / 1000)
        : null;

      // Find mastery record for context
      const mastery = masteryData.find(r => r.topic === topic);
      const masteryPct = mastery ? Math.round((mastery.mastery_score ?? 0) * 100) : null;

      return {
        topic,
        displayName: topic.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        correct: data.correct,
        total: data.total,
        accuracy: pct,
        avgTime,
        mastery: masteryPct,
        status: pct >= 80 ? "strength" : pct >= 50 ? "developing" : "weakness",
        colour: pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444",
      };
    }).sort((a, b) => a.accuracy - b.accuracy);

    const strengths = topics.filter(t => t.status === "strength");
    const weaknesses = topics.filter(t => t.status === "weakness");
    const developing = topics.filter(t => t.status === "developing");

    return { topics, strengths, weaknesses, developing };
  }, [mockResult, masteryData]);

  if (!mockResult || !analysis) {
    return null;
  }

  const score = mockResult.score ?? 0;
  const total = mockResult.total ?? 1;
  const pct = Math.round((score / Math.max(total, 1)) * 100);
  const predictedGrade = examData?.readiness?.grade ?? "—";

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      border: "1px solid rgba(124,58,237,0.12)",
      overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 24px",
        background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.02))",
        borderBottom: "1px solid rgba(124,58,237,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.15em" }}>
              Mock Test Debrief
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#1e1b4b", margin: "4px 0 0" }}>
              {mockResult.subject?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) ?? "Assessment"} Results
            </h2>
          </div>
          {onClose && (
            <button onClick={onClose} style={{
              padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(124,58,237,0.15)",
              background: "rgba(124,58,237,0.04)", color: "#7c3aed", fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>
              Close
            </button>
          )}
        </div>
      </div>

      {/* Score summary */}
      <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <div style={{ textAlign: "center", padding: 12, borderRadius: 10, background: `${pct >= 70 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444"}08`, border: `1px solid ${pct >= 70 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444"}15` }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#1e1b4b" }}>{score}/{total}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: pct >= 70 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444", textTransform: "uppercase" }}>Score</div>
        </div>
        <div style={{ textAlign: "center", padding: 12, borderRadius: 10, background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.1)" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#7c3aed" }}>{pct}%</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase" }}>Accuracy</div>
        </div>
        <div style={{ textAlign: "center", padding: 12, borderRadius: 10, background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.1)" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#1e1b4b" }}>{predictedGrade}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase" }}>Predicted</div>
        </div>
        <div style={{ textAlign: "center", padding: 12, borderRadius: 10, background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.1)" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#1e1b4b" }}>{analysis.topics.length}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase" }}>Topics</div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div style={{ padding: "0 24px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Strengths */}
        <div style={{ padding: 14, borderRadius: 10, background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.1)" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Strengths ({analysis.strengths.length})
          </div>
          {analysis.strengths.length === 0 ? (
            <div style={{ fontSize: 11, color: "rgba(30,27,75,0.4)", fontStyle: "italic" }}>Keep practising to build strengths</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {analysis.strengths.slice(0, 4).map(t => (
                <div key={t.topic} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#1e1b4b" }}>{t.displayName}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e" }}>{t.accuracy}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weaknesses */}
        <div style={{ padding: 14, borderRadius: 10, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
            Areas to Improve ({analysis.weaknesses.length})
          </div>
          {analysis.weaknesses.length === 0 ? (
            <div style={{ fontSize: 11, color: "rgba(30,27,75,0.4)", fontStyle: "italic" }}>No weak areas — excellent!</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {analysis.weaknesses.slice(0, 4).map(t => (
                <div key={t.topic} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#1e1b4b" }}>{t.displayName}</span>
                  <button
                    onClick={() => onReviseTopic?.(t.topic, mockResult.subject)}
                    style={{
                      padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700,
                      background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "none", cursor: "pointer",
                    }}
                  >
                    Revise →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full topic breakdown (expandable) */}
      <div style={{ padding: "0 24px 20px" }}>
        <button
          onClick={() => setShowAllTopics(!showAllTopics)}
          style={{
            width: "100%", padding: "8px", borderRadius: 8, border: "1px solid rgba(124,58,237,0.1)",
            background: "rgba(124,58,237,0.02)", color: "#7c3aed", fontSize: 11, fontWeight: 700, cursor: "pointer",
            textAlign: "center",
          }}
        >
          {showAllTopics ? "Hide" : "Show"} Full Topic Breakdown ({analysis.topics.length} topics)
        </button>

        {showAllTopics && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
            {analysis.topics.map(t => (
              <div key={t.topic} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 6,
                background: `${t.colour}05`, border: `1px solid ${t.colour}12`,
              }}>
                <StatusBadge label={t.status} colour={t.colour} />
                <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "#1e1b4b" }}>{t.displayName}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: t.colour }}>{t.correct}/{t.total}</span>
                {t.mastery != null && (
                  <span style={{ fontSize: 9, color: "rgba(30,27,75,0.35)" }}>Mastery: {t.mastery}%</span>
                )}
                {t.status === "weakness" && (
                  <button
                    onClick={() => onReviseTopic?.(t.topic, mockResult.subject)}
                    style={{
                      padding: "3px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700,
                      background: "#7c3aed", color: "#fff", border: "none", cursor: "pointer",
                    }}
                  >
                    Revise
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        padding: "16px 24px",
        borderTop: "1px solid rgba(124,58,237,0.08)",
        display: "flex", justifyContent: "flex-end", gap: 10,
        background: "rgba(124,58,237,0.02)",
      }}>
        {onRetake && (
          <button onClick={onRetake} style={{
            padding: "8px 20px", borderRadius: 10, border: "1px solid rgba(124,58,237,0.2)",
            background: "rgba(124,58,237,0.04)", color: "#7c3aed", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>
            Retake Mock
          </button>
        )}
        {analysis.weaknesses.length > 0 && (
          <button
            onClick={() => onReviseTopic?.(analysis.weaknesses[0].topic, mockResult.subject)}
            style={{
              padding: "8px 20px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
            }}
          >
            Start Revising Weakest Topic →
          </button>
        )}
      </div>
    </div>
  );
}
