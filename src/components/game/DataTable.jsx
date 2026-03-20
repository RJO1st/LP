"use client";
// ─── Deploy to: src/components/game/DataTable.jsx ────────────────────────────
// Renders a clean data table for questions that reference tabular data.
// Supports:
//   - Header + rows from question_data
//   - Column/row highlighting for emphasis
//   - Auto-extraction from pipe-separated text in question_text
//   - Sortable columns (optional)
//
// Props:
//   headers: ["Name", "Age", "Score"]
//   rows: [["Alice", "10", "85"], ["Bob", "11", "92"]]
//   title: "Class Test Results"
//   highlightCol: 2  (0-indexed, highlights a column)
//   highlightRow: 1  (0-indexed, highlights a row)
//   highlightCell: { row: 1, col: 2 } (highlights specific cell)
//   compact: boolean (smaller text for mobile)

import React from "react";

// ── Auto-extract table from pipe-separated text ──────────────────────────────
export function extractTableFromText(text) {
  if (!text) return null;
  const lines = text.split("\n").filter(l => l.includes("|"));
  if (lines.length < 2) return null;

  const parse = (line) => line.split("|").map(c => c.trim()).filter(Boolean);
  const headers = parse(lines[0]);
  // Skip separator lines (e.g., "|---|---|")
  const dataLines = lines.slice(1).filter(l => !/^[\s|:-]+$/.test(l));
  const rows = dataLines.map(parse).filter(r => r.length >= headers.length - 1);

  if (headers.length < 2 || rows.length < 1) return null;
  return { headers, rows };
}

// ── Auto-extract from label-value patterns ───────────────────────────────────
export function extractTableFromPatterns(text) {
  if (!text) return null;

  // "Monday: 5, Tuesday: 8, Wednesday: 3" patterns
  const kvPairs = [...(text.matchAll(/(\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Week|Day|Class|Group|Year|Term)\w*)\s*[:\-=]\s*(\d+)/gi))];
  if (kvPairs.length >= 2) {
    return {
      headers: ["Category", "Value"],
      rows: kvPairs.map(m => [m[1], m[2]]),
    };
  }

  return null;
}

export default function DataTable({
  headers = [],
  rows = [],
  title,
  highlightCol,
  highlightRow,
  highlightCell,
  compact = false,
}) {
  if (!headers.length && rows.length) {
    headers = rows[0].map((_, i) => `Column ${i + 1}`);
  }
  if (!rows.length) return null;

  const textSize = compact ? "text-[10px]" : "text-xs";
  const cellPad = compact ? "px-2 py-1" : "px-3 py-1.5";

  return (
    <div className="w-full max-w-[360px] mx-auto">
      {title && (
        <p className={`${textSize} font-black text-slate-700 mb-2 text-center`}>{title}</p>
      )}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className={`w-full ${textSize}`}>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {headers.map((h, ci) => {
                const isHighlight = highlightCol === ci;
                return (
                  <th key={ci} className={`${cellPad} font-black text-left
                    ${isHighlight ? "bg-indigo-50 text-indigo-700" : "text-slate-700"}`}>
                    {h}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const isRowHighlight = highlightRow === ri;
              return (
                <tr key={ri} className={`
                  ${ri % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                  ${isRowHighlight ? "bg-amber-50" : ""}
                `}>
                  {row.map((cell, ci) => {
                    const isCellHighlight = highlightCell?.row === ri && highlightCell?.col === ci;
                    const isColHighlight = highlightCol === ci;
                    return (
                      <td key={ci} className={`${cellPad} font-semibold border-b border-slate-100
                        ${isColHighlight ? "bg-indigo-50/50 text-indigo-600" : "text-slate-600"}
                        ${isRowHighlight && isColHighlight ? "bg-amber-100 text-amber-800 font-black" : ""}
                        ${isCellHighlight ? "bg-amber-200 text-amber-900 font-black ring-2 ring-amber-400 ring-inset" : ""}
                      `}>
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}