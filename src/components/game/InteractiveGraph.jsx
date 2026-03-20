"use client";
// ─── Deploy to: src/components/game/InteractiveGraph.jsx ─────────────────────
// Reusable coordinate plane for:
//   1. Plotting simultaneous equations (auto-drawn lines + intersection)
//   2. Interactive point plotting (scholar clicks to place/remove points)
//   3. Static coordinate display (read-only points)
//
// Props:
//   mode: "equations" | "plot" | "static" (default: auto-detect)
//   equations: ["y = 2x + 1", "y = -x + 4"]  — for simultaneous eq mode
//   points: [{ x: 2, y: 3, label: "A" }]      — for static display
//   xRange / yRange: [-6, 6]
//   onPlot: (points) => void                    — callback for plot mode
//   onIntersectionClick: (point) => void        — callback for eq click
//   readOnly: boolean

import React, { useState, useCallback, useMemo } from "react";

const COLORS = ["#6366f1", "#ef4444", "#10b981", "#f59e0b", "#ec4899"];

// ── Parse "y = mx + c" into { m, c } ────────────────────────────────────────
function parseEquation(eq) {
  const s = (eq || "").replace(/\s/g, "");

  // y=mx+c, y=mx-c, y=mx, y=c
  const m1 = s.match(/y=([+-]?\d*\.?\d*)x([+-]\d+\.?\d*)?/i);
  if (m1) {
    let m = m1[1];
    if (m === "" || m === "+") m = 1;
    else if (m === "-") m = -1;
    else m = parseFloat(m);
    const c = m1[2] ? parseFloat(m1[2]) : 0;
    return { m, c, raw: eq };
  }

  // y=c (horizontal line)
  const m2 = s.match(/y=([+-]?\d+\.?\d*)/i);
  if (m2) return { m: 0, c: parseFloat(m2[1]), raw: eq };

  // x=c (vertical line)
  const m3 = s.match(/x=([+-]?\d+\.?\d*)/i);
  if (m3) return { m: Infinity, c: parseFloat(m3[1]), raw: eq, vertical: true };

  return null;
}

function findIntersection(eq1, eq2) {
  if (!eq1 || !eq2) return null;
  if (eq1.m === eq2.m) return null; // parallel
  if (eq1.vertical) return { x: eq1.c, y: eq2.m * eq1.c + eq2.c };
  if (eq2.vertical) return { x: eq2.c, y: eq1.m * eq2.c + eq1.c };
  const x = (eq2.c - eq1.c) / (eq1.m - eq2.m);
  const y = eq1.m * x + eq1.c;
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}

