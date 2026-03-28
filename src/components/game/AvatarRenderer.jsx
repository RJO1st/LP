"use client";
// ─── AvatarRenderer.jsx ─────────────────────────────────────────────────────
// Game-quality illustrated astronaut avatars with unique helmet silhouettes,
// visor star reflections, suit details, and smooth SVG filter effects.
//
// Props:
//   avatar   — { base, hat, pet, accessory, background, skin, hair, expression }
//   size     — "sm" | "md" | "lg" | "xl"
//   animated — boolean
//   onClick  — optional
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo } from "react";

// ─── SIZE CONFIG ─────────────────────────────────────────────────────────────
const SIZES = {
  sm:  { w: 48,  h: 48 },
  md:  { w: 80,  h: 80 },
  lg:  { w: 120, h: 120 },
  xl:  { w: 160, h: 160 },
};

// ─── 8 BASE CHARACTER SUITS ────────────────────────────────────────────────
// Each base has a unique helmet shape via helmetType + distinct color palette
const BASES = {
  astronaut: {
    label: "Astro",
    suit: "#e8ecf4", suitMid: "#cdd5e4", suitDark: "#9dabc4",
    accent: "#6366f1", accentMid: "#5558e0", accentDark: "#4338ca",
    helmet: "#f1f5f9", helmetRim: "#8c9ab5",
    visor: "#1e1b4b", visorGlow: "#6366f1", glow: "rgba(99,102,241,0.35)",
    helmetType: "classic",
  },
  explorer: {
    label: "Explorer",
    suit: "#d8f5e8", suitMid: "#a7e8c9", suitDark: "#6cc99e",
    accent: "#10b981", accentMid: "#0d9668", accentDark: "#047857",
    helmet: "#ecfdf5", helmetRim: "#6ee7b7",
    visor: "#022c22", visorGlow: "#10b981", glow: "rgba(16,185,129,0.35)",
    helmetType: "angular",
  },
  scientist: {
    label: "Scientist",
    suit: "#fef6d8", suitMid: "#fde68a", suitDark: "#dbb536",
    accent: "#f59e0b", accentMid: "#db8b0a", accentDark: "#b45309",
    helmet: "#fffbeb", helmetRim: "#fbbf24",
    visor: "#451a03", visorGlow: "#f59e0b", glow: "rgba(245,158,11,0.35)",
    helmetType: "bulb",
  },
  pilot: {
    label: "Pilot",
    suit: "#fee8eb", suitMid: "#fecdd3", suitDark: "#f8909e",
    accent: "#f43f5e", accentMid: "#e11d48", accentDark: "#be123c",
    helmet: "#fff1f2", helmetRim: "#fb7185",
    visor: "#4c0519", visorGlow: "#f43f5e", glow: "rgba(244,63,94,0.35)",
    helmetType: "wide",
  },
  captain: {
    label: "Captain",
    suit: "#efe9fe", suitMid: "#ddd6fe", suitDark: "#b3a0f0",
    accent: "#7c3aed", accentMid: "#6d28d9", accentDark: "#5b21b6",
    helmet: "#f5f3ff", helmetRim: "#a78bfa",
    visor: "#2e1065", visorGlow: "#7c3aed", glow: "rgba(124,58,237,0.35)",
    helmetType: "commander",
  },
  ranger: {
    label: "Ranger",
    suit: "#dbeafe", suitMid: "#93c5fd", suitDark: "#3b82f6",
    accent: "#2563eb", accentMid: "#1d4ed8", accentDark: "#1e40af",
    helmet: "#eff6ff", helmetRim: "#60a5fa",
    visor: "#172554", visorGlow: "#3b82f6", glow: "rgba(59,130,246,0.35)",
    helmetType: "tactical",
  },
  guardian: {
    label: "Guardian",
    suit: "#fce7f3", suitMid: "#f9a8d4", suitDark: "#ec4899",
    accent: "#d946ef", accentMid: "#c026d3", accentDark: "#a21caf",
    helmet: "#fdf4ff", helmetRim: "#e879f9",
    visor: "#3b0764", visorGlow: "#d946ef", glow: "rgba(217,70,239,0.35)",
    helmetType: "ornate",
  },
  vanguard: {
    label: "Vanguard",
    suit: "#f0fdfa", suitMid: "#99f6e4", suitDark: "#14b8a6",
    accent: "#0d9488", accentMid: "#0f766e", accentDark: "#115e59",
    helmet: "#f0fdfa", helmetRim: "#5eead4",
    visor: "#042f2e", visorGlow: "#14b8a6", glow: "rgba(20,184,166,0.35)",
    helmetType: "sleek",
  },
};

// ─── SKIN TONES ──────────────────────────────────────────────────────────────
const SKIN_TONES = {
  skin_light:        { face: "#FFE0BD", mid: "#F5D0A8", shadow: "#E0BB8A", blush: "#FFBABA", lip: "#E8A090" },
  skin_medium_light: { face: "#F1C27D", mid: "#E0B06C", shadow: "#C89858", blush: "#E8A898", lip: "#C87C6F" },
  skin_medium:       { face: "#C68642", mid: "#B07538", shadow: "#946028", blush: "#B07060", lip: "#956050" },
  skin_medium_dark:  { face: "#8D5524", mid: "#7A461D", shadow: "#603616", blush: "#7A4A3A", lip: "#6B3D30" },
  skin_dark:         { face: "#5C3310", mid: "#4E2A0D", shadow: "#3A1F08", blush: "#5A3028", lip: "#4A2820" },
};

// ─── LAYOUT ──────────────────────────────────────────────────────────────────
const VB = 200;
const CX = 100;
const HY = 66;
const HR = 36;
const BY = 146;
const uid = () => Math.random().toString(36).slice(2,8);

// ─── BACKGROUNDS ─────────────────────────────────────────────────────────────
const BACKGROUNDS = {
  background_space:     { grad: ["#0f172a","#1e1b4b"], stars: true },
  background_galaxy:    { grad: ["#1e1b4b","#4c1d95"], stars: true },
  background_sunset:    { grad: ["#fef3c7","#fb923c","#f43f5e"], stars: false },
  background_ocean:     { grad: ["#cffafe","#0891b2","#164e63"], stars: false },
  background_nebula:    { grad: ["#1e1b4b","#581c87","#7e22ce"], stars: true, nebula: true },
  background_starfield: { grad: ["#020617","#0f172a"], stars: true, dense: true },
  background_aurora:    { grad: ["#0f172a","#064e3b","#1e1b4b"], stars: true, aurora: true },
  background_supernova: { grad: ["#0f172a","#7f1d1d","#fbbf24"], stars: true },
};

