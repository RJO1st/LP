"use client";
// ─── Deploy to: src/components/game/NVRVisuals.jsx ───────────────────────────
// Extracted from MathsVisualiser — Non-Verbal Reasoning visual components.
import React from "react";
import DOMPurify from "dompurify";

// ─── Shared design tokens ────────────────────────────────────────────────────
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

// ─── Shared primitives ───────────────────────────────────────────────────────
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


// ═══════════════════════════════════════════════════════════════════════════════
// NVR VISUALS
// ═══════════════════════════════════════════════════════════════════════════════

export function NVRShapeItem({ shape, size, fill, stroke, rotate = 0, opacity = 1, isQuestion = false }) {
  const cx = 24, cy = 24, r = size;
  const shapeFn = NVR_SHAPES[shape] || NVR_SHAPES.circle;
  const svgContent = shapeFn(cx, cy, r, fill, stroke);
  // Sanitize SVG content to prevent XSS attacks
  const sanitizedSVG = DOMPurify.sanitize(svgContent, {
    USE_PROFILES: { svg: true, svgFilters: true }
  });

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
          <g dangerouslySetInnerHTML={{ __html: sanitizedSVG }} />
        </svg>
      )}
    </div>
  );
}

export function NVRVis({ sequence }) {
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

export function NVRShapePropertyVis({ shapeName }) {
  const W = 170, H = 150, cx = 85, cy = 72, r = 44;
  const props = SHAPE_PROPS[shapeName] || SHAPE_PROPS.triangle;
  const verts = props.vertices(cx, cy, r);
  const color = T.indigo;

  return (
    <Panel accent={color} bg={T.indigoBg} bd={T.indigoBd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {props.type === "circle" ? (
          <circle className="vis-segment" cx={cx} cy={cy} r={r} fill={T.indigoBg} stroke={color} strokeWidth={2.5}/>
        ) : (
          <polygon className="vis-segment" points={props.svgPath(cx, cy, r)}
            fill={T.indigoBg} stroke={color} strokeWidth={2.5}/>
        )}
        {/* Corner dots */}
        {verts.map(([vx, vy], i) => (
          <circle key={i} className="vis-mark" cx={vx} cy={vy} r={4} fill={color}/>
        ))}
        {/* Shape name */}
        <text className="vis-label" x={cx} y={H - 8} textAnchor="middle" fontSize={11} fontWeight="800" fill={color}>
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
export function Arrow({ length, color, label, direction = "right", y = 24 }) {
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
export function NVRReflectionVis({ letter = "d" }) {
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
export function NVRNetVis({ shape3d = "cube" }) {
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
              <rect key={i} className="vis-bar" x={col*SQ} y={row*SQ} width={SQ-2} height={SQ-2}
                fill={T.amberBg} stroke={T.amber} strokeWidth={2} rx={2}/>
            ))}
          </g>
        )}
        {shape3d !== "cube" && pyramidTris.map((t, i) => (
          <polygon key={i} className="vis-segment" points={t.pts}
            fill={T.amberBg} stroke={T.amber} strokeWidth={2}/>
        ))}
      </svg>
      <Chip color={T.amber} bg="white">Net of a {shape3d} — fold the faces</Chip>
    </Panel>
  );
}

