"use client";
// ─── Deploy to: src/components/game/GeographyHistoryVisuals.jsx ─────────────
// Geography + History visual components for MathsVisualiser.
// Import in MathsVisualiser:
//   import { CompassVis, MapGridVis, ClimateGraphVis, LayerDiagramVis,
//            WaterCycleVis, TimelineVis, SourceAnalysisVis, MapRegionVis }
//     from "./GeographyHistoryVisuals";
import React from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  indigo: "#4f46e5", indigoBg: "#eef2ff", indigoBd: "#c7d2fe",
  nebula: "#9333ea", nebulaBg: "#f5f3ff", nebulaBd: "#ddd6fe",
  amber:  "#d97706", amberBg:  "#fffbeb", amberBd:  "#fde68a",
  emerald:"#059669", emeraldBg:"#ecfdf5", emeraldBd:"#a7f3d0",
  rose:   "#e11d48", roseBg:   "#fff1f2", roseBd:   "#fecdd3",
  cyan:   "#0891b2", cyanBg:   "#ecfeff", cyanBd:   "#a5f3fc",
  brown:  "#92400e", brownBg:  "#fef3c7", brownBd:  "#fde68a",
  slate:  "#475569", slateBg:  "#f8fafc", slateBd:  "#e2e8f0",
  text:   "#1e293b", textMid:  "#64748b",
};

function Panel({ children, accent = T.indigo, bg, bd, ariaLabel }) {
  return (
    <div role={ariaLabel ? "img" : undefined} aria-label={ariaLabel}
      style={{
        background: bg || "#ffffff", borderRadius: 16,
        border: `2px solid ${bd || accent + "44"}`,
        boxShadow: `0 2px 12px ${accent}18`,
        padding: "16px 14px", display: "flex",
        flexDirection: "column", alignItems: "center", gap: 12,
      }}>
      {children}
    </div>
  );
}

