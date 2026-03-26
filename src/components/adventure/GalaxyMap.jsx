"use client";
/**
 * GalaxyMap.jsx — Orbital Galaxy View
 * Deploy to: src/components/adventure/GalaxyMap.jsx
 *
 * Orbital ring layout inspired by solar-system / "galaxy view" style.
 * • Central hub with scholar XP + streak
 * • Concentric orbital rings per mastery tier (Stellar → On Track → Building → Unexplored)
 * • Planet orbs float on their orbital paths with gentle drift animations
 * • GSAP entrance stagger + subtle continuous orbit pulse
 * • Click any planet to launch quest
 *
 * Props:
 *   scholar        — scholar row from Supabase
 *   subjects       — string[] of subject keys for this scholar
 *   masteryRecords — scholar_topic_mastery rows (all subjects, all tiers)
 *   onLaunchQuest  — (subjectKey: string) => void
 */

import React, { useMemo, useRef, useEffect } from "react";
import { getRealmForSubject, getGalaxyStatusText } from "@/lib/narrativeEngine";
import { getSubjectLabel } from "@/lib/subjectDisplay";

// ─── Tier config ──────────────────────────────────────────────────
const TIER = {
  exceeding:  { label: "Stellar",  emoji: "🏆", ring: "#fbbf24", glow: "#fbbf24", badge: "#78350f", badgeBg: "#fef3c7", orbitIdx: 0 },
  expected:   { label: "On Track", emoji: "⭐", ring: "#a78bfa", glow: "#a78bfa", badge: "#4c1d95", badgeBg: "#ede9fe", orbitIdx: 1 },
  developing: { label: "Building", emoji: "🌱", ring: "#34d399", glow: "#34d399", badge: "#065f46", badgeBg: "#d1fae5", orbitIdx: 2 },
};

// Orbit ring colours (from inner → outer): Stellar gold, On Track purple, Building green, Unexplored grey
const ORBIT_COLORS = [
  { stroke: "#fbbf2444", glow: "#fbbf24" },
  { stroke: "#a78bfa33", glow: "#a78bfa" },
  { stroke: "#34d39933", glow: "#34d399" },
  { stroke: "rgba(148,163,184,0.15)", glow: "#64748b" },
];

// ─── Per-realm vivid gradient palette ────────────────────────────
const REALM_PALETTE = {
  number_nebula:   { hi: "#818cf8", base: "#4338ca", atm: "#6366f1" },
  word_galaxy:     { hi: "#f472b6", base: "#be185d", atm: "#ec4899" },
  pattern_planet:  { hi: "#67e8f9", base: "#0e7490", atm: "#06b6d4" },
  code_breakers:   { hi: "#fb923c", base: "#c2410c", atm: "#f97316" },
  science_station: { hi: "#34d399", base: "#065f46", atm: "#10b981" },
  history_horizon: { hi: "#fbbf24", base: "#92400e", atm: "#f59e0b" },
  geography_grid:  { hi: "#60a5fa", base: "#1d4ed8", atm: "#3b82f6" },
  civic_command:   { hi: "#c084fc", base: "#6d28d9", atm: "#8b5cf6" },
  tech_terminal:   { hi: "#22d3ee", base: "#0e7490", atm: "#06b6d4" },
  expedition_base: { hi: "#86efac", base: "#15803d", atm: "#22c55e" },
  default:         { hi: "#94a3b8", base: "#334155", atm: "#64748b" },
};

function realmPalette(realm) {
  return REALM_PALETTE[realm?.id] || REALM_PALETTE.default;
}

// ─── Deterministic star field ────────────────────────────────────
const STARS = Array.from({ length: 90 }, (_, i) => ({
  x:  ((i * 97  + 11) % 100).toFixed(1),
  y:  ((i * 67  + 43) % 100).toFixed(1),
  r:  i % 9 === 0 ? 2.5 : i % 4 === 0 ? 1.8 : 1,
  op: (0.10 + (i % 7) * 0.05).toFixed(2),
}));

