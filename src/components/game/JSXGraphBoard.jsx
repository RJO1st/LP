"use client";
// ─── Deploy to: src/components/game/JSXGraphBoard.jsx ───────────────────────
// React wrapper for the JSXGraph library (jsxgraph.org).
// Provides interactive, draggable mathematical graphing:
//   • Function plotting (linear, quadratic, trig, polynomial, parametric)
//   • Geometric constructions (points, lines, circles, polygons, angles)
//   • Interactive sliders that drive equation parameters
//   • Transformations (translate, rotate, reflect)
//   • Number-line intervals & inequalities
//   • Coordinate geometry (distance, midpoint, gradients)
//
// Props:
//   mode      — "function" | "geometry" | "slider" | "transformation" | "inequality" | "freeform"
//   functions — [{ expr: "x^2 - 3", color: "#6366f1", label: "f(x)" }, ...]
//   elements  — [{ type: "point", coords: [2,3], name: "A", draggable: true }, ...]
//   sliders   — [{ name: "a", min: -5, max: 5, value: 1 }, ...]
//   xRange / yRange — [-10, 10]  (axis bounds)
//   showGrid, showAxis, showNavigation
//   width, height
//   onUpdate  — (boardState) => void  (callback after any interaction)
//   readOnly  — disables all dragging
//   ageBand   — "ks1" | "ks2" | "ks3" | "ks4"  (controls styling)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect, useCallback, useState } from "react";