function Chip({ children, color, bg }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, background: bg,
      borderRadius: 6, padding: "2px 7px", letterSpacing: 0.5 }}>
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. COMPASS ROSE
// ═══════════════════════════════════════════════════════════════════════════════
export function CompassVis({ bearing = 0, label = "" }) {
  const W = 160, cx = 80, cy = 80, r = 60;
  const directions = [
    { label: "N", angle: 0 },   { label: "NE", angle: 45 },
    { label: "E", angle: 90 },  { label: "SE", angle: 135 },
    { label: "S", angle: 180 }, { label: "SW", angle: 225 },
    { label: "W", angle: 270 }, { label: "NW", angle: 315 },
  ];
  const toRad = d => (d - 90) * Math.PI / 180;
  const bearingRad = toRad(bearing);

  return (
    <Panel accent={T.emerald} bg={T.emeraldBg} bd={T.emeraldBd}
      ariaLabel={`Compass showing ${label || bearing + "°"}`}>
      <Chip color={T.emerald} bg="white">Compass</Chip>
      <svg width={W} height={W} viewBox={`0 0 ${W} ${W}`}>
        {/* Outer circle */}
        <circle cx={cx} cy={cy} r={r} fill="white" stroke={T.emerald} strokeWidth={2} />
        <circle cx={cx} cy={cy} r={r - 8} fill="none" stroke={T.emeraldBd} strokeWidth={1} />
        {/* Direction labels */}
        {directions.map((d, i) => {
          const isCardinal = i % 2 === 0;
          const lr = isCardinal ? r - 18 : r - 16;
          const x = cx + lr * Math.cos(toRad(d.angle));
          const y = cy + lr * Math.sin(toRad(d.angle));
          return (
            <text key={d.label} x={x} y={y + 1} textAnchor="middle" dominantBaseline="central"
              fontSize={isCardinal ? 11 : 8} fontWeight={isCardinal ? "900" : "600"}
              fill={d.label === "N" ? T.rose : T.slate}>
              {d.label}
            </text>
          );
        })}
        {/* Tick marks */}
        {Array.from({ length: 36 }, (_, i) => {
          const a = toRad(i * 10);
          const isMajor = i % 9 === 0;
          const inner = isMajor ? r - 5 : r - 3;
          return (
            <line key={i}
              x1={cx + inner * Math.cos(a)} y1={cy + inner * Math.sin(a)}
              x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)}
              stroke={isMajor ? T.slate : T.slateBd} strokeWidth={isMajor ? 1.5 : 0.8} />
          );
        })}
        {/* Bearing arrow */}
        {bearing > 0 && (
          <>
            <line x1={cx} y1={cy}
              x2={cx + (r - 24) * Math.cos(bearingRad)}
              y2={cy + (r - 24) * Math.sin(bearingRad)}
              stroke={T.indigo} strokeWidth={3} strokeLinecap="round" />
            <circle
              cx={cx + (r - 24) * Math.cos(bearingRad)}
              cy={cy + (r - 24) * Math.sin(bearingRad)}
              r={4} fill={T.indigo} />
          </>
        )}
        {/* Centre dot */}
        <circle cx={cx} cy={cy} r={3} fill={T.emerald} />
      </svg>
      {label && <Chip color={T.indigo} bg={T.indigoBg}>{label}</Chip>}
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. MAP GRID
// ═══════════════════════════════════════════════════════════════════════════════
export function MapGridVis({ gridRef = "", rows = 5, cols = 5, features = [] }) {
  const cellSize = 34, pad = 20;
  const W = cols * cellSize + pad * 2 + 14;
  const H = rows * cellSize + pad * 2 + 14;
  const letters = "ABCDEFGHIJ".split("");
  const targetCol = gridRef ? letters.indexOf(gridRef[0]?.toUpperCase()) : -1;
  const targetRow = gridRef ? parseInt(gridRef[1]) - 1 : -1;

  const FEATURE_ICONS = {
    church: "⛪", school: "🏫", farm: "🌾", lake: "💧", forest: "🌲",
    town: "🏘️", bridge: "🌉", hill: "⛰️", river: "〰️", road: "═",
  };

  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd}
      ariaLabel={`Map grid${gridRef ? ` — find ${gridRef}` : ""}`}>
      <Chip color={T.indigo} bg="white">Grid Reference</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Grid cells */}
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const x = pad + c * cellSize;
            const y = pad + (rows - 1 - r) * cellSize;
            const isTarget = c === targetCol && r === targetRow;
            return (
              <rect key={`${r}-${c}`} x={x} y={y} width={cellSize} height={cellSize}
                fill={isTarget ? T.indigoBg : "white"}
                stroke={isTarget ? T.indigo : T.slateBd}
                strokeWidth={isTarget ? 2.5 : 1}
                strokeDasharray={isTarget ? "4,2" : "none"} />
            );
          })
        )}
        {/* Column labels (letters) */}
        {Array.from({ length: cols }, (_, c) => (
          <text key={`col-${c}`} x={pad + c * cellSize + cellSize / 2} y={pad + rows * cellSize + 12}
            textAnchor="middle" fontSize={9} fontWeight="800" fill={T.indigo}>
            {letters[c]}
          </text>
        ))}
        {/* Row labels (numbers) */}
        {Array.from({ length: rows }, (_, r) => (
          <text key={`row-${r}`} x={pad - 8} y={pad + (rows - 1 - r) * cellSize + cellSize / 2 + 3}
            textAnchor="middle" fontSize={9} fontWeight="800" fill={T.indigo}>
            {r + 1}
          </text>
        ))}
        {/* Features */}
        {features.map((f, i) => {
          const x = pad + (f.col || 0) * cellSize + cellSize / 2;
          const y = pad + (rows - 1 - (f.row || 0)) * cellSize + cellSize / 2;
          return (
            <text key={i} x={x} y={y + 4} textAnchor="middle" fontSize={14}>
              {FEATURE_ICONS[f.name?.toLowerCase()] || "📍"}
            </text>
          );
        })}
      </svg>
      {gridRef && <Chip color={T.indigo} bg="white">Find: {gridRef}</Chip>}
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CLIMATE GRAPH
// ═══════════════════════════════════════════════════════════════════════════════
export function ClimateGraphVis({ location = "", temps = [], rainfall = [] }) {
  const MONTHS = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  const W = 220, H = 140, PL = 28, PR = 28, PT = 14, PB = 28;
  const chartW = W - PL - PR, chartH = H - PT - PB;
  const maxRain = Math.max(...rainfall, 80);
  const maxTemp = Math.max(...temps, 30);
  const minTemp = Math.min(...temps, 0);
  const tempRange = maxTemp - minTemp || 1;
  const barW = Math.floor(chartW / 12) - 2;

  const rainY = (v) => PT + chartH - (v / maxRain) * chartH;
  const tempY = (v) => PT + chartH - ((v - minTemp) / tempRange) * chartH;

  // Temperature line points
  const tempPoints = temps.slice(0, 12).map((t, i) => {
    const x = PL + i * (chartW / 12) + (chartW / 24);
    return `${x},${tempY(t)}`;
  }).join(" ");

  return (
    <Panel accent={T.cyan} bg={T.cyanBg} bd={T.cyanBd}
      ariaLabel={`Climate graph${location ? ` for ${location}` : ""}`}>
      <Chip color={T.cyan} bg="white">{location || "Climate Graph"}</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Axes */}
        <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke={T.slate} strokeWidth={1} />
        <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke={T.slate} strokeWidth={1} />
        {/* Rainfall bars */}
        {rainfall.slice(0, 12).map((r, i) => {
          const x = PL + i * (chartW / 12) + 1;
          const h = (r / maxRain) * chartH;
          return (
            <rect key={i} x={x} y={PT + chartH - h} width={barW} height={h}
              fill={T.cyanBg} stroke={T.cyan} strokeWidth={1} rx={2} />
          );
        })}
        {/* Temperature line */}
        {temps.length >= 2 && (
          <polyline points={tempPoints} fill="none" stroke={T.rose} strokeWidth={2} strokeLinecap="round" />
        )}
        {/* Temp dots */}
        {temps.slice(0, 12).map((t, i) => {
          const x = PL + i * (chartW / 12) + (chartW / 24);
          return <circle key={i} cx={x} cy={tempY(t)} r={2.5} fill={T.rose} />;
        })}
        {/* Month labels */}
        {MONTHS.map((m, i) => (
          <text key={i} x={PL + i * (chartW / 12) + (chartW / 24)} y={H - PB + 11}
            textAnchor="middle" fontSize={7} fill={T.textMid} fontWeight="600">{m}</text>
        ))}
        {/* Y labels */}
        <text x={6} y={H / 2} textAnchor="middle" fontSize={6} fill={T.cyan} fontWeight="700"
          transform={`rotate(-90, 6, ${H / 2})`}>Rain (mm)</text>
        <text x={W - 6} y={H / 2} textAnchor="middle" fontSize={6} fill={T.rose} fontWeight="700"
          transform={`rotate(90, ${W - 6}, ${H / 2})`}>Temp (°C)</text>
      </svg>
      {/* Legend */}
      <div style={{ display: "flex", gap: 12, fontSize: 9, fontWeight: 700 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ width: 10, height: 10, background: T.cyanBg, border: `1px solid ${T.cyan}`, borderRadius: 2, display: "inline-block" }} />
          <span style={{ color: T.cyan }}>Rainfall</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ width: 10, height: 2, background: T.rose, display: "inline-block", borderRadius: 1 }} />
          <span style={{ color: T.rose }}>Temperature</span>
        </span>
      </div>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. LAYER DIAGRAM (Earth / Rock Cycle / Soil)
