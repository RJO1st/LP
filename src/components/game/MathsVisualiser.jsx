"use client";
// ─── MathsVisualiser.jsx ─────────────────────────────────────────────────────
// LaunchPard-native concrete visuals. Bright panels, WCAG AA accessible.
// Single file — split into MathsVisuals_Core + MathsVisuals_Tier2 caused
// Turbopack barrel-export resolution issues; merged back for reliability.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo } from "react";

// ─── EXTRACTED MODULE IMPORTS ────────────────────────────────────────────────
// These were extracted from this file for maintainability.
// Each module is self-contained with its own design tokens.
import { ForcesVis, VelocityVis, FoodChainVis, AtomVis, PeriodicTableVis, StateChangesVis, PHScaleVis, MoleculeVis, CellVis, PunnettVis, EnergyStoresVis, WaveVis, EMSpectrumVis, FreeBodyVis } from "./ScienceVisuals";
import { NVRShapeItem, NVRVis, NVRShapePropertyVis, NVRReflectionVis, NVRNetVis, NVRRotationVis, NVROddOneOutVis, NVRMatrixVis, NVRPaperFoldVis } from "./NVRVisuals";
import { CoordinateVis, AngleVis, AngleOnLineDiagram, TriangleAngleDiagram, AnglesAtPointDiagram, VerticallyOppositeDiagram, AreaVis, RulerVis, FormulaTriangleVis } from "./GeometryVisuals";
import { TAccountVis, BreakEvenVis, SupplyDemandVis, MotionGraphVis, CircuitVis, QuadraticVis, ElementVis } from "./BusinessVisuals";
import InteractiveGraph from "./InteractiveGraph";
import DataTable from "./DataTable";
import LongMultiplication from "./LongMultiplication";

const RX_NUM       = /\d+(?:\.\d+)?/g;                         // all numbers incl decimals
const RX_TWO_NUMS  = /(\d+)[^\d]+(\d+)/;                       // first two integers in text
const RX_UNITS     = /(?:cm|m{1,2}|km|in|ft)/i;               // length units
const RX_COORD     = /\((-?\d+),\s*(-?\d+)\)/;                 // (x, y) coordinate pair
const RX_DECIMAL_OP = /\d+\.\d+\s*[×x*]|[×x*]\s*\d+\.\d+/;  // decimal × something

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  // LaunchPard brand colours — used as accents on light background
  indigo:     "#4f46e5",
  indigoBg:   "#eef2ff",
  indigoBd:   "#c7d2fe",
  nebula:     "#9333ea",
  nebulaBg:   "#f5f3ff",
  nebulaBd:   "#ddd6fe",
  amber:      "#d97706",
  amberBg:    "#fffbeb",
  amberBd:    "#fde68a",
  emerald:    "#059669",
  emeraldBg:  "#ecfdf5",
  emeraldBd:  "#a7f3d0",
  rose:       "#e11d48",
  roseBg:     "#fff1f2",
  roseBd:     "#fecdd3",
  slate:      "#475569",
  slateBg:    "#f8fafc",
  slateBd:    "#e2e8f0",
  text:       "#1e293b",
  textMid:    "#64748b",
};

// ─── PANEL ────────────────────────────────────────────────────────────────────
// Light background — high contrast, colour-blind safe base
function Panel({ children, accent = T.indigo, bg, bd, ariaLabel }) {
  const panelBg = bg || "#ffffff";
  const panelBd = bd || `${accent}44`;
  return (
    <div
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      style={{
        background: panelBg,
        borderRadius: 16,
        border: `2px solid ${panelBd}`,
        boxShadow: `0 2px 12px ${accent}18`,
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}>
      {children}
    </div>
  );
}

// ─── ORBIT DOT — filled orb with strong border ────────────────────────────────
function Dot({ color, bg, border, size = 20, strikethrough = false }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: bg || color,
        border: `2.5px solid ${border || color}`,
        boxSizing: "border-box",
      }} />
      {strikethrough && (
        <svg
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          width={size} height={size}
        >
          <line
            x1={size * 0.15} y1={size * 0.85}
            x2={size * 0.85} y2={size * 0.15}
            stroke={T.rose} strokeWidth={2.5} strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}

// ─── DOT CLUSTER ─────────────────────────────────────────────────────────────
function DotCluster({ count, color, bg, border, size = 20, label }) {
  const safe = Math.min(count, 15);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      {label != null && (
        <span style={{
          fontSize: 13, fontWeight: 800, color,
          letterSpacing: 0.5,
        }}>{label}</span>
      )}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 4,
        maxWidth: safe > 5 ? 130 : 80,
        justifyContent: "center",
      }}>
        {Array.from({ length: safe }).map((_, i) => (
          <Dot key={i} color={color} bg={bg} border={border} size={size} />
        ))}
      </div>
    </div>
  );
}

// ─── LABEL CHIP ──────────────────────────────────────────────────────────────
function Chip({ children, color, bg }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      color, background: bg,
      borderRadius: 6, padding: "2px 7px",
      letterSpacing: 0.5,
    }}>
      {children}
    </span>
  );
}

// ─── OP SYMBOL ───────────────────────────────────────────────────────────────
function Op({ s }) {
  return (
    <span style={{ fontSize: 22, fontWeight: 700, color: T.slate, lineHeight: 1 }}>{s}</span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATHS VISUALS
// ═══════════════════════════════════════════════════════════════════════════════

// ADDITION ────────────────────────────────────────────────────────────────────
function AdditionVis({ a, b }) {
  const bridges = a + b > 10;
  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <DotCluster count={a} color={T.indigo} bg="#c7d2fe" border={T.indigo} label={a} />
        <Op s="+" />
        <DotCluster count={b} color={T.nebula} bg="#ddd6fe" border={T.nebula} label={b} />
      </div>
      {bridges && (
        <Chip color={T.amber} bg={T.amberBg}>bridges 10</Chip>
      )}
    </Panel>
  );
}

// SUBTRACTION — cross-out dots, not colour-only ───────────────────────────────
function SubtractionVis({ from, remove }) {
  const safe = Math.min(from, 15);
  const kept = safe - remove;
  return (
    <Panel accent={T.rose} bg={T.roseBg} bd={T.roseBd}>
      {/* Dots: kept = solid indigo, removed = faded + strikethrough */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxWidth: 210, justifyContent: "center" }}>
        {Array.from({ length: safe }).map((_, i) => (
          i < kept
            ? <Dot key={i} color={T.indigo} bg="#c7d2fe" border={T.indigo} size={22} />
            : <Dot key={i} color={T.textMid} bg="#f1f5f9" border="#cbd5e1" size={22} strikethrough />
        ))}
      </div>
      {/* Shape legend — no colour dependency */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Dot color={T.indigo} bg="#c7d2fe" border={T.indigo} size={14} />
          <span style={{ fontSize: 10, color: T.text, fontWeight: 600 }}>kept</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Dot color={T.textMid} bg="#f1f5f9" border="#cbd5e1" size={14} strikethrough />
          <span style={{ fontSize: 10, color: T.text, fontWeight: 600 }}>taken away</span>
        </div>
      </div>
    </Panel>
  );
}

// PLACE VALUE — Dienes blocks, light background ───────────────────────────────
function PlaceValueVis({ tens, ones }) {
  return (
    <Panel accent={T.amber} bg={T.amberBg} bd={T.amberBd}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap", justifyContent: "center" }}>
        {tens > 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: Math.min(tens, 9) }).map((_, i) => (
                <div key={i} style={{
                  width: 16, height: 60,
                  background: T.indigoBg,
                  border: `2px solid ${T.indigo}`,
                  borderRadius: 4,
                  display: "flex", flexDirection: "column", gap: 2, padding: 2,
                }}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <div key={j} style={{ flex: 1, background: T.indigo, borderRadius: 1, opacity: 0.7 }} />
                  ))}
                </div>
              ))}
            </div>
            <Chip color={T.indigo} bg={T.indigoBg}>TENS</Chip>
          </div>
        )}
        {ones > 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
              {Array.from({ length: Math.min(ones, 9) }).map((_, i) => (
                <div key={i} style={{
                  width: 16, height: 16,
                  background: T.amberBg,
                  border: `2px solid ${T.amber}`,
                  borderRadius: 3,
                }} />
              ))}
            </div>
            <Chip color={T.amber} bg={T.amberBg}>ONES</Chip>
          </div>
        )}
      </div>
    </Panel>
  );
}