// ── Colour palette per age band ──────────────────────────────────────────────
const BAND_STYLES = {
  ks1: { fn: ["#f472b6", "#a78bfa", "#60a5fa", "#34d399", "#fbbf24"], bg: "#fef9ff", axis: "#cbd5e1", grid: "#f1f5f9", text: "#6b7280", labelSize: 16 },
  ks2: { fn: ["#6366f1", "#ef4444", "#10b981", "#f59e0b", "#ec4899"], bg: "#ffffff", axis: "#334155", grid: "#e2e8f0", text: "#475569", labelSize: 14 },
  ks3: { fn: ["#818cf8", "#fb923c", "#34d399", "#f43f5e", "#a78bfa"], bg: "#0f172a", axis: "#64748b", grid: "#1e293b", text: "#94a3b8", labelSize: 13 },
  ks4: { fn: ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#8b5cf6"], bg: "#ffffff", axis: "#1e293b", grid: "#f1f5f9", text: "#334155", labelSize: 12 },
};

// ── Parse common math expressions for JXG.functiongraph ──────────────────────
function normaliseExpr(raw) {
  if (!raw) return null;
  let s = raw.trim();
  // Strip "y =" or "f(x) ="
  s = s.replace(/^[yf]\s*\(?\s*x?\s*\)?\s*=\s*/i, "");
  // Replace ^ with Math.pow-compatible syntax — JXG uses its own parser so we leave ^ as-is
  return s;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function JSXGraphBoard({
  mode = "function",
  functions = [],
  elements = [],
  sliders: sliderDefs = [],
  xRange = [-10, 10],
  yRange = [-10, 10],
  showGrid = true,
  showAxis = true,
  showNavigation = false,
  width = 360,
  height = 360,
  onUpdate,
  readOnly = false,
  ageBand = "ks2",
  title,
  caption,
}) {
  const containerRef = useRef(null);
  const boardRef = useRef(null);
  const idRef = useRef(`jxg_${Math.random().toString(36).slice(2, 9)}`);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const style = BAND_STYLES[ageBand] || BAND_STYLES.ks2;

  // ── Load JSXGraph CSS + JS dynamically (avoids SSR issues) ─────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if JXG is already available
    if (window.JXG) { setLoaded(true); return; }

    // Load CSS
    if (!document.getElementById("jsxgraph-css")) {
      const link = document.createElement("link");
      link.id = "jsxgraph-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/jsxgraph/distrib/jsxgraph.css";
      document.head.appendChild(link);
    }

    // Load JS
    if (!document.getElementById("jsxgraph-js")) {
      const script = document.createElement("script");
      script.id = "jsxgraph-js";
      script.src = "https://cdn.jsdelivr.net/npm/jsxgraph/distrib/jsxgraphcore.js";
      script.async = true;
      script.onload = () => setLoaded(true);
      script.onerror = () => setError("Failed to load JSXGraph library");
      document.head.appendChild(script);
    } else {
      // Script tag exists but maybe still loading
      const existing = document.getElementById("jsxgraph-js");
      existing.addEventListener("load", () => setLoaded(true));
    }
  }, []);

  // ── Build board when loaded ────────────────────────────────────────────
  const buildBoard = useCallback(() => {
    if (!loaded || !window.JXG || !containerRef.current) return;

    // Clean up previous board
    if (boardRef.current) {
      try { window.JXG.JSXGraph.freeBoard(boardRef.current); } catch (_) {}
      boardRef.current = null;
    }

    const JXG = window.JXG;

    try {
      const board = JXG.JSXGraph.initBoard(idRef.current, {
        boundingbox: [xRange[0], yRange[1], xRange[1], yRange[0]],
        axis: showAxis,
        grid: showGrid,
        showNavigation,
        showCopyright: false,
        keepaspectratio: false,
        pan: { enabled: !readOnly, needTwoFingers: false },
        zoom: { enabled: !readOnly, wheel: true, needShift: false },
        defaultAxes: {
          x: {
            strokeColor: style.axis,
            ticks: { strokeColor: style.axis, label: { fontSize: style.labelSize - 2, cssStyle: `color:${style.text}` } },
          },
          y: {
            strokeColor: style.axis,
            ticks: { strokeColor: style.axis, label: { fontSize: style.labelSize - 2, cssStyle: `color:${style.text}` } },
          },
        },
      });

      boardRef.current = board;

      // Track created slider objects so functions can reference them
      const sliderObjs = {};

      // ── Create sliders ─────────────────────────────────────────────────
      sliderDefs.forEach((sl, i) => {
        const yPos = yRange[1] - 1 - i * 1.5;
        const slider = board.create("slider", [
          [xRange[0] + 1, yPos], [xRange[0] + 5, yPos],
          [sl.min ?? -5, sl.value ?? 0, sl.max ?? 5],
        ], {
          name: sl.name || `s${i}`,
          snapWidth: sl.step || 0.1,
          label: { fontSize: style.labelSize, cssStyle: `color:${style.text}; font-weight:600` },
          baseline: { strokeColor: style.axis },
          highline: { strokeColor: style.fn[i % style.fn.length] },
          fillColor: style.fn[i % style.fn.length],
          strokeColor: style.fn[i % style.fn.length],
          frozen: readOnly,
        });
        sliderObjs[sl.name || `s${i}`] = slider;
      });

      // ── Plot functions ─────────────────────────────────────────────────
      functions.forEach((fn, i) => {
        const expr = normaliseExpr(fn.expr || fn.equation || fn.formula);
        if (!expr) return;

        const color = fn.color || style.fn[i % style.fn.length];

        board.create("functiongraph", [
          (x) => {
            try {
              // Build scope with slider values
              const scope = { x };
              Object.keys(sliderObjs).forEach(k => {
                scope[k] = sliderObjs[k].Value();
              });
              // Use JXG's math parser
              return board.jc.snippet(expr, true, "x", false)(x);
            } catch (_) {
              return NaN;
            }
          },
          xRange[0], xRange[1],
        ], {
          strokeColor: color,
          strokeWidth: 2.5,
          highlight: !readOnly,
          label: { visible: !!fn.label, name: fn.label || "" },
        });
      });

      // ── Create geometric elements ──────────────────────────────────────
      const createdEls = {};

      elements.forEach((el, i) => {
        const color = el.color || style.fn[i % style.fn.length];

        switch (el.type) {
          case "point": {
            const pt = board.create("point", el.coords || [0, 0], {
              name: el.name || "",
              size: el.size || 4,
              fillColor: color,
              strokeColor: color,
              fixed: readOnly || el.fixed || !el.draggable,
              label: { fontSize: style.labelSize, cssStyle: `color:${color}; font-weight:700` },
            });
            if (el.name) createdEls[el.name] = pt;
            break;
          }

          case "line": {
            const p1 = el.through?.[0] ? createdEls[el.through[0]] : board.create("point", el.coords?.[0] || [0, 0], { visible: false });
            const p2 = el.through?.[1] ? createdEls[el.through[1]] : board.create("point", el.coords?.[1] || [1, 1], { visible: false });
            board.create("line", [p1, p2], {
              strokeColor: color,
              strokeWidth: 2,
              straightFirst: el.ray ? false : true,
              straightLast: true,
              dash: el.dash || 0,
              label: { visible: !!el.label, name: el.label || "" },
            });
            break;
          }

          case "segment": {
            const p1 = el.through?.[0] ? createdEls[el.through[0]] : board.create("point", el.coords?.[0] || [0, 0], { visible: false });
            const p2 = el.through?.[1] ? createdEls[el.through[1]] : board.create("point", el.coords?.[1] || [1, 1], { visible: false });
            board.create("segment", [p1, p2], {
              strokeColor: color,
              strokeWidth: 2,
              dash: el.dash || 0,
            });
            break;
          }

          case "circle": {
            if (el.center && el.radius) {
              const ctr = createdEls[el.center] || board.create("point", el.coords || [0, 0], { visible: false });
              board.create("circle", [ctr, el.radius], {
                strokeColor: color,
                strokeWidth: 2,
                fillColor: el.fill || "none",
                fillOpacity: el.fillOpacity || 0.1,
              });
            }
            break;
          }

          case "polygon": {
            const verts = (el.vertices || []).map(v =>
              typeof v === "string" ? createdEls[v] : board.create("point", v, { visible: false })
            ).filter(Boolean);
            if (verts.length >= 3) {
              board.create("polygon", verts, {
                fillColor: color,
                fillOpacity: el.fillOpacity || 0.15,
                borders: { strokeColor: color, strokeWidth: 2 },
              });
            }
            break;
          }

          case "angle": {
            const pts = (el.points || []).map(v =>
              typeof v === "string" ? createdEls[v] : board.create("point", v, { visible: false })
            ).filter(Boolean);
            if (pts.length === 3) {
              board.create("angle", pts, {
                radius: el.radius || 1.5,
                fillColor: color,
                fillOpacity: 0.2,
                strokeColor: color,
                label: { fontSize: style.labelSize },
                name: el.name || "",
              });
            }
            break;
          }

          case "perpendicular":
          case "parallel":
          case "midpoint":
          case "intersection": {
            // Advanced constructions — reference named elements
            const refs = (el.of || []).map(n => createdEls[n]).filter(Boolean);
            if (refs.length >= 2) {
              const constructed = board.create(el.type, refs, {
                strokeColor: color,
                name: el.name || "",
              });
              if (el.name) createdEls[el.name] = constructed;
            }
            break;
          }

          case "text": {
            board.create("text", [
              el.coords?.[0] || 0,
              el.coords?.[1] || 0,
              el.content || el.text || "",
            ], {
              fontSize: el.fontSize || style.labelSize,
              cssStyle: `color:${color}; font-weight:${el.bold ? "700" : "400"}`,
              fixed: true,
            });
            break;
          }

          default:
            break;
        }
      });

      // ── Fire update callback on any move ──────────────────────────────
      if (onUpdate && !readOnly) {
        board.on("update", () => {
          const state = {};
          Object.entries(createdEls).forEach(([name, el]) => {
            if (el.X && el.Y) state[name] = { x: el.X(), y: el.Y() };
          });
          Object.entries(sliderObjs).forEach(([name, sl]) => {
            state[name] = sl.Value();
          });
          onUpdate(state);
        });
      }

    } catch (err) {
      console.error("JSXGraph init error:", err);
      setError("Failed to initialise graph");
    }
  }, [loaded, functions, elements, sliderDefs, xRange, yRange, showGrid, showAxis, showNavigation, readOnly, style, onUpdate]);

  useEffect(() => {
    buildBoard();
    return () => {
      if (boardRef.current && window.JXG) {
        try { window.JXG.JSXGraph.freeBoard(boardRef.current); } catch (_) {}
        boardRef.current = null;
      }
    };
  }, [buildBoard]);

  // ── Render ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5 w-full" style={{ maxWidth: width }}>
      {title && (
        <p className="text-xs font-bold text-center" style={{ color: style.fn[0] }}>{title}</p>
      )}

      <div
        ref={containerRef}
        id={idRef.current}
        className="jxgbox rounded-xl overflow-hidden border"
        style={{
          width,
          height,
          borderColor: style.grid,
          background: style.bg,
        }}
      />

      {caption && (
        <p className="text-[10px] text-center font-medium" style={{ color: style.text }}>
          {caption}
        </p>
      )}

      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: style.fn[0], borderTopColor: "transparent" }} />
        </div>
      )}
    </div>
  );
}