// Deterministic nebula patches
const NEBULAS = [
  { cx: 15,  cy: 25, rx: 180, ry: 120, color: "#6366f122" },
  { cx: 80,  cy: 70, rx: 200, ry: 140, color: "#ec489918" },
  { cx: 45,  cy: 85, rx: 160, ry: 100, color: "#0891b218" },
  { cx: 70,  cy: 15, rx: 150, ry: 90,  color: "#f59e0b14" },
  { cx: 5,   cy: 60, rx: 130, ry: 100, color: "#8b5cf618" },
];

// ─── Per-subject mastery aggregate ───────────────────────────────
function getAggregate(subject, masteryRecords) {
  const rows = masteryRecords.filter(r => r.subject === subject);
  const seen = rows.filter(r => (r.times_seen || 0) > 0);
  if (!seen.length) return { tier: null, avgScore: 0 };
  const avg  = seen.reduce((s, r) => s + (r.mastery_score ?? 0), 0) / seen.length;
  const tier =
    avg >= 0.80 ? "exceeding" :
    avg >= 0.70 ? "expected"  :
    avg >= 0.55 ? "developing" : null;
  return { tier, avgScore: Math.round(avg * 100) };
}

// ─── SVG mini-progress ring ──────────────────────────────────────
function MiniRing({ pct, size, stroke = 3, color }) {
  const r   = (size - stroke * 2) / 2;
  const c   = 2 * Math.PI * r;
  const off = c - (Math.min(pct, 100) / 100) * c;
  return (
    <svg width={size} height={size} aria-hidden="true"
      style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)", pointerEvents: "none" }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c.toFixed(2)} strokeDashoffset={off.toFixed(2)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.2s ease" }} />
    </svg>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────
function Pill({ icon, label, gold, color }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
      background: gold ? "rgba(251,191,36,0.15)" : color ? `${color}18` : "rgba(255,255,255,0.07)",
      border: gold ? "1px solid rgba(251,191,36,0.35)" : color ? `1px solid ${color}44` : "1px solid rgba(255,255,255,0.1)",
      borderRadius: 20, padding: "4px 12px",
      fontSize: 12, fontWeight: 600,
      color: gold ? "#fbbf24" : color ? `${color}ee` : "rgba(255,255,255,0.65)",
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span> {label}
    </div>
  );
}

// ─── Distribute N points evenly around a ring ────────────────────
function getOrbitPositions(count, ringRadius, centerX, centerY, offsetAngle = 0) {
  if (count === 0) return [];
  const step = (2 * Math.PI) / count;
  return Array.from({ length: count }, (_, i) => {
    const angle = offsetAngle + i * step - Math.PI / 2; // start from top
    return {
      x: centerX + ringRadius * Math.cos(angle),
      y: centerY + ringRadius * Math.sin(angle),
      angle: (angle * 180 / Math.PI),
    };
  });
}

