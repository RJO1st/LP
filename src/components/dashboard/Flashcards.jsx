"use client";
/**
 * Flashcards.jsx
 * Deploy to: src/components/dashboard/Flashcards.jsx
 *
 * KS3/KS4 revision flashcards. Generated from question bank data.
 * Each card has a front (question/concept) and back (answer/explanation).
 * Swipe or tap to flip. Tracks which cards the scholar knows.
 *
 * Props:
 *   scholarId  — string
 *   subject    — string (active subject)
 *   curriculum — string
 *   supabase   — supabase client
 */

import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function Flashcards({ scholarId, subject, curriculum, supabase, yearLevel }) {
  const { band, theme: t, isDark } = useTheme();
  const [cards, setCards] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [known, setKnown] = useState(new Set());

  // Only KS3/KS4
  if (band === "ks1" || band === "ks2") return null;

  const loadCards = useCallback(async () => {
    if (!supabase || !scholarId) return;
    setLoading(true);
    try {
      // Get questions from weak topics
      const { data: mastery } = await supabase
        .from("scholar_topic_mastery")
        .select("topic, mastery_score")
        .eq("scholar_id", scholarId)
        .eq("curriculum", curriculum || "uk_national")
        .eq("subject", subject || "mathematics")
        .lt("mastery_score", 0.7)
        .order("mastery_score")
        .limit(10);

      const weakTopics = (mastery || []).map(r => r.topic).filter(Boolean);
      if (weakTopics.length === 0) {
        setCards([]);
        setLoading(false);
        return;
      }

      // Compute effective year for NG curricula and filter ±1 year range
      const c = (curriculum || "").toLowerCase();
      let effectiveYear = Number(yearLevel || 1);
      if (c === "ng_jss") effectiveYear = effectiveYear + 6;
      else if (c === "ng_sss") effectiveYear = effectiveYear + 9;
      const minYear = Math.max(1, effectiveYear - 1);
      const maxYear = effectiveYear + 1;

      const { data: questions } = await supabase
        .from("question_bank")
        .select("question_text, options, correct_index, explanation, topic")
        .eq("curriculum", curriculum || "uk_national")
        .eq("subject", subject || "mathematics")
        .in("topic", weakTopics)
        .eq("is_active", true)
        .gte("year_level", minYear)
        .lte("year_level", maxYear)
        .limit(50);

      // Convert questions to flashcards
      const flashcards = (questions || [])
        .filter(q => q.question_text && q.explanation)
        .sort(() => Math.random() - 0.5)
        .slice(0, 20)
        .map((q, i) => {
          const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || "[]");
          const answer = opts[q.correct_index] || "See explanation";
          return {
            id: i,
            front: q.question_text,
            back: `${answer}\n\n${q.explanation}`,
            topic: (q.topic || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          };
        });

      setCards(flashcards);
      setCurrentIdx(0);
      setFlipped(false);
      setKnown(new Set());
    } catch (err) {
      console.warn("[Flashcards] Load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [scholarId, subject, curriculum, supabase, yearLevel]);

  useEffect(() => { loadCards(); }, [loadCards]);

  if (cards.length === 0 && !loading) {
    return (
      <div style={{
        background: t.colours.card,
        border: `1px solid ${t.colours.cardBorder}`,
        borderRadius: t.radius.card,
        padding: 18,
        backdropFilter: isDark ? "blur(12px)" : undefined,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: t.fontWeight.bold, color: t.colours.text, fontFamily: t.fonts.display }}>
            📇 Flashcards
          </span>
        </div>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.colours.text, marginBottom: 4 }}>All caught up!</div>
          <div style={{ fontSize: 11, color: t.colours.textMuted, lineHeight: 1.5 }}>
            No weak topics to revise right now. Keep practising to unlock new flashcards.
          </div>
          <button onClick={loadCards} style={{
            marginTop: 12, padding: "8px 16px", borderRadius: t.radius.button,
            background: t.colours.accent, border: "none", color: "#fff",
            fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const card = cards[currentIdx];
  const remaining = cards.length - known.size;

  const handleKnow = () => {
    setKnown(prev => new Set([...prev, currentIdx]));
    goNext();
  };

  const goNext = () => {
    setFlipped(false);
    // Find next unknown card
    let next = currentIdx;
    for (let i = 1; i <= cards.length; i++) {
      next = (currentIdx + i) % cards.length;
      if (!known.has(next)) break;
    }
    setTimeout(() => setCurrentIdx(next), 150);
  };

  return (
    <div style={{
      background: t.colours.card,
      border: `1px solid ${t.colours.cardBorder}`,
      borderRadius: t.radius.card,
      padding: 18,
      backdropFilter: isDark ? "blur(12px)" : undefined,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: t.fontWeight.bold, color: t.colours.text, fontFamily: t.fonts.display }}>
          📇 Flashcards
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color: t.colours.accent, fontFamily: t.fonts.body }}>
          {remaining} remaining · {known.size} known
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: t.colours.textMuted, fontSize: 12 }}>
          Generating flashcards...
        </div>
      ) : card ? (
        <>
          {/* Topic badge */}
          <div style={{
            fontSize: 9, fontWeight: 700, color: t.colours.accent,
            textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8,
          }}>
            {card.topic} · {currentIdx + 1}/{cards.length}
          </div>

          {/* Card */}
          <div
            onClick={() => setFlipped(!flipped)}
            style={{
              minHeight: 140, padding: 20, borderRadius: t.radius.button,
              background: flipped
                ? (isDark ? "rgba(34,197,94,0.08)" : "#f0fdf4")
                : (isDark ? "rgba(255,255,255,0.04)" : "#f8fafc"),
              border: `1.5px solid ${flipped
                ? (isDark ? "rgba(34,197,94,0.2)" : "#bbf7d0")
                : t.colours.cardBorder}`,
              cursor: "pointer", transition: "all 0.2s",
              display: "flex", flexDirection: "column", justifyContent: "center",
            }}
          >
            <div style={{
              fontSize: 13, color: t.colours.text, fontFamily: t.fonts.body,
              lineHeight: 1.7, whiteSpace: "pre-line",
            }}>
              {flipped ? card.back : card.front}
            </div>
            {!flipped && (
              <div style={{ fontSize: 10, color: t.colours.textMuted, marginTop: 10, textAlign: "center" }}>
                Tap to reveal answer
              </div>
            )}
          </div>

          {/* Actions */}
          {flipped && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={goNext} style={{
                flex: 1, padding: "10px", borderRadius: t.radius.button,
                background: isDark ? "rgba(251,113,133,0.1)" : "#fef2f2",
                border: `1px solid ${isDark ? "rgba(251,113,133,0.2)" : "#fecaca"}`,
                color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: t.fonts.body,
              }}>
                Review again
              </button>
              <button onClick={handleKnow} style={{
                flex: 1, padding: "10px", borderRadius: t.radius.button,
                background: isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4",
                border: `1px solid ${isDark ? "rgba(34,197,94,0.2)" : "#bbf7d0"}`,
                color: "#22c55e", fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: t.fonts.body,
              }}>
                I know this ✓
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <span style={{ fontSize: 24 }}>🎉</span>
          <p style={{ fontSize: 12, color: t.colours.text, fontWeight: 600, marginTop: 6 }}>
            All cards reviewed!
          </p>
          <button onClick={() => { setKnown(new Set()); setCurrentIdx(0); setFlipped(false); }} style={{
            marginTop: 8, padding: "6px 16px", fontSize: 11, fontWeight: 600,
            background: t.colours.accent, color: "#fff", borderRadius: t.radius.button,
            border: "none", cursor: "pointer",
          }}>
            Start over
          </button>
        </div>
      )}
    </div>
  );
}