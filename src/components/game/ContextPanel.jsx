"use client";
/**
 * ContextPanel.jsx
 * Deploy to: src/app/components/game/ContextPanel.jsx
 *
 * The shared LEFT-PANEL anchor that persists across questions in a set.
 * Renders whichever content types are present:
 *   • image_url     → responsive diagram / photograph
 *   • latex_formulas → KaTeX-rendered mathematics (loaded via CDN)
 *   • svg_content   → inline SVG (vectors, circuit diagrams, graphs)
 *   • data_table    → structured table with header row
 *   • passage text  → formatted readable text (for reading comprehension)
 *
 * Usage:
 *   <ContextPanel anchor={anchorObj} theme={theme} />
 *   <ContextPanel passage={{ title, body }} theme={theme} />
 *
 * anchor shape: { title, description, image_url, latex_formulas, svg_content, data_table }
 * passage shape: { title, body }
 * theme shape: { bg, border, text, accent } — from engine THEMES
 */

import React, { useEffect, useRef, useState } from "react";
import { ImageOff, BookOpen, FlaskConical, Table2, FunctionSquare } from "lucide-react";
import DOMPurify from "dompurify";

// ── KaTeX lazy loader ─────────────────────────────────────────────────────────
let katexLoaded  = false;
let katexLoading = false;
let katexCallbacks = [];

function loadKaTeX() {
  return new Promise((resolve) => {
    if (katexLoaded && window.katex) { resolve(window.katex); return; }
    katexCallbacks.push(resolve);
    if (katexLoading) return;
    katexLoading = true;

    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src   = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js";
    script.onload = () => {
      katexLoaded  = true;
      katexLoading = false;
      katexCallbacks.forEach(cb => cb(window.katex));
      katexCallbacks = [];
    };
    script.onerror = () => {
      katexLoading = false;
      katexCallbacks.forEach(cb => cb(null));
      katexCallbacks = [];
    };
    document.head.appendChild(script);
  });
}

// ── Formula component ─────────────────────────────────────────────────────────
function Formula({ latex, display = false }) {
  const ref  = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadKaTeX().then(katex => {
      if (cancelled || !ref.current || !katex) return;
      try {
        katex.render(latex, ref.current, {
          displayMode:  display,
          throwOnError: false,
          trust:        false,
        });
      } catch { setError(true); }
    });
    return () => { cancelled = true; };
  }, [latex, display]);

  if (error) {
    return (
      <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
        {latex}
      </code>
    );
  }
  return <span ref={ref} className={display ? "block my-2 text-center" : "inline"} />;
}

// ── Diagram image ─────────────────────────────────────────────────────────────
function DiagramImage({ src, alt }) {
  const [loaded,  setLoaded]  = useState(false);
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="w-full flex items-center justify-center bg-slate-100 rounded-xl border border-dashed border-slate-300 p-8 text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <ImageOff size={28} />
          <span className="text-xs font-bold">Diagram unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-white">
      {!loaded && (
        <div className="flex items-center justify-center bg-slate-50 animate-pulse" style={{ minHeight: 180 }}>
          <div className="w-8 h-8 rounded-full border-4 border-slate-300 border-t-slate-600 animate-spin" />
        </div>
      )}
      <img
        src={src} alt={alt || "Diagram"}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={`w-full h-auto object-contain max-h-72 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0 absolute inset-0"}`}
      />
    </div>
  );
}

// ── Inline SVG panel ──────────────────────────────────────────────────────────
function SVGDiagram({ svgContent }) {
  // Sanitize SVG content from database to prevent XSS attacks
  const sanitizedSVG = DOMPurify.sanitize(svgContent, {
    USE_PROFILES: { svg: true, svgFilters: true }
  });

  return (
    <div
      className="w-full bg-white rounded-xl border border-slate-200 p-3 overflow-auto"
      style={{ maxHeight: 280 }}
      dangerouslySetInnerHTML={{ __html: sanitizedSVG }}
    />
  );
}