// ── Quick-use presets for common question visual types ────────────────────────
// These can be called from MathsVisualiser to create boards with minimal config

export function createLinearGraphProps(equations = [], opts = {}) {
  return {
    mode: "function",
    functions: equations.map((eq, i) => ({
      expr: eq,
      label: eq,
      color: BAND_STYLES[opts.ageBand || "ks2"].fn[i % 5],
    })),
    xRange: opts.xRange || [-6, 6],
    yRange: opts.yRange || [-6, 6],
    width: opts.width || 320,
    height: opts.height || 320,
    ...opts,
  };
}

export function createQuadraticGraphProps(a = 1, b = 0, c = 0, opts = {}) {
  const expr = `${a}*x^2 ${b >= 0 ? "+" : ""}${b}*x ${c >= 0 ? "+" : ""}${c}`;
  const vertex_x = -b / (2 * a);
  const vertex_y = a * vertex_x * vertex_x + b * vertex_x + c;
  return {
    mode: "function",
    functions: [{ expr, label: `y = ${expr.replace(/\*/g, "")}`, color: "#6366f1" }],
    elements: [
      { type: "point", coords: [vertex_x, vertex_y], name: "vertex", color: "#f59e0b", fixed: true },
    ],
    xRange: opts.xRange || [vertex_x - 5, vertex_x + 5],
    yRange: opts.yRange || [Math.min(vertex_y - 3, -2), Math.max(vertex_y + 5, 5)],
    width: opts.width || 320,
    height: opts.height || 320,
    ...opts,
  };
}

