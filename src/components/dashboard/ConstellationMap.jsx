"use client";
/**
 * ConstellationMap.jsx
 * Deploy to: src/components/dashboard/ConstellationMap.jsx
 *
 * Genshin Impact-inspired constellation widget for KS4 "Zenith Station".
 * Topics are rendered as glowing star nodes on a deep-space background,
 * connected by arcing paths. Locked nodes are dim; mastered nodes glow bright.
 */

import React, { useState, useMemo, useRef, useEffect } from "react";

/* ── Subject palette ────────────────────────────────────── */
const SUBJECT_META = {
  mathematics: { label: "Maths", icon: "🔢", color: "#818cf8", glow: "#6366f1" },
  maths: { label: "Maths", icon: "🔢", color: "#818cf8", glow: "#6366f1" },
  english: { label: "English", icon: "📖", color: "#fb7185", glow: "#e11d48" },
  english_studies: { label: "English", icon: "📖", color: "#fb7185", glow: "#e11d48" },
  science: { label: "Science", icon: "🔬", color: "#34d399", glow: "#10b981" },
  basic_science: { label: "Science", icon: "🔬", color: "#34d399", glow: "#10b981" },
  verbal_reasoning: { label: "Verbal", icon: "🧩", color: "#a78bfa", glow: "#7c3aed" },
  non_verbal_reasoning: { label: "NVR", icon: "🔷", color: "#22d3ee", glow: "#0891b2" },
  history: { label: "History", icon: "🏛️", color: "#d97706", glow: "#92400e" },
  geography: { label: "Geography", icon: "🌍", color: "#059669", glow: "#065f46" },
  computing: { label: "Computing", icon: "💻", color: "#94a3b8", glow: "#475569" },
  physics: { label: "Physics", icon: "⚡", color: "#38bdf8", glow: "#0ea5e9" },
  chemistry: { label: "Chemistry", icon: "⚗️", color: "#f87171", glow: "#dc2626" },
  biology: { label: "Biology", icon: "🧬", color: "#4ade80", glow: "#16a34a" },
  social_studies: { label: "Social", icon: "🌍", color: "#22d3ee", glow: "#0891b2" },
  civic_education: { label: "Civic Ed", icon: "🏛️", color: "#60a5fa", glow: "#2563eb" },
  religious_studies: { label: "RE", icon: "📿", color: "#c084fc", glow: "#a855f7" },
  religious_education: { label: "RE", icon: "📿", color: "#c084fc", glow: "#a855f7" },
  design_and_technology: { label: "D&T", icon: "🔧", color: "#fbbf24", glow: "#b45309" },
};

/* ── Constellation layout helpers ───────────────────────── */
// Place nodes in a flowing constellation pattern
function layoutNodes(count, w, h) {
  if (count === 0) return [];
  const nodes = [];
  const padX = 50, padY = 40;
  const usableW = w - padX * 2;
  const usableH = h - padY * 2;

  // Create a natural constellation pattern using golden angle distribution
  // with slight randomization for organic feel
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const centerX = w / 2;
  const centerY = h / 2;

  for (let i = 0; i < count; i++) {
    const t = i / Math.max(count - 1, 1);
    // Spiral distribution
    const radius = (0.25 + t * 0.65) * Math.min(usableW, usableH) / 2;
    const angle = i * goldenAngle + (i % 3) * 0.3;
    // Seed-based deterministic "randomness" for organic feel
    const jitterX = Math.sin(i * 7.3) * 18;
    const jitterY = Math.cos(i * 11.7) * 14;
    const x = centerX + Math.cos(angle) * radius + jitterX;
    const y = centerY + Math.sin(angle) * radius * 0.75 + jitterY;
    nodes.push({
      x: Math.max(padX, Math.min(w - padX, x)),
      y: Math.max(padY, Math.min(h - padY, y)),
    });
  }
  return nodes;
}

