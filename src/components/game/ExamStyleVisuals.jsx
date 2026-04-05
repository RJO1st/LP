"use client";
// ─── ExamStyleVisuals.jsx ────────────────────────────────────────────────────
// New diagram types for the quiz system, adapted from ExamRunner's SVG renderers.
// Import in MathsVisualiser:
//   import { CircleTheoremVis, NumberMachineVis, ... } from "./ExamStyleVisuals";

import React from "react";

// ── 1. CIRCLE THEOREM ─────────────────────────────────────────────────────────
export function CircleTheoremVis({ theorem = "tangent", labels = {} }) {
  const CX = 120, CY = 110, R = 70;

  let content;
  switch (theorem) {
    case "inscribed":
    case "angle_at_centre":
      content = (
        <>
          {/* Circle */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#4338ca" strokeWidth="2" />
          <circle cx={CX} cy={CY} r="3" fill="#4338ca" />
          {/* Points on circumference */}
          <circle cx={CX - 60} cy={CY + 35} r="4" fill="#7c3aed" />
          <circle cx={CX + 60} cy={CY + 35} r="4" fill="#7c3aed" />
          <circle cx={CX} cy={CY - R} r="4" fill="#7c3aed" />
          {/* Inscribed angle (at top) */}
          <line x1={CX} y1={CY - R} x2={CX - 60} y2={CY + 35} stroke="#7c3aed" strokeWidth="1.5" />
          <line x1={CX} y1={CY - R} x2={CX + 60} y2={CY + 35} stroke="#7c3aed" strokeWidth="1.5" />
          {/* Central angle */}
          <line x1={CX} y1={CY} x2={CX - 60} y2={CY + 35} stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4 2" />
          <line x1={CX} y1={CY} x2={CX + 60} y2={CY + 35} stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4 2" />
          {/* Labels */}
          <text x={CX} y={CY - R - 8} textAnchor="middle" fontSize="10" fill="#7c3aed" fontWeight="bold">x</text>
          <text x={CX + 8} y={CY - 4} fontSize="10" fill="#dc2626" fontWeight="bold">2x</text>
          <text x={CX - 66} y={CY + 50} fontSize="9" fill="#4338ca">A</text>
          <text x={CX + 60} y={CY + 50} fontSize="9" fill="#4338ca">B</text>
        </>
      );
      break;
    case "cyclic_quadrilateral":
      content = (
        <>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#4338ca" strokeWidth="2" />
          {/* 4 points on circumference */}
          {[[-50, -50], [50, -50], [60, 40], [-55, 45]].map(([dx, dy], i) => {
            const x = CX + dx, y = CY + dy;
            return <circle key={i} cx={x} cy={y} r="4" fill="#7c3aed" />;
          })}
          {/* Quadrilateral */}
          <polygon
            points={`${CX - 50},${CY - 50} ${CX + 50},${CY - 50} ${CX + 60},${CY + 40} ${CX - 55},${CY + 45}`}
            fill="rgba(124,58,237,0.08)" stroke="#7c3aed" strokeWidth="1.5"
          />
          {/* Opposite angle labels */}
          <text x={CX - 55} y={CY - 56} fontSize="10" fill="#dc2626" fontWeight="bold">a</text>
          <text x={CX + 55} y={CY + 54} fontSize="10" fill="#dc2626" fontWeight="bold">b</text>
          <text x={CX + 18} y={CY + 70} fontSize="9" fill="#64748b">a + b = 180°</text>
        </>
      );
      break;
    case "alternate_segment":
      content = (
        <>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#4338ca" strokeWidth="2" />
          {/* Tangent line at bottom */}
          <line x1={CX - 90} y1={CY + R} x2={CX + 90} y2={CY + R} stroke="#059669" strokeWidth="2" />
          {/* Point of tangency */}
          <circle cx={CX} cy={CY + R} r="4" fill="#059669" />
          {/* Chord from tangent point */}
          <line x1={CX} y1={CY + R} x2={CX + 55} y2={CY - 45} stroke="#7c3aed" strokeWidth="1.5" />
          <circle cx={CX + 55} cy={CY - 45} r="4" fill="#7c3aed" />
          {/* Arc angle markers */}
          <text x={CX + 12} y={CY + R - 8} fontSize="10" fill="#059669" fontWeight="bold">x</text>
          <text x={CX + 38} y={CY - 24} fontSize="10" fill="#7c3aed" fontWeight="bold">x</text>
        </>
      );
      break;
    default: // tangent
      content = (
        <>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#4338ca" strokeWidth="2" />
          <circle cx={CX} cy={CY} r="3" fill="#4338ca" />
          {/* Point on circumference (right side) */}
          <circle cx={CX + R} cy={CY} r="4" fill="#059669" />
          {/* Radius to point */}
          <line x1={CX} y1={CY} x2={CX + R} y2={CY} stroke="#4338ca" strokeWidth="1.5" />
          {/* Tangent line (vertical at point) */}
          <line x1={CX + R} y1={CY - 60} x2={CX + R} y2={CY + 60} stroke="#059669" strokeWidth="2" />
          {/* Right angle marker */}
          <rect x={CX + R - 8} y={CY} width="8" height="8" fill="none" stroke="#dc2626" strokeWidth="1.5" />
          {/* Labels */}
          <text x={CX + R / 2} y={CY - 6} textAnchor="middle" fontSize="9" fill="#4338ca" fontWeight="bold">r</text>
          <text x={CX + R + 14} y={CY + 4} fontSize="9" fill="#059669" fontWeight="bold">tangent</text>
          <text x={CX + R + 4} y={CY + 16} fontSize="8" fill="#dc2626">90°</text>
        </>
      );
  }

  return (
    <div className="w-full flex items-center justify-center p-2">
      <svg viewBox="0 0 240 220" className="w-full max-w-xs">
        {content}
      </svg>
    </div>
  );
}

// ── 2. NUMBER MACHINE ─────────────────────────────────────────────────────────
export function NumberMachineVis({ input = "n", operations = ["× 3", "+ 5"], output = "?" }) {
  const W = 280, H = 80;
  const steps = [input, ...operations, output];
  const stepW = W / steps.length;

  return (
    <div className="w-full flex items-center justify-center p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-sm">
        {steps.map((label, i) => {
          const x = i * stepW + stepW / 2;
          const isIO = i === 0 || i === steps.length - 1;
          const isOp = !isIO;
          return (
            <g key={i}>
              {/* Box */}
              <rect
                x={x - 28} y={H / 2 - 18} width="56" height="36" rx={isIO ? 18 : 4}
                fill={isIO ? "#ede9fe" : "#dbeafe"} stroke={isIO ? "#7c3aed" : "#2563eb"} strokeWidth="2"
              />
              <text x={x} y={H / 2 + 5} textAnchor="middle" fontSize="11" fontWeight="bold" fill={isIO ? "#5b21b6" : "#1e40af"}>
                {label}
              </text>
              {/* Arrow */}
              {i < steps.length - 1 && (
                <>
                  <line x1={x + 30} y1={H / 2} x2={x + stepW - 30} y2={H / 2} stroke="#94a3b8" strokeWidth="2" />
                  <polygon points={`${x + stepW - 30},${H / 2 - 4} ${x + stepW - 22},${H / 2} ${x + stepW - 30},${H / 2 + 4}`} fill="#94a3b8" />
                </>
              )}
            </g>
          );
        })}
        {/* Labels */}
        <text x={stepW / 2} y={14} textAnchor="middle" fontSize="8" fill="#7c3aed">Input</text>
        <text x={W - stepW / 2} y={14} textAnchor="middle" fontSize="8" fill="#7c3aed">Output</text>
      </svg>
    </div>
  );
}

// ── 3. REACTION PROFILE ───────────────────────────────────────────────────────
export function ReactionProfileVis({ type = "exothermic", showCatalyst = false }) {
  const W = 260, H = 200;
  const isExo = type === "exothermic";
  const rY = isExo ? 60 : 140; // reactants energy level
  const pY = isExo ? 140 : 60; // products energy level
  const peakY = 30; // activation energy peak

  return (
    <div className="w-full flex items-center justify-center p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs">
        {/* Axes */}
        <line x1="40" y1="10" x2="40" y2="180" stroke="#374151" strokeWidth="2" />
        <line x1="40" y1="180" x2="240" y2="180" stroke="#374151" strokeWidth="2" />
        <text x="15" y="100" textAnchor="middle" fontSize="9" fill="#374151" fontWeight="bold" transform="rotate(-90 15 100)">Energy</text>
        <text x="140" y="196" textAnchor="middle" fontSize="9" fill="#374151" fontWeight="bold">Progress of reaction</text>

        {/* Reactants level */}
        <line x1="40" y1={rY} x2="80" y2={rY} stroke="#2563eb" strokeWidth="2" />
        <text x="55" y={rY - 6} textAnchor="middle" fontSize="8" fill="#2563eb" fontWeight="bold">Reactants</text>

        {/* Energy curve */}
        <path
          d={`M 80,${rY} Q 120,${peakY} 160,${(rY + pY) / 2} Q 180,${pY - 10} 200,${pY}`}
          fill="none" stroke="#dc2626" strokeWidth="2.5"
        />

        {/* Catalyst curve (dashed, lower peak) */}
        {showCatalyst && (
          <path
            d={`M 80,${rY} Q 120,${peakY + 30} 160,${(rY + pY) / 2} Q 180,${pY - 5} 200,${pY}`}
            fill="none" stroke="#059669" strokeWidth="2" strokeDasharray="5 3"
          />
        )}

        {/* Products level */}
        <line x1="200" y1={pY} x2="240" y2={pY} stroke="#2563eb" strokeWidth="2" />
        <text x="220" y={pY - 6} textAnchor="middle" fontSize="8" fill="#2563eb" fontWeight="bold">Products</text>

        {/* Ea arrow */}
        <line x1="80" y1={rY} x2="80" y2={peakY + 10} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />
        <polygon points={`76,${peakY + 14} 80,${peakY + 6} 84,${peakY + 14}`} fill="#f59e0b" />
        <text x="68" y={(rY + peakY) / 2 + 4} fontSize="8" fill="#f59e0b" fontWeight="bold">Eₐ</text>

        {/* ΔH arrow */}
        <line x1="220" y1={rY} x2="220" y2={pY} stroke="#7c3aed" strokeWidth="1.5" />
        <polygon points={`216,${isExo ? pY - 4 : pY + 4} 220,${isExo ? pY + 4 : pY - 4} 224,${isExo ? pY - 4 : pY + 4}`} fill="#7c3aed" />
        <text x="234" y={(rY + pY) / 2 + 4} fontSize="8" fill="#7c3aed" fontWeight="bold">ΔH</text>

        {/* Label */}
        <text x="140" y={H - 2} textAnchor="middle" fontSize="9" fill={isExo ? "#dc2626" : "#2563eb"} fontWeight="bold">
          {isExo ? "Exothermic" : "Endothermic"}
        </text>

        {showCatalyst && (
          <text x="140" y={peakY + 40} textAnchor="middle" fontSize="8" fill="#059669" fontWeight="bold">with catalyst</text>
        )}
      </svg>
    </div>
  );
}

// ── 4. PERIODIC TABLE OUTLINE ─────────────────────────────────────────────────
export function PeriodicTableOutlineVis({ highlighted = [] }) {
  const CW = 14, CH = 14, GAP = 1;
  // Simplified layout: [row][columns] — 1 = cell exists, 0 = empty
  const layout = [
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],  // H, He
    [1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1],  // Li-Ne
    [1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1],  // Na-Ar
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],  // K-Kr
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],  // Rb-Xe
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],  // Cs-Rn
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],  // Fr-Og
  ];
  // Element symbols for first 3 rows (simplified)
  const elements = [
    ["H","","","","","","","","","","","","","","","","","He"],
    ["Li","Be","","","","","","","","","","","B","C","N","O","F","Ne"],
    ["Na","Mg","","","","","","","","","","","Al","Si","P","S","Cl","Ar"],
  ];
  const hlSet = new Set(highlighted.map(e => e.toLowerCase()));
  const groups = ["1","2","","","","","","","","","","","3","4","5","6","7","0"];

  return (
    <div className="w-full flex items-center justify-center p-2">
      <svg viewBox={`0 0 ${18 * (CW + GAP) + 10} ${7 * (CH + GAP) + 28}`} className="w-full max-w-sm">
        {/* Group labels */}
        {groups.map((g, col) => g && (
          <text key={`g${col}`} x={5 + col * (CW + GAP) + CW / 2} y={10} textAnchor="middle" fontSize="6" fill="#6b7280" fontWeight="bold">{g}</text>
        ))}
        {layout.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null;
            const x = 5 + c * (CW + GAP);
            const y = 16 + r * (CH + GAP);
            const sym = elements[r]?.[c] || "";
            const isHl = sym && hlSet.has(sym.toLowerCase());
            return (
              <g key={`${r}-${c}`}>
                <rect x={x} y={y} width={CW} height={CH} rx="1"
                  fill={isHl ? "#fbbf24" : "#e2e8f0"} stroke={isHl ? "#d97706" : "#94a3b8"} strokeWidth={isHl ? 1.5 : 0.5}
                />
                {sym && <text x={x + CW / 2} y={y + CH / 2 + 3} textAnchor="middle" fontSize="5" fill={isHl ? "#92400e" : "#374151"} fontWeight={isHl ? "bold" : "normal"}>{sym}</text>}
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}

// ── 5. PEDIGREE CHART ─────────────────────────────────────────────────────────
export function PedigreeChartVis({ generations = 3, affectedPattern = "autosomal_recessive" }) {
  // Standard pedigree: squares=male, circles=female, filled=affected, half=carrier
  const W = 240, H = 160;
  const gen1Y = 25, gen2Y = 75, gen3Y = 125;

  const person = (x, y, isMale, isAffected, isCarrier, label) => (
    <g key={`${x}-${y}`}>
      {isMale ? (
        <rect x={x - 10} y={y - 10} width="20" height="20" fill={isAffected ? "#7c3aed" : isCarrier ? "url(#halfFill)" : "#fff"} stroke="#374151" strokeWidth="1.5" />
      ) : (
        <circle cx={x} cy={y} r="10" fill={isAffected ? "#7c3aed" : isCarrier ? "url(#halfFill)" : "#fff"} stroke="#374151" strokeWidth="1.5" />
      )}
      {label && <text x={x} y={y + 22} textAnchor="middle" fontSize="7" fill="#64748b">{label}</text>}
    </g>
  );

  return (
    <div className="w-full flex items-center justify-center p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs">
        <defs>
          <linearGradient id="halfFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="50%" stopColor="#fff" />
            <stop offset="50%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        {/* Gen 1: parents */}
        <line x1="100" y1={gen1Y} x2="140" y2={gen1Y} stroke="#374151" strokeWidth="1.5" />
        {person(100, gen1Y, true, false, true)}
        {person(140, gen1Y, false, false, true)}
        {/* Vertical to Gen 2 */}
        <line x1="120" y1={gen1Y + 10} x2="120" y2={gen2Y - 15} stroke="#374151" strokeWidth="1.5" />
        <line x1="60" y1={gen2Y - 15} x2="180" y2={gen2Y - 15} stroke="#374151" strokeWidth="1.5" />
        {/* Gen 2: children */}
        <line x1="60" y1={gen2Y - 15} x2="60" y2={gen2Y - 10} stroke="#374151" strokeWidth="1.5" />
        <line x1="120" y1={gen2Y - 15} x2="120" y2={gen2Y - 10} stroke="#374151" strokeWidth="1.5" />
        <line x1="180" y1={gen2Y - 15} x2="180" y2={gen2Y - 10} stroke="#374151" strokeWidth="1.5" />
        {person(60, gen2Y, true, false, false)}
        {person(120, gen2Y, false, false, true)}
        {person(180, gen2Y, true, true, false)}
        {/* Gen 2 marriage */}
        <line x1="80" y1={gen2Y} x2="100" y2={gen2Y} stroke="#374151" strokeWidth="1.5" />
        {person(100, gen2Y, true, false, true)}
        {/* Vertical to Gen 3 */}
        <line x1="80" y1={gen2Y + 10} x2="80" y2={gen3Y - 15} stroke="#374151" strokeWidth="1.5" />
        <line x1="50" y1={gen3Y - 15} x2="110" y2={gen3Y - 15} stroke="#374151" strokeWidth="1.5" />
        {/* Gen 3 */}
        <line x1="50" y1={gen3Y - 15} x2="50" y2={gen3Y - 10} stroke="#374151" strokeWidth="1.5" />
        <line x1="110" y1={gen3Y - 15} x2="110" y2={gen3Y - 10} stroke="#374151" strokeWidth="1.5" />
        {person(50, gen3Y, false, true, false)}
        {person(110, gen3Y, true, false, false)}
        {/* Key */}
        <rect x={W - 70} y={5} width="65" height="50" fill="#f8fafc" stroke="#cbd5e1" rx="3" strokeWidth="0.5" />
        <rect x={W - 62} y={12} width="8" height="8" fill="#fff" stroke="#374151" strokeWidth="1" />
        <text x={W - 48} y={20} fontSize="6" fill="#374151">Unaffected</text>
        <rect x={W - 62} y={24} width="8" height="8" fill="#7c3aed" stroke="#374151" strokeWidth="1" />
        <text x={W - 48} y={32} fontSize="6" fill="#374151">Affected</text>
        <circle cx={W - 58} cy={41} r="4" fill="url(#halfFill)" stroke="#374151" strokeWidth="1" />
        <text x={W - 48} y={44} fontSize="6" fill="#374151">Carrier</text>
      </svg>
    </div>
  );
}

// ── 6. PETRI DISH ─────────────────────────────────────────────────────────────
export function PetriDishVis({ showInhibition = false, colonies = 8 }) {
  const CX = 100, CY = 100, R = 75;
  // Generate colony positions
  const colonyPos = Array.from({ length: colonies }, (_, i) => {
    const angle = (i / colonies) * Math.PI * 2 + 0.3;
    const dist = 20 + Math.random() * 40;
    return {
      x: CX + Math.cos(angle) * dist,
      y: CY + Math.sin(angle) * dist,
      r: 3 + Math.random() * 5,
    };
  });

  return (
    <div className="w-full flex items-center justify-center p-2">
      <svg viewBox="0 0 200 200" className="w-full max-w-[200px]">
        {/* Dish */}
        <circle cx={CX} cy={CY} r={R} fill="#fefce8" stroke="#a16207" strokeWidth="2" />
        <circle cx={CX} cy={CY} r={R - 3} fill="#fef9c3" stroke="#ca8a04" strokeWidth="0.5" strokeDasharray="2 2" />
        {/* Agar surface */}
        <circle cx={CX} cy={CY} r={R - 6} fill="#fef3c7" />
        {/* Colonies */}
        {colonyPos.map((c, i) => {
          if (showInhibition && Math.sqrt((c.x - CX) ** 2 + (c.y - CY) ** 2) < 25) return null;
          return <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="#84cc16" fillOpacity="0.7" stroke="#4d7c0f" strokeWidth="0.5" />;
        })}
        {/* Antibiotic disc + clear zone */}
        {showInhibition && (
          <>
            <circle cx={CX} cy={CY} r="25" fill="none" stroke="#dc2626" strokeWidth="1" strokeDasharray="3 2" />
            <circle cx={CX} cy={CY} r="6" fill="#e5e7eb" stroke="#6b7280" strokeWidth="1" />
            <text x={CX} y={CY + 3} textAnchor="middle" fontSize="5" fill="#374151" fontWeight="bold">A</text>
            <text x={CX} y={CY + 38} textAnchor="middle" fontSize="7" fill="#dc2626">Zone of inhibition</text>
          </>
        )}
      </svg>
    </div>
  );
}

// ── 7. MICROSCOPE DIAGRAM ─────────────────────────────────────────────────────
export function MicroscopeDiagramVis({ hideLabels = false }) {
  return (
    <div className="w-full flex items-center justify-center p-2">
      <svg viewBox="0 0 200 240" className="w-full max-w-[180px]">
        {/* Base */}
        <rect x="40" y="215" width="120" height="12" rx="3" fill="#d4d4d8" stroke="#52525b" strokeWidth="1.5" />
        {/* Pillar */}
        <rect x="55" y="50" width="12" height="170" fill="#a1a1aa" stroke="#52525b" strokeWidth="1.5" rx="2" />
        {/* Arm */}
        <rect x="55" y="48" width="60" height="12" rx="3" fill="#a1a1aa" stroke="#52525b" strokeWidth="1.5" />
        {/* Eyepiece */}
        <rect x="100" y="20" width="18" height="32" rx="4" fill="#71717a" stroke="#3f3f46" strokeWidth="1.5" />
        {!hideLabels && <text x="136" y="38" fontSize="7" fill="#374151" fontWeight="bold">Eyepiece</text>}
        {/* Body tube */}
        <rect x="104" y="50" width="10" height="40" fill="#a1a1aa" stroke="#52525b" strokeWidth="1" />
        {!hideLabels && <text x="126" y="72" fontSize="7" fill="#374151">Body tube</text>}
        {/* Revolving nosepiece */}
        <ellipse cx="109" cy="95" rx="16" ry="6" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
        {!hideLabels && <text x="132" y="98" fontSize="7" fill="#374151">Nosepiece</text>}
        {/* Objective lenses */}
        <rect x="95" y="100" width="6" height="20" rx="2" fill="#64748b" stroke="#334155" strokeWidth="1" />
        <rect x="105" y="100" width="6" height="26" rx="2" fill="#64748b" stroke="#334155" strokeWidth="1" />
        <rect x="115" y="100" width="6" height="16" rx="2" fill="#64748b" stroke="#334155" strokeWidth="1" />
        {!hideLabels && <text x="130" y="118" fontSize="7" fill="#374151">Objectives</text>}
        {/* Stage */}
        <rect x="60" y="135" width="80" height="8" rx="2" fill="#78716c" stroke="#44403c" strokeWidth="1.5" />
        {!hideLabels && <text x="148" y="142" fontSize="7" fill="#374151">Stage</text>}
        {/* Stage clips */}
        <rect x="72" y="132" width="8" height="4" rx="1" fill="#52525b" />
        <rect x="120" y="132" width="8" height="4" rx="1" fill="#52525b" />
        {/* Light/mirror */}
        <ellipse cx="100" cy="180" rx="15" ry="10" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
        {!hideLabels && <text x="125" y="183" fontSize="7" fill="#374151">Light</text>}
        {/* Coarse focus knob */}
        <circle cx="50" cy="110" r="8" fill="#d4d4d8" stroke="#52525b" strokeWidth="1.5" />
        {!hideLabels && <text x="18" y="100" fontSize="6" fill="#374151">Coarse</text>}
        {!hideLabels && <text x="18" y="108" fontSize="6" fill="#374151">focus</text>}
        {/* Fine focus knob */}
        <circle cx="50" cy="140" r="5" fill="#e5e7eb" stroke="#6b7280" strokeWidth="1.5" />
        {!hideLabels && <text x="18" y="142" fontSize="6" fill="#374151">Fine focus</text>}
      </svg>
    </div>
  );
}

// ── 8. COORDINATE GRID (for transformations) ──────────────────────────────────
export function CoordinateGridVis({ xRange = [-6, 6], yRange = [-6, 6], points = [], showGrid = true }) {
  const W = 240, H = 240, PAD = 25;
  const xMin = xRange[0], xMax = xRange[1];
  const yMin = yRange[0], yMax = yRange[1];
  const scaleX = (W - PAD * 2) / (xMax - xMin);
  const scaleY = (H - PAD * 2) / (yMax - yMin);
  const toSvgX = (x) => PAD + (x - xMin) * scaleX;
  const toSvgY = (y) => H - PAD - (y - yMin) * scaleY;

  return (
    <div className="w-full flex items-center justify-center p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs">
        {/* Grid lines */}
        {showGrid && Array.from({ length: xMax - xMin + 1 }, (_, i) => {
          const x = xMin + i;
          const sx = toSvgX(x);
          return <line key={`gx${i}`} x1={sx} y1={PAD} x2={sx} y2={H - PAD} stroke="#e2e8f0" strokeWidth="0.5" />;
        })}
        {showGrid && Array.from({ length: yMax - yMin + 1 }, (_, i) => {
          const y = yMin + i;
          const sy = toSvgY(y);
          return <line key={`gy${i}`} x1={PAD} y1={sy} x2={W - PAD} y2={sy} stroke="#e2e8f0" strokeWidth="0.5" />;
        })}
        {/* Axes */}
        <line x1={toSvgX(0)} y1={PAD} x2={toSvgX(0)} y2={H - PAD} stroke="#374151" strokeWidth="1.5" />
        <line x1={PAD} y1={toSvgY(0)} x2={W - PAD} y2={toSvgY(0)} stroke="#374151" strokeWidth="1.5" />
        {/* Tick marks + labels */}
        {Array.from({ length: xMax - xMin + 1 }, (_, i) => {
          const x = xMin + i;
          if (x === 0) return null;
          const sx = toSvgX(x);
          return (
            <g key={`tx${i}`}>
              <line x1={sx} y1={toSvgY(0) - 3} x2={sx} y2={toSvgY(0) + 3} stroke="#374151" strokeWidth="1" />
              <text x={sx} y={toSvgY(0) + 12} textAnchor="middle" fontSize="7" fill="#64748b">{x}</text>
            </g>
          );
        })}
        {Array.from({ length: yMax - yMin + 1 }, (_, i) => {
          const y = yMin + i;
          if (y === 0) return null;
          const sy = toSvgY(y);
          return (
            <g key={`ty${i}`}>
              <line x1={toSvgX(0) - 3} y1={sy} x2={toSvgX(0) + 3} y2={sy} stroke="#374151" strokeWidth="1" />
              <text x={toSvgX(0) - 8} y={sy + 3} textAnchor="end" fontSize="7" fill="#64748b">{y}</text>
            </g>
          );
        })}
        {/* Origin label */}
        <text x={toSvgX(0) - 8} y={toSvgY(0) + 12} fontSize="7" fill="#374151" fontWeight="bold">O</text>
        {/* Axis labels */}
        <text x={W - PAD + 5} y={toSvgY(0) + 4} fontSize="9" fill="#374151" fontWeight="bold">x</text>
        <text x={toSvgX(0) + 6} y={PAD - 5} fontSize="9" fill="#374151" fontWeight="bold">y</text>
        {/* Plot any provided points */}
        {points.map((p, i) => (
          <g key={`p${i}`}>
            <circle cx={toSvgX(p.x)} cy={toSvgY(p.y)} r="3.5" fill="#dc2626" stroke="#fff" strokeWidth="1" />
            <text x={toSvgX(p.x) + 6} y={toSvgY(p.y) - 5} fontSize="7" fill="#dc2626" fontWeight="bold">
              ({p.x},{p.y})
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
