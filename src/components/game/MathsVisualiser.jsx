"use client";
// ─── MathsVisualiser.jsx ─────────────────────────────────────────────────────
// LaunchPard-native concrete visuals. Bright panels, WCAG AA accessible.
// Single file — split into MathsVisuals_Core + MathsVisuals_Tier2 caused
// Turbopack barrel-export resolution issues; merged back for reliability.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo } from "react";

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
  // Visual cap: max 5 rows × 8 cols (40 dots) to fit panel cleanly
  const dispR = Math.min(rows, 5);
  const dispC = Math.min(cols, 8);
  const truncated = rows > 5 || cols > 8;
  const dotSize = dispC > 6 ? 12 : dispC > 4 ? 14 : 18;
  return (
    <Panel accent={T.emerald} bg={T.emeraldBg} bd={T.emeraldBd}
      ariaLabel={`Multiplication array`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
        {Array.from({ length: dispR }).map((_, ri) => (
          <div key={ri} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {Array.from({ length: dispC }).map((_, ci) => (
              <Dot key={ci} color={T.emerald} bg={T.emeraldBg} border={T.emerald} size={dotSize} />
            ))}
          </div>
        ))}
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

function NVRShapeItem({ shape, size, fill, stroke, rotate = 0, opacity = 1, isQuestion = false }) {
  const cx = 24, cy = 24, r = size;
  const shapeFn = NVR_SHAPES[shape] || NVR_SHAPES.circle;
  const svgContent = shapeFn(cx, cy, r, fill, stroke);
  return (
    <div style={{
      width: 48, height: 48,
      borderRadius: 10,
      background: isQuestion ? T.amberBg : T.slateBg,
      border: `2px solid ${isQuestion ? T.amberBd : T.slateBd}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
      animation: isQuestion ? "lp-pulse 2s ease-in-out infinite" : "none",
    }}>
      {isQuestion ? (
        <span style={{ fontSize: 20, fontWeight: 900, color: T.amber }}>?</span>
      ) : (
        <svg width={48} height={48} viewBox="0 0 48 48"
          style={{ transform: `rotate(${rotate}deg)`, opacity }}>
          <g dangerouslySetInnerHTML={{ __html: svgContent }} />
        </svg>
      )}
    </div>
  );
}

function NVRVis({ sequence }) {
  // sequence: array of { shape, size, fill, stroke, rotate }
  // Last item is always { isQuestion: true }
  return (
    <Panel accent={T.slate} bg={T.slateBg} bd={T.slateBd}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        {sequence.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <NVRShapeItem {...item} />
            {i < sequence.length - 1 && (
              <span style={{ fontSize: 16, color: T.textMid, fontWeight: 700 }}>→</span>
            )}
          </div>
        ))}
      </div>
      <Chip color={T.slate} bg={T.slateBg}>What comes next?</Chip>
    </Panel>
  );
}

// ─── NVR SHAPE PROPERTY VISUAL ────────────────────────────────────────────────
// For geometry questions: "how many sides does a X have?" etc.
// Shows the shape large, labelled with sides count and a corner dot at each vertex.
const SHAPE_PROPS = {
  triangle: { sides: 3, corners: 3, label: "Triangle",  svgPath: (cx,cy,r) => `${cx},${cy-r} ${cx+r*0.87},${cy+r*0.5} ${cx-r*0.87},${cy+r*0.5}`, type: "polygon",
    vertices: (cx,cy,r) => [[cx,cy-r],[cx+r*0.87,cy+r*0.5],[cx-r*0.87,cy+r*0.5]] },
  square:   { sides: 4, corners: 4, label: "Square",    svgPath: (cx,cy,r) => `${cx-r},${cy-r} ${cx+r},${cy-r} ${cx+r},${cy+r} ${cx-r},${cy+r}`, type: "polygon",
    vertices: (cx,cy,r) => [[cx-r,cy-r],[cx+r,cy-r],[cx+r,cy+r],[cx-r,cy+r]] },
  rectangle:{ sides: 4, corners: 4, label: "Rectangle", svgPath: (cx,cy,r) => `${cx-r*1.3},${cy-r*0.75} ${cx+r*1.3},${cy-r*0.75} ${cx+r*1.3},${cy+r*0.75} ${cx-r*1.3},${cy+r*0.75}`, type: "polygon",
    vertices: (cx,cy,r) => [[cx-r*1.3,cy-r*0.75],[cx+r*1.3,cy-r*0.75],[cx+r*1.3,cy+r*0.75],[cx-r*1.3,cy+r*0.75]] },
  pentagon: { sides: 5, corners: 5, label: "Pentagon",  type: "polygon",
    svgPath: (cx,cy,r) => Array.from({length:5},(_,i)=>{const a=(i*72-90)*Math.PI/180;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;}).join(" "),
    vertices: (cx,cy,r) => Array.from({length:5},(_,i)=>{const a=(i*72-90)*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];}) },
  hexagon:  { sides: 6, corners: 6, label: "Hexagon",   type: "polygon",
    svgPath: (cx,cy,r) => Array.from({length:6},(_,i)=>{const a=(i*60-90)*Math.PI/180;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;}).join(" "),
    vertices: (cx,cy,r) => Array.from({length:6},(_,i)=>{const a=(i*60-90)*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];}) },
  octagon:  { sides: 8, corners: 8, label: "Octagon",   type: "polygon",
    svgPath: (cx,cy,r) => Array.from({length:8},(_,i)=>{const a=(i*45-90)*Math.PI/180;return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`;}).join(" "),
    vertices: (cx,cy,r) => Array.from({length:8},(_,i)=>{const a=(i*45-90)*Math.PI/180;return [cx+r*Math.cos(a),cy+r*Math.sin(a)];}) },
  circle:   { sides: 0, corners: 0, label: "Circle",    type: "circle", svgPath: null, vertices: () => [] },
  diamond:  { sides: 4, corners: 4, label: "Diamond",   type: "polygon",
    svgPath: (cx,cy,r) => `${cx},${cy-r} ${cx+r},${cy} ${cx},${cy+r} ${cx-r},${cy}`,
    vertices: (cx,cy,r) => [[cx,cy-r],[cx+r,cy],[cx,cy+r],[cx-r,cy]] },
};

function NVRShapePropertyVis({ shapeName }) {
  const W = 170, H = 150, cx = 85, cy = 72, r = 44;
  const props = SHAPE_PROPS[shapeName] || SHAPE_PROPS.triangle;
  const verts = props.vertices(cx, cy, r);
  const color = T.indigo;

  return (
    <Panel accent={color} bg={T.indigoBg} bd={T.indigoBd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {props.type === "circle" ? (
          <circle cx={cx} cy={cy} r={r} fill={T.indigoBg} stroke={color} strokeWidth={2.5}/>
        ) : (
          <polygon points={props.svgPath(cx, cy, r)}
            fill={T.indigoBg} stroke={color} strokeWidth={2.5}/>
        )}
        {/* Corner dots */}
        {verts.map(([vx, vy], i) => (
          <circle key={i} cx={vx} cy={vy} r={4} fill={color}/>
        ))}
        {/* Shape name */}
        <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fontWeight="800" fill={color}>
          {props.label}
        </text>
      </svg>
      <div style={{ display: "flex", gap: 8 }}>
        {props.sides > 0 && <Chip color={color} bg="white">{props.sides} sides</Chip>}
        {props.corners > 0 && <Chip color={T.nebula} bg={T.nebulaBg}>{props.corners} corners</Chip>}
        {props.sides === 0 && <Chip color={color} bg="white">0 corners · curved</Chip>}
      </div>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHYSICS VISUALS
// ═══════════════════════════════════════════════════════════════════════════════

// Arrow component — length encodes magnitude, head encodes direction
// Colour-blind safe: uses pattern + label, colour is supplementary
function Arrow({ length, color, label, direction = "right", y = 24 }) {
  const MIN = 18, MAX = 100;
  const px = Math.max(MIN, Math.min(MAX, length));
  const headSize = 8;

  if (direction === "right") {
    return (
      <g>
        <line x1={0} y1={y} x2={px} y2={y} stroke={color} strokeWidth={3} strokeLinecap="round"/>
        <polygon points={`${px},${y} ${px-headSize},${y-headSize*0.6} ${px-headSize},${y+headSize*0.6}`} fill={color}/>
        {label && <text x={px/2} y={y-8} textAnchor="middle" fontSize={9} fontWeight="700" fill={color}>{label}</text>}
      </g>
    );
  }
  return (
    <g>
      <line x1={px} y1={y} x2={0} y2={y} stroke={color} strokeWidth={3} strokeLinecap="round"/>
      <polygon points={`0,${y} ${headSize},${y-headSize*0.6} ${headSize},${y+headSize*0.6}`} fill={color}/>
      {label && <text x={px/2} y={y-8} textAnchor="middle" fontSize={9} fontWeight="700" fill={color}>{label}</text>}
    </g>
  );
}

// FORCES ──────────────────────────────────────────────────────────────────────
// Arrows are FIXED LENGTH — they show direction + identity only, not magnitude.
// Magnitude is only communicated via labels. This ensures the visual doesn't
// ─── NVR REFLECTION VISUAL ────────────────────────────────────────────────────
function NVRReflectionVis({ letter = "d" }) {
  const W = 180, H = 80;
  return (
    <Panel accent={T.nebula} bg={T.nebulaBg} bd={T.nebulaBd}
      ariaLabel={`What is the reflection of ${letter} in a vertical mirror?`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Original letter */}
        <text x={52} y={52} textAnchor="middle" fontSize={36} fontWeight="900"
          fill={T.indigo} fontFamily="monospace">{letter}</text>
        {/* Mirror line */}
        <line x1={90} y1={6} x2={90} y2={74} stroke={T.slate} strokeWidth={2}
          strokeDasharray="4,3"/>
        <text x={90} y={5} textAnchor="middle" fontSize={7} fill={T.textMid}
          dominantBaseline="hanging">mirror</text>
        {/* Question mark on reflected side */}
        <text x={128} y={52} textAnchor="middle" fontSize={36} fontWeight="900"
          fill={T.nebula} fontFamily="monospace" opacity={0.6}>?</text>
        {/* Arrow hint */}
        <path d="M 68 42 Q 90 30 112 42" fill="none" stroke={T.slate}
          strokeWidth={1.5} strokeDasharray="3,2" markerEnd="url(#arrowhead)"/>
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6"
            refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={T.slate}/>
          </marker>
        </defs>
      </svg>
      <Chip color={T.nebula} bg={T.nebulaBg}>What does {letter} look like in the mirror?</Chip>
    </Panel>
  );
}

// ─── NVR NET VISUAL ────────────────────────────────────────────────────────────
function NVRNetVis({ shape3d = "cube" }) {
  const W = 180, H = 90;
  const SQ = 22;
  // Cross net for cube: 6 squares in a cross pattern
  const cubeSquares = [
    [2,0], [0,1],[1,1],[2,1],[3,1],
    [2,2],
  ];
  // Triangular pyramid net: 4 triangles
  const pyramidTris = [
    { x:60, y:10, pts: "80,10 60,46 100,46" },
    { x:40, y:46, pts: "60,46 40,82 80,82" },
    { x:80, y:46, pts: "100,46 80,82 120,82" },
    { x:20, y:46, pts: "40,46 20,82 60,82" },
  ];
  return (
    <Panel accent={T.amber} bg={T.amberBg} bd={T.amberBd}
      ariaLabel={`3D net of a ${shape3d}`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {shape3d === "cube" && (
          <g transform={`translate(${(W - SQ*4) / 2}, 4)`}>
            {cubeSquares.map(([col, row], i) => (
              <rect key={i} x={col*SQ} y={row*SQ} width={SQ-2} height={SQ-2}
                fill={T.amberBg} stroke={T.amber} strokeWidth={2} rx={2}/>
            ))}
          </g>
        )}
        {shape3d !== "cube" && pyramidTris.map((t, i) => (
          <polygon key={i} points={t.pts}
            fill={T.amberBg} stroke={T.amber} strokeWidth={2}/>
        ))}
      </svg>
      <Chip color={T.amber} bg="white">Net of a {shape3d} — fold the faces</Chip>
    </Panel>
  );
}

// ─── NVR ROTATION VISUAL ───────────────────────────────────────────────────────
function NVRRotationVis({ degrees = 90, clockwise = true }) {
  const W = 180, H = 90;
  const cx = 50, cy = 45, r = 28;
  const rot2 = clockwise ? degrees : -degrees;
  const arrowAng = (rot2 * Math.PI) / 180;
  const ax = cx + r * Math.sin(arrowAng);
  const ay = cy - r * Math.cos(arrowAng);
  return (
    <Panel accent={T.nebula} bg={T.nebulaBg} bd={T.nebulaBd}
      ariaLabel={`Rotation of ${degrees} degrees ${clockwise ? "clockwise" : "anti-clockwise"}`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Original arrow shape */}
        <text x={cx} y={cy+6} textAnchor="middle" fontSize={30} fill={T.indigo}>→</text>
        {/* Rotated arrow */}
        <text x={cx + 90} y={cy+6} textAnchor="middle" fontSize={30} fill={T.nebula}
          transform={`rotate(${rot2}, ${cx+90}, ${cy})`}>→</text>
        {/* Arc label */}
        <path d={`M ${cx+62},${cy-8} A 15 15 0 0 ${clockwise?1:0} ${cx+68},${cy+8}`}
          fill="none" stroke={T.slate} strokeWidth={1.5} strokeDasharray="3,2"/>
        <text x={cx+62} y={cy-14} textAnchor="middle" fontSize={8} fill={T.textMid}>
          {degrees}° {clockwise?"↻":"↺"}
        </text>
      </svg>
      <Chip color={T.nebula} bg={T.nebulaBg}>
        {degrees}° {clockwise ? "clockwise" : "anti-clockwise"} rotation
      </Chip>
    </Panel>
  );
}

// ─── NVR ODD ONE OUT ────────────────────────────────────────────────────────────
function NVROddOneOutVis() {
  const shapes = [
    { shape: "square",   fill: T.indigoBg, stroke: T.indigo },
    { shape: "square",   fill: T.indigoBg, stroke: T.indigo },
    { shape: "triangle", fill: T.nebulaBg, stroke: T.nebula },
    { shape: "square",   fill: T.indigoBg, stroke: T.indigo },
  ];
  return (
    <Panel accent={T.rose} bg={T.roseBg} bd={T.roseBd} ariaLabel="Odd one out pattern">
      <div style={{ display:"flex", gap:10, justifyContent:"center", alignItems:"center" }}>
        {shapes.map((s, i) => (
          <NVRShapeItem key={i} {...s} size={16}/>
        ))}
      </div>
      <Chip color={T.rose} bg={T.roseBg}>Which does not belong?</Chip>
    </Panel>
  );
}

// give away the answer to "what is the net force?" questions.
function ForcesVis({ force1, force2, label1 = "Push", label2 = "Friction" }) {
  const FIXED = 64; // all arrows same length — direction only
  const W = 240, H = 90;
  const cx = W / 2; // centre x = object midpoint

  return (
    <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* ── force1 label above right arrow ── */}
        <text x={cx + 8 + FIXED / 2} y={20} textAnchor="middle"
          fontSize={9} fontWeight="700" fill={T.indigo}>
          {label1}
        </text>
        <text x={cx + 8 + FIXED / 2} y={31} textAnchor="middle"
          fontSize={9} fontWeight="600" fill={T.indigo}>
          {force1}N →
        </text>
        {/* ── force2 label above left arrow ── */}
        <text x={cx - 8 - FIXED / 2} y={20} textAnchor="middle"
          fontSize={9} fontWeight="700" fill={T.rose}>
          {label2}
        </text>
        <text x={cx - 8 - FIXED / 2} y={31} textAnchor="middle"
          fontSize={9} fontWeight="600" fill={T.rose}>
          ← {force2}N
        </text>
        {/* ── object block ── */}
        <rect x={cx - 26} y={42} width={52} height={28} rx={6}
          fill="white" stroke={T.slateBd} strokeWidth={2}/>
        <text x={cx} y={60} textAnchor="middle"
          fontSize={9} fontWeight="700" fill={T.slate}>OBJECT</text>
        {/* ── right arrow (solid) ── */}
        <line x1={cx + 26} y1={56} x2={cx + 26 + FIXED} y2={56}
          stroke={T.indigo} strokeWidth={3} strokeLinecap="round"/>
        <polygon
          points={`${cx+26+FIXED},56 ${cx+26+FIXED-8},51 ${cx+26+FIXED-8},61`}
          fill={T.indigo}/>
        {/* ── left arrow (dashed — pattern diff for colour blindness) ── */}
        <line x1={cx - 26} y1={56} x2={cx - 26 - FIXED} y2={56}
          stroke={T.rose} strokeWidth={3} strokeDasharray="5,3" strokeLinecap="round"/>
        <polygon
          points={`${cx-26-FIXED},56 ${cx-26-FIXED+8},51 ${cx-26-FIXED+8},61`}
          fill={T.rose}/>
      </svg>
    </Panel>
  );
}

// VELOCITY ────────────────────────────────────────────────────────────────────
// Confirmed working layout (browser-tested):
//   Row structure (per 48px slot):
//     y+0–13:  label ("initial (u)")
//     y+16–30: badge rect with speed value — ABOVE the shaft, never overlapping
//     y+36:    arrow shaft + arrowhead
//   Divider line between rows.
//   SVG uses viewBox + width:100% — scales to panel, no fixed-px overflow.
//   ARROW_MAX = VB_W - X0 - 18 → arrowhead tip always inside viewBox.
function VelocityVis({ v1, v2, label1 = "initial", label2 = "final", unit = "m/s" }) {
  const VB_W      = 200;
  const X0        = 4;
  const ARROW_MAX = VB_W - X0 - 18; // 178px — head tip always inside
  const BW        = 40;             // badge width
  const maxV      = Math.max(v1, v2 ?? 0, 1);
  const toPx      = (v) => Math.max(24, Math.round((v / maxV) * ARROW_MAX));
  const px1       = toPx(v1);
  const px2       = v2 != null ? toPx(v2) : null;
  const VB_H      = px2 != null ? 92 : 44;

  // Badge x: nudged right of label, clamped so it never leaves viewBox
  const bx1 = Math.min(X0 + 12, VB_W - BW);
  const bx2 = px2 != null ? Math.min(X0 + px2 / 2 - BW / 2, VB_W - BW) : 0;

  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: "100%", display: "block" }}>
        {/* ── row 1 ── */}
        <text x={X0} y={13} fontSize={9} fontWeight="700" fill={T.indigo}>{label1}</text>
        <rect x={bx1} y={16} width={BW} height={14} rx={3}
          fill={T.indigoBg} stroke={T.indigoBd} strokeWidth={1.5}/>
        <text x={bx1 + BW / 2} y={27} textAnchor="middle"
          fontSize={8} fontWeight="700" fill={T.indigo}>{v1} {unit}</text>
        <line x1={X0} y1={36} x2={X0 + px1 - 10} y2={36}
          stroke={T.indigo} strokeWidth={3} strokeLinecap="round"/>
        <polygon
          points={`${X0+px1},36 ${X0+px1-10},31 ${X0+px1-10},41`}
          fill={T.indigo}/>

        {/* ── divider + row 2 ── */}
        {px2 != null && (
          <>
            <line x1={0} y1={48} x2={VB_W} y2={48} stroke={T.slateBd} strokeWidth={1}/>
            <text x={X0} y={61} fontSize={9} fontWeight="700" fill={T.nebula}>{label2}</text>
            <rect x={bx2} y={64} width={BW} height={14} rx={3}
              fill={T.nebulaBg} stroke={T.nebulaBd} strokeWidth={1.5}/>
            <text x={bx2 + BW / 2} y={75} textAnchor="middle"
              fontSize={8} fontWeight="700" fill={T.nebula}>{v2} {unit}</text>
            <line x1={X0} y1={84} x2={X0 + px2 - 10} y2={84}
              stroke={T.nebula} strokeWidth={3} strokeLinecap="round"/>
            <polygon
              points={`${X0+px2},84 ${X0+px2-10},79 ${X0+px2-10},89`}
              fill={T.nebula}/>
          </>
        )}
      </svg>
      {px2 != null && (
        <Chip
          color={v2 > v1 ? T.emerald : v2 < v1 ? T.rose : T.slate}
          bg={v2 > v1 ? T.emeraldBg : v2 < v1 ? T.roseBg : T.slateBg}
        >
          {v2 > v1 ? "speeding up ↑" : v2 < v1 ? "slowing down ↓" : "constant speed"}
        </Chip>
      )}
    </Panel>
  );
}

// FOOD CHAIN ─────────────────────────────────────────────────────────────────
function FoodChainVis({ chain }) {
  return (
    <Panel accent={T.emerald} bg={T.emeraldBg} bd={T.emeraldBd}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        {chain.map((org, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              background: "white", borderRadius: 10, padding: "8px 10px",
              border: `1.5px solid ${T.emeraldBd}`, minWidth: 60,
            }}>
              <span style={{ fontSize: 26 }}>{org.emoji}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: T.emerald,
                textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" }}>
                {org.name}
              </span>
              {org.role && <span style={{ fontSize: 8, color: T.textMid }}>{org.role}</span>}
            </div>
            {i < chain.length - 1 && (
              <svg width={22} height={14}>
                <defs>
                  <marker id={`fc${i}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill={T.amber}/>
                  </marker>
                </defs>
                <line x1={0} y1={7} x2={16} y2={7} stroke={T.amber} strokeWidth={2.5} markerEnd={`url(#fc${i})`}/>
              </svg>
            )}
          </div>
        ))}
      </div>
      <Chip color={T.amber} bg={T.amberBg}>energy flows →</Chip>
    </Panel>
  );
}

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
  const mulMatch = !hasDecimalOperand && (questionText || "").match(/(\d+)\s*(?:[×x\*]|times|multiplied\s*by)\s*(\d+)/i);
  const grpMatch = (questionText || "").match(/(\d+)\s*groups?\s*of\s*(\d+)/i);
  if (mulMatch || grpMatch) {
    const m = mulMatch || grpMatch;
    const r = parseInt(m[1]), c = parseInt(m[2]);
    // Allow up to 12×12
    if (r <= 12 && c <= 12 && r > 0 && c > 0) return { type: "multiplication", rows: r, cols: c };
  }

  const fracMatch = (questionText || "").match(/(\d+)\s*\/\s*(\d+)/);
  if (t.includes("fraction") || fracMatch) {
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
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
        {groupArr.map((count, g) => (
          <div key={g} style={{
            border:`2px dashed ${COLORS[g % COLORS.length]}`,
            borderRadius:10, padding:"6px 8px",
            display:"flex", flexWrap:"wrap", gap:3,
            minWidth:40, maxWidth:100, justifyContent:"center",
          }}>
            {Array.from({ length: count }, (_, i) => (
              <div key={i} style={{
                width:10, height:10, borderRadius:"50%",
                background:COLORS[g % COLORS.length],
              }} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ fontSize:11, color:T.slate, fontWeight:600 }}>
        {total} ÷ {groups} = ?
      </div>
    </div>
  );
}

// ── Ruler / Measurement ───────────────────────────────────────────────────────
function RulerVis({ cm, label }) {
  const totalCm = Math.min(Math.max(cm + 2, 8), 20);
  const pxPerCm = 180 / totalCm;
  const markedPx = cm * pxPerCm;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", gap:4 }}>
      <svg width={200} height={52} viewBox={`0 0 200 52`}>
        {/* Ruler body */}
        <rect x={2} y={16} width={196} height={28} rx={4} fill="#fffbe6" stroke="#c8a820" strokeWidth={2} />
        {/* Tick marks and labels */}
        {Array.from({ length: totalCm + 1 }, (_, i) => {
          const x = 2 + i * pxPerCm;
          const isMajor = Number.isInteger(i);
          return (
            <g key={i}>
              <line x1={x} y1={16} x2={x} y2={isMajor ? 30 : 24} stroke="#c8a820" strokeWidth={isMajor ? 1.5 : 1} />
              {isMajor && i <= totalCm && (
                <text x={x} y={44} textAnchor="middle" fontSize={8} fill="#a08010" fontWeight="600">{i}</text>
              )}
            </g>
          );
        })}
        {/* Arrow showing measurement */}
        <line x1={2} y1={10} x2={2 + markedPx} y2={10} stroke={T.indigo} strokeWidth={2} markerEnd="url(#arr)" />
        <defs>
          <marker id="arr" markerWidth={6} markerHeight={6} refX={6} refY={3} orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill={T.indigo} />
          </marker>
        </defs>
        <text x={2 + markedPx / 2} y={8} textAnchor="middle" fontSize={9} fill={T.indigo} fontWeight="700">
          {cm} cm
        </text>
      </svg>
      {label && <span style={{ fontSize:11, color:T.slate }}>{label}</span>}
    </div>
  );
}

// ── Ratio / Proportion Bar ────────────────────────────────────────────────────
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
function NVRMatrixVis({ cells }) {
  // cells = array of 4 objects: { shape, fill, rotate } — last one is ?
  const SHAPE_SVG = {
    circle:    (f,s) => <circle cx={20} cy={20} r={14} fill={f} stroke={s} strokeWidth={2}/>,
    square:    (f,s) => <rect x={6} y={6} width={28} height={28} fill={f} stroke={s} strokeWidth={2}/>,
    triangle:  (f,s) => <polygon points="20,4 36,36 4,36" fill={f} stroke={s} strokeWidth={2}/>,
    diamond:   (f,s) => <polygon points="20,4 36,20 20,36 4,20" fill={f} stroke={s} strokeWidth={2}/>,
    cross:     (f,s) => <g><rect x={14} y={4} width={12} height={32} fill={f} stroke={s} strokeWidth={1}/><rect x={4} y={14} width={32} height={12} fill={f} stroke={s} strokeWidth={1}/></g>,
  };
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, width:100 }}>
      {cells.slice(0, 4).map((cell, i) => {
        const isLast = i === 3;
        const shapeFn = SHAPE_SVG[cell?.shape || "circle"];
        return (
          <div key={i} style={{
            width:44, height:44, borderRadius:6,
            background: isLast ? T.nebulaBg : T.indigoBg,
            border: `2px ${isLast ? "dashed" : "solid"} ${isLast ? T.nebula : T.indigo}`,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            {isLast ? (
              <span style={{ fontSize:20, fontWeight:800, color:T.nebula }}>?</span>
            ) : (
              <svg width={40} height={40} viewBox="0 0 40 40"
                style={{ transform:`rotate(${cell?.rotate || 0}deg)` }}>
                {shapeFn && shapeFn(cell.fill || T.indigoBg, cell.stroke || T.indigo)}
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Grammar Parts-of-Speech Labeller ─────────────────────────────────────────
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
      /share|divide|split|each get|equally|how many weeks|how many days|how many months|how many times|how many groups/i.test(questionText))) {
    // Suppress for real-world word problems — the dot array is misleading when the
    // numbers represent money/time/weight rather than countable physical objects.
    // Indicators: currency symbols, "Real World", "Challenge", or narrative sentence openers.
    const isWordProblem = /Real World|Challenge:|£|€|\$|per week|per day|per month|per year|costs?|saves?|earns?|spends?|charges?|buys?|sells?/i.test(questionText);
    if (!isWordProblem && nums.length >= 2) {
      const total  = Math.max(...nums.slice(0, 3));
      // divisor: smallest number that isn't the total, between 2 and 10
      const groups = nums.find(n => n !== total && n >= 2 && n <= 10);
      if (total && groups && total <= 60) {
        return { type:"division", total, groups };
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
function AtomVis({ protons, neutrons, electrons, element }) {
  const shells = [2, 8, 8, 18];
  let rem = electrons;
  const shellCounts = shells.map(cap => { const n = Math.min(rem, cap); rem -= n; return n; });
  const usedShells = shellCounts.filter(n => n > 0);
  const maxR = 56 + usedShells.length * 20;
  const cx = maxR + 4, cy = maxR + 4, W = (maxR + 4) * 2;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <svg width={W} height={W} viewBox={`0 0 ${W} ${W}`}>
        {/* Nucleus */}
        <circle cx={cx} cy={cy} r={18} fill={T.indigoBg} stroke={T.indigo} strokeWidth={2} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={8} fontWeight="700" fill={T.indigo}>{protons}p</text>
        <text x={cx} y={cy + 6} textAnchor="middle" fontSize={8} fontWeight="700" fill={T.nebula}>{neutrons}n</text>
        {/* Electron shells */}
        {usedShells.map((count, si) => {
          const r = 30 + (si + 1) * 22;
          return (
            <g key={si}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.slate} strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
              {Array.from({ length: count }, (_, ei) => {
                const angle = (ei / count) * 2 * Math.PI - Math.PI / 2;
                const ex = cx + r * Math.cos(angle);
                const ey = cy + r * Math.sin(angle);
                return <circle key={ei} cx={ex} cy={ey} r={4} fill={T.emerald} stroke="white" strokeWidth={1} />;
              })}
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize:11, color:T.slate, fontWeight:600 }}>
        {element && <span style={{ color:T.indigo, fontWeight:800 }}>{element} · </span>}
        {protons}p · {neutrons}n · {electrons}e⁻
      </div>
    </div>
  );
}

// ── Periodic Table Section ────────────────────────────────────────────────────
function PeriodicTableVis({ symbol, name, atomicNumber, atomicMass, group, period, category }) {
  const CAT_COLORS = {
    "alkali metal":       { bg:"#fef3c7", border:"#f59e0b", text:"#92400e" },
    "alkaline earth":     { bg:"#fce7f3", border:"#ec4899", text:"#9d174d" },
    "transition metal":   { bg:"#dbeafe", border:"#3b82f6", text:"#1e40af" },
    "non-metal":          { bg:"#dcfce7", border:"#22c55e", text:"#14532d" },
    "noble gas":          { bg:"#f3e8ff", border:"#a855f7", text:"#581c87" },
    "halogen":            { bg:"#ffedd5", border:"#f97316", text:"#7c2d12" },
    "metalloid":          { bg:"#ecfccb", border:"#84cc16", text:"#365314" },
    "metal":              { bg:"#f1f5f9", border:"#64748b", text:"#1e293b" },
  };
  const c = CAT_COLORS[category?.toLowerCase()] || CAT_COLORS["metal"];
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <div style={{
        width:100, border:`3px solid ${c.border}`, borderRadius:8,
        background:c.bg, padding:"10px 12px", textAlign:"center",
        boxShadow:"0 2px 8px rgba(0,0,0,0.12)",
      }}>
        <div style={{ fontSize:10, color:c.text, fontWeight:600 }}>{atomicNumber}</div>
        <div style={{ fontSize:32, fontWeight:900, color:c.text, lineHeight:1.1 }}>{symbol}</div>
        <div style={{ fontSize:9, color:c.text, fontWeight:600, marginTop:2 }}>{name}</div>
        <div style={{ fontSize:9, color:c.text, opacity:0.8 }}>{atomicMass}</div>
      </div>
      <div style={{ display:"flex", gap:12, fontSize:11, color:T.slate }}>
        {group && <span>Group {group}</span>}
        {period && <span>Period {period}</span>}
        {category && <span style={{ color:c.border, fontWeight:700 }}>{category}</span>}
      </div>
    </div>
  );
}

// ── State Changes (Solid/Liquid/Gas) ─────────────────────────────────────────
function StateChangesVis({ highlighted }) {
  const states = ["Solid","Liquid","Gas"];
  const transitions = [
    { from:0, to:1, label:"Melting",     dir:"→", energy:"+ heat" },
    { from:1, to:0, label:"Freezing",    dir:"←", energy:"- heat" },
    { from:1, to:2, label:"Evaporation", dir:"→", energy:"+ heat" },
    { from:2, to:1, label:"Condensation",dir:"←", energy:"- heat" },
    { from:0, to:2, label:"Sublimation", dir:"↑", energy:"+ heat", skip:true },
  ];
  const hiSet = new Set((highlighted||[]).map(s=>s.toLowerCase()));
  const STATE_ICONS = ["🧊","💧","💨"];
  const STATE_COLORS = [
    { bg:"#dbeafe", border:"#3b82f6" },
    { bg:"#bfdbfe", border:"#60a5fa" },
    { bg:"#e0f2fe", border:"#38bdf8" },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
        {states.map((s, i) => {
          const isHi = hiSet.has(s.toLowerCase());
          const c = STATE_COLORS[i];
          return (
            <React.Fragment key={s}>
              <div style={{
                padding:"8px 10px", background: isHi ? c.border : c.bg,
                border:`2px solid ${c.border}`, borderRadius:8,
                textAlign:"center", minWidth:52,
              }}>
                <div style={{ fontSize:18 }}>{STATE_ICONS[i]}</div>
                <div style={{ fontSize:11, fontWeight:700, color: isHi ? "white" : c.border }}>{s}</div>
              </div>
              {i < 2 && <span style={{ fontSize:18, color:T.slate }}>⇌</span>}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, width:"100%" }}>
        {transitions.filter(t => !t.skip).map((tr, i) => (
          <div key={i} style={{
            padding:"3px 8px", background:T.indigoBg, borderRadius:6,
            fontSize:10, color:T.slate, textAlign:"center",
          }}>
            <span style={{ fontWeight:700, color:T.indigo }}>{tr.label}</span>
            {" "}({tr.energy})
          </div>
        ))}
      </div>
    </div>
  );
}

// ── pH Scale ──────────────────────────────────────────────────────────────────
function PHScaleVis({ value, substance }) {
  const gradient = "linear-gradient(to right, #dc2626,#ea580c,#d97706,#ca8a04,#65a30d,#16a34a,#0d9488,#0891b2,#2563eb,#7c3aed,#6d28d9,#4c1d95,#1e1b4b,#0f172a)";
  const pct = (value / 14) * 100;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6, width:"100%" }}>
      <div style={{ position:"relative", height:24, borderRadius:12, background:gradient, border:"2px solid #e2e8f0" }}>
        {value !== undefined && (
          <div style={{
            position:"absolute", left:`${pct}%`, top:-6,
            transform:"translateX(-50%)",
            width:12, height:36, display:"flex", flexDirection:"column", alignItems:"center",
          }}>
            <div style={{ width:2, height:10, background:"#1e293b" }} />
            <div style={{
              background:"#1e293b", color:"white", borderRadius:4,
              padding:"2px 6px", fontSize:10, fontWeight:800, whiteSpace:"nowrap",
            }}>{value}</div>
          </div>
        )}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:T.slate, fontWeight:600 }}>
        <span style={{ color:"#dc2626" }}>0 — Strong Acid</span>
        <span style={{ color:"#16a34a" }}>7 — Neutral</span>
        <span style={{ color:"#4c1d95" }}>14 — Strong Alkali</span>
      </div>
      {substance && (
        <div style={{ textAlign:"center", fontSize:11, color:T.slate }}>
          <span style={{ fontWeight:700, color:T.indigo }}>{substance}</span> — pH {value}
        </div>
      )}
    </div>
  );
}

// ── Molecule Structure (ball-and-stick) ───────────────────────────────────────
function MoleculeVis({ formula, bonds }) {
  // bonds = [{ from:{x,y,label,color}, to:{x,y,label,color}, type:"single"|"double" }]
  const PRESET_MOLECULES = {
    H2O: {
      atoms:[{x:50,y:30,label:"O",color:"#ef4444",r:14},{x:18,y:62,label:"H",color:"#94a3b8",r:10},{x:82,y:62,label:"H",color:"#94a3b8",r:10}],
      bonds:[{from:0,to:1,type:"single"},{from:0,to:2,type:"single"}],
    },
    CO2: {
      atoms:[{x:50,y:45,label:"C",color:"#374151",r:12},{x:14,y:45,label:"O",color:"#ef4444",r:14},{x:86,y:45,label:"O",color:"#ef4444",r:14}],
      bonds:[{from:0,to:1,type:"double"},{from:0,to:2,type:"double"}],
    },
    CH4: {
      atoms:[{x:50,y:50,label:"C",color:"#374151",r:12},{x:50,y:14,label:"H",color:"#94a3b8",r:9},{x:80,y:68,label:"H",color:"#94a3b8",r:9},{x:20,y:68,label:"H",color:"#94a3b8",r:9},{x:50,y:86,label:"H",color:"#94a3b8",r:9}],
      bonds:[{from:0,to:1,type:"single"},{from:0,to:2,type:"single"},{from:0,to:3,type:"single"},{from:0,to:4,type:"single"}],
    },
    O2: {
      atoms:[{x:30,y:45,label:"O",color:"#ef4444",r:14},{x:70,y:45,label:"O",color:"#ef4444",r:14}],
      bonds:[{from:0,to:1,type:"double"}],
    },
    N2: {
      atoms:[{x:30,y:45,label:"N",color:"#3b82f6",r:13},{x:70,y:45,label:"N",color:"#3b82f6",r:13}],
      bonds:[{from:0,to:1,type:"triple"}],
    },
    HCl: {
      atoms:[{x:28,y:45,label:"H",color:"#94a3b8",r:9},{x:72,y:45,label:"Cl",color:"#84cc16",r:14}],
      bonds:[{from:0,to:1,type:"single"}],
    },
    NaCl: {
      atoms:[{x:28,y:45,label:"Na⁺",color:"#f59e0b",r:14},{x:72,y:45,label:"Cl⁻",color:"#84cc16",r:14}],
      bonds:[{from:0,to:1,type:"ionic"}],
    },
  };
  const mol = PRESET_MOLECULES[formula] || null;
  if (!mol) return <div style={{ fontSize:12, color:T.slate, padding:8 }}>{formula}</div>;
  const BOND_COLORS = { single:"#475569", double:"#2563eb", triple:"#7c3aed", ionic:"#f59e0b" };
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        {mol.bonds.map((b, i) => {
          const a1 = mol.atoms[b.from], a2 = mol.atoms[b.to];
          const dx = a2.x - a1.x, dy = a2.y - a1.y;
          const len = Math.sqrt(dx*dx + dy*dy);
          const nx = -dy/len * 3, ny = dx/len * 3;
          const count = b.type === "triple" ? 3 : b.type === "double" ? 2 : 1;
          const offsets = count === 1 ? [0] : count === 2 ? [-1,1] : [-2,0,2];
          return offsets.map((o, oi) => (
            <line key={`${i}-${oi}`}
              x1={a1.x + nx*o} y1={a1.y + ny*o} x2={a2.x + nx*o} y2={a2.y + ny*o}
              stroke={BOND_COLORS[b.type] || "#475569"}
              strokeWidth={b.type === "ionic" ? 1.5 : 2}
              strokeDasharray={b.type === "ionic" ? "4,2" : undefined}
            />
          ));
        })}
        {mol.atoms.map((a, i) => (
          <g key={i}>
            <circle cx={a.x} cy={a.y} r={a.r} fill={a.color} stroke="white" strokeWidth={1.5} />
            <text x={a.x} y={a.y} textAnchor="middle" dominantBaseline="central"
              fontSize={a.r > 12 ? 9 : 8} fontWeight="800" fill="white">{a.label}</text>
          </g>
        ))}
      </svg>
      <div style={{ fontSize:12, fontWeight:800, color:T.indigo, fontFamily:"monospace" }}>{formula}</div>
    </div>
  );
}

// ── Cell Diagram ──────────────────────────────────────────────────────────────
function CellVis({ cellType }) {
  const isPlant = cellType === "plant";
  const parts = isPlant
    ? [
        { label:"Cell wall", desc:"Rigid outer layer" },
        { label:"Cell membrane", desc:"Controls what enters/leaves" },
        { label:"Nucleus", desc:"Controls cell activities" },
        { label:"Cytoplasm", desc:"Jelly-like fluid" },
        { label:"Chloroplast", desc:"Site of photosynthesis" },
        { label:"Vacuole", desc:"Stores water/sap" },
        { label:"Mitochondria", desc:"Releases energy" },
      ]
    : [
        { label:"Cell membrane", desc:"Controls what enters/leaves" },
        { label:"Nucleus", desc:"Controls cell activities" },
        { label:"Cytoplasm", desc:"Jelly-like fluid" },
        { label:"Mitochondria", desc:"Releases energy" },
        { label:"Ribosome", desc:"Makes proteins" },
      ];
  const colors = [T.emerald, T.indigo, T.nebula, "#f59e0b", "#22c55e", "#0891b2", "#ec4899"];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{
        padding:"6px 12px", background: isPlant ? "#dcfce7" : "#dbeafe",
        border:`2px solid ${isPlant ? T.emerald : T.indigo}`, borderRadius:8,
        fontSize:12, fontWeight:700, color: isPlant ? "#14532d" : "#1e40af",
        textAlign:"center",
      }}>{isPlant ? "🌿 Plant Cell" : "🔬 Animal Cell"}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
        {parts.map((p, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:colors[i % colors.length], flexShrink:0 }} />
            <div style={{ fontSize:11 }}>
              <span style={{ fontWeight:700, color:colors[i % colors.length] }}>{p.label}</span>
              <span style={{ color:T.slate }}> — {p.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Punnett Square ────────────────────────────────────────────────────────────
function PunnettVis({ parent1, parent2, trait }) {
  // parent1 = "Aa", parent2 = "Aa"
  const a1 = parent1.split(""), a2 = parent2.split("");
  const combos = [
    a1[0]+a2[0], a1[0]+a2[1],
    a1[1]+a2[0], a1[1]+a2[1],
  ];
  const isDom = (g) => g[0] === g[0].toUpperCase() && g[0] !== g[1];
  const isHom = (g) => g[0] === g[1];
  const getLabel = (g) => isHom(g) ? (isDom(g) ? "Dom. Homozygous" : "Rec. Homozygous") : "Heterozygous";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      {trait && <div style={{ fontSize:11, color:T.slate, fontWeight:600 }}>{trait}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"28px 1fr 1fr", gridTemplateRows:"28px 1fr 1fr", gap:3 }}>
        <div />
        {a2.map((g,i) => (
          <div key={i} style={{ textAlign:"center", fontSize:14, fontWeight:800, color:T.nebula }}>{g}</div>
        ))}
        {a1.map((g1, ri) => (
          <React.Fragment key={ri}>
            <div style={{ fontSize:14, fontWeight:800, color:T.indigo, alignSelf:"center", textAlign:"center" }}>{g1}</div>
            {a2.map((g2, ci) => {
              const combo = ri === 0 ? combos[ci] : combos[ci + 2];
              const dom = combo.includes(combo[0].toUpperCase()) && combo[0] !== combo[1];
              return (
                <div key={ci} style={{
                  width:52, height:40, borderRadius:6,
                  background: dom ? T.indigoBg : T.nebulaBg,
                  border:`2px solid ${dom ? T.indigo : T.nebula}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:14, fontWeight:800, color: dom ? T.indigo : T.nebula,
                }}>{combo}</div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{ fontSize:10, color:T.slate }}>
        {combos.filter(g => g.includes(g[0].toUpperCase()) && g[0] !== g[1]).length}/4 heterozygous
      </div>
    </div>
  );
}

// ── Energy Stores Transfer ─────────────────────────────────────────────────────
function EnergyStoresVis({ stores, transfers }) {
  const STORE_ICONS = {
    kinetic:"⚡", thermal:"🔥", chemical:"⚗️", gravitational:"⬆️",
    elastic:"🌀", nuclear:"☢️", electromagnetic:"💡", sound:"🔊",
  };
  const COLORS = [T.indigo, T.nebula, T.emerald, "#f59e0b", "#ef4444", "#06b6d4"];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"center" }}>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
        {stores.map((s, i) => (
          <div key={i} style={{
            padding:"6px 10px", background:COLORS[i % COLORS.length] + "22",
            border:`2px solid ${COLORS[i % COLORS.length]}`, borderRadius:8,
            textAlign:"center", minWidth:70,
          }}>
            <div style={{ fontSize:20 }}>{STORE_ICONS[s.type] || "⚡"}</div>
            <div style={{ fontSize:10, fontWeight:700, color:COLORS[i % COLORS.length] }}>{s.label || s.type}</div>
            {s.value && <div style={{ fontSize:10, color:T.slate }}>{s.value} J</div>}
          </div>
        ))}
      </div>
      {transfers && transfers.map((tr, i) => (
        <div key={i} style={{
          display:"flex", alignItems:"center", gap:4, fontSize:11, color:T.slate,
        }}>
          <span style={{ fontWeight:700, color:T.indigo }}>{tr.from}</span>
          <span>→</span>
          <span style={{ fontStyle:"italic" }}>{tr.method}</span>
          <span>→</span>
          <span style={{ fontWeight:700, color:T.nebula }}>{tr.to}</span>
        </div>
      ))}
    </div>
  );
}

// ── Wave Diagram ──────────────────────────────────────────────────────────────
function WaveVis({ type, wavelength, amplitude, label }) {
  const W = 200, H = 80, mid = H / 2;
  const isLongitudinal = type === "longitudinal";
  const wavePath = () => {
    const cycles = 2;
    const pts = [];
    for (let i = 0; i <= W; i += 2) {
      const y = mid - (amplitude || 24) * Math.sin((i / W) * cycles * 2 * Math.PI);
      pts.push(`${i},${y}`);
    }
    return "M " + pts.join(" L ");
  };
  if (isLongitudinal) {
    const bars = Array.from({ length: 20 }, (_, i) => {
      const x = (i / 20) * W;
      const compression = Math.sin((i / 20) * 4 * Math.PI);
      const opacity = (compression + 1) / 2;
      return { x, opacity };
    });
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
        <svg width={W} height={40} viewBox={`0 0 ${W} 40`}>
          {bars.map((b, i) => (
            <rect key={i} x={b.x} y={8} width={W/20 - 1} height={24}
              fill={T.indigo} opacity={b.opacity * 0.8 + 0.1} rx={1} />
          ))}
          <text x={W/2} y={36} textAnchor="middle" fontSize={9} fill={T.slate}>Compressions and rarefactions</text>
        </svg>
        <div style={{ fontSize:11, fontWeight:700, color:T.indigo }}>{label || "Longitudinal wave (e.g. sound)"}</div>
      </div>
    );
  }
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1={0} y1={mid} x2={W} y2={mid} stroke={T.slate} strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
        <path d={wavePath()} fill="none" stroke={T.indigo} strokeWidth={2.5} />
        {/* Wavelength arrow */}
        <line x1={10} y1={16} x2={10 + W/2} y2={16} stroke={T.nebula} strokeWidth={1.5} markerEnd="url(#wEnd)" />
        <text x={10 + W/4} y={13} textAnchor="middle" fontSize={8} fill={T.nebula} fontWeight="700">λ (wavelength)</text>
        {/* Amplitude arrow */}
        <line x1={W-12} y1={mid} x2={W-12} y2={mid - (amplitude||24)} stroke={T.emerald} strokeWidth={1.5} />
        <text x={W-22} y={mid - 10} fontSize={8} fill={T.emerald} fontWeight="700">A</text>
      </svg>
      <div style={{ fontSize:11, fontWeight:700, color:T.indigo }}>{label || "Transverse wave (e.g. light)"}</div>
    </div>
  );
}

// ── Electromagnetic Spectrum ──────────────────────────────────────────────────
function EMSpectrumVis({ highlighted }) {
  const bands = [
    { name:"Radio",     color:"#7c3aed", freq:"<10⁹ Hz",   use:"Broadcasting" },
    { name:"Microwave", color:"#2563eb", freq:"10⁹–10¹² Hz", use:"Cooking, comms" },
    { name:"Infrared",  color:"#ea580c", freq:"10¹²–10¹⁴", use:"Thermal imaging" },
    { name:"Visible",   color:"#16a34a", freq:"10¹⁴–10¹⁵", use:"Sight, cameras" },
    { name:"UV",        color:"#ca8a04", freq:"10¹⁵–10¹⁶", use:"Sterilisation" },
    { name:"X-ray",     color:"#dc2626", freq:"10¹⁶–10¹⁹", use:"Medical imaging" },
    { name:"Gamma",     color:"#991b1b", freq:">10¹⁹ Hz",  use:"Cancer treatment" },
  ];
  const hiSet = new Set((highlighted || []).map(s => s.toLowerCase()));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, width:"100%" }}>
      <div style={{ display:"flex", height:20, borderRadius:6, overflow:"hidden" }}>
        {bands.map((b, i) => (
          <div key={i} style={{
            flex:1, background:b.color,
            opacity: hiSet.size === 0 || hiSet.has(b.name.toLowerCase()) ? 1 : 0.3,
          }} />
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, color:T.slate }}>
        <span>← longer wavelength / lower frequency / less energy</span>
        <span>shorter wavelength / higher frequency / more energy →</span>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginTop:2 }}>
        {bands.map((b, i) => {
          const isHi = hiSet.size === 0 || hiSet.has(b.name.toLowerCase());
          return (
            <div key={i} style={{
              padding:"2px 6px", background: isHi ? b.color + "22" : "#f8fafc",
              border:`1px solid ${isHi ? b.color : "#e2e8f0"}`, borderRadius:4,
              fontSize:9, fontWeight: isHi ? 700 : 400, color: isHi ? b.color : T.slate,
            }}>{b.name}</div>
          );
        })}
      </div>
    </div>
  );
}

// ── Free Body Diagram ─────────────────────────────────────────────────────────
function FreeBodyVis({ forces }) {
  // forces = [{ label, value, direction:"up"|"down"|"left"|"right", color }]
  const cx = 60, cy = 60;
  const DIR = {
    up:    { dx:0, dy:-1, lx:0,   ly:-52 },
    down:  { dx:0, dy:1,  lx:0,   ly:52  },
    left:  { dx:-1, dy:0, lx:-52, ly:0   },
    right: { dx:1, dy:0,  lx:52,  ly:0   },
  };
  const FORCE_COLORS = { up:T.emerald, down:T.nebula, left:T.indigo, right:"#f59e0b" };
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <defs>
          {["up","down","left","right"].map(dir => (
            <marker key={dir} id={`fbArrow-${dir}`} markerWidth={8} markerHeight={8} refX={4} refY={3} orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill={FORCE_COLORS[dir]} />
            </marker>
          ))}
        </defs>
        {/* Object */}
        <rect x={cx-14} y={cy-14} width={28} height={28} rx={4} fill={T.indigoBg} stroke={T.indigo} strokeWidth={2} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={8} fill={T.indigo} fontWeight="700">obj</text>
        {/* Force arrows */}
        {forces.map((f, i) => {
          const d = DIR[f.direction];
          if (!d) return null;
          const mag = Math.min(Math.max((f.value || 1) / 20, 0.4), 1);
          const len = 32 * mag + 14;
          const ex = cx + d.dx * len, ey = cy + d.dy * len;
          const color = FORCE_COLORS[f.direction];
          return (
            <g key={i}>
              <line x1={cx + d.dx*14} y1={cy + d.dy*14} x2={ex} y2={ey}
                stroke={color} strokeWidth={2.5} markerEnd={`url(#fbArrow-${f.direction})`} />
              <text x={cx + d.lx * 0.8} y={cy + d.ly * 0.8}
                textAnchor="middle" dominantBaseline="central" fontSize={8} fill={color} fontWeight="700">
                {f.label}{f.value ? ` (${f.value}N)` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── T-Account (Accounting) ────────────────────────────────────────────────────
function TAccountVis({ account, debits, credits }) {
  const debitTotal  = (debits  || []).reduce((s, r) => s + r.amount, 0);
  const creditTotal = (credits || []).reduce((s, r) => s + r.amount, 0);
  const balance     = debitTotal - creditTotal;
  const Col = ({ entries, title, color }) => (
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"4px 8px", background:color+"22", fontSize:11, fontWeight:700, color, textAlign:"center", borderBottom:`2px solid ${color}` }}>
        {title}
      </div>
      {(entries||[]).map((e, i) => (
        <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"3px 8px", fontSize:10, color:T.slate, borderBottom:"1px solid #f1f5f9" }}>
          <span>{e.label}</span>
          <span style={{ fontWeight:600 }}>£{e.amount.toLocaleString()}</span>
        </div>
      ))}
      <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 8px", fontSize:11, fontWeight:700, color, borderTop:`2px solid ${color}`, marginTop:"auto" }}>
        <span>Total</span>
        <span>£{(entries||[]).reduce((s,r)=>s+r.amount,0).toLocaleString()}</span>
      </div>
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, width:"100%" }}>
      <div style={{ textAlign:"center", fontSize:12, fontWeight:700, color:T.slate, textDecoration:"underline" }}>
        {account}
      </div>
      <div style={{ display:"flex", border:`2px solid ${T.slate}`, borderRadius:8, overflow:"hidden", minHeight:100 }}>
        <Col entries={debits}  title="Dr (Debit)"  color={T.indigo} />
        <div style={{ width:2, background:T.slate }} />
        <Col entries={credits} title="Cr (Credit)" color={T.nebula} />
      </div>
      <div style={{ textAlign:"center", fontSize:11, color:T.slate }}>
        Balance: <span style={{ fontWeight:700, color: balance >= 0 ? T.indigo : T.nebula }}>
          £{Math.abs(balance).toLocaleString()} {balance >= 0 ? "Dr" : "Cr"}
        </span>
      </div>
    </div>
  );
}

// ── Break-Even Chart ──────────────────────────────────────────────────────────
function BreakEvenVis({ fixedCost, variableCostPerUnit, pricePerUnit, breakEvenQty }) {
  const W = 200, H = 140, PAD = 30;
  const maxQ = (breakEvenQty || 100) * 1.6;
  const maxC = pricePerUnit * maxQ;
  const scaleX = (q) => PAD + (q / maxQ) * (W - PAD);
  const scaleY = (c) => H - PAD - (c / maxC) * (H - PAD);
  const fixedY = scaleY(fixedCost);
  const beX = scaleX(breakEvenQty || 0);
  const beY = scaleY((breakEvenQty || 0) * pricePerUnit);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Axes */}
        <line x1={PAD} y1={H-PAD} x2={W} y2={H-PAD} stroke={T.slate} strokeWidth={1.5} />
        <line x1={PAD} y1={0}    x2={PAD} y2={H-PAD} stroke={T.slate} strokeWidth={1.5} />
        <text x={W/2} y={H-4} textAnchor="middle" fontSize={8} fill={T.slate}>Quantity (units)</text>
        <text x={8} y={H/2} textAnchor="middle" fontSize={8} fill={T.slate} transform={`rotate(-90 8 ${H/2})`}>Cost / Revenue (£)</text>
        {/* Fixed cost line */}
        <line x1={PAD} y1={fixedY} x2={W} y2={fixedY} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4,3" />
        <text x={W-4} y={fixedY - 4} textAnchor="end" fontSize={8} fill="#94a3b8" fontWeight="600">FC</text>
        {/* Total cost line */}
        <line x1={PAD} y1={fixedY} x2={W} y2={scaleY(fixedCost + (maxQ * variableCostPerUnit))}
          stroke={T.indigo} strokeWidth={2} />
        <text x={W-4} y={scaleY(fixedCost + maxQ*variableCostPerUnit)-4} textAnchor="end" fontSize={8} fill={T.indigo} fontWeight="700">TC</text>
        {/* Revenue line */}
        <line x1={PAD} y1={H-PAD} x2={W} y2={scaleY(maxQ * pricePerUnit)}
          stroke={T.emerald} strokeWidth={2} />
        <text x={W-4} y={scaleY(maxQ*pricePerUnit)-4} textAnchor="end" fontSize={8} fill={T.emerald} fontWeight="700">TR</text>
        {/* Break-even point */}
        {breakEvenQty && (
          <>
            <line x1={beX} y1={H-PAD} x2={beX} y2={beY} stroke={T.nebula} strokeWidth={1} strokeDasharray="3,3" />
            <circle cx={beX} cy={beY} r={5} fill={T.nebula} />
            <text x={beX} y={beY - 8} textAnchor="middle" fontSize={8} fill={T.nebula} fontWeight="700">BEP</text>
          </>
        )}
      </svg>
      {breakEvenQty && (
        <div style={{ fontSize:11, color:T.slate }}>
          Break-even: <span style={{ fontWeight:700, color:T.nebula }}>{breakEvenQty} units</span>
          {" "} · Revenue = Cost = <span style={{ fontWeight:700 }}>£{(breakEvenQty * pricePerUnit).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

// ── Supply & Demand Curves ────────────────────────────────────────────────────
function SupplyDemandVis({ eqPrice, eqQty, shift }) {
  const W = 180, H = 150, PAD = 28;
  const scaleX = (q) => PAD + q * ((W - PAD) / 100);
  const scaleY = (p) => H - PAD - p * ((H - PAD) / 100);
  // Demand: downward slope  D: P = 90 - 0.8Q
  // Supply: upward slope    S: P = 10 + 0.8Q
  const demandPath = `M ${scaleX(0)} ${scaleY(90)} L ${scaleX(100)} ${scaleY(10)}`;
  const supplyPath = `M ${scaleX(0)} ${scaleY(10)} L ${scaleX(100)} ${scaleY(90)}`;
  const eq = eqQty || 50, ep = eqPrice || 50;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1={PAD} y1={H-PAD} x2={W}   y2={H-PAD} stroke={T.slate} strokeWidth={1.5} />
        <line x1={PAD} y1={0}    x2={PAD}   y2={H-PAD} stroke={T.slate} strokeWidth={1.5} />
        <text x={W/2}  y={H-6}  textAnchor="middle" fontSize={8} fill={T.slate}>Quantity</text>
        <text x={8}    y={H/2}  textAnchor="middle" fontSize={8} fill={T.slate} transform={`rotate(-90 8 ${H/2})`}>Price</text>
        {/* Demand curve */}
        <path d={demandPath} fill="none" stroke={T.indigo} strokeWidth={2} />
        <text x={W-8} y={scaleY(12)} textAnchor="end" fontSize={9} fill={T.indigo} fontWeight="800">D</text>
        {/* Supply curve */}
        <path d={supplyPath} fill="none" stroke={T.emerald} strokeWidth={2} />
        <text x={W-8} y={scaleY(88)} textAnchor="end" fontSize={9} fill={T.emerald} fontWeight="800">S</text>
        {/* Equilibrium */}
        <line x1={scaleX(eq)} y1={H-PAD} x2={scaleX(eq)} y2={scaleY(ep)} stroke={T.nebula} strokeWidth={1} strokeDasharray="3,3" />
        <line x1={PAD} y1={scaleY(ep)} x2={scaleX(eq)} y2={scaleY(ep)} stroke={T.nebula} strokeWidth={1} strokeDasharray="3,3" />
        <circle cx={scaleX(eq)} cy={scaleY(ep)} r={5} fill={T.nebula} />
        <text x={scaleX(eq)+4} y={scaleY(ep)-4} fontSize={8} fill={T.nebula} fontWeight="700">E</text>
      </svg>
      <div style={{ fontSize:11, color:T.slate, textAlign:"center" }}>
        Equilibrium: P = <span style={{ fontWeight:700, color:T.nebula }}>{ep}</span>
        {" "} · Q = <span style={{ fontWeight:700, color:T.nebula }}>{eq}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSER — TIER 4
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 4 + EXTENDED PARSER + MAIN EXPORT
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
      case "ruler":           return <RulerVis          {...visual} />;
      case "ratio":           return <RatioVis          {...visual} />;
      case "alphabet_strip":  return <AlphabetStripVis  {...visual} />;
      case "analogy":         return <AnalogyVis        {...visual} />;
      case "number_sequence": return <NumberSequenceVis {...visual} />;
      case "nvr_matrix":      return <NVRMatrixVis      {...visual} />;
      case "grammar":         return <GrammarVis        {...visual} />;
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
function CoordinateVis({ points = [], xRange = [-3,3], yRange = [-3,3] }) {
  const W = 200, H = 200, PAD = 28;
  const cols = xRange[1] - xRange[0];
  const rows = yRange[1] - yRange[0];
  const cellW = (W - PAD*2) / cols;
  const cellH = (H - PAD*2) / rows;
  const toSvg = (x, y) => ({
    sx: PAD + (x - xRange[0]) * cellW,
    sy: H - PAD - (y - yRange[0]) * cellH,
  });
  const originX = PAD + (0 - xRange[0]) * cellW;
  const originY = H - PAD - (0 - yRange[0]) * cellH;

  // Grid lines
  const gridLines = [];
  for (let x = xRange[0]; x <= xRange[1]; x++) {
    const sx = PAD + (x - xRange[0]) * cellW;
    gridLines.push(<line key={`v${x}`} x1={sx} y1={PAD} x2={sx} y2={H-PAD} stroke={T.slateBd} strokeWidth={1}/>);
  }
  for (let y = yRange[0]; y <= yRange[1]; y++) {
    const sy = H - PAD - (y - yRange[0]) * cellH;
    gridLines.push(<line key={`h${y}`} x1={PAD} y1={sy} x2={W-PAD} y2={sy} stroke={T.slateBd} strokeWidth={1}/>);
  }
  // Axis tick labels
  const ticks = [];
  for (let x = xRange[0]; x <= xRange[1]; x++) {
    if (x === 0) continue;
    const sx = PAD + (x - xRange[0]) * cellW;
    ticks.push(<text key={`tx${x}`} x={sx} y={originY+11} textAnchor="middle" fontSize={7} fill={T.textMid}>{x}</text>);
  }
  for (let y = yRange[0]; y <= yRange[1]; y++) {
    if (y === 0) continue;
    const sy = H - PAD - (y - yRange[0]) * cellH;
    ticks.push(<text key={`ty${y}`} x={originX-5} y={sy+3} textAnchor="end" fontSize={7} fill={T.textMid}>{y}</text>);
  }

  const dotColors = [T.indigo, T.nebula, T.emerald, T.amber];
  return (
    <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {gridLines}
        {/* Axes */}
        <line x1={PAD} y1={originY} x2={W-PAD+6} y2={originY} stroke={T.text} strokeWidth={1.5}/>
        <line x1={originX} y1={H-PAD} x2={originX} y2={PAD-6} stroke={T.text} strokeWidth={1.5}/>
        <polygon points={`${W-PAD+6},${originY} ${W-PAD},${originY-3} ${W-PAD},${originY+3}`} fill={T.text}/>
        <polygon points={`${originX},${PAD-6} ${originX-3},${PAD} ${originX+3},${PAD}`} fill={T.text}/>
        <text x={W-PAD+8} y={originY+4} fontSize={8} fill={T.textMid}>x</text>
        <text x={originX+3} y={PAD-8} fontSize={8} fill={T.textMid}>y</text>
        <text x={originX-4} y={originY+10} fontSize={7} fill={T.textMid} textAnchor="end">0</text>
        {ticks}
        {/* Points + projections */}
        {points.map((pt, i) => {
          const { sx, sy } = toSvg(pt.x, pt.y);
          const col = dotColors[i % dotColors.length];
          return (
            <g key={i}>
              <line x1={sx} y1={sy} x2={sx} y2={originY} stroke={col} strokeWidth={1} strokeDasharray="3,2" opacity={0.6}/>
              <line x1={sx} y1={sy} x2={originX} y2={sy} stroke={col} strokeWidth={1} strokeDasharray="3,2" opacity={0.6}/>
              <circle cx={sx} cy={sy} r={5} fill={col}/>
              <text x={sx+6} y={sy-5} fontSize={8} fontWeight="700" fill={col}>({pt.x},{pt.y})</text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}

// ── NUMBER LINE ────────────────────────────────────────────────────────────────
function NumberLineVis({ min, max, marked, label, start, steps, direction }) {
  const W = 210, H = 72, PAD = 16, ARR = 10;
  const range = (max - min) || 1;
  const toX = n => PAD + ((n - min) / range) * (W - PAD*2 - ARR);
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
function AngleVis({ degrees, label }) {
  const W = 160, H = 130, ox = 40, oy = 100, r = 80;
  const rad = (degrees * Math.PI) / 180;
  const ex = ox + r;
  const ey = oy;
  const ax = ox + r * Math.cos(-rad);
  const ay = oy + r * Math.sin(-rad);
  // Arc radius for angle marker
  const ar = 28;
  const arcX = ox + ar * Math.cos(-rad);
  const arcY = oy + ar * Math.sin(-rad);
  const large = degrees > 180 ? 1 : 0;
  const color = degrees < 90 ? T.indigo : degrees < 180 ? T.nebula : T.rose;
  const typeLabel = degrees < 90 ? "acute" : degrees === 90 ? "right" : degrees < 180 ? "obtuse" : "reflex";

  return (
    <Panel accent={color} bg={T.slateBg} bd={T.slateBd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Base ray */}
        <line x1={ox} y1={oy} x2={ex} y2={ey} stroke={color} strokeWidth={2.5} strokeLinecap="round"/>
        {/* Angle ray */}
        <line x1={ox} y1={oy} x2={ax} y2={ay} stroke={color} strokeWidth={2.5} strokeLinecap="round"/>
        {/* Arc */}
        {degrees !== 90 ? (
          <path d={`M ${ox+ar},${oy} A ${ar},${ar} 0 ${large},0 ${arcX},${arcY}`}
            stroke={color} strokeWidth={1.5} fill="none"/>
        ) : (
          // Right angle square
          <g>
            <line x1={ox+12} y1={oy} x2={ox+12} y2={oy-12} stroke={color} strokeWidth={1.5}/>
            <line x1={ox+12} y1={oy-12} x2={ox} y2={oy-12} stroke={color} strokeWidth={1.5}/>
          </g>
        )}
        {/* Degree label */}
        <text x={ox+ar+8} y={oy - ar*0.3} fontSize={11} fontWeight="800" fill={color}>{degrees}°</text>
        {/* Vertex dot */}
        <circle cx={ox} cy={oy} r={3} fill={color}/>
      </svg>
      {label && <Chip color={color} bg={T.slateBg}>{label}</Chip>}
    </Panel>
  );
}

// ── AREA / PERIMETER ─────────────────────────────────────────────────────────
function AreaVis({ width, height, mode = "area" }) {
  const PAD = 12;
  // Scale cell size to fit within the ~190px left panel
  // Use the smaller dimension to keep cells square
  const MAX_W_PX = 170, MAX_H_PX = 120;
  const cellW = Math.max(8, Math.min(22, Math.floor(MAX_W_PX / width)));
  const cellH = Math.max(8, Math.min(22, Math.floor(MAX_H_PX / height)));
  const CELL  = Math.min(cellW, cellH);   // square cells
  const gridW = width  * CELL;
  const gridH = height * CELL;
  const W = gridW + PAD * 2 + 20;   // +20 for left label
  const H = gridH + PAD * 2 + 20;   // +20 for bottom label
  const cells = [];
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      cells.push(
        <rect key={`${row}-${col}`}
          x={PAD + 20 + col * CELL} y={PAD + row * CELL}
          width={CELL} height={CELL}
          fill={T.indigoBg} stroke={T.indigoBd} strokeWidth={1}/>
      );
    }
  }
  const gx = PAD + 20;  // grid origin x (offset for left label)
  const gy = PAD;       // grid origin y
  return (
    <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", maxWidth: "100%" }}>
        {cells}
        {/* Outer border */}
        <rect x={gx} y={gy} width={gridW} height={gridH}
          fill="none" stroke={T.indigo} strokeWidth={2.5} rx={2}/>
        {/* Bottom label — actual width */}
        <text x={gx + gridW / 2} y={H - 5}
          textAnchor="middle" fontSize={11} fontWeight="700" fill={T.indigo}>
          {width} cm
        </text>
        {/* Left label — actual height, rotated */}
        <text x={PAD + 6} y={gy + gridH / 2}
          textAnchor="middle" fontSize={11} fontWeight="700" fill={T.indigo}
          transform={`rotate(-90, ${PAD + 6}, ${gy + gridH / 2})`}>
          {height} cm
        </text>
      </svg>
    </Panel>
  );
}

// ── FORMULA TRIANGLE ─────────────────────────────────────────────────────────
// Standard UK triangle. Top = product, bottom-left × bottom-right.
// unknown = which variable is being found (highlighted in amber)
function FormulaTriangleVis({ top, left, right, unknown, title }) {
  const W = 180, H = 130;
  const pts = "90,12 16,118 164,118";
  const highlight = (v, name) => name === unknown
    ? { fill: T.amberBg, stroke: T.amber, textFill: T.amber }
    : { fill: "white", stroke: T.slateBd, textFill: T.text };

  const Box = ({ x, y, w, h, label, name }) => {
    const s = highlight(label, name);
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={4} fill={s.fill} stroke={s.stroke} strokeWidth={name===unknown?2:1.5}/>
        <text x={x+w/2} y={y+h/2+5} textAnchor="middle" fontSize={13} fontWeight="900" fill={s.textFill}>{label}</text>
      </g>
    );
  };

  return (
    <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}>
      {title && <Chip color={T.indigo} bg={T.indigoBg}>{title}</Chip>}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <polygon points={pts} fill={T.slateBg} stroke={T.indigo} strokeWidth={2}/>
        {/* Horizontal divider */}
        <line x1={16} y1={65} x2={164} y2={65} stroke={T.indigo} strokeWidth={1.5}/>
        {/* Vertical divider lower half */}
        <line x1={90} y1={65} x2={90} y2={118} stroke={T.indigo} strokeWidth={1.5}/>
        {/* Variable boxes */}
        <Box x={67} y={22} w={46} h={30} label={top}   name="top"  />
        <Box x={22} y={72} w={52} h={30} label={left}  name="left" />
        <Box x={106} y={72} w={52} h={30} label={right} name="right"/>
      </svg>
    </Panel>
  );
}

// ── MOTION GRAPH (d-t or v-t) ─────────────────────────────────────────────────
// motionType: "distance_time" | "velocity_time"
// curveType: "constant" | "accelerating" | "decelerating" | "stationary"
function MotionGraphVis({ motionType = "distance_time", curveType = "constant" }) {
  const W = 200, H = 130, PAD = 24;
  const chartW = W - PAD*2, chartH = H - PAD*2;
  const yLabel = motionType === "distance_time" ? "d" : "v";
  const xLabel = "t";
  const color = motionType === "distance_time" ? T.indigo : T.emerald;

  const curves = {
    constant:      `M ${PAD},${H-PAD} L ${W-PAD},${PAD+20}`,
    accelerating:  `M ${PAD},${H-PAD} Q ${W-PAD},${H-PAD} ${W-PAD},${PAD+10}`,
    decelerating:  `M ${PAD},${PAD+10} Q ${PAD},${H-PAD} ${W-PAD},${H-PAD}`,
    stationary:    `M ${PAD},${H-PAD-40} L ${W-PAD},${H-PAD-40}`,
  };

  const labels = {
    constant:      motionType === "distance_time" ? "constant speed" : "constant acceleration",
    accelerating:  motionType === "distance_time" ? "speeding up" : "increasing acceleration",
    decelerating:  motionType === "distance_time" ? "slowing down" : "decelerating",
    stationary:    motionType === "distance_time" ? "not moving" : "constant velocity",
  };

  return (
    <Panel accent={color} bg={T.slateBg} bd={T.slateBd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Grid */}
        <line x1={PAD} y1={PAD} x2={PAD} y2={H-PAD} stroke={T.slateBd} strokeWidth={1}/>
        <line x1={PAD} y1={H-PAD} x2={W-PAD} y2={H-PAD} stroke={T.slateBd} strokeWidth={1}/>
        {/* Axes arrows */}
        <polygon points={`${PAD},${PAD-2} ${PAD-3},${PAD+6} ${PAD+3},${PAD+6}`} fill={color}/>
        <polygon points={`${W-PAD+2},${H-PAD} ${W-PAD-6},${H-PAD-3} ${W-PAD-6},${H-PAD+3}`} fill={color}/>
        {/* Axis labels — offset from axis tips for clarity */}
        <text x={PAD-14} y={PAD+4} fontSize={11} fontWeight="800" fill={color}>{yLabel}</text>
        <text x={W-PAD+4} y={H-PAD+16} fontSize={11} fontWeight="800" fill={color}>{xLabel}</text>
        {/* Origin */}
        <text x={PAD-8} y={H-PAD+10} fontSize={8} fill={T.textMid}>0</text>
        {/* Curve */}
        <path d={curves[curveType] || curves.constant}
          stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round"/>
        {/* Annotations sit below axis line with space — not overlapping curve */}
        {motionType === "distance_time" && (
          <text x={W-PAD-4} y={H-PAD-6} textAnchor="end" fontSize={7} fill={T.textMid}>
            gradient = speed
          </text>
        )}
        {motionType === "velocity_time" && (
          <text x={W-PAD-4} y={H-PAD-6} textAnchor="end" fontSize={7} fill={T.textMid}>
            area under = distance
          </text>
        )}
      </svg>
      <div style={{marginTop:6}}>
        <Chip color={color} bg={color === T.indigo ? T.indigoBg : T.emeraldBg}>{labels[curveType]}</Chip>
      </div>
    </Panel>
  );
}

// ── CIRCUIT DIAGRAM ──────────────────────────────────────────────────────────
// type: "series" | "parallel"
function CircuitVis({ type = "series" }) {
  const W = 200, H = 110;
  const color = T.indigo;
  // Both circuits as clean SVG paths using standard UK symbols
  return (
    <Panel accent={color} bg={T.slateBg} bd={T.slateBd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {type === "series" ? (
          <g>
            {/* Rectangular loop */}
            <polyline points="20,30 20,90 180,90 180,30 20,30" fill="none" stroke={color} strokeWidth={2}/>
            {/* Battery symbol on left side */}
            <line x1={20} y1={50} x2={20} y2={56} stroke={color} strokeWidth={3}/>
            <line x1={15} y1={58} x2={25} y2={58} stroke={color} strokeWidth={2.5}/>
            <line x1={17} y1={61} x2={23} y2={61} stroke={color} strokeWidth={2}/>
            <line x1={20} y1={63} x2={20} y2={69} stroke={color} strokeWidth={3}/>
            <text x={28} y={62} fontSize={8} fill={color}>cell</text>
            {/* Bulb 1 on top */}
            <circle cx={75} cy={30} r={9} fill="white" stroke={color} strokeWidth={2}/>
            <line x1={70} y1={34} x2={80} y2={26} stroke={color} strokeWidth={1.2}/>
            <line x1={80} y1={34} x2={70} y2={26} stroke={color} strokeWidth={1.2}/>
            {/* Bulb 2 on top */}
            <circle cx={130} cy={30} r={9} fill="white" stroke={color} strokeWidth={2}/>
            <line x1={125} y1={34} x2={135} y2={26} stroke={color} strokeWidth={1.2}/>
            <line x1={135} y1={34} x2={125} y2={26} stroke={color} strokeWidth={1.2}/>
            <text x={100} y={105} textAnchor="middle" fontSize={8} fontWeight="700" fill={color}>SERIES</text>
          </g>
        ) : (
          <g>
            {/* Outer loop */}
            <polyline points="20,20 20,90 180,90 180,20" fill="none" stroke={color} strokeWidth={2}/>
            <line x1={20} y1={20} x2={180} y2={20} stroke={color} strokeWidth={2}/>
            {/* Junction dots */}
            <circle cx={20} cy={20} r={3.5} fill={color}/>
            <circle cx={20} cy={90} r={3.5} fill={color}/>
            <circle cx={180} cy={20} r={3.5} fill={color}/>
            <circle cx={180} cy={90} r={3.5} fill={color}/>
            {/* Battery on left */}
            <line x1={20} y1={44} x2={20} y2={50} stroke={color} strokeWidth={3}/>
            <line x1={15} y1={52} x2={25} y2={52} stroke={color} strokeWidth={2.5}/>
            <line x1={17} y1={55} x2={23} y2={55} stroke={color} strokeWidth={2}/>
            <line x1={20} y1={57} x2={20} y2={63} stroke={color} strokeWidth={3}/>
            {/* Branch connector */}
            <line x1={100} y1={20} x2={100} y2={90} stroke={color} strokeWidth={2}/>
            <circle cx={100} cy={20} r={3.5} fill={color}/>
            <circle cx={100} cy={90} r={3.5} fill={color}/>
            {/* Bulb left branch */}
            <circle cx={60} cy={55} r={9} fill="white" stroke={color} strokeWidth={2}/>
            <line x1={55} y1={59} x2={65} y2={51} stroke={color} strokeWidth={1.2}/>
            <line x1={65} y1={59} x2={55} y2={51} stroke={color} strokeWidth={1.2}/>
            {/* Bulb right branch */}
            <circle cx={140} cy={55} r={9} fill="white" stroke={color} strokeWidth={2}/>
            <line x1={135} y1={59} x2={145} y2={51} stroke={color} strokeWidth={1.2}/>
            <line x1={145} y1={59} x2={135} y2={51} stroke={color} strokeWidth={1.2}/>
            <text x={100} y={105} textAnchor="middle" fontSize={8} fontWeight="700" fill={color}>PARALLEL</text>
          </g>
        )}
      </svg>
    </Panel>
  );
}

// ── QUADRATIC GRAPH SKETCH ────────────────────────────────────────────────────
// Shows parabola shape, marks roots and vertex. Does NOT give the answer.
function QuadraticVis({ a = 1, roots, vertex, label }) {
  const W = 200, H = 130, PAD = 20;
  const cW = W - PAD*2, cH = H - PAD*2;
  // Normalise to viewport: roots in [-3,3] range
  const xMin = -3.5, xMax = 3.5;
  const toSx = x => PAD + ((x - xMin) / (xMax - xMin)) * cW;
  // Generate curve points
  const pts = [];
  const r1 = roots?.[0] ?? -1.5, r2 = roots?.[1] ?? 1.5;
  const vx = vertex?.x ?? (r1+r2)/2;
  const vy = vertex?.y ?? (a > 0 ? -2 : 2);
  const yMin = Math.min(vy - 0.5, -2.5), yMax = Math.max(2.5, -vy + 0.5);
  const toSy = y => PAD + cH - ((y - yMin) / (yMax - yMin)) * cH;

  for (let xi = 0; xi <= 60; xi++) {
    const x = xMin + (xi / 60) * (xMax - xMin);
    const y = a * (x - vx)**2 + vy;
    pts.push(`${toSx(x)},${toSy(y)}`);
  }
  const originY = toSy(0), originX = toSx(0);
  const color = T.indigo;

  return (
    <Panel accent={color} bg={T.slateBg} bd={T.slateBd}>
      {label && <Chip color={color} bg={T.indigoBg}>{label}</Chip>}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Axes */}
        <line x1={PAD} y1={originY} x2={W-PAD} y2={originY} stroke="#94a3b8" strokeWidth={1.5}/>
        <line x1={originX} y1={PAD} x2={originX} y2={H-PAD} stroke="#94a3b8" strokeWidth={1.5}/>
        {/* Axis arrows */}
        <polygon points={`${W-PAD},${originY} ${W-PAD-6},${originY-3} ${W-PAD-6},${originY+3}`} fill="#94a3b8"/>
        <polygon points={`${originX},${PAD} ${originX-3},${PAD+6} ${originX+3},${PAD+6}`} fill="#94a3b8"/>
        <text x={W-PAD+2} y={originY+4} fontSize={8} fill={T.textMid}>x</text>
        <text x={originX+3} y={PAD-2} fontSize={8} fill={T.textMid}>y</text>
        {/* Curve */}
        <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        {/* Roots */}
        {roots?.map((rx, i) => (
          <g key={i}>
            <circle cx={toSx(rx)} cy={originY} r={4} fill={color}/>
            <text x={toSx(rx)} y={originY+12} textAnchor="middle" fontSize={8} fontWeight="700" fill={color}>x={rx}</text>
          </g>
        ))}
        {/* Vertex */}
        {vertex && (
          <g>
            <circle cx={toSx(vx)} cy={toSy(vy)} r={4} fill={T.nebula}/>
            <text x={toSx(vx)+6} y={toSy(vy)-4} fontSize={8} fontWeight="700" fill={T.nebula}>({vx},{vy})</text>
          </g>
        )}
      </svg>
    </Panel>
  );
}

// ── PERIODIC TABLE ELEMENT CARD ───────────────────────────────────────────────
const PT_GROUP_COLORS = {
  "alkali":      { bg:"#fef3c7", bd:"#f59e0b", text:"#92400e" },
  "alkaline":    { bg:"#fef9c3", bd:"#eab308", text:"#713f12" },
  "transition":  { bg:"#fce7f3", bd:"#db2777", text:"#831843" },
  "nonmetal":    { bg:"#ecfdf5", bd:"#10b981", text:"#064e3b" },
  "noble":       { bg:"#f5f3ff", bd:"#8b5cf6", text:"#4c1d95" },
  "metalloid":   { bg:"#eff6ff", bd:"#3b82f6", text:"#1e3a8a" },
  "halogen":     { bg:"#fff1f2", bd:"#f43f5e", text:"#881337" },
  "default":     { bg:"#f8fafc", bd:"#94a3b8", text:"#1e293b" },
};
function ElementVis({ symbol, name, atomicNumber, mass, group, period, groupType = "default" }) {
  const c = PT_GROUP_COLORS[groupType] || PT_GROUP_COLORS.default;
  const W = 180, H = 100;
  return (
    <Panel accent={c.bd} bg={c.bg} bd={c.bd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Element tile */}
        <rect x={55} y={4} width={70} height={78} rx={8} fill="white" stroke={c.bd} strokeWidth={2}/>
        <text x={90} y={22} textAnchor="middle" fontSize={10} fill={c.text}>{atomicNumber}</text>
        <text x={90} y={55} textAnchor="middle" fontSize={28} fontWeight="900" fill={c.text}>{symbol}</text>
        <text x={90} y={68} textAnchor="middle" fontSize={9} fontWeight="700" fill={c.text}>{name}</text>
        <text x={90} y={78} textAnchor="middle" fontSize={8} fill={c.text}>{mass}</text>
        {/* Group / Period badges */}
        <rect x={2} y={36} width={48} height={14} rx={4} fill={c.bg} stroke={c.bd} strokeWidth={1}/>
        <text x={26} y={47} textAnchor="middle" fontSize={8} fontWeight="700" fill={c.text}>Group {group}</text>
        <rect x={130} y={36} width={48} height={14} rx={4} fill={c.bg} stroke={c.bd} strokeWidth={1}/>
        <text x={154} y={47} textAnchor="middle" fontSize={8} fontWeight="700" fill={c.text}>Period {period}</text>
      </svg>
    </Panel>
  );
}

// ─── EXTEND PARSER ────────────────────────────────────────────────────────────
// Wraps the existing parseVisual. Called parseVisualExtended — the main export
// calls this instead.
function parseVisualExtended(topic, questionText, subject, yearLevel) {
  const t    = (topic || "").toLowerCase();
  const q    = (questionText || "").toLowerCase();
  const subj = (subject || "").toLowerCase();
  const nums = ((questionText || "").match(/-?\d+(?:\.\d+)?/g) || []).map(Number);

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