// Connect nodes with curved paths (nearest neighbours)
function buildEdges(positions, count) {
  const edges = [];
  if (count <= 1) return edges;
  // Connect each node to next 1-2 nearest nodes to form a constellation
  for (let i = 0; i < count; i++) {
    const dists = [];
    for (let j = 0; j < count; j++) {
      if (j === i) continue;
      const dx = positions[i].x - positions[j].x;
      const dy = positions[i].y - positions[j].y;
      dists.push({ j, d: Math.sqrt(dx * dx + dy * dy) });
    }
    dists.sort((a, b) => a.d - b.d);
    // Connect to 1-2 nearest, avoiding duplicates
    const connectCount = count <= 4 ? 1 : 2;
    for (let k = 0; k < Math.min(connectCount, dists.length); k++) {
      const j = dists[k].j;
      // Avoid duplicate edges
      const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
      if (!edges.find(e => e.key === key)) {
        edges.push({ from: i, to: j, key });
      }
    }
  }
  return edges;
}

/* ── Twinkling background stars ─────────────────────────── */
function BackgroundStars({ w, h }) {
  const stars = useMemo(() => {
    const s = [];
    for (let i = 0; i < 80; i++) {
      s.push({
        x: (Math.sin(i * 13.7 + 5) * 0.5 + 0.5) * w,
        y: (Math.cos(i * 17.3 + 3) * 0.5 + 0.5) * h,
        r: 0.4 + (i % 5) * 0.25,
        opacity: 0.15 + (i % 7) * 0.08,
        delay: (i % 12) * 0.4,
      });
    }
    return s;
  }, [w, h]);

  return (
    <>
      {stars.map((s, i) => (
        <circle
          key={i} cx={s.x} cy={s.y} r={s.r}
          fill="#e2e8f0"
          opacity={s.opacity}
          style={{ animation: `constellation-twinkle ${2.5 + s.delay}s ease-in-out infinite`, animationDelay: `${s.delay}s` }}
        />
      ))}
    </>
  );
}

/* ── Star node component ────────────────────────────────── */
function StarNode({ x, y, topic, color, glowColor, isActive, onClick }) {
  const isMastered = topic.mastery >= 0.8;
  const isStarted = topic.mastery > 0;
  const isLocked = topic.status === "locked";
  const isCurrent = topic.status === "current";
  const pct = Math.round((topic.mastery || 0) * 100);

  // Node visual states
  let starRadius = isMastered ? 8 : isStarted ? 6.5 : 5;
  let fillColor = isLocked ? "rgba(148,163,184,0.15)" : isMastered ? color : isStarted ? `${color}99` : "rgba(148,163,184,0.3)";
  let strokeColor = isLocked ? "rgba(148,163,184,0.2)" : isMastered ? color : isStarted ? `${color}66` : "rgba(148,163,184,0.15)";
  let glowAmount = isMastered ? 12 : isCurrent ? 10 : isStarted ? 6 : 0;
  let textOpacity = isLocked ? 0.25 : isStarted ? 0.85 : 0.4;

  return (
    <g
      onClick={() => !isLocked && onClick?.(topic)}
      style={{ cursor: isLocked ? "default" : "pointer" }}
    >
      {/* Glow effect */}
      {glowAmount > 0 && (
        <circle
          cx={x} cy={y} r={starRadius + glowAmount}
          fill="none"
          style={{
            filter: `drop-shadow(0 0 ${glowAmount}px ${glowColor || color})`,
            animation: isCurrent ? "constellation-pulse 2.5s ease-in-out infinite" : undefined,
          }}
        />
      )}
      {/* Outer glow ring for mastered */}
      {isMastered && (
        <circle
          cx={x} cy={y} r={starRadius + 4}
          fill="none" stroke={color} strokeWidth={0.8}
          opacity={0.4}
          style={{ animation: "constellation-pulse 3s ease-in-out infinite" }}
        />
      )}
      {/* Main star circle */}
      <circle
        cx={x} cy={y} r={starRadius}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={isMastered ? 2 : 1.5}
        style={{
          filter: isStarted && !isLocked ? `drop-shadow(0 0 ${glowAmount}px ${glowColor || color})` : undefined,
          transition: "all 0.3s ease",
        }}
      />
      {/* Inner bright point */}
      {(isMastered || isCurrent) && (
        <circle
          cx={x} cy={y} r={2}
          fill="#fff"
          opacity={0.9}
        />
      )}
      {/* Mastery ring (progress arc) */}
      {isStarted && !isMastered && !isLocked && (
        <circle
          cx={x} cy={y} r={starRadius + 3}
          fill="none" stroke={color} strokeWidth={1.5}
          strokeDasharray={`${2 * Math.PI * (starRadius + 3)}`}
          strokeDashoffset={2 * Math.PI * (starRadius + 3) * (1 - topic.mastery)}
          strokeLinecap="round"
          opacity={0.5}
          transform={`rotate(-90 ${x} ${y})`}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      )}
      {/* Topic label */}
      <text
        x={x} y={y + starRadius + 14}
        textAnchor="middle"
        fill={isActive ? "#fff" : `rgba(226,232,240,${textOpacity})`}
        fontSize={9}
        fontWeight={700}
        fontFamily="'DM Sans', sans-serif"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {topic.label?.length > 18 ? topic.label.slice(0, 16) + "…" : topic.label}
      </text>
      {/* Mastery percentage */}
      {isStarted && (
        <text
          x={x} y={y + starRadius + 24}
          textAnchor="middle"
          fill={color}
          fontSize={8}
          fontWeight={800}
          fontFamily="'DM Sans', sans-serif"
          opacity={0.7}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {pct}%
        </text>
      )}
      {/* Lock icon for locked nodes */}
      {isLocked && (
        <text
          x={x} y={y + 3.5}
          textAnchor="middle"
          fontSize={8}
          style={{ pointerEvents: "none" }}
        >
          🔒
        </text>
      )}
    </g>
  );
}

