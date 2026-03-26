// ─── Deploy to: src/components/ReadinessScore.jsx ────────────────────────────
// Shows "72% ready for the 11+" with subject breakdown.
// Designed to be screenshot-worthy — the word-of-mouth driver.
// Used in: parent dashboard, student dashboard (compact mode).
"use client";
import { useState, useEffect } from "react";

const ELEVEN_PLUS_WEIGHTS = {
  mathematics:      0.30,
  english:          0.30,
  verbal_reasoning: 0.25,
  nvr:              0.15,
};

const SUBJECT_LABELS = {
  mathematics:      "Maths",
  english:          "English",
  verbal_reasoning: "Verbal Reasoning",
  nvr:              "Non-Verbal Reasoning",
};

const SUBJECT_ICONS = {
  mathematics:      "🔢",
  english:          "📖",
  verbal_reasoning: "🧩",
  nvr:              "🔷",
};

export default function ReadinessScore({ scholarId, supabase, compact = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scholarId || !supabase) return;
    (async () => {
      // Fetch mastery per subject
      const { data: mastery } = await supabase
        .from("scholar_topic_mastery")
        .select("subject, topic, mastery_score, acquisition_score, stability, times_seen, unique_practice_days, spaced_review_count, last_seen_at, updated_at")
        .eq("scholar_id", scholarId)
        .in("subject", Object.keys(ELEVEN_PLUS_WEIGHTS));

      if (!mastery?.length) { setLoading(false); return; }

      // Fetch total topic counts per subject
      const { data: topicRows } = await supabase
        .from("question_bank")
        .select("subject, topic")
        .in("curriculum", ["uk_11plus"])
        .not("question_text", "is", null);

      const totalTopics = {};
      if (topicRows) {
        topicRows.forEach(r => {
          if (!totalTopics[r.subject]) totalTopics[r.subject] = new Set();
          if (r.topic) totalTopics[r.subject].add(r.topic);
        });
      }

      // ── Realistic readiness calculation (v2 — uses composite mastery) ──
      // Uses the v2 composite mastery system fields when available:
      //   - mastery_score: pre-computed composite (acquisition × stability × recency)
      //   - stability: SM-2 retention proof (0-1)
      //   - unique_practice_days: distributed practice evidence
      //   - spaced_review_count: successful spaced reviews
      //
      // Per-topic readiness = compositeScore × confidenceFactor × retentionBonus
      //   confidenceFactor = min(1, times_seen / MIN_QUESTIONS)
      //   retentionBonus = 1.0 if stability > 0.3, scaled down below that
      //
      // Subject readiness = (sum of topic readiness / total required topics) × 100
      // Overall readiness = weighted average across subjects
      const MIN_QUESTIONS_FOR_CONFIDENCE = 10;

      const subjectTopicReadiness = {};

      mastery.forEach(m => {
        const sub = m.subject;
        if (!subjectTopicReadiness[sub]) subjectTopicReadiness[sub] = [];

        // Use v2 composite mastery_score (already blends acquisition + stability + recency)
        const composite = m.mastery_score ?? 0;
        const seen = m.times_seen ?? 1;
        const stability = m.stability ?? 0;

        // Confidence: scales with question volume (same as before)
        const confidence = Math.min(1, seen / MIN_QUESTIONS_FOR_CONFIDENCE);

        // Retention bonus: reward topics with proven stability
        // stability > 0.3 = full credit, below that = proportional scaling
        const retentionBonus = stability >= 0.3 ? 1.0 : 0.7 + (stability / 0.3) * 0.3;

        const topicReadiness = composite * confidence * retentionBonus;
        subjectTopicReadiness[sub].push(topicReadiness);
      });

      const subjects = {};
      let weightedTotal = 0;
      let totalWeight = 0;

      for (const [sub, weight] of Object.entries(ELEVEN_PLUS_WEIGHTS)) {
        const topicScores = subjectTopicReadiness[sub] || [];
        const topicsTotal = totalTopics[sub]?.size || Math.max(topicScores.length, 20);

        if (topicScores.length === 0) {
          subjects[sub] = { avg: 0, coverage: 0, readiness: 0, topicsDone: 0, topicsTotal };
          continue;
        }

        const topicReadinessSum = topicScores.reduce((s, v) => s + v, 0);
        // Readiness = sum of topic readiness scores / total topics needed
        // This naturally penalises: low coverage, low mastery, low confidence, and stale topics
        const readiness = Math.round((topicReadinessSum / topicsTotal) * 100);
        const avgMastery = topicScores.reduce((s, v) => s + v, 0) / topicScores.length;
        const coverage = Math.round((topicScores.length / topicsTotal) * 100);

        subjects[sub] = {
          avg: Math.round(avgMastery * 100),
          coverage: Math.min(100, coverage),
          readiness: Math.min(100, readiness),
          topicsDone: topicScores.length,
          topicsTotal,
        };

        weightedTotal += readiness * weight;
        totalWeight += weight;
      }

      const overall = totalWeight > 0 ? Math.min(100, Math.round(weightedTotal / totalWeight)) : 0;

      setData({ overall, subjects });
      setLoading(false);
    })();
  }, [scholarId, supabase]);

  if (loading || !data) return null;

  const { overall, subjects } = data;
  const color = overall >= 75 ? "#22c55e" : overall >= 55 ? "#3b82f6" : overall >= 35 ? "#f59e0b" : "#ef4444";
  const label = overall >= 75 ? "Strong" : overall >= 55 ? "On track" : overall >= 35 ? "Developing" : "Needs focus";

  // ── Compact mode (for student dashboard) ───────────────────────────────
  if (compact) return (
    <div style={{
      background: "linear-gradient(135deg, #4f46e5, #7c3aed)", borderRadius: 20,
      padding: "16px 20px", color: "white", display: "flex", alignItems: "center", gap: 16,
    }}>
      <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
        <svg width={56} height={56} viewBox="0 0 56 56">
          <circle cx={28} cy={28} r={24} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={4} />
          <circle cx={28} cy={28} r={24} fill="none" stroke="white" strokeWidth={4}
            strokeDasharray={`${overall * 1.508} 150.8`} strokeLinecap="round"
            transform="rotate(-90 28 28)" />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", fontWeight: 900, fontSize: 16,
        }}>{overall}%</div>
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14 }}>11+ Readiness</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      </div>
    </div>
  );

  // ── Full mode (for parent dashboard) ───────────────────────────────────
  return (
    <div style={{
      background: "white", borderRadius: 24, border: "2px solid #e2e8f0",
      padding: 24, maxWidth: 400,
    }}>
      {/* Header with circular gauge */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 12px" }}>
          <svg width={120} height={120} viewBox="0 0 120 120">
            <circle cx={60} cy={60} r={52} fill="none" stroke="#f1f5f9" strokeWidth={8} />
            <circle cx={60} cy={60} r={52} fill="none" stroke={color} strokeWidth={8}
              strokeDasharray={`${overall * 3.267} 326.7`} strokeLinecap="round"
              transform="rotate(-90 60 60)" style={{ transition: "stroke-dasharray 1s ease" }} />
          </svg>
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 32, fontWeight: 900, color }}>{overall}%</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Readiness</span>
          </div>
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: "#1e293b", margin: "0 0 4px" }}>
          11+ Exam Readiness
        </h3>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{label}</p>
      </div>

      {/* Subject breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(ELEVEN_PLUS_WEIGHTS).map(([sub, weight]) => {
          const s = subjects[sub] || { readiness: 0, topicsDone: 0, topicsTotal: 20 };
          const barColor = s.readiness >= 75 ? "#22c55e" : s.readiness >= 55 ? "#3b82f6" : s.readiness >= 35 ? "#f59e0b" : "#ef4444";
          return (
            <div key={sub}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                  {SUBJECT_ICONS[sub]} {SUBJECT_LABELS[sub]}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color: barColor }}>{s.readiness}%</span>
              </div>
              <div style={{
                height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${s.readiness}%`, background: barColor,
                  borderRadius: 4, transition: "width 1s ease",
                }} />
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                {s.topicsDone}/{s.topicsTotal} topics covered · {Math.round(weight * 100)}% of exam
              </div>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div style={{
        marginTop: 16, padding: "12px 16px", borderRadius: 12,
        background: "#f8fafc", border: "1px solid #e2e8f0",
      }}>
        <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
          {(() => {
            const weakest = Object.entries(subjects).sort((a, b) => a[1].readiness - b[1].readiness)[0];
            if (!weakest) return "Keep practising across all subjects!";
            return `Focus area: ${SUBJECT_LABELS[weakest[0]]} (${weakest[1].readiness}%). Regular practice here will have the biggest impact on overall readiness.`;
          })()}
        </p>
      </div>
    </div>
  );
}