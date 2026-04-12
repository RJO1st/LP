"use client";
/**
 * VisualOptionDetectors.jsx — Shared visual option detection + rendering
 *
 * Centralises all "option-as-visual" logic so KS1QuizShell and KS2QuizShell
 * can import a single module instead of duplicating helpers.
 *
 * Pattern: detect(options) → boolean, then render grid of visual buttons.
 * Each detector checks if ≥2 MCQ options match a parseable pattern.
 *
 * Supported visual types:
 *   1. Clock faces   — time strings → analogue clocks
 *   2. Fraction pies — "1/2", "3/4" → segmented pie/bar SVGs
 *   3. Money         — "£1.50", "₦200" → coin/note illustrations
 *   4. Shapes        — "triangle", "hexagon" → labelled shape SVGs
 *
 * Detection logic imported from src/lib/visualDetectors.js (single source of truth).
 */

import React from "react";
import {
  optText,
  parseTimeOption,
  isTimeOptions,
  WORD_FRACS,
  parseFractionOption,
  isFractionOptions,
  CURRENCY_REGEX,
  parseMoneyOption,
  isMoneyOptions,
  SHAPE_MAP,
  parseShapeOption,
  isShapeOptions,
  parsePlaceValueQuestion,
  resolveVisualType,
  resolveVisualOptions,
} from "../../lib/visualDetectors.js";