// MULTIPLICATION — clean array with row/col separators ────────────────────────
function MultiplicationVis({ rows, cols }) {
  // Coloured block groups — each row is a distinct colour group
  const total = rows * cols;
  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#e11d48", "#0891b2", "#7c3aed",
                  "#ea580c", "#06b6d4", "#84cc16", "#ec4899", "#64748b", "#0d9488"];
  const BG =     ["#eef2ff", "#ecfdf5", "#fefce8", "#fff1f2", "#ecfeff", "#f5f3ff",
                  "#fff7ed", "#ecfeff", "#f7fee7", "#fdf2f8", "#f1f5f9", "#f0fdfa"];

  // Scale: show up to 10 rows, 10 cols
  const dispR = Math.min(rows, 10);
  const dispC = Math.min(cols, 10);
  const truncR = rows > dispR;
  const truncC = cols > dispC;
  // Block size scales with grid
  const maxDim = Math.max(dispR, dispC);
  const blockSize = maxDim > 8 ? 12 : maxDim > 6 ? 14 : maxDim > 4 ? 16 : 20;
  const gap = blockSize > 14 ? 2 : 3;
  const groupGap = blockSize > 14 ? 4 : 6;

  return (
    <Panel accent={T.emerald} bg={T.emeraldBg} bd={T.emeraldBd}
      ariaLabel={`${rows} groups of ${cols}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: groupGap, alignItems: "center" }}>
        {Array.from({ length: dispR }).map((_, ri) => {
          const c = COLORS[ri % COLORS.length];
          const bg = BG[ri % BG.length];
          return (
            <div key={ri} style={{
              display: "flex", gap, alignItems: "center",
              background: bg, borderRadius: 6, padding: "3px 5px",
              border: `1.5px solid ${c}30`,
            }}>
              {Array.from({ length: dispC }).map((_, ci) => (
                <div key={ci} style={{
                  width: blockSize, height: blockSize, borderRadius: 3,
                  background: c, opacity: 0.85,
                }} />
              ))}
              {truncC && <span style={{ fontSize: 8, color: c, fontWeight: 700 }}>…</span>}
            </div>
          );
        })}
        {truncR && (
          <span style={{ fontSize: 9, color: T.emerald, fontWeight: 700 }}>⋮ ({rows} rows total)</span>
        )}
      </div>
      <Chip color={T.emerald} bg={T.emeraldBg}>
        {rows} × {cols} = ?
      </Chip>
    </Panel>
  );
}

// FRACTION — bar segments, labelled ──────────────────────────────────────────
function FractionVis({ numerator, denominator }) {
  const den = Math.min(denominator, 10), num = Math.min(numerator, den);
  const segW = Math.max(26, Math.min(42, 240 / den));
  return (
    <Panel accent={T.nebula} bg={T.nebulaBg} bd={T.nebulaBd}>
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: den }).map((_, i) => (
          <div key={i} style={{
            width: segW, height: 48, borderRadius: 7,
            background: i < num ? "#7c3aed" : "#ede9fe",
            border: `2px solid ${i < num ? "#6d28d9" : "#c4b5fd"}`,
            // Hatch pattern on shaded for colour-blind safety
            backgroundImage: i < num
              ? "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.15) 4px, rgba(255,255,255,0.15) 5px)"
              : "none",
          }} />
        ))}
      </div>
      {/* Fraction notation */}
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: T.nebula, lineHeight: 1 }}>{num}</span>
          <div style={{ width: 18, height: 2.5, background: T.nebula, borderRadius: 2 }} />
          <span style={{ fontSize: 20, fontWeight: 900, color: T.nebula, lineHeight: 1 }}>{den}</span>
        </div>
        <span style={{ fontSize: 12, color: T.textMid, fontWeight: 600 }}>shaded</span>
        <div style={{ display: "flex", gap: 5, marginLeft: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: "#7c3aed", border: "2px solid #6d28d9",
              backgroundImage: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,0.2) 3px,rgba(255,255,255,0.2) 4px)" }} />
            <span style={{ fontSize: 9, color: T.textMid }}>shaded</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: "#ede9fe", border: "2px solid #c4b5fd" }} />
            <span style={{ fontSize: 9, color: T.textMid }}>unshaded</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

// NUMBER BONDS — part-part-whole ─────────────────────────────────────────────
function NumberBondVis({ whole, partA, partB }) {
  const BondBox = ({ n, color, bg, bd, label }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: T.textMid, letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: bg, border: `2.5px solid ${bd}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 2px 8px ${color}22`,
      }}>
        {n != null
          ? <span style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{n}</span>
          : <span style={{ fontSize: 20, fontWeight: 900, color: T.amber }}>?</span>
        }
      </div>
    </div>
  );
  return (
    <Panel accent={T.emerald} bg={T.emeraldBg} bd={T.emeraldBd}>
      <BondBox n={whole} color={T.text} bg="#f1f5f9" bd="#94a3b8" label="whole" />
      <svg width={80} height={22} style={{ overflow: "visible" }}>
        <line x1={40} y1={0} x2={14} y2={22} stroke={T.slateBd} strokeWidth={2} strokeDasharray="4,3" />
        <line x1={40} y1={0} x2={66} y2={22} stroke={T.slateBd} strokeWidth={2} strokeDasharray="4,3" />
      </svg>
      <div style={{ display: "flex", gap: 20 }}>
        <BondBox n={partA} color={T.indigo} bg={T.indigoBg} bd={T.indigoBd} label="part" />
        <BondBox n={partB} color={T.nebula} bg={T.nebulaBg} bd={T.nebulaBd} label="part" />
      </div>
    </Panel>
  );
}

// COUNTING — dice face patterns ───────────────────────────────────────────────
const DICE = {
  1:[[50,50]],2:[[28,50],[72,50]],3:[[22,22],[50,50],[78,78]],
  4:[[25,28],[75,28],[25,72],[75,72]],5:[[25,28],[75,28],[50,50],[25,72],[75,72]],
  6:[[25,22],[75,22],[25,50],[75,50],[25,78],[75,78]],
};
function CountingVis({ count }) {
  const safe = Math.min(count, 10);
  const layout = DICE[safe];
  return (
    <Panel accent={T.amber} bg={T.amberBg} bd={T.amberBd}>
      {layout ? (
        <svg width={88} height={88} viewBox="0 0 100 100">
          <rect x={3} y={3} width={94} height={94} rx={16}
            fill="white" stroke={T.amberBd} strokeWidth={2.5} />
          {layout.map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r={10}
              fill={T.amber} stroke={T.amber} strokeWidth={1} />
          ))}
        </svg>
      ) : (
        <DotCluster count={safe} color={T.amber} bg={T.amberBg} border={T.amber} size={18} />
      )}
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NVR VISUAL — shape sequences
// ═══════════════════════════════════════════════════════════════════════════════

// Renders a sequence of SVG shapes with a "?" at the end
// Parses patterns like: rotation, size progression, shape alternation, fill alternation
const NVR_SHAPES = {
  circle:   (cx,cy,r,fill,stroke) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`,
  square:   (cx,cy,r,fill,stroke) => `<rect x="${cx-r}" y="${cy-r}" width="${r*2}" height="${r*2}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`,
  triangle: (cx,cy,r,fill,stroke) => `<polygon points="${cx},${cy-r} ${cx+r*0.87},${cy+r*0.5} ${cx-r*0.87},${cy+r*0.5}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`,
  diamond:  (cx,cy,r,fill,stroke) => `<polygon points="${cx},${cy-r} ${cx+r},${cy} ${cx},${cy+r} ${cx-r},${cy}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`,
  cross:    (cx,cy,r,fill,stroke) => `<line x1="${cx-r}" y1="${cy}" x2="${cx+r}" y2="${cy}" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/><line x1="${cx}" y1="${cy-r}" x2="${cx}" y2="${cy+r}" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>`,
  star:     (cx,cy,r,fill,stroke) => {
    const pts = Array.from({length:5},(_,i)=>{
      const a1=(i*72-90)*Math.PI/180, a2=((i*72+36)-90)*Math.PI/180;
      const or=r, ir=r*0.4;
      return `${cx+or*Math.cos(a1)},${cy+or*Math.sin(a1)} ${cx+ir*Math.cos(a2)},${cy+ir*Math.sin(a2)}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
  },
};


// ═══════════════════════════════════════════════════════════════════════════════
// PARSER (core)
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════════════════════════════════════
function parseVisual(topic, questionText, subject, yearLevel) {
  const t    = (topic || "").toLowerCase();
  const q    = (questionText || "").toLowerCase();
  const subj = (subject || "").toLowerCase();
  const nums = ((questionText || "").match(RX_NUM) || []).map(Number);

  // ── NVR ──────────────────────────────────────────────────────────────────
  if (subj.includes("verbal") && subj.includes("non") || t.includes("nvr") || t.includes("non_verbal")) {

    // ── Geometry/property questions (single shape) ─────────────────────────
    // "How many sides does a triangle have?" / "What shape has 6 sides?" etc.
    const SHAPE_NAMES = ["triangle","square","rectangle","pentagon","hexagon","octagon","circle","diamond"];
    const geoQ = /how many sides|how many corners|how many edges|how many vertices|what shape|which shape|name.*shape|sides does|corners does/i.test(questionText);
    const shapeMentioned = SHAPE_NAMES.find(s => new RegExp(`\\b${s}`, "i").test(questionText));

    if (geoQ && shapeMentioned) {
      return { type: "shape_property", shapeName: shapeMentioned };
    }
    // Also fire if topic is about shape properties and a shape is named
    if ((t.includes("shape") || t.includes("polygon") || t.includes("geometry") || t.includes("2d")) && shapeMentioned) {
      return { type: "shape_property", shapeName: shapeMentioned };
    }

    // ── Sequence questions (need ≥ 2 shapes to make a sequence meaningful) ──
    const shapeMatch = (questionText || "").match(/\b(circle|square|triangle|diamond|star|cross)s?\b/gi);
    if (shapeMatch && shapeMatch.length >= 2) {
      const shapes = shapeMatch.map(s => s.toLowerCase());
      const fillCycle = ["white", T.indigoBg, "#c7d2fe", T.nebulaBg];
      const strokeCycle = [T.indigo, T.nebula, T.slate, T.emerald];
      const rotateCycle = [0, 90, 180, 270];
      const sequence = shapes.slice(0, 3).map((shape, i) => ({
        shape, size: 14,
        fill: fillCycle[i % fillCycle.length],
        stroke: strokeCycle[i % strokeCycle.length],
        rotate: t.includes("rotat") ? rotateCycle[i] : 0,
      }));
      sequence.push({ isQuestion: true });
      return { type: "nvr", sequence };
    }
    // Size sequence: growing/shrinking
    if (/grow|shrink|larger|smaller|bigger/i.test(questionText)) {
      const shape = "circle";
      const sequence = [
        { shape, size: 8,  fill: T.indigoBg, stroke: T.indigo },
        { shape, size: 12, fill: T.indigoBg, stroke: T.indigo },
        { shape, size: 16, fill: T.indigoBg, stroke: T.indigo },
        { isQuestion: true },
      ];
      return { type: "nvr", sequence };
    }
    // Fill alternation
    if (/alternate|pattern|fill/i.test(questionText)) {
      const shape = "square";
      const sequence = [
        { shape, size: 14, fill: T.indigo, stroke: T.indigo },
        { shape, size: 14, fill: "white", stroke: T.indigo },
        { shape, size: 14, fill: T.indigo, stroke: T.indigo },
        { isQuestion: true },
      ];
      return { type: "nvr", sequence };
    }

    // ── Reflection / mirror ─────────────────────────────────────────────────
    if (/reflect|mirror/i.test(questionText)) {
      // Extract the letter/shape being reflected if present
      const letterM = (questionText || "").match(/reflection of ['"]?([a-z])['"]?/i);
      const letter  = letterM ? letterM[1].toUpperCase() : "d";
      return { type: "nvr_reflection", letter };
    }

    // ── 3D nets / folding ────────────────────────────────────────────────────
    if (/net|fold|cube|cuboid|prism|pyramid|3d shape/i.test(questionText)) {
      const shape3d = /pyramid/i.test(questionText) ? "pyramid"
                    : /prism/i.test(questionText)   ? "prism"
                    : "cube";
      return { type: "nvr_net", shape3d };
    }

    // ── Rotation / transformation ───────────────────────────────────────────
    if (/rotat|turn|clockwise|anti.clockwise|degrees?/i.test(questionText)) {
      const degM  = (questionText || "").match(/(\d+)\s*degrees?/i);
      const deg   = degM ? parseInt(degM[1]) : 90;
      const cw    = !/anti.clockwise|counter.clockwise/i.test(questionText);
      return { type: "nvr_rotation", degrees: deg, clockwise: cw };
    }

    // ── Odd one out / classification ────────────────────────────────────────
    if (/odd one out|which.*different|does not belong/i.test(questionText)) {
      return { type: "nvr_oddoneout" };
    }
  }

  // ── PHYSICS ──────────────────────────────────────────────────────────────
  if (subj.includes("physics") || (subj.includes("science") && (t.includes("force") || t.includes("velocit") || t.includes("speed") || t.includes("motion")))) {

    // Velocity / speed
    if (t.includes("velocit") || t.includes("speed") || t.includes("motion") || /m\/s|km\/h|mph/i.test(questionText)) {
      const speeds = nums.filter(n => n > 0 && n < 1000);
      if (speeds.length >= 1) {
        const unit = /km\/h/i.test(questionText) ? "km/h" : /mph/i.test(questionText) ? "mph" : "m/s";
        return {
          type: "velocity",
          v1: speeds[0],
          v2: speeds[1] ?? null,
          label1: /initial|start|begin|u\s*=/i.test(questionText) ? "initial (u)" : "velocity",
          label2: /final|end|v\s*=/i.test(questionText) ? "final (v)" : "new velocity",
          unit,
        };
      }
    }

    // Forces
    if (t.includes("force") || t.includes("newton") || /\d+\s*n\b/i.test(questionText)) {
      const forces = nums.filter(n => n <= 1000);
      if (forces.length >= 2) {
        return {
          type: "forces",
          force1: Math.max(forces[0], forces[1]),
          force2: Math.min(forces[0], forces[1]),
          label1: /push/i.test(questionText) ? "Push" : "Force A",
          label2: /friction|resist/i.test(questionText) ? "Friction" : "Force B",
        };
      }
    }
  }

  // ── BIOLOGY ──────────────────────────────────────────────────────────────
  if (subj.includes("biology") || (subj.includes("science") && (t.includes("food_chain") || t.includes("ecosystem")))) {
    if (/food chain|eats|→|->/.test(q) || t.includes("food_chain")) {
      const EMOJI = { grass:"🌿",plant:"🌱",wheat:"🌾",algae:"🟢",rabbit:"🐰",mouse:"🐭",
        insect:"🐛",fox:"🦊",hawk:"🦅",snake:"🐍",wolf:"🐺",owl:"🦉" };
      const ROLE = { grass:"producer",plant:"producer",algae:"producer",
        rabbit:"primary consumer",mouse:"primary consumer",insect:"primary consumer",
        fox:"secondary consumer",hawk:"predator",snake:"secondary consumer" };
      const match = (questionText || "").match(/([a-zA-Z ]{2,18})\s*(?:→|->)\s*([a-zA-Z ]{2,18})(?:\s*(?:→|->)\s*([a-zA-Z ]{2,18}))?/i);
      if (match) {
        const chain = [match[1],match[2],match[3]].filter(Boolean)
          .map(s => s.trim().toLowerCase())
          .map(name => ({
            name,
            emoji: Object.entries(EMOJI).find(([k]) => name.includes(k))?.[1] || "🔵",
            role:  Object.entries(ROLE).find(([k]) => name.includes(k))?.[1] || "",
          }));
        if (chain.length >= 2) return { type: "food_chain", chain };
      }
    }
  }

  // ── MATHS ────────────────────────────────────────────────────────────────
  if (!subj.includes("math")) return null;
  // NOTE: yearLevel guard removed — clock, money, division, ruler, ratio
  // are handled below for all year levels via parseVisualExtended fallbacks.
  // Only truly early-years visuals (counting, word problems) guard internally.

  if ((t.includes("count") || t.includes("number_recog")) && yearLevel <= 4) {
    const n = nums[0];
    if (n && n <= 10) return { type: "counting", count: n };
  }

  const addMatch = (questionText || "").match(/(\d+)\s*[+＋]\s*(\d+)/);
  if (addMatch) {
    const a = parseInt(addMatch[1]), b = parseInt(addMatch[2]);
    if (a + b <= 20 && yearLevel <= 2) return { type: "addition", a, b };
  }
  if (t.includes("number_bond") && nums.length >= 2) {
    const whole = Math.max(...nums.slice(0,3));
    const part  = nums.find(n => n < whole) ?? 0;
    return { type: "number_bond", whole, partA: part, partB: whole - part };
  }

  const subMatch = (questionText || "").match(/(\d+)\s*[−\-–]\s*(\d+)/)
    || (questionText || "").match(/(\d+)\s*minus\s*(\d+)/i);
  if (subMatch) {
    const from = parseInt(subMatch[1]), remove = parseInt(subMatch[2]);
    if (from <= 15) return { type: "subtraction", from, remove };
  }

  // ── WORD PROBLEM DETECTION (Y1/Y2) ────────────────────────────────────────
  // Catches: "You have 4 bananas and eat 3", "Take away 1 from 4",
  //          "5 birds, 2 fly away", "6 sweets shared between 3", etc.
  // Skip entirely for comparison questions — they need a different visual
  const isComparisonQ = /which is greater|which is (?:bigger|larger|more|less|smaller)|greater than|less than|compare|more than|fewer than/i.test(questionText);
  if (!isComparisonQ && yearLevel <= 2 && nums.length >= 2) {
    const a = nums[0], b = nums[1];
    // Subtraction word problems
    // Handle "take away X from Y" / "subtract X from Y" — numbers are in reverse order
    const takeAwayMatch = (questionText || "").match(/take away\s+(\d+)\s+from\s+(\d+)/i)
      || (questionText || "").match(/subtract\s+(\d+)\s+from\s+(\d+)/i);
    if (takeAwayMatch) {
      const remove = parseInt(takeAwayMatch[1]), from = parseInt(takeAwayMatch[2]);
      if (from > 0 && remove > 0 && from >= remove && from <= 15) {
        return { type: "subtraction", from, remove };
      }
    }
    const isSubWord = /eat|ate|take away|taken away|fly away|flew away|fall(?:s)? off|lost|left|fewer|less|remove|gives? away|gave away|burst|popped|used|spent|sold|broken|stolen/i.test(q);
    if (isSubWord && a > 0 && b > 0 && a >= b && a <= 15) {
      return { type: "subtraction", from: a, remove: b };
    }
    // Handle "X from Y" subtraction where larger number comes second
    if (isSubWord && a > 0 && b > 0 && b > a && b <= 15) {
      return { type: "subtraction", from: b, remove: a };
    }
    // Addition word problems — suppress for currency/narrative real-world problems
    const isAddWord = /more|gets?|got|add|join|arrive[sd]?|come[s]?|found|buy|bought|pick(?:s|ed)?|collect(?:s|ed)?|together|total|altogether|in all/i.test(q);
    const isAddWordProblem = /Real World|Challenge:|£|€|\$|per week|per day|costs?|saves?|earns?/i.test(q);
    if (isAddWord && !isAddWordProblem && a + b <= 20) {
      return { type: "addition", a, b };
    }
    // Multiplication word problems: "3 bags of 4 apples", "5 groups of 2"
    const mulWordMatch = (questionText || "").match(/(\d+)\s*(?:bags?|boxes?|groups?|rows?|plates?|baskets?|packs?|sets?)\s*(?:of|with|each\s+(?:has|have|containing))\s*(\d+)/i)
      || (questionText || "").match(/(\d+)\s*(?:children|students|friends|people)\s+(?:each\s+)?(?:get|have|gets|receives?|got)\s+(\d+)/i);
    if (mulWordMatch) {
      const r = parseInt(mulWordMatch[1]), c = parseInt(mulWordMatch[2]);
      if (r <= 6 && c <= 8 && r > 0 && c > 0) return { type: "multiplication", rows: r, cols: c };
    }
  }

  // ── MISSING VALUE (12 × ? = 36, ? + 5 = 11) ──────────────────────────────
  if (subj.includes("math") && /\?|__+/.test(questionText)) {
    const eqNum = (questionText || "").match(/=\s*(\d+)/);
    const missingMul = (questionText || "").match(/(\d+)\s*[×x\*]\s*\?/i) || (questionText || "").match(/\?\s*[×x\*]\s*(\d+)/i);
    const missingAdd = (questionText || "").match(/(\d+)\s*\+\s*\?/i) || (questionText || "").match(/\?\s*\+\s*(\d+)/i);
    if (eqNum && (missingMul || missingAdd)) {
      const result = parseInt(eqNum[1]);
      const known  = parseInt((missingMul || missingAdd)[1]);
      if (result > 0 && known > 0 && result <= 100) {
        return { type: "number_line", min: 0, max: result, marked: known, label: "Find the missing value" };
      }
    }
  }

  // ── NUMBER LINE: "X more/less than N" (works with negatives) ──────────────────
  // e.g. "What number is 3 more than -6?" → number line showing -6 as start, 
  // direction arrow of +3, destination marked as ? (answer hidden)
  const moreMatch = (questionText || "").match(/(\d+)\s*more\s+than\s+(-?\d+)/i);
  const lessMatch = (questionText || "").match(/(\d+)\s*(?:less|fewer)\s+than\s+(-?\d+)/i);
  if (moreMatch || lessMatch) {
    const m    = moreMatch || lessMatch;
    const diff = parseInt(m[1]);
    const base = parseInt(m[2]);
    const ans  = moreMatch ? base + diff : base - diff;
    const lo   = Math.min(base, ans) - 2;
    const hi   = Math.max(base, ans) + 2;
    // Pass 'start' (the known value) and 'steps'/'direction' — do NOT pass 'marked'=ans
    // NumberLineVis will show the start dot + a dashed arc + "?" at destination
    return { type: "number_line", min: lo, max: hi,
      start: base, steps: diff, direction: moreMatch ? "right" : "left",
      label: moreMatch ? `Start at ${base}, count ${diff} right` : `Start at ${base}, count ${diff} left` };
  }

  // Skip multiplication dot grid if either operand is a decimal (2.5 × 4 etc.)
  const hasDecimalOperand = /\d+\.\d+\s*[×x\*]|[×x\*]\s*\d+\.\d+/.test(questionText || "");

  // ── DIVISION: X ÷ Y — number line with grouping jumps ─────────────────────
  const divMatch = (questionText || "").match(/(\d+)\s*(?:÷|divided\s*by)\s*(\d+)/i);
  if (divMatch) {
    const total = parseInt(divMatch[1]), divisor = parseInt(divMatch[2]);
    if (divisor >= 2 && total > 0 && total <= 200) {
      const groups = Math.floor(total / divisor);
      // Number line with jumps of divisor-size, landing at total
      return {
        type: "number_line", min: 0, max: total,
        start: 0, jumps: Math.min(groups, 10), jumpSize: divisor,
        label: `${total} ÷ ${divisor} = ?  (${Math.min(groups, 10)} jumps of ${divisor})`
      };
    }
  }

  const mulMatch = !hasDecimalOperand && (questionText || "").match(/(\d+)\s*(?:[×x\*]|times|multiplied\s*by)\s*(\d+)/i);
  const grpMatch = (questionText || "").match(/(\d+)\s*groups?\s*of\s*(\d+)/i);
  if (mulMatch || grpMatch) {
    const m = mulMatch || grpMatch;
    const r = parseInt(m[1]), c = parseInt(m[2]);
    if (r > 0 && c > 0) {
      // Small grids (≤6×6): coloured block visual
      if (r <= 6 && c <= 6) return { type: "multiplication", rows: r, cols: c };
      // Larger: number line with repeated jumps (r jumps of c)
      if (r <= 12 && c <= 12) return {
        type: "number_line", min: 0, max: r * c + 2,
        start: 0, jumps: r, jumpSize: c,
        label: `${r} × ${c} = ?  (${r} jumps of ${c})`
      };
    }
  }

  const fracMatch = (questionText || "").match(/(\d+)\s*\/\s*(\d+)/);
  if (t.includes("fraction") || fracMatch) {
    // Fraction on a number line: "1/3 + 1/3", "place X/Y on a number line", fraction multiplication
    if (fracMatch && /number line|line.*fraction|fraction.*line|add.*fraction|fraction.*add/i.test(questionText)) {
      const num = parseInt(fracMatch[1]), den = parseInt(fracMatch[2]);
      if (den >= 2 && den <= 12 && num <= den * 2) {
        // Check for multiplication: "7 × 1/5"
        const mulFrac = (questionText || "").match(/(\d+)\s*[×x\*]\s*(\d+)\s*\/\s*(\d+)/i);
        if (mulFrac) {
          const multiplier = parseInt(mulFrac[1]);
          const fracNum = parseInt(mulFrac[2]);
          const fracDen = parseInt(mulFrac[3]);
          return {
            type: "number_line", min: 0, max: Math.ceil(multiplier * fracNum / fracDen) + 1,
            start: 0, jumps: multiplier, jumpSize: fracNum / fracDen,
            fractionDenom: fracDen,
            label: `${multiplier} × ${fracNum}/${fracDen} = ?`
          };
        }
        // Addition: show fraction marks on 0→1 or 0→2
        return {
          type: "number_line", min: 0, max: Math.max(1, Math.ceil(num / den)),
          fractionDenom: den, label: `${num}/${den} on a number line`
        };
      }
    }
    if (fracMatch) return { type: "fraction", numerator: parseInt(fracMatch[1]), denominator: parseInt(fracMatch[2]) };
    if (/half/i.test(questionText))    return { type: "fraction", numerator: 1, denominator: 2 };
    if (/quarter/i.test(questionText)) return { type: "fraction", numerator: 1, denominator: 4 };
    if (/third/i.test(questionText))   return { type: "fraction", numerator: 1, denominator: 3 };
  }

  if (t.includes("place_value")) {
    const big = nums.find(n => n >= 10 && n <= 99);
    if (big) return { type: "place_value", tens: Math.floor(big/10), ones: big%10 };
    const tm = (questionText||"").match(/(\d+)\s*tens?/i);
    const om = (questionText||"").match(/(\d+)\s*ones?/i);
    if (tm||om) return { type:"place_value", tens: tm?parseInt(tm[1]):0, ones: om?parseInt(om[1]):0 };
  }

  // ── COMPARISON (Y1/Y2) ────────────────────────────────────────────────────
  if (isComparisonQ && yearLevel <= 4 && nums.length >= 2) {
    return { type: "comparison", a: nums[0], b: nums[1] };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW VISUAL COMPONENTS — TIER 3
// ═══════════════════════════════════════════════════════════════════════════════

// ── Clock / Telling Time ──────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 2 COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function ClockVis({ hours, minutes, label }) {
  const cx = 60, cy = 60, r = 50;
  const minAngle = (minutes / 60) * 360 - 90;
  const hrAngle  = ((hours % 12) / 12 + minutes / 720) * 360 - 90;
  const toXY = (angleDeg, len) => ({
    x: cx + len * Math.cos((angleDeg * Math.PI) / 180),
    y: cy + len * Math.sin((angleDeg * Math.PI) / 180),
  });
  const minHand = toXY(minAngle, 38);
  const hrHand  = toXY(hrAngle, 26);
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * 360 - 90;
    const inner = toXY(a, 42);
    const outer = toXY(a, 48);
    return { inner, outer, num: i === 0 ? 12 : i };
  });
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="white" stroke={T.indigo} strokeWidth={3} />
        {ticks.map((tk, i) => (
          <g key={i}>
            <line x1={tk.inner.x} y1={tk.inner.y} x2={tk.outer.x} y2={tk.outer.y}
              stroke={T.slate} strokeWidth={i % 3 === 0 ? 2.5 : 1} />
            <text x={toXY((i / 12) * 360 - 90, 33).x} y={toXY((i / 12) * 360 - 90, 33).y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={9} fill={T.slate} fontWeight="600">{tk.num}</text>
          </g>
        ))}
        {/* Minute hand */}
        <line x1={cx} y1={cy} x2={minHand.x} y2={minHand.y}
          stroke={T.indigo} strokeWidth={2.5} strokeLinecap="round" />
        {/* Hour hand */}
        <line x1={cx} y1={cy} x2={hrHand.x} y2={hrHand.y}
          stroke={T.nebula} strokeWidth={4} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill={T.indigo} />
      </svg>
      {label && <span style={{ fontSize:12, color:T.slate, fontWeight:600 }}>{label}</span>}
    </div>
  );
}

// ── Money / Coins ─────────────────────────────────────────────────────────────
function MoneyVis({ coins, total }) {
  const COIN_STYLES = {
    "£2":  { bg:"#b8a040", border:"#8a7030", text:"white", size:34 },
    "£1":  { bg:"#c8a820", border:"#a08010", text:"white", size:30 },
    "50p": { bg:"#b0b8c8", border:"#8898a8", text:"#333",  size:28 },
    "20p": { bg:"#b0b8c8", border:"#8898a8", text:"#333",  size:26 },
    "10p": { bg:"#c8a820", border:"#a08010", text:"white", size:24 },
    "5p":  { bg:"#b0b8c8", border:"#8898a8", text:"#333",  size:22 },
    "2p":  { bg:"#c87050", border:"#a05030", text:"white", size:20 },
    "1p":  { bg:"#c87050", border:"#a05030", text:"white", size:18 },
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center", maxWidth:200 }}>
        {coins.map((coin, i) => {
          const s = COIN_STYLES[coin] || COIN_STYLES["1p"];
          return (
            <div key={i} style={{
              width:s.size, height:s.size, borderRadius:"50%",
              background:s.bg, border:`3px solid ${s.border}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:s.text, fontSize:s.size > 25 ? 9 : 7.5, fontWeight:"800",
              boxShadow:"0 2px 4px rgba(0,0,0,0.25)", letterSpacing:"-0.5px",
            }}>{coin}</div>
          );
        })}
      </div>
      {total !== undefined && (
        <div style={{
          padding:"4px 14px", background:T.indigoBg, borderRadius:20,
          fontSize:13, fontWeight:700, color:T.indigo,
        }}>Total: {total >= 100 ? `£${(total/100).toFixed(2)}` : `${total}p`}</div>
      )}
    </div>
  );
}

