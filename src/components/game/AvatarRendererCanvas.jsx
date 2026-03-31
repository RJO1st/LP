"use client";
import React, { useRef, useEffect, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// AvatarRendererCanvas — Immersive space-themed character avatars
// Focus: stunning backgrounds, distinctive suits, dramatic gear
// No face/hair/hats — visors are fully reflective. Impact through gear & space.
// ═══════════════════════════════════════════════════════════════════════════════

const SIZES = {
  sm: { w: 48, h: 48 },
  md: { w: 80, h: 80 },
  lg: { w: 120, h: 120 },
  xl: { w: 160, h: 160 },
};

const CS = 400; // Internal canvas coordinate space

// ── Colour helpers ───────────────────────────────────────────────────────────
function rgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lighter(hex, amt = 40) {
  let r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  r = Math.min(255, r + amt); g = Math.min(255, g + amt); b = Math.min(255, b + amt);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

function darker(hex, amt = 40) {
  let r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, r - amt); g = Math.max(0, g - amt); b = Math.max(0, b - amt);
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

function lerpColor(hex1, hex2, t) {
  const r1 = parseInt(hex1.slice(1, 3), 16), g1 = parseInt(hex1.slice(3, 5), 16), b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16), g2 = parseInt(hex2.slice(3, 5), 16), b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t), g = Math.round(g1 + (g2 - g1) * t), b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

// ── Seeded random for deterministic star fields ──────────────────────────────
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawSpecular(ctx, cx, cy, r, angle = -0.5) {
  ctx.save();
  ctx.globalAlpha = 0.6;
  const sx = cx + Math.cos(angle) * r * 0.4;
  const sy = cy + Math.sin(angle) * r * 0.4;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.35);
  sg.addColorStop(0, "rgba(255,255,255,0.8)");
  sg.addColorStop(0.5, "rgba(255,255,255,0.15)");
  sg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sx, sy, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8 UNIQUE BASE CHARACTERS
// ═══════════════════════════════════════════════════════════════════════════════

const BASES = {
  astronaut: {
    accent: "#3B82F6", accentLight: "#93C5FD", accentDark: "#1D4ED8",
    suitBase: "#E8EDF5", suitDark: "#C0C8D8",
    visorTint: ["#1a2a5c", "#0d1530"], visorReflect: "#3B82F6",
    helmetType: "fishbowl",
    bodyType: "standard",
    shoulderStyle: "rounded",
    chestDesign: "mission_patch",
    backpackType: "life_support",
    bootStyle: "standard",
    suitPattern: "classic_panels",
  },
  explorer: {
    accent: "#10B981", accentLight: "#6EE7B7", accentDark: "#047857",
    suitBase: "#D8E8D8", suitDark: "#A8C0A8",
    visorTint: ["#0a2a1a", "#041510"], visorReflect: "#10B981",
    helmetType: "angular",
    bodyType: "rugged",
    shoulderStyle: "plated",
    chestDesign: "terrain_scanner",
    backpackType: "expedition_rig",
    bootStyle: "hiking",
    suitPattern: "utility_vest",
  },
  scientist: {
    accent: "#8B5CF6", accentLight: "#C4B5FD", accentDark: "#6D28D9",
    suitBase: "#EDE8F8", suitDark: "#C8B8E8",
    visorTint: ["#1a0a3a", "#0d0520"], visorReflect: "#A78BFA",
    helmetType: "sleek",
    bodyType: "slim",
    shoulderStyle: "minimal",
    chestDesign: "holo_display",
    backpackType: "data_core",
    bootStyle: "magnetic",
    suitPattern: "lab_lines",
  },
  pilot: {
    accent: "#F59E0B", accentLight: "#FCD34D", accentDark: "#B45309",
    suitBase: "#F8F0D8", suitDark: "#E0D0A8",
    visorTint: ["#3a2a00", "#201800"], visorReflect: "#FBBF24",
    helmetType: "aero",
    bodyType: "athletic",
    shoulderStyle: "wing",
    chestDesign: "wing_insignia",
    backpackType: "twin_thrusters",
    bootStyle: "flight",
    suitPattern: "flight_stripes",
  },
  captain: {
    accent: "#EF4444", accentLight: "#FCA5A5", accentDark: "#B91C1C",
    suitBase: "#F0E8E8", suitDark: "#D0B8B8",
    visorTint: ["#3a0a0a", "#200505"], visorReflect: "#F87171",
    helmetType: "commander",
    bodyType: "broad",
    shoulderStyle: "epaulette",
    chestDesign: "star_command",
    backpackType: "command_array",
    bootStyle: "military",
    suitPattern: "officer_trim",
  },
  ranger: {
    accent: "#14B8A6", accentLight: "#5EEAD4", accentDark: "#0F766E",
    suitBase: "#D0E0E0", suitDark: "#98B8B8",
    visorTint: ["#041a1a", "#020d0d"], visorReflect: "#2DD4BF",
    helmetType: "tactical",
    bodyType: "stealth",
    shoulderStyle: "asymmetric",
    chestDesign: "camo_weave",
    backpackType: "stealth_module",
    bootStyle: "tactical",
    suitPattern: "stealth_mesh",
  },
  guardian: {
    accent: "#D97706", accentLight: "#FCD34D", accentDark: "#92400E",
    suitBase: "#F0E8D0", suitDark: "#D0C0A0",
    visorTint: ["#2a1a00", "#180e00"], visorReflect: "#F59E0B",
    helmetType: "ornate",
    bodyType: "heavy",
    shoulderStyle: "massive",
    chestDesign: "shield_crest",
    backpackType: "power_core",
    bootStyle: "armored",
    suitPattern: "plate_armor",
  },
  vanguard: {
    accent: "#EC4899", accentLight: "#F9A8D4", accentDark: "#BE185D",
    suitBase: "#F0E0F0", suitDark: "#D0B0D0",
    visorTint: ["#2a0a20", "#180512"], visorReflect: "#F472B6",
    helmetType: "futuristic",
    bodyType: "dynamic",
    shoulderStyle: "floating",
    chestDesign: "energy_matrix",
    backpackType: "energy_wings",
    bootStyle: "hover",
    suitPattern: "energy_lines",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPACE BACKGROUNDS — the hero feature
// ═══════════════════════════════════════════════════════════════════════════════

const BG_CONFIGS = {
  nebula: { seed: 42, primary: "#6B21A8", secondary: "#1E40AF", accent: "#EC4899", stars: 60 },
  milky_way: { seed: 77, primary: "#1E3A5F", secondary: "#0F172A", accent: "#C4B5FD", stars: 120 },
  aurora: { seed: 101, primary: "#064E3B", secondary: "#0C1445", accent: "#34D399", stars: 45 },
  deep_space: { seed: 55, primary: "#0F0520", secondary: "#020208", accent: "#818CF8", stars: 90 },
  supernova: { seed: 33, primary: "#7C2D12", secondary: "#1C1917", accent: "#FDE68A", stars: 50 },
  saturn_view: { seed: 88, primary: "#1E1B4B", secondary: "#0C0A1A", accent: "#FCD34D", stars: 70 },
  binary_stars: { seed: 66, primary: "#1A1042", secondary: "#05030F", accent: "#F9A8D4", stars: 55 },
  black_hole: { seed: 99, primary: "#0A0005", secondary: "#000000", accent: "#F97316", stars: 40 },
  cosmic_dust: { seed: 22, primary: "#1C1532", secondary: "#080412", accent: "#A78BFA", stars: 80 },
  asteroid_belt: { seed: 44, primary: "#1A1510", secondary: "#0A0805", accent: "#D97706", stars: 35 },
};

function drawSpaceBackground(ctx, bgName, offset) {
  const cfg = BG_CONFIGS[bgName] || BG_CONFIGS.deep_space;
  const rng = seededRandom(cfg.seed);

  // Base dark gradient
  const baseG = ctx.createRadialGradient(CS / 2, CS / 2, 0, CS / 2, CS / 2, CS * 0.7);
  baseG.addColorStop(0, cfg.primary);
  baseG.addColorStop(0.6, lerpColor(cfg.primary, cfg.secondary, 0.6));
  baseG.addColorStop(1, cfg.secondary);
  ctx.fillStyle = baseG;
  ctx.fillRect(0, 0, CS, CS);

  // Nebula clouds (2-3 layered blobs)
  if (bgName === "nebula" || bgName === "cosmic_dust" || bgName === "deep_space") {
    for (let i = 0; i < 3; i++) {
      const cx = rng() * CS, cy = rng() * CS;
      const r = 60 + rng() * 100;
      ctx.save();
      ctx.globalAlpha = 0.15 + rng() * 0.12;
      const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      ng.addColorStop(0, cfg.accent);
      ng.addColorStop(0.4, rgba(cfg.primary, 0.5));
      ng.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ng;
      ctx.fillRect(0, 0, CS, CS);
      ctx.restore();
    }
  }

  // Milky Way band — dense diagonal star cloud
  if (bgName === "milky_way") {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.translate(CS / 2, CS / 2);
    ctx.rotate(-0.6);
    const mwG = ctx.createLinearGradient(0, -30, 0, 30);
    mwG.addColorStop(0, "rgba(0,0,0,0)");
    mwG.addColorStop(0.3, rgba(cfg.accent, 0.3));
    mwG.addColorStop(0.5, rgba(cfg.accent, 0.5));
    mwG.addColorStop(0.7, rgba(cfg.accent, 0.3));
    mwG.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = mwG;
    ctx.fillRect(-CS, -45, CS * 2, 90);
    ctx.restore();
    // Dense micro-stars in the band
    ctx.save();
    for (let i = 0; i < 80; i++) {
      const t = rng();
      const bx = t * CS;
      const by = CS * 0.55 - t * CS * 0.3 + (rng() - 0.5) * 60;
      const br = 0.3 + rng() * 1.2;
      ctx.globalAlpha = 0.3 + rng() * 0.5;
      ctx.fillStyle = rng() > 0.7 ? cfg.accent : "#ffffff";
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Aurora waves
  if (bgName === "aurora") {
    ctx.save();
    for (let w = 0; w < 3; w++) {
      ctx.globalAlpha = 0.08 + w * 0.04;
      ctx.beginPath();
      ctx.moveTo(0, CS * (0.25 + w * 0.08));
      for (let x = 0; x <= CS; x += 8) {
        const y = CS * (0.25 + w * 0.08) + Math.sin(x * 0.015 + w * 1.5 + offset * 0.01) * 40 + Math.sin(x * 0.008 + w) * 25;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(CS, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      const ag = ctx.createLinearGradient(0, 0, 0, CS * 0.5);
      ag.addColorStop(0, "rgba(0,0,0,0)");
      ag.addColorStop(0.5, cfg.accent);
      ag.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ag;
      ctx.fill();
    }
    ctx.restore();
  }

  // Supernova blast
  if (bgName === "supernova") {
    const scx = CS * 0.35, scy = CS * 0.3;
    // Outer shockwave
    ctx.save();
    ctx.globalAlpha = 0.15;
    const sw = ctx.createRadialGradient(scx, scy, 20, scx, scy, 150);
    sw.addColorStop(0, cfg.accent);
    sw.addColorStop(0.3, cfg.primary);
    sw.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sw;
    ctx.beginPath();
    ctx.arc(scx, scy, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Bright core
    ctx.save();
    ctx.globalAlpha = 0.5;
    const sc = ctx.createRadialGradient(scx, scy, 0, scx, scy, 30);
    sc.addColorStop(0, "#ffffff");
    sc.addColorStop(0.4, cfg.accent);
    sc.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sc;
    ctx.beginPath();
    ctx.arc(scx, scy, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Light rays
    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(scx, scy);
      ctx.lineTo(scx + Math.cos(a - 0.06) * 160, scy + Math.sin(a - 0.06) * 160);
      ctx.lineTo(scx + Math.cos(a + 0.06) * 160, scy + Math.sin(a + 0.06) * 160);
      ctx.closePath();
      ctx.fillStyle = cfg.accent;
      ctx.fill();
    }
    ctx.restore();
  }

  // Saturn
  if (bgName === "saturn_view") {
    const sx = CS * 0.7, sy = CS * 0.25;
    // Planet
    ctx.save();
    const pg = ctx.createRadialGradient(sx - 15, sy - 10, 5, sx, sy, 50);
    pg.addColorStop(0, "#E8D5A0");
    pg.addColorStop(0.5, "#C4A050");
    pg.addColorStop(1, "#6B5020");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(sx, sy, 50, 0, Math.PI * 2);
    ctx.fill();
    // Ring
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = "#E8D5A0";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 80, 18, 0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = rgba("#C4A050", 0.4);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 90, 22, 0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Binary stars
  if (bgName === "binary_stars") {
    for (const [bx, by, color, sz] of [[CS * 0.25, CS * 0.2, "#FFE4B5", 18], [CS * 0.35, CS * 0.28, "#FFB4C8", 12]]) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      const bg = ctx.createRadialGradient(bx, by, 0, bx, by, sz * 3);
      bg.addColorStop(0, color);
      bg.addColorStop(0.3, rgba(color, 0.3));
      bg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(bx, by, sz * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(bx, by, sz * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Black hole accretion disk
  if (bgName === "black_hole") {
    const bhx = CS * 0.55, bhy = CS * 0.35;
    // Accretion disk
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = cfg.accent;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.ellipse(bhx, bhy, 70, 20, 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = lighter(cfg.accent, 40);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(bhx, bhy, 55, 14, 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Dark center
    ctx.save();
    const bhG = ctx.createRadialGradient(bhx, bhy, 0, bhx, bhy, 25);
    bhG.addColorStop(0, "#000000");
    bhG.addColorStop(0.7, "rgba(0,0,0,0.9)");
    bhG.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bhG;
    ctx.beginPath();
    ctx.arc(bhx, bhy, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Gravitational lensing glow
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = cfg.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bhx, bhy, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Asteroid belt
  if (bgName === "asteroid_belt") {
    ctx.save();
    for (let i = 0; i < 12; i++) {
      const ax = rng() * CS, ay = rng() * CS;
      const ar = 3 + rng() * 12;
      const rot = rng() * Math.PI;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(rot);
      ctx.globalAlpha = 0.2 + rng() * 0.25;
      ctx.fillStyle = lerpColor("#5C4830", "#8B7355", rng());
      ctx.beginPath();
      ctx.ellipse(0, 0, ar, ar * (0.5 + rng() * 0.5), 0, 0, Math.PI * 2);
      ctx.fill();
      // Shadow side
      ctx.globalAlpha *= 0.5;
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.ellipse(ar * 0.15, ar * 0.15, ar * 0.8, ar * 0.4, 0, 0, Math.PI);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // Star field (all backgrounds get stars)
  ctx.save();
  for (let i = 0; i < cfg.stars; i++) {
    const sx = rng() * CS, sy = rng() * CS;
    const sr = 0.3 + rng() * 1.5;
    ctx.globalAlpha = 0.3 + rng() * 0.7;
    ctx.fillStyle = rng() > 0.85 ? cfg.accent : "#ffffff";
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    // Bright stars get a cross-spike
    if (sr > 1.2) {
      ctx.globalAlpha *= 0.3;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(sx - sr * 2.5, sy);
      ctx.lineTo(sx + sr * 2.5, sy);
      ctx.moveTo(sx, sy - sr * 2.5);
      ctx.lineTo(sx, sy + sr * 2.5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Default background per base (used when avatar.background is not set)
const DEFAULT_BG = {
  astronaut: "deep_space",
  explorer: "aurora",
  scientist: "nebula",
  pilot: "supernova",
  captain: "binary_stars",
  ranger: "cosmic_dust",
  guardian: "saturn_view",
  vanguard: "black_hole",
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CHARACTER DRAWING
// ═══════════════════════════════════════════════════════════════════════════════

function drawCharacter(ctx, avatar, baseName, offset) {
  const B = BASES[baseName] || BASES.astronaut;
  const cx = CS / 2;

  // Layout
  const headY = 120;
  const headR = 68;
  const bodyTop = 182;
  const bodyW = 95;
  const bodyH = 108;
  const legTop = bodyTop + bodyH;
  const legH = 72;

  // ── SPACE BACKGROUND ──
  const bgName = avatar.background || DEFAULT_BG[baseName] || "deep_space";
  drawSpaceBackground(ctx, bgName, offset);

  // ── CHARACTER GLOW (on top of background) ──
  const cg = ctx.createRadialGradient(cx, CS * 0.48, 0, cx, CS * 0.48, 130);
  cg.addColorStop(0, rgba(B.accent, 0.08));
  cg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, CS, CS);

  // ── BACKPACK (behind body) ──
  drawBackpack(ctx, cx, bodyTop, bodyW, bodyH, B);

  // ── LEGS ──
  drawLegs(ctx, cx, legTop, legH, bodyW, B);

  // ── BODY / TORSO ──
  drawTorso(ctx, cx, bodyTop, bodyW, bodyH, B);

  // ── ARMS ──
  drawArms(ctx, cx, bodyTop, bodyW, bodyH, B);

  // ── HELMET ──
  drawHelmet(ctx, cx, headY, headR, B);

  // ── VISOR (fully reflective, no face) ──
  drawVisor(ctx, cx, headY, headR, B);

  // ── ITEMS ──
  if (avatar.accessory) drawAccessory(ctx, cx, headY, headR, bodyTop, avatar.accessory, B);
  if (avatar.pet) drawPet(ctx, cx + 130, 220, avatar.pet, B);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELMET — 8 unique shapes
// ═══════════════════════════════════════════════════════════════════════════════

function drawHelmet(ctx, cx, cy, r, B) {
  ctx.save();
  const { helmetType, suitBase, suitDark, accent } = B;

  switch (helmetType) {
    case "fishbowl": {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      const hg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
      hg.addColorStop(0, "#ffffff");
      hg.addColorStop(0.3, suitBase);
      hg.addColorStop(0.7, suitDark);
      hg.addColorStop(1, darker(suitDark, 20));
      ctx.fillStyle = hg;
      ctx.fill();
      // Collar ring
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.82, r * 0.95, r * 0.22, 0, 0, Math.PI * 2);
      const cg = ctx.createLinearGradient(cx, cy + r * 0.6, cx, cy + r * 1.1);
      cg.addColorStop(0, lighter(accent, 30));
      cg.addColorStop(0.5, accent);
      cg.addColorStop(1, darker(accent, 30));
      ctx.fillStyle = cg;
      ctx.fill();
      drawSpecular(ctx, cx, cy, r);
      break;
    }
    case "angular": {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.85, cy + r * 0.5);
      ctx.lineTo(cx - r * 0.9, cy - r * 0.2);
      ctx.lineTo(cx - r * 0.5, cy - r * 0.85);
      ctx.lineTo(cx + r * 0.5, cy - r * 0.85);
      ctx.lineTo(cx + r * 0.9, cy - r * 0.2);
      ctx.lineTo(cx + r * 0.85, cy + r * 0.5);
      ctx.closePath();
      const ag = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
      ag.addColorStop(0, "#ffffff");
      ag.addColorStop(0.3, suitBase);
      ag.addColorStop(1, suitDark);
      ctx.fillStyle = ag;
      ctx.fill();
      ctx.strokeStyle = rgba(accent, 0.4);
      ctx.lineWidth = 2;
      ctx.stroke();
      // Antenna
      ctx.fillStyle = accent;
      ctx.fillRect(cx + r * 0.5, cy - r * 0.95, 6, 20);
      ctx.beginPath();
      ctx.arc(cx + r * 0.5 + 3, cy - r * 0.95, 5, 0, Math.PI * 2);
      ctx.fillStyle = lighter(accent, 50);
      ctx.fill();
      drawSpecular(ctx, cx - r * 0.2, cy - r * 0.3, r * 0.6);
      break;
    }
    case "sleek": {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.7, cy + r * 0.6);
      ctx.quadraticCurveTo(cx - r * 0.9, cy - r * 0.3, cx, cy - r * 0.9);
      ctx.quadraticCurveTo(cx + r * 0.9, cy - r * 0.3, cx + r * 0.7, cy + r * 0.6);
      ctx.quadraticCurveTo(cx, cy + r * 0.8, cx - r * 0.7, cy + r * 0.6);
      ctx.closePath();
      const sg = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
      sg.addColorStop(0, "#ffffff");
      sg.addColorStop(0.4, suitBase);
      sg.addColorStop(1, darker(suitDark, 10));
      ctx.fillStyle = sg;
      ctx.fill();
      // Side accent
      ctx.strokeStyle = rgba(accent, 0.5);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.65, cy + r * 0.3);
      ctx.quadraticCurveTo(cx - r * 0.75, cy - r * 0.1, cx - r * 0.3, cy - r * 0.7);
      ctx.stroke();
      drawSpecular(ctx, cx - r * 0.15, cy - r * 0.35, r * 0.5);
      break;
    }
    case "aero": {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.75, cy + r * 0.55);
      ctx.quadraticCurveTo(cx - r, cy, cx - r * 0.6, cy - r * 0.75);
      ctx.quadraticCurveTo(cx, cy - r * 1.05, cx + r * 0.6, cy - r * 0.75);
      ctx.quadraticCurveTo(cx + r, cy, cx + r * 0.75, cy + r * 0.55);
      ctx.closePath();
      const pg = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      pg.addColorStop(0, suitDark);
      pg.addColorStop(0.3, "#ffffff");
      pg.addColorStop(0.7, suitBase);
      pg.addColorStop(1, suitDark);
      ctx.fillStyle = pg;
      ctx.fill();
      // Speed stripe
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.95);
      ctx.lineTo(cx, cy + r * 0.4);
      ctx.stroke();
      drawSpecular(ctx, cx + r * 0.1, cy - r * 0.35, r * 0.45);
      break;
    }
    case "commander": {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      const cmdG = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.3, 0, cx, cy, r);
      cmdG.addColorStop(0, "#ffffff");
      cmdG.addColorStop(0.4, suitBase);
      cmdG.addColorStop(1, suitDark);
      ctx.fillStyle = cmdG;
      ctx.fill();
      // Crown crest
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy - r * 0.85);
      ctx.lineTo(cx - 12, cy - r * 1.25);
      ctx.lineTo(cx, cy - r * 1.1);
      ctx.lineTo(cx + 12, cy - r * 1.25);
      ctx.lineTo(cx + 18, cy - r * 0.85);
      ctx.closePath();
      const crG = ctx.createLinearGradient(cx, cy - r * 1.3, cx, cy - r * 0.8);
      crG.addColorStop(0, lighter(accent, 40));
      crG.addColorStop(1, accent);
      ctx.fillStyle = crG;
      ctx.fill();
      // Collar
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.82, r, r * 0.25, 0, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
      drawSpecular(ctx, cx, cy, r);
      break;
    }
    case "tactical": {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.8, cy + r * 0.55);
      ctx.lineTo(cx - r * 0.85, cy - r * 0.1);
      ctx.lineTo(cx - r * 0.55, cy - r * 0.8);
      ctx.lineTo(cx - r * 0.15, cy - r * 0.9);
      ctx.lineTo(cx + r * 0.15, cy - r * 0.9);
      ctx.lineTo(cx + r * 0.55, cy - r * 0.8);
      ctx.lineTo(cx + r * 0.85, cy - r * 0.1);
      ctx.lineTo(cx + r * 0.8, cy + r * 0.55);
      ctx.closePath();
      const tg = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
      tg.addColorStop(0, suitDark);
      tg.addColorStop(0.3, suitBase);
      tg.addColorStop(1, darker(suitDark, 15));
      ctx.fillStyle = tg;
      ctx.fill();
      ctx.strokeStyle = rgba(accent, 0.3);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      drawSpecular(ctx, cx - r * 0.15, cy - r * 0.3, r * 0.5);
      break;
    }
    case "ornate": {
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
      const og = ctx.createRadialGradient(cx, cy - r * 0.3, 0, cx, cy, r * 1.05);
      og.addColorStop(0, "#ffffff");
      og.addColorStop(0.3, suitBase);
      og.addColorStop(0.8, suitDark);
      og.addColorStop(1, darker(suitDark, 25));
      ctx.fillStyle = og;
      ctx.fill();
      // Cheek plates
      ctx.fillStyle = rgba(accent, 0.35);
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.75, cy + r * 0.15, r * 0.25, r * 0.45, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.75, cy + r * 0.15, r * 0.25, r * 0.45, 0.15, 0, Math.PI * 2);
      ctx.fill();
      // Top ridge
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.15, r * 0.5, Math.PI + 0.3, -0.3);
      ctx.stroke();
      // Collar
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.88, r * 1.05, r * 0.28, 0, 0, Math.PI * 2);
      const gcol = ctx.createLinearGradient(cx, cy + r * 0.6, cx, cy + r * 1.2);
      gcol.addColorStop(0, lighter(accent, 20));
      gcol.addColorStop(1, darker(accent, 20));
      ctx.fillStyle = gcol;
      ctx.fill();
      drawSpecular(ctx, cx, cy, r);
      break;
    }
    case "futuristic": {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.65, cy + r * 0.6);
      ctx.quadraticCurveTo(cx - r * 0.95, cy - r * 0.1, cx - r * 0.4, cy - r * 0.9);
      ctx.quadraticCurveTo(cx, cy - r * 1.1, cx + r * 0.4, cy - r * 0.9);
      ctx.quadraticCurveTo(cx + r * 0.95, cy - r * 0.1, cx + r * 0.65, cy + r * 0.6);
      ctx.quadraticCurveTo(cx, cy + r * 0.75, cx - r * 0.65, cy + r * 0.6);
      ctx.closePath();
      const fg = ctx.createRadialGradient(cx, cy - r * 0.2, 0, cx, cy, r);
      fg.addColorStop(0, "#ffffff");
      fg.addColorStop(0.3, suitBase);
      fg.addColorStop(1, suitDark);
      ctx.fillStyle = fg;
      ctx.fill();
      // LED seam line
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 1.0);
      ctx.lineTo(cx, cy + r * 0.55);
      ctx.stroke();
      ctx.restore();
      // Side LED dots
      for (let i = 0; i < 3; i++) {
        const dy = cy - r * 0.4 + i * r * 0.35;
        ctx.fillStyle = lighter(accent, 60);
        ctx.beginPath();
        ctx.arc(cx - r * 0.55, dy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + r * 0.55, dy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      drawSpecular(ctx, cx - r * 0.2, cy - r * 0.35, r * 0.45);
      break;
    }
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISOR — fully reflective, no face. Each unique.
// ═══════════════════════════════════════════════════════════════════════════════

function drawVisor(ctx, cx, cy, r, B) {
  ctx.save();
  const { helmetType, visorTint, visorReflect, accent } = B;

  // Common reflective gradient helper
  const reflGrad = (vx, vy, vr) => {
    const g = ctx.createRadialGradient(vx - vr * 0.3, vy - vr * 0.25, 0, vx, vy, vr);
    g.addColorStop(0, rgba(visorReflect, 0.35));
    g.addColorStop(0.3, visorTint[0]);
    g.addColorStop(0.7, visorTint[1]);
    g.addColorStop(1, "#000008");
    return g;
  };

  const drawReflection = (vx, vy, vr) => {
    // Primary reflection arc
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(vx - vr * 0.15, vy - vr * 0.25, vr * 0.45, vr * 0.22, -0.35, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
    // Secondary smaller reflection
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.ellipse(vx + vr * 0.25, vy + vr * 0.15, vr * 0.18, vr * 0.1, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();
    // Star twinkle in visor
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#ffffff";
    const sx = vx + vr * 0.2, sy = vy - vr * 0.1;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy); ctx.lineTo(sx + 3, sy);
    ctx.moveTo(sx, sy - 3); ctx.lineTo(sx, sy + 3);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  };

  switch (helmetType) {
    case "fishbowl": {
      const vr = r * 0.62;
      ctx.beginPath();
      ctx.arc(cx, cy, vr, 0, Math.PI * 2);
      ctx.fillStyle = reflGrad(cx, cy, vr);
      ctx.fill();
      drawReflection(cx, cy, vr);
      ctx.beginPath();
      ctx.arc(cx, cy, vr, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(accent, 0.5);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      break;
    }
    case "angular": {
      const vw = r * 0.85, vh = r * 0.38;
      ctx.beginPath();
      roundedRect(ctx, cx - vw, cy - vh, vw * 2, vh * 2, 12);
      ctx.fillStyle = reflGrad(cx, cy, vw);
      ctx.fill();
      drawReflection(cx, cy, Math.min(vw, vh));
      ctx.beginPath();
      roundedRect(ctx, cx - vw, cy - vh, vw * 2, vh * 2, 12);
      ctx.strokeStyle = rgba(accent, 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }
    case "sleek": {
      const sw = r * 0.8, sh = r * 0.22;
      ctx.beginPath();
      roundedRect(ctx, cx - sw, cy - sh, sw * 2, sh * 2, 8);
      const stripG = ctx.createLinearGradient(cx - sw, cy, cx + sw, cy);
      stripG.addColorStop(0, visorTint[1]);
      stripG.addColorStop(0.3, rgba(visorReflect, 0.5));
      stripG.addColorStop(0.7, visorTint[0]);
      stripG.addColorStop(1, visorTint[1]);
      ctx.fillStyle = stripG;
      ctx.fill();
      // Holographic shimmer
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.ellipse(cx - sw * 0.2, cy, sw * 0.3, sh * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
      break;
    }
    case "aero": {
      const dw = r * 0.7, dh = r * 0.55;
      ctx.beginPath();
      ctx.moveTo(cx - dw, cy - dh * 0.3);
      ctx.quadraticCurveTo(cx, cy - dh * 0.8, cx + dw, cy - dh * 0.3);
      ctx.quadraticCurveTo(cx + dw * 0.6, cy + dh, cx, cy + dh * 0.6);
      ctx.quadraticCurveTo(cx - dw * 0.6, cy + dh, cx - dw, cy - dh * 0.3);
      ctx.closePath();
      ctx.fillStyle = reflGrad(cx, cy, dh);
      ctx.fill();
      drawReflection(cx, cy, dh * 0.7);
      ctx.strokeStyle = rgba(accent, 0.5);
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }
    case "commander": {
      const vw = r * 0.75, vh = r * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - vw, cy - vh * 0.2);
      ctx.lineTo(cx, cy - vh * 0.7);
      ctx.lineTo(cx + vw, cy - vh * 0.2);
      ctx.lineTo(cx + vw * 0.6, cy + vh * 0.7);
      ctx.lineTo(cx - vw * 0.6, cy + vh * 0.7);
      ctx.closePath();
      ctx.fillStyle = reflGrad(cx, cy, vh);
      ctx.fill();
      drawReflection(cx, cy, vh * 0.6);
      ctx.strokeStyle = rgba(accent, 0.6);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      break;
    }
    case "tactical": {
      // T-visor
      ctx.beginPath();
      roundedRect(ctx, cx - r * 0.7, cy - r * 0.2, r * 1.4, r * 0.18, 4);
      ctx.fillStyle = visorTint[1];
      ctx.fill();
      ctx.beginPath();
      roundedRect(ctx, cx - r * 0.08, cy - r * 0.2, r * 0.16, r * 0.55, 3);
      ctx.fillStyle = visorTint[1];
      ctx.fill();
      // Glow
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      roundedRect(ctx, cx - r * 0.7, cy - r * 0.2, r * 1.4, r * 0.18, 4);
      ctx.strokeStyle = rgba(accent, 0.5);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      // Two glowing eyes in the slit
      ctx.fillStyle = lighter(accent, 60);
      ctx.beginPath();
      ctx.arc(cx - r * 0.22, cy - r * 0.11, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + r * 0.22, cy - r * 0.11, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "ornate": {
      ctx.beginPath();
      roundedRect(ctx, cx - r * 0.65, cy - r * 0.1, r * 1.3, r * 0.22, 5);
      const ng = ctx.createLinearGradient(cx - r * 0.65, cy, cx + r * 0.65, cy);
      ng.addColorStop(0, visorTint[1]);
      ng.addColorStop(0.5, rgba(visorReflect, 0.4));
      ng.addColorStop(1, visorTint[1]);
      ctx.fillStyle = ng;
      ctx.fill();
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = rgba(accent, 0.5);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      // Two glowing eyes
      ctx.fillStyle = lighter(accent, 60);
      ctx.beginPath();
      ctx.arc(cx - r * 0.2, cy + r * 0.01, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + r * 0.2, cy + r * 0.01, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "futuristic": {
      const fr = r * 0.6;
      ctx.beginPath();
      ctx.arc(cx, cy, fr, 0, Math.PI * 2);
      ctx.fillStyle = reflGrad(cx, cy, fr);
      ctx.fill();
      drawReflection(cx, cy, fr);
      // Scanning lines
      ctx.save();
      ctx.globalAlpha = 0.12;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - fr * 0.8, cy + i * 8);
        ctx.lineTo(cx + fr * 0.8, cy + i * 8);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.restore();
      // Rim glow
      ctx.beginPath();
      ctx.arc(cx, cy, fr, 0, Math.PI * 2);
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = rgba(accent, 0.6);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// TORSO — enhanced suit patterns
// ═══════════════════════════════════════════════════════════════════════════════

function drawTorso(ctx, cx, top, w, h, B) {
  ctx.save();
  const { bodyType, suitBase, suitDark, accent, suitPattern } = B;
  const hw = w / 2;
  const wm = { standard: 1, rugged: 1.1, slim: 0.88, athletic: 0.95, broad: 1.15, stealth: 0.92, heavy: 1.2, dynamic: 0.95 }[bodyType] || 1;
  const bw = hw * wm;

  // Main torso shape
  ctx.beginPath();
  ctx.moveTo(cx - bw, top);
  ctx.quadraticCurveTo(cx - bw - 5, top + h * 0.5, cx - bw * 0.85, top + h);
  ctx.lineTo(cx + bw * 0.85, top + h);
  ctx.quadraticCurveTo(cx + bw + 5, top + h * 0.5, cx + bw, top);
  ctx.closePath();

  // 3D gradient
  const tg = ctx.createLinearGradient(cx - bw, top, cx + bw, top + h);
  tg.addColorStop(0, lighter(suitBase, 15));
  tg.addColorStop(0.15, suitBase);
  tg.addColorStop(0.5, suitDark);
  tg.addColorStop(1, darker(suitDark, 20));
  ctx.fillStyle = tg;
  ctx.fill();

  // Top chest highlight
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.moveTo(cx - bw * 0.7, top);
  ctx.quadraticCurveTo(cx, top - 5, cx + bw * 0.7, top);
  ctx.lineTo(cx + bw * 0.5, top + h * 0.3);
  ctx.lineTo(cx - bw * 0.5, top + h * 0.3);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();

  // ── SUIT PATTERN — unique per character ──
  drawSuitPattern(ctx, cx, top, bw, h, B);

  // Belt
  ctx.fillStyle = rgba(accent, 0.3);
  ctx.fillRect(cx - bw * 0.85, top + h - 10, bw * 1.7, 8);
  ctx.fillStyle = rgba(accent, 0.55);
  roundedRect(ctx, cx - 8, top + h - 11, 16, 10, 3);
  ctx.fill();

  // Shoulders
  drawShoulders(ctx, cx, top, bw, B);

  ctx.restore();
}

function drawSuitPattern(ctx, cx, top, bw, h, B) {
  const { suitPattern, accent, suitBase } = B;
  ctx.save();

  switch (suitPattern) {
    case "classic_panels": {
      // Center seam + cross seam
      ctx.strokeStyle = rgba(accent, 0.15);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, top + 5); ctx.lineTo(cx, top + h - 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - bw * 0.5, top + h * 0.35);
      ctx.lineTo(cx + bw * 0.5, top + h * 0.35);
      ctx.stroke();
      // Chest panel
      roundedRect(ctx, cx - bw * 0.28, top + h * 0.12, bw * 0.56, h * 0.28, 6);
      ctx.fillStyle = rgba(accent, 0.15);
      ctx.fill();
      ctx.strokeStyle = rgba(accent, 0.25);
      ctx.stroke();
      // Mission patch circle
      ctx.fillStyle = rgba(accent, 0.4);
      ctx.beginPath();
      ctx.arc(cx, top + h * 0.55, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx, top + h * 0.55, 6, 0, Math.PI * 2);
      ctx.fill();
      // 3 status lights
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === 1 ? lighter(accent, 60) : rgba(accent, 0.4);
        ctx.beginPath();
        ctx.arc(cx - 10 + i * 10, top + h * 0.22, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "utility_vest": {
      // Outer vest overlay panels
      for (const side of [-1, 1]) {
        ctx.fillStyle = rgba(accent, 0.12);
        roundedRect(ctx, cx + side * bw * 0.15, top + h * 0.05, bw * 0.5, h * 0.55, 4);
        ctx.fill();
        ctx.strokeStyle = rgba(accent, 0.2);
        ctx.lineWidth = 1;
        ctx.stroke();
        // Pocket
        roundedRect(ctx, cx + side * bw * 0.2, top + h * 0.62, bw * 0.35, h * 0.2, 3);
        ctx.fillStyle = rgba(accent, 0.1);
        ctx.fill();
        ctx.strokeStyle = rgba(accent, 0.2);
        ctx.stroke();
      }
      // D-ring attachment points
      for (const side of [-1, 1]) {
        ctx.strokeStyle = rgba(accent, 0.5);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx + side * bw * 0.6, top + h * 0.4, 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Terrain scanner on chest
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 4;
      ctx.fillStyle = rgba(accent, 0.35);
      roundedRect(ctx, cx - 12, top + h * 0.15, 24, 16, 3);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "lab_lines": {
      // Clean horizontal scan lines
      ctx.globalAlpha = 0.08;
      for (let y = top + 10; y < top + h - 10; y += 6) {
        ctx.beginPath();
        ctx.moveTo(cx - bw * 0.7, y);
        ctx.lineTo(cx + bw * 0.7, y);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Holographic wrist display
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8;
      ctx.fillStyle = rgba(accent, 0.3);
      roundedRect(ctx, cx - bw - 28, top + h * 0.45, 20, 14, 3);
      ctx.fill();
      ctx.restore();
      // Center data strip
      ctx.fillStyle = rgba(accent, 0.2);
      roundedRect(ctx, cx - 4, top + h * 0.1, 8, h * 0.6, 3);
      ctx.fill();
      // Data nodes
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = rgba(accent, 0.4 + (i % 2) * 0.2);
        ctx.beginPath();
        ctx.arc(cx, top + h * 0.2 + i * h * 0.14, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "flight_stripes": {
      // Diagonal racing stripes
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - bw * 0.6 + i * 14, top + 5);
        ctx.lineTo(cx - bw * 0.3 + i * 14, top + h - 15);
        ctx.stroke();
      }
      ctx.restore();
      // Wing insignia on chest
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(cx - 18, top + h * 0.3);
      ctx.lineTo(cx, top + h * 0.24);
      ctx.lineTo(cx + 18, top + h * 0.3);
      ctx.lineTo(cx, top + h * 0.36);
      ctx.closePath();
      ctx.fill();
      // Collar pips
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = lighter(accent, 40);
        ctx.beginPath();
        ctx.arc(cx + 10 + i * 10, top + 6, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "officer_trim": {
      // Double gold/red trim lines down chest
      for (const side of [-1, 1]) {
        ctx.strokeStyle = rgba(accent, 0.35);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx + side * bw * 0.25, top + 8);
        ctx.lineTo(cx + side * bw * 0.25, top + h - 12);
        ctx.stroke();
      }
      // Star emblem
      drawStar(ctx, cx, top + h * 0.35, 12, 5, accent);
      // Rank bars
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = lighter(accent, 50);
        ctx.fillRect(cx + bw * 0.35, top + 12 + i * 8, 12, 3);
      }
      // Command sash diagonal
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx - bw * 0.6, top + 5);
      ctx.lineTo(cx + bw * 0.3, top + h - 5);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case "stealth_mesh": {
      // Subtle hexagonal mesh pattern
      ctx.globalAlpha = 0.06;
      const hexR = 8;
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 6; col++) {
          const hx = cx - bw * 0.5 + col * hexR * 1.75 + (row % 2) * hexR * 0.87;
          const hy = top + 10 + row * hexR * 1.5;
          ctx.beginPath();
          for (let p = 0; p < 6; p++) {
            const a = (p / 6) * Math.PI * 2 - Math.PI / 6;
            const px = hx + Math.cos(a) * hexR;
            const py = hy + Math.sin(a) * hexR;
            p === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = accent;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // Stealth cloak partial on right side
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.beginPath();
      ctx.moveTo(cx + bw * 0.4, top + 5);
      ctx.quadraticCurveTo(cx + bw + 30, top + h * 0.5, cx + bw * 0.5, top + h + 30);
      ctx.lineTo(cx + bw * 0.3, top + h);
      ctx.closePath();
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.restore();
      // Camo pattern nodes
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = rgba(accent, 0.15);
        ctx.beginPath();
        ctx.arc(cx - bw * 0.3 + i * 15, top + h * 0.55, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "plate_armor": {
      // Heavy plate segments
      for (let row = 0; row < 3; row++) {
        const py = top + 8 + row * h * 0.3;
        const pw = bw * (1.0 - row * 0.08);
        roundedRect(ctx, cx - pw * 0.8, py, pw * 1.6, h * 0.25, 5);
        ctx.fillStyle = rgba(accent, 0.06 + row * 0.03);
        ctx.fill();
        ctx.strokeStyle = rgba(accent, 0.2);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // Shield crest in center
      ctx.fillStyle = rgba(accent, 0.45);
      ctx.beginPath();
      ctx.moveTo(cx, top + h * 0.12);
      ctx.lineTo(cx + 14, top + h * 0.2);
      ctx.lineTo(cx + 12, top + h * 0.38);
      ctx.lineTo(cx, top + h * 0.45);
      ctx.lineTo(cx - 12, top + h * 0.38);
      ctx.lineTo(cx - 14, top + h * 0.2);
      ctx.closePath();
      ctx.fill();
      // Inner shield detail
      ctx.fillStyle = rgba(accent, 0.7);
      ctx.beginPath();
      ctx.arc(cx, top + h * 0.28, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "energy_lines": {
      // Glowing energy channels running through suit
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 6;
      ctx.strokeStyle = rgba(accent, 0.35);
      ctx.lineWidth = 1.5;
      // Center spine
      ctx.beginPath();
      ctx.moveTo(cx, top + 8);
      ctx.lineTo(cx, top + h - 10);
      ctx.stroke();
      // Branch lines
      for (let i = 0; i < 4; i++) {
        const y = top + h * 0.15 + i * h * 0.2;
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(cx - bw * 0.5, y + 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(cx + bw * 0.5, y + 8);
        ctx.stroke();
      }
      ctx.restore();
      // Energy core on chest
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 14;
      ctx.fillStyle = lighter(accent, 50);
      ctx.beginPath();
      ctx.arc(cx, top + h * 0.3, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(cx, top + h * 0.3, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Pulse dots along lines
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = lighter(accent, 40);
        ctx.beginPath();
        ctx.arc(cx, top + h * 0.15 + i * h * 0.25, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHOULDERS
// ═══════════════════════════════════════════════════════════════════════════════

function drawShoulders(ctx, cx, top, bw, B) {
  const { shoulderStyle, accent } = B;
  switch (shoulderStyle) {
    case "rounded": {
      for (const side of [-1, 1]) {
        const sg = ctx.createRadialGradient(cx + side * (bw + 5), top + 10, 0, cx + side * (bw + 5), top + 12, 20);
        sg.addColorStop(0, rgba(accent, 0.35));
        sg.addColorStop(1, rgba(accent, 0.1));
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(cx + side * (bw + 5), top + 12, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(accent, 0.45);
        ctx.beginPath();
        ctx.arc(cx + side * (bw + 5), top + 12, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "plated": {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + side * bw, top);
        ctx.lineTo(cx + side * (bw + 22), top + 8);
        ctx.lineTo(cx + side * (bw + 20), top + 28);
        ctx.lineTo(cx + side * bw, top + 25);
        ctx.closePath();
        const pg = ctx.createLinearGradient(cx + side * bw, top, cx + side * (bw + 22), top + 28);
        pg.addColorStop(0, rgba(accent, 0.4));
        pg.addColorStop(1, rgba(accent, 0.15));
        ctx.fillStyle = pg;
        ctx.fill();
      }
      break;
    }
    case "minimal": {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + side * (bw + 8), top + 5);
        ctx.lineTo(cx + side * (bw + 8), top + 25);
        ctx.stroke();
      }
      break;
    }
    case "wing": {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + side * bw, top + 5);
        ctx.lineTo(cx + side * (bw + 25), top);
        ctx.lineTo(cx + side * (bw + 15), top + 30);
        ctx.closePath();
        const wg = ctx.createLinearGradient(cx + side * bw, top, cx + side * (bw + 25), top + 30);
        wg.addColorStop(0, rgba(accent, 0.45));
        wg.addColorStop(1, rgba(accent, 0.1));
        ctx.fillStyle = wg;
        ctx.fill();
      }
      break;
    }
    case "epaulette": {
      for (const side of [-1, 1]) {
        ctx.fillStyle = accent;
        ctx.beginPath();
        roundedRect(ctx, cx + side * (bw + 2) - 12, top + 2, 24, 8, 3);
        ctx.fill();
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = lighter(accent, 50);
          ctx.fillRect(cx + side * (bw + 2) - 8 + i * 7, top + 12, 4, 2);
        }
      }
      break;
    }
    case "asymmetric": {
      ctx.fillStyle = rgba(accent, 0.35);
      ctx.beginPath();
      ctx.ellipse(cx - bw - 8, top + 15, 22, 18, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + bw + 5, top + 15, 12, 10, 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "massive": {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx + side * (bw + 10), top + 10, 25, 22, side * 0.15, 0, Math.PI * 2);
        const sg = ctx.createRadialGradient(cx + side * (bw + 8), top + 5, 0, cx + side * (bw + 10), top + 10, 25);
        sg.addColorStop(0, lighter(accent, 30));
        sg.addColorStop(0.5, accent);
        sg.addColorStop(1, darker(accent, 25));
        ctx.fillStyle = sg;
        ctx.fill();
      }
      break;
    }
    case "floating": {
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.shadowColor = accent;
        ctx.shadowBlur = 10;
        ctx.fillStyle = rgba(accent, 0.5);
        ctx.beginPath();
        ctx.ellipse(cx + side * (bw + 15), top + 10, 14, 10, side * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARMS
// ═══════════════════════════════════════════════════════════════════════════════

function drawArms(ctx, cx, bodyTop, bodyW, bodyH, B) {
  ctx.save();
  const { suitBase, suitDark, accent, bodyType } = B;
  const wm = { standard: 1, rugged: 1.1, slim: 0.88, athletic: 0.95, broad: 1.15, stealth: 0.92, heavy: 1.2, dynamic: 0.95 }[bodyType] || 1;
  const hw = (bodyW / 2) * wm;
  const armLen = bodyH * 0.8;

  for (const side of [-1, 1]) {
    const sx = cx + side * (hw + 12);
    const sy = bodyTop + 20;

    // Upper arm
    ctx.beginPath();
    roundedRect(ctx, sx - 10, sy, 20, armLen * 0.45, 8);
    const ug = ctx.createLinearGradient(sx - 10, sy, sx + 10, sy);
    ug.addColorStop(0, side === -1 ? suitDark : lighter(suitBase, 10));
    ug.addColorStop(1, side === -1 ? lighter(suitBase, 10) : suitDark);
    ctx.fillStyle = ug;
    ctx.fill();

    // Elbow joint
    const ey = sy + armLen * 0.45;
    ctx.beginPath();
    ctx.arc(sx, ey, 10, 0, Math.PI * 2);
    ctx.fillStyle = rgba(accent, 0.3);
    ctx.fill();
    ctx.fillStyle = rgba(accent, 0.5);
    ctx.beginPath();
    ctx.arc(sx, ey, 5, 0, Math.PI * 2);
    ctx.fill();

    // Forearm
    ctx.beginPath();
    roundedRect(ctx, sx - 9, ey + 5, 18, armLen * 0.35, 7);
    ctx.fillStyle = suitBase;
    ctx.fill();

    // Glove
    const gy = ey + 5 + armLen * 0.35;
    ctx.beginPath();
    roundedRect(ctx, sx - 12, gy, 24, 18, 8);
    const gg = ctx.createLinearGradient(sx, gy, sx, gy + 18);
    gg.addColorStop(0, accent);
    gg.addColorStop(1, darker(accent, 25));
    ctx.fillStyle = gg;
    ctx.fill();
    ctx.fillStyle = lighter(accent, 40);
    ctx.fillRect(sx - 11, gy, 22, 4);
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGS
// ═══════════════════════════════════════════════════════════════════════════════

function drawLegs(ctx, cx, top, h, bodyW, B) {
  ctx.save();
  const { suitBase, suitDark, accent, bootStyle } = B;
  const legSpacing = bodyW * 0.22;

  for (const side of [-1, 1]) {
    const lx = cx + side * legSpacing;

    // Upper leg
    ctx.beginPath();
    roundedRect(ctx, lx - 14, top, 28, h * 0.45, 10);
    const lg = ctx.createLinearGradient(lx - 14, top, lx + 14, top);
    lg.addColorStop(0, side === -1 ? suitDark : suitBase);
    lg.addColorStop(1, side === -1 ? suitBase : suitDark);
    ctx.fillStyle = lg;
    ctx.fill();

    // Knee joint
    const ky = top + h * 0.45;
    ctx.beginPath();
    ctx.arc(lx, ky, 11, 0, Math.PI * 2);
    ctx.fillStyle = rgba(accent, 0.25);
    ctx.fill();
    ctx.fillStyle = rgba(accent, 0.45);
    ctx.beginPath();
    ctx.arc(lx, ky, 5, 0, Math.PI * 2);
    ctx.fill();

    // Lower leg
    ctx.beginPath();
    roundedRect(ctx, lx - 12, ky + 6, 24, h * 0.3, 8);
    ctx.fillStyle = suitBase;
    ctx.fill();

    // Boot
    const by = ky + 6 + h * 0.3;
    const bootH = h * 0.25;
    drawBoot(ctx, lx, by, bootH, bootStyle, accent);
  }
  ctx.restore();
}

function drawBoot(ctx, cx, top, h, style, accent) {
  const w = style === "armored" ? 22 : style === "hiking" ? 20 : style === "hover" ? 18 : 17;
  ctx.beginPath();
  ctx.moveTo(cx - w, top);
  ctx.lineTo(cx - w, top + h - 6);
  ctx.quadraticCurveTo(cx - w, top + h, cx - w + 6, top + h);
  ctx.lineTo(cx + w + 4, top + h);
  ctx.quadraticCurveTo(cx + w + 8, top + h, cx + w + 6, top + h - 8);
  ctx.lineTo(cx + w, top);
  ctx.closePath();
  const bg = ctx.createLinearGradient(cx, top, cx, top + h);
  bg.addColorStop(0, accent);
  bg.addColorStop(0.6, darker(accent, 20));
  bg.addColorStop(1, darker(accent, 40));
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = lighter(accent, 40);
  ctx.fillRect(cx - w, top, w * 2, 4);
  ctx.fillStyle = darker(accent, 35);
  ctx.fillRect(cx - w, top + h - 5, w * 2 + 6, 5);

  // Hover boots get a glow
  if (style === "hover") {
    ctx.save();
    ctx.globalAlpha = 0.35;
    const hg = ctx.createRadialGradient(cx, top + h, 0, cx, top + h, 12);
    hg.addColorStop(0, lighter(accent, 60));
    hg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(cx, top + h, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACKPACK — dramatic, character-defining
// ═══════════════════════════════════════════════════════════════════════════════

function drawBackpack(ctx, cx, bodyTop, bodyW, bodyH, B) {
  ctx.save();
  const { backpackType, accent, suitDark } = B;
  const bx = cx, by = bodyTop + 5;

  switch (backpackType) {
    case "life_support": {
      // Classic boxy life support unit
      roundedRect(ctx, bx - 30, by + 5, 60, bodyH * 0.65, 8);
      const bg = ctx.createLinearGradient(bx - 30, by, bx + 30, by + bodyH * 0.65);
      bg.addColorStop(0, darker(suitDark, 15));
      bg.addColorStop(1, darker(suitDark, 35));
      ctx.fillStyle = bg;
      ctx.fill();
      // Vent slits
      ctx.strokeStyle = rgba(accent, 0.2);
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(bx - 18, by + 18 + i * 10);
        ctx.lineTo(bx + 18, by + 18 + i * 10);
        ctx.stroke();
      }
      // Status light
      ctx.fillStyle = lighter(accent, 50);
      ctx.beginPath();
      ctx.arc(bx, by + 12, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "expedition_rig": {
      // Large pack with tools hanging off it
      roundedRect(ctx, bx - 38, by - 5, 76, bodyH * 0.8, 10);
      const eg = ctx.createLinearGradient(bx, by, bx, by + bodyH * 0.8);
      eg.addColorStop(0, darker(suitDark, 18));
      eg.addColorStop(1, darker(suitDark, 35));
      ctx.fillStyle = eg;
      ctx.fill();
      // Side pouches
      for (const side of [-1, 1]) {
        roundedRect(ctx, bx + side * 30, by + 15, 16, 30, 4);
        ctx.fillStyle = rgba(accent, 0.2);
        ctx.fill();
        ctx.strokeStyle = rgba(accent, 0.3);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // Antenna with blinking tip
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx + 28, by - 5);
      ctx.lineTo(bx + 34, by - 35);
      ctx.stroke();
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 6;
      ctx.fillStyle = lighter(accent, 50);
      ctx.beginPath();
      ctx.arc(bx + 34, by - 35, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Tool attachment
      ctx.strokeStyle = rgba(accent, 0.4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx - 35, by + bodyH * 0.6);
      ctx.lineTo(bx - 42, by + bodyH * 0.75);
      ctx.stroke();
      break;
    }
    case "data_core": {
      // Compact glowing data unit
      roundedRect(ctx, bx - 24, by + 10, 48, bodyH * 0.5, 6);
      ctx.fillStyle = darker(suitDark, 18);
      ctx.fill();
      // Glowing data matrix
      ctx.save();
      ctx.globalAlpha = 0.25;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? accent : lighter(accent, 40);
          ctx.fillRect(bx - 16 + c * 9, by + 18 + r * 9, 6, 6);
        }
      }
      ctx.restore();
      // Blue glow from core
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 10;
      ctx.fillStyle = rgba(accent, 0.3);
      ctx.beginPath();
      ctx.arc(bx, by + bodyH * 0.32, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "twin_thrusters": {
      // Dual thruster pods with flame effects
      for (const side of [-1, 1]) {
        const tx = bx + side * 20;
        // Thruster body
        roundedRect(ctx, tx - 12, by + 3, 24, bodyH * 0.6, 6);
        const tg = ctx.createLinearGradient(tx, by, tx, by + bodyH * 0.6);
        tg.addColorStop(0, darker(suitDark, 20));
        tg.addColorStop(1, darker(suitDark, 40));
        ctx.fillStyle = tg;
        ctx.fill();
        // Nozzle
        ctx.fillStyle = accent;
        roundedRect(ctx, tx - 9, by + bodyH * 0.58, 18, 10, 3);
        ctx.fill();
        // Exhaust flame
        ctx.save();
        const fy = by + bodyH * 0.68;
        const fg = ctx.createRadialGradient(tx, fy, 0, tx, fy + 20, 16);
        fg.addColorStop(0, "rgba(255,255,255,0.6)");
        fg.addColorStop(0.3, rgba(lighter(accent, 60), 0.5));
        fg.addColorStop(0.6, rgba(accent, 0.3));
        fg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(tx - 8, fy);
        ctx.quadraticCurveTo(tx, fy + 28, tx + 8, fy);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // Intake vents
        ctx.strokeStyle = rgba(accent, 0.3);
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(tx - 8, by + 15 + i * 8);
          ctx.lineTo(tx + 8, by + 15 + i * 8);
          ctx.stroke();
        }
      }
      // Cross brace
      ctx.fillStyle = rgba(accent, 0.25);
      ctx.fillRect(bx - 8, by + bodyH * 0.25, 16, 6);
      break;
    }
    case "command_array": {
      // Command pack with antenna array
      roundedRect(ctx, bx - 32, by + 3, 64, bodyH * 0.62, 8);
      const cg = ctx.createLinearGradient(bx, by, bx, by + bodyH * 0.62);
      cg.addColorStop(0, darker(suitDark, 16));
      cg.addColorStop(1, darker(suitDark, 32));
      ctx.fillStyle = cg;
      ctx.fill();
      // Triple antenna array
      for (let i = -1; i <= 1; i++) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx + i * 14, by + 3);
        ctx.lineTo(bx + i * 18, by - 25);
        ctx.stroke();
        ctx.fillStyle = lighter(accent, 40);
        ctx.beginPath();
        ctx.arc(bx + i * 18, by - 25, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Connecting bar
      ctx.strokeStyle = rgba(accent, 0.5);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx - 18, by - 20);
      ctx.lineTo(bx + 18, by - 20);
      ctx.stroke();
      // Display panel
      ctx.fillStyle = rgba(accent, 0.2);
      roundedRect(ctx, bx - 14, by + 15, 28, 18, 3);
      ctx.fill();
      // Status bar
      ctx.fillStyle = lighter(accent, 50);
      ctx.fillRect(bx - 10, by + 20, 20, 3);
      break;
    }
    case "stealth_module": {
      // Low profile flush-mounted
      roundedRect(ctx, bx - 26, by + 8, 52, bodyH * 0.48, 5);
      const sg = ctx.createLinearGradient(bx, by, bx, by + bodyH * 0.48);
      sg.addColorStop(0, darker(suitDark, 10));
      sg.addColorStop(1, darker(suitDark, 22));
      ctx.fillStyle = sg;
      ctx.fill();
      // Subtle edge glow
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 4;
      ctx.strokeStyle = rgba(accent, 0.15);
      ctx.lineWidth = 1;
      roundedRect(ctx, bx - 26, by + 8, 52, bodyH * 0.48, 5);
      ctx.stroke();
      ctx.restore();
      // Active camo indicator
      ctx.fillStyle = rgba(accent, 0.35);
      ctx.beginPath();
      ctx.arc(bx, by + bodyH * 0.3, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "power_core": {
      // Armored power unit with glowing core
      roundedRect(ctx, bx - 28, by + 3, 56, bodyH * 0.65, 8);
      const pg = ctx.createLinearGradient(bx, by, bx, by + bodyH * 0.65);
      pg.addColorStop(0, darker(suitDark, 18));
      pg.addColorStop(1, darker(suitDark, 35));
      ctx.fillStyle = pg;
      ctx.fill();
      // Armor plates
      ctx.strokeStyle = rgba(accent, 0.2);
      ctx.lineWidth = 1.5;
      roundedRect(ctx, bx - 22, by + 10, 44, bodyH * 0.25, 4);
      ctx.stroke();
      roundedRect(ctx, bx - 22, by + bodyH * 0.35, 44, bodyH * 0.2, 4);
      ctx.stroke();
      // Central power core glow
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 16;
      ctx.fillStyle = rgba(accent, 0.65);
      ctx.beginPath();
      ctx.arc(bx, by + bodyH * 0.3, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lighter(accent, 60);
      ctx.beginPath();
      ctx.arc(bx, by + bodyH * 0.3, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "energy_wings": {
      // Compact core + projected energy wings
      roundedRect(ctx, bx - 20, by + 8, 40, bodyH * 0.45, 6);
      ctx.fillStyle = darker(suitDark, 15);
      ctx.fill();
      // Energy wing projections
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      for (const side of [-1, 1]) {
        // Wing shape
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(bx + side * 20, by + 12);
        ctx.quadraticCurveTo(bx + side * 60, by + 5, bx + side * 65, by + 20);
        ctx.quadraticCurveTo(bx + side * 55, by + 40, bx + side * 20, by + 42);
        ctx.closePath();
        const wg = ctx.createLinearGradient(bx, by, bx + side * 65, by);
        wg.addColorStop(0, accent);
        wg.addColorStop(0.5, lighter(accent, 40));
        wg.addColorStop(1, rgba(accent, 0.1));
        ctx.fillStyle = wg;
        ctx.fill();
        // Inner bright line
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = lighter(accent, 60);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx + side * 20, by + 25);
        ctx.quadraticCurveTo(bx + side * 45, by + 18, bx + side * 55, by + 25);
        ctx.stroke();
      }
      ctx.restore();
      // Core glow
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8;
      ctx.fillStyle = lighter(accent, 50);
      ctx.beginPath();
      ctx.arc(bx, by + bodyH * 0.25, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCESSORIES & PETS (kept, no hats)
// ═══════════════════════════════════════════════════════════════════════════════

function drawAccessory(ctx, cx, headY, headR, bodyTop, acc, B) {
  ctx.save();
  switch (acc) {
    case "bowtie": {
      const by = bodyTop + 3;
      ctx.fillStyle = B.accent;
      ctx.beginPath();
      ctx.moveTo(cx, by); ctx.lineTo(cx - 14, by - 8); ctx.lineTo(cx - 14, by + 8);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, by); ctx.lineTo(cx + 14, by - 8); ctx.lineTo(cx + 14, by + 8);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = darker(B.accent, 20);
      ctx.beginPath(); ctx.arc(cx, by, 4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "scarf": {
      ctx.fillStyle = rgba(B.accent, 0.7);
      ctx.beginPath();
      ctx.ellipse(cx, bodyTop + 5, headR * 0.7, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 10, bodyTop + 10);
      ctx.quadraticCurveTo(cx + 25, bodyTop + 30, cx + 15, bodyTop + 50);
      ctx.lineWidth = 8;
      ctx.strokeStyle = rgba(B.accent, 0.5);
      ctx.stroke();
      break;
    }
    case "medal": {
      // Medal on chest
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + headR * 0.5, bodyTop + 2);
      ctx.lineTo(cx + headR * 0.3, bodyTop + 25);
      ctx.stroke();
      // Medal disc
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(cx + headR * 0.3, bodyTop + 30, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#B8860B";
      ctx.beginPath();
      ctx.arc(cx + headR * 0.3, bodyTop + 30, 5, 0, Math.PI * 2);
      ctx.fill();
      // Ribbon
      ctx.fillStyle = "#EF4444";
      ctx.fillRect(cx + headR * 0.5 - 6, bodyTop + 1, 12, 6);
      break;
    }
    case "cape": {
      // Flowing cape behind
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(cx - headR * 0.4, bodyTop);
      ctx.quadraticCurveTo(cx - headR * 1.2, bodyTop + 80, cx - headR * 0.5, bodyTop + 140);
      ctx.lineTo(cx + headR * 0.5, bodyTop + 140);
      ctx.quadraticCurveTo(cx + headR * 1.2, bodyTop + 80, cx + headR * 0.4, bodyTop);
      ctx.closePath();
      const cg = ctx.createLinearGradient(cx, bodyTop, cx, bodyTop + 140);
      cg.addColorStop(0, B.accent);
      cg.addColorStop(1, darker(B.accent, 30));
      ctx.fillStyle = cg;
      ctx.fill();
      ctx.restore();
      break;
    }
    case "antenna_topper": {
      // Bobble antenna on helmet
      ctx.strokeStyle = B.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, headY - headR * 0.9);
      ctx.lineTo(cx, headY - headR * 1.4);
      ctx.stroke();
      ctx.save();
      ctx.shadowColor = B.accent;
      ctx.shadowBlur = 8;
      ctx.fillStyle = lighter(B.accent, 50);
      ctx.beginPath();
      ctx.arc(cx, headY - headR * 1.4, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "shoulder_lamp": {
      // Mounted light on left shoulder
      ctx.save();
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#FFFF88";
      ctx.beginPath();
      ctx.arc(cx - headR * 0.9, bodyTop + 8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Beam
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.beginPath();
      ctx.moveTo(cx - headR * 0.9, bodyTop + 8);
      ctx.lineTo(cx - headR * 1.8, bodyTop - 30);
      ctx.lineTo(cx - headR * 0.5, bodyTop - 20);
      ctx.closePath();
      ctx.fillStyle = "#FFFF88";
      ctx.fill();
      ctx.restore();
      break;
    }
    case "wrist_device": {
      // Tech device on left wrist
      ctx.save();
      ctx.shadowColor = B.accent;
      ctx.shadowBlur = 6;
      ctx.fillStyle = rgba(B.accent, 0.5);
      roundedRect(ctx, cx - headR * 1.1 - 12, bodyTop + 65, 18, 12, 3);
      ctx.fill();
      ctx.restore();
      // Screen glow
      ctx.fillStyle = lighter(B.accent, 50);
      ctx.fillRect(cx - headR * 1.1 - 9, bodyTop + 68, 12, 6);
      break;
    }
  }
  ctx.restore();
}

function drawPet(ctx, px, py, pet, B) {
  ctx.save();
  const s = 22;
  const { accent } = B;
  switch (pet) {
    case "robot": {
      roundedRect(ctx, px - s, py - s, s * 2, s * 2, 6);
      const rg = ctx.createLinearGradient(px, py - s, px, py + s);
      rg.addColorStop(0, lighter(accent, 30));
      rg.addColorStop(1, accent);
      ctx.fillStyle = rg;
      ctx.fill();
      ctx.fillStyle = "#FFFF00";
      ctx.beginPath(); ctx.arc(px - s * 0.35, py - s * 0.15, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + s * 0.35, py - s * 0.15, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, py - s); ctx.lineTo(px, py - s - 12); ctx.stroke();
      ctx.fillStyle = lighter(accent, 50);
      ctx.beginPath(); ctx.arc(px, py - s - 12, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#333";
      ctx.fillRect(px - s * 0.3, py + s * 0.25, s * 0.6, 3);
      break;
    }
    case "alien": {
      ctx.beginPath();
      ctx.ellipse(px, py - 5, s * 0.75, s * 0.9, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#44CC44";
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.beginPath(); ctx.ellipse(px - s * 0.3, py - s * 0.2, 6, 9, -0.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(px + s * 0.3, py - s * 0.2, 6, 9, 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath(); ctx.arc(px - s * 0.25, py - s * 0.35, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + s * 0.35, py - s * 0.35, 3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "robot_dog": {
      ctx.fillStyle = accent;
      roundedRect(ctx, px - s * 0.7, py - s * 0.3, s * 1.4, s * 0.8, 6);
      ctx.fill();
      ctx.beginPath(); ctx.arc(px + s * 0.5, py - s * 0.3, s * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = lighter(accent, 20);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(px + s * 0.2, py - s * 0.85, 6, 10);
      ctx.fillRect(px + s * 0.65, py - s * 0.85, 6, 10);
      ctx.fillStyle = "#FFFF00";
      ctx.beginPath(); ctx.arc(px + s * 0.4, py - s * 0.35, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + s * 0.65, py - s * 0.35, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = darker(accent, 15);
      ctx.fillRect(px - s * 0.5, py + s * 0.5, 6, 10);
      ctx.fillRect(px + s * 0.4, py + s * 0.5, 6, 10);
      break;
    }
    case "star": {
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      drawStar(ctx, px, py, s * 0.7, 5, lighter(accent, 40));
      ctx.restore();
      drawStar(ctx, px, py, s * 0.7, 5, accent);
      break;
    }
    case "planet": {
      ctx.beginPath(); ctx.arc(px, py, s * 0.65, 0, Math.PI * 2);
      const plg = ctx.createRadialGradient(px - s * 0.2, py - s * 0.2, 0, px, py, s * 0.65);
      plg.addColorStop(0, lighter(accent, 40));
      plg.addColorStop(0.6, accent);
      plg.addColorStop(1, darker(accent, 30));
      ctx.fillStyle = plg;
      ctx.fill();
      ctx.strokeStyle = lighter(accent, 50);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(px, py, s * 1.0, s * 0.25, 0.3, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "comet": {
      ctx.save();
      ctx.globalAlpha = 0.4;
      const cg = ctx.createLinearGradient(px, py, px - s * 2, py + s);
      cg.addColorStop(0, accent);
      cg.addColorStop(1, "transparent");
      ctx.strokeStyle = cg;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px - s, py + s * 0.3, px - s * 2, py + s);
      ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.arc(px, py, s * 0.35, 0, Math.PI * 2);
      const ccg = ctx.createRadialGradient(px, py, 0, px, py, s * 0.35);
      ccg.addColorStop(0, "#ffffff");
      ccg.addColorStop(0.5, lighter(accent, 40));
      ccg.addColorStop(1, accent);
      ctx.fillStyle = ccg;
      ctx.fill();
      break;
    }
    case "drone": {
      // Hovering mini drone
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 6;
      roundedRect(ctx, px - s * 0.5, py - s * 0.3, s, s * 0.6, 4);
      const dg = ctx.createLinearGradient(px, py - s * 0.3, px, py + s * 0.3);
      dg.addColorStop(0, lighter(accent, 20));
      dg.addColorStop(1, accent);
      ctx.fillStyle = dg;
      ctx.fill();
      ctx.restore();
      // Rotors
      ctx.strokeStyle = rgba(accent, 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(px - s * 0.5, py - s * 0.35, s * 0.5, 3, -0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(px + s * 0.5, py - s * 0.35, s * 0.5, 3, 0.2, 0, Math.PI * 2);
      ctx.stroke();
      // Eye
      ctx.fillStyle = lighter(accent, 60);
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function drawStar(ctx, cx, cy, size, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? size : size * 0.45;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AvatarRendererCanvas({
  avatar = { base: "astronaut" },
  size = "md",
  onClick,
  animate = true,
  showGlow = true,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const offsetRef = useRef(0);

  const sizeConfig = SIZES[size] || SIZES.md;
  const baseName = (avatar.base || "astronaut").replace(/^base_/, "");
  const B = BASES[baseName] || BASES.astronaut;

  const drawFrame = useCallback(
    (offset = 0) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      const scale = canvas.width / CS;
      ctx.scale(scale, scale);

      if (animate && offset !== 0) {
        const floatY = Math.sin(offset * 0.035) * 3;
        ctx.translate(0, floatY);
      }

      drawCharacter(ctx, avatar, baseName, offset);
      ctx.restore();
    },
    [avatar, baseName, animate]
  );

  useEffect(() => {
    if (!animate) {
      drawFrame(0);
      return;
    }
    const tick = () => {
      offsetRef.current += 1;
      drawFrame(offsetRef.current);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [animate, drawFrame]);

  useEffect(() => {
    if (!animate) drawFrame(0);
  }, [animate, drawFrame]);

  const internalSize = sizeConfig.w * 2;

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        width: sizeConfig.w,
        height: sizeConfig.h,
        cursor: onClick ? "pointer" : "default",
        borderRadius: "50%",
        overflow: "hidden",
        boxShadow: showGlow
          ? `0 0 ${sizeConfig.w * 0.2}px ${rgba(B.accent, 0.35)}, 0 0 ${sizeConfig.w * 0.08}px ${rgba(B.accent, 0.2)}`
          : undefined,
        backgroundColor: "#020617",
      }}
    >
      <canvas
        ref={canvasRef}
        width={internalSize}
        height={internalSize}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
