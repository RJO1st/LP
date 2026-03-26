"use client";
// ─── AvatarRenderer.jsx ─────────────────────────────────────────────────────
// SVG-based avatar rendering with GSAP animations.
// Replaces emoji-only avatars with layered, animated characters.
//
// Props:
//   avatar     — { base, hat, pet, accessory, background } from scholar record
//   size       — "sm" | "md" | "lg" | "xl"  (default "md")
//   animated   — boolean (default true)
//   onClick    — optional click handler
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useEffect } from "react";
import gsap from "gsap";

// ─── SIZE CONFIG ─────────────────────────────────────────────────────────────
const SIZES = {
  sm:  { w: 48,  h: 48,  scale: 0.4 },
  md:  { w: 80,  h: 80,  scale: 0.65 },
  lg:  { w: 120, h: 120, scale: 1.0 },
  xl:  { w: 160, h: 160, scale: 1.3 },
};

// ─── AVATAR BASE STYLES ─────────────────────────────────────────────────────
const BASES = {
  astronaut: {
    body: "#6366f1", helmet: "#e0e7ff", visor: "#312e81",
    label: "Astronaut",
  },
  explorer: {
    body: "#10b981", helmet: "#d1fae5", visor: "#064e3b",
    label: "Explorer",
  },
  scientist: {
    body: "#f59e0b", helmet: "#fef3c7", visor: "#78350f",
    label: "Scientist",
  },
  pilot: {
    body: "#f43f5e", helmet: "#ffe4e6", visor: "#881337",
    label: "Pilot",
  },
  captain: {
    body: "#7c3aed", helmet: "#ede9fe", visor: "#4c1d95",
    label: "Captain",
  },
};

// ─── HAT SVG RENDERERS ──────────────────────────────────────────────────────
function HatSVG({ hatId, cx, topY }) {
  const hats = {
    hat_wizard: (
      <g className="av-hat">
        <polygon points={`${cx},${topY - 28} ${cx - 16},${topY + 2} ${cx + 16},${topY + 2}`}
          fill="#7c3aed" stroke="#5b21b6" strokeWidth={1.5} />
        <ellipse cx={cx} cy={topY + 2} rx={20} ry={4} fill="#5b21b6" />
        <circle cx={cx} cy={topY - 26} r={3} fill="#fbbf24" />
      </g>
    ),
    hat_crown: (
      <g className="av-hat">
        <polygon points={`${cx - 14},${topY + 2} ${cx - 10},${topY - 14} ${cx - 4},${topY - 4} ${cx},${topY - 18} ${cx + 4},${topY - 4} ${cx + 10},${topY - 14} ${cx + 14},${topY + 2}`}
          fill="#eab308" stroke="#ca8a04" strokeWidth={1.5} />
        <rect x={cx - 14} y={topY + 1} width={28} height={5} rx={2} fill="#ca8a04" />
        <circle cx={cx} cy={topY - 14} r={2} fill="#ef4444" />
        <circle cx={cx - 8} cy={topY - 8} r={1.5} fill="#3b82f6" />
        <circle cx={cx + 8} cy={topY - 8} r={1.5} fill="#22c55e" />
      </g>
    ),
    hat_astronaut: (
      <g className="av-hat">
        <ellipse cx={cx} cy={topY - 4} rx={18} ry={12} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1.5} />
        <ellipse cx={cx} cy={topY - 4} rx={12} ry={8} fill="#bfdbfe" opacity={0.6} />
        <circle cx={cx + 10} cy={topY - 10} r={2} fill="white" opacity={0.8} />
      </g>
    ),
    hat_graduation: (
      <g className="av-hat">
        <polygon points={`${cx},${topY - 12} ${cx - 22},${topY} ${cx},${topY + 2} ${cx + 22},${topY}`}
          fill="#1e293b" stroke="#0f172a" strokeWidth={1} />
        <rect x={cx - 8} y={topY} width={16} height={4} rx={2} fill="#334155" />
        <line x1={cx + 16} y1={topY} x2={cx + 18} y2={topY + 14} stroke="#eab308" strokeWidth={1.5} />
        <circle cx={cx + 18} cy={topY + 16} r={3} fill="#eab308" />
      </g>
    ),
    hat_detective: (
      <g className="av-hat">
        <ellipse cx={cx} cy={topY + 2} rx={22} ry={5} fill="#78350f" />
        <ellipse cx={cx} cy={topY - 4} rx={14} ry={10} fill="#92400e" stroke="#78350f" strokeWidth={1.5} />
        <rect x={cx - 6} y={topY - 2} width={12} height={3} rx={1} fill="#78350f" />
      </g>
    ),
    hat_cowboy: (
      <g className="av-hat">
        <ellipse cx={cx} cy={topY + 4} rx={24} ry={5} fill="#a16207" stroke="#854d0e" strokeWidth={1} />
        <path d={`M ${cx - 12} ${topY + 2} Q ${cx - 14} ${topY - 14} ${cx} ${topY - 16} Q ${cx + 14} ${topY - 14} ${cx + 12} ${topY + 2}`}
          fill="#ca8a04" stroke="#a16207" strokeWidth={1.5} />
        <rect x={cx - 8} y={topY} width={16} height={3} rx={1} fill="#854d0e" />
      </g>
    ),
  };
  return hats[hatId] || null;
}