// ═══════════════════════════════════════════════════════════════════════════════
export function LayerDiagramVis({ context = "earth", highlighted = "" }) {
  const W = 200, H = 160;

  if (context === "rock_cycle") {
    // Triangular cycle: igneous → sedimentary → metamorphic
    const rocks = [
      { label: "Igneous", x: 100, y: 20, color: T.rose },
      { label: "Sedimentary", x: 30, y: 130, color: T.amber },
      { label: "Metamorphic", x: 170, y: 130, color: T.nebula },
    ];
    const processes = [
      { from: 0, to: 1, label: "Weathering\n& erosion" },
      { from: 1, to: 2, label: "Heat &\npressure" },
      { from: 2, to: 0, label: "Melting &\ncooling" },
    ];
    return (
      <Panel accent={T.amber} bg={T.amberBg} bd={T.amberBd} ariaLabel="Rock cycle diagram">
        <Chip color={T.amber} bg="white">Rock Cycle</Chip>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Arrows */}
          {processes.map((p, i) => {
            const f = rocks[p.from], t = rocks[p.to];
            const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2;
            return (
              <g key={i}>
                <line x1={f.x} y1={f.y + 12} x2={t.x} y2={t.y - 12}
                  stroke={T.slateBd} strokeWidth={1.5} markerEnd="url(#arrowhead)" />
                {p.label.split("\n").map((line, j) => (
                  <text key={j} x={mx + (i === 0 ? -18 : i === 2 ? 18 : 0)} y={my - 4 + j * 10}
                    textAnchor="middle" fontSize={6} fill={T.textMid} fontWeight="600">{line}</text>
                ))}
              </g>
            );
          })}
          <defs><marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill={T.slateBd} /></marker></defs>
          {/* Rock nodes */}
          {rocks.map((r, i) => {
            const isHi = highlighted && r.label.toLowerCase().includes(highlighted.toLowerCase());
            return (
              <g key={i}>
                <circle cx={r.x} cy={r.y} r={18} fill={isHi ? r.color + "33" : "white"}
                  stroke={r.color} strokeWidth={isHi ? 2.5 : 1.5} />
                <text x={r.x} y={r.y + 3} textAnchor="middle" fontSize={7} fontWeight="800"
                  fill={r.color}>{r.label}</text>
              </g>
            );
          })}
        </svg>
      </Panel>
    );
  }

  if (context === "soil") {
    const layers = [
      { label: "Topsoil", depth: "0–25 cm", color: "#78350f", height: 30 },
      { label: "Subsoil", depth: "25–60 cm", color: "#92400e", height: 35 },
      { label: "Weathered rock", depth: "60–150 cm", color: "#a8a29e", height: 30 },
      { label: "Bedrock", depth: "150+ cm", color: "#78716c", height: 25 },
    ];
    let y = 20;
    return (
      <Panel accent={T.brown} bg={T.brownBg} bd={T.brownBd} ariaLabel="Soil layers diagram">
        <Chip color={T.brown} bg="white">Soil Layers</Chip>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {layers.map((l, i) => {
            const ly = y; y += l.height + 2;
            const isHi = highlighted && l.label.toLowerCase().includes(highlighted.toLowerCase());
            return (
              <g key={i}>
                <rect x={30} y={ly} width={120} height={l.height} rx={4}
                  fill={l.color} stroke={isHi ? "white" : "none"} strokeWidth={2} opacity={isHi ? 1 : 0.8} />
                <text x={90} y={ly + l.height / 2 + 3} textAnchor="middle"
                  fontSize={8} fontWeight="800" fill="white">{l.label}</text>
                <text x={162} y={ly + l.height / 2 + 3} fontSize={6.5} fill={T.textMid} fontWeight="600">{l.depth}</text>
              </g>
            );
          })}
        </svg>
      </Panel>
    );
  }

  // Default: Earth layers (concentric arcs)
  const layers = [
    { label: "Crust", r: 68, color: "#92400e", depth: "0–70 km" },
    { label: "Mantle", r: 54, color: "#dc2626", depth: "70–2,900 km" },
    { label: "Outer core", r: 38, color: "#f97316", depth: "2,900–5,100 km" },
    { label: "Inner core", r: 20, color: "#fbbf24", depth: "5,100–6,371 km" },
  ];
  return (
    <Panel accent={T.amber} bg={T.amberBg} bd={T.amberBd} ariaLabel="Earth layers diagram">
      <Chip color={T.amber} bg="white">Earth&apos;s Layers</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {layers.map((l, i) => {
          const isHi = highlighted && l.label.toLowerCase().includes(highlighted.toLowerCase());
          return (
            <g key={i}>
              <circle cx={100} cy={80} r={l.r}
                fill={l.color} stroke={isHi ? "white" : l.color} strokeWidth={isHi ? 3 : 0}
                opacity={isHi ? 1 : 0.85} />
            </g>
          );
        })}
        {/* Labels on right side */}
        {layers.map((l, i) => (
          <g key={`label-${i}`}>
            <line x1={100 + l.r - 5} y1={80 - l.r * 0.3 + i * 4} x2={170} y2={25 + i * 30}
              stroke={T.slateBd} strokeWidth={0.8} />
            <text x={172} y={23 + i * 30} fontSize={7} fontWeight="800" fill={l.color}>{l.label}</text>
            <text x={172} y={33 + i * 30} fontSize={6} fill={T.textMid}>{l.depth}</text>
          </g>
        ))}
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. WATER CYCLE
// ═══════════════════════════════════════════════════════════════════════════════
export function WaterCycleVis({ highlighted = [] }) {
  const W = 220, H = 160;
  const hiSet = new Set((highlighted || []).map(s => s.toLowerCase()));

  const stages = [
    { label: "Evaporation", x: 40, y: 90, ex: 65, ey: 45, color: T.cyan },
    { label: "Condensation", x: 100, y: 22, ex: 100, ey: 22, color: T.indigo },
    { label: "Precipitation", x: 155, y: 45, ex: 155, ey: 90, color: T.nebula },
    { label: "Collection", x: 170, y: 130, ex: 40, ey: 130, color: T.emerald },
  ];

  return (
    <Panel accent={T.cyan} bg={T.cyanBg} bd={T.cyanBd} ariaLabel="Water cycle diagram">
      <Chip color={T.cyan} bg="white">The Water Cycle</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Landscape */}
        <rect x={0} y={120} width={W} height={40} rx={0} fill="#bfdbfe" /> {/* Sea */}
        <polygon points="130,120 170,60 210,120" fill="#d1d5db" stroke="#9ca3af" strokeWidth={1} /> {/* Mountain */}
        <rect x={0} y={115} width={80} height={5} rx={2} fill="#86efac" /> {/* Grass */}
        {/* Cloud */}
        <ellipse cx={105} cy={28} rx={30} ry={14} fill="white" stroke={T.slateBd} strokeWidth={1} />
        <ellipse cx={90} cy={32} rx={18} ry={10} fill="white" />
        <ellipse cx={120} cy={32} rx={18} ry={10} fill="white" />
        {/* Sun */}
        <circle cx={30} cy={25} r={14} fill="#fbbf24" stroke="#f59e0b" strokeWidth={1.5} />
        {/* Rain drops */}
        <text x={145} y={72} fontSize={10} fill={T.nebula}>💧</text>
        <text x={155} y={82} fontSize={8} fill={T.nebula}>💧</text>
        {/* Stage arrows and labels */}
        {stages.map((s, i) => {
          const isHi = hiSet.has(s.label.toLowerCase());
          return (
            <g key={i}>
              {/* Arrow */}
              <line x1={s.x} y1={s.y} x2={s.ex} y2={s.ey}
                stroke={isHi ? s.color : T.slateBd} strokeWidth={isHi ? 2.5 : 1.5}
                strokeDasharray={isHi ? "none" : "3,2"} markerEnd="url(#wc-arrow)" />
              {/* Label */}
              <text x={s.x + (i < 2 ? -2 : 2)} y={s.y + (i < 2 ? -6 : 10)}
                textAnchor={i < 2 ? "end" : "start"}
                fontSize={7} fontWeight={isHi ? "900" : "600"}
                fill={isHi ? s.color : T.textMid}>
                {s.label}
              </text>
            </g>
          );
        })}
        <defs><marker id="wc-arrow" markerWidth="5" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 5 2, 0 4" fill={T.slate} /></marker></defs>
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. TIMELINE
// ═══════════════════════════════════════════════════════════════════════════════
export function TimelineVis({ events = [], highlighted = null }) {
  if (events.length === 0) return null;
  const sorted = [...events].sort((a, b) => a.year - b.year);
  const minYear = sorted[0].year;
  const maxYear = sorted[sorted.length - 1].year;
  const range = maxYear - minYear || 1;
  const W = 220, H = 100, PL = 16, PR = 16;
  const lineW = W - PL - PR;
  const toX = (year) => PL + ((year - minYear) / range) * lineW;

  return (
    <Panel accent={T.brown} bg={T.brownBg} bd={T.brownBd} ariaLabel="Historical timeline">
      <Chip color={T.brown} bg="white">Timeline</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Main line */}
        <line x1={PL} y1={50} x2={W - PR} y2={50} stroke={T.brown} strokeWidth={2.5} strokeLinecap="round" />
        {/* Arrow */}
        <polygon points={`${W - PR + 4},50 ${W - PR - 2},47 ${W - PR - 2},53`} fill={T.brown} />
        {/* Events */}
        {sorted.map((e, i) => {
          const x = toX(e.year);
          const isHi = highlighted === e.year || highlighted === e.label;
          const above = i % 2 === 0;
          return (
            <g key={i}>
              {/* Dot */}
              <circle cx={x} cy={50} r={isHi ? 5 : 3.5}
                fill={isHi ? T.indigo : T.brown} stroke="white" strokeWidth={1.5} />
              {/* Connector line */}
              <line x1={x} y1={above ? 50 - 6 : 56} x2={x} y2={above ? 18 : 82}
                stroke={isHi ? T.indigo : T.slateBd} strokeWidth={1} />
              {/* Year */}
              <text x={x} y={above ? 14 : 92}
                textAnchor="middle" fontSize={8} fontWeight="900"
                fill={isHi ? T.indigo : T.brown}>
                {e.year}
              </text>
              {/* Label */}
              <text x={x} y={above ? 25 : 78}
                textAnchor="middle" fontSize={6.5} fontWeight="600"
                fill={isHi ? T.indigo : T.textMid}>
                {e.label?.length > 18 ? e.label.substring(0, 17) + "…" : e.label}
              </text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. SOURCE ANALYSIS (History)
// ═══════════════════════════════════════════════════════════════════════════════
export function SourceAnalysisVis({ sourceType = "primary", origin = "", date = "", author = "", reliability = null }) {
  return (
    <Panel accent={T.brown} bg={T.brownBg} bd={T.brownBd} ariaLabel={`Historical source: ${sourceType}`}>
      <div style={{ width: "100%", maxWidth: 200 }}>
        {/* Document card */}
        <div style={{
          background: "#fefce8", border: `2px solid ${T.amberBd}`, borderRadius: 12,
          padding: "12px 14px", position: "relative",
          boxShadow: "2px 2px 8px rgba(0,0,0,0.08)",
        }}>
          {/* Curled corner effect */}
          <div style={{
            position: "absolute", top: 0, right: 0, width: 16, height: 16,
            background: "linear-gradient(135deg, transparent 50%, #fde68a 50%)",
            borderBottomLeftRadius: 4,
          }} />
          {/* Source type badge */}
          <div style={{
            display: "inline-block", fontSize: 8, fontWeight: 800, textTransform: "uppercase",
            letterSpacing: 1, color: "white", borderRadius: 4, padding: "2px 6px", marginBottom: 8,
            background: sourceType === "primary" ? T.emerald : T.nebula,
          }}>
            {sourceType} source
          </div>
          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {origin && (
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: T.textMid, width: 40 }}>Type:</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: T.text }}>{origin}</span>
              </div>
            )}
            {date && (
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: T.textMid, width: 40 }}>Date:</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: T.text }}>{date}</span>
              </div>
            )}
            {author && (
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: T.textMid, width: 40 }}>Author:</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: T.text }}>{author}</span>
              </div>
            )}
          </div>
          {/* Reliability indicator */}
          {reliability && (
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: T.textMid }}>Reliability:</span>
              <div style={{ display: "flex", gap: 2 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: 2,
                    background: i <= (reliability || 0) ? T.amber : T.slateBd,
                  }} />
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Question prompt */}
        <div style={{
          marginTop: 8, textAlign: "center", fontSize: 9, fontWeight: 700,
          color: T.brown, fontStyle: "italic",
        }}>
          How useful is this source?
        </div>
      </div>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. MAP REGION (simplified outlines)
