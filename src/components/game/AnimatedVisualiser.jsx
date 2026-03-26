"use client";
// ─── AnimatedVisualiser.jsx ─────────────────────────────────────────────────
// Wraps MathsVisualiser with GSAP-powered entrance animations.
// Drop-in replacement: same props as MathsVisualiser.
//
// Architecture:
//   1. resolveVisual() determines the visual type
//   2. useVisualAnimation() selects the right GSAP animation preset
//   3. MathsVisualiser renders the static SVG/HTML
//   4. GSAP animates the rendered elements on mount / question change
// ────────────────────────────────────────────────────────────────────────────
import React, { useMemo } from "react";
import MathsVisualiser, { resolveVisual, canVisualise } from "./MathsVisualiser";
import useVisualAnimation from "../../hooks/useVisualAnimation";

export { canVisualise };

export default function AnimatedVisualiser({ question, subject, yearLevel }) {
  // Resolve visual type for animation selection
  const visual = useMemo(
    () => resolveVisual(question, subject, yearLevel),
    [question, subject, yearLevel]
  );

  const visualType = visual?.type || "_default";
  const questionKey = question?.id || question?.q || question?.question_text || "";

  // GSAP animation hook — triggers on visual type or question change
  const { containerRef } = useVisualAnimation(visualType, [questionKey]);

  if (!visual) {
    // No visual resolved — render nothing (same as MathsVisualiser)
    return null;
  }

  return (
    <div ref={containerRef} className="animated-visual" style={{ width: "100%" }}>
      <MathsVisualiser question={question} subject={subject} yearLevel={yearLevel} />
    </div>
  );
}
