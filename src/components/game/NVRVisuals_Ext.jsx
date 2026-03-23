"use client";
// ─── Deploy to: src/components/game/NVRVisuals_Ext.jsx ──────────────────────
// Extended NVR visual components.
// Import in MathsVisualiser:
//   import { NVRShapeRotationVis, NVRCodeVis, NVRPlanElevationVis }
//     from "./NVRVisuals_Ext";
import React from "react";

const T = {
  indigo: "#4f46e5", indigoBg: "#eef2ff", indigoBd: "#c7d2fe",
  cyan:   "#0891b2", cyanBg:   "#ecfeff", cyanBd:   "#a5f3fc",
  nebula: "#9333ea", nebulaBg: "#f5f3ff", nebulaBd: "#ddd6fe",
  slate:  "#475569", slateBg:  "#f8fafc", slateBd:  "#e2e8f0",
  text:   "#1e293b", textMid:  "#64748b",
};

function Panel({ children, accent = T.cyan, bg, bd, ariaLabel }) {
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

// ── SVG Shape primitives ────────────────────────────────────────────────────
function drawShape(shape, cx, cy, size, fill, stroke, strokeWidth = 1.5) {
  const s = size;
  switch (shape) {
    case "triangle":
      return <polygon points={`${cx},${cy - s} ${cx - s},${cy + s * 0.7} ${cx + s},${cy + s * 0.7}`}
        fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    case "square":
      return <rect x={cx - s * 0.8} y={cy - s * 0.8} width={s * 1.6} height={s * 1.6}
        fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    case "pentagon": {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 72 - 90) * Math.PI / 180;
        return `${cx + s * Math.cos(a)},${cy + s * Math.sin(a)}`;
      }).join(" ");
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    }
    case "hexagon": {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 - 90) * Math.PI / 180;
        return `${cx + s * Math.cos(a)},${cy + s * Math.sin(a)}`;
      }).join(" ");
      return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    }
    case "circle":
      return <circle cx={cx} cy={cy} r={s} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    case "rectangle":
      return <rect x={cx - s * 1.2} y={cy - s * 0.7} width={s * 2.4} height={s * 1.4}
        fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    case "arrow":
      return <polygon points={`${cx},${cy - s} ${cx + s * 0.8},${cy + s * 0.3} ${cx + s * 0.3},${cy + s * 0.3} ${cx + s * 0.3},${cy + s} ${cx - s * 0.3},${cy + s} ${cx - s * 0.3},${cy + s * 0.3} ${cx - s * 0.8},${cy + s * 0.3}`}
        fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
    default: // star
      return <circle cx={cx} cy={cy} r={s} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ACTUAL SHAPE ROTATION (replaces generic arrow)
