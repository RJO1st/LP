"use client";
/**
 * ExcalidrawQuestion.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Drawing-based question type using Excalidraw.
 *
 * Scholars see the question prompt and an embedded Excalidraw canvas where they
 * sketch their answer (e.g. "Draw a right-angled triangle", "Sketch the water
 * cycle", "Draw a bar chart showing…").
 *
 * The component captures the scene JSON + a PNG export for AI validation.
 * Adapts styling to the age band (KS1 = warm/playful, KS4 = clean/exam-style).
 *
 * Props:
 *   question       — question text string
 *   band           — "ks1" | "ks2" | "ks3" | "ks4"
 *   showResult     — boolean, true after submission
 *   isCorrect      — boolean | null, result of AI validation
 *   explanation    — string, shown after submission
 *   onDrawingSubmit — (drawingData) => void  — parent handles persistence
 *   disabled       — boolean, lock canvas after submission
 */

import React, { useState, useRef, useCallback, useEffect } from "react";

// ─── AGE-BAND THEMES ────────────────────────────────────────────────────────
const BAND_THEMES = {
  ks1: {
    label: "Draw your answer!",
    bg: "bg-amber-50",
    border: "border-amber-300",
    accent: "#f59e0b",
    buttonBg: "bg-amber-500 hover:bg-amber-600",
    canvasHeight: 320,
    toolbarSimple: true,
    fontSize: "text-lg",
  },
  ks2: {
    label: "Sketch your answer, Commander!",
    bg: "bg-slate-900",
    border: "border-cyan-500/30",
    accent: "#22d3ee",
    buttonBg: "bg-cyan-600 hover:bg-cyan-700",
    canvasHeight: 380,
    toolbarSimple: false,
    fontSize: "text-base",
  },
  ks3: {
    label: "Draw your response",
    bg: "bg-white",
    border: "border-slate-300",
    accent: "#6366f1",
    buttonBg: "bg-indigo-600 hover:bg-indigo-700",
    canvasHeight: 400,
    toolbarSimple: false,
    fontSize: "text-sm",
  },
  ks4: {
    label: "Diagram / Sketch",
    bg: "bg-white",
    border: "border-slate-200",
    accent: "#7c3aed",
    buttonBg: "bg-violet-600 hover:bg-violet-700",
    canvasHeight: 420,
    toolbarSimple: false,
    fontSize: "text-sm",
  },
};

