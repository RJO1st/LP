"use client";
// ─── AdvancedVisuals.jsx ─────────────────────────────────────────────────────
// New premium visualisation types that complement existing MathsVisualiser.
// Each component includes `.vis-*` CSS classes for GSAP animation targeting.
//
// Exports:
//   - EquationSolverVis   — step-by-step algebraic equation solving
//   - ProbabilityTreeVis  — decision/probability tree diagrams
//   - GraphPlotterVis     — function plotting with labeled features
//   - TimelineVis         — animated historical/process timelines
//   - PlaceValueVis       — place value chart for number understanding
//   - ClockFaceVis        — analogue clock for time questions
//   - TallyChartVis       — tally marks for data handling
// ──────────────────────────────────────────────────────────────────────────────
import React from "react";

// ─── Design tokens (matching MathsVisualiser) ─────────────────────────────────
const T = {
  indigo: "#6366f1", indigoBg: "#eef2ff",
  nebula: "#7c3aed", nebulaBg: "#f5f3ff",
  amber: "#f59e0b", amberBg: "#fffbeb",
  emerald: "#10b981", emeraldBg: "#ecfdf5",
  rose: "#f43f5e", roseBg: "#fff1f2",
  slate: "#64748b", slateBg: "#f8fafc", slateBd: "#e2e8f0",
  text: "#1e293b", textMid: "#64748b",
};