// ── Data table ────────────────────────────────────────────────────────────────
function DataTable({ table, accent }) {
  const { headers = [], rows = [] } = table;
  if (!headers.length && !rows.length) return null;

  return (
    <div className="w-full overflow-auto rounded-xl border border-slate-200">
      <table className="w-full text-xs font-bold border-collapse">
        {headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-3 py-2 text-left border-b border-slate-200 bg-slate-50 ${accent} uppercase tracking-wide text-[10px]`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 border-b border-slate-100 text-slate-700">
                  {/* Detect inline LaTeX in cell: $...$ */}
                  {typeof cell === "string" && cell.includes("$")
                    ? cell.split(/(\$[^$]+\$)/g).map((part, pi) =>
                        part.startsWith("$") && part.endsWith("$")
                          ? <Formula key={pi} latex={part.slice(1, -1)} display={false} />
                          : part
                      )
                    : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Passage text ──────────────────────────────────────────────────────────────
function PassageText({ body }) {
  return (
    <div className="space-y-3">
      {body.split(/\n\n+/).map((para, i) => (
        <p key={i} className="text-sm text-slate-700 font-medium leading-relaxed">
          {para}
        </p>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ContextPanel({ anchor, passage, theme = {}, className = "" }) {
  const { bg = "bg-slate-50", border = "border-slate-200", text = "text-slate-900", accent = "text-slate-600" } = theme;

  // Passage mode (reading comprehension)
  if (passage) {
    return (
      <div className={`flex flex-col h-full overflow-hidden ${bg} border-r ${border} ${className}`}>
        {/* Panel header */}
        <div className={`px-5 py-3 border-b ${border} flex items-center gap-2 shrink-0`}>
          <div className={`p-1.5 rounded-lg bg-white border ${border}`}>
            <BookOpen size={14} className={accent} />
          </div>
          <div>
            <h2 className={`text-sm font-black leading-none ${text}`}>{passage.title || "Reading Passage"}</h2>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Read carefully</span>
          </div>
        </div>
        {/* Scrollable text */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <PassageText body={passage.body} />
        </div>
      </div>
    );
  }

  if (!anchor) return null;

  const hasImage    = !!anchor.image_url;
  const hasFormulas = anchor.latex_formulas?.length > 0;
  const hasSVG      = !!anchor.svg_content;
  const hasTable    = !!anchor.data_table?.headers?.length || !!anchor.data_table?.rows?.length;

  return (
    <div className={`flex flex-col h-full overflow-hidden ${bg} border-r ${border} ${className}`}>
      {/* Panel header */}
      <div className={`px-4 sm:px-5 py-3 border-b ${border} flex items-center gap-2 shrink-0`}>
        <div className={`p-1.5 rounded-lg bg-white border ${border}`}>
          {hasImage    ? <FlaskConical size={14} className={accent} /> :
           hasFormulas ? <FunctionSquare size={14} className={accent} /> :
           hasTable    ? <Table2 size={14} className={accent} /> :
                         <BookOpen size={14} className={accent} />}
        </div>
        <div>
          <h2 className={`text-sm font-black leading-none ${text}`}>{anchor.title || "Context"}</h2>
          {anchor.description && (
            <span className="text-[10px] font-bold text-slate-400 leading-tight block mt-0.5 max-w-[220px] truncate">
              {anchor.description}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">

        {/* 1. Diagram / photograph */}
        {hasImage && (
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Diagram</span>
            <DiagramImage src={anchor.image_url} alt={anchor.title} />
          </div>
        )}

        {/* 2. SVG vector diagram */}
        {hasSVG && (
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Diagram</span>
            <SVGDiagram svgContent={anchor.svg_content} />
          </div>
        )}

        {/* 3. LaTeX formulas */}
        {hasFormulas && (
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Formulae</span>
            <div className="space-y-2">
              {anchor.latex_formulas.map((f, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-center shadow-sm">
                  <Formula latex={f} display={true} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Data table */}
        {hasTable && (
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Data</span>
            <DataTable table={anchor.data_table} accent={accent} />
          </div>
        )}

        {/* 5. Description (if no other content, or as supplement) */}
        {anchor.description && !hasImage && !hasSVG && !hasFormulas && !hasTable && (
          <p className="text-sm text-slate-600 font-medium leading-relaxed bg-white rounded-xl p-4 border border-slate-200">
            {anchor.description}
          </p>
        )}
      </div>
    </div>
  );
}