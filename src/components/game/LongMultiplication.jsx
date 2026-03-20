"use client";
// ─── Deploy to: src/components/game/LongMultiplication.jsx ───────────────────
import React, { useState } from "react";

export default function LongMultiplication({
  num1, num2, mode = "display", showPartialProducts = true, onAnswer,
}) {
  const a = parseInt(num1) || 0;
  const b = parseInt(num2) || 0;
  const product = a * b;
  const aStr = String(a);
  const bStr = String(b);

  // Partial products
  const partials = bStr.split("").reverse().map((d, place) => {
    const val = parseInt(d) * a * Math.pow(10, place);
    return { digit: d, place, value: val, display: String(val),
      note: `${a} × ${d}${place > 0 ? "0".repeat(place) : ""}` };
  });

  // Interactive state
  const [inputs, setInputs] = useState({});
  const handleInput = (idx, value) => {
    const next = { ...inputs, [idx]: value };
    setInputs(next);
    if (Object.keys(next).length === partials.length && onAnswer)
      onAnswer(Object.values(next).reduce((s, v) => s + (parseInt(v) || 0), 0));
  };

  // Layout — explicit y cursor, no overlap possible
  const maxLen = Math.max(String(product).length, aStr.length, bStr.length) + 1;
  const CELL = 28;
  const cols = maxLen + 1;
  const W = cols * CELL + 50;
  let y = 0;

  const topNumY    = (y += 28);
  const bottomNumY = (y += 32);
  const line1Y     = (y += 14);
  y += 6;

  const partialYs = partials.map(() => (y += 30));

  let line2Y = null;
  if (showPartialProducts && partials.length > 1) { y += 8; line2Y = (y += 2); y += 6; }

  const answerY = (y += 30);
  const H = y + 14;

  // Right-align digits
  const renderDigits = (str, atY, color = "#1e293b", bold = false) =>
    str.split("").map((ch, i) => {
      const col = cols - str.length + i;
      return (
        <text key={`${atY}-${i}`} x={col * CELL + CELL / 2} y={atY}
          textAnchor="middle" fontSize="15" fontWeight={bold ? "900" : "bold"} fill={color}>
          {ch}
        </text>
      );
    });

  return (
    <div className="flex flex-col items-center gap-1 w-full" style={{ maxWidth: Math.max(W, 220) }}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Long Multiplication</p>
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full"
          role="img" aria-label={`Long multiplication: ${a} × ${b}`}>

          {renderDigits(aStr, topNumY)}

          <text x={CELL / 2} y={bottomNumY} textAnchor="middle" fontSize="15" fontWeight="bold" fill="#6366f1">×</text>
          {renderDigits(bStr, bottomNumY)}

          <line x1={4} y1={line1Y} x2={cols * CELL + 4} y2={line1Y} stroke="#334155" strokeWidth="2" />

          {showPartialProducts && partials.map((pp, idx) => {
            const py = partialYs[idx];
            if (mode === "interactive") {
              return (
                <foreignObject key={idx} x={0} y={py - 18} width={W} height={26}>
                  <div className="flex items-center justify-end gap-2 h-full pr-1">
                    <span className="text-[9px] text-slate-400 shrink-0">{pp.note}</span>
                    <input type="text" className="w-20 text-right text-sm font-bold border border-slate-300 rounded px-1.5 py-0.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                      placeholder="?" onChange={(e) => handleInput(idx, e.target.value)} value={inputs[idx] || ""} />
                  </div>
                </foreignObject>
              );
            }
            return (
              <g key={idx}>
                {renderDigits(pp.display, py, "#6366f1")}
                {idx > 0 && <text x={CELL / 2} y={py} textAnchor="middle" fontSize="13" fill="#94a3b8">+</text>}
                <text x={cols * CELL + 12} y={py} fontSize="8" fill="#94a3b8">{pp.note}</text>
              </g>
            );
          })}

          {line2Y && <line x1={4} y1={line2Y} x2={cols * CELL + 4} y2={line2Y} stroke="#334155" strokeWidth="1.5" />}

          {String(product).split("").map((_, i) => {
            const chars = String(product).length;
            const col = cols - chars + i;
            return <text key={`a${i}`} x={col * CELL + CELL / 2} y={answerY}
              textAnchor="middle" fontSize="17" fontWeight="900" fill="#f59e0b">?</text>;
          })}
        </svg>
      </div>
    </div>
  );
}