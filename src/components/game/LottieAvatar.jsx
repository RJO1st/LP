"use client";
// ─── LottieAvatar.jsx ─────────────────────────────────────────────────────────
// Animated Lottie-based avatar display for the scholar greeting & dashboard.
// Wraps lottie-react with multiple themed animations that respond to scholar
// state (streak, mastery, equipped items, and assigned role).
//
// Props:
//   avatar       — { base, hat, pet, accessory, background, role }
//   size         — "sm" | "md" | "lg" | "xl"  (default "md")
//   animation    — explicit Lottie override: "astronaut" | "victory" | "rocket" | "space-travel" | "solar-system"
//   role         — space command role: "commander" | "engineer" | "scientist" | "navigator" | "pilot" | "medic"
//   streak       — number (triggers victory pose at milestones)
//   mastery      — number 0-100
//   onClick      — optional click handler
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useEffect, useState, useMemo } from "react";
import gsap from "gsap";
import dynamic from "next/dynamic";

// Dynamic import for lottie-react (it uses canvas, needs client-only)
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

// ─── SIZE CONFIG ─────────────────────────────────────────────────────────────
const SIZES = {
  sm:  { w: 64,  h: 64  },
  md:  { w: 100, h: 100 },
  lg:  { w: 140, h: 140 },
  xl:  { w: 180, h: 180 },
};

// ─── LOTTIE ANIMATION MAP ───────────────────────────────────────────────────
const LOTTIE_PATHS = {
  astronaut:      "/lottie/astronaut.json",
  victory:        "/lottie/victory-astronaut.json",
  rocket:         "/lottie/rocket-space.json",
  "space-travel": "/lottie/space-travel.json",
  "solar-system": "/lottie/solar-system.json",
  "404":          "/lottie/404-astronaut.json",
};

// ─── SPACE COMMAND ROLES ────────────────────────────────────────────────────
// Each role has its own colour scheme, default animation, title, and badge icon.
// Scholars choose (or are assigned) a role; shop customisations layer on top.
const SPACE_ROLES = {
  commander: {
    title: "Commander",
    badge: "⭐",
    defaultAnim: "astronaut",
    victoryAnim: "victory",
    ringColor: "#fbbf24",
    glowColor: "rgba(251,191,36,0.35)",
    badgeBg: "linear-gradient(135deg, #fbbf24, #f59e0b)",
    frameBg: "linear-gradient(135deg, #1e1b4b, #312e81)",
    frameAccent: "#fbbf2480",
  },
  engineer: {
    title: "Engineer",
    badge: "🔧",
    defaultAnim: "rocket",
    victoryAnim: "victory",
    ringColor: "#fb923c",
    glowColor: "rgba(249,115,22,0.35)",
    badgeBg: "linear-gradient(135deg, #fb923c, #ea580c)",
    frameBg: "linear-gradient(135deg, #1c1917, #44403c)",
    frameAccent: "#fb923c80",
  },
  scientist: {
    title: "Scientist",
    badge: "🔬",
    defaultAnim: "solar-system",
    victoryAnim: "victory",
    ringColor: "#34d399",
    glowColor: "rgba(52,211,153,0.35)",
    badgeBg: "linear-gradient(135deg, #34d399, #10b981)",
    frameBg: "linear-gradient(135deg, #022c22, #064e3b)",
    frameAccent: "#34d39980",
  },
  navigator: {
    title: "Navigator",
    badge: "🧭",
    defaultAnim: "space-travel",
    victoryAnim: "victory",
    ringColor: "#60a5fa",
    glowColor: "rgba(96,165,250,0.35)",
    badgeBg: "linear-gradient(135deg, #60a5fa, #3b82f6)",
    frameBg: "linear-gradient(135deg, #0c1a3d, #1e3a5f)",
    frameAccent: "#60a5fa80",
  },
  pilot: {
    title: "Pilot",
    badge: "🚀",
    defaultAnim: "rocket",
    victoryAnim: "victory",
    ringColor: "#c084fc",
    glowColor: "rgba(192,132,252,0.35)",
    badgeBg: "linear-gradient(135deg, #c084fc, #8b5cf6)",
    frameBg: "linear-gradient(135deg, #2e1065, #4c1d95)",
    frameAccent: "#c084fc80",
  },
  medic: {
    title: "Medic",
    badge: "💚",
    defaultAnim: "astronaut",
    victoryAnim: "victory",
    ringColor: "#a3e635",
    glowColor: "rgba(163,230,53,0.3)",
    badgeBg: "linear-gradient(135deg, #a3e635, #65a30d)",
    frameBg: "linear-gradient(135deg, #1a2e05, #365314)",
    frameAccent: "#a3e63580",
  },
};

const DEFAULT_ROLE = "commander";

function getRole(roleKey) {
  return SPACE_ROLES[roleKey] || SPACE_ROLES[DEFAULT_ROLE];
}

// Choose animation based on role + scholar state
function pickAnimation(streak = 0, mastery = 0, explicitAnim, roleKey) {
  if (explicitAnim && LOTTIE_PATHS[explicitAnim]) return explicitAnim;
  const role = getRole(roleKey);
  // Victory pose for streak milestones
  if (streak >= 7) return role.victoryAnim;
  // High mastery → role's default (which is already role-specific)
  if (mastery >= 80) return role.defaultAnim;
  // Default to role animation
  return role.defaultAnim;
}