function Panel({ children, accent, bg, bd, ariaLabel, style = {} }) {
  return (
    <div role="img" aria-label={ariaLabel || "Visual"} style={{
      padding: "12px 14px", borderRadius: 14,
      background: bg || T.slateBg,
      border: `2px solid ${bd || T.slateBd}`,
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: 8,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Chip({ children, color, bg }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, color,
      background: bg || `${color}15`,
      padding: "2px 8px", borderRadius: 6,
      letterSpacing: 0.5,
    }}>{children}</span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 0a. PIE CHART — missing renderer (referenced in switch but never defined)
// ═══════════════════════════════════════════════════════════════════════════════
export function PieChartVis({ slices = [] }) {
  if (!slices.length) return null;

  const W = 200, H = 180, cx = 100, cy = 85, r = 65;
  const total = slices.reduce((s, sl) => s + (sl.value || 0), 0) || 1;
  const COLORS = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#7c3aed", "#06b6d4", "#ec4899", "#84cc16"];

  let cumAngle = -90;
  const paths = slices.map((sl, i) => {
    const pct = (sl.value || 0) / total;
    const startAngle = cumAngle;
    const sweep = pct * 360;
    cumAngle += sweep;
    const endAngle = cumAngle;
    const toRad = d => (d * Math.PI) / 180;
    const largeArc = sweep > 180 ? 1 : 0;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const midAngle = startAngle + sweep / 2;
    const lx = cx + (r + 14) * Math.cos(toRad(midAngle));
    const ly = cy + (r + 14) * Math.sin(toRad(midAngle));
    const color = COLORS[i % COLORS.length];

    const d = slices.length === 1
      ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return (
      <g key={i}>
        <path className="vis-slice" d={d} fill={color} opacity={0.85} stroke="white" strokeWidth={2} />
        <text className="vis-label" x={lx} y={ly + 3} textAnchor="middle"
          fontSize={8} fontWeight="700" fill={T.text}>
          {sl.label || ""} {Math.round(pct * 100)}%
        </text>
      </g>
    );
  });

  return (
    <Panel accent={T.nebula} bg={T.nebulaBg} bd="#ddd6fe"
      ariaLabel={`Pie chart: ${slices.map(s => s.label).join(", ")}`}>
      <Chip color={T.nebula} bg="white">Pie Chart</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {paths}
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 0b. PERCENTAGE BAR — horizontal bar showing percentage
// ═══════════════════════════════════════════════════════════════════════════════
export function PercentageBarVis({ value = 50 }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd="#c7d2fe"
      ariaLabel={`Percentage bar: ${pct}%`}>
      <Chip color={T.indigo} bg="white">{pct}%</Chip>
      <div style={{ width: "100%", maxWidth: 220 }}>
        <div className="vis-segment" style={{
          height: 28, background: "#e2e8f0", borderRadius: 8,
          overflow: "hidden", position: "relative",
        }}>
          <div className="vis-bar" style={{
            width: `${pct}%`, height: "100%",
            background: `linear-gradient(90deg, ${T.indigo}, ${T.nebula})`,
            borderRadius: 8, transition: "width 0.6s ease",
          }} />
          <span className="vis-label" style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            fontSize: 11, fontWeight: 900, color: pct > 60 ? "white" : T.text,
          }}>{pct}%</span>
        </div>
        {/* Scale markers */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          {[0, 25, 50, 75, 100].map(m => (
            <span key={m} className="vis-tick" style={{
              fontSize: 8, color: T.textMid, fontWeight: 600,
            }}>{m}%</span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 0c. PROBABILITY VISUALISER — spinner/dice/coin with chance display
// ═══════════════════════════════════════════════════════════════════════════════
export function ProbabilityVis({ total = 6, favourable = 1, context = "spinner", hideAnswer = false }) {
  const pct = Math.round((favourable / total) * 100);
  const fraction = `${favourable}/${total}`;

  // When hideAnswer is true, show the setup (items/dice/spinner) but suppress
  // the calculated probability fraction and percentage — the scholar must work it out
  const chipLabel = hideAnswer ? `${total} total` : `P = ${fraction}`;
  const chanceLabel = hideAnswer ? `Find P(?)` : `${pct}% chance`;

  if (context === "dice") {
    const dotPos = {
      1: [[50,50]], 2: [[30,30],[70,70]], 3: [[30,30],[50,50],[70,70]],
      4: [[30,30],[70,30],[30,70],[70,70]], 5: [[30,30],[70,30],[50,50],[30,70],[70,70]],
      6: [[30,25],[70,25],[30,50],[70,50],[30,75],[70,75]],
    };
    return (
      <Panel accent={T.indigo} bg={T.indigoBg} bd="#c7d2fe"
        ariaLabel={hideAnswer ? `Dice with ${total} faces` : `Dice probability: ${fraction}`}>
        <Chip color={T.indigo} bg="white">{chipLabel}</Chip>
        <svg width={80} height={80} viewBox="0 0 100 100">
          <rect className="vis-segment" x={5} y={5} width={90} height={90} rx={14}
            fill="white" stroke={T.indigo} strokeWidth={3} />
          {(dotPos[Math.min(total, 6)] || dotPos[6]).map((p, i) => (
            <circle key={i} className="vis-mark"
              cx={p[0]} cy={p[1]} r={8}
              fill={i < favourable ? T.indigo : "#e2e8f0"}
              stroke={i < favourable ? T.indigo : "#cbd5e1"} strokeWidth={1} />
          ))}
        </svg>
        <span style={{ fontSize: 11, fontWeight: 800, color: T.indigo }}>{chanceLabel}</span>
      </Panel>
    );
  }

  if (context === "coin") {
    return (
      <Panel accent={T.amber} bg={T.amberBg} bd="#fde68a"
        ariaLabel={hideAnswer ? `Coin flip` : `Coin probability: ${fraction}`}>
        <Chip color={T.amber} bg="white">{chipLabel}</Chip>
        <svg width={80} height={80} viewBox="0 0 100 100">
          <circle className="vis-mark" cx={50} cy={50} r={42}
            fill={T.amberBg} stroke={T.amber} strokeWidth={3} />
          <circle cx={50} cy={50} r={36} fill="none" stroke={T.amber} strokeWidth={1.5} strokeDasharray="3,3" />
          <text className="vis-label" x={50} y={46} textAnchor="middle"
            fontSize={14} fontWeight="900" fill={T.amber}>H</text>
          <text x={50} y={62} textAnchor="middle"
            fontSize={8} fontWeight="700" fill={T.textMid}>HEADS</text>
        </svg>
        <span style={{ fontSize: 11, fontWeight: 800, color: T.amber }}>{chanceLabel}</span>
      </Panel>
    );
  }

  // Default: spinner — shows coloured segments representing total items
  const segments = Math.min(total, 12);
  const COLORS = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#7c3aed", "#06b6d4", "#ec4899", "#84cc16", "#14b8a6", "#e11d48", "#8b5cf6", "#0ea5e9"];
  const R = 50, CX = 60, CY = 55;
  return (
    <Panel accent={T.nebula} bg={T.nebulaBg} bd="#ddd6fe"
      ariaLabel={hideAnswer ? `Spinner with ${total} sections` : `Spinner probability: ${fraction}`}>
      <Chip color={T.nebula} bg="white">{chipLabel}</Chip>
      <svg width={120} height={110} viewBox="0 0 120 110">
        {Array.from({ length: segments }, (_, i) => {
          const a1 = (i / segments) * 360 - 90;
          const a2 = ((i + 1) / segments) * 360 - 90;
          const toRad = d => (d * Math.PI) / 180;
          const large = (a2 - a1) > 180 ? 1 : 0;
          const x1 = CX + R * Math.cos(toRad(a1)), y1 = CY + R * Math.sin(toRad(a1));
          const x2 = CX + R * Math.cos(toRad(a2)), y2 = CY + R * Math.sin(toRad(a2));
          return (
            <path key={i} className="vis-slice"
              d={`M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`}
              fill={COLORS[i % COLORS.length]} opacity={i < favourable ? 1 : 0.3}
              stroke="white" strokeWidth={2} />
          );
        })}
        {/* Arrow pointer */}
        <polygon className="vis-ray" points={`${CX},${CY - R - 6} ${CX - 5},${CY - R + 2} ${CX + 5},${CY - R + 2}`}
          fill={T.text} />
        <circle cx={CX} cy={CY} r={6} fill="white" stroke={T.text} strokeWidth={2} />
        {!hideAnswer && (
          <text className="vis-label" x={CX} y={CY + 3} textAnchor="middle"
            fontSize={6} fontWeight="800" fill={T.text}>{favourable}</text>
        )}
      </svg>
      <span style={{ fontSize: 11, fontWeight: 800, color: T.nebula }}>{chanceLabel}</span>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 0d. SYMMETRY — shows shape with lines of symmetry
// ═══════════════════════════════════════════════════════════════════════════════
export function SymmetryVis({ shape = "square" }) {
  const W = 160, H = 140, CX = 80, CY = 70;
  const shapes = {
    square:        { pts: "40,40 120,40 120,100 40,100", lines: [[80,35,80,105],[35,70,125,70],[40,40,120,100],[120,40,40,100]], count: 4 },
    rectangle:     { pts: "30,45 130,45 130,95 30,95", lines: [[80,40,80,100],[25,70,135,70]], count: 2 },
    triangle:      { pts: "80,30 35,105 125,105", lines: [[80,30,80,105]], count: 1 },
    circle:        { cx: CX, cy: CY, r: 40, lines: [[80,25,80,115],[35,70,125,70],[50,35,110,105],[110,35,50,105]], count: "∞" },
    pentagon:      { pts: "80,30 125,55 110,105 50,105 35,55", lines: [[80,30,80,105]], count: 5 },
    hexagon:       { pts: "55,35 105,35 125,70 105,105 55,105 35,70", lines: [[80,30,80,110],[32,70,128,70],[55,35,105,105],[105,35,55,105]], count: 6 },
    kite:          { pts: "80,25 110,65 80,115 50,65", lines: [[80,25,80,115]], count: 1 },
    parallelogram: { pts: "50,40 130,40 110,100 30,100", lines: [], count: 0 },
  };
  const s = shapes[shape] || shapes.square;
  const lineCount = typeof s.count === "number" ? s.count : s.count;

  return (
    <Panel accent={T.rose} bg={T.roseBg} bd="#fecdd3"
      ariaLabel={`Symmetry of a ${shape}: ${lineCount} lines`}>
      <Chip color={T.rose} bg="white">{shape.charAt(0).toUpperCase() + shape.slice(1)}</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Shape */}
        {s.cx ? (
          <circle className="vis-segment" cx={s.cx} cy={s.cy} r={s.r}
            fill={`${T.rose}15`} stroke={T.rose} strokeWidth={2.5} />
        ) : (
          <polygon className="vis-segment" points={s.pts}
            fill={`${T.rose}15`} stroke={T.rose} strokeWidth={2.5} />
        )}
        {/* Lines of symmetry */}
        {(s.lines || []).map((l, i) => (
          <line key={i} className="vis-ray"
            x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]}
            stroke={T.indigo} strokeWidth={1.5} strokeDasharray="5,4"
            opacity={0.8} />
        ))}
      </svg>
      <span style={{
        fontSize: 12, fontWeight: 900, color: T.rose,
        fontFamily: "'Fira Code', monospace",
      }}>Lines of symmetry: {lineCount}</span>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. EQUATION SOLVER — step-by-step algebra solving visualisation
// ═══════════════════════════════════════════════════════════════════════════════
export function EquationSolverVis({ steps = [], variable = "x" }) {
  if (!steps.length) return null;

  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd="#c7d2fe"
      ariaLabel={`Equation solving steps for ${variable}`}>
      <Chip color={T.indigo} bg="white">Solve for {variable}</Chip>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={i} className="vis-segment" style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 8,
              background: isLast ? `${T.indigo}12` : "white",
              border: `1.5px solid ${isLast ? T.indigo : "#e2e8f0"}`,
            }}>
              <span className="vis-mark" style={{
                width: 22, height: 22, borderRadius: "50%",
                background: isLast ? T.indigo : "#e2e8f0",
                color: isLast ? "white" : T.textMid,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800, flexShrink: 0,
              }}>{isLast ? "✓" : i + 1}</span>
              <div style={{ flex: 1 }}>
                <span className="vis-label" style={{
                  fontSize: 14, fontWeight: isLast ? 900 : 700,
                  color: isLast ? T.indigo : T.text,
                  fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                }}>{step.equation || step}</span>
                {step.operation && (
                  <span style={{
                    fontSize: 9, color: T.textMid, fontWeight: 600,
                    marginLeft: 8, fontStyle: "italic",
                  }}>{step.operation}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. PROBABILITY TREE — branching diagram
// ═══════════════════════════════════════════════════════════════════════════════
export function ProbabilityTreeVis({ branches = [], title }) {
  if (!branches.length) return null;

  const W = 240, H = Math.max(120, branches.length * 50 + 20);
  const startX = 30, startY = H / 2;

  // Calculate branch endpoints
  const branchData = branches.map((b, i) => {
    const totalBranches = branches.length;
    const spacing = (H - 40) / Math.max(totalBranches - 1, 1);
    const endY = totalBranches === 1 ? H / 2 : 20 + i * spacing;
    const endX = 160;
    const midX = (startX + endX) / 2;

    return { ...b, endX, endY, midX };
  });

  return (
    <Panel accent={T.nebula} bg={T.nebulaBg} bd="#ddd6fe"
      ariaLabel={`Probability tree: ${title || "outcomes"}`}>
      {title && <Chip color={T.nebula} bg="white">{title}</Chip>}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Start node */}
        <circle className="vis-mark" cx={startX} cy={startY} r={8}
          fill={T.nebula} />
        <text x={startX} y={startY + 3.5} textAnchor="middle"
          fontSize={7} fontWeight="900" fill="white">START</text>

        {/* Branches */}
        {branchData.map((b, i) => (
          <g key={i} className="vis-arc">
            {/* Branch line */}
            <path
              d={`M ${startX + 8} ${startY} Q ${b.midX} ${startY} ${b.midX} ${b.endY} L ${b.endX} ${b.endY}`}
              fill="none" stroke={T.nebula} strokeWidth={1.5}
              strokeDasharray={b.dashed ? "4,3" : "none"}
            />
            {/* Probability label on branch */}
            <text className="vis-label" x={b.midX - 8} y={(startY + b.endY) / 2}
              fontSize={9} fontWeight="700" fill={T.nebula} textAnchor="end">
              {b.probability || ""}
            </text>
            {/* Outcome node */}
            <rect className="vis-bar" x={b.endX} y={b.endY - 12} width={70} height={24}
              rx={6} fill="white" stroke={T.nebula} strokeWidth={1.5} />
            <text className="vis-label" x={b.endX + 35} y={b.endY + 4}
              textAnchor="middle" fontSize={9} fontWeight="700" fill={T.text}>
              {b.label || `Outcome ${i + 1}`}
            </text>
          </g>
        ))}
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GRAPH PLOTTER — plot y = f(x) with labeled features
// ═══════════════════════════════════════════════════════════════════════════════
export function GraphPlotterVis({ equation, points = [], xRange = [-5, 5], yRange = [-5, 5], features = [] }) {
  const W = 220, H = 180, PAD = 30;
  const chartW = W - PAD * 2, chartH = H - PAD * 2;
  const xSpan = xRange[1] - xRange[0], ySpan = yRange[1] - yRange[0];
  const toSX = x => PAD + ((x - xRange[0]) / xSpan) * chartW;
  const toSY = y => PAD + chartH - ((y - yRange[0]) / ySpan) * chartH;
  const originSX = toSX(0), originSY = toSY(0);

  // Grid
  const gridLines = [];
  for (let x = Math.ceil(xRange[0]); x <= xRange[1]; x++) {
    gridLines.push(<line key={`vg${x}`} className="vis-grid" x1={toSX(x)} y1={PAD} x2={toSX(x)} y2={H - PAD} stroke="#e2e8f0" strokeWidth={0.5} />);
  }
  for (let y = Math.ceil(yRange[0]); y <= yRange[1]; y++) {
    gridLines.push(<line key={`hg${y}`} className="vis-grid" x1={PAD} y1={toSY(y)} x2={W - PAD} y2={toSY(y)} stroke="#e2e8f0" strokeWidth={0.5} />);
  }

  // Plot points as polyline
  let plotPath = "";
  if (points.length) {
    plotPath = points.map((p, i) => {
      const sx = toSX(p.x), sy = toSY(p.y);
      return `${i === 0 ? "M" : "L"} ${sx} ${sy}`;
    }).join(" ");
  }

  return (
    <Panel accent={T.indigo} bg="white" bd={T.slateBd}
      ariaLabel={`Graph: ${equation || "function"}`}>
      {equation && <Chip color={T.indigo} bg={T.indigoBg}>{equation}</Chip>}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {gridLines}
        {/* Axes */}
        <line className="vis-axis" x1={PAD} y1={originSY} x2={W - PAD} y2={originSY} stroke={T.text} strokeWidth={1.5} />
        <line className="vis-axis" x1={originSX} y1={H - PAD} x2={originSX} y2={PAD} stroke={T.text} strokeWidth={1.5} />
        <text x={W - PAD + 5} y={originSY + 4} fontSize={9} fill={T.textMid}>x</text>
        <text x={originSX + 5} y={PAD - 5} fontSize={9} fill={T.textMid}>y</text>
        {/* Axis ticks */}
        {Array.from({ length: xSpan + 1 }, (_, i) => xRange[0] + i).filter(v => v !== 0).map(v => (
          <text key={`xt${v}`} x={toSX(v)} y={originSY + 12} textAnchor="middle" fontSize={7} fill={T.textMid}>{v}</text>
        ))}
        {Array.from({ length: ySpan + 1 }, (_, i) => yRange[0] + i).filter(v => v !== 0).map(v => (
          <text key={`yt${v}`} x={originSX - 6} y={toSY(v) + 3} textAnchor="end" fontSize={7} fill={T.textMid}>{v}</text>
        ))}
        {/* Plot curve */}
        {plotPath && (
          <path className="vis-arc" d={plotPath} fill="none" stroke={T.indigo} strokeWidth={2.5} strokeLinecap="round" />
        )}
        {/* Feature points */}
        {features.map((f, i) => (
          <g key={i} className="vis-point">
            <circle cx={toSX(f.x)} cy={toSY(f.y)} r={4} fill={T.indigo} />
            <text className="vis-label" x={toSX(f.x) + 6} y={toSY(f.y) - 6}
              fontSize={8} fontWeight="700" fill={T.indigo}>{f.label}</text>
          </g>
        ))}
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. TIMELINE — horizontal animated timeline for history/processes
// ═══════════════════════════════════════════════════════════════════════════════
export function TimelineVis({ events = [], title }) {
  if (!events.length) return null;

  const W = 240, H = 90;
  const PAD = 20;
  const lineY = 36;
  const usableW = W - PAD * 2;

  return (
    <Panel accent={T.amber} bg={T.amberBg} bd="#fde68a"
      ariaLabel={`Timeline: ${title || events.length + " events"}`}>
      {title && <Chip color={T.amber} bg="white">{title}</Chip>}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Main timeline line */}
        <line className="vis-axis" x1={PAD} y1={lineY} x2={W - PAD} y2={lineY}
          stroke={T.amber} strokeWidth={2.5} strokeLinecap="round" />
        {/* Arrow */}
        <polygon points={`${W - PAD + 5},${lineY} ${W - PAD - 1},${lineY - 4} ${W - PAD - 1},${lineY + 4}`}
          fill={T.amber} />

        {/* Events */}
        {events.map((evt, i) => {
          const x = PAD + (i / Math.max(events.length - 1, 1)) * usableW;
          const above = i % 2 === 0;
          return (
            <g key={i} className="vis-mark">
              <circle cx={x} cy={lineY} r={5} fill={T.amber} stroke="white" strokeWidth={2} />
              <line x1={x} y1={lineY + (above ? -8 : 8)} x2={x} y2={lineY + (above ? -20 : 20)}
                stroke={T.amber} strokeWidth={1} strokeDasharray="2,2" />
              <text className="vis-label" x={x} y={above ? lineY - 24 : lineY + 28}
                textAnchor="middle" fontSize={7} fontWeight="700" fill={T.text}>
                {evt.date || evt.year || ""}
              </text>
              <text x={x} y={above ? lineY - 34 : lineY + 38}
                textAnchor="middle" fontSize={6} fill={T.textMid} fontWeight="600">
                {(evt.label || "").substring(0, 18)}
              </text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. PLACE VALUE — columns showing HTU (Hundreds, Tens, Units)
// ═══════════════════════════════════════════════════════════════════════════════
export function PlaceValueVis({ number, highlight }) {
  if (number == null) return null;
  const str = String(Math.abs(Math.round(number)));
  const places = ["Th", "H", "T", "U"];
  const padded = str.padStart(4, " ").split("");

  return (
    <Panel accent={T.emerald} bg={T.emeraldBg} bd="#a7f3d0"
      ariaLabel={`Place value chart for ${number}`}>
      <Chip color={T.emerald} bg="white">Place Value</Chip>
      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
        {padded.map((digit, i) => {
          const placeLabel = places[places.length - padded.length + i] || "";
          const isHighlighted = highlight === placeLabel?.toLowerCase();
          return (
            <div key={i} className="vis-segment" style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <span style={{
                fontSize: 8, fontWeight: 800, color: T.emerald,
                textTransform: "uppercase", letterSpacing: 0.5,
              }}>{placeLabel}</span>
              <div style={{
                width: 36, height: 42, borderRadius: 8,
                background: isHighlighted ? T.emerald : "white",
                border: `2px solid ${isHighlighted ? T.emerald : "#d1fae5"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{
                  fontSize: 22, fontWeight: 900,
                  color: digit.trim() ? (isHighlighted ? "white" : T.text) : "#cbd5e1",
                }}>{digit.trim() || "0"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CLOCK FACE — analogue clock for time questions
// ═══════════════════════════════════════════════════════════════════════════════
export function ClockFaceVis({ hours, minutes, label }) {
  const W = 140, H = 140, cx = 70, cy = 70, r = 55;

  // Angles (12 o'clock = -90°)
  const minAngle = ((minutes || 0) / 60) * 360 - 90;
  const hrAngle = (((hours || 0) % 12) / 12) * 360 + ((minutes || 0) / 60) * 30 - 90;
  const toRad = deg => (deg * Math.PI) / 180;

  const hourHand = {
    x: cx + Math.cos(toRad(hrAngle)) * (r * 0.55),
    y: cy + Math.sin(toRad(hrAngle)) * (r * 0.55),
  };
  const minHand = {
    x: cx + Math.cos(toRad(minAngle)) * (r * 0.78),
    y: cy + Math.sin(toRad(minAngle)) * (r * 0.78),
  };

  return (
    <Panel accent={T.indigo} bg="white" bd={T.slateBd}
      ariaLabel={`Clock showing ${hours}:${String(minutes || 0).padStart(2, "0")}`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Clock face */}
        <circle className="vis-mark" cx={cx} cy={cy} r={r} fill="white"
          stroke={T.indigo} strokeWidth={3} />
        {/* Hour markers */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * 360 - 90;
          const inner = r - 8, outer = r - 2;
          return (
            <line key={i} className="vis-tick"
              x1={cx + Math.cos(toRad(angle)) * inner}
              y1={cy + Math.sin(toRad(angle)) * inner}
              x2={cx + Math.cos(toRad(angle)) * outer}
              y2={cy + Math.sin(toRad(angle)) * outer}
              stroke={T.text} strokeWidth={i % 3 === 0 ? 2.5 : 1} strokeLinecap="round"
            />
          );
        })}
        {/* Numbers */}
        {[12, 3, 6, 9].map(n => {
          const angle = ((n % 12) / 12) * 360 - 90;
          const d = r - 16;
          return (
            <text key={n} className="vis-label"
              x={cx + Math.cos(toRad(angle)) * d}
              y={cy + Math.sin(toRad(angle)) * d + 3.5}
              textAnchor="middle" fontSize={11} fontWeight="800" fill={T.text}>
              {n}
            </text>
          );
        })}
        {/* Hour hand */}
        <line className="vis-ray" x1={cx} y1={cy} x2={hourHand.x} y2={hourHand.y}
          stroke={T.text} strokeWidth={3.5} strokeLinecap="round" />
        {/* Minute hand */}
        <line className="vis-ray" x1={cx} y1={cy} x2={minHand.x} y2={minHand.y}
          stroke={T.indigo} strokeWidth={2} strokeLinecap="round" />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3.5} fill={T.indigo} />
      </svg>
      {label && <Chip color={T.indigo} bg={T.indigoBg}>{label}</Chip>}
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. TALLY CHART — classic tally marks for data handling
// ═══════════════════════════════════════════════════════════════════════════════
export function TallyChartVis({ items = [], title }) {
  if (!items.length) return null;

  const renderTally = (count) => {
    const groups = Math.floor(count / 5);
    const remainder = count % 5;
    const parts = [];
    for (let g = 0; g < groups; g++) {
      parts.push(
        <span key={`g${g}`} style={{ position: "relative", display: "inline-block", width: 22, height: 20, marginRight: 6 }}>
          {[0, 1, 2, 3].map(s => (
            <span key={s} style={{
              position: "absolute", left: s * 5, top: 2,
              width: 2, height: 16, background: T.indigo, borderRadius: 1,
            }} />
          ))}
          <span style={{
            position: "absolute", left: -1, top: 7,
            width: 24, height: 2, background: T.rose, borderRadius: 1,
            transform: "rotate(-15deg)",
          }} />
        </span>
      );
    }
    for (let s = 0; s < remainder; s++) {
      parts.push(
        <span key={`r${s}`} style={{
          display: "inline-block", width: 2, height: 16,
          background: T.indigo, borderRadius: 1, marginRight: 3, verticalAlign: "middle",
        }} />
      );
    }
    return <span style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap" }}>{parts}</span>;
  };

  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd="#c7d2fe"
      ariaLabel={`Tally chart: ${title || items.length + " items"}`}>
      {title && <Chip color={T.indigo} bg="white">{title}</Chip>}
      <div style={{ width: "100%" }}>
        {items.map((item, i) => (
          <div key={i} className="vis-segment" style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "4px 0",
            borderBottom: i < items.length - 1 ? `1px solid #ddd6fe` : "none",
          }}>
            <span className="vis-label" style={{
              fontSize: 10, fontWeight: 700, color: T.text, width: 60, flexShrink: 0,
            }}>{item.label}</span>
            <div style={{ flex: 1 }}>{renderTally(item.count || item.value || 0)}</div>
            <span style={{ fontSize: 10, fontWeight: 800, color: T.indigo }}>
              {item.count || item.value || 0}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
