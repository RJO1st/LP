"use client";
/**
 * TaraEncouragement.jsx
 * Deploy to: src/components/dashboard/TaraEncouragement.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Tara's Random Acts of Encouragement. Renders differently per band:
 *   KS1: Big, colourful celebration banner
 *   KS2: Badge flash with animation
 *   KS3: Subtle toast (bottom-right feel, but rendered inline)
 *   KS4: Inline text — minimal, data-focused
 *
 * Props:
 *   message — string (pre-formatted from getEncouragement)
 *   visible — boolean
 *   onDismiss — () => void
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function TaraEncouragement({ message, visible = true, onDismiss }) {
  const { band, theme: t, isDark } = useTheme();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setShow(true), 100);
      return () => clearTimeout(timer);
    }
    setShow(false);
  }, [visible]);

  // Auto-dismiss after 8s for KS3/KS4
  useEffect(() => {
    if (visible && (band === "ks3" || band === "ks4")) {
      const timer = setTimeout(() => onDismiss?.(), 8000);
      return () => clearTimeout(timer);
    }
  }, [visible, band, onDismiss]);

  if (!visible || !message) return null;

  // ── KS1: Big celebration ──────────────────────────────────────────────
  if (band === "ks1") {
    return (
      <div
        style={{
          background: "linear-gradient(135deg, #fef3c7, #fce7f3)",
          border: "2px solid #fde68a",
          borderRadius: t.radius.card,
          padding: 20,
          textAlign: "center",
          opacity: show ? 1 : 0,
          transform: show ? "scale(1)" : "scale(0.95)",
          transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 6 }}>🌟</div>
        <div
          style={{
            fontSize: 15,
            fontWeight: t.fontWeight.black,
            color: "#92400e",
            fontFamily: t.fonts.display,
            lineHeight: 1.7,
          }}
        >
          <strong>{t.tara.name}:</strong> {message}
        </div>
        <button
          onClick={onDismiss}
          style={{
            marginTop: 12,
            padding: "8px 20px",
            background: t.colours.accent,
            color: "#fff",
            borderRadius: 999,
            fontFamily: t.fonts.display,
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
          }}
        >
          Yay! ✨
        </button>
      </div>
    );
  }

  // ── KS2: Badge flash ──────────────────────────────────────────────────
  if (band === "ks2") {
    return (
      <div
        style={{
          background: "rgba(129,140,248,0.1)",
          border: "1.5px solid rgba(129,140,248,0.25)",
          borderRadius: t.radius.card,
          padding: 16,
          opacity: show ? 1 : 0,
          transform: show ? "translateY(0)" : "translateY(8px)",
          transition: "all 0.3s ease",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: t.fontWeight.bold,
            color: t.colours.text,
            fontFamily: t.fonts.body,
            lineHeight: 1.7,
          }}
        >
          <strong>{t.tara.name}:</strong> {message}
        </div>
      </div>
    );
  }

  // ── KS3: Subtle toast ─────────────────────────────────────────────────
  if (band === "ks3") {
    return (
      <div
        style={{
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: t.radius.card,
          padding: "12px 16px",
          opacity: show ? 1 : 0,
          transform: show ? "translateY(0)" : "translateY(4px)",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 16 }}>{t.tara.icon}</span>
        <span
          style={{
            fontSize: 12,
            color: t.colours.text,
            fontFamily: t.fonts.body,
            lineHeight: 1.6,
            flex: 1,
          }}
        >
          {message}
        </span>
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            color: t.colours.textMuted,
            cursor: "pointer",
            fontSize: 16,
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  // ── KS4: Inline text ──────────────────────────────────────────────────
  return (
    <div
      style={{
        background: "rgba(167,139,250,0.06)",
        border: "1px solid rgba(167,139,250,0.12)",
        borderRadius: t.radius.card,
        padding: "12px 16px",
        fontSize: 12,
        color: t.colours.text,
        fontFamily: t.fonts.body,
        lineHeight: 1.6,
        opacity: show ? 1 : 0,
        transition: "opacity 0.2s ease",
      }}
    >
      <span style={{ color: t.colours.accent, fontWeight: 600 }}>◆</span> {message}
    </div>
  );
}