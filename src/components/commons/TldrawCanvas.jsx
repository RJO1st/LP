"use client";
/**
 * TldrawCanvas.jsx — Learning Commons Drawing Canvas
 * Deploy to: src/components/commons/TldrawCanvas.jsx
 *
 * Wraps tldraw in an age-band themed canvas for freeform drawing, mind maps,
 * concept diagrams, and visual note-taking. Supports save/load via JSON snapshots.
 *
 * Props:
 *  - band: "ks1" | "ks2" | "ks3" | "ks4" — determines theme/styling
 *  - initialSnapshot: tldraw JSON snapshot for restoring a saved canvas (optional)
 *  - onSave: (snapshot) => void — called when scholar saves their work
 *  - onAutoSave: (snapshot) => void — called periodically for auto-save
 *  - title: string — document title shown in header
 *  - readOnly: boolean — disable editing (for viewing shared canvases)
 *  - className: string — additional CSS classes
 */

import React, { useCallback, useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "tldraw/tldraw.css";

// ── Age-band theme config ────────────────────────────────────────────────────
const BAND_THEMES = {
  ks1: {
    name: "Creative Corner",
    accent: "#d4a017",
    accentBg: "rgba(212,160,23,0.12)",
    border: "#fbbf24",
    headerBg: "linear-gradient(135deg, #fef9e7, #fdf2d1)",
    textColor: "#3d2e0f",
    mutedText: "#92400e",
    icon: "palette",
    saveLabel: "Save My Drawing!",
    emptyMessage: "Tap anywhere to start your magical creation!",
    font: "'Fredoka', 'Nunito', sans-serif",
  },
  ks2: {
    name: "Design Lab",
    accent: "#6366f1",
    accentBg: "rgba(99,102,241,0.1)",
    border: "#818cf8",
    headerBg: "linear-gradient(135deg, #eef2ff, #e0e7ff)",
    textColor: "#1e1b4b",
    mutedText: "#6366f1",
    icon: "design_services",
    saveLabel: "Save to Mission Log",
    emptyMessage: "Open your Design Lab and sketch your ideas!",
    font: "'Nunito', sans-serif",
  },
  ks3: {
    name: "Workspace",
    accent: "#5b6abf",
    accentBg: "rgba(91,106,191,0.08)",
    border: "#93a0e0",
    headerBg: "linear-gradient(135deg, #f8f9ff, #eef0fb)",
    textColor: "#1a1d2e",
    mutedText: "#6b7280",
    icon: "edit_note",
    saveLabel: "Save Workspace",
    emptyMessage: "Start mapping your ideas, notes, or diagrams.",
    font: "'DM Sans', 'Inter', sans-serif",
  },
  ks4: {
    name: "Research Canvas",
    accent: "#7c3aed",
    accentBg: "rgba(124,58,237,0.08)",
    border: "#a78bfa",
    headerBg: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
    textColor: "#1e1b4b",
    mutedText: "#6d28d9",
    icon: "science",
    saveLabel: "Save Canvas",
    emptyMessage: "Create diagrams, revision notes, or concept maps.",
    font: "'DM Sans', 'Inter', sans-serif",
  },
};

// Dynamically import tldraw (client-only, heavy bundle)
// CSS is imported at the top of this file as a side-effect (Turbopack requires top-level CSS imports)
const TldrawEditor = dynamic(
  () => import("tldraw").then((mod) => {
    const Comp = mod.Tldraw || mod.default;
    return { default: Comp };
  }),
  { ssr: false, loading: () => <CanvasLoadingFallback /> }
);

function CanvasLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full w-full bg-white/50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading canvas...</p>
      </div>
    </div>
  );
}

// ── Auto-save interval (30 seconds) ──────────────────────────────────────────
const AUTO_SAVE_INTERVAL = 30_000;

export default function TldrawCanvas({
  band = "ks2",
  initialSnapshot = null,
  onSave,
  onAutoSave,
  title = "",
  readOnly = false,
  className = "",
}) {
  const theme = BAND_THEMES[band] || BAND_THEMES.ks2;
  const editorRef = useRef(null);
  const autoSaveTimer = useRef(null);
  const [saveStatus, setSaveStatus] = useState(null); // "saving" | "saved" | null
  const [isTldrawReady, setIsTldrawReady] = useState(false);

  // Get a JSON snapshot from the tldraw editor
  const getSnapshot = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return null;
    try {
      // tldraw v4: editor.store.getStoreSnapshot()
      const snap = editor.store?.getStoreSnapshot?.() || editor.getSnapshot?.();
      return snap || null;
    } catch (err) {
      console.warn("[TldrawCanvas] Failed to get snapshot:", err.message);
      return null;
    }
  }, []);

  // Manual save
  const handleSave = useCallback(() => {
    const snap = getSnapshot();
    if (!snap) return;
    setSaveStatus("saving");
    onSave?.(snap);
    setTimeout(() => setSaveStatus("saved"), 300);
    setTimeout(() => setSaveStatus(null), 2000);
  }, [getSnapshot, onSave]);

  // Auto-save
  useEffect(() => {
    if (readOnly || !onAutoSave) return;
    autoSaveTimer.current = setInterval(() => {
      const snap = getSnapshot();
      if (snap) onAutoSave(snap);
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(autoSaveTimer.current);
  }, [readOnly, onAutoSave, getSnapshot]);

  // tldraw mount callback
  const handleMount = useCallback((editor) => {
    editorRef.current = editor;
    setIsTldrawReady(true);

    // Restore snapshot if provided
    if (initialSnapshot) {
      try {
        if (editor.store?.loadStoreSnapshot) {
          editor.store.loadStoreSnapshot(initialSnapshot);
        } else if (editor.loadSnapshot) {
          editor.loadSnapshot(initialSnapshot);
        }
      } catch (err) {
        console.warn("[TldrawCanvas] Failed to restore snapshot:", err.message);
      }
    }
  }, [initialSnapshot]);

  return (
    <div
      className={`flex flex-col h-full w-full overflow-hidden rounded-2xl border ${className}`}
      style={{
        borderColor: theme.border,
        fontFamily: theme.font,
      }}
    >
      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ background: theme.headerBg, borderBottom: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
              color: theme.accent,
              fontVariationSettings: "'FILL' 1, 'wght' 400",
            }}
          >
            {theme.icon}
          </span>
          <div>
            <h3 className="text-sm font-bold leading-tight" style={{ color: theme.textColor }}>
              {title || theme.name}
            </h3>
            <p className="text-[10px] font-medium" style={{ color: theme.mutedText }}>
              {readOnly ? "View only" : "Tap to draw, drag to move"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save status indicator */}
          {saveStatus === "saving" && (
            <span className="text-[10px] font-bold animate-pulse" style={{ color: theme.accent }}>
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-[10px] font-bold text-emerald-500">Saved!</span>
          )}

          {/* Save button */}
          {!readOnly && onSave && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: theme.accent }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
              >
                save
              </span>
              {theme.saveLabel}
            </button>
          )}
        </div>
      </div>

      {/* ── tldraw canvas area ──────────────────────────────────────────────── */}
      <div className="flex-1 relative min-h-0">
        <TldrawEditor
          onMount={handleMount}
          autoFocus
        />
      </div>
    </div>
  );
}

export { BAND_THEMES };