// ─── NVR ROTATION VISUAL ───────────────────────────────────────────────────────
export function NVRRotationVis({ degrees = 90, clockwise = true }) {
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
        <text className="vis-mark" x={cx} y={cy+6} textAnchor="middle" fontSize={30} fill={T.indigo}>→</text>
        {/* Rotated arrow */}
        <text className="vis-mark" x={cx + 90} y={cy+6} textAnchor="middle" fontSize={30} fill={T.nebula}
          transform={`rotate(${rot2}, ${cx+90}, ${cy})`}>→</text>
        {/* Arc label */}
        <path className="vis-arc" d={`M ${cx+62},${cy-8} A 15 15 0 0 ${clockwise?1:0} ${cx+68},${cy+8}`}
          fill="none" stroke={T.slate} strokeWidth={1.5} strokeDasharray="3,2"/>
        <text className="vis-label" x={cx+62} y={cy-14} textAnchor="middle" fontSize={8} fill={T.textMid}>
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
export function NVROddOneOutVis() {
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


export function NVRMatrixVis({ cells }) {
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

export function NVRShapeReflectionVis({ shape = "flag", horizontal = false, direction = "right" }) {
  const W = 240, H = 120;
  const midX = W / 2, midY = H / 2;

  const shapes = {
    flag: (x, y, dir) => {
      const pole = `M${x},${y - 30} L${x},${y + 30}`;
      const flag = dir === "right" ? `M${x},${y - 30} L${x + 25},${y - 15} L${x},${y}Z`
        : dir === "left" ? `M${x},${y - 30} L${x - 25},${y - 15} L${x},${y}Z`
        : dir === "up" ? `M${x - 15},${y} L${x},${y - 25} L${x + 15},${y}Z`
        : `M${x - 15},${y} L${x},${y + 25} L${x + 15},${y}Z`;
      return { pole, flag };
    },
    arrow: (x, y, dir) => {
      const pts = {
        right: `${x-15},${y-8} ${x+5},${y-8} ${x+5},${y-16} ${x+20},${y} ${x+5},${y+16} ${x+5},${y+8} ${x-15},${y+8}`,
        left: `${x+15},${y-8} ${x-5},${y-8} ${x-5},${y-16} ${x-20},${y} ${x-5},${y+16} ${x-5},${y+8} ${x+15},${y+8}`,
        up: `${x-8},${y+15} ${x-8},${y-5} ${x-16},${y-5} ${x},${y-20} ${x+16},${y-5} ${x+8},${y-5} ${x+8},${y+15}`,
        down: `${x-8},${y-15} ${x-8},${y+5} ${x-16},${y+5} ${x},${y+20} ${x+16},${y+5} ${x+8},${y+5} ${x+8},${y-15}`,
      };
      return { polygon: pts[dir] || pts.right };
    },
    triangle: (x, y, dir) => {
      const pts = {
        right: `${x-15},${y-18} ${x+18},${y} ${x-15},${y+18}`,
        left: `${x+15},${y-18} ${x-18},${y} ${x+15},${y+18}`,
        up: `${x-18},${y+15} ${x},${y-18} ${x+18},${y+15}`,
        down: `${x-18},${y-15} ${x},${y+18} ${x+18},${y-15}`,
      };
      return { polygon: pts[dir] || pts.right };
    },
    square: (x, y) => ({ rect: { x: x-15, y: y-15, w: 30, h: 30 } }),
  };

  const shapeGen = shapes[shape] || shapes.triangle;
  const origX = horizontal ? midX : midX - 55;
  const origY = horizontal ? midY - 30 : midY;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"12px 8px" }}>
      <span style={{ fontSize:9, fontWeight:700, color:"#64748b", letterSpacing:1, textTransform:"uppercase" }}>
        {horizontal ? "Horizontal" : "Vertical"} Reflection
      </span>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {(() => {
          const s = shapeGen(origX, origY, direction);
          return (
            <g className="vis-segment">
              {s.pole && <path className="vis-arc" d={s.pole} stroke="#6366f1" strokeWidth={3} fill="none" strokeLinecap="round" />}
              {s.flag && <path className="vis-segment" d={s.flag} fill="#818cf8" stroke="#6366f1" strokeWidth={2} />}
              {s.polygon && <polygon className="vis-segment" points={s.polygon} fill="#818cf8" stroke="#6366f1" strokeWidth={2} />}
              {s.rect && <rect className="vis-bar" x={s.rect.x} y={s.rect.y} width={s.rect.w} height={s.rect.h} fill="#818cf8" stroke="#6366f1" strokeWidth={2} rx={3} />}
            </g>
          );
        })()}
        {horizontal ? (
          <>
            <line className="vis-axis" x1={20} y1={midY} x2={W-20} y2={midY} stroke="#94a3b8" strokeWidth={2} strokeDasharray="6,4" />
            <text className="vis-label" x={W-16} y={midY-4} fontSize={8} fill="#94a3b8" fontWeight={700}>mirror</text>
          </>
        ) : (
          <>
            <line className="vis-axis" x1={midX} y1={10} x2={midX} y2={H-10} stroke="#94a3b8" strokeWidth={2} strokeDasharray="6,4" />
            <text className="vis-label" x={midX} y={8} textAnchor="middle" fontSize={8} fill="#94a3b8" fontWeight={700}>mirror</text>
          </>
        )}
        {(() => {
          const refX = horizontal ? origX : midX + 55;
          const refY = horizontal ? midY + 30 : origY;
          return (
            <g>
              <circle cx={refX} cy={refY} r={22} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="4,3" />
              <text x={refX} y={refY+6} textAnchor="middle" fontSize={22} fontWeight={900} fill="#f59e0b">?</text>
            </g>
          );
        })()}
        <text x={origX} y={origY+40} textAnchor="middle" fontSize={9} fontWeight={700} fill="#6366f1">Original</text>
      </svg>
      <span style={{ fontSize:10, fontWeight:700, color:"#6366f1", background:"#eef2ff", padding:"3px 10px", borderRadius:8, border:"1px solid #c7d2fe" }}>
        Which is the correct reflection?
      </span>
    </div>
  );
}