// ── Division Grouping ─────────────────────────────────────────────────────────
function DivisionVis({ total, groups }) {
  const perGroup = Math.ceil(total / groups);
  const groupArr = Array.from({ length: groups }, (_, g) => {
    const count = g < groups - 1 ? perGroup : total - perGroup * (groups - 1);
    return Math.max(0, count);
  });
  const COLORS = [T.indigo, T.nebula, T.emerald, "#f59e0b", "#ef4444", "#06b6d4"];
  // Dynamic dot size based on total
  const dotSize = total > 40 ? 7 : total > 20 ? 9 : 10;
  const dotGap = total > 40 ? 2 : 3;
  const groupPad = total > 40 ? "4px 5px" : "6px 8px";
  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd}
      ariaLabel={`Division: ${total} shared into ${groups} groups`}>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center" }}>
        {groupArr.map((count, g) => (
          <div key={g} style={{
            border:`2px dashed ${COLORS[g % COLORS.length]}`,
            borderRadius:8, padding:groupPad,
            display:"flex", flexWrap:"wrap", gap:dotGap,
            minWidth:32, maxWidth:90, justifyContent:"center",
          }}>
            {Array.from({ length: count }, (_, i) => (
              <div key={i} style={{
                width:dotSize, height:dotSize, borderRadius:"50%",
                background:COLORS[g % COLORS.length],
              }} />
            ))}
          </div>
        ))}
      </div>
      <Chip color={T.indigo} bg={T.indigoBg}>
        {total} ÷ {groups} = ?
      </Chip>
    </Panel>
  );
}

// ── Division Equation (large numbers — no answer revealed) ────────────────────
function DivisionEquationVis({ total, groups }) {
  const W = 190, H = 100;
  // Show groups as blocks to visualise "sharing into groups"
  const maxBlocks = Math.min(groups, 8);
  const blockW = Math.min(18, Math.floor((W - 40) / maxBlocks) - 4);

  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd}
      ariaLabel={`Division: ${total} divided by ${groups}`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Large equation display */}
        <text x={W/2} y={32} textAnchor="middle" fontSize={22} fontWeight="900" fill={T.indigo}>{total}</text>
        <text x={W/2} y={50} textAnchor="middle" fontSize={12} fontWeight="700" fill={T.textMid}>÷ {groups} = ?</text>
        {/* Group blocks */}
        <g transform={`translate(${(W - maxBlocks * (blockW + 4)) / 2}, 60)`}>
          {Array.from({ length: maxBlocks }, (_, i) => (
            <g key={i}>
              <rect x={i * (blockW + 4)} y={0} width={blockW} height={blockW}
                rx={3} fill={T.indigoBg} stroke={T.indigo} strokeWidth={1.5} strokeDasharray="3,2"/>
              <text x={i * (blockW + 4) + blockW/2} y={blockW/2 + 4}
                textAnchor="middle" fontSize={8} fontWeight="700" fill={T.indigo}>?</text>
            </g>
          ))}
          {groups > maxBlocks && (
            <text x={maxBlocks * (blockW + 4) + 4} y={blockW/2 + 4} fontSize={10} fontWeight="700" fill={T.textMid}>…</text>
          )}
        </g>
      </svg>
      <Chip color={T.indigo} bg={T.indigoBg}>Share {total} equally into {groups} groups</Chip>
    </Panel>
  );
}

function RatioVis({ partA, partB, labelA, labelB }) {
  const total = partA + partB;
  const pctA  = (partA / total) * 100;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6, width:"100%" }}>
      <div style={{
        display:"flex", height:28, borderRadius:8, overflow:"hidden",
        border:`2px solid ${T.indigo}22`,
      }}>
        <div style={{
          width:`${pctA}%`, background:T.indigo, display:"flex",
          alignItems:"center", justifyContent:"center",
          color:"white", fontSize:11, fontWeight:700,
        }}>{partA}</div>
        <div style={{
          width:`${100 - pctA}%`, background:T.nebula, display:"flex",
          alignItems:"center", justifyContent:"center",
          color:"white", fontSize:11, fontWeight:700,
        }}>{partB}</div>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:T.slate }}>
        <span style={{ color:T.indigo, fontWeight:700 }}>{labelA || "Part A"}: {partA}</span>
        <span style={{ color:T.nebula, fontWeight:700 }}>{labelB || "Part B"}: {partB}</span>
      </div>
      <div style={{ fontSize:11, color:T.slate, textAlign:"center" }}>
        Ratio {partA}:{partB} &nbsp;•&nbsp; Total: {total}
      </div>
    </div>
  );
}

// ── VR Alphabet Strip ─────────────────────────────────────────────────────────
function AlphabetStripVis({ highlighted, offset }) {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const hiSet = new Set((highlighted || []).map(c => c.toUpperCase()));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"center" }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:2, justifyContent:"center" }}>
        {alpha.map((c, i) => {
          const isHi = hiSet.has(c);
          return (
            <div key={c} style={{
              width:18, height:22, borderRadius:4,
              background: isHi ? T.indigo : T.indigoBg,
              border: `1.5px solid ${isHi ? T.indigo : "#e0e7ff"}`,
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              color: isHi ? "white" : T.slate, fontWeight: isHi ? 800 : 500, fontSize:8.5,
            }}>
              <span>{c}</span>
              <span style={{ fontSize:6.5, opacity:0.7 }}>{i+1}</span>
            </div>
          );
        })}
      </div>
      {offset && (
        <div style={{ fontSize:11, color:T.slate, fontWeight:600 }}>
          +{offset} positions forward
        </div>
      )}
    </div>
  );
}

// ── VR Word Analogy ───────────────────────────────────────────────────────────
function AnalogyVis({ wordA, wordB, wordC, relationship }) {
  const Box = ({ word, color }) => (
    <div style={{
      padding:"6px 12px", background:color + "22", border:`2px solid ${color}`,
      borderRadius:8, fontSize:13, fontWeight:700, color,
      minWidth:52, textAlign:"center",
    }}>{word}</div>
  );
  const Arrow = ({ label }) => (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
      <span style={{ fontSize:9, color:T.slate, fontWeight:600 }}>{label}</span>
      <span style={{ fontSize:16, color:T.slate }}>→</span>
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"center" }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", justifyContent:"center" }}>
        <Box word={wordA} color={T.indigo} />
        <Arrow label={relationship || "relates to"} />
        <Box word={wordB} color={T.indigo} />
      </div>
      <div style={{ fontSize:11, color:T.slate, fontWeight:600 }}>same as</div>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", justifyContent:"center" }}>
        <Box word={wordC} color={T.nebula} />
        <Arrow label={relationship || "relates to"} />
        <div style={{
          padding:"6px 12px", background:T.nebulaBg, border:`2px dashed ${T.nebula}`,
          borderRadius:8, fontSize:13, fontWeight:700, color:T.nebula,
          minWidth:52, textAlign:"center",
        }}>?</div>
      </div>
    </div>
  );
}