export function ClockFaceSVG({ hours = 0, minutes = 0, size = 86 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.41;
  const toXY = (a, rad) => ({ x: cx + rad * Math.cos((a * Math.PI) / 180), y: cy + rad * Math.sin((a * Math.PI) / 180) });
  const minAngle = (minutes / 60) * 360 - 90;
  const hrAngle = ((hours % 12) / 12) * 360 + (minutes / 60) * 30 - 90;
  const hrTip = toXY(hrAngle, r * 0.53);
  const minTip = toXY(minAngle, r * 0.74);
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = i * 30 - 90;
    const outer = toXY(a, r * 0.92);
    const inner = toXY(a, r * 0.78);
    return <line key={i} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke="#a78bfa" strokeWidth={i % 3 === 0 ? 1.5 : 0.8} opacity={i % 3 === 0 ? 0.9 : 0.4} />;
  });
  const labels = [[12, 0], [3, 90], [6, 180], [9, 270]].map(([num, a]) => {
    const pos = toXY(a - 90, r * 0.63);
    return <text key={num} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.12} fontWeight="700" fill="#c4b5fd" fontFamily="Orbitron,sans-serif">{num}</text>;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={cx} cy={cy} r={r} fill="#1e1260" stroke="#6d28d9" strokeWidth="1.5" />
      {ticks}
      {labels}
      <line x1={cx} y1={cy} x2={hrTip.x} y2={hrTip.y} stroke="#f8fafc" strokeWidth={size * 0.038} strokeLinecap="round" opacity={0.95} />
      <line x1={cx} y1={cy} x2={minTip.x} y2={minTip.y} stroke="#a78bfa" strokeWidth={size * 0.026} strokeLinecap="round" opacity={0.95} />
      <circle cx={cx} cy={cy} r={size * 0.038} fill="#a78bfa" />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════
   §3  FRACTION PIES
   ════════════════════════════════════════════════════════════ */

export function FractionPieSVG({ numerator = 1, denominator = 4, size = 80 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.4;
  // For denominators ≤ 12, draw a pie chart. For larger, draw a bar.
  if (denominator <= 12) {
    const slices = [];
    for (let i = 0; i < denominator; i++) {
      const startAngle = (i / denominator) * 360 - 90;
      const endAngle = ((i + 1) / denominator) * 360 - 90;
      const large = endAngle - startAngle > 180 ? 1 : 0;
      const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
      const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
      const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
      const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
      const filled = i < (numerator % denominator === 0 && numerator > 0 ? denominator : numerator % denominator);
      // For improper fractions: fill all if numerator >= denominator
      const isFilled = numerator >= denominator ? true : i < numerator;
      slices.push(
        <path
          key={i}
          d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
          fill={isFilled ? "#a78bfa" : "rgba(167,139,250,0.12)"}
          stroke="#6d28d9"
          strokeWidth="1"
        />
      );
    }
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        <circle cx={cx} cy={cy} r={r + 1} fill="#1e1260" stroke="#4c1d95" strokeWidth="1.5" />
        {slices}
        <circle cx={cx} cy={cy} r={size * 0.04} fill="#c4b5fd" />
      </svg>
    );
  }
  // Bar fallback for large denominators
  const barW = size * 0.85, barH = size * 0.22;
  const bx = (size - barW) / 2, by = (size - barH) / 2;
  const fillW = (Math.min(numerator, denominator) / denominator) * barW;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <rect x={bx} y={by} width={barW} height={barH} rx={4} fill="rgba(167,139,250,0.12)" stroke="#6d28d9" strokeWidth="1" />
      <rect x={bx} y={by} width={fillW} height={barH} rx={4} fill="#a78bfa" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.14} fill="#c4b5fd" fontWeight="700" fontFamily="Orbitron,sans-serif">
        {numerator}/{denominator}
      </text>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════
   §4  MONEY / CURRENCY
   ════════════════════════════════════════════════════════════ */

/**
 * CoinSVG — simple coin illustration for £/₦/$
 * Renders a circle with currency symbol and value label.
 */
export function CoinSVG({ currency = "GBP", value = 1, label, size = 72 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.42;
  const COIN_THEMES = {
    GBP: { fill: "#fbbf24", stroke: "#d97706", textCol: "#78350f", symbol: "£" },
    NGN: { fill: "#34d399", stroke: "#059669", textCol: "#064e3b", symbol: "₦" },
    USD: { fill: "#60a5fa", stroke: "#2563eb", textCol: "#1e3a5f", symbol: "$" },
  };
  const theme = COIN_THEMES[currency] || COIN_THEMES.GBP;
  const displayVal = label || `${theme.symbol}${value}`;
  // Show compact label: for pence just show "50p", for whole numbers "£5", for decimals "£1.50"
  const shortLabel = label || (
    currency === "GBP" && value < 1
      ? `${Math.round(value * 100)}p`
      : `${theme.symbol}${Number.isInteger(value) ? value : value.toFixed(2)}`
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      {/* Outer ring (coin edge) */}
      <circle cx={cx} cy={cy} r={r} fill={theme.fill} stroke={theme.stroke} strokeWidth="2" />
      {/* Inner ring detail */}
      <circle cx={cx} cy={cy} r={r * 0.82} fill="none" stroke={theme.stroke} strokeWidth="0.8" opacity="0.4" />
      {/* Currency value */}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.22} fontWeight="900" fill={theme.textCol}
        fontFamily="'Nunito','Orbitron',sans-serif"
      >
        {shortLabel}
      </text>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════
   §5  GEOMETRY SHAPES (as option visuals)
   ════════════════════════════════════════════════════════════ */

/**
 * ShapeSVG — renders a simple labelled 2D shape.
 */
export function ShapeSVG({ shape = "circle", size = 72 }) {
  const cx = size / 2, cy = size / 2;
  const S = { fill: "rgba(167,139,250,0.18)", stroke: "#a78bfa", strokeWidth: "1.5" };
  const viewBox = `0 0 ${size} ${size}`;
  const m = size * 0.14; // margin
  const w = size - m * 2;

  const polygon = (sides, startAngle = -90) => {
    const r = w * 0.45;
    return Array.from({ length: sides }, (_, i) => {
      const a = ((i / sides) * 360 + startAngle) * (Math.PI / 180);
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(" ");
  };

  switch (shape) {
    case "circle":
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><circle cx={cx} cy={cy} r={w * 0.43} {...S} /></svg>;
    case "oval":
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><ellipse cx={cx} cy={cy} rx={w * 0.46} ry={w * 0.3} {...S} /></svg>;
    case "semicircle":
      return (
        <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}>
          <path d={`M${m},${cy + w * 0.1} A${w * 0.43},${w * 0.43} 0 0 1 ${size - m},${cy + w * 0.1} Z`} {...S} />
        </svg>
      );
    case "triangle":
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><polygon points={polygon(3)} {...S} /></svg>;
    case "square":
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><rect x={m + w * 0.07} y={m + w * 0.07} width={w * 0.86} height={w * 0.86} {...S} /></svg>;
    case "rectangle":
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><rect x={m} y={m + w * 0.18} width={w} height={w * 0.64} rx={1} {...S} /></svg>;
    case "pentagon":
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><polygon points={polygon(5)} {...S} /></svg>;
    case "hexagon":
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><polygon points={polygon(6)} {...S} /></svg>;
    case "heptagon":
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><polygon points={polygon(7)} {...S} /></svg>;
    case "octagon":
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><polygon points={polygon(8)} {...S} /></svg>;
    case "nonagon":
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><polygon points={polygon(9)} {...S} /></svg>;
    case "decagon":
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><polygon points={polygon(10)} {...S} /></svg>;
    case "rhombus": {
      const r = w * 0.44;
      const pts = `${cx},${cy - r} ${cx + r * 0.7},${cy} ${cx},${cy + r} ${cx - r * 0.7},${cy}`;
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><polygon points={pts} {...S} /></svg>;
    }
    case "parallelogram": {
      const off = w * 0.15;
      const pts = `${m + off},${m + w * 0.2} ${size - m},${m + w * 0.2} ${size - m - off},${size - m - w * 0.2} ${m},${size - m - w * 0.2}`;
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><polygon points={pts} {...S} /></svg>;
    }
    case "trapezium": {
      const tW = w * 0.3, bW = w * 0.5;
      const pts = `${cx - tW},${m + w * 0.15} ${cx + tW},${m + w * 0.15} ${cx + bW},${size - m - w * 0.15} ${cx - bW},${size - m - w * 0.15}`;
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><polygon points={pts} {...S} /></svg>;
    }
    case "kite": {
      const pts = `${cx},${cy - w * 0.45} ${cx + w * 0.3},${cy - w * 0.05} ${cx},${cy + w * 0.45} ${cx - w * 0.3},${cy - w * 0.05}`;
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><polygon points={pts} {...S} /></svg>;
    }
    case "star": {
      const outer = w * 0.45, inner = w * 0.18;
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = ((i * 36) - 90) * (Math.PI / 180);
        const rr = i % 2 === 0 ? outer : inner;
        return `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
      }).join(" ");
      return <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}><polygon points={pts} {...S} /></svg>;
    }
    case "cube":
      return (
        <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}>
          <polygon points={`${cx - w * 0.2},${cy - w * 0.3} ${cx + w * 0.25},${cy - w * 0.3} ${cx + w * 0.25},${cy + w * 0.15} ${cx - w * 0.2},${cy + w * 0.15}`} {...S} />
          <polygon points={`${cx + w * 0.25},${cy - w * 0.3} ${cx + w * 0.4},${cy - w * 0.42} ${cx + w * 0.4},${cy + w * 0.03} ${cx + w * 0.25},${cy + w * 0.15}`} fill="rgba(167,139,250,0.1)" stroke="#a78bfa" strokeWidth="1.5" />
          <polygon points={`${cx - w * 0.2},${cy - w * 0.3} ${cx - w * 0.05},${cy - w * 0.42} ${cx + w * 0.4},${cy - w * 0.42} ${cx + w * 0.25},${cy - w * 0.3}`} fill="rgba(167,139,250,0.06)" stroke="#a78bfa" strokeWidth="1.5" />
        </svg>
      );
    case "sphere":
      return (
        <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}>
          <circle cx={cx} cy={cy} r={w * 0.4} {...S} />
          <ellipse cx={cx} cy={cy} rx={w * 0.4} ry={w * 0.12} fill="none" stroke="#a78bfa" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.5" />
        </svg>
      );
    case "cylinder":
      return (
        <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}>
          <rect x={cx - w * 0.22} y={cy - w * 0.25} width={w * 0.44} height={w * 0.5} fill="rgba(167,139,250,0.18)" stroke="#a78bfa" strokeWidth="1.5" />
          <ellipse cx={cx} cy={cy - w * 0.25} rx={w * 0.22} ry={w * 0.09} fill="rgba(167,139,250,0.25)" stroke="#a78bfa" strokeWidth="1.5" />
          <ellipse cx={cx} cy={cy + w * 0.25} rx={w * 0.22} ry={w * 0.09} fill="rgba(167,139,250,0.18)" stroke="#a78bfa" strokeWidth="1.5" />
        </svg>
      );
    case "cone":
      return (
        <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}>
          <polygon points={`${cx},${cy - w * 0.38} ${cx + w * 0.28},${cy + w * 0.25} ${cx - w * 0.28},${cy + w * 0.25}`} {...S} />
          <ellipse cx={cx} cy={cy + w * 0.25} rx={w * 0.28} ry={w * 0.09} fill="rgba(167,139,250,0.18)" stroke="#a78bfa" strokeWidth="1.5" />
        </svg>
      );
    case "pyramid":
      return (
        <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}>
          <polygon points={`${cx},${cy - w * 0.38} ${cx + w * 0.35},${cy + w * 0.2} ${cx - w * 0.1},${cy + w * 0.3}`} {...S} />
          <polygon points={`${cx},${cy - w * 0.38} ${cx - w * 0.1},${cy + w * 0.3} ${cx - w * 0.35},${cy + w * 0.08}`} fill="rgba(167,139,250,0.1)" stroke="#a78bfa" strokeWidth="1.5" />
          <line x1={cx - w * 0.35} y1={cy + w * 0.08} x2={cx + w * 0.35} y2={cy + w * 0.2} stroke="#a78bfa" strokeWidth="1" opacity="0.5" />
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox={viewBox} style={{ display: "block" }}>
          <circle cx={cx} cy={cy} r={w * 0.35} fill="rgba(167,139,250,0.08)" stroke="#a78bfa" strokeWidth="1" strokeDasharray="4 2" />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.13} fill="#a78bfa" fontWeight="600">?</text>
        </svg>
      );
  }
}

/* ════════════════════════════════════════════════════════════
   §6  PLACE VALUE (Dienes blocks) — question-level visual
   ════════════════════════════════════════════════════════════ */

/**
 * PlaceValueBlockVis — renders Dienes blocks (hundreds flat, tens rod, ones cube)
 * for a given number. Displays above the question text.
 */
export function PlaceValueBlockVis({ number = 0, size = 200 }) {
  if (number < 0 || number > 9999) return null;
  const thousands = Math.floor(number / 1000);
  const hundreds = Math.floor((number % 1000) / 100);
  const tens = Math.floor((number % 100) / 10);
  const ones = number % 10;

  const blockSize = 8;
  const gap = 2;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, padding: "8px 4px", flexWrap: "wrap", justifyContent: "center" }}>
      {/* Thousands — large cube */}
      {thousands > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: thousands }, (_, i) => (
              <div key={`th-${i}`} style={{
                width: blockSize * 3, height: blockSize * 3, borderRadius: 2,
                background: "linear-gradient(135deg, #f472b6, #ec4899)",
                border: "1px solid #be185d", boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3)",
              }} />
            ))}
          </div>
          <span style={{ fontSize: 9, color: "#f9a8d4", fontWeight: 700 }}>{thousands}000</span>
        </div>
      )}
      {/* Hundreds — flat square */}
      {hundreds > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", maxWidth: 80 }}>
            {Array.from({ length: hundreds }, (_, i) => (
              <div key={`h-${i}`} style={{
                width: blockSize * 2.5, height: blockSize * 2.5, borderRadius: 2,
                background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                border: "1px solid #5b21b6", boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3)",
              }} />
            ))}
          </div>
          <span style={{ fontSize: 9, color: "#c4b5fd", fontWeight: 700 }}>{hundreds}00</span>
        </div>
      )}
      {/* Tens — vertical rod */}
      {tens > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
            {Array.from({ length: tens }, (_, i) => (
              <div key={`t-${i}`} style={{
                width: blockSize, height: blockSize * 2.5, borderRadius: 2,
                background: "linear-gradient(180deg, #38bdf8, #0284c7)",
                border: "1px solid #0369a1", boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3)",
              }} />
            ))}
          </div>
          <span style={{ fontSize: 9, color: "#7dd3fc", fontWeight: 700 }}>{tens}0</span>
        </div>
      )}
      {/* Ones — small cube */}
      {ones > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ display: "flex", gap: 2, flexWrap: "wrap", maxWidth: 50 }}>
            {Array.from({ length: ones }, (_, i) => (
              <div key={`o-${i}`} style={{
                width: blockSize, height: blockSize, borderRadius: 1,
                background: "linear-gradient(135deg, #fbbf24, #d97706)",
                border: "1px solid #b45309", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.3)",
              }} />
            ))}
          </div>
          <span style={{ fontSize: 9, color: "#fcd34d", fontWeight: 700 }}>{ones}</span>
        </div>
      )}
      {number === 0 && (
        <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>0</span>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   §7  MASTER RESOLVER — detects which visual type fits options
   ════════════════════════════════════════════════════════════ */

// resolveVisualOptions exported from visualDetectors.js

/* ════════════════════════════════════════════════════════════
   §8  OPTION GRID RENDERERS (theme-aware: KS1 vs KS2)
   ════════════════════════════════════════════════════════════ */

/**
 * renderVisualSVG — returns the appropriate SVG for one option
 */
function renderVisualSVG(type, str, svgSize) {
  switch (type) {
    case "clock": {
      const t = parseTimeOption(str);
      return t ? <ClockFaceSVG hours={t.hours} minutes={t.minutes} size={svgSize} /> : null;
    }
    case "fraction": {
      const f = parseFractionOption(str);
      return f ? <FractionPieSVG numerator={f.numerator} denominator={f.denominator} size={svgSize} /> : null;
    }
    case "money": {
      const m = parseMoneyOption(str);
      return m ? <CoinSVG currency={m.currency} value={m.value} label={m.label} size={svgSize} /> : null;
    }
    case "shape": {
      const sh = parseShapeOption(str);
      return sh ? <ShapeSVG shape={sh.shape} size={svgSize} /> : null;
    }
    default:
      return null;
  }
}

/**
 * VisualOptionGrid — unified grid renderer that works for both KS1 and KS2.
 *
 * Props:
 *   - options: the MCQ options array
 *   - visualType: "clock" | "fraction" | "money" | "shape"
 *   - selectedAnswer: currently selected index
 *   - showResult: boolean
 *   - isCorrect: boolean (was the selected answer correct?)
 *   - onSelect: (index) => void
 *   - correctIndex: (KS1 only) the correct answer index — used to highlight green on reveal
 *   - theme: "ks1" | "ks2" — controls color scheme
 */
const KS1_OPTION_COLORS = [
  { border: "#fbbf24", glow: "rgba(251,191,36,0.2)" },
  { border: "#a855f7", glow: "rgba(168,85,247,0.2)" },
  { border: "#38bdf8", glow: "rgba(56,189,248,0.2)" },
  { border: "#34d399", glow: "rgba(52,211,153,0.2)" },
];

export function VisualOptionGrid({
  options, visualType, selectedAnswer, showResult, isCorrect,
  onSelect, correctIndex, theme = "ks2",
}) {
  const CYAN = "#22d3ee";
  const svgSize = 76;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, flex: 1 }}>
      {options.map((opt, i) => {
        const str = optText(opt);
        const selected = selectedAnswer === i;
        // KS1: highlight correct answer on reveal. KS2: only highlight selected.
        const isCorrectOpt = correctIndex != null ? i === correctIndex : false;
        const correct = showResult && ((isCorrect && selected) || isCorrectOpt);
        const wrong = showResult && selected && !isCorrect && !isCorrectOpt;

        let borderCol, bgCol, shadow = "none";

        if (theme === "ks1") {
          const col = KS1_OPTION_COLORS[i] || KS1_OPTION_COLORS[0];
          borderCol = `${col.border}20`;
          bgCol = `${col.border}04`;
          if (selected && !showResult) { borderCol = `${col.border}60`; bgCol = `${col.border}10`; shadow = `0 0 16px ${col.glow}`; }
          if (correct) { borderCol = "#22c55e"; bgCol = "rgba(34,197,94,0.1)"; shadow = "0 0 16px rgba(34,197,94,0.2)"; }
          if (wrong) { borderCol = "#ef4444"; bgCol = "rgba(239,68,68,0.1)"; shadow = "0 0 12px rgba(239,68,68,0.15)"; }
        } else {
          borderCol = `${CYAN}20`;
          bgCol = `${CYAN}04`;
          if (selected && !showResult) { borderCol = `${CYAN}55`; bgCol = `${CYAN}0a`; shadow = `0 0 12px ${CYAN}20`; }
          if (correct) { borderCol = "#22c55e"; bgCol = "rgba(34,197,94,0.1)"; shadow = "0 0 12px rgba(34,197,94,0.2)"; }
          if (wrong) { borderCol = "#ef4444"; bgCol = "rgba(239,68,68,0.1)"; shadow = "none"; }
        }

        const visual = renderVisualSVG(visualType, str, svgSize);

        return (
          <button key={i} onClick={() => !showResult && onSelect?.(i)}
            style={{
              borderRadius: theme === "ks1" ? 12 : 4,
              background: bgCol,
              border: `1.5px solid ${borderCol}`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 4, padding: "8px 4px",
              cursor: showResult ? "default" : "pointer",
              transition: "all 0.15s ease",
              position: "relative",
              boxShadow: shadow,
            }}>
            {correct && <span style={{ position: "absolute", top: 4, right: 6, fontSize: 12 }}>✅</span>}
            {wrong && <span style={{ position: "absolute", top: 4, right: 6, fontSize: 12 }}>❌</span>}
            {visual || (
              <div style={{
                height: svgSize, width: svgSize, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: "#e2e8f0", fontWeight: 700, textAlign: "center",
              }}>{str}</div>
            )}
            <span style={{
              fontSize: 11, fontWeight: 800, textAlign: "center", lineHeight: 1.2,
              color: theme === "ks1" ? "#fff" : "#e2e8f0",
            }}>{str}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   §9  RE-EXPORTS — ensure backward compatibility
   ════════════════════════════════════════════════════════════ */

// Re-export detection functions so consumers don't break
export {
  resolveVisualOptions,
  resolveVisualType,
  parseTimeOption,
  parseFractionOption,
  parseMoneyOption,
  parseShapeOption,
  parsePlaceValueQuestion,
};
