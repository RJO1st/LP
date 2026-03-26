"use client";
// ─── Deploy to: src/components/game/EnglishVisuals.jsx ──────────────────────
// English visual components for MathsVisualiser.
// Import in MathsVisualiser:
//   import { SentenceStructureVis, SpellingPatternVis, PunctuationVis, WordClassVis }
//     from "./EnglishVisuals";
import React from "react";

const T = {
  indigo: "#4f46e5", indigoBg: "#eef2ff", indigoBd: "#c7d2fe",
  nebula: "#9333ea", nebulaBg: "#f5f3ff", nebulaBd: "#ddd6fe",
  amber:  "#d97706", amberBg:  "#fffbeb", amberBd:  "#fde68a",
  emerald:"#059669", emeraldBg:"#ecfdf5", emeraldBd:"#a7f3d0",
  rose:   "#e11d48", roseBg:   "#fff1f2", roseBd:   "#fecdd3",
  cyan:   "#0891b2", cyanBg:   "#ecfeff", cyanBd:   "#a5f3fc",
  slate:  "#475569", slateBg:  "#f8fafc", slateBd:  "#e2e8f0",
  text:   "#1e293b", textMid:  "#64748b",
};

function Panel({ children, accent = T.nebula, bg, bd, ariaLabel }) {
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

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SENTENCE STRUCTURE — clause highlighting
// ═══════════════════════════════════════════════════════════════════════════════
export function SentenceStructureVis({ parts = [] }) {
  if (parts.length === 0) return null;

  const TYPE_STYLES = {
    main:        { bg: "#dbeafe", border: "#93c5fd", color: "#1e40af", label: "Main clause" },
    subordinate: { bg: "#fce7f3", border: "#f9a8d4", color: "#9d174d", label: "Subordinate clause" },
    relative:    { bg: "#e0e7ff", border: "#a5b4fc", color: "#4338ca", label: "Relative clause" },
    conjunction: { bg: "#fef3c7", border: "#fcd34d", color: "#92400e", label: "Conjunction" },
    adverbial:   { bg: "#d1fae5", border: "#6ee7b7", color: "#065f46", label: "Adverbial" },
  };

  return (
    <Panel accent={T.nebula} bg={T.nebulaBg} bd={T.nebulaBd}
      ariaLabel="Sentence structure diagram">
      <Chip color={T.nebula} bg="white">Sentence Structure</Chip>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", maxWidth: 220 }}>
        {parts.map((p, i) => {
          const style = TYPE_STYLES[p.type] || TYPE_STYLES.main;
          return (
            <span key={i} style={{
              display: "inline-block", padding: "4px 8px", borderRadius: 6,
              background: style.bg, border: `1.5px ${p.type === "conjunction" ? "dashed" : "solid"} ${style.border}`,
              fontSize: 11, fontWeight: 600, color: style.color, lineHeight: 1.4,
            }}>
              {p.text}
            </span>
          );
        })}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {[...new Set(parts.map(p => p.type))].map(type => {
          const style = TYPE_STYLES[type] || TYPE_STYLES.main;
          return (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: style.bg, border: `1px solid ${style.border}` }} />
              <span style={{ fontSize: 8, fontWeight: 700, color: style.color }}>{style.label}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SPELLING PATTERN — letter boxes with highlighted pattern
// ═══════════════════════════════════════════════════════════════════════════════
export function SpellingPatternVis({ word = "", pattern = "", highlighted = [] }) {
  if (!word) return null;
  const letters = word.split("");
  const hiSet = new Set(highlighted);

  const PATTERN_LABELS = {
    silent_k: "Silent K — the K is not pronounced",
    silent_w: "Silent W — the W is not pronounced",
    silent_b: "Silent B — the B is not pronounced",
    double_letter: "Double letter pattern",
    magic_e: "Magic E — changes the vowel sound",
    split_digraph: "Split digraph — vowel-consonant-e",
    digraph: "Two letters making one sound",
    trigraph: "Three letters making one sound",
    prefix: "Prefix — added to the start",
    suffix: "Suffix — added to the end",
  };

  return (
    <Panel accent={T.nebula} bg={T.nebulaBg} bd={T.nebulaBd}
      ariaLabel={`Spelling pattern: ${word}`}>
      <Chip color={T.nebula} bg="white">Spelling Pattern</Chip>
      <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
        {letters.map((letter, i) => {
          const isHi = hiSet.has(i);
          return (
            <div key={i} style={{
              width: 28, height: 34, borderRadius: 6, display: "flex",
              alignItems: "center", justifyContent: "center",
              background: isHi ? T.nebula : "white",
              border: `2px solid ${isHi ? T.nebula : T.slateBd}`,
              fontSize: 16, fontWeight: 800,
              color: isHi ? "white" : T.text,
              fontFamily: "'DM Mono', monospace",
            }}>
              {letter}
            </div>
          );
        })}
      </div>
      {pattern && (
        <p style={{ fontSize: 9, fontWeight: 600, color: T.nebula, textAlign: "center", maxWidth: 200 }}>
          {PATTERN_LABELS[pattern] || pattern.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
        </p>
      )}
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PUNCTUATION — sentence with highlighted marks
// ═══════════════════════════════════════════════════════════════════════════════
export function PunctuationVis({ sentence = "", marks = [], missingPos = -1 }) {
  if (!sentence) return null;
  const chars = sentence.split("");
  const markSet = new Map(marks.map(m => [m.pos, m.type]));

  const MARK_COLORS = {
    comma: T.amber, apostrophe: T.nebula, speech_marks: T.indigo,
    full_stop: T.slate, exclamation: T.rose, question_mark: T.cyan,
    colon: T.emerald, semicolon: T.emerald,
  };

  return (
    <Panel accent={T.amber} bg={T.amberBg} bd={T.amberBd}
      ariaLabel="Punctuation diagram">
      <Chip color={T.amber} bg="white">Punctuation</Chip>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 1, maxWidth: 220, justifyContent: "center" }}>
        {chars.map((ch, i) => {
          const markType = markSet.get(i);
          const isMissing = i === missingPos;
          const color = markType ? (MARK_COLORS[markType] || T.amber) : null;
          return (
            <span key={i} style={{
              display: "inline-block", fontSize: 13, fontWeight: markType || isMissing ? 800 : 500,
              color: isMissing ? T.rose : markType ? color : T.text,
              background: isMissing ? T.roseBg : markType ? color + "18" : "transparent",
              borderRadius: markType || isMissing ? 3 : 0,
              padding: markType || isMissing ? "1px 2px" : "0",
              border: isMissing ? `2px dashed ${T.rose}` : "none",
              fontFamily: "'DM Mono', monospace",
              lineHeight: 1.6,
            }}>
              {isMissing ? "?" : ch}
            </span>
          );
        })}
      </div>
      {/* Legend */}
      {marks.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
          {[...new Set(marks.map(m => m.type))].map(type => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 6, height: 6, borderRadius: 2, background: MARK_COLORS[type] || T.amber }} />
              <span style={{ fontSize: 8, fontWeight: 700, color: T.textMid }}>{type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. WORD CLASS — words with class labels
// ═══════════════════════════════════════════════════════════════════════════════
export function WordClassVis({ words = [] }) {
  if (words.length === 0) return null;

  const CLASS_COLORS = {
    noun:        { bg: "#dbeafe", color: "#1e40af" },
    verb:        { bg: "#dcfce7", color: "#166534" },
    adjective:   { bg: "#fef3c7", color: "#92400e" },
    adverb:      { bg: "#fce7f3", color: "#9d174d" },
    pronoun:     { bg: "#e0e7ff", color: "#4338ca" },
    determiner:  { bg: "#f1f5f9", color: "#475569" },
    preposition: { bg: "#ecfeff", color: "#0e7490" },
    conjunction: { bg: "#fef9c3", color: "#854d0e" },
  };

  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd}
      ariaLabel="Word class diagram">
      <Chip color={T.indigo} bg="white">Word Classes</Chip>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", maxWidth: 220 }}>
        {words.map((w, i) => {
          const style = CLASS_COLORS[w.cls] || CLASS_COLORS.noun;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{
                padding: "4px 8px", borderRadius: 6,
                background: style.bg, fontSize: 12, fontWeight: 700,
                color: style.color, lineHeight: 1,
              }}>
                {w.word}
              </span>
              <span style={{ fontSize: 7, fontWeight: 700, color: style.color, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {w.cls}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}