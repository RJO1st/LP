"use client";
// ─── Deploy to: src/components/game/ScienceVisuals_Ext.jsx ──────────────────
// Extended science visuals. Import in MathsVisualiser:
//   import { HumanBodyVis, SolarSystemVis, ClassificationKeyVis, LightDiagramVis,
//            ElectricalSymbolsVis, MagnetVis, PhotosynthesisVis, RespirationVis }
//     from "./ScienceVisuals_Ext";
import React from "react";

const T = {
  indigo: "#4f46e5", indigoBg: "#eef2ff", indigoBd: "#c7d2fe",
  nebula: "#9333ea", nebulaBg: "#f5f3ff", nebulaBd: "#ddd6fe",
  amber:  "#d97706", amberBg:  "#fffbeb", amberBd:  "#fde68a",
  emerald:"#059669", emeraldBg:"#ecfdf5", emeraldBd:"#a7f3d0",
  rose:   "#e11d48", roseBg:   "#fff1f2", roseBd:   "#fecdd3",
  cyan:   "#0891b2", cyanBg:   "#ecfeff", cyanBd:   "#a5f3fc",
  slate:  "#475569", slateBg:  "#f8fafc", slateBd:  "#e2e8f0",
  text:   "#1e293b", textMid:  "#64748b",
};

function Panel({ children, accent = T.indigo, bg, bd, ariaLabel }) {
  return (
    <div role={ariaLabel ? "img" : undefined} aria-label={ariaLabel}
      style={{ background: bg || "#ffffff", borderRadius: 16,
        border: `2px solid ${bd || accent + "44"}`,
        boxShadow: `0 2px 12px ${accent}18`,
        padding: "16px 14px", display: "flex",
        flexDirection: "column", alignItems: "center", gap: 12 }}>
      {children}
    </div>
  );
}

function Chip({ children, color, bg }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, background: bg,
      borderRadius: 6, padding: "2px 7px", letterSpacing: 0.5 }}>{children}</span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. HUMAN BODY SYSTEMS
