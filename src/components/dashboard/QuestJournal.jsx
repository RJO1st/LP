"use client";
/**
 * QuestJournal.jsx
 * Deploy to: src/components/dashboard/QuestJournal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Narrative quest log. Only renders for KS1 and KS2.
 * KS1: "My Adventure Book" — story entries with friendly icons
 * KS2: "Quest Journal" — mission briefings with space icons
 *
 * Props:
 *   entries — [{ date, entry, icon? }]  (most recent first)
 *   maxEntries — number (default 5)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function QuestJournal({ entries = [], maxEntries = 5 }) {
  const { band, theme: t, isDark } = useTheme();
  const listRef = useRef(null);

  // Only render for KS1 and KS2
  if (band !== "ks1" && band !== "ks2") return null;
  if (entries.length === 0) return null;

  const title = band === "ks1" ? "📖 My Adventure Book" : "📜 Quest Journal";
  const visible = entries.slice(0, maxEntries);

  return (
    <div
      style={{
        background: t.colours.card,
        border: `1px solid ${t.colours.cardBorder}`,
        borderRadius: t.radius.card,
        padding: band === "ks1" ? 24 : 20,
        backdropFilter: isDark ? "blur(12px)" : undefined,
      }}
    >
      <div
        style={{
          fontSize: band === "ks1" ? 15 : 13,
          fontWeight: t.fontWeight.black,
          color: t.colours.text,
          fontFamily: t.fonts.display,
          marginBottom: 14,
        }}
      >
        {title}
      </div>

      <QJEntranceEffect listRef={listRef} count={visible.length} />
      <div ref={listRef} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.map((entry, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              padding: "10px 12px",
              background: t.colours.accentLight,
              borderRadius: t.radius.card * 0.5,
              border: `1px solid ${t.colours.cardBorder}`,
            }}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>
              {entry.icon || (band === "ks1" ? "🌟" : "🪐")}
            </span>
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: t.colours.accent,
                  fontFamily: t.fonts.body,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {entry.date}
              </div>
              <div
                style={{
                  fontSize: band === "ks1" ? 14 : 12,
                  color: t.colours.text,
                  fontFamily: t.fonts.body,
                  lineHeight: 1.6,
                  marginTop: 2,
                }}
              >
                {entry.entry}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** GSAP stagger for journal entries */
function QJEntranceEffect({ listRef, count }) {
  useEffect(() => {
    const el = listRef?.current;
    if (!el || count === 0) return;
    const children = el.children;
    if (!children.length) return;
    gsap.fromTo(children,
      { opacity: 0, x: -16 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.08, ease: "power2.out", delay: 0.15 }
    );
  }, [listRef, count]);
  return null;
}