// ─── SIMPLE FALLBACK CANVAS (used if Excalidraw fails to load) ──────────────
function SimpleCanvas({ height, onDataChange, disabled }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [paths, setPaths] = useState([]);
  const currentPath = useRef([]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const startDraw = (e) => {
    if (disabled) return;
    setDrawing(true);
    currentPath.current = [getPos(e)];
  };

  const moveDraw = (e) => {
    if (!drawing || disabled) return;
    e.preventDefault();
    currentPath.current.push(getPos(e));
    draw();
  };

  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    const newPaths = [...paths, [...currentPath.current]];
    setPaths(newPaths);
    currentPath.current = [];
    onDataChange?.({ type: "simple_canvas", paths: newPaths });
  };

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw saved paths
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const path of paths) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
    }

    // Draw current path
    if (currentPath.current.length > 1) {
      ctx.strokeStyle = "#6366f1";
      ctx.beginPath();
      ctx.moveTo(currentPath.current[0].x, currentPath.current[0].y);
      for (let i = 1; i < currentPath.current.length; i++)
        ctx.lineTo(currentPath.current[i].x, currentPath.current[i].y);
      ctx.stroke();
    }
  }, [paths]);

  useEffect(() => { draw(); }, [draw]);

  const clear = () => {
    setPaths([]);
    currentPath.current = [];
    onDataChange?.({ type: "simple_canvas", paths: [] });
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    draw();
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={600}
        height={height}
        className="w-full rounded-xl border border-slate-200 bg-white cursor-crosshair touch-none"
        style={{ height }}
        onMouseDown={startDraw}
        onMouseMove={moveDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={moveDraw}
        onTouchEnd={endDraw}
      />
      {!disabled && (
        <button
          onClick={clear}
          className="absolute top-2 right-2 px-3 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function ExcalidrawQuestion({
  question,
  band = "ks2",
  showResult = false,
  isCorrect = null,
  explanation,
  onDrawingSubmit,
  disabled = false,
}) {
  const theme = BAND_THEMES[band] || BAND_THEMES.ks2;
  const [ExcalidrawComp, setExcalidrawComp] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const excalidrawRef = useRef(null);
  const drawingDataRef = useRef(null);

  // Dynamically import Excalidraw (it's a heavy client-only component)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("@excalidraw/excalidraw");
        if (!cancelled) {
          setExcalidrawComp(() => mod.Excalidraw);
        }
      } catch (err) {
        console.warn("[ExcalidrawQuestion] Failed to load Excalidraw, falling back to simple canvas:", err.message);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Handle Excalidraw scene changes
  const handleChange = useCallback((elements, appState) => {
    const nonDeleted = elements.filter(el => !el.isDeleted);
    setHasContent(nonDeleted.length > 0);
    drawingDataRef.current = {
      type: "excalidraw",
      elements: nonDeleted,
      appState: {
        viewBackgroundColor: appState.viewBackgroundColor,
        gridSize: appState.gridSize,
      },
    };
  }, []);

  // Export drawing as PNG data URL for AI validation
  const exportAsPng = useCallback(async () => {
    if (!excalidrawRef.current || !drawingDataRef.current?.elements?.length) return null;
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements: drawingDataRef.current.elements,
        appState: { exportBackground: true, viewBackgroundColor: "#ffffff" },
        files: null,
      });
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("[ExcalidrawQuestion] PNG export failed:", err.message);
      return null;
    }
  }, []);

  // Submit drawing
  const handleSubmit = useCallback(async () => {
    if (!hasContent || disabled) return;

    let pngDataUrl = null;
    if (drawingDataRef.current?.type === "excalidraw") {
      pngDataUrl = await exportAsPng();
    }

    onDrawingSubmit?.({
      sceneData: drawingDataRef.current,
      pngDataUrl,
      elementCount: drawingDataRef.current?.elements?.length || drawingDataRef.current?.paths?.length || 0,
      timestamp: Date.now(),
    });
  }, [hasContent, disabled, exportAsPng, onDrawingSubmit]);

  // Result badge
  const resultBadge = showResult && isCorrect !== null ? (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${
      isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
    }`}>
      {isCorrect ? "✓ Great drawing!" : "✗ Not quite right"}
    </div>
  ) : null;

  // Excalidraw UI options per age band
  const excalidrawUIOptions = {
    canvasActions: {
      changeViewBackgroundColor: band !== "ks1",
      export: false,
      loadScene: false,
      saveToActiveFile: false,
      toggleTheme: false,
      saveAsImage: false,
    },
  };

  // Simplified initial data with grid for drawing questions
  const initialData = {
    appState: {
      viewBackgroundColor: "#ffffff",
      gridSize: 20,
      theme: band === "ks2" ? "dark" : "light",
    },
    elements: [],
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Drawing label */}
      <div className="flex items-center justify-between">
        <span className={`font-bold ${theme.fontSize}`} style={{ color: theme.accent }}>
          {band === "ks1" ? "🎨 " : "✏️ "}{theme.label}
        </span>
        {hasContent && !showResult && (
          <span className="text-xs text-slate-400 font-medium">
            {drawingDataRef.current?.elements?.length || 0} elements
          </span>
        )}
      </div>

      {/* Canvas area */}
      <div
        className={`relative rounded-2xl overflow-hidden ${theme.border} border-2 transition-all ${
          showResult && isCorrect !== null
            ? isCorrect ? "ring-2 ring-emerald-400" : "ring-2 ring-rose-400"
            : ""
        }`}
        style={{ height: theme.canvasHeight }}
      >
        {ExcalidrawComp && !loadError ? (
          <ExcalidrawComp
            ref={excalidrawRef}
            onChange={handleChange}
            initialData={initialData}
            UIOptions={excalidrawUIOptions}
            viewModeEnabled={disabled || showResult}
            zenModeEnabled={band === "ks1"}
            gridModeEnabled={true}
          />
        ) : (
          <SimpleCanvas
            height={theme.canvasHeight}
            onDataChange={(data) => {
              drawingDataRef.current = data;
              setHasContent((data?.paths?.length || 0) > 0);
            }}
            disabled={disabled || showResult}
          />
        )}

        {/* Overlay when showing result */}
        {showResult && (
          <div className="absolute inset-0 bg-white/10 pointer-events-none" />
        )}
      </div>

      {/* Result + explanation */}
      {showResult && (
        <div className="space-y-2">
          {resultBadge}
          {explanation && (
            <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600 leading-relaxed border border-slate-200">
              {explanation}
            </div>
          )}
        </div>
      )}

      {/* Submit button (only shown if parent doesn't handle it externally) */}
      {!showResult && onDrawingSubmit && (
        <button
          onClick={handleSubmit}
          disabled={!hasContent || disabled}
          className={`w-full py-3 rounded-xl font-bold text-white transition-all active:scale-[0.98] ${theme.buttonBg} ${
            !hasContent ? "opacity-40 cursor-not-allowed" : "shadow-lg"
          }`}
        >
          {band === "ks1" ? "Done! Show my drawing ✨" : "Submit Drawing"}
        </button>
      )}
    </div>
  );
}