// ─── Orbital Planet Node ─────────────────────────────────────────
function OrbitalPlanet({ planet, pos, isNext, orbSize, idx, onClick }) {
  const { subject, realm, tier, avgScore } = planet;
  const t      = tier ? TIER[tier] : null;
  const pal    = realmPalette(realm);
  const icon   = realm?.icon || "🪐";
  const label  = getSubjectLabel(subject);
  const hasData = tier !== null;
  const innerSize = orbSize - 6;

  return (
    <button
      className="galaxy-planet-node"
      data-idx={idx}
      onClick={onClick}
      aria-label={`${label}${t ? ` — ${t.label}` : " — unexplored"}. Start quest.`}
      style={{
        position: "absolute",
        left: pos.x - orbSize / 2,
        top: pos.y - orbSize / 2,
        width: orbSize,
        height: orbSize,
        cursor: "pointer",
        background: "none",
        border: "none",
        padding: 0,
        zIndex: 5,
        opacity: 0,
        transform: "scale(0.3)",
      }}
    >
      {/* Atmosphere glow */}
      {hasData && (
        <div style={{
          position: "absolute", inset: -8,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${pal.atm}35 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
      )}

      {/* Progress ring */}
      {hasData && <MiniRing pct={avgScore} size={orbSize} stroke={3} color={t?.ring || "#34d399"} />}

      {/* Planet sphere */}
      <div className="galaxy-planet-sphere" style={{
        position: "absolute", top: 3, left: 3,
        width: innerSize, height: innerSize,
        borderRadius: "50%",
        background: hasData
          ? `radial-gradient(circle at 30% 28%, ${pal.hi} 0%, ${pal.base} 60%, ${pal.base}cc 100%)`
          : `radial-gradient(circle at 30% 28%, ${pal.hi}bb 0%, ${pal.base}cc 60%, ${pal.base}99 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: orbSize >= 64 ? 24 : 20,
        boxShadow: hasData
          ? `inset -3px -3px 10px rgba(0,0,0,0.5), inset 2px 2px 6px rgba(255,255,255,0.15), 0 0 20px ${pal.atm}55`
          : `inset -2px -2px 8px rgba(0,0,0,0.4), inset 1px 1px 4px rgba(255,255,255,0.08), 0 0 12px ${pal.atm}22`,
        transition: "box-shadow 0.3s ease, transform 0.3s ease",
        willChange: "transform",
      }}>
        {/* Surface sheen */}
        <div style={{
          position: "absolute", top: "8%", left: "14%",
          width: "35%", height: "28%",
          borderRadius: "50%",
          background: hasData ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
          filter: "blur(3px)", pointerEvents: "none",
        }} />
        <span style={{ position: "relative", zIndex: 1, lineHeight: 1 }}>{icon}</span>
        {/* Unexplored fog */}
        {!hasData && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "rgba(8, 6, 20, 0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: 800, zIndex: 2,
          }}>?</div>
        )}
      </div>

      {/* Tier crown for Stellar */}
      {tier === "exceeding" && (
        <div style={{
          position: "absolute", top: -3, right: -3,
          fontSize: 13, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))", zIndex: 10,
        }}>🏆</div>
      )}

      {/* NEXT UP badge */}
      {isNext && (
        <div style={{
          position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
          background: `linear-gradient(90deg, ${pal.hi}, ${pal.atm})`,
          color: "#fff", fontSize: 8, fontWeight: 800, letterSpacing: "0.06em",
          padding: "2px 8px", borderRadius: 5, whiteSpace: "nowrap",
          boxShadow: `0 2px 8px ${pal.atm}66`,
        }}>NEXT UP</div>
      )}

      {/* Label below planet */}
      <div style={{
        position: "absolute",
        bottom: -20,
        left: "50%",
        transform: "translateX(-50%)",
        textAlign: "center",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}>
        <p style={{
          fontSize: 10, fontWeight: 700, margin: 0, lineHeight: 1.2,
          color: hasData ? "rgba(255,255,255,0.88)" : `${pal.atm}99`,
          textShadow: hasData ? `0 0 10px ${pal.atm}88` : `0 0 6px ${pal.atm}33`,
        }}>{label}</p>
        {hasData && (
          <p style={{
            fontSize: 9, fontWeight: 600, margin: "1px 0 0", lineHeight: 1,
            color: `${t?.ring || pal.atm}cc`,
          }}>{avgScore}%</p>
        )}
      </div>

    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────
export default function GalaxyMap({ scholar, subjects = [], masteryRecords = [], onLaunchQuest }) {
  const containerRef = useRef(null);
  const galaxyWrapRef = useRef(null);
  const yearLevel   = scholar?.year_level || scholar?.year || 1;
  const scholarName = scholar?.name || "Explorer";

  const planets = useMemo(() =>
    subjects.map(s => ({
      subject: s,
      realm: getRealmForSubject(s),
      ...getAggregate(s, masteryRecords),
    })),
    [subjects, masteryRecords]
  );

  const nextSubject = useMemo(() => {
    const candidates = planets.filter(p => p.tier !== "exceeding");
    if (!candidates.length) return null;
    return candidates.sort((a, b) => a.avgScore - b.avgScore)[0].subject;
  }, [planets]);

  // ─── Group planets by orbital ring ─────────────────────────────
  const orbits = useMemo(() => {
    const stellar   = planets.filter(p => p.tier === "exceeding");
    const onTrack   = planets.filter(p => p.tier === "expected");
    const building  = planets.filter(p => p.tier === "developing");
    const unexplored = planets.filter(p => p.tier === null);
    return [stellar, onTrack, building, unexplored].filter(g => g.length > 0);
  }, [planets]);

  // ─── Responsive sizing — fill available width on desktop ────────
  const totalPlanets = subjects.length;
  const mapSize = totalPlanets <= 6 ? 520 : totalPlanets <= 10 ? 600 : 660;
  const centerX = mapSize / 2;
  const centerY = mapSize / 2;
  const hubRadius = 44;
  const orbSize = totalPlanets <= 6 ? 72 : totalPlanets <= 10 ? 64 : 56;

  // Ring radii: evenly spaced from hub outward — more room between rings
  const maxRingCount = orbits.length;
  const ringStart = hubRadius + 60;
  const ringEnd = mapSize / 2 - orbSize / 2 - 22;
  const ringStep = maxRingCount > 1 ? (ringEnd - ringStart) / (maxRingCount - 1) : 0;

  const stellarCount    = planets.filter(p => p.tier === "exceeding").length;
  const discoveredCount = planets.filter(p => p.tier !== null).length;
  const statusMsg       = getGalaxyStatusText(scholarName, yearLevel, subjects.length, stellarCount);

  // ─── GSAP entrance animation ───────────────────────────────────
  useEffect(() => {
    let gsapModule;
    (async () => {
      try {
        gsapModule = await import("gsap");
        const gsap = gsapModule.gsap || gsapModule.default || gsapModule;
        if (!containerRef.current) return;

        // Entrance: stagger planet nodes
        const nodes = containerRef.current.querySelectorAll(".galaxy-planet-node");
        gsap.fromTo(nodes,
          { opacity: 0, scale: 0.3 },
          { opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: "back.out(1.4)", delay: 0.2 }
        );

        // Continuous float handled by CSS @keyframes (no GSAP overhead)
        // After entrance completes, add the float class
        const totalEntrance = 0.2 + nodes.length * 0.08 + 0.6;
        setTimeout(() => {
          nodes.forEach(n => n.classList.add("galaxy-float-active"));
        }, totalEntrance * 1000);

        // Fade in the hub
        const hub = containerRef.current.querySelector(".galaxy-hub");
        if (hub) {
          gsap.fromTo(hub,
            { opacity: 0, scale: 0.5 },
            { opacity: 1, scale: 1, duration: 0.8, ease: "elastic.out(1, 0.5)" }
          );
        }

        // Orbit rings draw-in
        const rings = containerRef.current.querySelectorAll(".orbit-ring-circle");
        rings.forEach((ring) => {
          const len = ring.getTotalLength?.() || 0;
          if (len) {
            gsap.fromTo(ring,
              { strokeDasharray: len, strokeDashoffset: len },
              { strokeDashoffset: 0, duration: 1.4, ease: "power2.out", delay: 0.1 }
            );
          }
        });

      } catch (_) { /* GSAP not available — elements stay visible via CSS fallback */ }
    })();
  }, [planets.length]);

  // Responsive scaling: set --galaxy-scale CSS var based on wrapper width
  useEffect(() => {
    const wrap = galaxyWrapRef.current;
    if (!wrap) return;
    const update = () => {
      const w = wrap.clientWidth;
      const scale = Math.min(1, w / mapSize);
      wrap.style.setProperty("--galaxy-scale", scale.toFixed(4));
      wrap.style.height = `${mapSize * scale}px`;
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ro) ro.observe(wrap);
    return () => { if (ro) ro.disconnect(); };
  }, [mapSize]);

  // Build a flat list of all positioned planets for rendering
  const positioned = useMemo(() => {
    const result = [];
    let globalIdx = 0;
    orbits.forEach((group, orbitIdx) => {
      const radius = maxRingCount === 1 ? (ringStart + ringEnd) / 2 : ringStart + orbitIdx * ringStep;
      const offsetAngle = orbitIdx * 0.35; // stagger start angles per ring
      const positions = getOrbitPositions(group.length, radius, centerX, centerY, offsetAngle);
      group.forEach((planet, i) => {
        result.push({ planet, pos: positions[i], orbitIdx, idx: globalIdx++ });
      });
    });
    return result;
  }, [orbits, centerX, centerY, ringStart, ringEnd, ringStep, maxRingCount]);

  return (
    <div style={{
      background: "linear-gradient(160deg, #06041a 0%, #0d0b2e 30%, #0a1628 65%, #050d1a 100%)",
      borderRadius: 22,
      position: "relative", overflow: "hidden",
      padding: "22px 20px 24px",
    }}>

      {/* Nebula background */}
      <svg aria-hidden="true" style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", borderRadius: 22,
      }} preserveAspectRatio="none">
        <defs>
          <filter id="gblur8"><feGaussianBlur stdDeviation="8"/></filter>
        </defs>
        {NEBULAS.map((n, i) => (
          <ellipse key={i}
            cx={`${n.cx}%`} cy={`${n.cy}%`}
            rx={n.rx} ry={n.ry}
            fill={n.color} filter="url(#gblur8)"
          />
        ))}
      </svg>

      {/* Star field */}
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 22,
      }}>
        {STARS.map((s, i) => (
          <div key={i} style={{
            position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
            width: s.r, height: s.r, borderRadius: "50%",
            background: "#fff", opacity: s.op,
          }} />
        ))}
      </div>

      {/* Header */}
      <div style={{ position: "relative", zIndex: 2, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.4)", textTransform: "uppercase", margin: 0,
          }}>
            🌌 Galaxy Command
          </p>
          <div style={{
            height: 1, flex: 1,
            background: "linear-gradient(90deg, rgba(255,255,255,0.12), transparent)",
          }} />
        </div>
        <p style={{
          fontSize: 13, color: "rgba(255,255,255,0.78)", fontWeight: 500,
          lineHeight: 1.5, maxWidth: 560, marginBottom: 12,
          textShadow: "0 1px 8px rgba(0,0,0,0.5)",
        }}>
          {statusMsg}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Pill icon="⭐" label={`${(scholar?.total_xp || 0).toLocaleString()} XP`} color="#818cf8" />
          <Pill icon="🔥" label={`${scholar?.streak || 0} day${(scholar?.streak || 0) !== 1 ? "s" : ""} streak`} color="#fb923c" />
          <Pill icon="🌍" label={`${discoveredCount}/${subjects.length} discovered`} color="#34d399" />
          {stellarCount > 0 && <Pill icon="🏆" label={`${stellarCount} mastered`} gold />}
        </div>
      </div>

      {/* ═══ Orbital Map — responsive wrapper scales on small screens ═══ */}
      <div ref={galaxyWrapRef} style={{
        position: "relative", zIndex: 2,
        width: "100%", maxWidth: mapSize,
        margin: "0 auto",
        overflow: "visible",
      }}>
      <div
        ref={containerRef}
        style={{
          position: "absolute", inset: 0,
          width: mapSize, height: mapSize,
          transformOrigin: "top left",
          transform: `scale(var(--galaxy-scale, 1))`,
        }}
      >
        {/* SVG orbital rings + decorative dots */}
        <svg
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          viewBox={`0 0 ${mapSize} ${mapSize}`}
        >
          <defs>
            <filter id="orbitGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Concentric orbit rings */}
          {orbits.map((_, orbitIdx) => {
            const radius = maxRingCount === 1
              ? (ringStart + ringEnd) / 2
              : ringStart + orbitIdx * ringStep;
            const oc = ORBIT_COLORS[
              orbits.length === 1 ? 0 :
              orbits.length === 2 ? (orbitIdx === 0 ? 0 : 3) :
              orbits.length === 3 ? [0, 1, 3][orbitIdx] :
              orbitIdx
            ] || ORBIT_COLORS[3];
            return (
              <circle
                key={`ring-${orbitIdx}`}
                className="orbit-ring-circle"
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke={oc.stroke}
                strokeWidth={1.2}
                strokeDasharray="4 6"
                filter="url(#orbitGlow)"
              />
            );
          })}

          {/* Faint radial grid lines for depth */}
          {[0, 60, 120, 180, 240, 300].map(deg => {
            const rad = (deg * Math.PI) / 180;
            const outerR = ringEnd + 10;
            return (
              <line
                key={`rad-${deg}`}
                x1={centerX}
                y1={centerY}
                x2={centerX + outerR * Math.cos(rad)}
                y2={centerY + outerR * Math.sin(rad)}
                stroke="rgba(255,255,255,0.03)"
                strokeWidth={0.5}
              />
            );
          })}
        </svg>

        {/* Central Hub */}
        <div
          className="galaxy-hub"
          style={{
            position: "absolute",
            left: centerX - hubRadius,
            top: centerY - hubRadius,
            width: hubRadius * 2,
            height: hubRadius * 2,
            borderRadius: "50%",
            background: "radial-gradient(circle at 40% 35%, #1e1b4b 0%, #0f0e2a 50%, #06041a 100%)",
            border: "2px solid rgba(139,92,246,0.4)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            zIndex: 6,
            boxShadow: "0 0 40px rgba(139,92,246,0.2), inset 0 0 20px rgba(139,92,246,0.15)",
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>🚀</span>
          <p style={{
            fontSize: 8, fontWeight: 800, letterSpacing: "0.08em",
            color: "rgba(255,255,255,0.65)", margin: "2px 0 0",
            textTransform: "uppercase",
          }}>HQ</p>
        </div>

        {/* Planet nodes */}
        {positioned.map(({ planet, pos, idx }) => (
          <OrbitalPlanet
            key={planet.subject}
            planet={planet}
            pos={pos}
            isNext={nextSubject === planet.subject}
            orbSize={orbSize}
            idx={idx}
            onClick={() => onLaunchQuest(planet.subject)}
          />
        ))}
      </div>
      {/* Close responsive wrapper */}
      </div>

      {/* Legend */}
      <div style={{
        position: "relative", zIndex: 2,
        display: "flex", flexWrap: "wrap", gap: 16,
        justifyContent: "center",
        marginTop: 18, paddingTop: 14,
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}>
        {[
          { color: "#fbbf24", label: "Stellar"    },
          { color: "#a78bfa", label: "On Track"   },
          { color: "#34d399", label: "Building"   },
          { color: "rgba(255,255,255,0.18)", label: "Unexplored" },
        ].map(x => (
          <div key={x.label} style={{
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.38)",
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: x.color,
              boxShadow: x.color !== "rgba(255,255,255,0.18)" ? `0 0 6px ${x.color}` : "none",
            }} />
            {x.label}
          </div>
        ))}
      </div>

      {/* CSS fallback + hover + float — no per-frame GSAP overhead */}
      <style>{`
        @keyframes galaxyPlanetFadeIn {
          from { opacity: 0; transform: scale(0.3); }
          to   { opacity: 1; transform: scale(1); }
        }
        .galaxy-planet-node {
          animation: galaxyPlanetFadeIn 0.5s ease-out forwards;
          animation-delay: calc(var(--idx, 0) * 0.08s);
          will-change: transform, opacity;
        }
        ${positioned.map(({ idx }) =>
          `.galaxy-planet-node[data-idx="${idx}"] { --idx: ${idx}; --float-dur: ${3 + (idx % 4) * 0.5}s; --float-y: ${3 + (idx % 3) * 1.5}px; --float-delay: ${(idx * 0.15).toFixed(2)}s; }`
        ).join("\n")}

        /* CSS-only float replaces GSAP continuous tweens — zero JS overhead */
        @keyframes galaxyFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(calc(-1 * var(--float-y, 3px))); }
        }
        .galaxy-float-active {
          animation: galaxyFloat var(--float-dur, 3s) ease-in-out infinite !important;
          animation-delay: var(--float-delay, 0s) !important;
        }

        /* Planet hover — pure CSS, no per-node inline styles */
        .galaxy-planet-node:hover .galaxy-planet-sphere {
          transform: scale(1.12);
          filter: brightness(1.15);
        }

        @keyframes orbitPulse {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        .orbit-ring-circle {
          animation: orbitPulse 4s ease-in-out infinite;
        }

        .galaxy-hub {
          animation: galaxyPlanetFadeIn 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