// ─── SVG FILTER DEFS ─────────────────────────────────────────────────────────
function FilterDefs({ id }) {
  return (
    <defs>
      <filter id={`sh-${id}`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.25" />
      </filter>
      <filter id={`gl-${id}`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id={`hl-${id}`}>
        <feGaussianBlur stdDeviation="1.5" />
      </filter>
      <filter id={`em-${id}`} x="-5%" y="-5%" width="110%" height="110%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
        <feOffset dx="0" dy="1" result="offOut" />
        <feComposite in="SourceGraphic" in2="offOut" operator="over" />
      </filter>
      {/* Glow filter for visor elements */}
      <filter id={`vg-${id}`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="glow" />
        <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  );
}

// ─── BACKGROUND RENDERER ────────────────────────────────────────────────────
function BgLayer({ bgId, fid }) {
  const bg = BACKGROUNDS[bgId];
  if (!bg) return null;
  const gid = `bg-${fid}`;
  return (
    <g>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          {bg.grad.map((c, i) => (
            <stop key={i} offset={`${(i / (bg.grad.length - 1)) * 100}%`} stopColor={c} />
          ))}
        </linearGradient>
        {bg.nebula && (
          <radialGradient id={`nb-${fid}`} cx="0.3" cy="0.4" r="0.6">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
      <rect width={VB} height={VB} fill={`url(#${gid})`} />
      {bg.stars && Array.from({ length: bg.dense ? 40 : 18 }, (_, i) => (
        <circle key={i}
          cx={12 + (i * 53) % 180} cy={8 + (i * 37) % 185}
          r={0.5 + (i % 3) * 0.5} fill="white" opacity={0.25 + (i % 4) * 0.18}>
          {bg.dense && <animate attributeName="opacity" values={`${0.2 + (i%3)*0.2};${0.6 + (i%2)*0.2};${0.2 + (i%3)*0.2}`} dur={`${2 + i%3}s`} repeatCount="indefinite" />}
        </circle>
      ))}
      {bg.nebula && (
        <>
          <ellipse cx={55} cy={65} rx={50} ry={35} fill={`url(#nb-${fid})`} />
          <ellipse cx={155} cy={145} rx={42} ry={28} fill="#6366f1" opacity="0.12" />
        </>
      )}
      {bg.aurora && (
        <g opacity="0.18">
          <path d="M 0 45 Q 50 25 100 50 Q 150 35 200 45" fill="none" stroke="#34d399" strokeWidth="14" strokeLinecap="round">
            <animate attributeName="d" values="M 0 45 Q 50 25 100 50 Q 150 35 200 45;M 0 50 Q 50 30 100 45 Q 150 40 200 50;M 0 45 Q 50 25 100 50 Q 150 35 200 45" dur="6s" repeatCount="indefinite" />
          </path>
          <path d="M 0 60 Q 60 44 110 63 Q 160 50 200 60" fill="none" stroke="#22d3ee" strokeWidth="9" opacity="0.7" strokeLinecap="round" />
        </g>
      )}
    </g>
  );
}

// ─── SUIT BODY (enhanced with panels & details) ────────────────────────────
function SuitBody({ base, fid }) {
  return (
    <g className="av-body" filter={`url(#sh-${fid})`}>
      <defs>
        <radialGradient id={`bg-body-${fid}`} cx="0.35" cy="0.3" r="0.7">
          <stop offset="0%" stopColor={base.suit} />
          <stop offset="60%" stopColor={base.suitMid} />
          <stop offset="100%" stopColor={base.suitDark} />
        </radialGradient>
        <radialGradient id={`bg-acc-${fid}`} cx="0.35" cy="0.3" r="0.7">
          <stop offset="0%" stopColor={base.accent} />
          <stop offset="100%" stopColor={base.accentDark} />
        </radialGradient>
      </defs>

      {/* Torso */}
      <path d={`
        M ${CX-26} ${BY-22}
        C ${CX-30} ${BY-8} ${CX-28} ${BY+14} ${CX-24} ${BY+24}
        L ${CX+24} ${BY+24}
        C ${CX+28} ${BY+14} ${CX+30} ${BY-8} ${CX+26} ${BY-22}
        Z
      `} fill={`url(#bg-body-${fid})`} />

      {/* Collar / neck ring — accent colour */}
      <ellipse cx={CX} cy={BY-24} rx={22} ry={6} fill={base.accent} />
      <ellipse cx={CX} cy={BY-24} rx={19} ry={4.5} fill={base.accentMid} />
      <ellipse cx={CX} cy={BY-25} rx={16} ry={3} fill={base.accent} opacity="0.5" />

      {/* Shoulder plates */}
      <ellipse cx={CX-30} cy={BY-14} rx={10} ry={6} fill={base.suitMid} />
      <ellipse cx={CX+30} cy={BY-14} rx={10} ry={6} fill={base.suitMid} />
      <ellipse cx={CX-30} cy={BY-15} rx={7} ry={3.5} fill={base.accent} opacity="0.4" />
      <ellipse cx={CX+30} cy={BY-15} rx={7} ry={3.5} fill={base.accent} opacity="0.4" />

      {/* Left arm */}
      <path d={`M ${CX-30} ${BY-10} C ${CX-42} ${BY} ${CX-46} ${BY+12} ${CX-40} ${BY+22}`}
        fill="none" stroke={base.suitMid} strokeWidth="12" strokeLinecap="round" />
      {/* Left glove */}
      <circle cx={CX-40} cy={BY+22} r={6} fill={base.accent} />

      {/* Right arm */}
      <path d={`M ${CX+30} ${BY-10} C ${CX+42} ${BY} ${CX+46} ${BY+12} ${CX+40} ${BY+22}`}
        fill="none" stroke={base.suitMid} strokeWidth="12" strokeLinecap="round" className="av-wave" />
      <circle cx={CX+40} cy={BY+22} r={6} fill={base.accent} className="av-wave" />

      {/* Chest panel (illuminated) */}
      <rect x={CX-10} y={BY-16} width={20} height={14} rx={4} fill={base.accentDark} opacity="0.7" />
      <rect x={CX-7} y={BY-13} width={14} height={8} rx={2.5} fill={base.visorGlow || base.accent} opacity="0.5">
        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.5s" repeatCount="indefinite" />
      </rect>
      {/* Chest emblem — small circle */}
      <circle cx={CX} cy={BY-9} r={2.5} fill="white" opacity="0.6">
        <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" />
      </circle>

      {/* Belt line */}
      <rect x={CX-24} y={BY+12} width={48} height={5} rx={2} fill={base.accentDark} opacity="0.5" />
      <circle cx={CX} cy={BY+14.5} r={3} fill={base.accent} />

      {/* Legs (short stubs at bottom) */}
      <rect x={CX-18} y={BY+22} width={14} height={14} rx={5} fill={base.suitDark} />
      <rect x={CX+4}  y={BY+22} width={14} height={14} rx={5} fill={base.suitDark} />
      {/* Boots */}
      <ellipse cx={CX-11} cy={BY+37} rx={9} ry={4} fill={base.accent} />
      <ellipse cx={CX+11} cy={BY+37} rx={9} ry={4} fill={base.accent} />
    </g>
  );
}

// ─── VISOR REFLECTIONS (star sparkles inside dark visor) ─────────────────────
function VisorStars({ cx: vx, cy: vy, rx, ry, fid, base }) {
  return (
    <g>
      {/* Main star — 4-point sparkle */}
      <g transform={`translate(${vx - rx*0.25}, ${vy - ry*0.15})`} filter={`url(#vg-${fid})`}>
        <path d="M 0,-4 L 1,-1 4,0 1,1 0,4 -1,1 -4,0 -1,-1 Z" fill="white" opacity="0.9">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2.2s" repeatCount="indefinite" />
        </path>
      </g>
      {/* Secondary star */}
      <g transform={`translate(${vx + rx*0.35}, ${vy + ry*0.1})`}>
        <path d="M 0,-2.5 L 0.7,-0.7 2.5,0 0.7,0.7 0,2.5 -0.7,0.7 -2.5,0 -0.7,-0.7 Z" fill="white" opacity="0.65">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" />
        </path>
      </g>
      {/* Tiny dot stars */}
      <circle cx={vx - rx*0.05} cy={vy + ry*0.3} r="1" fill="white" opacity="0.45" />
      <circle cx={vx + rx*0.15} cy={vy - ry*0.35} r="0.8" fill="white" opacity="0.35" />
      {/* Visor shine sweep */}
      <ellipse cx={vx - rx*0.35} cy={vy - ry*0.3} rx={rx*0.2} ry={ry*0.5}
        fill="white" opacity="0.12" transform={`rotate(-20, ${vx - rx*0.35}, ${vy - ry*0.3})`} />
    </g>
  );
}

// ─── HELMET RENDERERS (8 distinct silhouettes) ───────────────────────────────

function HelmetClassic({ base, fid }) {
  // Standard round astronaut helmet with blue tube on left
  return (
    <g filter={`url(#sh-${fid})`}>
      <defs>
        <radialGradient id={`hg-${fid}`} cx="0.35" cy="0.3" r="0.65">
          <stop offset="0%" stopColor={base.helmet} />
          <stop offset="100%" stopColor={base.helmetRim} />
        </radialGradient>
      </defs>
      {/* Helmet shell */}
      <ellipse cx={CX} cy={HY} rx={HR+2} ry={HR+4} fill={`url(#hg-${fid})`} />
      {/* Rim ring */}
      <ellipse cx={CX} cy={HY} rx={HR+2} ry={HR+4} fill="none" stroke={base.helmetRim} strokeWidth="2.5" />
      {/* Left ear piece */}
      <circle cx={CX-HR-2} cy={HY+4} r={6} fill={base.accent} />
      <circle cx={CX-HR-2} cy={HY+4} r={3.5} fill={base.accentDark} />
      {/* Breathing tube from left ear */}
      <path d={`M ${CX-HR+2} ${HY+8} Q ${CX-HR-8} ${HY+20} ${CX-HR+4} ${HY+30}`}
        fill="none" stroke={base.accent} strokeWidth="3.5" strokeLinecap="round" />
      {/* Right ear piece */}
      <circle cx={CX+HR+2} cy={HY+4} r={5} fill={base.accent} />
      {/* Top antenna light */}
      <line x1={CX+8} y1={HY-HR-2} x2={CX+8} y2={HY-HR-12} stroke={base.helmetRim} strokeWidth="2" strokeLinecap="round" />
      <circle cx={CX+8} cy={HY-HR-13} r={2.5} fill={base.visorGlow}>
        <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
      </circle>
      {/* Visor */}
      <ellipse cx={CX} cy={HY+2} rx={HR-8} ry={HR-6} fill={base.visor} />
      <VisorStars cx={CX} cy={HY+2} rx={HR-8} ry={HR-6} fid={fid} base={base} />
      {/* Visor frame */}
      <ellipse cx={CX} cy={HY+2} rx={HR-8} ry={HR-6} fill="none" stroke={base.accent} strokeWidth="2.5" />
    </g>
  );
}

function HelmetAngular({ base, fid }) {
  // Angular/pointed helmet — explorer style with chin guard
  return (
    <g filter={`url(#sh-${fid})`}>
      <defs>
        <radialGradient id={`hg-${fid}`} cx="0.35" cy="0.3" r="0.65">
          <stop offset="0%" stopColor={base.helmet} />
          <stop offset="100%" stopColor={base.helmetRim} />
        </radialGradient>
      </defs>
      {/* Helmet shell — slightly pointed top */}
      <path d={`M ${CX-HR} ${HY+HR*0.6}
        Q ${CX-HR-2} ${HY-HR*0.4} ${CX} ${HY-HR-6}
        Q ${CX+HR+2} ${HY-HR*0.4} ${CX+HR} ${HY+HR*0.6}
        Q ${CX+HR*0.5} ${HY+HR} ${CX} ${HY+HR*0.7}
        Q ${CX-HR*0.5} ${HY+HR} ${CX-HR} ${HY+HR*0.6}
        Z`} fill={`url(#hg-${fid})`} />
      {/* Chin guard */}
      <path d={`M ${CX-18} ${HY+HR*0.5} Q ${CX} ${HY+HR+2} ${CX+18} ${HY+HR*0.5}`}
        fill="none" stroke={base.accent} strokeWidth="3" strokeLinecap="round" />
      {/* Side vents (left) */}
      {[0,5,10].map(dy => (
        <rect key={dy} x={CX-HR-1} y={HY-4+dy} width={5} height={2} rx={1} fill={base.accentDark} opacity="0.6" />
      ))}
      {/* Side vents (right) */}
      {[0,5,10].map(dy => (
        <rect key={dy} x={CX+HR-4} y={HY-4+dy} width={5} height={2} rx={1} fill={base.accentDark} opacity="0.6" />
      ))}
      {/* Top ridge */}
      <path d={`M ${CX-8} ${HY-HR-3} Q ${CX} ${HY-HR-8} ${CX+8} ${HY-HR-3}`}
        fill="none" stroke={base.accent} strokeWidth="3" strokeLinecap="round" />
      {/* Triangular visor */}
      <path d={`M ${CX-HR+12} ${HY-4}
        L ${CX} ${HY-HR+10}
        L ${CX+HR-12} ${HY-4}
        Q ${CX+HR-16} ${HY+12} ${CX} ${HY+16}
        Q ${CX-HR+16} ${HY+12} ${CX-HR+12} ${HY-4}
        Z`} fill={base.visor} />
      <VisorStars cx={CX} cy={HY+2} rx={HR-14} ry={HR-10} fid={fid} base={base} />
      <path d={`M ${CX-HR+12} ${HY-4}
        L ${CX} ${HY-HR+10}
        L ${CX+HR-12} ${HY-4}
        Q ${CX+HR-16} ${HY+12} ${CX} ${HY+16}
        Q ${CX-HR+16} ${HY+12} ${CX-HR+12} ${HY-4}
        Z`} fill="none" stroke={base.accent} strokeWidth="2" />
    </g>
  );
}

function HelmetBulb({ base, fid }) {
  // Large round bubble helmet — scientist style, oversized visor
  return (
    <g filter={`url(#sh-${fid})`}>
      <defs>
        <radialGradient id={`hg-${fid}`} cx="0.3" cy="0.25" r="0.7">
          <stop offset="0%" stopColor={base.helmet} />
          <stop offset="100%" stopColor={base.helmetRim} />
        </radialGradient>
      </defs>
      {/* Large bubble shell */}
      <circle cx={CX} cy={HY-2} r={HR+6} fill={`url(#hg-${fid})`} />
      <circle cx={CX} cy={HY-2} r={HR+6} fill="none" stroke={base.helmetRim} strokeWidth="2" />
      {/* Top dome cap */}
      <ellipse cx={CX} cy={HY-HR-4} rx={10} ry={5} fill={base.accent} />
      <circle cx={CX} cy={HY-HR-6} r={3.5} fill={base.accentMid} />
      {/* Side bolts */}
      <circle cx={CX-HR-3} cy={HY+2} r={4} fill={base.accent} />
      <circle cx={CX-HR-3} cy={HY+2} r={2} fill={base.accentDark} />
      <circle cx={CX+HR+3} cy={HY+2} r={4} fill={base.accent} />
      <circle cx={CX+HR+3} cy={HY+2} r={2} fill={base.accentDark} />
      {/* Huge visor — nearly full front */}
      <ellipse cx={CX} cy={HY+1} rx={HR-2} ry={HR-2} fill={base.visor} />
      <VisorStars cx={CX} cy={HY+1} rx={HR-2} ry={HR-2} fid={fid} base={base} />
      <ellipse cx={CX} cy={HY+1} rx={HR-2} ry={HR-2} fill="none" stroke={base.accent} strokeWidth="2.5" />
      {/* Neck base ring */}
      <ellipse cx={CX} cy={HY+HR+2} rx={16} ry={5} fill={base.accent} />
    </g>
  );
}

function HelmetWide({ base, fid }) {
  // Wide panoramic visor — pilot style, rectangular visor
  return (
    <g filter={`url(#sh-${fid})`}>
      <defs>
        <radialGradient id={`hg-${fid}`} cx="0.35" cy="0.3" r="0.65">
          <stop offset="0%" stopColor={base.helmet} />
          <stop offset="100%" stopColor={base.helmetRim} />
        </radialGradient>
      </defs>
      {/* Helmet shell — wider at visor level */}
      <ellipse cx={CX} cy={HY} rx={HR+5} ry={HR+1} fill={`url(#hg-${fid})`} />
      <ellipse cx={CX} cy={HY} rx={HR+5} ry={HR+1} fill="none" stroke={base.helmetRim} strokeWidth="2" />
      {/* Top accent stripe */}
      <path d={`M ${CX-12} ${HY-HR} Q ${CX} ${HY-HR-4} ${CX+12} ${HY-HR}`}
        fill="none" stroke={base.accent} strokeWidth="4" strokeLinecap="round" />
      {/* Side ear cups — large */}
      <rect x={CX-HR-8} y={HY-6} width={10} height={18} rx={5} fill={base.accent} />
      <rect x={CX-HR-6} y={HY-2} width={6} height={10} rx={3} fill={base.accentDark} />
      <rect x={CX+HR-2} y={HY-6} width={10} height={18} rx={5} fill={base.accent} />
      <rect x={CX+HR} y={HY-2} width={6} height={10} rx={3} fill={base.accentDark} />
      {/* Wide rectangular visor with rounded corners */}
      <rect x={CX-HR+6} y={HY-12} width={(HR-6)*2} height={28} rx={8} fill={base.visor} />
      <VisorStars cx={CX} cy={HY+1} rx={HR-8} ry={12} fid={fid} base={base} />
      <rect x={CX-HR+6} y={HY-12} width={(HR-6)*2} height={28} rx={8}
        fill="none" stroke={base.accent} strokeWidth="2.5" />
      {/* Chin vent */}
      <ellipse cx={CX} cy={HY+HR-6} rx={12} ry={4} fill={base.accentDark} opacity="0.5" />
      {[0,1,2,3].map(i => (
        <rect key={i} x={CX-8+i*5} y={HY+HR-8} width={3} height={4} rx={1} fill={base.helmetRim} opacity="0.6" />
      ))}
    </g>
  );
}

function HelmetCommander({ base, fid }) {
  // Commander — elegant with side fins and crown-like top ridge
  return (
    <g filter={`url(#sh-${fid})`}>
      <defs>
        <radialGradient id={`hg-${fid}`} cx="0.35" cy="0.3" r="0.65">
          <stop offset="0%" stopColor={base.helmet} />
          <stop offset="100%" stopColor={base.helmetRim} />
        </radialGradient>
      </defs>
      {/* Helmet shell */}
      <ellipse cx={CX} cy={HY} rx={HR+2} ry={HR+3} fill={`url(#hg-${fid})`} />
      {/* Side fins */}
      <path d={`M ${CX-HR} ${HY-10} L ${CX-HR-12} ${HY-18} L ${CX-HR-4} ${HY-4}`}
        fill={base.accent} />
      <path d={`M ${CX+HR} ${HY-10} L ${CX+HR+12} ${HY-18} L ${CX+HR+4} ${HY-4}`}
        fill={base.accent} />
      {/* Crown ridge — 3 bumps */}
      <circle cx={CX-10} cy={HY-HR-2} r={4} fill={base.accent} />
      <circle cx={CX} cy={HY-HR-5} r={5} fill={base.accentMid} />
      <circle cx={CX+10} cy={HY-HR-2} r={4} fill={base.accent} />
      {/* Gem on top */}
      <path d={`M ${CX} ${HY-HR-12} L ${CX+3} ${HY-HR-7} L ${CX} ${HY-HR-4} L ${CX-3} ${HY-HR-7} Z`}
        fill={base.visorGlow} opacity="0.9">
        <animate attributeName="opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
      </path>
      {/* Visor — shield shape */}
      <path d={`M ${CX-HR+10} ${HY-6}
        Q ${CX-HR+8} ${HY-16} ${CX} ${HY-18}
        Q ${CX+HR-8} ${HY-16} ${CX+HR-10} ${HY-6}
        Q ${CX+HR-12} ${HY+14} ${CX} ${HY+16}
        Q ${CX-HR+12} ${HY+14} ${CX-HR+10} ${HY-6}
        Z`} fill={base.visor} />
      <VisorStars cx={CX} cy={HY} rx={HR-12} ry={HR-8} fid={fid} base={base} />
      <path d={`M ${CX-HR+10} ${HY-6}
        Q ${CX-HR+8} ${HY-16} ${CX} ${HY-18}
        Q ${CX+HR-8} ${HY-16} ${CX+HR-10} ${HY-6}
        Q ${CX+HR-12} ${HY+14} ${CX} ${HY+16}
        Q ${CX-HR+12} ${HY+14} ${CX-HR+10} ${HY-6}
        Z`} fill="none" stroke={base.accent} strokeWidth="2" />
      {/* Rim */}
      <ellipse cx={CX} cy={HY} rx={HR+2} ry={HR+3} fill="none" stroke={base.helmetRim} strokeWidth="2" />
    </g>
  );
}

function HelmetTactical({ base, fid }) {
  // Tactical — squared-off, military style with antenna array
  return (
    <g filter={`url(#sh-${fid})`}>
      <defs>
        <radialGradient id={`hg-${fid}`} cx="0.35" cy="0.3" r="0.65">
          <stop offset="0%" stopColor={base.helmet} />
          <stop offset="100%" stopColor={base.helmetRim} />
        </radialGradient>
      </defs>
      {/* Squared helmet */}
      <rect x={CX-HR-2} y={HY-HR} width={(HR+2)*2} height={HR*2+4} rx={14} fill={`url(#hg-${fid})`} />
      <rect x={CX-HR-2} y={HY-HR} width={(HR+2)*2} height={HR*2+4} rx={14}
        fill="none" stroke={base.helmetRim} strokeWidth="2" />
      {/* Antenna array on right */}
      <line x1={CX+HR-4} y1={HY-HR} x2={CX+HR+6} y2={HY-HR-14} stroke={base.accent} strokeWidth="2.5" strokeLinecap="round" />
      <line x1={CX+HR-8} y1={HY-HR} x2={CX+HR-2} y2={HY-HR-12} stroke={base.accent} strokeWidth="2" strokeLinecap="round" />
      <circle cx={CX+HR+6} cy={HY-HR-15} r={2.5} fill={base.visorGlow}>
        <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <circle cx={CX+HR-2} cy={HY-HR-13} r={2} fill={base.visorGlow} opacity="0.7">
        <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.8s" repeatCount="indefinite" />
      </circle>
      {/* Cheek plates */}
      <rect x={CX-HR-4} y={HY-2} width={8} height={16} rx={3} fill={base.accent} />
      <rect x={CX+HR-4} y={HY-2} width={8} height={16} rx={3} fill={base.accent} />
      {/* Horizontal status bar on forehead */}
      <rect x={CX-18} y={HY-HR+4} width={36} height={4} rx={2} fill={base.accentDark} />
      <rect x={CX-16} y={HY-HR+4.5} width={18} height={3} rx={1.5} fill={base.visorGlow} opacity="0.7">
        <animate attributeName="width" values="18;28;18" dur="3s" repeatCount="indefinite" />
      </rect>
      {/* Square visor */}
      <rect x={CX-HR+10} y={HY-10} width={(HR-10)*2} height={24} rx={6} fill={base.visor} />
      <VisorStars cx={CX} cy={HY+2} rx={HR-12} ry={10} fid={fid} base={base} />
      <rect x={CX-HR+10} y={HY-10} width={(HR-10)*2} height={24} rx={6}
        fill="none" stroke={base.accent} strokeWidth="2.5" />
    </g>
  );
}

function HelmetOrnate({ base, fid }) {
  // Ornate — decorative with jewel accents, elegant curves, antenna stalks
  return (
    <g filter={`url(#sh-${fid})`}>
      <defs>
        <radialGradient id={`hg-${fid}`} cx="0.35" cy="0.3" r="0.65">
          <stop offset="0%" stopColor={base.helmet} />
          <stop offset="100%" stopColor={base.helmetRim} />
        </radialGradient>
      </defs>
      {/* Helmet shell — slightly wider */}
      <ellipse cx={CX} cy={HY} rx={HR+4} ry={HR+3} fill={`url(#hg-${fid})`} />
      <ellipse cx={CX} cy={HY} rx={HR+4} ry={HR+3} fill="none" stroke={base.helmetRim} strokeWidth="2" />
      {/* Twin antenna stalks */}
      <line x1={CX-12} y1={HY-HR-1} x2={CX-16} y2={HY-HR-16} stroke={base.accent} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={CX-16} cy={HY-HR-17} r={3} fill={base.visorGlow}>
        <animate attributeName="r" values="2.5;3.5;2.5" dur="2s" repeatCount="indefinite" />
      </circle>
      <line x1={CX+12} y1={HY-HR-1} x2={CX+16} y2={HY-HR-16} stroke={base.accent} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={CX+16} cy={HY-HR-17} r={3} fill={base.visorGlow}>
        <animate attributeName="r" values="3.5;2.5;3.5" dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Decorative brow piece */}
      <path d={`M ${CX-22} ${HY-14} Q ${CX} ${HY-26} ${CX+22} ${HY-14}`}
        fill="none" stroke={base.accent} strokeWidth="3.5" strokeLinecap="round" />
      {/* Center jewel */}
      <circle cx={CX} cy={HY-20} r={4} fill={base.visorGlow}>
        <animate attributeName="opacity" values="0.7;1;0.7" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx={CX} cy={HY-20} r={2} fill="white" opacity="0.6" />
      {/* Side jewels */}
      <circle cx={CX-20} cy={HY-12} r={2.5} fill={base.accent} />
      <circle cx={CX+20} cy={HY-12} r={2.5} fill={base.accent} />
      {/* Oval visor */}
      <ellipse cx={CX} cy={HY+4} rx={HR-6} ry={HR-10} fill={base.visor} />
      <VisorStars cx={CX} cy={HY+4} rx={HR-6} ry={HR-10} fid={fid} base={base} />
      <ellipse cx={CX} cy={HY+4} rx={HR-6} ry={HR-10} fill="none" stroke={base.accent} strokeWidth="2.5" />
      {/* Bottom chin piece */}
      <path d={`M ${CX-14} ${HY+HR-4} Q ${CX} ${HY+HR+4} ${CX+14} ${HY+HR-4}`}
        fill={base.accent} opacity="0.7" />
    </g>
  );
}

function HelmetSleek({ base, fid }) {
  // Sleek — minimal, streamlined, teardrop shape
  return (
    <g filter={`url(#sh-${fid})`}>
      <defs>
        <radialGradient id={`hg-${fid}`} cx="0.35" cy="0.3" r="0.65">
          <stop offset="0%" stopColor={base.helmet} />
          <stop offset="100%" stopColor={base.helmetRim} />
        </radialGradient>
      </defs>
      {/* Teardrop helmet shell */}
      <path d={`M ${CX} ${HY-HR-8}
        C ${CX+HR+8} ${HY-HR+4} ${CX+HR+4} ${HY+HR-4} ${CX} ${HY+HR+4}
        C ${CX-HR-4} ${HY+HR-4} ${CX-HR-8} ${HY-HR+4} ${CX} ${HY-HR-8}
        Z`} fill={`url(#hg-${fid})`} />
      <path d={`M ${CX} ${HY-HR-8}
        C ${CX+HR+8} ${HY-HR+4} ${CX+HR+4} ${HY+HR-4} ${CX} ${HY+HR+4}
        C ${CX-HR-4} ${HY+HR-4} ${CX-HR-8} ${HY-HR+4} ${CX} ${HY-HR-8}
        Z`} fill="none" stroke={base.helmetRim} strokeWidth="2" />
      {/* Center ridge line */}
      <path d={`M ${CX} ${HY-HR-6} L ${CX} ${HY+HR+2}`}
        fill="none" stroke={base.accent} strokeWidth="2.5" opacity="0.4" />
      {/* Side accent lines */}
      <path d={`M ${CX-HR+2} ${HY-8} Q ${CX-HR-2} ${HY+6} ${CX-HR+6} ${HY+20}`}
        fill="none" stroke={base.accent} strokeWidth="2" opacity="0.5" />
      <path d={`M ${CX+HR-2} ${HY-8} Q ${CX+HR+2} ${HY+6} ${CX+HR-6} ${HY+20}`}
        fill="none" stroke={base.accent} strokeWidth="2" opacity="0.5" />
      {/* Small top fin */}
      <path d={`M ${CX-3} ${HY-HR-6} L ${CX} ${HY-HR-14} L ${CX+3} ${HY-HR-6}`}
        fill={base.accent} />
      {/* Visor — tall oval */}
      <ellipse cx={CX} cy={HY+2} rx={HR-10} ry={HR-4} fill={base.visor} />
      <VisorStars cx={CX} cy={HY+2} rx={HR-10} ry={HR-4} fid={fid} base={base} />
      <ellipse cx={CX} cy={HY+2} rx={HR-10} ry={HR-4} fill="none" stroke={base.accent} strokeWidth="2" />
      {/* Bottom glow strip */}
      <ellipse cx={CX} cy={HY+HR} rx={14} ry={3} fill={base.visorGlow} opacity="0.4">
        <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />
      </ellipse>
    </g>
  );
}

const HELMET_MAP = {
  classic: HelmetClassic,
  angular: HelmetAngular,
  bulb: HelmetBulb,
  wide: HelmetWide,
  commander: HelmetCommander,
  tactical: HelmetTactical,
  ornate: HelmetOrnate,
  sleek: HelmetSleek,
};

// ─── FACE (open-face mode when skin is selected) ─────────────────────────────
function Face({ skin, base, exprId, fid }) {
  const ey = HY - 4;
  return (
    <g filter={`url(#sh-${fid})`}>
      <defs>
        <radialGradient id={`fgrad-${fid}`} cx="0.4" cy="0.35" r="0.6">
          <stop offset="0%" stopColor={skin.face} />
          <stop offset="80%" stopColor={skin.mid} />
          <stop offset="100%" stopColor={skin.shadow} />
        </radialGradient>
        <radialGradient id={`hg-${fid}`} cx="0.35" cy="0.3" r="0.65">
          <stop offset="0%" stopColor={base.helmet} />
          <stop offset="100%" stopColor={base.helmetRim} />
        </radialGradient>
      </defs>

      {/* Helmet frame (open-face) */}
      <ellipse cx={CX} cy={HY} rx={HR+2} ry={HR+3} fill={`url(#hg-${fid})`} />
      <ellipse cx={CX} cy={HY} rx={HR+2} ry={HR+3} fill="none" stroke={base.helmetRim} strokeWidth="2" />

      {/* Face cutout */}
      <ellipse cx={CX} cy={HY+3} rx={HR-8} ry={HR-5} fill={`url(#fgrad-${fid})`} />

      {/* Blush */}
      <circle cx={CX-14} cy={ey+10} r={5} fill={skin.blush} opacity="0.22" />
      <circle cx={CX+14} cy={ey+10} r={5} fill={skin.blush} opacity="0.22" />

      {/* Default eyes & mouth (overridden by expression) */}
      {!exprId && <>
        <ellipse cx={CX-9} cy={ey} rx={3.5} ry={4} fill="#1e293b" />
        <ellipse cx={CX+9} cy={ey} rx={3.5} ry={4} fill="#1e293b" />
        <circle cx={CX-8} cy={ey-1.5} r={1.5} fill="white" opacity="0.8" />
        <circle cx={CX+10} cy={ey-1.5} r={1.5} fill="white" opacity="0.8" />
        <path d={`M ${CX-6} ${HY+10} Q ${CX} ${HY+14} ${CX+6} ${HY+10}`}
          fill="none" stroke={skin.lip} strokeWidth="1.5" strokeLinecap="round" />
      </>}
    </g>
  );
}

// ─── EXPRESSION OVERLAY ──────────────────────────────────────────────────────
function ExpressionSVG({ exprId, skin }) {
  const ey = HY - 4;
  const map = {
    expression_happy: (
      <g>
        <ellipse cx={CX-9} cy={ey} rx={3.5} ry={4} fill="#1e293b" />
        <ellipse cx={CX+9} cy={ey} rx={3.5} ry={4} fill="#1e293b" />
        <circle cx={CX-8} cy={ey-1.5} r={1.8} fill="white" opacity="0.85" />
        <circle cx={CX+10} cy={ey-1.5} r={1.8} fill="white" opacity="0.85" />
        <path d={`M ${CX-8} ${HY+9} Q ${CX} ${HY+16} ${CX+8} ${HY+9}`}
          fill="none" stroke={skin.lip} strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
    expression_cool: (
      <g>
        {/* Sunglasses effect */}
        <rect x={CX-16} y={ey-4} width={13} height={8} rx={3} fill="#1e293b" />
        <rect x={CX+3} y={ey-4} width={13} height={8} rx={3} fill="#1e293b" />
        <line x1={CX-3} y1={ey} x2={CX+3} y2={ey} stroke="#1e293b" strokeWidth="1.5" />
        <rect x={CX-14} y={ey-3} width={4} height={2} rx={1} fill="white" opacity="0.3" />
        <rect x={CX+5} y={ey-3} width={4} height={2} rx={1} fill="white" opacity="0.3" />
        <path d={`M ${CX-5} ${HY+10} L ${CX+5} ${HY+10}`}
          fill="none" stroke={skin.lip} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    ),
    expression_focused: (
      <g>
        <ellipse cx={CX-9} cy={ey} rx={3} ry={3.5} fill="#1e293b" />
        <ellipse cx={CX+9} cy={ey} rx={3} ry={3.5} fill="#1e293b" />
        <circle cx={CX-8} cy={ey-1} r={1.2} fill="white" opacity="0.7" />
        <circle cx={CX+10} cy={ey-1} r={1.2} fill="white" opacity="0.7" />
        {/* Slight furrowed brow */}
        <line x1={CX-14} y1={ey-7} x2={CX-5} y2={ey-8} stroke={skin.shadow} strokeWidth="1.5" strokeLinecap="round" />
        <line x1={CX+5} y1={ey-8} x2={CX+14} y2={ey-7} stroke={skin.shadow} strokeWidth="1.5" strokeLinecap="round" />
        <path d={`M ${CX-4} ${HY+10} Q ${CX} ${HY+11} ${CX+4} ${HY+10}`}
          fill="none" stroke={skin.lip} strokeWidth="1.5" strokeLinecap="round" />
      </g>
    ),
    expression_excited: (
      <g>
        {/* Star eyes */}
        <path d={`M ${CX-9} ${ey-4} L ${CX-8} ${ey-1} L ${CX-5} ${ey} L ${CX-8} ${ey+1} L ${CX-9} ${ey+4} L ${CX-10} ${ey+1} L ${CX-13} ${ey} L ${CX-10} ${ey-1} Z`}
          fill="#f59e0b" />
        <path d={`M ${CX+9} ${ey-4} L ${CX+10} ${ey-1} L ${CX+13} ${ey} L ${CX+10} ${ey+1} L ${CX+9} ${ey+4} L ${CX+8} ${ey+1} L ${CX+5} ${ey} L ${CX+8} ${ey-1} Z`}
          fill="#f59e0b" />
        <ellipse cx={CX} cy={HY+11} rx={6} ry={4} fill={skin.shadow} opacity="0.3" />
        <path d={`M ${CX-6} ${HY+9} Q ${CX} ${HY+16} ${CX+6} ${HY+9}`}
          fill={skin.lip} opacity="0.7" />
      </g>
    ),
  };
  return map[exprId] || null;
}

// ─── HAIR STYLES ─────────────────────────────────────────────────────────────
function HairSVG({ hairId, fid }) {
  const map = {
    hair_short: (
      <g className="av-hair">
        <path d={`M ${CX-22} ${HY-18} Q ${CX-14} ${HY-32} ${CX} ${HY-34}
          Q ${CX+14} ${HY-32} ${CX+22} ${HY-18}`} fill="#4a3728" />
        <path d={`M ${CX-18} ${HY-20} Q ${CX} ${HY-30} ${CX+18} ${HY-20}`}
          fill="#5c4033" opacity="0.6" />
      </g>
    ),
    hair_curly: (
      <g className="av-hair">
        {[-18,-10,-2,6,14].map((dx, i) => (
          <circle key={i} cx={CX+dx} cy={HY-28+Math.abs(dx)*0.15} r={7} fill="#3a2a1a" />
        ))}
        {[-14,-6,2,10].map((dx, i) => (
          <circle key={i} cx={CX+dx} cy={HY-33+Math.abs(dx)*0.1} r={5} fill="#4a3728" />
        ))}
      </g>
    ),
    hair_braids: (
      <g className="av-hair">
        <path d={`M ${CX-16} ${HY-26} Q ${CX} ${HY-36} ${CX+16} ${HY-26}`} fill="#2a1a0a" />
        {/* Left braid */}
        <path d={`M ${CX-20} ${HY-16} Q ${CX-24} ${HY} ${CX-20} ${HY+14} Q ${CX-18} ${HY+20} ${CX-22} ${HY+26}`}
          fill="none" stroke="#2a1a0a" strokeWidth="5" strokeLinecap="round" />
        {/* Right braid */}
        <path d={`M ${CX+20} ${HY-16} Q ${CX+24} ${HY} ${CX+20} ${HY+14} Q ${CX+18} ${HY+20} ${CX+22} ${HY+26}`}
          fill="none" stroke="#2a1a0a" strokeWidth="5" strokeLinecap="round" />
        {/* Braid ties */}
        <circle cx={CX-22} cy={HY+26} r={3} fill="#f59e0b" />
        <circle cx={CX+22} cy={HY+26} r={3} fill="#f59e0b" />
      </g>
    ),
    hair_afro: (
      <g className="av-hair">
        <ellipse cx={CX} cy={HY-16} rx={32} ry={28} fill="#1a0e05" />
        <ellipse cx={CX} cy={HY-18} rx={28} ry={24} fill="#2a1a0a" />
        {/* Texture dots */}
        {Array.from({length: 8}, (_, i) => (
          <circle key={i} cx={CX-20+i*6} cy={HY-28+Math.sin(i)*4} r={2} fill="#3a2a1a" opacity="0.4" />
        ))}
      </g>
    ),
    hair_long: (
      <g className="av-hair">
        <path d={`M ${CX-20} ${HY-24} Q ${CX} ${HY-36} ${CX+20} ${HY-24}`} fill="#5c3a1e" />
        <path d={`M ${CX-24} ${HY-16} Q ${CX-28} ${HY+10} ${CX-22} ${HY+30}`}
          fill="none" stroke="#5c3a1e" strokeWidth="8" strokeLinecap="round" />
        <path d={`M ${CX+24} ${HY-16} Q ${CX+28} ${HY+10} ${CX+22} ${HY+30}`}
          fill="none" stroke="#5c3a1e" strokeWidth="8" strokeLinecap="round" />
      </g>
    ),
    hair_mohawk: (
      <g className="av-hair">
        {[0,1,2,3,4].map(i => (
          <rect key={i} x={CX-4+i*0} y={HY-34-i*4+Math.abs(i-2)*3} width={8} height={10}
            rx={3} fill={i%2 ? "#e11d48" : "#be123c"}
            transform={`translate(0, ${i*2}) rotate(${(i-2)*5}, ${CX}, ${HY-30})`} />
        ))}
      </g>
    ),
  };
  return map[hairId] || null;
}

// ─── HAT RENDERERS ───────────────────────────────────────────────────────────
function HatSVG({ hatId, fid }) {
  const map = {
    hat_wizard: (
      <g className="av-hat">
        <path d={`M ${CX-18} ${HY-28} L ${CX} ${HY-62} L ${CX+18} ${HY-28} Z`} fill="#7c3aed" />
        <path d={`M ${CX-20} ${HY-28} L ${CX+20} ${HY-28}`} stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
        <path d="M 96 36 l 2,-6 4,2 2,-8 4,4 2,-6" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.6" />
        <circle cx={CX+2} cy={HY-50} r={3} fill="#fbbf24" />
      </g>
    ),
    hat_crown: (
      <g className="av-hat">
        <path d={`M ${CX-20} ${HY-28}
          L ${CX-18} ${HY-42} L ${CX-10} ${HY-34}
          L ${CX} ${HY-48} L ${CX+10} ${HY-34}
          L ${CX+18} ${HY-42} L ${CX+20} ${HY-28} Z`} fill="#fbbf24" />
        <rect x={CX-20} y={HY-30} width={40} height={6} rx={2} fill="#f59e0b" />
        <circle cx={CX-10} cy={HY-36} r={2} fill="#ef4444" />
        <circle cx={CX} cy={HY-43} r={2.5} fill="#3b82f6" />
        <circle cx={CX+10} cy={HY-36} r={2} fill="#10b981" />
      </g>
    ),
    hat_astronaut: (
      <g className="av-hat">
        <ellipse cx={CX} cy={HY-30} rx={24} ry={14} fill="#e2e8f0" />
        <ellipse cx={CX} cy={HY-30} rx={24} ry={14} fill="none" stroke="#94a3b8" strokeWidth="2" />
        <ellipse cx={CX} cy={HY-32} rx={16} ry={8} fill="#334155" />
        <ellipse cx={CX-4} cy={HY-34} rx={4} ry={2} fill="white" opacity="0.3" />
      </g>
    ),
    hat_graduation: (
      <g className="av-hat">
        <path d={`M ${CX-24} ${HY-32} L ${CX} ${HY-40} L ${CX+24} ${HY-32} L ${CX} ${HY-28} Z`} fill="#1e293b" />
        <rect x={CX-2} y={HY-38} width={4} height={4} rx={1} fill="#1e293b" />
        <line x1={CX+16} y1={HY-34} x2={CX+20} y2={HY-24} stroke="#fbbf24" strokeWidth="1.5" />
        <circle cx={CX+20} cy={HY-23} r={2.5} fill="#fbbf24" />
      </g>
    ),
    hat_detective: (
      <g className="av-hat">
        <ellipse cx={CX} cy={HY-30} rx={26} ry={6} fill="#92400e" />
        <path d={`M ${CX-18} ${HY-32} Q ${CX} ${HY-46} ${CX+18} ${HY-32}`} fill="#a16207" />
        <rect x={CX-18} y={HY-34} width={36} height={4} rx={2} fill="#78350f" />
      </g>
    ),
    hat_cowboy: (
      <g className="av-hat">
        <ellipse cx={CX} cy={HY-28} rx={30} ry={5} fill="#d4a574" />
        <path d={`M ${CX-16} ${HY-30} Q ${CX} ${HY-44} ${CX+16} ${HY-30}`} fill="#c9956a" />
        <rect x={CX-16} y={HY-32} width={32} height={3} rx={1.5} fill="#a87040" />
      </g>
    ),
    hat_pirate: (
      <g className="av-hat">
        <path d={`M ${CX-22} ${HY-28} Q ${CX-20} ${HY-44} ${CX} ${HY-46}
          Q ${CX+20} ${HY-44} ${CX+22} ${HY-28}`} fill="#1e293b" />
        <ellipse cx={CX} cy={HY-28} rx={24} ry={5} fill="#334155" />
        {/* Skull and crossbones */}
        <circle cx={CX} cy={HY-38} r={4} fill="white" />
        <circle cx={CX-2} cy={HY-39} r={1} fill="#1e293b" />
        <circle cx={CX+2} cy={HY-39} r={1} fill="#1e293b" />
        <line x1={CX-4} y1={HY-34} x2={CX+4} y2={HY-34} stroke="white" strokeWidth="1.5" />
      </g>
    ),
    hat_viking: (
      <g className="av-hat">
        <ellipse cx={CX} cy={HY-28} rx={24} ry={12} fill="#94a3b8" />
        <ellipse cx={CX} cy={HY-30} rx={20} ry={8} fill="#64748b" />
        {/* Horns */}
        <path d={`M ${CX-22} ${HY-30} Q ${CX-32} ${HY-50} ${CX-26} ${HY-54}`}
          fill="none" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
        <path d={`M ${CX+22} ${HY-30} Q ${CX+32} ${HY-50} ${CX+26} ${HY-54}`}
          fill="none" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
      </g>
    ),
    hat_beanie: (
      <g className="av-hat">
        <path d={`M ${CX-20} ${HY-26} Q ${CX-22} ${HY-38} ${CX} ${HY-42}
          Q ${CX+22} ${HY-38} ${CX+20} ${HY-26}`} fill="#7c3aed" />
        {/* Stripes */}
        <path d={`M ${CX-18} ${HY-32} Q ${CX} ${HY-36} ${CX+18} ${HY-32}`}
          fill="none" stroke="#a78bfa" strokeWidth="2" />
        <path d={`M ${CX-16} ${HY-36} Q ${CX} ${HY-40} ${CX+16} ${HY-36}`}
          fill="none" stroke="#a78bfa" strokeWidth="2" />
        {/* Pom-pom */}
        <circle cx={CX} cy={HY-44} r={5} fill="#a78bfa" />
      </g>
    ),
    hat_headband: (
      <g className="av-hat">
        <path d={`M ${CX-22} ${HY-24} Q ${CX} ${HY-28} ${CX+22} ${HY-24}`}
          fill="none" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
        {/* Star decoration */}
        <path d={`M ${CX} ${HY-32} L ${CX+2} ${HY-28} L ${CX+6} ${HY-28}
          L ${CX+3} ${HY-25} L ${CX+4} ${HY-21} L ${CX} ${HY-24}
          L ${CX-4} ${HY-21} L ${CX-3} ${HY-25} L ${CX-6} ${HY-28}
          L ${CX-2} ${HY-28} Z`} fill="#fbbf24" />
      </g>
    ),
    hat_cap: (
      <g className="av-hat">
        <ellipse cx={CX} cy={HY-28} rx={22} ry={10} fill="#3b82f6" />
        <path d={`M ${CX-14} ${HY-30} Q ${CX} ${HY-42} ${CX+14} ${HY-30}`} fill="#2563eb" />
        {/* Brim */}
        <path d={`M ${CX-8} ${HY-28} Q ${CX+14} ${HY-26} ${CX+28} ${HY-24}`}
          fill="none" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" />
      </g>
    ),
  };
  return map[hatId] || null;
}

// ─── PET RENDERERS ───────────────────────────────────────────────────────────
function PetSVG({ petId, fid }) {
  const px = 162;
  const py = 160;
  const map = {
    pet_cat: (
      <g className="av-pet" transform={`translate(${px}, ${py})`}>
        <ellipse cx={0} cy={0} rx={12} ry={10} fill="#f97316" />
        <path d={`M -10,-6 L -8,-14 L -4,-6`} fill="#f97316" />
        <path d={`M 4,-6 L 8,-14 L 10,-6`} fill="#f97316" />
        <circle cx={-4} cy={-1} r={2} fill="#1e293b" />
        <circle cx={4} cy={-1} r={2} fill="#1e293b" />
        <circle cx={-3.5} cy={-1.5} r={0.8} fill="white" />
        <circle cx={4.5} cy={-1.5} r={0.8} fill="white" />
        <ellipse cx={0} cy={3} rx={2} ry={1} fill="#fb923c" />
        <path d={`M 10,4 Q 18,0 16,-8`} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round">
          <animate attributeName="d" values="M 10,4 Q 18,0 16,-8;M 10,4 Q 20,4 18,-4;M 10,4 Q 18,0 16,-8" dur="2s" repeatCount="indefinite" />
        </path>
      </g>
    ),
    pet_robot: (
      <g className="av-pet" transform={`translate(${px}, ${py})`}>
        <rect x={-10} y={-10} width={20} height={18} rx={4} fill="#94a3b8" />
        <rect x={-7} y={-7} width={6} height={5} rx={1} fill="#22d3ee" opacity="0.8">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
        </rect>
        <rect x={1} y={-7} width={6} height={5} rx={1} fill="#22d3ee" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.5s" repeatCount="indefinite" />
        </rect>
        <line x1={0} y1={-10} x2={0} y2={-16} stroke="#94a3b8" strokeWidth="2" />
        <circle cx={0} cy={-17} r={2.5} fill="#22d3ee">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
        <rect x={-5} y={2} width={10} height={3} rx={1.5} fill="#64748b" />
      </g>
    ),
    pet_owl: (
      <g className="av-pet" transform={`translate(${px}, ${py})`}>
        <ellipse cx={0} cy={0} rx={12} ry={11} fill="#92400e" />
        <ellipse cx={0} cy={2} rx={8} ry={7} fill="#a16207" />
        <circle cx={-5} cy={-2} r={5} fill="white" />
        <circle cx={5} cy={-2} r={5} fill="white" />
        <circle cx={-5} cy={-2} r={2.5} fill="#1e293b" />
        <circle cx={5} cy={-2} r={2.5} fill="#1e293b" />
        <path d={`M -2,4 L 0,7 L 2,4`} fill="#f59e0b" />
        <path d={`M -10,-8 L -7,-14 L -4,-8`} fill="#78350f" />
        <path d={`M 4,-8 L 7,-14 L 10,-8`} fill="#78350f" />
      </g>
    ),
    pet_alien: (
      <g className="av-pet" transform={`translate(${px}, ${py})`}>
        <ellipse cx={0} cy={0} rx={11} ry={12} fill="#22c55e" />
        <ellipse cx={-5} cy={-3} rx={4} ry={5} fill="#1e293b" />
        <ellipse cx={5} cy={-3} rx={4} ry={5} fill="#1e293b" />
        <ellipse cx={-5} cy={-3} rx={2} ry={3} fill="#22c55e" />
        <ellipse cx={5} cy={-3} rx={2} ry={3} fill="#22c55e" />
        <line x1={-4} y1={-14} x2={-6} y2={-20} stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
        <circle cx={-6} cy={-21} r={2} fill="#86efac" />
        <line x1={4} y1={-14} x2={6} y2={-20} stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
        <circle cx={6} cy={-21} r={2} fill="#86efac" />
        <ellipse cx={0} cy={5} rx={3} ry={1.5} fill="#15803d" />
      </g>
    ),
    pet_dragon: (
      <g className="av-pet" transform={`translate(${px}, ${py})`}>
        <ellipse cx={0} cy={0} rx={13} ry={10} fill="#ef4444" />
        <circle cx={-5} cy={-3} r={3} fill="#fbbf24" />
        <circle cx={5} cy={-3} r={3} fill="#fbbf24" />
        <circle cx={-5} cy={-3} r={1.5} fill="#1e293b" />
        <circle cx={5} cy={-3} r={1.5} fill="#1e293b" />
        <path d={`M -8,-8 L -6,-14 L -3,-8`} fill="#dc2626" />
        <path d={`M 3,-8 L 6,-14 L 8,-8`} fill="#dc2626" />
        <path d={`M -3,5 L 0,3 L 3,5`} fill="#fbbf24" />
        {/* Wings */}
        <path d={`M -12,0 L -22,-8 L -18,2 Z`} fill="#dc2626" opacity="0.7" />
        <path d={`M 12,0 L 22,-8 L 18,2 Z`} fill="#dc2626" opacity="0.7" />
      </g>
    ),
    pet_rocket: (
      <g className="av-pet" transform={`translate(${px}, ${py})`}>
        <path d={`M 0,-16 Q 10,-8 8,6 L -8,6 Q -10,-8 0,-16 Z`} fill="#94a3b8" />
        <circle cx={0} cy={-4} r={4} fill="#60a5fa" />
        <circle cx={0} cy={-4} r={2.5} fill="#93c5fd" />
        <path d={`M -8,2 L -14,8 L -8,6 Z`} fill="#ef4444" />
        <path d={`M 8,2 L 14,8 L 8,6 Z`} fill="#ef4444" />
        {/* Flame */}
        <path d={`M -4,6 Q 0,16 4,6`} fill="#f97316" opacity="0.8">
          <animate attributeName="d" values="M -4,6 Q 0,16 4,6;M -4,6 Q 0,20 4,6;M -4,6 Q 0,16 4,6" dur="0.4s" repeatCount="indefinite" />
        </path>
      </g>
    ),
    pet_star: (
      <g className="av-pet" transform={`translate(${px}, ${py})`}>
        <path d="M 0,-12 L 3,-4 L 12,-3 L 5,3 L 7,12 L 0,7 L -7,12 L -5,3 L -12,-3 L -3,-4 Z" fill="#fbbf24" />
        <circle cx={-3} cy={-1} r={1.5} fill="#1e293b" />
        <circle cx={3} cy={-1} r={1.5} fill="#1e293b" />
        <path d={`M -2,3 Q 0,5 2,3`} fill="none" stroke="#92400e" strokeWidth="1" strokeLinecap="round" />
      </g>
    ),
    pet_moonling: (
      <g className="av-pet" transform={`translate(${px}, ${py})`}>
        <circle cx={0} cy={0} r={12} fill="#fbbf24" />
        <circle cx={4} cy={-2} r={10} fill="#fef3c7" />
        {/* Sleeping face */}
        <path d={`M -4,-1 Q -2,-3 0,-1`} fill="none" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" />
        <path d={`M 2,-1 Q 4,-3 6,-1`} fill="none" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round" />
        <ellipse cx={1} cy={4} rx={2} ry={1.5} fill="#92400e" opacity="0.4" />
      </g>
    ),
    pet_asteroid: (
      <g className="av-pet" transform={`translate(${px}, ${py})`}>
        <ellipse cx={0} cy={0} rx={13} ry={11} fill="#78716c" />
        <circle cx={-5} cy={-3} r={3} fill="#a8a29e" opacity="0.5" />
        <circle cx={4} cy={2} r={2} fill="#a8a29e" opacity="0.4" />
        <circle cx={-2} cy={4} r={1.5} fill="#a8a29e" opacity="0.3" />
        {/* Orbital ring */}
        <ellipse cx={0} cy={0} rx={18} ry={5} fill="none" stroke="#94a3b8" strokeWidth="1.5" opacity="0.4"
          transform="rotate(-20)" />
      </g>
    ),
    pet_phoenix: (
      <g className="av-pet" transform={`translate(${px}, ${py})`}>
        <ellipse cx={0} cy={0} rx={12} ry={10} fill="#f97316" />
        <ellipse cx={0} cy={2} rx={8} ry={6} fill="#fbbf24" />
        <circle cx={-4} cy={-2} r={2.5} fill="#1e293b" />
        <circle cx={4} cy={-2} r={2.5} fill="#1e293b" />
        <circle cx={-3.5} cy={-2.5} r={1} fill="white" opacity="0.7" />
        <circle cx={4.5} cy={-2.5} r={1} fill="white" opacity="0.7" />
        <path d={`M -1,3 L 0,5 L 1,3`} fill="#ef4444" />
        {/* Tail flames */}
        <path d={`M -10,4 Q -18,0 -16,-10`} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round">
          <animate attributeName="d" values="M -10,4 Q -18,0 -16,-10;M -10,4 Q -20,2 -14,-8;M -10,4 Q -18,0 -16,-10" dur="1s" repeatCount="indefinite" />
        </path>
        <path d={`M -10,4 Q -16,4 -18,-4`} fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        {/* Wing tips */}
        <path d={`M -10,-4 L -18,-10 L -12,0 Z`} fill="#f97316" opacity="0.7" />
        <path d={`M 10,-4 L 18,-10 L 12,0 Z`} fill="#f97316" opacity="0.7" />
      </g>
    ),
  };
  return map[petId] || null;
}

// ─── ACCESSORY RENDERER ─────────────────────────────────────────────────────
function AccessorySVG({ accId }) {
  const map = {
    accessory_sparkle: (
      <g>
        {[{x:30,y:40},{x:165,y:55},{x:25,y:140},{x:170,y:130},{x:85,y:30},{x:120,y:170}].map((p,i) => (
          <g key={i} transform={`translate(${p.x}, ${p.y})`}>
            <path d="M 0,-5 L 1.2,-1.2 5,0 1.2,1.2 0,5 -1.2,1.2 -5,0 -1.2,-1.2 Z" fill="white" opacity={0.4+i*0.08}>
              <animate attributeName="opacity" values={`${0.2+i*0.05};${0.7+i*0.04};${0.2+i*0.05}`} dur={`${1.5+i*0.4}s`} repeatCount="indefinite" />
            </path>
          </g>
        ))}
      </g>
    ),
    accessory_orbit: (
      <g>
        <ellipse cx={CX} cy={CX} rx={80} ry={20} fill="none" stroke="white" strokeWidth="1" opacity="0.15" transform="rotate(-15, 100, 100)" />
        <ellipse cx={CX} cy={CX} rx={60} ry={15} fill="none" stroke="white" strokeWidth="1" opacity="0.12" transform="rotate(10, 100, 100)" />
        <circle cx={CX+75} cy={CX-10} r={3} fill="white" opacity="0.5">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
      </g>
    ),
    accessory_stars: (
      <g>
        {[{x:20,y:30},{x:175,y:45},{x:30,y:165},{x:168,y:158}].map((p,i) => (
          <path key={i} d={`M ${p.x},${p.y-6} L ${p.x+1.5},${p.y-1.5} L ${p.x+6},${p.y} L ${p.x+1.5},${p.y+1.5} L ${p.x},${p.y+6} L ${p.x-1.5},${p.y+1.5} L ${p.x-6},${p.y} L ${p.x-1.5},${p.y-1.5} Z`}
            fill="#fbbf24" opacity={0.35+i*0.1}>
            <animate attributeName="opacity" values={`${0.2+i*0.1};${0.6+i*0.08};${0.2+i*0.1}`} dur={`${2+i*0.5}s`} repeatCount="indefinite" />
          </path>
        ))}
      </g>
    ),
    accessory_lightning: (
      <g transform="translate(164, 80)">
        <path d="M 0,0 L -4,10 L 2,8 L -2,20" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
        </path>
      </g>
    ),
    accessory_crystal: (
      <g>
        <circle cx={CX} cy={CX} r={70} fill="none" stroke="#60a5fa" strokeWidth="1" opacity="0.08" />
        <circle cx={CX} cy={CX} r={56} fill="none" stroke="#60a5fa" strokeWidth="1" opacity="0.12" />
        <circle cx={CX} cy={CX} r={42} fill="none" stroke="#93c5fd" strokeWidth="1" opacity="0.06" />
      </g>
    ),
    accessory_comet: (
      <g transform="translate(30, 50)">
        <circle r={4} fill="#60a5fa" opacity="0.7">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <path d="M 4,0 Q 20,8 30,4" fill="none" stroke="#60a5fa" strokeWidth="2" opacity="0.3" />
        <path d="M 4,2 Q 16,10 24,8" fill="none" stroke="#93c5fd" strokeWidth="1" opacity="0.2" />
      </g>
    ),
    accessory_flame: (
      <g transform="translate(30, 100)">
        <path d="M 6,20 Q 0,10 4,0 Q 8,-6 6,-14 Q 10,-6 14,0 Q 18,10 12,20 Z" fill="#f97316" opacity="0.35">
          <animate attributeName="d" values="M 6,20 Q 0,10 4,0 Q 8,-6 6,-14 Q 10,-6 14,0 Q 18,10 12,20 Z;M 6,20 Q 2,8 5,2 Q 7,-4 6,-12 Q 11,-4 13,2 Q 16,8 12,20 Z;M 6,20 Q 0,10 4,0 Q 8,-6 6,-14 Q 10,-6 14,0 Q 18,10 12,20 Z" dur="1.5s" repeatCount="indefinite" />
        </path>
        <path d="M 7,20 Q 4,14 6,6 Q 8,0 7,-6 Q 10,0 12,6 Q 14,14 11,20 Z" fill="#fbbf24" opacity="0.25" />
      </g>
    ),
    accessory_galaxy_wings: (
      <g opacity="0.3">
        <path d={`M ${CX-30} ${BY-5} Q ${CX-60} ${BY-25} ${CX-55} ${BY-50}
          Q ${CX-48} ${BY-30} ${CX-28} ${BY-15}`} fill="url(#wingL)" />
        <path d={`M ${CX+30} ${BY-5} Q ${CX+60} ${BY-25} ${CX+55} ${BY-50}
          Q ${CX+48} ${BY-30} ${CX+28} ${BY-15}`} fill="url(#wingR)" />
        <defs>
          <linearGradient id="wingL" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wingR" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
      </g>
    ),
  };
  return map[accId] || null;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function AvatarRenderer({ avatar = {}, size = "md", animated = true, onClick }) {
  const fid = useMemo(uid, []);
  const { w, h } = SIZES[size] || SIZES.md;
  // Normalise: shop stores "base_astronaut" but BASES keys are "astronaut"
  const rawBase = (avatar.base || "astronaut").replace(/^base_/, "");
  const base = BASES[rawBase] || BASES.astronaut;
  const bg = BACKGROUNDS[avatar.background];
  const skin = SKIN_TONES[avatar.skin];
  const HelmetComponent = HELMET_MAP[base.helmetType] || HelmetClassic;

  const animCSS = animated ? `
    @keyframes av-float-${fid}  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
    @keyframes av-bob-${fid}    { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-2px) rotate(1.5deg)} }
    @keyframes av-bounce-${fid} { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
    @keyframes av-wave-${fid}   { 0%,100%{transform:rotate(0)} 50%{transform:rotate(14deg)} }
    @keyframes av-sway-${fid}   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-1.5px)} }
    .av-body { animation: av-float-${fid} 2.8s ease-in-out infinite; }
    .av-hat  { animation: av-bob-${fid} 3.2s ease-in-out infinite; transform-origin: center bottom; }
    .av-pet  { animation: av-bounce-${fid} 2s ease-in-out infinite 0.3s; }
    .av-wave { animation: av-wave-${fid} 1s ease-in-out infinite; transform-origin: ${CX+46}px ${BY-4}px; }
    .av-hair { animation: av-sway-${fid} 2.8s ease-in-out infinite; }
  ` : '';

  return (
    <div
      onClick={onClick}
      style={{
        width: w, height: h, borderRadius: "50%", overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s ease",
        boxShadow: `0 4px 24px ${base.glow}`,
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = "scale(1.08)")}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = "scale(1)")}
    >
      <svg width={w} height={h} viewBox={`0 0 ${VB} ${VB}`} xmlns="http://www.w3.org/2000/svg">
        {animated && <style>{animCSS}</style>}
        <FilterDefs id={fid} />

        {/* Background */}
        {bg ? <BgLayer bgId={avatar.background} fid={fid} /> : <rect width={VB} height={VB} fill={base.helmet} />}

        {/* Accessory (behind body) */}
        {avatar.accessory && <AccessorySVG accId={avatar.accessory} />}

        {/* Body */}
        <SuitBody base={base} fid={fid} />

        {/* Head — skin selects face mode, otherwise full helmet */}
        {skin ? <Face skin={skin} base={base} exprId={avatar.expression} fid={fid} /> : <HelmetComponent base={base} fid={fid} />}

        {/* Expression overlay (only in face mode) */}
        {skin && avatar.expression && <ExpressionSVG exprId={avatar.expression} skin={skin} />}

        {/* Hair (only in face mode) */}
        {avatar.hair && <HairSVG hairId={avatar.hair} fid={fid} />}

        {/* Hat */}
        {avatar.hat && <HatSVG hatId={avatar.hat} fid={fid} />}

        {/* Pet */}
        {avatar.pet && <PetSVG petId={avatar.pet} fid={fid} />}
      </svg>
    </div>
  );
}