// ═══════════════════════════════════════════════════════════════════════════════
export function HumanBodyVis({ system = "skeleton", highlighted = "" }) {
  const W = 180, H = 200;
  const cx = 90, headY = 30, bodyTop = 50, bodyBot = 140;
  const hiLower = (highlighted || "").toLowerCase();

  const SYSTEMS = {
    skeleton: {
      label: "Skeleton", color: T.slate,
      parts: [
        { name: "Skull", x: cx, y: headY, w: 22, h: 24 },
        { name: "Spine", x: cx, y: 95, w: 4, h: 60 },
        { name: "Ribs", x: cx, y: 78, w: 30, h: 20 },
        { name: "Pelvis", x: cx, y: 118, w: 28, h: 10 },
        { name: "Femur", x: cx - 12, y: 140, w: 4, h: 30 },
        { name: "Femur", x: cx + 12, y: 140, w: 4, h: 30 },
      ],
    },
    digestive: {
      label: "Digestive System", color: T.amber,
      parts: [
        { name: "Mouth", x: cx, y: headY + 10, w: 10, h: 6 },
        { name: "Oesophagus", x: cx, y: 55, w: 4, h: 16 },
        { name: "Stomach", x: cx - 6, y: 80, w: 20, h: 16 },
        { name: "Small intestine", x: cx, y: 102, w: 24, h: 16 },
        { name: "Large intestine", x: cx, y: 122, w: 28, h: 12 },
      ],
    },
    circulatory: {
      label: "Circulatory System", color: T.rose,
      parts: [
        { name: "Heart", x: cx - 4, y: 72, w: 16, h: 16 },
        { name: "Arteries", x: cx + 20, y: 90, w: 3, h: 40 },
        { name: "Veins", x: cx - 20, y: 90, w: 3, h: 40 },
        { name: "Lungs", x: cx, y: 65, w: 32, h: 20 },
      ],
    },
    respiratory: {
      label: "Respiratory System", color: T.cyan,
      parts: [
        { name: "Nose", x: cx, y: headY + 8, w: 6, h: 6 },
        { name: "Trachea", x: cx, y: 52, w: 6, h: 14 },
        { name: "Bronchi", x: cx, y: 68, w: 20, h: 6 },
        { name: "Left lung", x: cx - 16, y: 78, w: 18, h: 24 },
        { name: "Right lung", x: cx + 16, y: 78, w: 18, h: 24 },
        { name: "Diaphragm", x: cx, y: 106, w: 36, h: 4 },
      ],
    },
  };

  const sys = SYSTEMS[system] || SYSTEMS.skeleton;

  return (
    <Panel accent={sys.color} bg={sys.color + "08"} bd={sys.color + "44"}
      ariaLabel={`${sys.label} diagram${highlighted ? ` — ${highlighted} highlighted` : ""}`}>
      <Chip color={sys.color} bg="white">{sys.label}</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Body outline */}
        <ellipse cx={cx} cy={headY} rx={14} ry={16} fill="none" stroke={T.slateBd} strokeWidth={1.5} />
        <line x1={cx} y1={bodyTop} x2={cx} y2={bodyBot - 10} stroke={T.slateBd} strokeWidth={1.5} />
        <line x1={cx - 24} y1={60} x2={cx + 24} y2={60} stroke={T.slateBd} strokeWidth={1.5} />
        <line x1={cx - 24} y1={60} x2={cx - 30} y2={100} stroke={T.slateBd} strokeWidth={1.5} />
        <line x1={cx + 24} y1={60} x2={cx + 30} y2={100} stroke={T.slateBd} strokeWidth={1.5} />
        <line x1={cx - 10} y1={bodyBot - 10} x2={cx - 14} y2={bodyBot + 40} stroke={T.slateBd} strokeWidth={1.5} />
        <line x1={cx + 10} y1={bodyBot - 10} x2={cx + 14} y2={bodyBot + 40} stroke={T.slateBd} strokeWidth={1.5} />
        {/* System parts */}
        {sys.parts.map((p, i) => {
          const isHi = hiLower && p.name.toLowerCase().includes(hiLower);
          return (
            <g key={i}>
              <rect x={p.x - p.w / 2} y={p.y - p.h / 2} width={p.w} height={p.h}
                rx={p.w > 10 ? 6 : 2}
                fill={isHi ? sys.color : sys.color + "33"}
                stroke={sys.color} strokeWidth={isHi ? 2 : 1}
                opacity={isHi ? 1 : 0.6} />
              {/* Label line for highlighted */}
              {isHi && (
                <>
                  <line x1={p.x + p.w / 2 + 2} y1={p.y} x2={W - 10} y2={p.y}
                    stroke={sys.color} strokeWidth={0.8} strokeDasharray="2,2" />
                  <text x={W - 8} y={p.y + 3} textAnchor="end"
                    fontSize={7} fontWeight="800" fill={sys.color}>{p.name}</text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SOLAR SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
export function SolarSystemVis({ highlighted = "", showOrbits = true }) {
  const W = 220, H = 160, cx = 30, cy = 80;
  const hiLower = (highlighted || "").toLowerCase();

  const planets = [
    { name: "Mercury",  dist: 24,  r: 3,  color: "#94a3b8" },
    { name: "Venus",    dist: 36,  r: 4,  color: "#fbbf24" },
    { name: "Earth",    dist: 50,  r: 4.5,color: "#3b82f6" },
    { name: "Mars",     dist: 64,  r: 3.5,color: "#ef4444" },
    { name: "Jupiter",  dist: 90,  r: 8,  color: "#d97706" },
    { name: "Saturn",   dist: 116, r: 7,  color: "#eab308" },
    { name: "Uranus",   dist: 148, r: 5,  color: "#67e8f9" },
    { name: "Neptune",  dist: 178, r: 5,  color: "#6366f1" },
  ];

  return (
    <Panel accent={T.indigo} bg="#0f172a" bd="#334155"
      ariaLabel={`Solar system${highlighted ? ` — ${highlighted} highlighted` : ""}`}>
      <Chip color="#fbbf24" bg="#1e293b">Solar System</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Sun */}
        <circle cx={cx} cy={cy} r={12} fill="#fbbf24" />
        <circle cx={cx} cy={cy} r={16} fill="none" stroke="#fbbf2444" strokeWidth={1} />
        {/* Orbits + planets */}
        {planets.map((p, i) => {
          const isHi = hiLower && p.name.toLowerCase() === hiLower;
          const px = cx + p.dist;
          return (
            <g key={i}>
              {showOrbits && (
                <ellipse cx={cx} cy={cy} rx={p.dist} ry={p.dist * 0.4}
                  fill="none" stroke="#334155" strokeWidth={0.5} strokeDasharray="2,3" />
              )}
              <circle cx={px} cy={cy} r={isHi ? p.r + 2 : p.r}
                fill={p.color} stroke={isHi ? "white" : "none"} strokeWidth={isHi ? 2 : 0} />
              {/* Label */}
              <text x={px} y={cy + p.r + 10} textAnchor="middle"
                fontSize={isHi ? 7 : 5.5} fontWeight={isHi ? "800" : "600"}
                fill={isHi ? "white" : "#64748b"}>
                {p.name}
              </text>
            </g>
          );
        })}
        {/* Not to scale note */}
        <text x={W - 4} y={H - 4} textAnchor="end" fontSize={5} fill="#475569" fontStyle="italic">
          Not to scale
        </text>
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CLASSIFICATION KEY
// ═══════════════════════════════════════════════════════════════════════════════
export function ClassificationKeyVis({ highlighted = "" }) {
  const W = 210, H = 150;
  const hiLower = (highlighted || "").toLowerCase();

  // Standard animal classification tree
  const nodes = [
    { label: "Animals", x: 105, y: 12, level: 0 },
    { label: "Vertebrates", x: 55, y: 42, level: 1 },
    { label: "Invertebrates", x: 160, y: 42, level: 1 },
    { label: "Mammals", x: 15, y: 78, level: 2 },
    { label: "Birds", x: 45, y: 78, level: 2 },
    { label: "Reptiles", x: 75, y: 78, level: 2 },
    { label: "Fish", x: 105, y: 78, level: 2 },
    { label: "Amphibians", x: 55, y: 108, level: 2 },
    { label: "Insects", x: 145, y: 78, level: 2 },
    { label: "Arachnids", x: 185, y: 78, level: 2 },
  ];

  const edges = [
    [0, 1], [0, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [2, 8], [2, 9],
  ];

  const LEVEL_COLORS = [T.indigo, T.emerald, T.nebula];

  return (
    <Panel accent={T.emerald} bg={T.emeraldBg} bd={T.emeraldBd}
      ariaLabel={`Classification key${highlighted ? ` — ${highlighted} highlighted` : ""}`}>
      <Chip color={T.emerald} bg="white">Classification</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Edges */}
        {edges.map(([from, to], i) => (
          <line key={i} x1={nodes[from].x} y1={nodes[from].y + 8}
            x2={nodes[to].x} y2={nodes[to].y - 6}
            stroke={T.slateBd} strokeWidth={1} />
        ))}
        {/* Nodes */}
        {nodes.map((n, i) => {
          const isHi = hiLower && n.label.toLowerCase().includes(hiLower);
          const color = LEVEL_COLORS[n.level] || T.slate;
          const w = n.label.length * 4.5 + 12;
          return (
            <g key={i}>
              <rect x={n.x - w / 2} y={n.y - 6} width={w} height={13} rx={4}
                fill={isHi ? color : "white"} stroke={color}
                strokeWidth={isHi ? 2 : 1} />
              <text x={n.x} y={n.y + 3} textAnchor="middle"
                fontSize={n.level === 0 ? 7 : 6} fontWeight={isHi ? "800" : "600"}
                fill={isHi ? "white" : color}>
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. LIGHT DIAGRAM (Reflection / Refraction / Lens)
// ═══════════════════════════════════════════════════════════════════════════════
export function LightDiagramVis({ scenario = "reflection", angle = 45 }) {
  const W = 200, H = 140;
  const mid = W / 2, mirrorY = H / 2;
  const toRad = d => d * Math.PI / 180;

  if (scenario === "refraction") {
    const incidentAngle = angle;
    const refractAngle = angle * 0.7; // Snell's law approximation
    return (
      <Panel accent={T.amber} bg={T.amberBg} bd={T.amberBd} ariaLabel="Refraction diagram">
        <Chip color={T.amber} bg="white">Refraction</Chip>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Boundary */}
          <rect x={0} y={mirrorY} width={W} height={mirrorY} fill="#dbeafe" opacity={0.4} />
          <line x1={0} y1={mirrorY} x2={W} y2={mirrorY} stroke={T.cyan} strokeWidth={2} />
          {/* Normal */}
          <line x1={mid} y1={10} x2={mid} y2={H - 10} stroke={T.slate} strokeWidth={1} strokeDasharray="4,3" />
          <text x={mid + 4} y={18} fontSize={7} fill={T.textMid} fontWeight="600">Normal</text>
          {/* Labels */}
          <text x={20} y={mirrorY - 8} fontSize={7} fill={T.textMid}>Air</text>
          <text x={20} y={mirrorY + 14} fontSize={7} fill={T.cyan}>Water/Glass</text>
          {/* Incident ray */}
          <line x1={mid - 50 * Math.sin(toRad(incidentAngle))} y1={mirrorY - 50 * Math.cos(toRad(incidentAngle))}
            x2={mid} y2={mirrorY}
            stroke={T.amber} strokeWidth={2.5} markerEnd="url(#light-arrow)" />
          {/* Refracted ray */}
          <line x1={mid} y1={mirrorY}
            x2={mid + 50 * Math.sin(toRad(refractAngle))} y2={mirrorY + 50 * Math.cos(toRad(refractAngle))}
            stroke={T.indigo} strokeWidth={2.5} markerEnd="url(#light-arrow)" />
          {/* Angle arcs */}
          <path d={`M ${mid},${mirrorY - 16} A 16,16 0 0,${incidentAngle > 0 ? 1 : 0} ${mid - 16 * Math.sin(toRad(incidentAngle))},${mirrorY - 16 * Math.cos(toRad(incidentAngle))}`}
            fill="none" stroke={T.amber} strokeWidth={1} />
          <text x={mid - 22} y={mirrorY - 18} fontSize={7} fontWeight="700" fill={T.amber}>{incidentAngle}°</text>
          <defs><marker id="light-arrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill={T.amber} /></marker></defs>
        </svg>
      </Panel>
    );
  }

  // Default: reflection
  return (
    <Panel accent={T.amber} bg={T.amberBg} bd={T.amberBd} ariaLabel="Reflection diagram">
      <Chip color={T.amber} bg="white">Reflection</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Mirror */}
        <rect x={mid - 60} y={mirrorY - 2} width={120} height={6} rx={2}
          fill={T.slateBg} stroke={T.slate} strokeWidth={1.5} />
        <line x1={mid - 60} y1={mirrorY + 5} x2={mid + 60} y2={mirrorY + 5}
          stroke={T.slate} strokeWidth={1} strokeDasharray="3,3" />
        {/* Normal */}
        <line x1={mid} y1={mirrorY - 50} x2={mid} y2={mirrorY} stroke={T.slate} strokeWidth={1} strokeDasharray="4,3" />
        <text x={mid + 4} y={mirrorY - 42} fontSize={7} fill={T.textMid} fontWeight="600">Normal</text>
        {/* Incident ray */}
        <line x1={mid - 40 * Math.sin(toRad(angle))} y1={mirrorY - 40 * Math.cos(toRad(angle))}
          x2={mid} y2={mirrorY}
          stroke={T.amber} strokeWidth={2.5} />
        {/* Reflected ray */}
        <line x1={mid} y1={mirrorY}
          x2={mid + 40 * Math.sin(toRad(angle))} y2={mirrorY - 40 * Math.cos(toRad(angle))}
          stroke={T.indigo} strokeWidth={2.5} />
        {/* Angle labels */}
        <text x={mid - 26} y={mirrorY - 24} fontSize={7} fontWeight="700" fill={T.amber}>i={angle}°</text>
        <text x={mid + 8} y={mirrorY - 24} fontSize={7} fontWeight="700" fill={T.indigo}>r={angle}°</text>
        <text x={mid} y={H - 8} textAnchor="middle" fontSize={7} fill={T.textMid} fontWeight="600">
          Angle of incidence = Angle of reflection
        </text>
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ELECTRICAL SYMBOLS
// ═══════════════════════════════════════════════════════════════════════════════
export function ElectricalSymbolsVis({ components = [], highlighted = "" }) {
  const hiLower = (highlighted || "").toLowerCase();
  const SYMBOLS = {
    cell:      { label: "Cell", draw: (x, y) => <g><line x1={x-6} y1={y-8} x2={x-6} y2={y+8} stroke={T.text} strokeWidth={2.5} /><line x1={x+6} y1={y-4} x2={x+6} y2={y+4} stroke={T.text} strokeWidth={1.5} /></g> },
    battery:   { label: "Battery", draw: (x, y) => <g><line x1={x-10} y1={y-8} x2={x-10} y2={y+8} stroke={T.text} strokeWidth={2.5} /><line x1={x-4} y1={y-4} x2={x-4} y2={y+4} stroke={T.text} strokeWidth={1.5} /><line x1={x+4} y1={y-8} x2={x+4} y2={y+8} stroke={T.text} strokeWidth={2.5} /><line x1={x+10} y1={y-4} x2={x+10} y2={y+4} stroke={T.text} strokeWidth={1.5} /></g> },
    lamp:      { label: "Lamp", draw: (x, y) => <g><circle cx={x} cy={y} r={8} fill="none" stroke={T.text} strokeWidth={1.5} /><line x1={x-5} y1={y-5} x2={x+5} y2={y+5} stroke={T.text} strokeWidth={1.5} /><line x1={x+5} y1={y-5} x2={x-5} y2={y+5} stroke={T.text} strokeWidth={1.5} /></g> },
    switch_open: { label: "Switch (open)", draw: (x, y) => <g><circle cx={x-8} cy={y} r={2} fill={T.text} /><circle cx={x+8} cy={y} r={2} fill={T.text} /><line x1={x-6} y1={y} x2={x+6} y2={y-8} stroke={T.text} strokeWidth={1.5} /></g> },
    resistor:  { label: "Resistor", draw: (x, y) => <rect x={x-10} y={y-5} width={20} height={10} fill="none" stroke={T.text} strokeWidth={1.5} rx={2} /> },
    ammeter:   { label: "Ammeter", draw: (x, y) => <g><circle cx={x} cy={y} r={8} fill="none" stroke={T.text} strokeWidth={1.5} /><text x={x} y={y+3} textAnchor="middle" fontSize={10} fontWeight="900" fill={T.text}>A</text></g> },
    voltmeter: { label: "Voltmeter", draw: (x, y) => <g><circle cx={x} cy={y} r={8} fill="none" stroke={T.text} strokeWidth={1.5} /><text x={x} y={y+3} textAnchor="middle" fontSize={10} fontWeight="900" fill={T.text}>V</text></g> },
  };

  const items = components.length > 0 ? components : Object.keys(SYMBOLS);
  const cols = Math.min(items.length, 4);
  const rows = Math.ceil(items.length / cols);
  const cellW = 48, cellH = 48;
  const W = cols * cellW + 20, H = rows * cellH + 20;

  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd}
      ariaLabel="Electrical circuit symbols">
      <Chip color={T.indigo} bg="white">Circuit Symbols</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {items.map((comp, i) => {
          const sym = SYMBOLS[comp] || SYMBOLS.cell;
          const col = i % cols, row = Math.floor(i / cols);
          const x = 10 + col * cellW + cellW / 2;
          const y = 10 + row * cellH + cellH / 2 - 6;
          const isHi = hiLower && sym.label.toLowerCase().includes(hiLower);
          return (
            <g key={i}>
              <rect x={x - cellW / 2 + 2} y={y - cellH / 2 + 8} width={cellW - 4} height={cellH - 4}
                rx={6} fill={isHi ? T.indigo + "22" : "white"} stroke={isHi ? T.indigo : T.slateBd} strokeWidth={isHi ? 2 : 1} />
              {sym.draw(x, y)}
              <text x={x} y={y + 18} textAnchor="middle"
                fontSize={6} fontWeight="700" fill={isHi ? T.indigo : T.textMid}>
                {sym.label}
              </text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. MAGNETS
// ═══════════════════════════════════════════════════════════════════════════════
export function MagnetVis({ scenario = "bar" }) {
  const W = 200, H = 100;

  if (scenario === "attract") {
    return (
      <Panel accent={T.rose} bg={T.roseBg} bd={T.roseBd} ariaLabel="Magnets attracting">
        <Chip color={T.rose} bg="white">Attraction (N→S)</Chip>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect x={20} y={30} width={50} height={30} rx={4} fill={T.rose} /><text x={45} y={50} textAnchor="middle" fontSize={12} fontWeight="900" fill="white">N</text>
          <rect x={70} y={30} width={50} height={30} rx={4} fill="#3b82f6" /><text x={95} y={50} textAnchor="middle" fontSize={12} fontWeight="900" fill="white">S</text>
          <text x={130} y={42} fontSize={16} fill={T.emerald}>→</text><text x={130} y={58} fontSize={16} fill={T.emerald}>←</text>
          <rect x={145} y={30} width={50} height={30} rx={4} fill={T.rose} /><text x={170} y={50} textAnchor="middle" fontSize={12} fontWeight="900" fill="white">N</text>
          <text x={100} y={80} textAnchor="middle" fontSize={8} fill={T.emerald} fontWeight="700">Opposite poles attract</text>
        </svg>
      </Panel>
    );
  }

  if (scenario === "repel") {
    return (
      <Panel accent={T.rose} bg={T.roseBg} bd={T.roseBd} ariaLabel="Magnets repelling">
        <Chip color={T.rose} bg="white">Repulsion (N→N)</Chip>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect x={20} y={30} width={50} height={30} rx={4} fill={T.rose} /><text x={45} y={50} textAnchor="middle" fontSize={12} fontWeight="900" fill="white">N</text>
          <text x={80} y={42} fontSize={16} fill={T.rose}>←</text><text x={115} y={42} fontSize={16} fill={T.rose}>→</text>
          <rect x={130} y={30} width={50} height={30} rx={4} fill={T.rose} /><text x={155} y={50} textAnchor="middle" fontSize={12} fontWeight="900" fill="white">N</text>
          <text x={100} y={80} textAnchor="middle" fontSize={8} fill={T.rose} fontWeight="700">Same poles repel</text>
        </svg>
      </Panel>
    );
  }

  if (scenario === "field_lines") {
    return (
      <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd} ariaLabel="Magnetic field lines">
        <Chip color={T.indigo} bg="white">Magnetic Field Lines</Chip>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <rect x={70} y={35} width={30} height={24} rx={3} fill={T.rose} /><text x={85} y={51} textAnchor="middle" fontSize={10} fontWeight="900" fill="white">N</text>
          <rect x={100} y={35} width={30} height={24} rx={3} fill="#3b82f6" /><text x={115} y={51} textAnchor="middle" fontSize={10} fontWeight="900" fill="white">S</text>
          {/* Field lines */}
          {[16, 28, 40].map((offset, i) => (
            <ellipse key={i} cx={100} cy={47} rx={40 + offset} ry={14 + offset * 0.6}
              fill="none" stroke={T.indigo} strokeWidth={0.8} strokeDasharray="3,2" opacity={0.6} />
          ))}
          <text x={100} y={H - 6} textAnchor="middle" fontSize={7} fill={T.textMid} fontWeight="600">Field lines: N → S</text>
        </svg>
      </Panel>
    );
  }

  // Default: single bar magnet
  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd} ariaLabel="Bar magnet">
      <Chip color={T.indigo} bg="white">Bar Magnet</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect x={40} y={30} width={60} height={34} rx={4} fill={T.rose} stroke={T.rose} strokeWidth={1.5} />
        <text x={70} y={52} textAnchor="middle" fontSize={14} fontWeight="900" fill="white">N</text>
        <rect x={100} y={30} width={60} height={34} rx={4} fill="#3b82f6" stroke="#3b82f6" strokeWidth={1.5} />
        <text x={130} y={52} textAnchor="middle" fontSize={14} fontWeight="900" fill="white">S</text>
        <text x={70} y={78} textAnchor="middle" fontSize={7} fill={T.rose} fontWeight="700">North pole</text>
        <text x={130} y={78} textAnchor="middle" fontSize={7} fill="#3b82f6" fontWeight="700">South pole</text>
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. PHOTOSYNTHESIS
// ═══════════════════════════════════════════════════════════════════════════════
export function PhotosynthesisVis({ highlighted = "" }) {
  const W = 210, H = 160;
  const hiLower = (highlighted || "").toLowerCase();

  const inputs = [
    { label: "Sunlight", x: 20, y: 20, arrow: { ex: 80, ey: 60 }, icon: "☀️", color: T.amber },
    { label: "CO₂", x: 20, y: 75, arrow: { ex: 80, ey: 75 }, icon: "", color: T.slate },
    { label: "Water", x: 55, y: 130, arrow: { ex: 90, ey: 100 }, icon: "💧", color: T.cyan },
  ];
  const outputs = [
    { label: "Glucose", x: 160, y: 60, arrow: { sx: 130, sy: 70 }, color: T.amber },
    { label: "Oxygen", x: 160, y: 95, arrow: { sx: 130, sy: 85 }, color: T.emerald },
  ];

  return (
    <Panel accent={T.emerald} bg={T.emeraldBg} bd={T.emeraldBd} ariaLabel="Photosynthesis diagram">
      <Chip color={T.emerald} bg="white">Photosynthesis</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Leaf (central) */}
        <ellipse cx={105} cy={78} rx={30} ry={22} fill="#86efac" stroke={T.emerald} strokeWidth={2} />
        <text x={105} y={75} textAnchor="middle" fontSize={7} fontWeight="800" fill={T.emerald}>Chloroplast</text>
        <text x={105} y={86} textAnchor="middle" fontSize={6} fill="#166534">🌿 Leaf cell</text>
        {/* Input arrows */}
        {inputs.map((inp, i) => {
          const isHi = hiLower && inp.label.toLowerCase().includes(hiLower);
          return (
            <g key={`in-${i}`}>
              <line x1={inp.x + 20} y1={inp.y + 5} x2={inp.arrow.ex} y2={inp.arrow.ey}
                stroke={isHi ? inp.color : T.slateBd} strokeWidth={isHi ? 2 : 1.5}
                markerEnd="url(#photo-arrow)" />
              <text x={inp.x} y={inp.y + 4} fontSize={8} fontWeight={isHi ? "800" : "600"}
                fill={isHi ? inp.color : T.textMid}>
                {inp.icon} {inp.label}
              </text>
            </g>
          );
        })}
        {/* Output arrows */}
        {outputs.map((out, i) => {
          const isHi = hiLower && out.label.toLowerCase().includes(hiLower);
          return (
            <g key={`out-${i}`}>
              <line x1={out.arrow.sx} y1={out.arrow.sy} x2={out.x - 10} y2={out.y + 3}
                stroke={isHi ? out.color : T.slateBd} strokeWidth={isHi ? 2 : 1.5}
                markerEnd="url(#photo-arrow)" />
              <text x={out.x} y={out.y + 4} fontSize={8} fontWeight={isHi ? "800" : "600"}
                fill={isHi ? out.color : T.textMid}>
                {out.label}
              </text>
            </g>
          );
        })}
        <defs><marker id="photo-arrow" markerWidth="5" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 5 2, 0 4" fill={T.emerald} /></marker></defs>
        {/* Equation */}
        <text x={105} y={H - 8} textAnchor="middle" fontSize={6.5} fontWeight="700" fill={T.emerald}>
          CO₂ + H₂O → C₆H₁₂O₆ + O₂
        </text>
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. RESPIRATION
// ═══════════════════════════════════════════════════════════════════════════════
export function RespirationVis({ respType = "aerobic" }) {
  const W = 210, H = 140;
  const isAerobic = respType === "aerobic";

  return (
    <Panel accent={T.rose} bg={T.roseBg} bd={T.roseBd}
      ariaLabel={`${isAerobic ? "Aerobic" : "Anaerobic"} respiration diagram`}>
      <Chip color={T.rose} bg="white">{isAerobic ? "Aerobic" : "Anaerobic"} Respiration</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Cell */}
        <ellipse cx={105} cy={55} rx={35} ry={25} fill="#fecdd3" stroke={T.rose} strokeWidth={2} />
        <text x={105} y={50} textAnchor="middle" fontSize={7} fontWeight="800" fill={T.rose}>
          Mitochondria
        </text>
        <text x={105} y={62} textAnchor="middle" fontSize={6} fill="#9f1239">⚡ Energy released</text>
        {/* Inputs */}
        <text x={15} y={40} fontSize={8} fontWeight="700" fill={T.amber}>Glucose</text>
        <line x1={55} y1={38} x2={72} y2={45} stroke={T.amber} strokeWidth={1.5} markerEnd="url(#resp-arrow)" />
        {isAerobic && (
          <>
            <text x={15} y={68} fontSize={8} fontWeight="700" fill={T.cyan}>Oxygen</text>
            <line x1={48} y1={66} x2={72} y2={60} stroke={T.cyan} strokeWidth={1.5} markerEnd="url(#resp-arrow)" />
          </>
        )}
        {/* Outputs */}
        <line x1={138} y1={45} x2={160} y2={35} stroke={T.slate} strokeWidth={1.5} markerEnd="url(#resp-arrow)" />
        <text x={162} y={30} fontSize={8} fontWeight="700" fill={T.slate}>CO₂</text>
        {isAerobic ? (
          <>
            <line x1={138} y1={60} x2={160} y2={70} stroke={T.cyan} strokeWidth={1.5} markerEnd="url(#resp-arrow)" />
            <text x={162} y={72} fontSize={8} fontWeight="700" fill={T.cyan}>Water</text>
          </>
        ) : (
          <>
            <line x1={138} y1={60} x2={160} y2={70} stroke={T.nebula} strokeWidth={1.5} markerEnd="url(#resp-arrow)" />
            <text x={162} y={72} fontSize={8} fontWeight="700" fill={T.nebula}>Lactic acid</text>
          </>
        )}
        <line x1={105} y1={80} x2={105} y2={95} stroke={T.rose} strokeWidth={2} markerEnd="url(#resp-arrow)" />
        <text x={105} y={108} textAnchor="middle" fontSize={9} fontWeight="900" fill={T.rose}>⚡ ENERGY</text>
        <defs><marker id="resp-arrow" markerWidth="5" markerHeight="4" refX="5" refY="2" orient="auto">
          <polygon points="0 0, 5 2, 0 4" fill={T.rose} /></marker></defs>
        {/* Equation */}
        <text x={105} y={H - 6} textAnchor="middle" fontSize={6} fontWeight="600" fill={T.textMid}>
          {isAerobic
            ? "Glucose + Oxygen → CO₂ + Water + Energy"
            : "Glucose → Lactic acid + Energy (less)"
          }
        </text>
      </svg>
    </Panel>
  );
}