export default function InteractiveGraph({
  equations = [],
  points: staticPoints = [],
  xRange = [-6, 6],
  yRange = [-6, 6],
  onPlot,
  onIntersectionClick,
  readOnly = false,
  mode: modeProp,
  showGrid = true,
  width: W = 320,
  height: H = 320,
}) {
  const [plotted, setPlotted] = useState([]);
  const PAD = 38;
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;

  const toX = useCallback((x) => PAD + ((x - xMin) / (xMax - xMin)) * plotW, [xMin, xMax, plotW]);
  const toY = useCallback((y) => PAD + ((yMax - y) / (yMax - yMin)) * plotH, [yMin, yMax, plotH]);
  const fromXY = useCallback((px, py) => ({
    x: Math.round(xMin + ((px - PAD) / plotW) * (xMax - xMin)),
    y: Math.round(yMax - ((py - PAD) / plotH) * (yMax - yMin)),
  }), [xMin, xMax, yMin, yMax, plotW, plotH]);

  const mode = modeProp || (equations.length > 0 ? "equations" : onPlot ? "plot" : "static");
  const parsedEqs = useMemo(() => equations.map(parseEquation).filter(Boolean), [equations]);
  const intersection = useMemo(() => {
    if (parsedEqs.length >= 2) return findIntersection(parsedEqs[0], parsedEqs[1]);
    return null;
  }, [parsedEqs]);

  const handleClick = (e) => {
    if (readOnly) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width * W;
    const py = (e.clientY - rect.top) / rect.height * H;
    const { x: gx, y: gy } = fromXY(px, py);

    if (gx < xMin || gx > xMax || gy < yMin || gy > yMax) return;

    if (mode === "equations" && intersection) {
      // Check if click is near intersection
      const dist = Math.abs(gx - intersection.x) + Math.abs(gy - intersection.y);
      if (dist <= 2 && onIntersectionClick) {
        onIntersectionClick(intersection);
      }
      return;
    }

    if (mode === "plot") {
      const exists = plotted.findIndex(p => p.x === gx && p.y === gy);
      let updated;
      if (exists >= 0) {
        updated = plotted.filter((_, i) => i !== exists);
      } else {
        updated = [...plotted, { x: gx, y: gy }];
      }
      setPlotted(updated);
      if (onPlot) onPlot(updated);
    }
  };

  const xTicks = [];
  for (let x = xMin; x <= xMax; x++) xTicks.push(x);
  const yTicks = [];
  for (let y = yMin; y <= yMax; y++) yTicks.push(y);

  const displayPoints = mode === "plot" ? plotted : staticPoints;

  return (
    <div className="flex flex-col items-center gap-2 w-full" style={{ maxWidth: W }}>
      {/* Equation labels */}
      {parsedEqs.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-1">
          {parsedEqs.map((eq, i) => (
            <span key={i} className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ color: COLORS[i], background: `${COLORS[i]}15`, border: `1px solid ${COLORS[i]}33` }}>
              {eq.raw}
            </span>
          ))}
        </div>
      )}

      {mode === "plot" && !readOnly && (
        <p className="text-[10px] text-slate-400 font-semibold">Tap the grid to place or remove points</p>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full rounded-xl border border-slate-200 bg-white ${!readOnly && mode !== "static" ? "cursor-crosshair" : ""}`}
        onClick={handleClick}
      >
        {/* Grid lines */}
        {showGrid && xTicks.map(x => (
          <line key={`gx${x}`} x1={toX(x)} y1={PAD} x2={toX(x)} y2={H - PAD}
            stroke={x === 0 ? "#334155" : "#e2e8f0"} strokeWidth={x === 0 ? 1.5 : 0.5} />
        ))}
        {showGrid && yTicks.map(y => (
          <line key={`gy${y}`} x1={PAD} y1={toY(y)} x2={W - PAD} y2={toY(y)}
            stroke={y === 0 ? "#334155" : "#e2e8f0"} strokeWidth={y === 0 ? 1.5 : 0.5} />
        ))}

        {/* Axis labels */}
        {xTicks.filter(x => x !== 0 && x % 2 === 0).map(x => (
          <text key={`lx${x}`} x={toX(x)} y={toY(0) + 13} textAnchor="middle" fontSize="8" fill="#94a3b8">{x}</text>
        ))}
        {yTicks.filter(y => y !== 0 && y % 2 === 0).map(y => (
          <text key={`ly${y}`} x={toX(0) - 6} y={toY(y) + 3} textAnchor="end" fontSize="8" fill="#94a3b8">{y}</text>
        ))}
        <text x={W - PAD + 8} y={toY(0) + 4} fontSize="10" fontWeight="bold" fill="#334155">x</text>
        <text x={toX(0) + 6} y={PAD - 6} fontSize="10" fontWeight="bold" fill="#334155">y</text>

        {/* Equation lines */}
        {parsedEqs.map((eq, idx) => {
          if (eq.vertical) {
            return <line key={`eq${idx}`} x1={toX(eq.c)} y1={PAD} x2={toX(eq.c)} y2={H - PAD}
              stroke={COLORS[idx]} strokeWidth="2.5" strokeLinecap="round" />;
          }
          const pts = [];
          for (let px = xMin; px <= xMax; px += 0.1) {
            const py = eq.m * px + eq.c;
            if (py >= yMin - 1 && py <= yMax + 1) pts.push(`${toX(px)},${toY(py)}`);
          }
          return pts.length > 1 ? (
            <polyline key={`eq${idx}`} points={pts.join(" ")} fill="none"
              stroke={COLORS[idx]} strokeWidth="2.5" strokeLinecap="round" />
          ) : null;
        })}

        {/* Intersection point */}
        {intersection && intersection.x >= xMin && intersection.x <= xMax &&
          intersection.y >= yMin && intersection.y <= yMax && (
          <g>
            <circle cx={toX(intersection.x)} cy={toY(intersection.y)} r="6"
              fill="#f59e0b" stroke="#fff" strokeWidth="2" className="animate-pulse" />
            <text x={toX(intersection.x) + 9} y={toY(intersection.y) - 6}
              fontSize="9" fontWeight="bold" fill="#f59e0b">
              ({intersection.x % 1 === 0 ? intersection.x : intersection.x.toFixed(1)},
              {intersection.y % 1 === 0 ? ` ${intersection.y}` : ` ${intersection.y.toFixed(1)}`})
            </text>
          </g>
        )}

        {/* Display points */}
        {displayPoints.map((p, i) => (
          <g key={`pt${i}`}>
            <circle cx={toX(p.x)} cy={toY(p.y)} r="5" fill={COLORS[i % COLORS.length]}
              stroke="#fff" strokeWidth="2" />
            <text x={toX(p.x)} y={toY(p.y) - 8} textAnchor="middle"
              fontSize="8" fontWeight="bold" fill={COLORS[i % COLORS.length]}>
              {p.label || `(${p.x},${p.y})`}
            </text>
          </g>
        ))}
      </svg>

      {/* Controls */}
      {mode === "plot" && !readOnly && plotted.length > 0 && (
        <button
          onClick={() => { setPlotted([]); if (onPlot) onPlot([]); }}
          className="text-[10px] text-red-400 font-bold hover:text-red-600 transition-colors"
        >
          Clear all points
        </button>
      )}
    </div>
  );
}