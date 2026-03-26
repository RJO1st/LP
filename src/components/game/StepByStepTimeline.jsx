"use client";
// ─── StepByStepTimeline.jsx ─────────────────────────────────────────────────
// GSAP-powered step-by-step solution walkthrough.
// Shows explanation steps one at a time with animated reveals.
//
// Usage:
//   <StepByStepTimeline
//     steps={["Step 1: ...", "Step 2: ...", "Answer: ..."]}
//     autoPlay={true}
//     band="ks2"
//   />
// ────────────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useCallback, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const BAND_COLORS = {
  ks1: { accent: "#fbbf24", bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
  ks2: { accent: "#6366f1", bg: "#eef2ff", border: "#c7d2fe", text: "#3730a3" },
  ks3: { accent: "#5b6abf", bg: "#eff0ff", border: "#c7caee", text: "#2d3278" },
  ks4: { accent: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", text: "#4c1d95" },
};

export default function StepByStepTimeline({
  steps = [],
  autoPlay = false,
  stepDelay = 1.2,
  band = "ks2",
  onComplete,
}) {
  const [visibleCount, setVisibleCount] = useState(autoPlay ? 0 : steps.length);
  const containerRef = useRef(null);
  const stepsRef = useRef([]);
  const tlRef = useRef(null);
  const colors = BAND_COLORS[band] || BAND_COLORS.ks2;

  // Autoplay: reveal steps one by one
  useGSAP(() => {
    if (!autoPlay || !containerRef.current || steps.length === 0) return;

    // Reset
    stepsRef.current.forEach(el => {
      if (el) gsap.set(el, { opacity: 0, x: -20, scale: 0.95 });
    });

    const tl = gsap.timeline({
      onComplete: () => {
        setVisibleCount(steps.length);
        onComplete?.();
      },
    });

    steps.forEach((_, i) => {
      tl.call(() => setVisibleCount(i + 1))
        .to(stepsRef.current[i], {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.4,
          ease: "power2.out",
        })
        .to({}, { duration: i < steps.length - 1 ? stepDelay : 0 }); // pause between steps
    });

    tlRef.current = tl;

    return () => {
      tl.kill();
    };
  }, { scope: containerRef, dependencies: [autoPlay, steps.length] });

  const revealNext = useCallback(() => {
    if (visibleCount >= steps.length) return;
    const nextIdx = visibleCount;
    setVisibleCount(nextIdx + 1);

    if (stepsRef.current[nextIdx]) {
      gsap.fromTo(stepsRef.current[nextIdx],
        { opacity: 0, x: -20, scale: 0.95 },
        { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: "power2.out" }
      );
    }

    if (nextIdx + 1 >= steps.length) {
      onComplete?.();
    }
  }, [visibleCount, steps.length, onComplete]);

  const revealAll = useCallback(() => {
    if (tlRef.current) tlRef.current.kill();
    setVisibleCount(steps.length);
    stepsRef.current.forEach(el => {
      if (el) gsap.set(el, { opacity: 1, x: 0, scale: 1 });
    });
    onComplete?.();
  }, [steps.length, onComplete]);

  if (steps.length === 0) return null;

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const visible = i < visibleCount;

        return (
          <div
            key={i}
            ref={el => stepsRef.current[i] = el}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              opacity: autoPlay ? 0 : (visible ? 1 : 0.3),
              transform: autoPlay ? "translateX(-20px)" : "none",
              transition: autoPlay ? "none" : "opacity 0.3s",
            }}
          >
            {/* Step number badge */}
            <div style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: visible ? colors.accent : colors.border,
              color: visible ? "#fff" : colors.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              flexShrink: 0,
              transition: "background 0.3s",
            }}>
              {isLast ? "✓" : i + 1}
            </div>

            {/* Step content */}
            <div style={{
              flex: 1,
              padding: "6px 10px",
              borderRadius: 10,
              background: visible ? (isLast ? colors.bg : "#f8fafc") : "transparent",
              border: `1.5px solid ${visible ? (isLast ? colors.accent : "#e2e8f0") : "transparent"}`,
              fontSize: 13,
              fontWeight: isLast ? 700 : 500,
              color: visible ? (isLast ? colors.text : "#334155") : "#94a3b8",
              lineHeight: 1.5,
            }}>
              {step}
            </div>
          </div>
        );
      })}

      {/* Controls */}
      {!autoPlay && visibleCount < steps.length && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 4 }}>
          <button
            onClick={revealNext}
            style={{
              padding: "6px 16px",
              borderRadius: 8,
              background: colors.accent,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
            }}
          >
            Next Step
          </button>
          <button
            onClick={revealAll}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              background: "#f1f5f9",
              color: "#64748b",
              fontSize: 12,
              fontWeight: 600,
              border: "1px solid #e2e8f0",
              cursor: "pointer",
            }}
          >
            Show All
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Parse explanation text into steps ───────────────────────────────────────
export function parseExplanationSteps(explanation) {
  if (!explanation) return [];

  // Try numbered steps: "1. ... 2. ... 3. ..."
  const numbered = explanation.match(/(?:^|\n)\s*\d+[\.\)]\s*.+/g);
  if (numbered && numbered.length >= 2) {
    return numbered.map(s => s.replace(/^\s*\d+[\.\)]\s*/, "").trim());
  }

  // Try bullet points
  const bullets = explanation.match(/(?:^|\n)\s*[•\-–]\s*.+/g);
  if (bullets && bullets.length >= 2) {
    return bullets.map(s => s.replace(/^\s*[•\-–]\s*/, "").trim());
  }

  // Try "Step N:" format
  const stepFormat = explanation.match(/Step\s*\d+[:\-]\s*.+/gi);
  if (stepFormat && stepFormat.length >= 2) {
    return stepFormat.map(s => s.replace(/^Step\s*\d+[:\-]\s*/i, "").trim());
  }

  // Try sentence splitting for short explanations
  const sentences = explanation.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
  if (sentences.length >= 2 && sentences.length <= 5) {
    return sentences;
  }

  // Single block — just return as one step
  return [explanation.trim()];
}