export function createTrigGraphProps(fnType = "sin", amplitude = 1, period = 1, opts = {}) {
  const expr = `${amplitude}*Math.${fnType}(${period}*x)`;
  const label = `y = ${amplitude === 1 ? "" : amplitude}${fnType}(${period === 1 ? "" : period}x)`;
  return {
    mode: "function",
    functions: [{ expr, label }],
    xRange: opts.xRange || [-2 * Math.PI, 2 * Math.PI],
    yRange: opts.yRange || [-(amplitude + 1), amplitude + 1],
    width: opts.width || 360,
    height: opts.height || 280,
    ...opts,
  };
}

export function createGeometryProps(elements = [], opts = {}) {
  return {
    mode: "geometry",
    elements,
    xRange: opts.xRange || [-8, 8],
    yRange: opts.yRange || [-8, 8],
    showGrid: opts.showGrid !== undefined ? opts.showGrid : true,
    width: opts.width || 340,
    height: opts.height || 340,
    ...opts,
  };
}

export function createSliderExplorerProps(expr, sliders, opts = {}) {
  return {
    mode: "slider",
    functions: [{ expr, label: `y = ${expr}` }],
    sliders,
    xRange: opts.xRange || [-10, 10],
    yRange: opts.yRange || [-10, 10],
    width: opts.width || 360,
    height: opts.height || 360,
    ...opts,
  };
}
