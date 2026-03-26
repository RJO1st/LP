"use client";
// ─── useStaggerEntrance.js ────────────────────────────────────────────────────
// Lightweight GSAP hook for staggered entrance animations on child elements.
// Wrap a container ref and its children get a cascading reveal on mount/key change.
//
// Usage:
//   const ref = useStaggerEntrance(".card", [dataKey]);
//   <div ref={ref}> <div className="card">...</div> ... </div>
// ──────────────────────────────────────────────────────────────────────────────
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * @param {string} childSelector - CSS selector for animatable children (e.g. ".card", "> div")
 * @param {any[]} deps - dependency array to re-trigger animation
 * @param {object} opts - { from, stagger, duration, ease, delay }
 */
export default function useStaggerEntrance(childSelector = "> *", deps = [], opts = {}) {
  const containerRef = useRef(null);

  const {
    fromY = 18,
    fromScale = 0.96,
    stagger = 0.06,
    duration = 0.4,
    ease = "power2.out",
    delay = 0.05,
  } = opts;

  useGSAP(() => {
    if (!containerRef.current) return;
    const els = containerRef.current.querySelectorAll(childSelector);
    if (!els.length) return;

    gsap.fromTo(els,
      { y: fromY, opacity: 0, scale: fromScale },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration,
        stagger,
        ease,
        delay,
      }
    );
  }, { scope: containerRef, dependencies: deps });

  return containerRef;
}