// ─── PET SVG RENDERERS ──────────────────────────────────────────────────────
function PetSVG({ petId, x, y }) {
  const pets = {
    pet_cat: (
      <g className="av-pet" transform={`translate(${x}, ${y})`}>
        <ellipse cx={0} cy={0} rx={10} ry={8} fill="#f97316" />
        <polygon points="-8,-6 -10,-14 -4,-8" fill="#f97316" />
        <polygon points="8,-6 10,-14 4,-8" fill="#f97316" />
        <circle cx={-3} cy={-2} r={1.5} fill="#1e293b" />
        <circle cx={3} cy={-2} r={1.5} fill="#1e293b" />
        <ellipse cx={0} cy={1} rx={2} ry={1} fill="#fb923c" />
        <path d={`M 8 2 Q 16 -4 14 4`} fill="none" stroke="#f97316" strokeWidth={1.5} strokeLinecap="round" />
      </g>
    ),
    pet_robot: (
      <g className="av-pet" transform={`translate(${x}, ${y})`}>
        <rect x={-9} y={-8} width={18} height={16} rx={3} fill="#94a3b8" stroke="#64748b" strokeWidth={1} />
        <rect x={-5} y={-5} width={4} height={3} rx={1} fill="#22d3ee" />
        <rect x={1} y={-5} width={4} height={3} rx={1} fill="#22d3ee" />
        <line x1={-3} y1={3} x2={3} y2={3} stroke="#64748b" strokeWidth={1.5} strokeLinecap="round" />
        <line x1={0} y1={-8} x2={0} y2={-13} stroke="#64748b" strokeWidth={1.5} />
        <circle cx={0} cy={-14} r={2} fill="#f43f5e" />
      </g>
    ),
    pet_owl: (
      <g className="av-pet" transform={`translate(${x}, ${y})`}>
        <ellipse cx={0} cy={0} rx={10} ry={10} fill="#92400e" />
        <circle cx={-4} cy={-3} r={4} fill="white" stroke="#78350f" strokeWidth={0.5} />
        <circle cx={4} cy={-3} r={4} fill="white" stroke="#78350f" strokeWidth={0.5} />
        <circle cx={-4} cy={-3} r={2} fill="#1e293b" />
        <circle cx={4} cy={-3} r={2} fill="#1e293b" />
        <polygon points="0,-1 -2,2 2,2" fill="#f59e0b" />
        <path d={`M -8 -8 L -6 -12 L -3 -8`} fill="#78350f" />
        <path d={`M 3 -8 L 6 -12 L 8 -8`} fill="#78350f" />
      </g>
    ),
    pet_alien: (
      <g className="av-pet" transform={`translate(${x}, ${y})`}>
        <ellipse cx={0} cy={0} rx={9} ry={10} fill="#86efac" stroke="#22c55e" strokeWidth={1} />
        <ellipse cx={-4} cy={-3} rx={3} ry={4} fill="#1e293b" />
        <ellipse cx={4} cy={-3} rx={3} ry={4} fill="#1e293b" />
        <circle cx={-3} cy={-3} r={1} fill="#22c55e" />
        <circle cx={5} cy={-3} r={1} fill="#22c55e" />
        <ellipse cx={0} cy={3} rx={3} ry={1.5} fill="#4ade80" />
        <line x1={-4} y1={-10} x2={-6} y2={-16} stroke="#22c55e" strokeWidth={1} strokeLinecap="round" />
        <line x1={4} y1={-10} x2={6} y2={-16} stroke="#22c55e" strokeWidth={1} strokeLinecap="round" />
        <circle cx={-6} cy={-17} r={2} fill="#86efac" />
        <circle cx={6} cy={-17} r={2} fill="#86efac" />
      </g>
    ),
    pet_dragon: (
      <g className="av-pet" transform={`translate(${x}, ${y})`}>
        <ellipse cx={0} cy={0} rx={10} ry={8} fill="#ef4444" />
        <polygon points="-6,-6 -10,-14 -2,-8" fill="#dc2626" />
        <polygon points="6,-6 10,-14 2,-8" fill="#dc2626" />
        <polygon points="-4,-8 -2,-16 0,-8 2,-16 4,-8" fill="#f97316" />
        <circle cx={-3} cy={-2} r={2} fill="#fbbf24" />
        <circle cx={3} cy={-2} r={2} fill="#fbbf24" />
        <circle cx={-3} cy={-2} r={1} fill="#1e293b" />
        <circle cx={3} cy={-2} r={1} fill="#1e293b" />
        <ellipse cx={0} cy={3} rx={2} ry={1} fill="#fca5a5" />
      </g>
    ),
    pet_rocket: (
      <g className="av-pet" transform={`translate(${x}, ${y})`}>
        <ellipse cx={0} cy={-2} rx={5} ry={10} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
        <circle cx={0} cy={-4} r={3} fill="#60a5fa" opacity={0.7} />
        <polygon points="-5,4 -8,10 -3,6" fill="#f43f5e" />
        <polygon points="5,4 8,10 3,6" fill="#f43f5e" />
        <path d={`M -2 9 Q 0 16 2 9`} fill="#f97316" opacity={0.9} />
      </g>
    ),
  };
  return pets[petId] || null;
}

