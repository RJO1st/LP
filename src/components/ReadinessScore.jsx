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
        .select("subject, topic, mastery_score")
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

      // Calculate per-subject readiness
      const subjectData = {};
      mastery.forEach(m => {
        if (!subjectData[m.subject]) subjectData[m.subject] = { total: 0, count: 0 };
        subjectData[m.subject].total += m.mastery_score ?? 0;
        subjectData[m.subject].count += 1;
      });

      const subjects = {};
      let weightedTotal = 0;
      let totalWeight = 0;

      for (const [sub, weight] of Object.entries(ELEVEN_PLUS_WEIGHTS)) {
        const sd = subjectData[sub];
        if (!sd) {
          subjects[sub] = { avg: 0, coverage: 0, readiness: 0, topicsDone: 0, topicsTotal: totalTopics[sub]?.size || 20 };
          continue;
        }
        const avg = sd.total / sd.count;
        const topicsTotal = totalTopics[sub]?.size || Math.max(sd.count, 20);
        const coverage = Math.min(1, sd.count / topicsTotal);
        const readiness = Math.round(avg * coverage * 100);

        subjects[sub] = {
          avg: Math.round(avg * 100),
          coverage: Math.round(coverage * 100),
          readiness,
          topicsDone: sd.count,
          topicsTotal,
        };

        weightedTotal += readiness * weight;
        totalWeight += weight;
      }

      const overall = totalWeight > 0 ? Math.round(weightedTotal / totalWeight) : 0;

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