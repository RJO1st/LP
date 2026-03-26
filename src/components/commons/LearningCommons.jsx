"use client";
/**
 * LearningCommons.jsx — Full-screen Learning Commons experience
 * Deploy to: src/components/commons/LearningCommons.jsx
 *
 * A freeform creative workspace powered by tldraw where scholars can:
 *  - Create mind maps, concept diagrams, visual notes
 *  - Save multiple canvases (documents) to their portfolio
 *  - Earn XP and badges for creative work
 *  - Browse their gallery of saved creations
 *
 * Opens as a full-screen modal overlay (same pattern as NebulaTrials).
 *
 * Props:
 *  - student: scholar object from useDashboardData
 *  - band: "ks1" | "ks2" | "ks3" | "ks4"
 *  - supabase: supabase client instance
 *  - onClose: () => void
 *  - onXPEarned: (xp: number) => void (optional)
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { BAND_THEMES } from "./TldrawCanvas";
import { createCommonsJournalEntry } from "@/lib/journalIntegration";

const TldrawCanvas = dynamic(() => import("./TldrawCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  ),
});

// ── Age-band names for the Commons ───────────────────────────────────────────
const COMMONS_NAMES = {
  ks1: { title: "Creative Corner", subtitle: "My Magical Sketchbook", newLabel: "New Drawing", icon: "palette" },
  ks2: { title: "Design Lab", subtitle: "Mission Sketches & Plans", newLabel: "New Blueprint", icon: "design_services" },
  ks3: { title: "Study Workspace", subtitle: "Notes, Maps & Diagrams", newLabel: "New Canvas", icon: "edit_note" },
  ks4: { title: "Research Canvas", subtitle: "Revision Diagrams & Concept Maps", newLabel: "New Document", icon: "science" },
};

// ── XP rewards ───────────────────────────────────────────────────────────────
const XP_CREATE = 10;
const XP_SAVE = 5;

// ── Document type presets ────────────────────────────────────────────────────
const DOC_PRESETS = [
  { key: "blank", label: "Blank Canvas", icon: "note_add", desc: "Start from scratch" },
  { key: "mind_map", label: "Mind Map", icon: "hub", desc: "Connect your ideas" },
  { key: "notes", label: "Visual Notes", icon: "sticky_note_2", desc: "Sketch and annotate" },
  { key: "diagram", label: "Diagram", icon: "account_tree", desc: "Flows and processes" },
  { key: "revision", label: "Revision Card", icon: "school", desc: "Key facts and formulas" },
];

export default function LearningCommons({ student, band = "ks2", supabase, onClose, onXPEarned }) {
  const config = COMMONS_NAMES[band] || COMMONS_NAMES.ks2;
  const theme = BAND_THEMES[band] || BAND_THEMES.ks2;

  // ── State ──────────────────────────────────────────────────────────────────
  const [view, setView] = useState("gallery"); // "gallery" | "editor" | "new"
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [activeSnapshot, setActiveSnapshot] = useState(null);
  const [activeTitle, setActiveTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const editTitleRef = useRef(null);

  const scholarId = student?.id;

  // ── Load saved documents ───────────────────────────────────────────────────
  const loadDocuments = useCallback(async () => {
    if (!supabase || !scholarId) { setLoading(false); return; }
    try {
      const { data, error: err } = await supabase
        .from("learning_commons_documents")
        .select("id, title, doc_type, thumbnail_url, element_count, updated_at, created_at")
        .eq("scholar_id", scholarId)
        .order("updated_at", { ascending: false })
        .limit(50);
      if (err) throw err;
      setDocuments(data || []);
    } catch (err) {
      console.warn("[LearningCommons] Load failed:", err.message);
      // Graceful fallback — table might not exist yet
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, scholarId]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  // ── Create new document ────────────────────────────────────────────────────
  const handleNewDoc = useCallback(async (preset = "blank") => {
    if (!supabase || !scholarId) {
      // Offline mode — just open editor with no persistence
      setActiveDocId(null);
      setActiveSnapshot(null);
      setActiveTitle(`Untitled ${new Date().toLocaleDateString()}`);
      setView("editor");
      return;
    }

    try {
      const title = preset === "blank"
        ? `Untitled ${new Date().toLocaleDateString()}`
        : `${DOC_PRESETS.find(p => p.key === preset)?.label || "Canvas"} — ${new Date().toLocaleDateString()}`;

      const { data, error: err } = await supabase
        .from("learning_commons_documents")
        .insert({
          scholar_id: scholarId,
          title,
          doc_type: preset,
          canvas_data: {},
          element_count: 0,
        })
        .select("id, title")
        .single();

      if (err) throw err;

      setActiveDocId(data.id);
      setActiveSnapshot(null);
      setActiveTitle(data.title);
      setView("editor");

      // Award XP for creating
      onXPEarned?.(XP_CREATE);
    } catch (err) {
      console.warn("[LearningCommons] Create failed:", err.message);
      // Fallback: open editor without DB persistence
      setActiveDocId(null);
      setActiveSnapshot(null);
      setActiveTitle(`Untitled ${new Date().toLocaleDateString()}`);
      setView("editor");
    }
  }, [supabase, scholarId, onXPEarned]);

  // ── Open existing document ─────────────────────────────────────────────────
  const handleOpenDoc = useCallback(async (docId) => {
    if (!supabase) return;
    try {
      const { data, error: err } = await supabase
        .from("learning_commons_documents")
        .select("id, title, canvas_data")
        .eq("id", docId)
        .single();
      if (err) throw err;

      setActiveDocId(data.id);
      setActiveSnapshot(data.canvas_data || null);
      setActiveTitle(data.title || "Untitled");
      setView("editor");
    } catch (err) {
      console.warn("[LearningCommons] Open failed:", err.message);
    }
  }, [supabase]);

  // ── Save canvas ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (snapshot) => {
    if (!supabase || !activeDocId) return;
    try {
      const elementCount = snapshot?.store
        ? Object.keys(snapshot.store).filter(k => k.startsWith("shape:")).length
        : 0;

      await supabase
        .from("learning_commons_documents")
        .update({
          canvas_data: snapshot,
          element_count: elementCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeDocId);

      // Award save XP (once per session)
      onXPEarned?.(XP_SAVE);

      // Create journal entry for the creation
      createCommonsJournalEntry(supabase, {
        scholarId, title: activeTitle,
        docType: documents.find(d => d.id === activeDocId)?.doc_type || "blank",
        elementCount, yearLevel: student?.year_level,
      });
    } catch (err) {
      console.warn("[LearningCommons] Save failed:", err.message);
    }
  }, [supabase, activeDocId, onXPEarned]);

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const handleAutoSave = useCallback(async (snapshot) => {
    if (!supabase || !activeDocId) return;
    try {
      const elementCount = snapshot?.store
        ? Object.keys(snapshot.store).filter(k => k.startsWith("shape:")).length
        : 0;

      await supabase
        .from("learning_commons_documents")
        .update({ canvas_data: snapshot, element_count: elementCount, updated_at: new Date().toISOString() })
        .eq("id", activeDocId);
    } catch (err) {
      // Silent auto-save failure
    }
  }, [supabase, activeDocId]);

  // ── Delete document ────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (docId) => {
    if (!supabase || !docId) return;
    if (!confirm("Delete this canvas? This cannot be undone.")) return;
    try {
      await supabase.from("learning_commons_documents").delete().eq("id", docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (activeDocId === docId) {
        setView("gallery");
        setActiveDocId(null);
      }
    } catch (err) {
      console.warn("[LearningCommons] Delete failed:", err.message);
    }
  }, [supabase, activeDocId]);

  // ── Back to gallery ────────────────────────────────────────────────────────
  const handleBackToGallery = useCallback(() => {
    setView("gallery");
    setActiveDocId(null);
    setActiveSnapshot(null);
    loadDocuments(); // Refresh list
  }, [loadDocuments]);

  // ── Render ─────────────────────────────────────────────────────────────────

  // Gallery View
  if (view === "gallery" || view === "new") {
    return (
      <div className="flex flex-col h-full w-full" style={{ fontFamily: theme.font }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ background: theme.headerBg, borderBottom: `1px solid ${theme.border}` }}
        >
          <div className="flex items-center gap-3">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 28, color: theme.accent, fontVariationSettings: "'FILL' 1" }}
            >
              {config.icon}
            </span>
            <div>
              <h2 className="text-lg font-black" style={{ color: theme.textColor }}>{config.title}</h2>
              <p className="text-xs font-medium" style={{ color: theme.mutedText }}>{config.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22, color: theme.mutedText }}>close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* New document button row */}
          <div className="mb-6">
            <button
              onClick={() => setView(view === "new" ? "gallery" : "new")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: theme.accent }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              {config.newLabel}
            </button>
          </div>

          {/* Preset picker (shown when "new" is selected) */}
          {view === "new" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
              {DOC_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => handleNewDoc(preset.key)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-md"
                  style={{
                    borderColor: theme.border,
                    background: theme.accentBg,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 28, color: theme.accent, fontVariationSettings: "'FILL' 1" }}
                  >
                    {preset.icon}
                  </span>
                  <span className="text-xs font-bold text-center" style={{ color: theme.textColor }}>{preset.label}</span>
                  <span className="text-[10px] font-medium text-center" style={{ color: theme.mutedText }}>{preset.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* Documents gallery */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span
                className="material-symbols-outlined mb-3"
                style={{ fontSize: 48, color: theme.border, fontVariationSettings: "'FILL' 1" }}
              >
                draw
              </span>
              <p className="text-sm font-bold mb-1" style={{ color: theme.textColor }}>
                No creations yet!
              </p>
              <p className="text-xs" style={{ color: theme.mutedText }}>
                {theme.emptyMessage || "Create your first canvas to get started."}
              </p>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-bold mb-3" style={{ color: theme.mutedText }}>
                My Creations ({documents.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="group relative rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer"
                    style={{ borderColor: theme.border, background: "white" }}
                    onClick={() => handleOpenDoc(doc.id)}
                  >
                    {/* Thumbnail area */}
                    <div
                      className="h-32 flex items-center justify-center"
                      style={{ background: theme.accentBg }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 40, color: theme.border, fontVariationSettings: "'FILL' 1" }}
                      >
                        {DOC_PRESETS.find(p => p.key === doc.doc_type)?.icon || "draw"}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="p-3">
                      <h4 className="text-sm font-bold truncate" style={{ color: theme.textColor }}>
                        {doc.title}
                      </h4>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] font-medium" style={{ color: theme.mutedText }}>
                          {doc.element_count || 0} elements
                        </span>
                        <span className="text-[10px] font-medium" style={{ color: theme.mutedText }}>
                          {new Date(doc.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {/* Delete button (hover) */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Editor View
  return (
    <div className="flex flex-col h-full w-full" style={{ fontFamily: theme.font }}>
      {/* Editor header with back button */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0"
        style={{ background: theme.headerBg, borderBottom: `1px solid ${theme.border}` }}
      >
        <button
          onClick={handleBackToGallery}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-black/5"
          style={{ color: theme.accent }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
          Gallery
        </button>
        <span className="text-sm font-bold truncate max-w-[200px]" style={{ color: theme.textColor }}>
          {activeTitle}
        </span>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: theme.mutedText }}>close</span>
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <TldrawCanvas
          band={band}
          initialSnapshot={activeSnapshot}
          onSave={handleSave}
          onAutoSave={handleAutoSave}
          title={activeTitle}
        />
      </div>
    </div>
  );
}
