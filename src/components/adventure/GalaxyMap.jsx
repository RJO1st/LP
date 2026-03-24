"use client";
/**
 * GalaxyMap.jsx
 * Deploy to: src/components/adventure/GalaxyMap.jsx
 *
 * Scholar-facing galaxy map replacing the SubjectCard grid (ROW 2).
 * • Planets fill the full container width at any subject count
 * • Vivid atmospheric planet orbs — each realm has its own colour palette
 * • Dynamic grid: 3 cols for ≤6 subjects, 4 for ≤8, 5 for ≤10, 6 for 12+
 * • Explored planets glow + progress ring; unexplored are misty/mysterious
 * • Tier (Building/On Track/Stellar) from scholar_topic_mastery records
 *
 * Props:
 *   scholar        — scholar row from Supabase
 *   subjects       — string[] of subject keys for this scholar
 *   masteryRecords — scholar_topic_mastery rows (all subjects, all tiers)
 *   onLaunchQuest  — (subjectKey: string) => void
 */

import React, { useMemo } from "react";
import { getRealmForSubject, getGalaxyStatusText } from "@/lib/narrativeEngine";
import { getSubjectLabel } from "@/lib/subjectDisplay";

// ─── Tier config ──────────────────────────────────────────────────
const TIER = {
  exceeding:  { label: "Stellar",  emoji: "🏆", ring: "#fbbf24", glow: "#fbbf24", badge: "#78350f", badgeBg: "#fef3c7" },
  expected:   { label: "On Track", emoji: "⭐", ring: "#a78bfa", glow: "#a78bfa", badge: "#4c1d95", badgeBg: "#ede9fe" },
  developing: { label: "Building", emoji: "🌱", ring: "#34d399", glow: "#34d399", badge: "#065f46", badgeBg: "#d1fae5" },
};

// ─── Per-realm vivid gradient palette ────────────────────────────
// Two-stop gradient: highlight + base, plus an atmosphere colour
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
const STARS = Array.from({ length: 80 }, (_, i) => ({
  x:  ((i * 97  + 11) % 100).toFixed(1),
  y:  ((i * 67  + 43) % 100).toFixed(1),
  r:  i % 9 === 0 ? 2.5 : i % 4 === 0 ? 1.8 : 1,
  op: (0.12 + (i % 7) * 0.06).toFixed(2),
}));

// Deterministic nebula patches — colourful background clouds
const NEBULAS = [
  { cx: 15,  cy: 25, rx: 180, ry: 120, color: "#6366f133" },
  { cx: 80,  cy: 70, rx: 200, ry: 140, color: "#ec489922" },
  { cx: 45,  cy: 85, rx: 160, ry: 100, color: "#0891b222" },
  { cx: 70,  cy: 15, rx: 150, ry: 90,  color: "#f59e0b1a" },
  { cx: 5,   cy: 60, rx: 130, ry: 100, color: "#8b5cf622" },
];

// ─── SVG progress ring ────────────────────────────────────────────
function Ring({ pct, size, stroke = 4, color }) {
  const r   = (size - stroke * 2) / 2;
  const c   = 2 * Math.PI * r;
  const off = c - (Math.min(pct, 100) / 100) * c;
  return (
    <svg width={size} height={size} aria-hidden="true"
      style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)", pointerEvents: "none" }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c.toFixed(2)} strokeDashoffset={off.toFixed(2)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1.2s ease" }} />
    </svg>
  );
}

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

// ─── Column count from subject count ─────────────────────────────
function getColumns(n) {
  if (n <= 3)  return 3;
  if (n <= 4)  return 4;
  if (n <= 6)  return 3;
  if (n <= 8)  return 4;
  if (n <= 10) return 5;
  return 6;
}

// ─── Orb size from column count ──────────────────────────────────
function getOrbSize(cols) {
  if (cols <= 3) return 96;
  if (cols <= 4) return 88;
  if (cols <= 5) return 80;
  return 72;
}