// ─── ACCESSORY SVG RENDERERS ────────────────────────────────────────────────
function AccessorySVG({ accId, cx, cy, r }) {
  const acc = {
    accessory_stars: (
      <g className="av-acc" opacity={0.8}>
        {[[-r + 5, -r + 8], [r - 8, -r + 12], [-r + 10, r - 10], [r - 6, r - 14]].map(([dx, dy], i) => (
          <text key={i} x={cx + dx} y={cy + dy} fontSize={8 + (i % 2) * 4}
            fill="#eab308" textAnchor="middle">✦</text>
        ))}
      </g>
    ),
    accessory_flame: (
      <g className="av-acc">
        <text x={cx - r - 4} y={cy + 10} fontSize={14}>🔥</text>
      </g>
    ),
    accessory_lightning: (
      <g className="av-acc">
        <polygon points={`${cx + r + 2},${cy - 12} ${cx + r - 2},${cy} ${cx + r + 4},${cy} ${cx + r},${cy + 12}`}
          fill="#eab308" stroke="#ca8a04" strokeWidth={0.8} />
      </g>
    ),
    accessory_rainbow: (
      <g className="av-acc" opacity={0.5}>
        {["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"].map((c, i) => (
          <circle key={i} cx={cx} cy={cy} r={r + 10 + i * 2.5}
            fill="none" stroke={c} strokeWidth={1.5} />
        ))}
      </g>
    ),
  };
  return acc[accId] || null;
}

