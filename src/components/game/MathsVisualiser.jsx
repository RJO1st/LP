"use client";
// ─── MathsVisualiser.jsx ─────────────────────────────────────────────────────
// LaunchPard-native concrete visuals. Bright panels, WCAG AA accessible.
// Colour-blind safe: shape + pattern encoding, not colour alone.
// Covers: Y1–Y4 maths, KS3 physics (forces, velocity), biology (food chains),
//         Y3–Y5 NVR (shape sequences).
//
// Deploy to: src/components/game/MathsVisualiser.jsx
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from "react";

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
function Panel({ children, accent = T.indigo, bg, bd }) {
  const panelBg = bg || "#ffffff";
  const panelBd = bd || `${accent}44`;
  return (
    <div style={{
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
  const r = Math.min(rows, 6), c = Math.min(cols, 8);
  return (
    <Panel accent={T.emerald} bg={T.emeraldBg} bd={T.emeraldBd}>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center" }}>
        {Array.from({ length: r }).map((_, ri) => (
          <div key={ri} style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {Array.from({ length: c }).map((_, ci) => (
              <Dot key={ci} color={T.emerald} bg={T.emeraldBg} border={T.emerald} size={18} />
            ))}
          </div>
        ))}
      </div>
      <Chip color={T.emerald} bg={T.emeraldBg}>{r} groups of {c}</Chip>
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
  const nums = ((questionText || "").match(/\d+(?:\.\d+)?/g) || []).map(Number);

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
  if (yearLevel > 4) return null;

  if (t.includes("count") || t.includes("number_recog")) {
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

  const subMatch = (questionText || "").match(/(\d+)\s*[−\-–]\s*(\d+)/);
  if (subMatch) {
    const from = parseInt(subMatch[1]), remove = parseInt(subMatch[2]);
    if (from <= 15) return { type: "subtraction", from, remove };
  }

  const mulMatch = (questionText || "").match(/(\d+)\s*[×x\*]\s*(\d+)/);
  const grpMatch = (questionText || "").match(/(\d+)\s*groups?\s*of\s*(\d+)/i);
  if (mulMatch || grpMatch) {
    const m = mulMatch || grpMatch;
    const r = parseInt(m[1]), c = parseInt(m[2]);
    if (r <= 6 && c <= 8 && r > 0 && c > 0) return { type: "multiplication", rows: r, cols: c };
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

    const isMaths   = subj.includes("math");
    const isScience = subj.includes("science") || subj.includes("physics") || subj.includes("biology") || subj.includes("chemistry");
    const isNVR     = subj.includes("verbal") || subj.includes("nvr");
    if (!isMaths && !isScience && !isNVR) return null;
    // Note: year guard is per-visual-type inside parseVisualExtended, not global

    return parseVisualExtended(
      question.topic || question._anchorTopic || "",
      question.q || question.question_text || "",
      subject || "",
      year
    );
  }, [question, subject, yearLevel]);

  if (!visual) return null;

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
      default:                return null;
    }
  })();

  if (!inner) return null;

  return (
    <>
      <style>{`@keyframes lp-pulse{0%,100%{opacity:1}50%{opacity:0.6}}`}</style>
      {inner}
    </>
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
function NumberLineVis({ min, max, marked, label }) {
  const W = 210, H = 54, PAD = 16, ARR = 10;
  const range = max - min;
  const toX = n => PAD + ((n - min) / range) * (W - PAD*2 - ARR);
  const ticks = [];
  // Show at most 11 tick marks — pick a nice step
  const rawStep = range / 10;
  const step = rawStep <= 1 ? 1 : rawStep <= 2 ? 2 : rawStep <= 5 ? 5 : 10;
  const first = Math.ceil(min / step) * step;
  for (let v = first; v <= max; v += step) {
    const sx = toX(v);
    ticks.push(
      <g key={v}>
        <line x1={sx} y1={26} x2={sx} y2={32} stroke="#94a3b8" strokeWidth={1.5}/>
        <text x={sx} y={43} textAnchor="middle" fontSize={8} fill={T.textMid}>{v}</text>
      </g>
    );
  }
  const mx = marked != null ? toX(marked) : null;
  return (
    <Panel accent={T.amber} bg={T.amberBg} bd={T.amberBd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1={PAD} y1={29} x2={W-ARR} y2={29} stroke={T.amber} strokeWidth={2.5}/>
        <polygon points={`${W-ARR+4},29 ${W-ARR-2},26 ${W-ARR-2},32`} fill={T.amber}/>
        {ticks}
        {mx != null && (
          <g>
            <circle cx={mx} cy={29} r={6} fill={T.amber}/>
            <text x={mx} y={16} textAnchor="middle" fontSize={9} fontWeight="800" fill={T.amber}>{marked}</text>
            <line x1={mx} y1={17} x2={mx} y2={23} stroke={T.amber} strokeWidth={1.5}/>
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
  const CELL = 20, PAD = 14;
  const w = Math.min(width, 9), h = Math.min(height, 7);
  const W = w * CELL + PAD*2, H = h * CELL + PAD*2 + 24;
  const cells = [];
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      cells.push(
        <rect key={`${row}-${col}`}
          x={PAD + col*CELL} y={PAD + row*CELL}
          width={CELL} height={CELL}
          fill={T.indigoBg} stroke={T.indigoBd} strokeWidth={1}/>
      );
    }
  }
  return (
    <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {cells}
        {/* Outer border */}
        <rect x={PAD} y={PAD} width={w*CELL} height={h*CELL}
          fill="none" stroke={T.indigo} strokeWidth={2.5} rx={2}/>
        {/* Dimension labels */}
        <text x={PAD + w*CELL/2} y={H-6} textAnchor="middle" fontSize={9} fontWeight="700" fill={T.indigo}>{w}</text>
        <text x={PAD-4} y={PAD + h*CELL/2} textAnchor="end" fontSize={9} fontWeight="700" fill={T.indigo}
          transform={`rotate(-90, ${PAD-4}, ${PAD + h*CELL/2})`}>{h}</text>
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
    // Look for "N by M" or "N × M" or "length N width M"
    const byMatch = (questionText||"").match(/(\d+)\s*(?:by|×|x)\s*(\d+)/i);
    const lwMatch = (questionText||"").match(/length[^\d]*(\d+)[^\d]*width[^\d]*(\d+)/i);
    const wlMatch = (questionText||"").match(/width[^\d]*(\d+)[^\d]*height[^\d]*(\d+)/i);
    const m = byMatch || lwMatch || wlMatch;
    if (m) {
      const w = parseInt(m[1]), h = parseInt(m[2]);
      if (w<=9 && h<=7 && w>0 && h>0)
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

  // Fallback to original parser
  return parseVisual(topic, questionText, subject, yearLevel);
}