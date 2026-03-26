"use client";
// ─── useVisualAnimation.js ──────────────────────────────────────────────────
// GSAP animation hook for Quest Academy visual question rendering.
// Wraps @gsap/react's useGSAP with visual-type-specific animation presets.
// ────────────────────────────────────────────────────────────────────────────
import { useRef, useCallback } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(); // safe no-op if no extra plugins

// ─── ANIMATION PRESETS PER VISUAL TYPE ──────────────────────────────────────
const PRESETS = {
  // Number line: axis draws left-to-right, then ticks pop in, then marked point bounces
  number_line: (container) => {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    const axis = container.querySelector(".vis-axis");
    const ticks = container.querySelectorAll(".vis-tick");
    const marks = container.querySelectorAll(".vis-mark");
    const arcs  = container.querySelectorAll(".vis-arc");

    if (axis)  tl.fromTo(axis, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.5 });
    if (ticks.length) tl.fromTo(ticks, { opacity: 0, y: 8 }, { opacity: 1, y: 0, stagger: 0.04, duration: 0.3 }, "-=0.2");
    if (arcs.length)  tl.fromTo(arcs, { opacity: 0, scale: 0.3, transformOrigin: "center bottom" }, { opacity: 1, scale: 1, stagger: 0.1, duration: 0.4 }, "-=0.1");
    if (marks.length) tl.fromTo(marks, { scale: 0, transformOrigin: "center" }, { scale: 1, duration: 0.4, ease: "back.out(2)" }, "-=0.1");
    return tl;
  },

  // Bar chart: bars grow from bottom
  bar_chart: (container) => {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    const gridLines = container.querySelectorAll(".vis-grid");
    const axes = container.querySelectorAll(".vis-axis");
    const bars = container.querySelectorAll(".vis-bar");
    const labels = container.querySelectorAll(".vis-label");

    if (axes.length)  tl.fromTo(axes, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    if (gridLines.length) tl.fromTo(gridLines, { opacity: 0 }, { opacity: 0.5, stagger: 0.05, duration: 0.2 }, "-=0.1");
    if (bars.length) tl.fromTo(bars, { scaleY: 0, transformOrigin: "bottom" }, { scaleY: 1, stagger: 0.08, duration: 0.5, ease: "back.out(1.4)" }, "-=0.1");
    if (labels.length) tl.fromTo(labels, { opacity: 0, y: -5 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.3 }, "-=0.3");
    return tl;
  },

  // Coordinate graph: axes draw, then grid fades in, then points/lines animate
  coordinate_graph: (container) => {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    const axes = container.querySelectorAll(".vis-axis");
    const grid = container.querySelectorAll(".vis-grid");
    const lines = container.querySelectorAll(".vis-line");
    const points = container.querySelectorAll(".vis-point");

    if (axes.length)  tl.fromTo(axes, { scaleX: 0, transformOrigin: "center" }, { scaleX: 1, duration: 0.4 });
    if (grid.length)  tl.fromTo(grid, { opacity: 0 }, { opacity: 0.4, stagger: 0.02, duration: 0.2 }, "-=0.2");
    if (lines.length) tl.fromTo(lines, { strokeDashoffset: 1000, strokeDasharray: 1000 }, { strokeDashoffset: 0, duration: 0.8, stagger: 0.15 }, "-=0.1");
    if (points.length) tl.fromTo(points, { scale: 0, transformOrigin: "center" }, { scale: 1, stagger: 0.1, duration: 0.3, ease: "back.out(2)" }, "-=0.3");
    return tl;
  },

  // Angle: base line draws, then arc sweeps, then label fades in
  angle: (container) => {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    const lines = container.querySelectorAll(".vis-ray");
    const arc   = container.querySelector(".vis-arc");
    const label = container.querySelector(".vis-label");

    if (lines.length) tl.fromTo(lines, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, stagger: 0.15, duration: 0.4 });
    if (arc)   tl.fromTo(arc, { strokeDashoffset: 200, strokeDasharray: 200 }, { strokeDashoffset: 0, duration: 0.6 }, "-=0.1");
    if (label) tl.fromTo(label, { opacity: 0, scale: 0.5, transformOrigin: "center" }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.5)" }, "-=0.2");
    return tl;
  },

  // Fraction: segments pop in left-to-right, then notation fades
  fraction: (container) => {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    const segments = container.querySelectorAll(".vis-segment");
    const notation = container.querySelector(".vis-notation");

    if (segments.length) tl.fromTo(segments, { scaleY: 0, transformOrigin: "bottom" }, { scaleY: 1, stagger: 0.06, duration: 0.35, ease: "back.out(1.3)" });
    if (notation) tl.fromTo(notation, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, "-=0.1");
    return tl;
  },

  // Venn diagram: circles scale in, then items stagger
  venn: (container) => {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    const circles = container.querySelectorAll(".vis-circle");
    const items = container.querySelectorAll(".vis-item");
    const labels = container.querySelectorAll(".vis-label");

    if (circles.length) tl.fromTo(circles, { scale: 0, transformOrigin: "center" }, { scale: 1, stagger: 0.15, duration: 0.5, ease: "back.out(1.2)" });
    if (labels.length) tl.fromTo(labels, { opacity: 0 }, { opacity: 1, stagger: 0.1, duration: 0.3 }, "-=0.2");
    if (items.length) tl.fromTo(items, { opacity: 0, y: 5 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.3 }, "-=0.1");
    return tl;
  },

  // Pie chart: slices rotate in from zero
  pie_chart: (container) => {
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
    const slices = container.querySelectorAll(".vis-slice");
    const labels = container.querySelectorAll(".vis-label");

    if (slices.length) tl.fromTo(slices, { scale: 0, opacity: 0, transformOrigin: "center" }, { scale: 1, opacity: 1, stagger: 0.1, duration: 0.4, ease: "back.out(1.2)" });
    if (labels.length) tl.fromTo(labels, { opacity: 0 }, { opacity: 1, stagger: 0.08, duration: 0.3 }, "-=0.2");
    return tl;
  },

  // Generic fallback: simple fade-and-rise entrance
  _default: (container) => {
    const tl = gsap.timeline();
    tl.fromTo(container, { opacity: 0, y: 16, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power2.out" });
    return tl;
  },
};

/**
 * useVisualAnimation — plays an entrance animation on mount based on visual type.
 *
 * @param {string} visualType - the visual.type from resolveVisual() (e.g. "number_line")
 * @param {Array} deps - additional dependency array for re-triggering
 * @returns {{ containerRef: React.RefObject, replay: () => void }}
 */
export default function useVisualAnimation(visualType, deps = []) {
  const containerRef = useRef(null);
  const tlRef = useRef(null);

  const getPreset = useCallback(() => {
    return PRESETS[visualType] || PRESETS._default;
  }, [visualType]);

  useGSAP(() => {
    if (!containerRef.current) return;

    // Kill any existing timeline before replaying
    if (tlRef.current) {
      tlRef.current.kill();
    }

    // Small delay to let SVG render first
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const preset = getPreset();
      tlRef.current = preset(containerRef.current);
    }, 50);

    return () => {
      clearTimeout(timer);
      if (tlRef.current) tlRef.current.kill();
    };
  }, { scope: containerRef, dependencies: [visualType, ...deps] });

  const replay = useCallback(() => {
    if (!containerRef.current) return;
    if (tlRef.current) tlRef.current.kill();
    const preset = getPreset();
    tlRef.current = preset(containerRef.current);
  }, [getPreset]);

  return { containerRef, replay };
}

// ─── UTILITY: animate a single SVG path as "drawing" ────────────────────────
export function drawPath(element, duration = 0.8, delay = 0) {
  if (!element) return null;
  const length = element.getTotalLength?.() || 200;
  gsap.set(element, { strokeDasharray: length, strokeDashoffset: length });
  return gsap.to(element, { strokeDashoffset: 0, duration, delay, ease: "power2.inOut" });
}

// ─── UTILITY: counter animation (number tween) ─────────────────────────────
export function animateNumber(element, from, to, duration = 0.6, format = Math.round) {
  if (!element) return null;
  const obj = { val: from };
  return gsap.to(obj, {
    val: to,
    duration,
    ease: "power2.out",
    onUpdate: () => {
      element.textContent = format(obj.val);
    },
  });
}

// ─── UTILITY: staggered entrance for child elements ─────────────────────────
export function staggerIn(elements, { y = 15, duration = 0.4, stagger = 0.06, ease = "power2.out" } = {}) {
  if (!elements || !elements.length) return null;
  return gsap.fromTo(elements, { opacity: 0, y }, { opacity: 1, y: 0, stagger, duration, ease });
}