// ═══════════════════════════════════════════════════════════════════════════════
export function MapRegionVis({ region = "world", highlighted = "" }) {
  // Simplified SVG outlines — recognisable silhouettes, not detailed maps
  // Uses positioned labelled ovals as a practical approximation
  const W = 210, H = 140;

  const REGIONS = {
    uk: {
      label: "United Kingdom",
      parts: [
        { name: "England", cx: 115, cy: 85, rx: 22, ry: 35, color: "#dc2626" },
        { name: "Scotland", cx: 105, cy: 35, rx: 18, ry: 22, color: "#2563eb" },
        { name: "Wales", cx: 88, cy: 82, rx: 10, ry: 18, color: "#059669" },
        { name: "N. Ireland", cx: 60, cy: 50, rx: 14, ry: 12, color: "#f59e0b" },
      ],
    },
    europe: {
      label: "Europe",
      parts: [
        { name: "UK", cx: 55, cy: 40, rx: 10, ry: 14, color: "#dc2626" },
        { name: "France", cx: 70, cy: 70, rx: 16, ry: 16, color: "#2563eb" },
        { name: "Germany", cx: 100, cy: 50, rx: 14, ry: 16, color: "#1e293b" },
        { name: "Spain", cx: 55, cy: 95, rx: 18, ry: 12, color: "#f59e0b" },
        { name: "Italy", cx: 105, cy: 85, rx: 8, ry: 20, color: "#059669" },
        { name: "Poland", cx: 125, cy: 45, rx: 12, ry: 12, color: "#e11d48" },
        { name: "Russia", cx: 175, cy: 35, rx: 28, ry: 28, color: "#7c3aed" },
      ],
    },
    africa: {
      label: "Africa",
      parts: [
        { name: "Egypt", cx: 130, cy: 25, rx: 16, ry: 12, color: "#f59e0b" },
        { name: "Nigeria", cx: 85, cy: 65, rx: 14, ry: 12, color: "#059669" },
        { name: "Kenya", cx: 145, cy: 70, rx: 10, ry: 14, color: "#dc2626" },
        { name: "South Africa", cx: 115, cy: 120, rx: 16, ry: 12, color: "#2563eb" },
        { name: "Congo", cx: 110, cy: 75, rx: 14, ry: 14, color: "#7c3aed" },
      ],
    },
    world: {
      label: "World Continents",
      parts: [
        { name: "N. America", cx: 45, cy: 45, rx: 24, ry: 28, color: "#dc2626" },
        { name: "S. America", cx: 55, cy: 100, rx: 16, ry: 24, color: "#f59e0b" },
        { name: "Europe", cx: 110, cy: 35, rx: 14, ry: 12, color: "#2563eb" },
        { name: "Africa", cx: 115, cy: 75, rx: 16, ry: 24, color: "#059669" },
        { name: "Asia", cx: 155, cy: 40, rx: 28, ry: 24, color: "#7c3aed" },
        { name: "Oceania", cx: 175, cy: 105, rx: 18, ry: 12, color: "#0891b2" },
      ],
    },
  };

  const data = REGIONS[region.toLowerCase()] || REGIONS.world;
  const hiLower = highlighted.toLowerCase();

  return (
    <Panel accent={T.emerald} bg={T.emeraldBg} bd={T.emeraldBd}
      ariaLabel={`Map: ${data.label}${highlighted ? ` — ${highlighted} highlighted` : ""}`}>
      <Chip color={T.emerald} bg="white">{data.label}</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Ocean background */}
        <rect x={0} y={0} width={W} height={H} rx={8} fill="#dbeafe" opacity={0.4} />
        {/* Regions */}
        {data.parts.map((p, i) => {
          const isHi = hiLower && p.name.toLowerCase().includes(hiLower);
          return (
            <g key={i}>
              <ellipse cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry}
                fill={isHi ? p.color : p.color + "44"}
                stroke={isHi ? p.color : p.color + "88"}
                strokeWidth={isHi ? 2.5 : 1} />
              <text x={p.cx} y={p.cy + 3} textAnchor="middle"
                fontSize={isHi ? 7 : 6} fontWeight={isHi ? "900" : "600"}
                fill={isHi ? "white" : p.color}>
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>
      {highlighted && <Chip color={T.indigo} bg={T.indigoBg}>{highlighted}</Chip>}
    </Panel>
  );
}