// ─── Single planet card ───────────────────────────────────────────
function PlanetCard({ subject, realm, tier, avgScore, isNext, orbSize, onClick }) {
  const t      = tier ? TIER[tier] : null;
  const pal    = realmPalette(realm);
  const icon   = realm?.icon || "🪐";
  const label  = getSubjectLabel(subject);
  const rName  = realm?.name || "";
  const hasData = tier !== null;

  const orbInner = orbSize - 8; // inner orb leaves room for ring
  const fontSize = orbSize >= 90 ? 34 : orbSize >= 80 ? 30 : 26;

  // Card background: vivid tinted for explored, faint coloured for unexplored
  const cardBg = hasData
    ? `radial-gradient(ellipse at 50% 0%, ${pal.atm}30 0%, ${pal.atm}08 100%)`
    : `radial-gradient(ellipse at 50% 0%, ${pal.atm}14 0%, ${pal.atm}04 100%)`;
  const cardBorder = hasData
    ? (isNext ? `2px solid ${pal.atm}cc` : `1px solid ${pal.atm}44`)
    : (isNext ? `2px dashed rgba(255,255,255,0.3)` : `1px dashed ${pal.atm}33`);

  return (
    <button
      onClick={onClick}
      aria-label={`${label}${t ? ` — ${t.label}` : " — unexplored"}. Start quest.`}
      style={{
        position: "relative",
        background: cardBg,
        border: cardBorder,
        borderRadius: 18,
        padding: "16px 8px 14px",
        cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        boxShadow: hasData
          ? (isNext ? `0 0 28px ${pal.atm}55, 0 0 8px ${pal.atm}22` : `0 0 18px ${pal.atm}22`)
          : "none",
        WebkitTapHighlightColor: "transparent",
        minWidth: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-5px) scale(1.03)";
        e.currentTarget.style.boxShadow = `0 8px 32px ${pal.atm}55, 0 0 18px ${pal.atm}33`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = hasData
          ? (isNext ? `0 0 28px ${pal.atm}55, 0 0 8px ${pal.atm}22` : `0 0 18px ${pal.atm}22`)
          : "none";
      }}
    >
      {/* NEXT UP badge */}
      {isNext && (
        <div style={{
          position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
          background: `linear-gradient(90deg, ${pal.hi}, ${pal.atm})`,
          color: "#fff", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
          padding: "2px 10px", borderRadius: 6, whiteSpace: "nowrap",
          boxShadow: `0 2px 8px ${pal.atm}66`,
        }}>
          NEXT UP
        </div>
      )}

      {/* Planet orb */}
      <div style={{ position: "relative", width: orbSize, height: orbSize, flexShrink: 0 }}>
        {/* Outer atmosphere glow */}
        {hasData && (
          <div style={{
            position: "absolute", inset: -6,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${pal.atm}30 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />
        )}

        {/* Progress ring */}
        {hasData && <Ring pct={avgScore} size={orbSize} stroke={4} color={t?.ring || "#34d399"} />}

        {/* Planet sphere */}
        <div style={{
          position: "absolute",
          top: 4, left: 4,
          width: orbInner, height: orbInner,
          borderRadius: "50%",
          background: hasData
            ? `radial-gradient(circle at 30% 28%, ${pal.hi}ff 0%, ${pal.base}ff 60%, ${pal.base}cc 100%)`
            : `radial-gradient(circle at 30% 28%, ${pal.hi}bb 0%, ${pal.base}cc 60%, ${pal.base}99 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize,
          boxShadow: hasData
            ? `inset -4px -4px 12px rgba(0,0,0,0.5), inset 3px 3px 8px rgba(255,255,255,0.15), 0 0 24px ${pal.atm}55`
            : `inset -3px -3px 10px rgba(0,0,0,0.4), inset 2px 2px 6px rgba(255,255,255,0.08), 0 0 16px ${pal.atm}33`,
          transition: "all 0.3s ease",
        }}>
          {/* Surface sheen */}
          <div style={{
            position: "absolute", top: "8%", left: "14%",
            width: "35%", height: "30%",
            borderRadius: "50%",
            background: hasData ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
            filter: "blur(4px)",
            pointerEvents: "none",
          }} />
          <span style={{ position: "relative", zIndex: 1, lineHeight: 1 }}>{icon}</span>
          {/* Unexplored fog overlay */}
          {!hasData && (
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "rgba(8, 6, 20, 0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: orbSize >= 88 ? 18 : 15,
              color: "rgba(255,255,255,0.55)",
              fontWeight: 800,
              zIndex: 2,
            }}>
              ?
            </div>
          )}
        </div>

        {/* Tier crown overlay for Stellar */}
        {tier === "exceeding" && (
          <div style={{
            position: "absolute", top: -4, right: -4,
            fontSize: 16, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
            zIndex: 10,
          }}>🏆</div>
        )}
      </div>

      {/* Subject name */}
      <p style={{
        fontSize: orbSize >= 88 ? 12 : 11,
        fontWeight: 700, margin: 0, lineHeight: 1.3,
        textAlign: "center", width: "100%",
        color: hasData ? "rgba(255,255,255,0.92)" : `${pal.atm}cc`,
        textShadow: hasData ? `0 0 12px ${pal.atm}88` : `0 0 8px ${pal.atm}44`,
      }}>
        {label}
      </p>

      {/* Realm name */}
      {rName && orbSize >= 80 && (
        <p style={{
          fontSize: 9, fontWeight: 500, margin: "-4px 0 0", lineHeight: 1.2,
          textAlign: "center", width: "100%",
          color: hasData ? `${pal.atm}bb` : `${pal.atm}77`,
        }}>
          {rName}
        </p>
      )}

      {/* Tier badge */}
      {t ? (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          background: t.badgeBg, borderRadius: 5,
          padding: "2px 7px",
          fontSize: 10, fontWeight: 700, color: t.badge,
          boxShadow: `0 1px 4px rgba(0,0,0,0.2)`,
        }}>
          {t.emoji} {t.label}
        </div>
      ) : (
        <p style={{
          fontSize: 9, fontWeight: 600, margin: 0,
          color: "rgba(255,255,255,0.22)",
          fontStyle: "italic",
        }}>
          Unexplored
        </p>
      )}

      {/* Score */}
      {hasData && (
        <p style={{
          fontSize: 10, fontWeight: 700, margin: "-4px 0 0",
          color: `${pal.atm}cc`,
        }}>
          {avgScore}%
        </p>
      )}
    </button>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────
function Pill({ icon, label, gold, color }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
      background: gold
        ? "rgba(251,191,36,0.15)"
        : color
        ? `${color}18`
        : "rgba(255,255,255,0.07)",
      border: gold
        ? "1px solid rgba(251,191,36,0.35)"
        : color
        ? `1px solid ${color}44`
        : "1px solid rgba(255,255,255,0.1)",
      borderRadius: 20, padding: "4px 12px",
      fontSize: 12, fontWeight: 600,
      color: gold ? "#fbbf24" : color ? `${color}ee` : "rgba(255,255,255,0.65)",
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span> {label}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────
export default function GalaxyMap({ scholar, subjects = [], masteryRecords = [], onLaunchQuest }) {
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

  const stellarCount    = planets.filter(p => p.tier === "exceeding").length;
  const discoveredCount = planets.filter(p => p.tier !== null).length;
  const statusMsg       = getGalaxyStatusText(scholarName, yearLevel, subjects.length, stellarCount);

  const cols    = getColumns(subjects.length);
  const orbSize = getOrbSize(cols);

  return (
    <div style={{
      background: "linear-gradient(160deg, #06041a 0%, #0d0b2e 30%, #0a1628 65%, #050d1a 100%)",
      borderRadius: 22,
      position: "relative", overflow: "hidden",
      padding: "22px 20px 24px",
    }}>

      {/* Nebula background — SVG, position absolute */}
      <svg aria-hidden="true" style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", borderRadius: 22,
      }} preserveAspectRatio="none">
        <defs>
          <filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter>
        </defs>
        {NEBULAS.map((n, i) => (
          <ellipse key={i}
            cx={`${n.cx}%`} cy={`${n.cy}%`}
            rx={n.rx} ry={n.ry}
            fill={n.color} filter="url(#blur8)"
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
      <div style={{ position: "relative", zIndex: 2, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.4)", textTransform: "uppercase", margin: 0,
          }}>
            🌌 Your Galaxy
          </p>
          <div style={{
            height: 1, flex: 1,
            background: "linear-gradient(90deg, rgba(255,255,255,0.12), transparent)",
          }} />
        </div>
        <p style={{
          fontSize: 14, color: "rgba(255,255,255,0.82)", fontWeight: 500,
          lineHeight: 1.6, maxWidth: 560, marginBottom: 14,
          textShadow: "0 1px 8px rgba(0,0,0,0.5)",
        }}>
          {statusMsg}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Pill icon="⭐" label={`${(scholar?.total_xp || 0).toLocaleString()} XP`} color="#818cf8" />
          <Pill icon="🔥" label={`${scholar?.streak || 0} day${(scholar?.streak || 0) !== 1 ? "s" : ""} streak`} color="#fb923c" />
          <Pill icon="🌍" label={`${discoveredCount} / ${subjects.length} discovered`} color="#34d399" />
          {stellarCount > 0 && <Pill icon="🏆" label={`${stellarCount} mastered`} gold />}
        </div>
      </div>

      {/* Planet grid — fills full width */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 12,
        position: "relative", zIndex: 2,
      }}>
        {planets.map(({ subject, realm, tier, avgScore }) => (
          <PlanetCard
            key={subject}
            subject={subject}
            realm={realm}
            tier={tier}
            avgScore={avgScore}
            isNext={nextSubject === subject}
            orbSize={orbSize}
            onClick={() => onLaunchQuest(subject)}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{
        position: "relative", zIndex: 2,
        display: "flex", flexWrap: "wrap", gap: 16,
        marginTop: 18, paddingTop: 14,
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}>
        {[
          { color: "#34d399", label: "Building"   },
          { color: "#a78bfa", label: "On Track"   },
          { color: "#fbbf24", label: "Stellar"    },
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
    </div>
  );
}