/* ── Main ConstellationMap ──────────────────────────────── */
export default function ConstellationMap({ topics = [], subjects = [], subject, onTopicClick, onSubjectChange }) {
  const [activeSubject, setActiveSubject] = useState(subject || subjects[0] || "mathematics");
  const [hoveredTopic, setHoveredTopic] = useState(null);
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 500, h: 360 });

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setDims({ w: e.contentRect.width, h: Math.max(320, Math.min(420, e.contentRect.width * 0.72)) });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const filteredTopics = topics.filter(t =>
    t.subject === activeSubject ||
    (!t.subject && activeSubject === (subject || subjects[0] || "mathematics"))
  );

  const meta = SUBJECT_META[activeSubject] || { label: activeSubject, icon: "📚", color: "#a78bfa", glow: "#7c3aed" };
  const positions = useMemo(() => layoutNodes(filteredTopics.length, dims.w, dims.h), [filteredTopics.length, dims.w, dims.h]);
  const edges = useMemo(() => buildEdges(positions, filteredTopics.length), [positions, filteredTopics.length]);

  const handleSubjectSwitch = (subj) => {
    setActiveSubject(subj);
    onSubjectChange?.(subj);
  };

  // Stats summary
  const mastered = filteredTopics.filter(t => t.mastery >= 0.8).length;
  const started = filteredTopics.filter(t => t.mastery > 0 && t.mastery < 0.8).length;
  const locked = filteredTopics.filter(t => t.status === "locked").length;

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      {/* Subject tabs */}
      {subjects.length > 1 && (
        <div style={{
          display: "flex", gap: 4, marginBottom: 12, overflowX: "auto",
          paddingBottom: 2,
        }}>
          {subjects.map(subj => {
            const m = SUBJECT_META[subj] || { label: subj.replace(/_/g, " "), icon: "📚", color: "#a78bfa" };
            const isActive = subj === activeSubject;
            return (
              <button
                key={subj}
                onClick={() => handleSubjectSwitch(subj)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 8,
                  background: isActive ? "rgba(124,58,237,0.15)" : "transparent",
                  border: isActive ? "1px solid rgba(124,58,237,0.3)" : "1px solid rgba(148,163,184,0.15)",
                  color: isActive ? "#c4b5fd" : "rgba(148,163,184,0.5)",
                  fontSize: 11, fontWeight: 700,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 12 }}>{m.icon}</span>
                {m.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Constellation viewport */}
      <div style={{
        position: "relative",
        background: "linear-gradient(160deg, #0c0a1a 0%, #0f0d24 35%, #131030 60%, #0a0818 100%)",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(124,58,237,0.15)",
        boxShadow: "inset 0 0 60px rgba(124,58,237,0.04), 0 4px 20px rgba(0,0,0,0.3)",
      }}>
        {/* Nebula gradient overlay */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.12,
          background: `radial-gradient(ellipse at 30% 40%, ${meta.color}40 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(124,58,237,0.15) 0%, transparent 50%)`,
          pointerEvents: "none",
        }} />

        <svg
          width={dims.w} height={dims.h}
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          style={{ display: "block", position: "relative", zIndex: 1 }}
        >
          {/* Background stars */}
          <BackgroundStars w={dims.w} h={dims.h} />

          {/* Constellation edges */}
          {edges.map(({ from, to, key }) => {
            const p1 = positions[from];
            const p2 = positions[to];
            if (!p1 || !p2) return null;
            const t1 = filteredTopics[from];
            const t2 = filteredTopics[to];
            const bothActive = (t1?.mastery > 0) && (t2?.mastery > 0);
            const eitherLocked = t1?.status === "locked" || t2?.status === "locked";
            // Curved path via midpoint offset
            const mx = (p1.x + p2.x) / 2 + (Math.sin(from * 3.7) * 15);
            const my = (p1.y + p2.y) / 2 + (Math.cos(to * 5.3) * 10);
            return (
              <path
                key={key}
                d={`M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`}
                fill="none"
                stroke={bothActive ? `${meta.color}50` : eitherLocked ? "rgba(148,163,184,0.06)" : "rgba(148,163,184,0.1)"}
                strokeWidth={bothActive ? 1.5 : 0.8}
                strokeDasharray={eitherLocked ? "3 4" : undefined}
                style={{
                  filter: bothActive ? `drop-shadow(0 0 4px ${meta.glow}40)` : undefined,
                  transition: "all 0.5s ease",
                }}
              />
            );
          })}

          {/* Star nodes */}
          {filteredTopics.map((topic, i) => {
            const pos = positions[i];
            if (!pos) return null;
            return (
              <StarNode
                key={topic.slug || i}
                x={pos.x} y={pos.y}
                topic={topic}
                color={meta.color}
                glowColor={meta.glow}
                isActive={hoveredTopic === i}
                onClick={onTopicClick}
              />
            );
          })}

          {/* Constellation name label */}
          <text
            x={dims.w - 16} y={dims.h - 14}
            textAnchor="end"
            fill="rgba(148,163,184,0.2)"
            fontSize={10}
            fontWeight={800}
            fontFamily="'DM Sans', sans-serif"
            letterSpacing="0.15em"
            textTransform="uppercase"
            style={{ pointerEvents: "none", userSelect: "none", textTransform: "uppercase" }}
          >
            {meta.label} CONSTELLATION
          </text>
        </svg>

        {/* Legend overlay */}
        <div style={{
          position: "absolute", top: 12, left: 14,
          display: "flex", gap: 12, alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, boxShadow: `0 0 6px ${meta.glow}` }} />
            <span style={{ fontSize: 9, color: "rgba(226,232,240,0.5)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Mastered ({mastered})</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: `${meta.color}66`, border: `1px solid ${meta.color}44` }} />
            <span style={{ fontSize: 9, color: "rgba(226,232,240,0.5)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>In Progress ({started})</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(148,163,184,0.15)", border: "1px solid rgba(148,163,184,0.2)" }} />
            <span style={{ fontSize: 9, color: "rgba(226,232,240,0.5)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Locked ({locked})</span>
          </div>
        </div>

        {/* Total progress indicator */}
        <div style={{
          position: "absolute", top: 12, right: 14,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: meta.color, fontFamily: "'DM Sans', sans-serif" }}>
            {filteredTopics.length > 0 ? Math.round(filteredTopics.reduce((s, t) => s + (t.mastery || 0), 0) / filteredTopics.length * 100) : 0}%
          </span>
          <span style={{ fontSize: 9, color: "rgba(226,232,240,0.4)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>overall</span>
        </div>
      </div>

      {/* Empty state */}
      {filteredTopics.length === 0 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          textAlign: "center", zIndex: 2,
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>
            Chart your constellation
          </p>
          <p style={{ fontSize: 11, color: "rgba(226,232,240,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
            Start a session in {meta.label} to illuminate your first star
          </p>
          <button
            onClick={() => onTopicClick?.({ subject: activeSubject, slug: activeSubject, label: meta.label, status: "current", mastery: 0 })}
            style={{
              marginTop: 14, padding: "10px 22px", borderRadius: 10,
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              color: "#fff", fontSize: 12, fontWeight: 800,
              fontFamily: "'DM Sans', sans-serif",
              border: "none", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
            }}
          >
            Begin Session
          </button>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes constellation-twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.5; }
        }
        @keyframes constellation-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
