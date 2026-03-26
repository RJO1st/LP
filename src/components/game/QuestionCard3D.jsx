"use client";
// ─── QuestionCard3D.jsx ─────────────────────────────────────────────────────
// CSS 3D card-flip for question → answer reveal.
// Used in quiz shells to create a premium "flip to reveal" effect when
// showing explanations or correct answers.
//
// Usage:
//   <QuestionCard3D flipped={showResult} front={<QuestionContent />} back={<ExplanationContent />} />
// ────────────────────────────────────────────────────────────────────────────
import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const CARD_STYLES = {
  container: {
    perspective: "1200px",
    width: "100%",
  },
  inner: {
    position: "relative",
    width: "100%",
    transformStyle: "preserve-3d",
    transition: "transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)",
  },
  face: {
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    width: "100%",
    borderRadius: 16,
  },
  front: {
    position: "relative",
    zIndex: 2,
  },
  back: {
    position: "absolute",
    top: 0,
    left: 0,
    transform: "rotateY(180deg)",
    zIndex: 1,
  },
};

export default function QuestionCard3D({
  flipped = false,
  front,
  back,
  flipAxis = "Y",          // "Y" for horizontal flip, "X" for vertical
  duration = 0.6,
  className = "",
  style = {},
}) {
  const innerRef = useRef(null);
  const prevFlipped = useRef(false);

  useGSAP(() => {
    if (!innerRef.current) return;

    // Only animate when flip state changes
    if (flipped !== prevFlipped.current) {
      prevFlipped.current = flipped;

      const rotProp = flipAxis === "X" ? "rotateX" : "rotateY";
      const target = flipped ? 180 : 0;

      gsap.to(innerRef.current, {
        [rotProp]: target,
        duration,
        ease: "power2.inOut",
      });
    }
  }, { dependencies: [flipped, flipAxis, duration] });

  const backTransform = flipAxis === "X" ? "rotateX(180deg)" : "rotateY(180deg)";

  return (
    <div style={{ ...CARD_STYLES.container, ...style }} className={className}>
      <div
        ref={innerRef}
        style={{
          ...CARD_STYLES.inner,
          transition: "none", // GSAP handles transitions
        }}
      >
        {/* FRONT FACE */}
        <div style={{ ...CARD_STYLES.face, ...CARD_STYLES.front }}>
          {front}
        </div>

        {/* BACK FACE */}
        <div style={{ ...CARD_STYLES.face, ...CARD_STYLES.back, transform: backTransform }}>
          {back}
        </div>
      </div>
    </div>
  );
}

// ─── Mini card flip for option reveal (correct/incorrect) ───────────────────
export function OptionRevealCard({ children, revealed, isCorrect, className = "" }) {
  const ref = useRef(null);

  useGSAP(() => {
    if (!ref.current || !revealed) return;

    const tl = gsap.timeline();

    // Quick scale pulse on reveal
    tl.to(ref.current, {
      scale: 1.04,
      duration: 0.15,
      ease: "power2.out",
    }).to(ref.current, {
      scale: 1,
      duration: 0.25,
      ease: "back.out(1.5)",
    });

    // Color glow
    if (isCorrect) {
      tl.to(ref.current, {
        boxShadow: "0 0 20px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.15)",
        borderColor: "#10b981",
        duration: 0.3,
      }, 0);
    } else {
      tl.to(ref.current, {
        boxShadow: "0 0 12px rgba(239, 68, 68, 0.3)",
        borderColor: "#ef4444",
        duration: 0.2,
      }, 0);
    }
  }, { dependencies: [revealed, isCorrect] });

  return (
    <div ref={ref} className={className} style={{ transition: "none" }}>
      {children}
    </div>
  );
}