export function NVRPaperFoldVis({ foldType = "half_vertical", punchPositions = [[0.5, 0.5]] }) {
  const W = 180, H = 150;
  const pw = 70, ph = 90; // paper dimensions
  const px = 10, py = 10; // paper origin

  // Fold types define the fold line and how paper maps
  const FOLDS = {
    half_vertical:   { line: [[pw/2, 0], [pw/2, ph]], label: "Fold in half vertically", mirror: "x" },
    half_horizontal: { line: [[0, ph/2], [pw, ph/2]], label: "Fold in half horizontally", mirror: "y" },
    quarter:         { line: [[pw/2, 0], [pw/2, ph]], label: "Fold into quarters", mirror: "both" },
    diagonal:        { line: [[0, 0], [pw, ph]], label: "Fold diagonally", mirror: "diag" },
  };

  const fold = FOLDS[foldType] || FOLDS.half_vertical;

  // Reflect punch positions based on fold type
  const reflectedPunches = punchPositions.flatMap(([px2, py2]) => {
    const points = [[px2, py2]];
    if (fold.mirror === "x" || fold.mirror === "both") points.push([1 - px2, py2]);
    if (fold.mirror === "y" || fold.mirror === "both") points.push([px2, 1 - py2]);
    if (fold.mirror === "both") points.push([1 - px2, 1 - py2]);
    if (fold.mirror === "diag") points.push([1 - py2, 1 - px2]);
    return points;
  });

  return (
    <Panel accent={T.nebula} bg={T.nebulaBg} bd={T.nebulaBd}
      ariaLabel={`Paper fold: ${fold.label} with ${punchPositions.length} punch hole(s)`}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        {/* Folded view */}
        <div style={{ textAlign: "center" }}>
          <svg width={pw + 20} height={ph + 20} viewBox={`0 0 ${pw + 20} ${ph + 20}`}>
            {/* Paper */}
            <rect className="vis-bar" x={px} y={py} width={pw} height={ph} fill="white" stroke={T.slate} strokeWidth={1.5} rx={2}/>
            {/* Fold line */}
            <line className="vis-axis" x1={px + fold.line[0][0]} y1={py + fold.line[0][1]}
              x2={px + fold.line[1][0]} y2={py + fold.line[1][1]}
              stroke={T.nebula} strokeWidth={1.5} strokeDasharray="4,3"/>
            {/* Fold arrow */}
            <text className="vis-label" x={px + pw/2} y={ph + 18} fontSize={7} fontWeight="700" fill={T.textMid} textAnchor="middle">folded</text>
            {/* Punch holes on folded paper */}
            {punchPositions.map(([hx, hy], i) => (
              <circle key={i} className="vis-mark" cx={px + hx * pw} cy={py + hy * ph} r={5}
                fill={T.nebula} stroke="white" strokeWidth={1.5}/>
            ))}
          </svg>
        </div>

        {/* Arrow */}
        <div style={{ display: "flex", alignItems: "center", paddingTop: 40 }}>
          <svg width={20} height={20} viewBox="0 0 20 20">
            <path d="M4 10 L14 10 M10 6 L14 10 L10 14" stroke={T.textMid} strokeWidth={2} fill="none" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Unfolded view */}
        <div style={{ textAlign: "center" }}>
          <svg width={pw + 20} height={ph + 20} viewBox={`0 0 ${pw + 20} ${ph + 20}`}>
            <rect className="vis-bar" x={px} y={py} width={pw} height={ph} fill="white" stroke={T.slate} strokeWidth={1.5} rx={2}/>
            {/* Fold crease (faint) */}
            <line className="vis-axis" x1={px + fold.line[0][0]} y1={py + fold.line[0][1]}
              x2={px + fold.line[1][0]} y2={py + fold.line[1][1]}
              stroke={T.slateBd} strokeWidth={0.5} strokeDasharray="2,2"/>
            {/* All punch holes (reflected) */}
            {reflectedPunches.map(([hx, hy], i) => (
              <circle key={i} className="vis-mark" cx={px + hx * pw} cy={py + hy * ph} r={5}
                fill={T.nebula} stroke="white" strokeWidth={1.5}/>
            ))}
            <text className="vis-label" x={px + pw/2} y={ph + 18} fontSize={7} fontWeight="700" fill={T.textMid} textAnchor="middle">unfolded</text>
          </svg>
        </div>
      </div>
      <Chip color={T.nebula} bg={T.nebulaBg}>{fold.label}</Chip>
    </Panel>
  );
}