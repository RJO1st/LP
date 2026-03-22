"use client";
/**
 * CareerPopup.jsx
 * Deploy to: src/components/dashboard/CareerPopup.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * KS3 only. Shows after a scholar completes a topic, connecting the subject
 * to a real-world career. "How do engineers use forces?"
 *
 * Props:
 *   topic    — string (topic slug, e.g. "multiplication")
 *   subject  — string
 *   onDismiss — () => void
 *   onExplore — () => void (optional — link to career page)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { getCareerPopup } from "@/lib/ageBandConfig";

export default function CareerPopup({ topic, subject, onDismiss, onExplore }) {
  const { band, theme: t } = useTheme();

  // Only render for KS3 and KS2 (with different messaging). KS1 is too young for careers, and KS4 are focused on exams.
  if (band !== "ks3" && band !== "ks2") return null;

  const text = getCareerPopup(band, topic);
  if (!text) return null;

  const topicLabel = (topic || "").replace(/_/g, " ");

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #e0f2fe, #f0f9ff)",
        border: "1.5px solid #7dd3fc",
        borderRadius: t.radius.card,
        padding: 18,
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: "#0ea5e9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        💼
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#0284c7",
            fontFamily: t.fonts.body,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Career Link · {topicLabel}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#0f172a",
            fontFamily: t.fonts.body,
            lineHeight: 1.6,
            marginTop: 4,
          }}
        >
          {text}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {onExplore && (
            <button
              onClick={onExplore}
              style={{
                padding: "5px 14px",
                fontSize: 11,
                fontWeight: 600,
                background: "#0ea5e9",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                cursor: "pointer",
                fontFamily: t.fonts.body,
              }}
            >
              Explore careers →
            </button>
          )}
          <button
            onClick={onDismiss}
            style={{
              padding: "5px 14px",
              fontSize: 11,
              fontWeight: 600,
              background: "transparent",
              border: "1.5px solid #bae6fd",
              borderRadius: 8,
              color: "#0284c7",
              cursor: "pointer",
              fontFamily: t.fonts.body,
            }}
          >
            {onExplore ? "Maybe later" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}