// ─── Glow ring colour by role + mastery ──────────────────────────────────────
function glowColors(mastery, roleKey) {
  const role = getRole(roleKey);
  // Higher mastery = brighter glow
  const intensity = mastery >= 90 ? 1.0 : mastery >= 70 ? 0.75 : mastery >= 50 ? 0.55 : 0.35;
  return {
    ring: role.ringColor,
    glow: role.glowColor.replace(/[\d.]+\)$/, `${intensity})`),
  };
}

export { SPACE_ROLES };

export default function LottieAvatar({
  avatar = {},
  size = "md",
  animation,
  role: roleProp,
  streak = 0,
  mastery = 0,
  onClick,
}) {
  const containerRef = useRef(null);
  const lottieRef = useRef(null);
  const [animData, setAnimData] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const roleKey = roleProp || avatar?.role || DEFAULT_ROLE;
  const roleData = getRole(roleKey);
  const { w, h } = SIZES[size] || SIZES.md;
  const chosenAnim = useMemo(
    () => pickAnimation(streak, mastery, animation, roleKey),
    [streak, mastery, animation, roleKey]
  );
  const colors = useMemo(() => glowColors(mastery, roleKey), [mastery, roleKey]);

  // Load Lottie JSON on mount / animation change
  useEffect(() => {
    const path = LOTTIE_PATHS[chosenAnim];
    if (!path) { setLoadError(true); return; }

    let cancelled = false;
    fetch(path)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(json => { if (!cancelled) { setAnimData(json); setLoadError(false); } })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [chosenAnim]);

  // GSAP entrance pulse
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    gsap.fromTo(el,
      { scale: 0.85, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.6)", delay: 0.1 }
    );
  }, []);

  // Hover 3D tilt
  const handleMouseMove = (e) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    gsap.to(el, {
      rotateX: -y * 8, rotateY: x * 8, scale: 1.06,
      duration: 0.35, ease: "power2.out", overwrite: "auto",
    });
  };

  const handleMouseLeave = () => {
    const el = containerRef.current;
    if (!el) return;
    gsap.to(el, {
      rotateX: 0, rotateY: 0, scale: 1,
      duration: 0.5, ease: "elastic.out(1,0.5)", overwrite: "auto",
    });
  };

  // Fallback — if no lottie data or load error, show a simple animated emoji
  if (loadError || !animData) {
    return (
      <div
        ref={containerRef}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          width: w, height: h, borderRadius: "50%",
          background: `radial-gradient(circle at 30% 30%, ${colors.ring}30, transparent 70%), ${roleData.frameBg}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: onClick ? "pointer" : "default",
          boxShadow: `0 0 24px ${colors.glow}, 0 4px 16px rgba(0,0,0,0.15)`,
          border: `3px solid ${roleData.frameAccent}`,
          perspective: "600px", transformStyle: "preserve-3d",
          willChange: "transform, opacity",
          fontSize: w * 0.45,
          position: "relative",
        }}
      >
        {roleData.badge}
        {/* Role label */}
        {w >= 80 && (
          <div style={{
            position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
            background: roleData.badgeBg, borderRadius: 6,
            padding: "1px 6px", fontSize: 8, fontWeight: 800,
            color: "#fff", whiteSpace: "nowrap",
            boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
            letterSpacing: "0.04em",
          }}>{roleData.title}</div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        width: w, height: h, borderRadius: "50%",
        overflow: "visible", position: "relative",
        cursor: onClick ? "pointer" : "default",
        boxShadow: `0 0 28px ${colors.glow}, 0 6px 20px rgba(0,0,0,0.15)`,
        border: `3px solid ${roleData.frameAccent}`,
        background: roleData.frameBg,
        perspective: "600px", transformStyle: "preserve-3d",
        willChange: "transform, opacity",
      }}
    >
      {/* Lottie Animation */}
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden" }}>
        <Lottie
          lottieRef={lottieRef}
          animationData={animData}
          loop
          autoplay
          style={{
            width: w + 20, height: h + 20,
            position: "absolute",
            top: -10, left: -10,
          }}
        />
      </div>

      {/* Glow ring overlay */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        boxShadow: `inset 0 0 16px ${colors.glow}`,
        pointerEvents: "none",
      }} />

      {/* Role badge label */}
      {w >= 80 && (
        <div style={{
          position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
          background: roleData.badgeBg, borderRadius: 7,
          padding: "2px 8px", fontSize: 9, fontWeight: 800,
          color: "#fff", whiteSpace: "nowrap",
          boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
          letterSpacing: "0.04em", zIndex: 5,
          border: "1px solid rgba(255,255,255,0.2)",
        }}>{roleData.badge} {roleData.title}</div>
      )}

      {/* Edit badge */}
      {onClick && (
        <div style={{
          position: "absolute", bottom: 2, right: 2,
          width: 22, height: 22, borderRadius: "50%",
          background: colors.ring, border: "2px solid white",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          zIndex: 6,
        }}>✏️</div>
      )}
    </div>
  );
}
