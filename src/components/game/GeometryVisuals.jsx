"use client";
// ─── Deploy to: src/components/game/GeometryVisuals.jsx ──────────────────────
// Extracted from MathsVisualiser — geometry, angles, coordinates, measurement.
import React from "react";

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
// GEOMETRY VISUALS
// ═══════════════════════════════════════════════════════════════════════════════

export function RulerVis({ cm, label }) {
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


export function CoordinateVis({ points = [], xRange = [-3,3], yRange = [-3,3] }) {
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
    gridLines.push(<line key={`v${x}`} className="vis-grid" x1={sx} y1={PAD} x2={sx} y2={H-PAD} stroke={T.slateBd} strokeWidth={1}/>);
  }
  for (let y = yRange[0]; y <= yRange[1]; y++) {
    const sy = H - PAD - (y - yRange[0]) * cellH;
    gridLines.push(<line key={`h${y}`} className="vis-grid" x1={PAD} y1={sy} x2={W-PAD} y2={sy} stroke={T.slateBd} strokeWidth={1}/>);
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
        <line className="vis-axis" x1={PAD} y1={originY} x2={W-PAD+6} y2={originY} stroke={T.text} strokeWidth={1.5}/>
        <line className="vis-axis" x1={originX} y1={H-PAD} x2={originX} y2={PAD-6} stroke={T.text} strokeWidth={1.5}/>
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
              <circle className="vis-point" cx={sx} cy={sy} r={5} fill={col}/>
              <text className="vis-label" x={sx+6} y={sy-5} fontSize={8} fontWeight="700" fill={col}>({pt.x},{pt.y})</text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}


export function AngleVis({ degrees, label, scenario, knownAngles, unknownLabel }) {
  // Enhanced angle visualiser — supports:
  // 1. Single angle (original behaviour)
  // 2. Angles on a straight line (scenario="straight_line")
  // 3. Angles at a point (scenario="at_point")
  // 4. Angles in a triangle (scenario="triangle")
  // 5. Vertically opposite (scenario="vertically_opposite")

  if (scenario === "straight_line" && knownAngles?.length) {
    return <AngleOnLineDiagram knownAngles={knownAngles} unknownLabel={unknownLabel} />;
  }
  if (scenario === "triangle" && knownAngles?.length) {
    return <TriangleAngleDiagram knownAngles={knownAngles} unknownLabel={unknownLabel} />;
  }
  if (scenario === "at_point" && knownAngles?.length) {
    return <AnglesAtPointDiagram knownAngles={knownAngles} unknownLabel={unknownLabel} />;
  }
  if (scenario === "vertically_opposite" && knownAngles?.length) {
    return <VerticallyOppositeDiagram knownAngles={knownAngles} unknownLabel={unknownLabel} />;
  }

  // Default: single angle display
  const W = 180, H = 140, ox = 45, oy = 110, r = 85;
  const rad = (degrees * Math.PI) / 180;
  const ex = ox + r, ey = oy;
  const ax = ox + r * Math.cos(-rad), ay = oy + r * Math.sin(-rad);
  const ar = 30;
  const arcX = ox + ar * Math.cos(-rad), arcY = oy + ar * Math.sin(-rad);
  const large = degrees > 180 ? 1 : 0;
  const color = degrees < 90 ? T.indigo : degrees === 90 ? T.emerald : degrees < 180 ? T.nebula : T.rose;
  const typeLabel = degrees < 90 ? "acute" : degrees === 90 ? "right angle" : degrees < 180 ? "obtuse" : "reflex";

  return (
    <Panel accent={color} bg={T.slateBg} bd={T.slateBd}
      ariaLabel={`Angle diagram showing ${degrees} degrees (${typeLabel})`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line className="vis-ray" x1={ox} y1={oy} x2={ex} y2={ey} stroke={color} strokeWidth={2.5} strokeLinecap="round"/>
        <line className="vis-ray" x1={ox} y1={oy} x2={ax} y2={ay} stroke={color} strokeWidth={2.5} strokeLinecap="round"/>
        {degrees !== 90 ? (
          <path className="vis-arc" d={`M ${ox+ar},${oy} A ${ar},${ar} 0 ${large},0 ${arcX},${arcY}`}
            stroke={color} strokeWidth={1.5} fill={`${color}15`}/>
        ) : (
          <g>
            <line x1={ox+14} y1={oy} x2={ox+14} y2={oy-14} stroke={color} strokeWidth={1.5}/>
            <line x1={ox+14} y1={oy-14} x2={ox} y2={oy-14} stroke={color} strokeWidth={1.5}/>
          </g>
        )}
        <text className="vis-label" x={ox + ar + 10} y={oy - ar * 0.35} fontSize={13} fontWeight="900" fill={color}>{degrees}°</text>
        <circle className="vis-mark" cx={ox} cy={oy} r={3.5} fill={color}/>
        <text className="vis-label" x={ox + r * 0.5} y={oy + 18} fontSize={9} fontWeight="700" fill={T.textMid} textAnchor="middle">{typeLabel}</text>
      </svg>
      {label && <Chip color={color} bg={T.slateBg}>{label}</Chip>}
    </Panel>
  );
}

// ── ANGLES ON A STRAIGHT LINE ─────────────────────────────────────────────────
export function AngleOnLineDiagram({ knownAngles, unknownLabel = "?" }) {
  const W = 190, H = 120, cx = 95, cy = 90, r = 70;
  const colors = [T.indigo, T.nebula, T.emerald, T.rose];
  const total = knownAngles.reduce((s, a) => s + (a || 0), 0);
  const unknown = 180 - total;

  const allAngles = [...knownAngles.map(a => ({ deg: a, known: true })), { deg: unknown, known: false }];
  let cumulative = 0;

  return (
    <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}
      ariaLabel={`Angles on a straight line: ${knownAngles.join("° + ")}° + ? = 180°`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Straight line */}
        <line x1={cx - r - 5} y1={cy} x2={cx + r + 5} y2={cy} stroke={T.slate} strokeWidth={2} strokeLinecap="round"/>
        {/* Angle arcs and rays */}
        {allAngles.map((angle, i) => {
          const startRad = (cumulative * Math.PI) / 180;
          const endRad = ((cumulative + angle.deg) * Math.PI) / 180;
          const midRad = ((cumulative + angle.deg / 2) * Math.PI) / 180;
          const color = angle.known ? colors[i % colors.length] : T.rose;
          const ar = 22 + i * 8;

          const sx = cx + ar * Math.cos(Math.PI + startRad);
          const sy = cy - ar * Math.sin(startRad);
          const ex = cx + ar * Math.cos(Math.PI + endRad);
          const ey = cy - ar * Math.sin(endRad);
          const lx = cx + (ar + 14) * Math.cos(Math.PI + midRad);
          const ly = cy - (ar + 14) * Math.sin(midRad);
          const large = angle.deg > 180 ? 1 : 0;

          // Ray at end of this angle
          const rayX = cx + r * Math.cos(Math.PI + endRad);
          const rayY = cy - r * Math.sin(endRad);

          cumulative += angle.deg;
          return (
            <g key={i}>
              {i < allAngles.length - 1 && (
                <line x1={cx} y1={cy} x2={rayX} y2={rayY} stroke={color} strokeWidth={2} strokeLinecap="round"/>
              )}
              <path d={`M ${cx - ar},${cy} A ${ar},${ar} 0 ${large},1 ${ex},${ey}`}
                stroke={color} strokeWidth={1.5} fill={`${color}20`}/>
              <text x={lx} y={ly + 4} fontSize={angle.known ? 10 : 12} fontWeight="900" fill={color} textAnchor="middle">
                {angle.known ? `${angle.deg}°` : unknownLabel}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={3} fill={T.slate}/>
      </svg>
      <Chip color={T.indigo} bg={T.slateBg}>Angles on a straight line = 180°</Chip>
    </Panel>
  );
}

// ── ANGLES IN A TRIANGLE ──────────────────────────────────────────────────────
export function TriangleAngleDiagram({ knownAngles, unknownLabel = "?" }) {
  const W = 180, H = 140;
  const total = knownAngles.reduce((s, a) => s + (a || 0), 0);
  const unknown = 180 - total;
  const colors = [T.indigo, T.nebula, T.rose];
  const allDegs = [...knownAngles, unknown];

  // Detect if this is a right triangle (any angle is 90°)
  const hasRightAngle = allDegs.some(a => a === 90);

  // Triangle vertices — use right-angled shape when appropriate
  const verts = hasRightAngle
    ? [
        { x: 20, y: 15 },    // top-left
        { x: 20, y: 125 },   // bottom-left (right angle here)
        { x: 155, y: 125 },  // bottom-right
      ]
    : [
        { x: 90, y: 15 },    // top
        { x: 20, y: 125 },   // bottom-left
        { x: 160, y: 125 },  // bottom-right
      ];

  // Reorder angles so the 90° angle aligns with the right-angle vertex (index 1 = bottom-left)
  let angles;
  if (hasRightAngle) {
    const rightIdx = allDegs.findIndex(a => a === 90);
    const reordered = [...allDegs];
    // Move right angle to position 1 (bottom-left vertex)
    if (rightIdx !== 1) {
      const temp = reordered[1];
      reordered[1] = reordered[rightIdx];
      reordered[rightIdx] = temp;
    }
    angles = reordered.map((deg, i) => ({
      deg,
      known: i < knownAngles.length ? (i === 1 ? allDegs[rightIdx] === 90 && knownAngles.includes(90) : knownAngles.includes(deg)) : false,
    }));
    // Simpler: mark known based on original
    angles = reordered.map(deg => ({
      deg,
      known: knownAngles.includes(deg),
    }));
  } else {
    angles = [...knownAngles.map(a => ({ deg: a, known: true })), { deg: unknown, known: false }];
  }

  return (
    <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}
      ariaLabel={`Triangle with angles ${knownAngles.join("°, ")}° and unknown`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Triangle edges */}
        <polygon points={verts.map(v => `${v.x},${v.y}`).join(" ")}
          fill="none" stroke={T.slate} strokeWidth={2} strokeLinejoin="round"/>
        {/* Angle labels at each vertex */}
        {angles.slice(0, 3).map((angle, i) => {
          const v = verts[i];
          const offsetX = hasRightAngle
            ? (i === 0 ? 18 : i === 1 ? 14 : -14)
            : (i === 0 ? 0 : i === 1 ? 14 : -14);
          const offsetY = hasRightAngle
            ? (i === 0 ? 14 : i === 1 ? -14 : -10)
            : (i === 0 ? 28 : -10);
          const color = angle.known ? colors[i % colors.length] : T.rose;
          return (
            <g key={i}>
              {angle.deg === 90 ? (
                <g>
                  <rect x={v.x + (i===1?4:-14)} y={v.y + (i===0?4:-14)} width={10} height={10}
                    fill="none" stroke={color} strokeWidth={1.5}/>
                </g>
              ) : (
                <circle cx={v.x} cy={v.y} r={8} fill={`${color}25`} stroke={color} strokeWidth={1}/>
              )}
              <text x={v.x + offsetX} y={v.y + offsetY}
                fontSize={angle.known ? 11 : 13} fontWeight="900" fill={color} textAnchor="middle">
                {angle.known ? `${angle.deg}°` : unknownLabel}
              </text>
            </g>
          );
        })}
      </svg>
      <Chip color={T.indigo} bg={T.slateBg}>Angles in a triangle = 180°</Chip>
    </Panel>
  );
}

// ── ANGLES AT A POINT ─────────────────────────────────────────────────────────
export function AnglesAtPointDiagram({ knownAngles, unknownLabel = "?" }) {
  const W = 180, H = 160, cx = 90, cy = 80, r = 60;
  const colors = [T.indigo, T.nebula, T.emerald, T.rose, "#d97706"];
  const total = knownAngles.reduce((s, a) => s + (a || 0), 0);
  const unknown = 360 - total;
  const allAngles = [...knownAngles.map(a => ({ deg: a, known: true })), { deg: unknown, known: false }];
  let cumulative = 0;

  return (
    <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}
      ariaLabel={`Angles at a point: ${knownAngles.join("° + ")}° + ? = 360°`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {allAngles.map((angle, i) => {
          const startRad = (cumulative * Math.PI) / 180;
          const endRad = ((cumulative + angle.deg) * Math.PI) / 180;
          const midRad = ((cumulative + angle.deg / 2) * Math.PI) / 180;
          const color = angle.known ? colors[i % colors.length] : T.rose;
          const ar = 20;
          const rayX = cx + r * Math.cos(startRad - Math.PI / 2);
          const rayY = cy + r * Math.sin(startRad - Math.PI / 2);
          const lx = cx + (ar + 16) * Math.cos(midRad - Math.PI / 2);
          const ly = cy + (ar + 16) * Math.sin(midRad - Math.PI / 2);
          cumulative += angle.deg;
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={rayX} y2={rayY} stroke={color} strokeWidth={2} strokeLinecap="round"/>
              <text x={lx} y={ly + 4} fontSize={angle.known ? 10 : 12} fontWeight="900" fill={color} textAnchor="middle">
                {angle.known ? `${angle.deg}°` : unknownLabel}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={3} fill={T.slate}/>
      </svg>
      <Chip color={T.indigo} bg={T.slateBg}>Angles at a point = 360°</Chip>
    </Panel>
  );
}

// ── VERTICALLY OPPOSITE ANGLES ────────────────────────────────────────────────
export function VerticallyOppositeDiagram({ knownAngles, unknownLabel = "?" }) {
  const W = 180, H = 140, cx = 90, cy = 70, r = 60;
  const known = knownAngles[0] || 50;
  const supplement = 180 - known;

  const toXY = (deg, len) => ({
    x: cx + len * Math.cos((deg * Math.PI) / 180),
    y: cy + len * Math.sin((deg * Math.PI) / 180),
  });

  const p1 = toXY(0, r), p2 = toXY(180, r);
  const p3 = toXY(-(known), r), p4 = toXY(180 - known, r);

  return (
    <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}
      ariaLabel={`Vertically opposite angles: ${known}° and ?`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1={p2.x} y1={p2.y} x2={p1.x} y2={p1.y} stroke={T.slate} strokeWidth={2} strokeLinecap="round"/>
        <line x1={p4.x} y1={p4.y} x2={p3.x} y2={p3.y} stroke={T.slate} strokeWidth={2} strokeLinecap="round"/>
        {/* Known angle label */}
        <text x={cx + 28} y={cy - 6} fontSize={11} fontWeight="900" fill={T.indigo}>{known}°</text>
        {/* Unknown (opposite) */}
        <text x={cx - 36} y={cy + 14} fontSize={13} fontWeight="900" fill={T.rose}>{unknownLabel}</text>
        {/* Supplement labels */}
        <text x={cx + 22} y={cy + 18} fontSize={9} fontWeight="700" fill={T.textMid}>{supplement}°</text>
        <text x={cx - 30} y={cy - 8} fontSize={9} fontWeight="700" fill={T.textMid}>{supplement}°</text>
        <circle cx={cx} cy={cy} r={3} fill={T.slate}/>
      </svg>
      <Chip color={T.indigo} bg={T.slateBg}>Vertically opposite angles are equal</Chip>
    </Panel>
  );
}

// ── NVR PAPER FOLD VISUAL ─────────────────────────────────────────────────────

export function AreaVis({ width, height, mode = "area" }) {
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

export function FormulaTriangleVis({ top, left, right, unknown, title }) {
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