// ── VR Number Sequence ────────────────────────────────────────────────────────
function NumberSequenceVis({ sequence, gapIndex, rule }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <div style={{ display:"flex", alignItems:"center", gap:4, flexWrap:"wrap", justifyContent:"center" }}>
        {sequence.map((val, i) => {
          const isGap = i === gapIndex;
          return (
            <React.Fragment key={i}>
              <div style={{
                width:40, height:40, borderRadius:8,
                background: isGap ? T.nebulaBg : T.indigoBg,
                border: `2px ${isGap ? "dashed" : "solid"} ${isGap ? T.nebula : T.indigo}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:15, fontWeight:800, color: isGap ? T.nebula : T.indigo,
              }}>{isGap ? "?" : val}</div>
              {i < sequence.length - 1 && (
                <span style={{ fontSize:16, color:T.slate, opacity:0.5 }}>→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {rule && <div style={{ fontSize:11, color:T.slate, fontWeight:600, fontStyle:"italic" }}>Rule: {rule}</div>}
    </div>
  );
}

// ── NVR Matrix (2×2 pattern) ──────────────────────────────────────────────────

function GrammarVis({ sentence, labels }) {
  // labels = [{ word, pos, color }]  pos = noun|verb|adjective|adverb|preposition
  const POS_COLORS = {
    noun:        { bg:"#dbeafe", border:"#3b82f6", text:"#1d4ed8" },
    verb:        { bg:"#dcfce7", border:"#22c55e", text:"#15803d" },
    adjective:   { bg:"#fef9c3", border:"#eab308", text:"#854d0e" },
    adverb:      { bg:"#fce7f3", border:"#ec4899", text:"#9d174d" },
    preposition: { bg:"#f3e8ff", border:"#a855f7", text:"#6b21a8" },
    article:     { bg:"#f1f5f9", border:"#94a3b8", text:"#475569" },
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
        {labels.map((item, i) => {
          const c = POS_COLORS[item.pos] || POS_COLORS.article;
          return (
            <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <div style={{
                padding:"4px 10px", background:c.bg, border:`2px solid ${c.border}`,
                borderRadius:6, fontSize:13, fontWeight:700, color:c.text,
              }}>{item.word}</div>
              <span style={{ fontSize:9, color:c.text, fontWeight:600, textTransform:"uppercase" }}>{item.pos}</span>
            </div>
          );
        })}
      </div>
      <div style={{
        padding:"6px 10px", background:T.indigoBg, borderRadius:8,
        fontSize:11, color:T.slate, textAlign:"center", fontStyle:"italic",
      }}>{sentence}</div>
    </div>
  );
}

// ── Synonym Strength Ladder ───────────────────────────────────────────────────
function SynonymLadderVis({ words, concept }) {
  // words = [{word, strength}] where strength 1–5
  const sorted = [...words].sort((a, b) => a.strength - b.strength);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"stretch", width:"100%" }}>
      {concept && (
        <div style={{ fontSize:11, color:T.slate, textAlign:"center", fontWeight:600, marginBottom:2 }}>
          Meaning strength: {concept}
        </div>
      )}
      {sorted.map((item, i) => {
        const pct = (item.strength / 5) * 100;
        const color = item.strength <= 2 ? T.indigo : item.strength === 3 ? "#f59e0b" : T.nebula;
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:12, fontWeight:700, width:72, textAlign:"right", color }}>{item.word}</span>
            <div style={{ flex:1, height:14, background:"#f1f5f9", borderRadius:7, overflow:"hidden" }}>
              <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:7 }} />
            </div>
          </div>
        );
      })}
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:T.slate, paddingLeft:78 }}>
        <span>mild</span><span>strong</span>
      </div>
    </div>
  );
}

// ── Prefix / Suffix Word Builder ──────────────────────────────────────────────
function WordBuilderVis({ prefix, root, suffix }) {
  const Block = ({ text, label, color }) => text ? (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
      <div style={{
        padding:"6px 12px", background:color + "22", border:`2px solid ${color}`,
        borderRadius:6, fontSize:14, fontWeight:800, color,
        minWidth:40, textAlign:"center", fontFamily:"monospace",
      }}>{text}</div>
      <span style={{ fontSize:9, color, fontWeight:600, textTransform:"uppercase" }}>{label}</span>
    </div>
  ) : null;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:0 }}>
        {prefix && <Block text={prefix} label="prefix" color={T.nebula} />}
        <Block text={root} label="root word" color={T.indigo} />
        {suffix && <Block text={suffix} label="suffix" color={T.emerald} />}
      </div>
      <div style={{
        padding:"4px 14px", background:T.indigoBg, borderRadius:20,
        fontSize:13, fontWeight:700, color:T.indigo,
      }}>
        {(prefix || "") + root + (suffix || "")}
      </div>
    </div>
  );
}


// ── Comparison Visual (greater/less than) ─────────────────────────────────────
function ComparisonVis({ a, b }) {
  const isAGreater = a > b;
  const isEqual    = a === b;
  const symbol     = isEqual ? "=" : isAGreater ? ">" : "<";
  const DOT_COLORS = [T.indigo, T.nebula];
  const maxDots    = Math.max(a, b);
  const renderDots = (n, color) => Array.from({ length: maxDots }, (_, i) => (
    <div key={i} style={{
      width:12, height:12, borderRadius:"50%",
      background: i < n ? color : "transparent",
      border: `2px solid ${i < n ? color : "#e2e8f0"}`,
      transition:"background 0.2s",
    }} />
  ));
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        {/* Group A */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4, width:80, justifyContent:"center" }}>
            {renderDots(a, DOT_COLORS[0])}
          </div>
          <div style={{
            fontSize:22, fontWeight:900, color:DOT_COLORS[0],
            padding:"2px 10px", background: DOT_COLORS[0]+"22",
            borderRadius:8, border:`2px solid ${DOT_COLORS[0]}`,
          }}>{a}</div>
        </div>
        {/* Symbol */}
        <div style={{
          fontSize:28, fontWeight:900,
          color: isEqual ? T.slate : isAGreater ? T.emerald : T.nebula,
          width:32, textAlign:"center",
        }}>{symbol}</div>
        {/* Group B */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4, width:80, justifyContent:"center" }}>
            {renderDots(b, DOT_COLORS[1])}
          </div>
          <div style={{
            fontSize:22, fontWeight:900, color:DOT_COLORS[1],
            padding:"2px 10px", background: DOT_COLORS[1]+"22",
            borderRadius:8, border:`2px solid ${DOT_COLORS[1]}`,
          }}>{b}</div>
        </div>
      </div>
      <div style={{ fontSize:11, color:T.slate, fontWeight:600 }}>
        {isEqual ? "Both are equal" : `${a} is ${isAGreater ? "greater" : "less"} than ${b}`}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSER EXTENSIONS — Tier 3
// ═══════════════════════════════════════════════════════════════════════════════

function parseTier3(topic, questionText, subject, yearLevel) {
  const t    = (topic || "").toLowerCase();
  const q    = (questionText || "").toLowerCase();
  const subj = (subject || "").toLowerCase();
  const nums = ((questionText || "").match(RX_NUM) || []).map(Number);

  // ── TIME / CLOCK ───────────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("time") || t.includes("clock") || /o'clock|half past|quarter past|quarter to/i.test(questionText))) {
    // "What time is shown?" / "3 o'clock" / "half past 4" / "quarter to 7"
    const oclockMatch  = (questionText || "").match(/(\d{1,2})\s*o'?clock/i);
    const halfPast     = (questionText || "").match(/half\s+past\s+(\d{1,2})/i);
    const quarterPast  = (questionText || "").match(/quarter\s+past\s+(\d{1,2})/i);
    const quarterTo    = (questionText || "").match(/quarter\s+to\s+(\d{1,2})/i);
    const colonTime    = (questionText || "").match(/(\d{1,2}):(\d{2})/);
    if (oclockMatch)  return { type:"clock", hours:parseInt(oclockMatch[1]), minutes:0, label:`${oclockMatch[1]} o'clock` };
    if (halfPast)     return { type:"clock", hours:parseInt(halfPast[1]), minutes:30, label:`Half past ${halfPast[1]}` };
    if (quarterPast)  return { type:"clock", hours:parseInt(quarterPast[1]), minutes:15, label:`Quarter past ${quarterPast[1]}` };
    if (quarterTo)    { const h = parseInt(quarterTo[1]); return { type:"clock", hours:h-1, minutes:45, label:`Quarter to ${h}` }; }
    if (colonTime)    return { type:"clock", hours:parseInt(colonTime[1]), minutes:parseInt(colonTime[2]), label:`${colonTime[1]}:${colonTime[2]}` };
    if (nums[0] >= 1 && nums[0] <= 12) return { type:"clock", hours:nums[0], minutes:nums[1] || 0 };
  }

  // ── MONEY / COINS ──────────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("money") || t.includes("coin") || /pence|penny|pennies|£|\bp\b/i.test(questionText))) {
    // Parse coin denominations mentioned
    const coinPatterns = [
      { re: /£2\s*coin/gi, coin:"£2" },
      { re: /£1\s*coin/gi, coin:"£1" },
      { re: /50p?\s*coin/gi, coin:"50p" },
      { re: /20p?\s*coin/gi, coin:"20p" },
      { re: /10p?\s*coin/gi, coin:"10p" },
      { re: /5p?\s*coin/gi, coin:"5p" },
      { re: /2p?\s*coin/gi, coin:"2p" },
      { re: /1p?\s*coin/gi, coin:"1p" },
    ];
    const coins = [];
    for (const { re, coin } of coinPatterns) {
      const matches = (questionText || "").match(re) || [];
      matches.forEach(() => coins.push(coin));
    }
    // If specific coins named, show them; else synthesise from total
    if (coins.length > 0) {
      const totalP = coins.reduce((s, c) => {
        const map = {"£2":200,"£1":100,"50p":50,"20p":20,"10p":10,"5p":5,"2p":2,"1p":1};
        return s + (map[c] || 0);
      }, 0);
      return { type:"money", coins, total:totalP };
    }
    // If just a total amount mentioned, show representative coins
    const totalPMatch = (questionText || "").match(/£(\d+)(?:\.(\d{2}))?/);
    const totalPences = (questionText || "").match(/(\d+)\s*p\b/i);
    if (totalPMatch) {
      const p = parseInt(totalPMatch[1]) * 100 + parseInt(totalPMatch[2] || 0);
      if (p <= 500) { // only render sensible amounts
        const coins = [];
        let rem = p;
        for (const [denom, coin] of [[200,"£2"],[100,"£1"],[50,"50p"],[20,"20p"],[10,"10p"],[5,"5p"],[2,"2p"],[1,"1p"]]) {
          while (rem >= denom && coins.length < 8) { coins.push(coin); rem -= denom; }
        }
        return { type:"money", coins, total:p };
      }
    }
    if (totalPences) {
      const p = parseInt(totalPences[1]);
      if (p <= 100) {
        const coins = [];
        let rem = p;
        for (const [denom, coin] of [[50,"50p"],[20,"20p"],[10,"10p"],[5,"5p"],[2,"2p"],[1,"1p"]]) {
          while (rem >= denom && coins.length < 8) { coins.push(coin); rem -= denom; }
        }
        return { type:"money", coins, total:p };
      }
    }
  }

  // ── DIVISION GROUPING ──────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("division") || t.includes("sharing") ||
      /share|divide|split|each get|equally|how many weeks|how many days|how many months|how many times|how many groups|÷|divided by/i.test(questionText))) {
    const isWordProblem = /Real World|Challenge:|£|€|\$|per week|per day|per month|per year|costs?|saves?|earns?|spends?|charges?|buys?|sells?/i.test(questionText);
    if (!isWordProblem && nums.length >= 2) {
      const total  = Math.max(...nums.slice(0, 3));
      const groups = nums.find(n => n !== total && n >= 2 && n <= 20);
      if (total && groups) {
        if (total <= 60) return { type:"division", total, groups };
        // Too large for dots — equation visual (no answer revealed)
        return { type: "division_equation", total, groups };
      }
    }
  }

  // ── RULER / MEASUREMENT ────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("measure") || t.includes("length") || /\bcm\b|\bmm\b|centimetre|millimetre|ruler/i.test(questionText))) {
    const cmMatch = (questionText || "").match(/(\d+(?:\.\d+)?)\s*cm/i);
    if (cmMatch) {
      const cm = parseFloat(cmMatch[1]);
      if (cm > 0 && cm <= 18) return { type:"ruler", cm };
    }
  }

  // ── RATIO / PROPORTION ─────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("ratio") || t.includes("proportion") || /ratio|for every|:\s*\d/i.test(questionText))) {
    const ratioMatch = (questionText || "").match(/(\d+)\s*:\s*(\d+)/);
    if (ratioMatch) {
      const a = parseInt(ratioMatch[1]), b = parseInt(ratioMatch[2]);
      if (a <= 10 && b <= 10) {
        return { type:"ratio", partA:a, partB:b, labelA:"Part A", labelB:"Part B" };
      }
    }
  }

  // ── VERBAL REASONING: ALPHABET STRIP ──────────────────────────────────────
  if (subj.includes("verbal") && !subj.includes("non")) {
    // Letter codes: "A=1, B=2..." / "What is the 5th letter?" / "3 letters after D"
    const letterQ = (questionText || "").match(/letter[s]?\s+(?:after|before|from|of)/i)
      || /alphabet|code|cipher|positions?/i.test(questionText)
      || t.includes("letter_code") || t.includes("alphabet");
    if (letterQ) {
      const mentioned = ((questionText || "").match(/\b([A-Z])\b/g) || []).filter((c, i, a) => a.indexOf(c) === i);
      const offsetM = (questionText || "").match(/(\d+)\s*(?:letters?|places?|positions?)\s*(?:after|forward|on)/i);
      return { type:"alphabet_strip", highlighted: mentioned.slice(0, 4), offset: offsetM ? parseInt(offsetM[1]) : null };
    }

    // Analogies: "Hot is to Cold as Day is to ___"
    const analogyM = (questionText || "").match(/(\w+)\s+is\s+to\s+(\w+)\s+as\s+(\w+)\s+is\s+to/i);
    if (analogyM) {
      return { type:"analogy", wordA:analogyM[1], wordB:analogyM[2], wordC:analogyM[3] };
    }

    // Number sequences: "2, 4, 6, __, 10"
    const seqNums = ((questionText || "").match(/\d+/g) || []).map(Number);
    const hasGap  = /\?|__|___|\.\.\.|blank/i.test(questionText);
    if (seqNums.length >= 3 && hasGap) {
      // Simple arithmetic sequence detection
      const diffs = seqNums.slice(1).map((n, i) => n - seqNums[i]);
      const isAP  = diffs.every(d => Math.abs(d - diffs[0]) < 1);
      const rule  = isAP ? (diffs[0] > 0 ? `+${diffs[0]} each time` : `${diffs[0]} each time`) : null;
      return { type:"number_sequence", sequence:seqNums, gapIndex:seqNums.length, rule };
    }

    // Odd one out
    const oddOneMatch = /odd one out|doesn.t belong|which.*different/i.test(questionText);
    if (oddOneMatch) return null; // No visual for odd-one-out yet
  }

  // ── NVR: MATRIX ───────────────────────────────────────────────────────────
  if ((subj.includes("verbal") && subj.includes("non")) || t.includes("matrix") || t.includes("nvr")) {
    if (t.includes("matrix") || /complete.*(?:grid|matrix|pattern)|which.*(?:fits|completes|goes)/i.test(questionText)) {
      const shapes = ["circle","square","triangle","diamond"];
      const fills  = [T.indigoBg, T.nebulaBg, "#dcfce7", "#fef9c3"];
      const cells  = [
        { shape:"circle",   fill:fills[0], stroke:T.indigo,  rotate:0   },
        { shape:"square",   fill:fills[1], stroke:T.nebula,  rotate:0   },
        { shape:"triangle", fill:fills[2], stroke:T.emerald, rotate:0   },
        null, // question mark
      ];
      return { type:"nvr_matrix", cells };
    }
  }

  // ── ENGLISH: GRAMMAR ───────────────────────────────────────────────────────
  if (subj.includes("english")) {
    // Parts of speech
    if (t.includes("grammar") || t.includes("noun") || t.includes("verb") || t.includes("adjective")
      || /parts? of speech|identify the (noun|verb|adjective|adverb)|which word is/i.test(questionText)) {
      // Try to extract a short sentence and label it
      const sentM = (questionText || "").match(/"([^"]{5,60})"/);
      if (sentM) {
        const words = sentM[1].split(/\s+/).slice(0, 6);
        // Simple heuristic labelling
        const POS_HINTS = {
          noun:["dog","cat","ball","house","school","teacher","city","boy","girl","car","rain","sun","tree"],
          verb:["ran","runs","jumped","eating","played","is","was","said","went","bought","made","took","gave"],
          adjective:["big","small","red","blue","fast","slow","happy","old","new","bright","dark","long","short"],
          adverb:["quickly","slowly","very","really","always","never","often","happily","loudly","softly"],
        };
        const labels = words.map(w => {
          const clean = w.replace(/[^a-zA-Z]/g,"").toLowerCase();
          for (const [pos, hints] of Object.entries(POS_HINTS)) {
            if (hints.includes(clean)) return { word:w, pos };
          }
          if (/^(the|a|an)$/i.test(clean)) return { word:w, pos:"article" };
          return { word:w, pos:"noun" }; // default fallback
        });
        return { type:"grammar", sentence:sentM[1], labels };
      }
    }

    // Prefix/suffix
    if (t.includes("prefix") || t.includes("suffix") || /prefix|suffix|root word|word family/i.test(questionText)) {
      const prefixMap = { un:"happy", re:"write", pre:"view", dis:"agree", mis:"spell", over:"come", im:"possible", in:"visible" };
      const suffixMap = { ness:"happy", ful:"care", less:"hope", tion:"invent", ing:"play", ed:"play", er:"teach" };
      for (const [pre, root] of Object.entries(prefixMap)) {
        if (q.includes(pre) || q.includes(`${pre}${root}`)) {
          return { type:"word_builder", prefix:pre, root, suffix:null };
        }
      }
      for (const [suf, root] of Object.entries(suffixMap)) {
        if (q.includes(suf) || q.includes(`${root}${suf}`)) {
          return { type:"word_builder", prefix:null, root, suffix:suf };
        }
      }
    }

    // Synonyms / vocabulary strength
    if (t.includes("synonym") || t.includes("vocabulary") || /synonym|means the same|similar meaning|word for/i.test(questionText)) {
      // Static sets for common concepts
      const SYNONYM_SETS = {
        happy:  [{word:"content",strength:2},{word:"pleased",strength:3},{word:"delighted",strength:4},{word:"ecstatic",strength:5}],
        sad:    [{word:"unhappy",strength:2},{word:"gloomy",strength:3},{word:"miserable",strength:4},{word:"devastated",strength:5}],
        big:    [{word:"large",strength:2},{word:"huge",strength:3},{word:"enormous",strength:4},{word:"colossal",strength:5}],
        angry:  [{word:"annoyed",strength:2},{word:"irritated",strength:3},{word:"furious",strength:4},{word:"enraged",strength:5}],
        cold:   [{word:"cool",strength:2},{word:"chilly",strength:3},{word:"freezing",strength:4},{word:"arctic",strength:5}],
        fast:   [{word:"quick",strength:2},{word:"swift",strength:3},{word:"rapid",strength:4},{word:"lightning",strength:5}],
      };
      for (const [concept, words] of Object.entries(SYNONYM_SETS)) {
        if (q.includes(concept)) return { type:"synonym_ladder", words, concept:`words for "${concept}"` };
      }
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 4 — HIGHER SCIENCES + ACCOUNTING/COMMERCE
// ═══════════════════════════════════════════════════════════════════════════════

// ── Bohr Atom Diagram ─────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 4 PARSER
// ═══════════════════════════════════════════════════════════════════════════════
function parseTier4(topic, questionText, subject, yearLevel) {
  const t    = (topic || "").toLowerCase();
  const q    = (questionText || "").toLowerCase();
  const subj = (subject || "").toLowerCase();
  const nums = ((questionText || "").match(RX_NUM) || []).map(Number);

  const isPhysics   = subj.includes("physics")   || (subj.includes("science") && (t.includes("force") || t.includes("wave") || t.includes("energy") || t.includes("electr")));
  const isChem      = subj.includes("chem")       || (subj.includes("science") && (t.includes("atom") || t.includes("element") || t.includes("react") || t.includes("periodic") || t.includes("ph") || t.includes("state") || t.includes("molecul")));
  const isBio       = subj.includes("biol")       || (subj.includes("science") && (t.includes("cell") || t.includes("gene") || t.includes("organ") || t.includes("punnett") || t.includes("inherit")));
  const isAccounting = subj.includes("account")   || subj.includes("commerce") || subj.includes("business") || subj.includes("economics") || subj.includes("econ");

  // ── PHYSICS ─────────────────────────────────────────────────────────────────

  // Wave
  if (isPhysics && (t.includes("wave") || /wavelength|amplitude|frequency|transverse|longitudinal/i.test(questionText))) {
    const isLong = /longitudinal|sound|compression|rarefaction/i.test(questionText);
    const amp = nums.find(n => n > 0 && n < 50) || 24;
    return { type:"wave", waveType: isLong ? "longitudinal" : "transverse", amplitude:amp,
      label: isLong ? "Longitudinal wave (e.g. sound)" : "Transverse wave (e.g. light)" };
  }

  // EM Spectrum
  if (isPhysics && (t.includes("electromagnetic") || t.includes("em_spectrum") || /electromagnetic spectrum|radio wave|microwave|infrared|ultraviolet|x.ray|gamma ray|visible light/i.test(questionText))) {
    const BANDS = ["radio","microwave","infrared","visible","uv","ultraviolet","x-ray","x ray","gamma"];
    const found = BANDS.filter(b => q.includes(b));
    return { type:"em_spectrum", highlighted: found };
  }

  // Free body / resultant forces
  if (isPhysics && (t.includes("resultant") || t.includes("free_body") || /resultant force|free body|balanced force|unbalanced/i.test(questionText))) {
    const directions = ["up","down","left","right"];
    const forces = [];
    const forceMatches = (questionText || "").matchAll(/(\d+)\s*n\s*(?:acting\s+)?(?:to\s+the\s+)?(up|down|left|right|upward|downward)/gi);
    for (const m of forceMatches) {
      const dir = m[2].toLowerCase().replace("ward","");
      forces.push({ label:dir, value:parseInt(m[1]), direction:dir });
    }
    if (forces.length === 0) {
      forces.push({ label:"Weight", value:20, direction:"down" });
      forces.push({ label:"Normal", value:20, direction:"up" });
    }
    return { type:"free_body", forces };
  }

  // Energy stores
  if (isPhysics && (t.includes("energy") || /energy store|kinetic energy|potential energy|thermal energy|energy transfer/i.test(questionText))) {
    const STORES = [
      { key:"kinetic",       patterns:/kinetic|moving/ },
      { key:"thermal",       patterns:/thermal|heat|temperature/ },
      { key:"chemical",      patterns:/chemical|fuel|food|battery/ },
      { key:"gravitational", patterns:/gravitational|potential|height/ },
      { key:"elastic",       patterns:/elastic|spring|stretched/ },
      { key:"sound",         patterns:/sound|acoustic/ },
    ];
    const found = STORES.filter(s => s.patterns.test(q)).map(s => ({ type:s.key, label:s.key.charAt(0).toUpperCase()+s.key.slice(1) }));
    if (found.length >= 2) {
      return { type:"energy_stores", stores:found.slice(0,4),
        transfers:[{ from:found[0].label, method:"transfer", to:found[1].label }] };
    }
  }

  // ── CHEMISTRY ───────────────────────────────────────────────────────────────

  // Atom / Bohr model
  if (isChem && (t.includes("atom") || t.includes("electron") || /atomic structure|electron shell|bohr|proton|neutron|electron/i.test(questionText))) {
    // Try to extract element
    const ELEMENTS = {
      hydrogen:  { protons:1, neutrons:0, electrons:1, element:"H" },
      helium:    { protons:2, neutrons:2, electrons:2, element:"He" },
      lithium:   { protons:3, neutrons:4, electrons:3, element:"Li" },
      carbon:    { protons:6, neutrons:6, electrons:6, element:"C" },
      nitrogen:  { protons:7, neutrons:7, electrons:7, element:"N" },
      oxygen:    { protons:8, neutrons:8, electrons:8, element:"O" },
      fluorine:  { protons:9, neutrons:10, electrons:9, element:"F" },
      neon:      { protons:10, neutrons:10, electrons:10, element:"Ne" },
      sodium:    { protons:11, neutrons:12, electrons:11, element:"Na" },
      magnesium: { protons:12, neutrons:12, electrons:12, element:"Mg" },
      chlorine:  { protons:17, neutrons:18, electrons:17, element:"Cl" },
      calcium:   { protons:20, neutrons:20, electrons:20, element:"Ca" },
    };
    for (const [name, data] of Object.entries(ELEMENTS)) {
      if (q.includes(name)) return { type:"atom", ...data };
    }
    // Generic: extract p/n from question
    const pMatch = (questionText||"").match(/(\d+)\s*protons?/i);
    const nMatch = (questionText||"").match(/(\d+)\s*neutrons?/i);
    const eMatch = (questionText||"").match(/(\d+)\s*electrons?/i);
    if (pMatch || nMatch) {
      const p = parseInt(pMatch?.[1] || "6");
      const n = parseInt(nMatch?.[1] || p.toString());
      const e = parseInt(eMatch?.[1] || p.toString());
      return { type:"atom", protons:p, neutrons:n, electrons:e };
    }
  }

  // Periodic table element
  if (isChem && (t.includes("periodic") || t.includes("element") || /group \d|period \d|periodic table|noble gas|alkali metal|halogen|transition metal/i.test(questionText))) {
    const ELEM_DB = {
      hydrogen:  { symbol:"H",  name:"Hydrogen",  atomicNumber:1,  atomicMass:"1",   group:1,  period:1, category:"non-metal" },
      helium:    { symbol:"He", name:"Helium",     atomicNumber:2,  atomicMass:"4",   group:18, period:1, category:"noble gas" },
      lithium:   { symbol:"Li", name:"Lithium",    atomicNumber:3,  atomicMass:"7",   group:1,  period:2, category:"alkali metal" },
      sodium:    { symbol:"Na", name:"Sodium",     atomicNumber:11, atomicMass:"23",  group:1,  period:3, category:"alkali metal" },
      potassium: { symbol:"K",  name:"Potassium",  atomicNumber:19, atomicMass:"39",  group:1,  period:4, category:"alkali metal" },
      magnesium: { symbol:"Mg", name:"Magnesium",  atomicNumber:12, atomicMass:"24",  group:2,  period:3, category:"alkaline earth" },
      calcium:   { symbol:"Ca", name:"Calcium",    atomicNumber:20, atomicMass:"40",  group:2,  period:4, category:"alkaline earth" },
      carbon:    { symbol:"C",  name:"Carbon",     atomicNumber:6,  atomicMass:"12",  group:14, period:2, category:"non-metal" },
      nitrogen:  { symbol:"N",  name:"Nitrogen",   atomicNumber:7,  atomicMass:"14",  group:15, period:2, category:"non-metal" },
      oxygen:    { symbol:"O",  name:"Oxygen",     atomicNumber:8,  atomicMass:"16",  group:16, period:2, category:"non-metal" },
      chlorine:  { symbol:"Cl", name:"Chlorine",   atomicNumber:17, atomicMass:"35.5",group:17, period:3, category:"halogen" },
      fluorine:  { symbol:"F",  name:"Fluorine",   atomicNumber:9,  atomicMass:"19",  group:17, period:2, category:"halogen" },
      neon:      { symbol:"Ne", name:"Neon",       atomicNumber:10, atomicMass:"20",  group:18, period:2, category:"noble gas" },
      argon:     { symbol:"Ar", name:"Argon",      atomicNumber:18, atomicMass:"40",  group:18, period:3, category:"noble gas" },
      iron:      { symbol:"Fe", name:"Iron",       atomicNumber:26, atomicMass:"56",  group:8,  period:4, category:"transition metal" },
      copper:    { symbol:"Cu", name:"Copper",     atomicNumber:29, atomicMass:"64",  group:11, period:4, category:"transition metal" },
      zinc:      { symbol:"Zn", name:"Zinc",       atomicNumber:30, atomicMass:"65",  group:12, period:4, category:"transition metal" },
      gold:      { symbol:"Au", name:"Gold",       atomicNumber:79, atomicMass:"197", group:11, period:6, category:"transition metal" },
      silver:    { symbol:"Ag", name:"Silver",     atomicNumber:47, atomicMass:"108", group:11, period:5, category:"transition metal" },
      aluminium: { symbol:"Al", name:"Aluminium",  atomicNumber:13, atomicMass:"27",  group:13, period:3, category:"metal" },
      silicon:   { symbol:"Si", name:"Silicon",    atomicNumber:14, atomicMass:"28",  group:14, period:3, category:"metalloid" },
    };
    for (const [name, data] of Object.entries(ELEM_DB)) {
      if (q.includes(name)) return { type:"periodic_element", ...data };
    }
  }

  // State changes
  if (isChem && (t.includes("state") || /melting|freezing|evaporation|condensation|sublimation|solid|liquid|gas|boiling/i.test(questionText))) {
    const STATES = ["solid","liquid","gas"];
    const found = STATES.filter(s => q.includes(s));
    return { type:"state_changes", highlighted: found };
  }

  // Molecule
  if (isChem && (t.includes("molecule") || t.includes("compound") || /\bH2O\b|\bCO2\b|\bCH4\b|\bO2\b|\bN2\b|\bHCl\b|\bNaCl\b/i.test(questionText))) {
    const FORMULAS = ["H2O","CO2","CH4","O2","N2","HCl","NaCl"];
    const found = FORMULAS.find(f => new RegExp(`\\b${f}\\b`, "i").test(questionText));
    if (found) return { type:"molecule", formula:found };
    // Check names
    if (/water/i.test(questionText)) return { type:"molecule", formula:"H2O" };
    if (/carbon dioxide/i.test(questionText)) return { type:"molecule", formula:"CO2" };
    if (/methane/i.test(questionText)) return { type:"molecule", formula:"CH4" };
    if (/oxygen/i.test(questionText) && !/carbon|water/i.test(questionText)) return { type:"molecule", formula:"O2" };
    if (/sodium chloride|salt/i.test(questionText)) return { type:"molecule", formula:"NaCl" };
  }

  // pH scale
  if (isChem && (t.includes("ph") || /\bpH\b|acid|alkali|alkaline|neutral|indicator/i.test(questionText))) {
    const phMatch = (questionText||"").match(/pH\s*(?:of\s*)?(?:=\s*)?(\d+(?:\.\d+)?)/i);
    const SUBSTANCE_PH = {
      "lemon juice":3, "vinegar":3, "cola":4, "rain":6, "pure water":7, "water":7,
      "milk":7, "blood":7.4, "sea water":8, "baking soda":9, "bleach":13, "stomach acid":2,
    };
    let value = phMatch ? parseFloat(phMatch[1]) : null;
    let substance = null;
    for (const [sub, ph] of Object.entries(SUBSTANCE_PH)) {
      if (q.includes(sub)) { value = value ?? ph; substance = sub; break; }
    }
    if (value !== null) return { type:"ph_scale", value, substance };
    return { type:"ph_scale", value:7, substance:"neutral" };
  }

  // ── BIOLOGY ─────────────────────────────────────────────────────────────────

  // Cell
  if (isBio && (t.includes("cell") || /animal cell|plant cell|cell membrane|cell wall|nucleus|chloroplast|vacuole|mitochondria/i.test(questionText))) {
    const isPlant = /plant/i.test(questionText) || /chloroplast|cell wall|vacuole/i.test(questionText);
    return { type:"cell", cellType: isPlant ? "plant" : "animal" };
  }

  // Punnett square
  if (isBio && (t.includes("punnett") || t.includes("inherit") || t.includes("genetic") || /dominant|recessive|allele|genotype|phenotype|cross.*\b[A-Z][a-z]\b/i.test(questionText))) {
    const crossMatch = (questionText||"").match(/\b([A-Z][a-z])\s*[×x]\s*([A-Z][a-z])\b/);
    const parent1 = crossMatch?.[1] || "Aa";
    const parent2 = crossMatch?.[2] || "Aa";
    const traitM  = (questionText||"").match(/trait[:\s]+([^.?\n]{3,30})/i);
    return { type:"punnett", parent1, parent2, trait:traitM?.[1]?.trim() };
  }

  // ── ACCOUNTING / COMMERCE / ECONOMICS ────────────────────────────────────────

  // T-Account
  if (isAccounting && (t.includes("t-account") || t.includes("t_account") || t.includes("double entry") || t.includes("debit") || t.includes("credit") || /\bdebit\b|\bcredit\b|ledger|journal/i.test(questionText))) {
    const accountMatch = (questionText||"").match(/(?:account(?:s?)|ledger)\s+(?:for\s+)?([A-Z][a-zA-Z\s]{2,20})/i);
    const debits  = [{ label:"Opening balance", amount:1000 }, { label:"Sales", amount:500 }];
    const credits = [{ label:"Purchases", amount:300 }, { label:"Expenses", amount:200 }];
    return { type:"t_account", account: accountMatch?.[1]?.trim() || "Account Name", debits, credits };
  }

  // Break-even
  if (isAccounting && (t.includes("break") || t.includes("break_even") || /break.even|breakeven|fixed cost|variable cost|contribution/i.test(questionText))) {
    const fcMatch  = (questionText||"").match(/fixed costs?\s*(?:of|=|:)?\s*[£$]?(\d[\d,]*)/i);
    const vcMatch  = (questionText||"").match(/variable costs?\s*(?:per unit)?\s*(?:of|=|:)?\s*[£$]?(\d+(?:\.\d+)?)/i);
    const spMatch  = (questionText||"").match(/(?:selling price|price per unit|revenue per unit)\s*(?:of|=|:)?\s*[£$]?(\d+(?:\.\d+)?)/i);
    const fc  = fcMatch  ? parseInt(fcMatch[1].replace(",",""))  : 2000;
    const vc  = vcMatch  ? parseFloat(vcMatch[1])                 : 4;
    const sp  = spMatch  ? parseFloat(spMatch[1])                 : 8;
    const beq = sp > vc  ? Math.ceil(fc / (sp - vc))             : null;
    return { type:"break_even", fixedCost:fc, variableCostPerUnit:vc, pricePerUnit:sp, breakEvenQty:beq };
  }

  // Supply & Demand
  if (isAccounting && (t.includes("supply") || t.includes("demand") || t.includes("equilibrium") || /supply|demand|equilibrium|market price|price mechanism/i.test(questionText))) {
    const pMatch = (questionText||"").match(/price\s*(?:of|=|:)?\s*[£$]?(\d+)/i);
    const qMatch = (questionText||"").match(/quantity\s*(?:of|=|:)?\s*(\d+)/i);
    return { type:"supply_demand", eqPrice: pMatch ? parseInt(pMatch[1]) : 50, eqQty: qMatch ? parseInt(qMatch[1]) : 50 };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default function MathsVisualiser({ question, subject, yearLevel }) {
  const visual = useMemo(() => {
    if (!question) return null;
    const subj = (subject || "").toLowerCase();
    const year = parseInt(yearLevel ?? question?.year_level ?? 99, 10);

    const isMaths      = subj.includes("math");
    const isScience    = subj.includes("science") || subj.includes("physics") || subj.includes("biology") || subj.includes("chemistry");
    const isNVR        = subj.includes("verbal") || subj.includes("nvr");
    const isEnglish    = subj.includes("english");
    const isCommerce   = subj.includes("account") || subj.includes("commerce") || subj.includes("business") || subj.includes("econ");
    if (!isMaths && !isScience && !isNVR && !isEnglish && !isCommerce) return null;

    // "science" as a generic subject — infer biology/physics/chemistry from topic/question
    // so Tier 4 parsers (which check subj.includes("biol") etc.) still fire
    let enrichedSubject = subject || "";
    if (subj === "science" || subj.includes("science")) {
      const q2 = (question.q || question.question_text || "").toLowerCase();
      const t2 = (question.topic || "").toLowerCase();
      if (/cell|mitochondria|photosynthesis|organ|plant|animal|dna|gene|inherit|chloroplast|vacuole|nucleus|ribosome|membrane/i.test(q2 + t2))
        enrichedSubject = "biology";
      else if (/force|velocity|speed|wave|circuit|energy|electric|magnet|light|sound|pressure|gravity|motion|newton/i.test(q2 + t2))
        enrichedSubject = "physics";
      else if (/atom|element|compound|reaction|acid|alkali|periodic|molecule|ph|bond|oxidat|precipitat|dissolv|solut/i.test(q2 + t2))
        enrichedSubject = "chemistry";
    }

    // Tier 4 first: higher science, accounting, economics
    const t4 = parseTier4(
      question.topic || question._anchorTopic || "",
      question.q || question.question_text || "",
      enrichedSubject,
      year
    );
    if (t4) return t4;

    // Tier 3: English, VR, new maths types
    const t3 = parseTier3(
      question.topic || question._anchorTopic || "",
      question.q || question.question_text || "",
      enrichedSubject,
      year
    );
    if (t3) return t3;

    return parseVisualExtended(
      question.topic || question._anchorTopic || "",
      question.q || question.question_text || "",
      enrichedSubject,
      year
    );
  }, [question, subject, yearLevel]);

  if (!visual) return null;

  // Generate accessible description for screen readers
  const ariaLabel = (() => {
    switch (visual.type) {
      case "addition":         return `Addition visual: ${visual.a} plus ${visual.b}`;
      case "subtraction":      return `Subtraction visual: ${visual.from} minus ${visual.remove}`;
      case "multiplication":   return `Multiplication grid: ${visual.rows} rows of ${visual.cols}`;
      case "division":         return `Division visual: ${visual.total} shared into groups of ${visual.groups}`;
      case "division_equation": return `Division: ${visual.total} ÷ ${visual.groups} = ?`;
      case "fraction":         return `Fraction diagram: ${visual.numerator} out of ${visual.denominator}`;
      case "number_bond":      return `Number bond: ${visual.whole} splits into ${visual.partA} and ${visual.partB}`;
      case "place_value":      return `Place value: ${visual.tens} tens and ${visual.ones} ones`;
      case "counting":         return `Counting visual: ${visual.count} objects`;
      case "clock":            return `Clock showing ${visual.hours}:${String(visual.minutes||0).padStart(2,'0')}`;
      case "money":            return `Money visual: ${visual.total}p in coins`;
      case "ruler":            return `Ruler measuring ${visual.cm} centimetres`;
      case "ratio":            return `Ratio diagram: ${visual.partA} to ${visual.partB}`;
      case "area":             return `${visual.mode === "perimeter" ? "Perimeter" : "Area"} diagram: ${visual.width} by ${visual.height} rectangle`;
      case "angle":            return `Angle diagram showing ${visual.degrees} degrees`;
      case "comparison":       return `Comparison bar: ${visual.a} compared to ${visual.b}`;
      case "number_line":      return `Number line from ${visual.start} to ${visual.end}`;
      case "coordinate":       return `Coordinate grid showing point (${visual.x}, ${visual.y})`;
      case "venn":             return `Venn diagram: ${visual.labelA || "Set A"} and ${visual.labelB || "Set B"}`;
      case "bar_chart":        return `Bar chart with ${(visual.labels||[]).length} values`;
      case "probability":      return `Probability visual`;
      case "number_sequence":  return `Number sequence: ${(visual.sequence||[]).join(", ")}`;
      case "fraction_decimal_percent": return `Fraction, decimal and percentage equivalence diagram`;
      case "atom":             return `Atom diagram for ${visual.element || "element"}`;
      case "molecule":         return `Molecule diagram: ${visual.formula}`;
      case "ph_scale":         return `pH scale showing value ${visual.value}`;
      case "cell":             return `${visual.cellType || "Cell"} diagram`;
      case "state_changes":    return `States of matter diagram`;
      case "coordinate_graph": return `Coordinate graph with ${(visual.equations||[]).length} equations`;
      case "data_table":       return `Data table with ${(visual.rows||[]).length} rows`;
      case "long_multiplication": return `Long multiplication: ${visual.num1} × ${visual.num2}`;
      case "interactive_plot": return `Interactive coordinate grid for plotting points`;
      case "forces":           return `Forces diagram: ${visual.label1} and ${visual.label2}`;
      case "wave":             return `Wave diagram: ${visual.type} wave`;
      case "food_chain":       return `Food chain: ${(visual.chain||[]).join(" → ")}`;
      case "formula_triangle": return `Formula triangle: ${visual.title || ""}`;
      case "nvr":              return `Non-verbal reasoning pattern sequence`;
      case "nvr_reflection":   return `Mirror reflection visual`;
      case "nvr_net":          return `3D net of a ${visual.shape3d}`;
      case "nvr_rotation":     return `Rotation ${visual.degrees} degrees ${visual.clockwise?"clockwise":"anti-clockwise"}`;
      case "nvr_oddoneout":    return `Odd one out visual`;
      case "nvr_matrix":       return `Non-verbal reasoning matrix`;
      case "nvr_paper_fold":   return `Paper fold puzzle: ${visual.foldType} fold`;
      case "alphabet_strip":   return `Alphabet strip`;
      case "analogy":          return `Word analogy: ${visual.wordA} is to ${visual.wordB}`;
      case "grammar":          return `Grammar labelling diagram`;
      case "synonym_ladder":   return `Synonym word ladder`;
      case "word_builder":     return `Word parts: prefix, root, suffix`;
      default:                 return "Maths visual aid";
    }
  })();

  const inner = (() => {
    switch (visual.type) {
      // ── Tier 0 (original) ──────────────────────────────────────────────────
      case "addition":        return <AdditionVis       {...visual} />;
      case "subtraction":     return <SubtractionVis    {...visual} />;
      case "place_value":     return <PlaceValueVis     {...visual} />;
      case "multiplication":  return <MultiplicationVis  {...visual} />;
      case "fraction":        return <FractionVis       {...visual} />;
      case "number_bond":     return <NumberBondVis     {...visual} />;
      case "counting":        return <CountingVis       {...visual} />;
      case "nvr":             return <NVRVis            {...visual} />;
      case "nvr_reflection":  return <NVRReflectionVis  {...visual} />;
      case "nvr_net":         return <NVRNetVis          {...visual} />;
      case "nvr_rotation":    return <NVRRotationVis     {...visual} />;
      case "nvr_oddoneout":   return <NVROddOneOutVis />;
      case "shape_property":  return <NVRShapePropertyVis {...visual} />;
      case "forces":          return <ForcesVis         {...visual} />;
      case "velocity":        return <VelocityVis       {...visual} />;
      case "food_chain":      return <FoodChainVis      {...visual} />;
      // ── Tier 1 (new) ───────────────────────────────────────────────────────
      case "coordinate":      return <CoordinateVis     {...visual} />;
      case "number_line":     return <NumberLineVis     {...visual} />;
      case "venn":            return <VennVis           {...visual} />;
      case "bar_chart":       return <BarChartVis       {...visual} />;
      // ── Tier 2 (new) ───────────────────────────────────────────────────────
      case "angle":           return <AngleVis          {...visual} />;
      case "area":            return <AreaVis           {...visual} />;
      case "formula_triangle":return <FormulaTriangleVis {...visual} />;
      case "motion_graph":    return <MotionGraphVis    {...visual} />;
      case "circuit":         return <CircuitVis        type={visual.circuitType} />;
      case "quadratic":       return <QuadraticVis      {...visual} />;
      case "element":         return <ElementVis        {...visual} />;
      // ── Tier 3 (cross-subject expansion) ───────────────────────────────────
      case "clock":           return <ClockVis          {...visual} />;
      case "money":           return <MoneyVis          {...visual} />;
      case "division":        return <DivisionVis       {...visual} />;
      case "division_equation":return <DivisionEquationVis total={visual.total} groups={visual.groups} />;
      case "ruler":           return <RulerVis          {...visual} />;
      case "ratio":           return <RatioVis          {...visual} />;
      case "alphabet_strip":  return <AlphabetStripVis  {...visual} />;
      case "analogy":         return <AnalogyVis        {...visual} />;
      case "number_sequence": return <NumberSequenceVis {...visual} />;
      case "nvr_matrix":      return <NVRMatrixVis      {...visual} />;
      case "nvr_paper_fold":  return <NVRPaperFoldVis  foldType={visual.foldType} punchPositions={visual.punchPositions} />;
      case "grammar":         return <GrammarVis        {...visual} />;
      // ── Tier 4 (new interactive + data) ───────────────────────────────────
      case "coordinate_graph": return <InteractiveGraph mode="equations" equations={visual.equations} points={visual.points} />;
      case "data_table":       return <DataTable headers={visual.headers} rows={visual.rows} title={visual.title} highlightCol={visual.highlightCol} highlightRow={visual.highlightRow} />;
      case "long_multiplication": return <LongMultiplication num1={visual.num1} num2={visual.num2} />;
      case "interactive_plot": return <InteractiveGraph mode="plot" />;
      case "comparison":      return <ComparisonVis     a={visual.a} b={visual.b} />;
      case "synonym_ladder":  return <SynonymLadderVis  {...visual} />;
      case "word_builder":    return <WordBuilderVis    {...visual} />;
      // ── Tier 4 (higher sciences + commerce) ────────────────────────────────
      case "atom":            return <AtomVis             {...visual} />;
      case "periodic_element":return <PeriodicTableVis   {...visual} />;
      case "state_changes":   return <StateChangesVis    highlighted={visual.highlighted} />;
      case "molecule":        return <MoleculeVis         {...visual} />;
      case "ph_scale":        return <PHScaleVis          value={visual.value} substance={visual.substance} />;
      case "cell":            return <CellVis             cellType={visual.cellType} />;
      case "punnett":         return <PunnettVis          {...visual} />;
      case "wave":            return <WaveVis             type={visual.waveType} amplitude={visual.amplitude} label={visual.label} />;
      case "em_spectrum":     return <EMSpectrumVis       highlighted={visual.highlighted} />;
      case "free_body":       return <FreeBodyVis         forces={visual.forces} />;
      case "energy_stores":   return <EnergyStoresVis     stores={visual.stores} transfers={visual.transfers} />;
      case "t_account":       return <TAccountVis         {...visual} />;
      case "break_even":      return <BreakEvenVis        {...visual} />;
      case "supply_demand":   return <SupplyDemandVis     {...visual} />;
      default:                return null;
    }
  })();

  if (!inner) return null;

  return (
    <div role="img" aria-label={ariaLabel}>
      <style>{`@keyframes lp-pulse{0%,100%{opacity:1}50%{opacity:0.6}}`}</style>
      {inner}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 1 & 2 — NEW VISUALS
// ═══════════════════════════════════════════════════════════════════════════════

// ── COORDINATE GRID ───────────────────────────────────────────────────────────
// Plots one or more points on a clean SVG axes grid with dashed projection lines

// ─── CORE DATA VISUALS (kept — used across maths/science/english) ────────────
function NumberLineVis({ min, max, marked, label, start, steps, direction, jumps, jumpSize, fractionDenom }) {
  const W = 210, H = fractionDenom ? 82 : 72, PAD = 16, ARR = 10;
  const range = (max - min) || 1;
  const toX = n => PAD + ((n - min) / range) * (W - PAD*2 - ARR);

  // ── Fraction marks mode (e.g. 0, 1/3, 2/3, 1) ────────────────────────────
  if (fractionDenom && fractionDenom > 0) {
    const den = fractionDenom;
    const fracTicks = [];
    for (let i = 0; i <= max * den; i++) {
      const val = i / den;
      if (val > max) break;
      const fx = toX(val);
      const isMajor = i % den === 0;
      fracTicks.push(
        <g key={i}>
          <line x1={fx} y1={34} x2={fx} y2={isMajor ? 42 : 38} stroke={isMajor ? T.indigo : "#cbd5e1"} strokeWidth={isMajor ? 2 : 1}/>
          <text x={fx} y={54} textAnchor="middle" fontSize={isMajor ? 9 : 7} fontWeight={isMajor ? "800" : "600"} fill={isMajor ? T.indigo : T.textMid}>
            {isMajor ? Math.round(val) : `${i % den}/${den}`}
          </text>
        </g>
      );
    }

    // Jump arcs if provided
    const jumpArcs = [];
    if (jumps && jumpSize) {
      let pos = start || 0;
      for (let j = 0; j < jumps; j++) {
        const from = pos;
        const to = pos + jumpSize;
        const fx = toX(from);
        const tx = toX(to);
        const mx = (fx + tx) / 2;
        jumpArcs.push(
          <g key={`arc-${j}`}>
            <path d={`M ${fx} 34 Q ${mx} ${10} ${tx} 34`} fill="none" stroke={T.nebula} strokeWidth={1.5}/>
            <polygon points={`${tx},34 ${tx-4},28 ${tx-4},34`} fill={T.nebula}/>
          </g>
        );
        pos = to;
      }
      // Highlight destination
      const destX = toX(pos);
      jumpArcs.push(
        <g key="dest">
          <rect x={destX-8} y={55} width={16} height={14} rx={3} fill={T.nebulaBg} stroke={T.nebula} strokeWidth={1.5}/>
          <text x={destX} y={65} textAnchor="middle" fontSize={8} fontWeight="900" fill={T.nebula}>{Math.round(pos * den)}/{den}</text>
        </g>
      );
    }

    return (
      <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <line x1={PAD-4} y1={37} x2={W-ARR} y2={37} stroke={T.indigo} strokeWidth={2}/>
          <polygon points={`${PAD-6},37 ${PAD},34 ${PAD},40`} fill={T.indigo}/>
          <polygon points={`${W-ARR+4},37 ${W-ARR-2},34 ${W-ARR-2},40`} fill={T.indigo}/>
          {fracTicks}
          {jumpArcs}
        </svg>
        {label && <Chip color={T.indigo} bg="white">{label}</Chip>}
      </Panel>
    );
  }

  // ── Repeated jumps mode (multiplication/division) ──────────────────────────
  if (jumps && jumpSize) {
    const jumpArcs = [];
    let pos = start || min;
    for (let j = 0; j < jumps; j++) {
      const from = pos;
      const to = pos + jumpSize;
      if (to > max) break;
      const fx = toX(from);
      const tx = toX(to);
      const mx = (fx + tx) / 2;
      const arcH = Math.min(22, Math.max(12, (tx - fx) * 0.4));
      jumpArcs.push(
        <g key={`j${j}`}>
          <path d={`M ${fx} 34 Q ${mx} ${34 - arcH} ${tx} 34`}
            fill="none" stroke={T.nebula} strokeWidth={1.5} strokeLinecap="round"/>
          <polygon points={`${tx},34 ${tx-3},29 ${tx-3},34`} fill={T.nebula}/>
          <text x={mx} y={34 - arcH - 3} textAnchor="middle" fontSize={7} fontWeight="700" fill={T.nebula}>+{jumpSize}</text>
        </g>
      );
      pos = to;
    }

    const ticks = [];
    const rawStep = range / 10;
    const step = rawStep <= 1 ? 1 : rawStep <= 2 ? 2 : rawStep <= 5 ? 5 : 10;
    const first = Math.ceil(min / step) * step;
    for (let v = first; v <= max; v += step) {
      const sx = toX(v);
      ticks.push(
        <g key={v}>
          <line x1={sx} y1={37} x2={sx} y2={43} stroke="#94a3b8" strokeWidth={1.5}/>
          <text x={sx} y={53} textAnchor="middle" fontSize={8} fill={T.textMid}>{v}</text>
        </g>
      );
    }
    // Highlight landing point
    const endX = toX(pos);

    return (
      <Panel accent={T.nebula} bg={T.nebulaBg} bd={T.nebulaBd}
        ariaLabel={`Number line: ${jumps} jumps of ${jumpSize}`}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <line x1={PAD-4} y1={37} x2={W-ARR} y2={37} stroke={T.slate} strokeWidth={2}/>
          <polygon points={`${PAD-6},37 ${PAD},34 ${PAD},40`} fill={T.slate}/>
          <polygon points={`${W-ARR+4},37 ${W-ARR-2},34 ${W-ARR-2},40`} fill={T.slate}/>
          {ticks}
          {jumpArcs}
          <circle cx={toX(start || min)} cy={37} r={4} fill={T.indigo}/>
          <circle cx={endX} cy={37} r={5} fill="white" stroke={T.nebula} strokeWidth={2}/>
          <text x={endX} y={40} textAnchor="middle" fontSize={8} fontWeight="900" fill={T.nebula}>?</text>
        </svg>
        {label && <Chip color={T.nebula} bg={T.nebulaBg}>{label}</Chip>}
      </Panel>
    );
  }

  const ticks = [];
  const rawStep = range / 10;
  const step = rawStep <= 1 ? 1 : rawStep <= 2 ? 2 : rawStep <= 5 ? 5 : 10;
  const first = Math.ceil(min / step) * step;
  for (let v = first; v <= max; v += step) {
    const sx = toX(v);
    ticks.push(
      <g key={v}>
        <line x1={sx} y1={34} x2={sx} y2={40} stroke="#94a3b8" strokeWidth={1.5}/>
        <text x={sx} y={51} textAnchor="middle" fontSize={8} fill={T.textMid}>{v}</text>
      </g>
    );
  }

  // ── NEW mode: start dot + dashed arc + ? at destination (never reveals answer) ─────
  if (start != null && steps != null && direction != null) {
    const dest = direction === "right" ? start + steps : start - steps;
    const sx = toX(start);
    const dx = toX(dest);
    const midX = (sx + dx) / 2;
    const arcY = 14;
    const arcPath = `M ${sx} 37 Q ${midX} ${arcY} ${dx} 37`;
    const arrowDir = direction === "right" ? 1 : -1;
    return (
      <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <line x1={PAD} y1={37} x2={W-ARR} y2={37} stroke={T.indigo} strokeWidth={2.5}/>
          <polygon points={`${W-ARR+4},37 ${W-ARR-2},34 ${W-ARR-2},40`} fill={T.indigo}/>
          {ticks}
          <path d={arcPath} fill="none" stroke={T.amber} strokeWidth={2} strokeDasharray="3 2"/>
          <polygon points={`${dx},37 ${dx - arrowDir*5},31 ${dx - arrowDir*5},37`} fill={T.amber}/>
          <circle cx={sx} cy={37} r={5.5} fill={T.indigo}/>
          <text x={sx} y={24} textAnchor="middle" fontSize={9} fontWeight="800" fill={T.indigo}>{start}</text>
          <line x1={sx} y1={25} x2={sx} y2={31} stroke={T.indigo} strokeWidth={1.5}/>
          <circle cx={dx} cy={37} r={5.5} fill="white" stroke={T.amber} strokeWidth={2}/>
          <text x={dx} y={40.5} textAnchor="middle" fontSize={9} fontWeight="900" fill={T.amber}>?</text>
          <text x={midX} y={arcY - 3} textAnchor="middle" fontSize={8} fontWeight="700" fill={T.amber}>
            {direction === "right" ? `+${steps}` : `−${steps}`}
          </text>
        </svg>
        {label && <Chip color={T.indigo} bg="white">{label}</Chip>}
      </Panel>
    );
  }

  // ── LEGACY mode: single marked point (rounding, missing value etc.) ──────────
  const mx = marked != null ? toX(marked) : null;
  return (
    <Panel accent={T.amber} bg={T.amberBg} bd={T.amberBd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1={PAD} y1={37} x2={W-ARR} y2={37} stroke={T.amber} strokeWidth={2.5}/>
        <polygon points={`${W-ARR+4},37 ${W-ARR-2},34 ${W-ARR-2},40`} fill={T.amber}/>
        {ticks}
        {mx != null && (
          <g>
            <circle cx={mx} cy={37} r={6} fill={T.amber}/>
            <text x={mx} y={24} textAnchor="middle" fontSize={9} fontWeight="800" fill={T.amber}>{marked}</text>
            <line x1={mx} y1={25} x2={mx} y2={31} stroke={T.amber} strokeWidth={1.5}/>
          </g>
        )}
      </svg>
      {label && <Chip color={T.amber} bg="white">{label}</Chip>}
    </Panel>
  );
}

// ── VENN DIAGRAM ─────────────────────────────────────────────────────────────
function VennVis({ labelA, labelB, itemsA, itemsB, itemsBoth }) {
  const W = 220, H = 148;
  const r = 52, cx1 = 82, cx2 = 138, cy = 82;
  // Layout items in columns
  const col = (items, x, maxY = 4) => items.slice(0,maxY).map((it,i) => (
    <text key={i} x={x} y={68 + i*14} textAnchor="middle" fontSize={10} fontWeight="700" fill={T.text}>{it}</text>
  ));
  return (
    <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <circle cx={cx1} cy={cy} r={r} fill={T.indigoBg} fillOpacity={0.7} stroke={T.indigo} strokeWidth={2}/>
        <circle cx={cx2} cy={cy} r={r} fill={T.emeraldBg} fillOpacity={0.7} stroke={T.emerald} strokeWidth={2}/>
        {/* Labels */}
        <text x={cx1-18} y={13} textAnchor="middle" fontSize={9} fontWeight="800" fill={T.indigo}>{labelA}</text>
        <text x={cx2+18} y={13} textAnchor="middle" fontSize={9} fontWeight="800" fill={T.emerald}>{labelB}</text>
        {/* Items only in A */}
        {col(itemsA, cx1 - 22)}
        {/* Items only in B */}
        {col(itemsB, cx2 + 22)}
        {/* Items in both */}
        {col(itemsBoth, (cx1+cx2)/2)}
      </svg>
    </Panel>
  );
}

// ── BAR CHART ─────────────────────────────────────────────────────────────────
function BarChartVis({ bars, yLabel = "Frequency", title }) {
  const W = 210, H = 130, PAD_L = 28, PAD_B = 36, PAD_T = 14, PAD_R = 8;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  const barW = Math.min(28, (chartW / bars.length) - 6);
  const gap = (chartW - barW * bars.length) / (bars.length + 1);
  const toY = v => PAD_T + chartH - (v / maxVal) * chartH;
  // Y-axis ticks: 0, max/2, max
  const yTicks = [0, Math.round(maxVal/2), maxVal];

  return (
    <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}>
      {title && <Chip color={T.indigo} bg={T.indigoBg}>{title}</Chip>}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Y ticks */}
        {yTicks.map(v => {
          const sy = toY(v);
          return (
            <g key={v}>
              <line x1={PAD_L-3} y1={sy} x2={W-PAD_R} y2={sy} stroke={T.slateBd} strokeWidth={1}/>
              <text x={PAD_L-5} y={sy+3} textAnchor="end" fontSize={7} fill={T.textMid}>{v}</text>
            </g>
          );
        })}
        {/* Axes */}
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H-PAD_B} stroke={T.slate} strokeWidth={1.5}/>
        <line x1={PAD_L} y1={H-PAD_B} x2={W-PAD_R} y2={H-PAD_B} stroke={T.slate} strokeWidth={1.5}/>
        {/* Bars */}
        {bars.map((b, i) => {
          const bx = PAD_L + gap + i * (barW + gap);
          const by = toY(b.value);
          const bh = H - PAD_B - by;
          return (
            <g key={i}>
              <rect x={bx} y={by} width={barW} height={bh} rx={3}
                fill={T.indigoBg} stroke={T.indigo} strokeWidth={1.5}/>
              <text x={bx + barW/2} y={by - 3} textAnchor="middle" fontSize={8} fontWeight="700" fill={T.indigo}>{b.value}</text>
              <text x={bx + barW/2} y={H-PAD_B+11} textAnchor="middle" fontSize={7} fill={T.textMid}>{b.label}</text>
            </g>
          );
        })}
        {/* Y axis label */}
        <text x={7} y={H/2} textAnchor="middle" fontSize={7} fill={T.textMid}
          transform={`rotate(-90, 7, ${H/2})`}>{yLabel}</text>
      </svg>
    </Panel>
  );
}

// ── ANGLES ───────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════════
// EXTENDED PARSER
// ═══════════════════════════════════════════════════════════════════════════════
function parseVisualExtended(topic, questionText, subject, yearLevel) {
  const t    = (topic || "").toLowerCase();
  const q    = (questionText || "").toLowerCase();
  const subj = (subject || "").toLowerCase();
  const nums = ((questionText || "").match(/-?\d+(?:\.\d+)?/g) || []).map(Number);

  // ── SIMULTANEOUS EQUATIONS / COORDINATE GRAPH ────────────────────────────
  // Triggers: "simultaneous", "y = mx + c", "graph of", "plot the line"
  if (t.includes("simultaneous") || t.includes("linear_graph") || t.includes("graphs_linear") ||
      /simultaneous|solve.*graphically|plot.*(?:y\s*=)|graph.*(?:y\s*=)/i.test(questionText)) {
    const eqMatches = [...(questionText || "").matchAll(/y\s*=\s*[+-]?\d*\.?\d*\s*x\s*[+-]?\s*\d+\.?\d*/gi)];
    if (eqMatches.length >= 1) {
      return { type: "coordinate_graph", equations: eqMatches.map(m => m[0].trim()) };
    }
  }

  // ── DATA TABLE — "the table shows", "use the table", "from the table" ──
  if (/table.*shows|use.*table|from.*table|read.*table|following table/i.test(questionText)) {
    // Try to extract tabular data from question text (e.g., "Day | Mon | Tue | Wed")
    const lines = (questionText || "").split(/\n/).filter(l => l.includes('|'));
    if (lines.length >= 2) {
      const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
      const rows = lines.slice(1).map(l => l.split('|').map(c => c.trim()).filter(Boolean));
      if (headers.length >= 2 && rows.length >= 1) {
        return { type: "data_table", headers, rows };
      }
    }
    // Fallback: detect common data patterns
    const labelPattern = (questionText || "").match(/(?:Monday|Tuesday|Wednesday|Thursday|Friday|January|February|March|April|May|June|Week \d|Class \d|Group [A-Z])/gi);
    if (labelPattern && labelPattern.length >= 2 && nums.length >= labelPattern.length) {
      return {
        type: "data_table",
        headers: ["Category", "Value"],
        rows: labelPattern.map((l, i) => [l, nums[i] !== undefined ? String(nums[i]) : "?"]),
      };
    }
  }

  // ── LONG MULTIPLICATION — "multiply 234 × 56", "long multiplication" ───
  if (t.includes("long_multiplication") || t.includes("multiplication_2digit") || t.includes("multiplication_3digit") ||
      /long multiplication|partial products|column multiplication/i.test(questionText)) {
    const mulMatch = (questionText || "").match(/(\d{2,4})\s*[×x]\s*(\d{2,4})/i);
    if (mulMatch) {
      return { type: "long_multiplication", num1: mulMatch[1], num2: mulMatch[2] };
    }
    if (nums.length >= 2 && nums[0] >= 10 && nums[1] >= 10) {
      return { type: "long_multiplication", num1: String(nums[0]), num2: String(nums[1]) };
    }
  }

  // ── INTERACTIVE PLOT — "plot the coordinates", "plot these points" ──────
  if (/plot.*(?:point|coordinate)|place.*(?:point|coordinate).*grid|mark.*point.*grid/i.test(questionText)) {
    return { type: "interactive_plot", equation: null };
  }

  // ── COORDINATES ────────────────────────────────────────────────────────────
  if (t.includes("coord") || t.includes("plot") || /\(\s*-?\d+\s*,\s*-?\d+\s*\)/.test(questionText)) {
    const ptMatches = [...(questionText||"").matchAll(/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g)];
    if (ptMatches.length) {
      const points = ptMatches.map(m => ({ x: parseInt(m[1]), y: parseInt(m[2]) }));
      const xs = points.map(p=>p.x), ys = points.map(p=>p.y);
      const pad = 2;
      const xRange = [Math.min(-1,...xs)-pad, Math.max(1,...xs)+pad];
      const yRange = [Math.min(-1,...ys)-pad, Math.max(1,...ys)+pad];
      return { type: "coordinate", points, xRange, yRange };
    }
  }

  // ── NUMBER LINE ────────────────────────────────────────────────────────────
  if (t.includes("number_line") || t.includes("rounding") || t.includes("round") ||
      /round.*nearest|nearest.*\d+|number line/i.test(questionText)) {
    const pos = nums.filter(n => n >= 0);
    if (pos.length >= 1) {
      const val  = pos[0];
      // round to nearest 10 or 100
      const step = val >= 100 ? 100 : val >= 50 ? 10 : val >= 10 ? 10 : 1;
      const mn   = Math.floor(val/step)*step - step;
      const mx   = Math.ceil(val/step)*step  + step;
      return { type: "number_line", min: mn, max: mx, marked: val,
        label: `nearest ${step}` };
    }
  }

  // ── VENN DIAGRAM ──────────────────────────────────────────────────────────
  if (t.includes("venn") || t.includes("set") || /factors? of|multiples? of|venn/i.test(questionText)) {
    // Multiples/factors Venn: "factors of 12 and factors of 18"
    const factorMatch = (questionText||"").match(/factors? of (\d+) and factors? of (\d+)/i);
    const multipleMatch = (questionText||"").match(/multiples? of (\d+) and multiples? of (\d+)/i);
    if (factorMatch || multipleMatch) {
      const m = factorMatch || multipleMatch;
      const a = parseInt(m[1]), b = parseInt(m[2]);
      const type = factorMatch ? "factor" : "multiple";
      const getFactors = n => Array.from({length:n},(_, i)=>i+1).filter(x=>n%x===0);
      const getMultiples = (n, max=40) => Array.from({length:Math.floor(max/n)},(_,i)=>(i+1)*n).filter(x=>x<=max);
      const setA = type==="factor" ? getFactors(a) : getMultiples(a);
      const setB = type==="factor" ? getFactors(b) : getMultiples(b);
      const both = setA.filter(x=>setB.includes(x));
      const onlyA = setA.filter(x=>!setB.includes(x)).slice(0,4);
      const onlyB = setB.filter(x=>!setA.includes(x)).slice(0,4);
      return { type:"venn", labelA:`${type}s of ${a}`, labelB:`${type}s of ${b}`,
        itemsA: onlyA.map(String), itemsB: onlyB.map(String), itemsBoth: both.map(String) };
    }
  }

  // ── BAR CHART ──────────────────────────────────────────────────────────────
  if (t.includes("bar_chart") || t.includes("pictogram") || t.includes("statistics") || t.includes("tally") ||
      /bar chart|how many more|frequency/i.test(questionText)) {
    // Try to parse: "Mon: 5, Tue: 8, Wed: 3" or "apples: 6, bananas: 4"
    const barMatch = [...(questionText||"").matchAll(/([A-Za-z][A-Za-z ]{0,10}):\s*(\d+)/g)];
    if (barMatch.length >= 2) {
      const bars = barMatch.slice(0,6).map(m => ({ label: m[1].trim(), value: parseInt(m[2]) }));
      return { type: "bar_chart", bars };
    }
  }

  // ── ANGLES ────────────────────────────────────────────────────────────────
  if (t.includes("angle") || t.includes("geometry") ||
      /acute|obtuse|reflex|right angle|\d+\s*°|\d+\s*degrees/i.test(questionText)) {

    // Multi-angle scenarios — "angles on a straight line"
    if (/straight line|supplementary/i.test(questionText)) {
      const allDegs = [...(questionText||"").matchAll(/(\d+)\s*(?:°|degrees?)/gi)].map(m => parseInt(m[1]));
      if (allDegs.length >= 1) return { type: "angle", scenario: "straight_line", knownAngles: allDegs, unknownLabel: "?" };
    }
    // Angles in a triangle
    if (/triangle|three angles/i.test(questionText)) {
      const allDegs = [...(questionText||"").matchAll(/(\d+)\s*(?:°|degrees?)/gi)].map(m => parseInt(m[1]));
      if (allDegs.length >= 1 && allDegs.length <= 2) return { type: "angle", scenario: "triangle", knownAngles: allDegs, unknownLabel: "?" };
    }
    // Angles at a point
    if (/at a point|around a point|full turn/i.test(questionText)) {
      const allDegs = [...(questionText||"").matchAll(/(\d+)\s*(?:°|degrees?)/gi)].map(m => parseInt(m[1]));
      if (allDegs.length >= 1) return { type: "angle", scenario: "at_point", knownAngles: allDegs, unknownLabel: "?" };
    }
    // Vertically opposite
    if (/vertically opposite|vert.*opp/i.test(questionText)) {
      const allDegs = [...(questionText||"").matchAll(/(\d+)\s*(?:°|degrees?)/gi)].map(m => parseInt(m[1]));
      if (allDegs.length >= 1) return { type: "angle", scenario: "vertically_opposite", knownAngles: allDegs, unknownLabel: "?" };
    }

    // Single angle (original behaviour)
    const degMatch = (questionText||"").match(/(\d+)\s*(?:°|degrees?)/i);
    if (degMatch) {
      const deg = parseInt(degMatch[1]);
      if (deg > 0 && deg < 360) return { type: "angle", degrees: deg };
    }
    if (/right angle/i.test(questionText)) return { type:"angle", degrees: 90 };
    if (/acute/i.test(questionText))       return { type:"angle", degrees: 55 };
    if (/obtuse/i.test(questionText))      return { type:"angle", degrees: 120 };
    if (/reflex/i.test(questionText))      return { type:"angle", degrees: 210 };
  }

  // ── PAPER FOLDS (NVR) ──────────────────────────────────────────────────────
  if (/paper.*fold|fold.*paper|punch.*hole|hole.*punch|unfold/i.test(questionText)) {
    const foldType = /diagonal/i.test(questionText) ? "diagonal"
      : /quarter/i.test(questionText) ? "quarter"
      : /horizontal/i.test(questionText) ? "half_horizontal"
      : "half_vertical";
    // Generate punch positions based on question content
    const punches = /corner/i.test(questionText) ? [[0.8, 0.2]]
      : /centre|center|middle/i.test(questionText) ? [[0.5, 0.5]]
      : /edge|side/i.test(questionText) ? [[0.5, 0.2]]
      : [[0.3, 0.4]];
    return { type: "nvr_paper_fold", foldType, punchPositions: punches };
  }

  // ── AREA / PERIMETER ──────────────────────────────────────────────────────
  if ((t.includes("area") || t.includes("perimeter")) && subj.includes("math")) {
    // Match "5cm × 6cm", "5 by 6", "5x6", "3m × 4m" — allow optional unit suffix on first number
    const byMatch = (questionText||"").match(/(\d+)\s*(?:cm|m{1,2}|km|in|ft)?\s*(?:by|×|x)\s*(\d+)/i);
    const lwMatch = (questionText||"").match(/length[^\d]*(\d+)[^\d]*width[^\d]*(\d+)/i);
    const wlMatch = (questionText||"").match(/width[^\d]*(\d+)[^\d]*height[^\d]*(\d+)/i);
    const m = byMatch || lwMatch || wlMatch;
    if (m) {
      const w = parseInt(m[1]), h = parseInt(m[2]);
      // Cap at 12×10 so the grid stays renderable
      if (w<=12 && h<=10 && w>0 && h>0)
        return { type:"area", width:w, height:h, mode: t.includes("perim") ? "perimeter" : "area" };
    }
  }

  // ── FORMULA TRIANGLE ──────────────────────────────────────────────────────
  if (subj.includes("physics") || subj.includes("science") || subj.includes("chemistry")) {
    // Speed/distance/time
    if (/speed|distance|time|v\s*=|s\s*=|d\s*=|t\s*=/.test(q) && t.includes("speed") || t.includes("distance") || t.includes("velocity")) {
      const unknown = /find.*speed|what.*speed|calculat.*speed/i.test(questionText) ? "top"
        : /find.*distance|what.*distance/i.test(questionText) ? "left"
        : /find.*time|what.*time/i.test(questionText) ? "right" : null;
      return { type:"formula_triangle", top:"v", left:"d", right:"t", unknown, title:"Speed = Distance ÷ Time" };
    }
    // Force = mass × acceleration
    if (/force|mass|acceleration|f\s*=|m\s*=|a\s*=/.test(q) && (t.includes("f_ma") || t.includes("newton"))) {
      const unknown = /find.*force/i.test(questionText) ? "top"
        : /find.*mass/i.test(questionText) ? "left"
        : /find.*accel/i.test(questionText) ? "right" : null;
      return { type:"formula_triangle", top:"F", left:"m", right:"a", unknown, title:"F = m × a" };
    }
    // Power = current × voltage
    if (/power|current|voltage|p\s*=|i\s*=|v\s*=/.test(q) && t.includes("power")) {
      const unknown = /find.*power/i.test(questionText) ? "top"
        : /find.*current/i.test(questionText) ? "left"
        : /find.*voltage/i.test(questionText) ? "right" : null;
      return { type:"formula_triangle", top:"P", left:"I", right:"V", unknown, title:"P = I × V" };
    }
    // Density = mass / volume
    if (/density|mass|volume/.test(q) && t.includes("density")) {
      const unknown = /find.*density/i.test(questionText) ? "top"
        : /find.*mass/i.test(questionText) ? "left"
        : /find.*volume/i.test(questionText) ? "right" : null;
      return { type:"formula_triangle", top:"ρ", left:"m", right:"V", unknown, title:"Density = mass ÷ volume" };
    }
  }

  // ── MOTION GRAPH ──────────────────────────────────────────────────────────
  if ((subj.includes("physics") || subj.includes("science")) &&
      (t.includes("distance_time") || t.includes("velocity_time") || t.includes("motion_graph") ||
       /distance.time graph|velocity.time graph|d-t graph|v-t graph/i.test(questionText))) {
    const motionType = /velocity.time|v.t graph/i.test(questionText) ? "velocity_time" : "distance_time";
    const curveType = /constant speed|uniform/i.test(questionText) ? "constant"
      : /speed(ing)? up|accelerat|increasing/i.test(questionText) ? "accelerating"
      : /slow(ing)? down|deceler/i.test(questionText) ? "decelerating"
      : /stationary|not moving|at rest/i.test(questionText) ? "stationary"
      : "constant";
    return { type:"motion_graph", motionType, curveType };
  }

  // ── CIRCUIT ───────────────────────────────────────────────────────────────
  if ((subj.includes("physics") || subj.includes("science")) &&
      (t.includes("circuit") || /series circuit|parallel circuit|bulb|battery/i.test(questionText))) {
    const circType = /parallel/i.test(questionText) ? "parallel" : "series";
    return { type:"circuit", circuitType: circType };
  }

  // ── QUADRATIC ─────────────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("quadratic") || t.includes("parabola") ||
      /x²|x\^2|ax²|roots? of|discriminant/i.test(questionText))) {
    // Parse ax² + bx + c = 0
    const coeffMatch = (questionText||"").match(/(-?\d*)\s*x[²\^2]\s*([+\-]\s*\d*)\s*x\s*([+\-]\s*\d+)/);
    if (coeffMatch) {
      const a = parseInt(coeffMatch[1]||"1")||1;
      const b = parseInt(coeffMatch[2].replace(/\s/g,""))||0;
      const c = parseInt(coeffMatch[3].replace(/\s/g,""))||0;
      const disc = b*b - 4*a*c;
      if (disc >= 0) {
        const vx = -b/(2*a), vy = -(disc)/(4*a);
        const r1 = (-b - Math.sqrt(disc))/(2*a);
        const r2 = (-b + Math.sqrt(disc))/(2*a);
        return { type:"quadratic", a, roots: disc>0?[+r1.toFixed(1),+r2.toFixed(1)]:null,
          vertex:{x:+vx.toFixed(1),y:+vy.toFixed(1)} };
      }
    }
    // Fallback: show shape only
    return { type:"quadratic", a:1, roots:[-2,2], vertex:{x:0,y:-4} };
  }

  // ── PERIODIC TABLE ELEMENT ────────────────────────────────────────────────
  if ((subj.includes("chemistry") || subj.includes("science")) &&
      (t.includes("periodic") || t.includes("element") || t.includes("atom"))) {
    const ELEMENTS = {
      H:  {name:"Hydrogen",  n:1,  mass:"1.008",  group:1,  period:1, groupType:"nonmetal"},
      He: {name:"Helium",    n:2,  mass:"4.003",  group:18, period:1, groupType:"noble"},
      Li: {name:"Lithium",   n:3,  mass:"6.941",  group:1,  period:2, groupType:"alkali"},
      C:  {name:"Carbon",    n:6,  mass:"12.011", group:14, period:2, groupType:"nonmetal"},
      N:  {name:"Nitrogen",  n:7,  mass:"14.007", group:15, period:2, groupType:"nonmetal"},
      O:  {name:"Oxygen",    n:8,  mass:"15.999", group:16, period:2, groupType:"nonmetal"},
      F:  {name:"Fluorine",  n:9,  mass:"18.998", group:17, period:2, groupType:"halogen"},
      Ne: {name:"Neon",      n:10, mass:"20.180", group:18, period:2, groupType:"noble"},
      Na: {name:"Sodium",    n:11, mass:"22.990", group:1,  period:3, groupType:"alkali"},
      Mg: {name:"Magnesium", n:12, mass:"24.305", group:2,  period:3, groupType:"alkaline"},
      Al: {name:"Aluminium", n:13, mass:"26.982", group:13, period:3, groupType:"metalloid"},
      Si: {name:"Silicon",   n:14, mass:"28.086", group:14, period:3, groupType:"metalloid"},
      Cl: {name:"Chlorine",  n:17, mass:"35.453", group:17, period:3, groupType:"halogen"},
      Ar: {name:"Argon",     n:18, mass:"39.948", group:18, period:3, groupType:"noble"},
      K:  {name:"Potassium", n:19, mass:"39.098", group:1,  period:4, groupType:"alkali"},
      Ca: {name:"Calcium",   n:20, mass:"40.078", group:2,  period:4, groupType:"alkaline"},
      Fe: {name:"Iron",      n:26, mass:"55.845", group:8,  period:4, groupType:"transition"},
      Cu: {name:"Copper",    n:29, mass:"63.546", group:11, period:4, groupType:"transition"},
      Zn: {name:"Zinc",      n:30, mass:"65.38",  group:12, period:4, groupType:"transition"},
      Br: {name:"Bromine",   n:35, mass:"79.904", group:17, period:4, groupType:"halogen"},
      Ag: {name:"Silver",    n:47, mass:"107.868",group:11, period:5, groupType:"transition"},
      Au: {name:"Gold",      n:79, mass:"196.967",group:11, period:6, groupType:"transition"},
    };
    // Try to find element symbol mentioned in question
    const symMatch = Object.keys(ELEMENTS).find(sym =>
      new RegExp(`\\b${sym}\\b`).test(questionText) ||
      new RegExp(ELEMENTS[sym].name,"i").test(questionText)
    );
    if (symMatch) {
      const el = ELEMENTS[symMatch];
      return { type:"element", symbol:symMatch, name:el.name, atomicNumber:el.n,
        mass:el.mass, group:el.group, period:el.period, groupType:el.groupType };
    }
  }

  // ── PERCENTAGE BAR ─────────────────────────────────────────────────────────
  if (subj.includes("math") && (t.includes("percent") || /%/.test(questionText) || /percent/i.test(questionText))) {
    const pctMatch = (questionText || "").match(/(\d+)\s*%\s*(?:of\s*)?(\d+)/i)
      || (questionText || "").match(/(\d+)\s*percent(?:\s+of)?\s+(\d+)/i);
    if (pctMatch) {
      const pct = parseInt(pctMatch[1]), whole = parseInt(pctMatch[2]);
      if (pct > 0 && pct <= 100 && whole > 0 && whole <= 200) {
        return { type: "comparison", a: Math.round(whole * pct / 100), b: whole };
      }
    }
  }

  // ── HCF / LCM ──────────────────────────────────────────────────────────────
  if (subj.includes("math") && /hcf|lcm|highest common factor|lowest common multiple|common factor|common multiple/i.test(questionText)) {
    const twoNums = (questionText || "").match(/(\d+)\s*and\s*(\d+)/i);
    if (twoNums) {
      const a = parseInt(twoNums[1]), b = parseInt(twoNums[2]);
      if (a > 0 && b > 0 && a <= 100 && b <= 100) {
        const factorsA = Array.from({length:a},(_,i)=>i+1).filter(n=>a%n===0);
        const factorsB = Array.from({length:b},(_,i)=>i+1).filter(n=>b%n===0);
        const common   = factorsA.filter(n=>factorsB.includes(n));
        return { type:"venn",
          setA: factorsA.filter(n=>!common.includes(n)).slice(0,4),
          setB: factorsB.filter(n=>!common.includes(n)).slice(0,4),
          intersection: common.slice(0,4),
          labelA:`Factors of ${a}`, labelB:`Factors of ${b}` };
      }
    }
  }

  // ── MEAN / AVERAGE ─────────────────────────────────────────────────────────
  if (subj.includes("math") && /\bmean\b|\baverage\b|\bmode\b|\bmedian\b/i.test(questionText)) {
    const allNums = (questionText || "").match(/\d+/g);
    if (allNums && allNums.length >= 3) {
      const values = allNums.map(Number).filter(n=>n>0&&n<=100);
      if (values.length >= 3) {
        return { type:"bar_chart", labels:values.map((_,i)=>`v${i+1}`), values, title:"Data set", yLabel:"" };
      }
    }
  }

  // Fallback to original parser
  return parseVisual(topic, questionText, subject, yearLevel);
}