// ─── BACKGROUND SVG RENDERERS ───────────────────────────────────────────────
const BACKGROUNDS = {
  background_space: { grad: ["#0f172a", "#1e1b4b"], stars: true },
  background_galaxy: { grad: ["#1e1b4b", "#4c1d95"], stars: true },
  background_sunset: { grad: ["#fef3c7", "#fb923c", "#f43f5e"], stars: false },
  background_ocean:  { grad: ["#cffafe", "#0891b2", "#164e63"], stars: false },
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function AvatarRenderer({ avatar = {}, size = "md", animated = true, onClick }) {
  const ref = useRef(null);
  const { w, h, scale } = SIZES[size] || SIZES.md;
  const base = BASES[avatar.base] || BASES.astronaut;
  const bg = BACKGROUNDS[avatar.background];

  // GSAP idle animation
  useEffect(() => {
    if (!animated || !ref.current) return;
    const body = ref.current.querySelector(".av-body");
    const hat = ref.current.querySelector(".av-hat");
    const pet = ref.current.querySelector(".av-pet");
    const acc = ref.current.querySelector(".av-acc");
    const ctx = gsap.context(() => {
      if (body) {
        gsap.to(body, { y: -2, duration: 1.2, yoyo: true, repeat: -1, ease: "sine.inOut" });
      }
      if (hat) {
        gsap.to(hat, { y: -1.5, rotation: 1, duration: 1.4, yoyo: true, repeat: -1, ease: "sine.inOut", transformOrigin: "center bottom" });
      }
      if (pet) {
        gsap.to(pet, { y: -3, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut", delay: 0.3 });
      }
      if (acc) {
        gsap.to(acc, { opacity: 0.5, duration: 1.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
      }
    }, ref);
    return () => ctx.revert();
  }, [animated, avatar]);

  const VB = 120;
  const CX = 60, CY = 55;

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        width: w, height: h, borderRadius: "50%", overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s ease",
        boxShadow: `0 4px 16px ${base.body}40`,
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = "scale(1.08)")}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = "scale(1)")}
    >
      <svg width={w} height={h} viewBox={`0 0 ${VB} ${VB}`}>
        <defs>
          {bg && (
            <linearGradient id={`avbg-${avatar.background}`} x1="0" y1="0" x2="0" y2="1">
              {bg.grad.map((c, i) => (
                <stop key={i} offset={`${(i / (bg.grad.length - 1)) * 100}%`} stopColor={c} />
              ))}
            </linearGradient>
          )}
          <linearGradient id="avBodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={base.body} />
            <stop offset="100%" stopColor={`${base.body}cc`} />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width={VB} height={VB} fill={bg ? `url(#avbg-${avatar.background})` : `${base.helmet}`} rx={0} />
        {bg?.stars && Array.from({ length: 12 }, (_, i) => (
          <circle key={i}
            cx={10 + (i * 37) % 100} cy={8 + (i * 23) % 90}
            r={0.5 + (i % 3) * 0.5} fill="white" opacity={0.4 + (i % 3) * 0.2} />
        ))}

        {/* Accessory (behind body) */}
        {avatar.accessory && <AccessorySVG accId={avatar.accessory} cx={CX} cy={CY} r={28} />}

        {/* Body */}
        <g className="av-body">
          {/* Spacesuit body */}
          <ellipse cx={CX} cy={CY + 26} rx={18} ry={14} fill="url(#avBodyGrad)" />
          {/* Head / Helmet */}
          <circle cx={CX} cy={CY - 2} r={22} fill={base.helmet} stroke={base.body} strokeWidth={2} />
          {/* Visor */}
          <ellipse cx={CX} cy={CY} rx={14} ry={12} fill={base.visor} opacity={0.85} rx={14} />
          {/* Eyes */}
          <circle cx={CX - 5} cy={CY - 1} r={3} fill="white" />
          <circle cx={CX + 5} cy={CY - 1} r={3} fill="white" />
          <circle cx={CX - 4} cy={CY - 1} r={1.5} fill="#1e293b" />
          <circle cx={CX + 6} cy={CY - 1} r={1.5} fill="#1e293b" />
          {/* Smile */}
          <path d={`M ${CX - 5} ${CY + 5} Q ${CX} ${CY + 10} ${CX + 5} ${CY + 5}`}
            fill="none" stroke="white" strokeWidth={1.5} strokeLinecap="round" />
          {/* Helmet shine */}
          <ellipse cx={CX + 8} cy={CY - 8} rx={3} ry={5} fill="white" opacity={0.25} transform={`rotate(-20 ${CX + 8} ${CY - 8})`} />
        </g>

        {/* Hat (on top of head) */}
        {avatar.hat && <HatSVG hatId={avatar.hat} cx={CX} topY={CY - 22} />}

        {/* Pet (bottom-right) */}
        {avatar.pet && <PetSVG petId={avatar.pet} x={CX + 30} y={CY + 30} />}
      </svg>
    </div>
  );
}