// ═══════════════════════════════════════════════════════════════════════════════
export function NVRShapeRotationVis({ shape = "triangle", degrees = 90, clockwise = true }) {
  const W = 220, H = 100;
  const rad = (degrees * Math.PI) / 180 * (clockwise ? 1 : -1);

  return (
    <Panel accent={T.cyan} bg={T.cyanBg} bd={T.cyanBd}
      ariaLabel={`Shape rotation: ${shape} rotated ${degrees}° ${clockwise ? "clockwise" : "anticlockwise"}`}>
      <Chip color={T.cyan} bg="white">Rotation: {degrees}° {clockwise ? "CW" : "ACW"}</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Original shape */}
        <g>
          {drawShape(shape, 55, 50, 22, T.cyanBg, T.cyan, 2)}
          <text x={55} y={90} textAnchor="middle" fontSize={8} fontWeight="700" fill={T.textMid}>Original</text>
        </g>

        {/* Rotation arrow */}
        <g>
          <path d={`M 90,40 C 100,25 120,25 130,40`}
            fill="none" stroke={T.slate} strokeWidth={1.5} markerEnd="url(#rot-arrow)" />
          <text x={110} y={22} textAnchor="middle" fontSize={8} fontWeight="700" fill={T.slate}>
            {degrees}° {clockwise ? "↻" : "↺"}
          </text>
        </g>

        {/* Rotated shape */}
        <g transform={`rotate(${degrees * (clockwise ? 1 : -1)}, 165, 50)`}>
          {drawShape(shape, 165, 50, 22, T.indigo + "22", T.indigo, 2)}
        </g>
        {/* "?" overlay */}
        <text x={165} y={55} textAnchor="middle" fontSize={18} fontWeight="900" fill={T.indigo} opacity={0.4}>?</text>
        <text x={165} y={90} textAnchor="middle" fontSize={8} fontWeight="700" fill={T.textMid}>Rotated</text>

        <defs><marker id="rot-arrow" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
          <polygon points="0 0, 6 2, 0 4" fill={T.slate} /></marker></defs>
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. LETTER/NUMBER CODE
// ═══════════════════════════════════════════════════════════════════════════════
export function NVRCodeVis({ encoded = "", decoded = "", codeType = "a1" }) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <Panel accent={T.nebula} bg={T.nebulaBg} bd={T.nebulaBd}
      ariaLabel={`Code cipher: ${encoded}`}>
      <Chip color={T.nebula} bg="white">Code Cipher</Chip>

      {/* Alphabet strip */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", maxWidth: 210 }}>
        {alphabet.map((letter, i) => {
          const num = i + 1;
          const isHighlighted = encoded.toUpperCase().includes(letter) || decoded.toUpperCase().includes(letter);
          return (
            <div key={i} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              width: 15, gap: 1,
            }}>
              <span style={{
                fontSize: 8, fontWeight: isHighlighted ? 800 : 500,
                color: isHighlighted ? T.nebula : T.textMid,
                background: isHighlighted ? T.nebula + "22" : "transparent",
                borderRadius: 2, padding: "0 1px",
              }}>{letter}</span>
              <span style={{ fontSize: 7, color: isHighlighted ? T.nebula : T.slateBd, fontWeight: 600 }}>{num}</span>
            </div>
          );
        })}
      </div>

      {/* Encoded sequence */}
      {encoded && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: T.textMid }}>Code:</span>
          <div style={{ display: "flex", gap: 3 }}>
            {encoded.split(/[\s-]+/).map((seg, i) => (
              <span key={i} style={{
                padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 800,
                background: T.nebula + "22", color: T.nebula, fontFamily: "'DM Mono', monospace",
              }}>{seg}</span>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PLAN & ELEVATION (2D views of 3D shapes)
// ═══════════════════════════════════════════════════════════════════════════════
export function NVRPlanElevationVis({ shape3d = "cuboid" }) {
  const W = 210, H = 120;
  const panelW = 56, panelH = 50, gap = 10;
  const startX = (W - (panelW * 3 + gap * 2)) / 2;

  const VIEWS = {
    cuboid: {
      plan:  { type: "rect", w: 40, h: 24 },
      front: { type: "rect", w: 40, h: 30 },
      side:  { type: "rect", w: 24, h: 30 },
    },
    cylinder: {
      plan:  { type: "circle", r: 16 },
      front: { type: "rect", w: 32, h: 40 },
      side:  { type: "rect", w: 32, h: 40 },
    },
    "l-shape": {
      plan:  { type: "l", w: 36, h: 36 },
      front: { type: "l", w: 36, h: 36 },
      side:  { type: "rect", w: 20, h: 36 },
    },
    triangular_prism: {
      plan:  { type: "rect", w: 40, h: 24 },
      front: { type: "triangle", w: 36, h: 30 },
      side:  { type: "rect", w: 24, h: 30 },
    },
  };

  const views = VIEWS[shape3d] || VIEWS.cuboid;
  const labels = ["Plan (top)", "Front", "Side"];
  const viewKeys = ["plan", "front", "side"];

  function renderView(view, cx, cy) {
    if (view.type === "rect") {
      return <rect x={cx - view.w / 2} y={cy - view.h / 2} width={view.w} height={view.h}
        fill={T.cyanBg} stroke={T.cyan} strokeWidth={1.5} rx={1} />;
    }
    if (view.type === "circle") {
      return <circle cx={cx} cy={cy} r={view.r} fill={T.cyanBg} stroke={T.cyan} strokeWidth={1.5} />;
    }
    if (view.type === "triangle") {
      return <polygon points={`${cx},${cy - view.h / 2} ${cx - view.w / 2},${cy + view.h / 2} ${cx + view.w / 2},${cy + view.h / 2}`}
        fill={T.cyanBg} stroke={T.cyan} strokeWidth={1.5} />;
    }
    if (view.type === "l") {
      const s = view.w;
      return <polygon points={`${cx - s / 2},${cy - s / 2} ${cx},${cy - s / 2} ${cx},${cy} ${cx + s / 2},${cy} ${cx + s / 2},${cy + s / 2} ${cx - s / 2},${cy + s / 2}`}
        fill={T.cyanBg} stroke={T.cyan} strokeWidth={1.5} />;
    }
    return null;
  }

  return (
    <Panel accent={T.cyan} bg={T.cyanBg} bd={T.cyanBd}
      ariaLabel={`Plan and elevation views of a ${shape3d}`}>
      <Chip color={T.cyan} bg="white">Plan &amp; Elevation</Chip>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {viewKeys.map((key, i) => {
          const x = startX + i * (panelW + gap);
          const cx = x + panelW / 2;
          const cy = 40;
          return (
            <g key={key}>
              {/* Panel border */}
              <rect x={x} y={10} width={panelW} height={panelH}
                fill="white" stroke={T.slateBd} strokeWidth={1} rx={4} />
              {/* Shape */}
              {renderView(views[key], cx, cy)}
              {/* Label */}
              <text x={cx} y={panelH + 22} textAnchor="middle"
                fontSize={7} fontWeight="700" fill={T.textMid}>{labels[i]}</text>
            </g>
          );
        })}
        {/* 3D label */}
        <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={7} fill={T.cyan} fontWeight="700">
          3D shape: {shape3d.replace(/_/g, " ")}
        </text>
      </svg>
    </Panel>
  );
}