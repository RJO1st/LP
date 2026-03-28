"use client";
// ─── KS12ScienceVisuals.jsx ───────────────────────────────────────────────────
// Rich, animated SVG visuals for KS1/KS2 science concepts.
// Each concept that was previously emoji-only gets a proper visual.
//
// Import into MathsVisualiser and replace the emoji fallback in BasicConceptVis.
//
// Exported map: CONCEPT_VISUALS[concept] → React SVG component
// ──────────────────────────────────────────────────────────────────────────────
import React from "react";

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────
const C = {
  green: "#22c55e", greenDark: "#15803d", greenLight: "#dcfce7",
  blue: "#3b82f6", blueDark: "#1d4ed8", blueLight: "#dbeafe",
  sky: "#0ea5e9", skyLight: "#e0f2fe",
  amber: "#f59e0b", amberDark: "#b45309", amberLight: "#fef3c7",
  red: "#ef4444", redLight: "#fee2e2",
  brown: "#92400e", brownLight: "#fde68a",
  pink: "#ec4899", pinkLight: "#fce7f3",
  purple: "#8b5cf6", purpleLight: "#ede9fe",
  slate: "#475569", slateLight: "#f1f5f9",
  white: "#ffffff", yellow: "#fbbf24",
};

// ─── CSS ANIMATIONS (injected once) ─────────────────────────────────────────
const ANIM_STYLES = `
@keyframes ks-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
@keyframes ks-pulse { 0%,100%{opacity:0.7} 50%{opacity:1} }
@keyframes ks-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes ks-rain { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(20px);opacity:0} }
@keyframes ks-grow { 0%{transform:scaleY(0.3);opacity:0.5} 100%{transform:scaleY(1);opacity:1} }
@keyframes ks-wave { 0%,100%{transform:translateX(0)} 50%{transform:translateX(6px)} }
@keyframes ks-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
`;
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = ANIM_STYLES;
  document.head.appendChild(el);
  stylesInjected = true;
}

// ─── WRAPPER ───────────────────────────────────────────────────────────────
function Vis({ children, w = 200, h = 160 }) {
  React.useEffect(injectStyles, []);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: "100%" }}>
      {children}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INDIVIDUAL CONCEPT VISUALS
// ═══════════════════════════════════════════════════════════════════════════════

// ── HABITAT ─────────────────────────────────────────────────────────────────
function HabitatVis() {
  return (
    <Vis w={220} h={140}>
      {/* Sky */}
      <rect x="0" y="0" width="220" height="70" fill={C.skyLight} rx="4" />
      {/* Sun */}
      <circle cx="30" cy="25" r="14" fill={C.yellow} style={{ animation: "ks-pulse 3s ease-in-out infinite" }} />
      {/* Ground */}
      <rect x="0" y="70" width="220" height="70" fill={C.greenLight} rx="4" />
      {/* Pond */}
      <ellipse cx="160" cy="100" rx="40" ry="20" fill={C.blueLight} stroke={C.blue} strokeWidth="1.5" />
      {/* Trees */}
      <circle cx="50" cy="55" r="20" fill={C.green} />
      <rect x="47" y="70" width="6" height="25" fill={C.brown} rx="2" />
      <circle cx="90" cy="50" r="16" fill={C.greenDark} />
      <rect x="87" y="62" width="6" height="22" fill={C.brown} rx="2" />
      {/* Animals */}
      <text x="55" y="110" fontSize="16" style={{ animation: "ks-bounce 2s ease-in-out infinite" }}>🐰</text>
      <text x="140" y="96" fontSize="14" style={{ animation: "ks-float 2.5s ease-in-out infinite" }}>🐸</text>
      <text x="100" y="38" fontSize="12" style={{ animation: "ks-float 3s ease-in-out infinite" }}>🐦</text>
      {/* Label */}
      <text x="110" y="135" textAnchor="middle" fontSize="10" fontWeight="700" fill={C.slate}>Woodland & Pond Habitat</text>
    </Vis>
  );
}

// ── LIFE CYCLE ──────────────────────────────────────────────────────────────
function LifeCycleVis() {
  const stages = [
    { emoji: "🥚", label: "Egg", x: 100, y: 20 },
    { emoji: "🐛", label: "Larva", x: 170, y: 75 },
    { emoji: "🫘", label: "Pupa", x: 100, y: 130 },
    { emoji: "🦋", label: "Adult", x: 30, y: 75 },
  ];
  return (
    <Vis w={200} h={155}>
      {/* Circular arrows */}
      <path d="M120,30 Q170,15 170,65" fill="none" stroke={C.green} strokeWidth="2" markerEnd="url(#arrowG)" />
      <path d="M165,95 Q170,140 110,140" fill="none" stroke={C.green} strokeWidth="2" markerEnd="url(#arrowG)" />
      <path d="M85,135 Q30,140 30,95" fill="none" stroke={C.green} strokeWidth="2" markerEnd="url(#arrowG)" />
      <path d="M35,60 Q30,15 80,20" fill="none" stroke={C.green} strokeWidth="2" markerEnd="url(#arrowG)" />
      <defs>
        <marker id="arrowG" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C.green} />
        </marker>
      </defs>
      {stages.map((s, i) => (
        <g key={i} style={{ animation: `ks-pulse 3s ${i * 0.5}s ease-in-out infinite` }}>
          <text x={s.x} y={s.y + 14} textAnchor="middle" fontSize="22">{s.emoji}</text>
          <text x={s.x} y={s.y + 32} textAnchor="middle" fontSize="8" fontWeight="700" fill={C.slate}>{s.label}</text>
        </g>
      ))}
    </Vis>
  );
}

// ── FOOD CHAIN ──────────────────────────────────────────────────────────────
function FoodChainBasicVis() {
  const chain = [
    { emoji: "☀️", label: "Sun", bg: C.amberLight },
    { emoji: "🌿", label: "Plant", bg: C.greenLight },
    { emoji: "🐛", label: "Caterpillar", bg: C.greenLight },
    { emoji: "🐦", label: "Bird", bg: C.blueLight },
    { emoji: "🦊", label: "Fox", bg: C.amberLight },
  ];
  return (
    <Vis w={240} h={80}>
      {chain.map((c, i) => {
        const x = 10 + i * 48;
        return (
          <g key={i}>
            <rect x={x} y={10} width="40" height="55" rx="8" fill={c.bg} stroke={C.slate} strokeWidth="0.5" opacity="0.6" />
            <text x={x + 20} y={35} textAnchor="middle" fontSize="18">{c.emoji}</text>
            <text x={x + 20} y={55} textAnchor="middle" fontSize="6" fontWeight="700" fill={C.slate}>{c.label}</text>
            {i < chain.length - 1 && (
              <text x={x + 43} y={38} fontSize="12" fill={C.green} fontWeight="900">→</text>
            )}
          </g>
        );
      })}
      <text x="120" y="76" textAnchor="middle" fontSize="7" fill={C.slate} fontWeight="600">Producer → Primary → Secondary → Tertiary Consumer</text>
    </Vis>
  );
}

// ── SEASONS ─────────────────────────────────────────────────────────────────
function SeasonsVis() {
  const seasons = [
    { name: "Spring", emoji: "🌸", color: "#ec4899", bg: "#fce7f3" },
    { name: "Summer", emoji: "☀️", color: "#f59e0b", bg: "#fef3c7" },
    { name: "Autumn", emoji: "🍂", color: "#d97706", bg: "#fde68a" },
    { name: "Winter", emoji: "❄️", color: "#3b82f6", bg: "#dbeafe" },
  ];
  return (
    <Vis w={220} h={120}>
      {seasons.map((s, i) => {
        const x = 8 + i * 54;
        return (
          <g key={i}>
            <rect x={x} y={10} width="48" height="85" rx="10" fill={s.bg} stroke={s.color} strokeWidth="1.5" />
            <text x={x + 24} y={45} textAnchor="middle" fontSize="24" style={{ animation: `ks-float ${2.5 + i * 0.3}s ease-in-out infinite` }}>{s.emoji}</text>
            <text x={x + 24} y={68} textAnchor="middle" fontSize="9" fontWeight="800" fill={s.color}>{s.name}</text>
            <text x={x + 24} y={82} textAnchor="middle" fontSize="6" fill={C.slate} fontWeight="600">
              {i === 0 ? "Mar–May" : i === 1 ? "Jun–Aug" : i === 2 ? "Sep–Nov" : "Dec–Feb"}
            </text>
          </g>
        );
      })}
      <text x="110" y="110" textAnchor="middle" fontSize="8" fill={C.slate} fontWeight="700">The Four Seasons</text>
    </Vis>
  );
}

// ── WEATHER ─────────────────────────────────────────────────────────────────
function WeatherVis() {
  return (
    <Vis w={220} h={130}>
      {/* Sun */}
      <circle cx="40" cy="35" r="18" fill={C.yellow} style={{ animation: "ks-pulse 3s ease-in-out infinite" }} />
      {[0,45,90,135,180,225,270,315].map(a => (
        <line key={a} x1={40 + 22 * Math.cos(a * Math.PI / 180)} y1={35 + 22 * Math.sin(a * Math.PI / 180)}
          x2={40 + 28 * Math.cos(a * Math.PI / 180)} y2={35 + 28 * Math.sin(a * Math.PI / 180)}
          stroke={C.yellow} strokeWidth="2" strokeLinecap="round" />
      ))}
      {/* Cloud */}
      <ellipse cx="120" cy="30" rx="30" ry="16" fill="#e2e8f0" />
      <ellipse cx="105" cy="35" rx="20" ry="14" fill="#cbd5e1" />
      <ellipse cx="138" cy="35" rx="22" ry="14" fill="#e2e8f0" />
      {/* Rain drops */}
      {[108, 118, 128, 138].map((rx, i) => (
        <line key={i} x1={rx} y1={48} x2={rx - 2} y2={58} stroke={C.blue} strokeWidth="1.5" strokeLinecap="round"
          style={{ animation: `ks-rain 1.2s ${i * 0.2}s ease-in infinite` }} />
      ))}
      {/* Wind */}
      <path d="M160,55 Q180,50 195,55 Q185,60 200,58" fill="none" stroke={C.slate} strokeWidth="1.5" opacity="0.5"
        style={{ animation: "ks-wave 2s ease-in-out infinite" }} />
      {/* Thermometer */}
      <rect x="185" y="15" width="8" height="50" rx="4" fill={C.white} stroke={C.red} strokeWidth="1.5" />
      <rect x="187" y="35" width="4" height="28" rx="2" fill={C.red} opacity="0.7" />
      <circle cx="189" cy="72" r="6" fill={C.red} />
      {/* Labels */}
      <rect x="10" y="85" width="200" height="35" rx="6" fill={C.slateLight} />
      <text x="30" y="101" fontSize="8" fontWeight="700" fill={C.slate}>☀️ Sunny</text>
      <text x="80" y="101" fontSize="8" fontWeight="700" fill={C.slate}>🌧️ Rain</text>
      <text x="130" y="101" fontSize="8" fontWeight="700" fill={C.slate}>💨 Wind</text>
      <text x="175" y="101" fontSize="8" fontWeight="700" fill={C.slate}>🌡️ Temp</text>
    </Vis>
  );
}

// ── MATERIALS & PROPERTIES ──────────────────────────────────────────────────
function MaterialsVis() {
  const materials = [
    { name: "Wood", props: ["Hard", "Opaque"], emoji: "🪵", color: C.brown },
    { name: "Glass", props: ["Hard", "Transparent"], emoji: "🪟", color: C.blue },
    { name: "Rubber", props: ["Flexible", "Waterproof"], emoji: "🎈", color: C.red },
    { name: "Metal", props: ["Hard", "Conductor"], emoji: "🔩", color: C.slate },
    { name: "Fabric", props: ["Soft", "Flexible"], emoji: "🧶", color: C.pink },
  ];
  return (
    <Vis w={240} h={120}>
      {materials.map((m, i) => {
        const x = 5 + i * 48;
        return (
          <g key={i}>
            <rect x={x} y={8} width="42" height="90" rx="8" fill={C.white} stroke={m.color} strokeWidth="1.5" />
            <text x={x + 21} y={32} textAnchor="middle" fontSize="16">{m.emoji}</text>
            <text x={x + 21} y={48} textAnchor="middle" fontSize="7" fontWeight="800" fill={m.color}>{m.name}</text>
            {m.props.map((p, j) => (
              <text key={j} x={x + 21} y={60 + j * 12} textAnchor="middle" fontSize="6" fill={C.slate} fontWeight="600">{p}</text>
            ))}
          </g>
        );
      })}
      <text x="120" y="112" textAnchor="middle" fontSize="8" fill={C.slate} fontWeight="700">Materials & Their Properties</text>
    </Vis>
  );
}

// ── MAGNETS (basic KS1/2) ───────────────────────────────────────────────────
function MagnetBasicVis() {
  return (
    <Vis w={200} h={120}>
      {/* Bar magnet */}
      <rect x="30" y="35" width="60" height="30" rx="4" fill={C.red} />
      <rect x="90" y="35" width="60" height="30" rx="4" fill={C.blue} />
      <text x="60" y="55" textAnchor="middle" fontSize="14" fontWeight="900" fill={C.white}>N</text>
      <text x="120" y="55" textAnchor="middle" fontSize="14" fontWeight="900" fill={C.white}>S</text>
      {/* Field lines */}
      {[0,1,2].map(i => {
        const y = 40 + i * 8;
        return (
          <path key={i} d={`M155,${y} Q175,${50 - i * 15} 170,${25 - i * 5} Q165,${15 - i * 3} 100,${10 - i * 2} Q35,${15 - i * 3} 25,${25 - i * 5} Q20,${50 - i * 15} 25,${y}`}
            fill="none" stroke={C.slate} strokeWidth="0.8" opacity="0.4" strokeDasharray="3,2" />
        );
      })}
      {/* Attracted items */}
      <text x="170" y="55" fontSize="10">📎</text>
      <text x="6" y="45" fontSize="10" style={{ animation: "ks-wave 1.5s ease-in-out infinite" }}>🔩</text>
      {/* Labels */}
      <text x="60" y="80" textAnchor="middle" fontSize="7" fill={C.red} fontWeight="700">North Pole</text>
      <text x="120" y="80" textAnchor="middle" fontSize="7" fill={C.blue} fontWeight="700">South Pole</text>
      <text x="100" y="100" textAnchor="middle" fontSize="7" fill={C.slate} fontWeight="600">Attracts: iron, steel, nickel</text>
      <text x="100" y="112" textAnchor="middle" fontSize="7" fill={C.slate} fontWeight="600">Does NOT attract: plastic, wood, glass</text>
    </Vis>
  );
}

// ── LIGHT & SHADOWS ─────────────────────────────────────────────────────────
function LightBasicVis() {
  return (
    <Vis w={220} h={120}>
      {/* Light source */}
      <circle cx="30" cy="50" r="16" fill={C.yellow} style={{ animation: "ks-pulse 2.5s ease-in-out infinite" }} />
      <text x="30" y="55" textAnchor="middle" fontSize="14">💡</text>
      {/* Light rays */}
      {[-15, 0, 15].map((angle, i) => {
        const rad = angle * Math.PI / 180;
        return (
          <line key={i} x1="46" y1={50 + Math.sin(rad) * 5} x2="100" y2={50 + Math.sin(rad) * 30}
            stroke={C.yellow} strokeWidth="1.5" opacity="0.6" strokeDasharray="4,3" />
        );
      })}
      {/* Object */}
      <rect x="100" y="30" width="20" height="40" rx="3" fill={C.slate} stroke={C.slate} strokeWidth="1.5" />
      <text x="110" y="54" textAnchor="middle" fontSize="8" fill={C.white} fontWeight="700">Object</text>
      {/* Shadow */}
      <path d="M120,30 L180,15 L180,85 L120,70 Z" fill="#1e293b" opacity="0.2" />
      <text x="155" y="55" textAnchor="middle" fontSize="8" fill={C.slate} fontWeight="700">Shadow</text>
      {/* Labels */}
      <text x="30" y="85" textAnchor="middle" fontSize="7" fill={C.slate} fontWeight="600">Light source</text>
      <text x="110" y="85" textAnchor="middle" fontSize="7" fill={C.slate} fontWeight="600">Opaque object</text>
      <text x="110" y="110" textAnchor="middle" fontSize="8" fill={C.slate} fontWeight="700">Light travels in straight lines</text>
    </Vis>
  );
}

// ── SOUND ───────────────────────────────────────────────────────────────────
function SoundBasicVis() {
  return (
    <Vis w={220} h={110}>
      {/* Speaker / source */}
      <rect x="15" y="30" width="25" height="35" rx="4" fill={C.purple} />
      <text x="27" y="52" textAnchor="middle" fontSize="14">🔊</text>
      {/* Sound waves */}
      {[0, 1, 2, 3].map(i => (
        <path key={i} d={`M${50 + i * 25},25 Q${60 + i * 25},50 ${50 + i * 25},75`}
          fill="none" stroke={C.purple} strokeWidth={2 - i * 0.4} opacity={0.8 - i * 0.15}
          style={{ animation: `ks-wave ${1.5 + i * 0.3}s ease-in-out infinite` }} />
      ))}
      {/* Ear */}
      <text x="180" y="55" fontSize="20">👂</text>
      {/* Labels */}
      <text x="28" y="78" textAnchor="middle" fontSize="7" fill={C.purple} fontWeight="700">Source</text>
      <text x="100" y="90" textAnchor="middle" fontSize="7" fill={C.slate} fontWeight="600">Vibrations travel through air</text>
      <text x="190" y="72" textAnchor="middle" fontSize="7" fill={C.purple} fontWeight="700">Ear</text>
      <text x="110" y="104" textAnchor="middle" fontSize="8" fill={C.slate} fontWeight="700">Loud = big vibrations · Quiet = small vibrations</text>
    </Vis>
  );
}

// ── TEETH ───────────────────────────────────────────────────────────────────
function TeethVis() {
  const teeth = [
    { name: "Incisor", emoji: "🦷", desc: "Cutting & biting", x: 30 },
    { name: "Canine", emoji: "🦷", desc: "Tearing food", x: 85 },
    { name: "Premolar", emoji: "🦷", desc: "Crushing", x: 140 },
    { name: "Molar", emoji: "🦷", desc: "Grinding food", x: 195 },
  ];
  return (
    <Vis w={230} h={100}>
      {teeth.map((t, i) => (
        <g key={i}>
          <rect x={t.x - 18} y={8} width="36" height="70" rx="8" fill={C.white} stroke={C.slate} strokeWidth="1" />
          <text x={t.x} y={35} textAnchor="middle" fontSize="18">{t.emoji}</text>
          <text x={t.x} y={52} textAnchor="middle" fontSize="7" fontWeight="800" fill={C.slate}>{t.name}</text>
          <text x={t.x} y={64} textAnchor="middle" fontSize="6" fill={C.slate}>{t.desc}</text>
        </g>
      ))}
      <text x="115" y="94" textAnchor="middle" fontSize="8" fill={C.slate} fontWeight="700">Types of Teeth</text>
    </Vis>
  );
}

// ── SKELETON (basic) ────────────────────────────────────────────────────────
function SkeletonBasicVis() {
  return (
    <Vis w={160} h={180}>
      {/* Skull */}
      <circle cx="80" cy="25" r="18" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
      <circle cx="74" cy="22" r="3" fill={C.slate} />
      <circle cx="86" cy="22" r="3" fill={C.slate} />
      <path d="M76,32 Q80,35 84,32" fill="none" stroke={C.slate} strokeWidth="1" />
      {/* Spine */}
      <line x1="80" y1="43" x2="80" y2="110" stroke={C.slate} strokeWidth="3" />
      {/* Ribs */}
      {[55, 65, 75].map(y => (
        <g key={y}>
          <path d={`M65,${y} Q55,${y + 5} 58,${y + 8}`} fill="none" stroke={C.slate} strokeWidth="1.5" />
          <path d={`M95,${y} Q105,${y + 5} 102,${y + 8}`} fill="none" stroke={C.slate} strokeWidth="1.5" />
        </g>
      ))}
      {/* Arms */}
      <line x1="65" y1="52" x2="40" y2="90" stroke={C.slate} strokeWidth="2" />
      <line x1="95" y1="52" x2="120" y2="90" stroke={C.slate} strokeWidth="2" />
      {/* Pelvis */}
      <path d="M65,110 Q60,120 55,125 Q70,130 80,128 Q90,130 105,125 Q100,120 95,110" fill="none" stroke={C.slate} strokeWidth="1.5" />
      {/* Legs */}
      <line x1="68" y1="125" x2="60" y2="165" stroke={C.slate} strokeWidth="2" />
      <line x1="92" y1="125" x2="100" y2="165" stroke={C.slate} strokeWidth="2" />
      {/* Labels */}
      <text x="115" y="25" fontSize="6" fill={C.slate} fontWeight="700">← Skull</text>
      <text x="108" y="65" fontSize="6" fill={C.slate} fontWeight="700">← Ribs</text>
      <text x="95" y="100" fontSize="6" fill={C.slate} fontWeight="700">← Spine</text>
      <text x="108" y="160" fontSize="6" fill={C.slate} fontWeight="700">← Femur</text>
    </Vis>
  );
}

// ── INSECTS / MINIBEASTS ────────────────────────────────────────────────────
function InsectsVis() {
  const bugs = [
    { emoji: "🐛", name: "Caterpillar", legs: "Many" },
    { emoji: "🦋", name: "Butterfly", legs: "6" },
    { emoji: "🐜", name: "Ant", legs: "6" },
    { emoji: "🕷️", name: "Spider", legs: "8" },
    { emoji: "🐌", name: "Snail", legs: "0" },
  ];
  return (
    <Vis w={240} h={100}>
      {bugs.map((b, i) => {
        const x = 10 + i * 47;
        return (
          <g key={i}>
            <rect x={x} y={8} width="42" height="65" rx="8" fill={C.greenLight} stroke={C.green} strokeWidth="1" />
            <text x={x + 21} y={35} textAnchor="middle" fontSize="20"
              style={{ animation: `ks-bounce ${2 + i * 0.4}s ease-in-out infinite` }}>{b.emoji}</text>
            <text x={x + 21} y={52} textAnchor="middle" fontSize="6" fontWeight="800" fill={C.greenDark}>{b.name}</text>
            <text x={x + 21} y={62} textAnchor="middle" fontSize="6" fill={C.slate}>{b.legs} legs</text>
          </g>
        );
      })}
      <text x="120" y="90" textAnchor="middle" fontSize="8" fill={C.slate} fontWeight="700">Minibeasts — Insects have 6 legs!</text>
    </Vis>
  );
}

// ── BIRDS ───────────────────────────────────────────────────────────────────
function BirdsVis() {
  return (
    <Vis w={200} h={120}>
      <text x="100" y="40" textAnchor="middle" fontSize="40" style={{ animation: "ks-float 3s ease-in-out infinite" }}>🐦</text>
      {/* Feature labels */}
      {[
        { label: "Feathers", x: 30, y: 45 },
        { label: "Beak", x: 150, y: 30 },
        { label: "Wings", x: 25, y: 70 },
        { label: "Lays eggs", x: 155, y: 65 },
        { label: "Warm-blooded", x: 100, y: 85 },
      ].map((f, i) => (
        <g key={i}>
          <rect x={f.x - 22} y={f.y - 8} width="44" height="14" rx="4" fill={C.blueLight} stroke={C.blue} strokeWidth="0.5" />
          <text x={f.x} y={f.y + 2} textAnchor="middle" fontSize="6" fontWeight="700" fill={C.blueDark}>{f.label}</text>
        </g>
      ))}
      <text x="100" y="110" textAnchor="middle" fontSize="8" fill={C.slate} fontWeight="700">Features of Birds</text>
    </Vis>
  );
}

// ── FISH ────────────────────────────────────────────────────────────────────
function FishVis() {
  return (
    <Vis w={200} h={120}>
      {/* Water */}
      <rect x="0" y="0" width="200" height="120" rx="8" fill={C.blueLight} opacity="0.3" />
      <text x="100" y="45" textAnchor="middle" fontSize="40" style={{ animation: "ks-wave 2s ease-in-out infinite" }}>🐟</text>
      {[
        { label: "Scales", x: 40, y: 45 },
        { label: "Gills", x: 145, y: 30 },
        { label: "Fins", x: 40, y: 70 },
        { label: "Lives in water", x: 135, y: 65 },
        { label: "Cold-blooded", x: 100, y: 88 },
      ].map((f, i) => (
        <g key={i}>
          <rect x={f.x - 25} y={f.y - 8} width="50" height="14" rx="4" fill={C.white} stroke={C.blue} strokeWidth="0.5" />
          <text x={f.x} y={f.y + 2} textAnchor="middle" fontSize="6" fontWeight="700" fill={C.blueDark}>{f.label}</text>
        </g>
      ))}
      <text x="100" y="110" textAnchor="middle" fontSize="8" fill={C.slate} fontWeight="700">Features of Fish</text>
    </Vis>
  );
}

// ── MAMMALS ─────────────────────────────────────────────────────────────────
function MammalsVis() {
  return (
    <Vis w={220} h={110}>
      {["🐕", "🐈", "🐘", "🐬", "🦇"].map((e, i) => (
        <text key={i} x={25 + i * 40} y={35} textAnchor="middle" fontSize="22"
          style={{ animation: `ks-bounce ${2 + i * 0.3}s ease-in-out infinite` }}>{e}</text>
      ))}
      {[
        { label: "Warm-blooded", x: 55 },
        { label: "Hair or fur", x: 125 },
        { label: "Feed milk to young", x: 55, y: 75 },
        { label: "Breathe air (lungs)", x: 170, y: 75 },
      ].map((f, i) => (
        <g key={i}>
          <rect x={f.x - 35} y={(f.y || 55) - 8} width="70" height="14" rx="4" fill={C.amberLight} stroke={C.amber} strokeWidth="0.5" />
          <text x={f.x} y={(f.y || 55) + 2} textAnchor="middle" fontSize="6" fontWeight="700" fill={C.amberDark}>{f.label}</text>
        </g>
      ))}
      <text x="110" y="102" textAnchor="middle" fontSize="8" fill={C.slate} fontWeight="700">Mammals — All different, all share these features!</text>
    </Vis>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY KS1/KS2 VISUALS
// ═══════════════════════════════════════════════════════════════════════════════

// ── ANCIENT CIVILISATIONS (generic context for history questions) ────────────
function AncientCivilisationVis({ topic }) {
  const civs = {
    egypt:  { emoji: "🏛️", title: "Ancient Egypt", items: ["Pharaohs", "Pyramids", "Nile River", "Hieroglyphics"], color: C.amber },
    rome:   { emoji: "⚔️", title: "Ancient Rome", items: ["Emperors", "Colosseum", "Roads", "Latin"], color: C.red },
    greece: { emoji: "🏛️", title: "Ancient Greece", items: ["Democracy", "Olympics", "Myths", "Athens"], color: C.blue },
    viking: { emoji: "⛵", title: "Vikings", items: ["Longships", "Raids", "Runes", "Settlements"], color: C.slate },
  };
  const t = (topic || "").toLowerCase();
  const civ = Object.entries(civs).find(([k]) => t.includes(k))?.[1] || civs.egypt;

  return (
    <Vis w={200} h={130}>
      <rect x="5" y="5" width="190" height="120" rx="10" fill={C.slateLight} stroke={civ.color} strokeWidth="1.5" />
      <text x="100" y="35" textAnchor="middle" fontSize="28">{civ.emoji}</text>
      <text x="100" y="55" textAnchor="middle" fontSize="10" fontWeight="800" fill={civ.color}>{civ.title}</text>
      {civ.items.map((item, i) => (
        <text key={i} x={i < 2 ? 55 : 145} y={72 + (i % 2) * 14} textAnchor="middle" fontSize="7" fontWeight="600" fill={C.slate}>• {item}</text>
      ))}
      <text x="100" y="115" textAnchor="middle" fontSize="7" fill={C.slate} fontWeight="600" fontStyle="italic">Key concepts to remember</text>
    </Vis>
  );
}

// ── CAUSE & CONSEQUENCE ─────────────────────────────────────────────────────
function CauseConsequenceVis() {
  return (
    <Vis w={220} h={100}>
      <rect x="10" y="20" width="70" height="50" rx="8" fill={C.amberLight} stroke={C.amber} strokeWidth="1.5" />
      <text x="45" y="42" textAnchor="middle" fontSize="8" fontWeight="800" fill={C.amberDark}>CAUSE</text>
      <text x="45" y="56" textAnchor="middle" fontSize="7" fill={C.slate}>Why did it</text>
      <text x="45" y="65" textAnchor="middle" fontSize="7" fill={C.slate}>happen?</text>

      <path d="M85,45 L125,45" stroke={C.green} strokeWidth="2" markerEnd="url(#arrowCC)" />
      <text x="105" y="40" textAnchor="middle" fontSize="7" fill={C.green} fontWeight="700">leads to</text>
      <defs>
        <marker id="arrowCC" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={C.green} />
        </marker>
      </defs>

      <rect x="130" y="20" width="80" height="50" rx="8" fill={C.blueLight} stroke={C.blue} strokeWidth="1.5" />
      <text x="170" y="42" textAnchor="middle" fontSize="8" fontWeight="800" fill={C.blueDark}>CONSEQUENCE</text>
      <text x="170" y="56" textAnchor="middle" fontSize="7" fill={C.slate}>What happened</text>
      <text x="170" y="65" textAnchor="middle" fontSize="7" fill={C.slate}>because of it?</text>

      <text x="110" y="90" textAnchor="middle" fontSize="8" fill={C.slate} fontWeight="700">Thinking like a historian</text>
    </Vis>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GEOGRAPHY KS1/KS2 VISUALS
// ═══════════════════════════════════════════════════════════════════════════════

// ── CONTINENTS ──────────────────────────────────────────────────────────────
function ContinentsVis() {
  const continents = [
    { name: "Africa", emoji: "🌍", x: 100, y: 55, color: C.amber },
    { name: "Europe", emoji: "🏰", x: 100, y: 20, color: C.blue },
    { name: "Asia", emoji: "🗾", x: 155, y: 30, color: C.red },
    { name: "N. America", emoji: "🗽", x: 35, y: 25, color: C.green },
    { name: "S. America", emoji: "🌴", x: 50, y: 65, color: C.greenDark },
    { name: "Oceania", emoji: "🦘", x: 175, y: 65, color: C.purple },
    { name: "Antarctica", emoji: "🧊", x: 110, y: 95, color: C.sky },
  ];
  return (
    <Vis w={220} h={115}>
      <rect x="0" y="0" width="220" height="115" rx="6" fill={C.blueLight} opacity="0.3" />
      {continents.map((c, i) => (
        <g key={i}>
          <text x={c.x} y={c.y} textAnchor="middle" fontSize="14">{c.emoji}</text>
          <text x={c.x} y={c.y + 12} textAnchor="middle" fontSize="6" fontWeight="700" fill={c.color}>{c.name}</text>
        </g>
      ))}
    </Vis>
  );
}

// ── TRADE / COMMERCE (basic) ────────────────────────────────────────────────
function TradeBasicVis() {
  return (
    <Vis w={220} h={110}>
      {/* Buyer */}
      <rect x="10" y="15" width="60" height="60" rx="8" fill={C.greenLight} stroke={C.green} strokeWidth="1.5" />
      <text x="40" y="40" textAnchor="middle" fontSize="18">🛒</text>
      <text x="40" y="58" textAnchor="middle" fontSize="7" fontWeight="800" fill={C.greenDark}>Buyer</text>
      <text x="40" y="68" textAnchor="middle" fontSize="6" fill={C.slate}>Pays money</text>

      {/* Arrows */}
      <text x="110" y="35" textAnchor="middle" fontSize="7" fill={C.green} fontWeight="700">💰 Money →</text>
      <text x="110" y="55" textAnchor="middle" fontSize="7" fill={C.blue} fontWeight="700">← Goods 📦</text>

      {/* Seller */}
      <rect x="150" y="15" width="60" height="60" rx="8" fill={C.blueLight} stroke={C.blue} strokeWidth="1.5" />
      <text x="180" y="40" textAnchor="middle" fontSize="18">🏪</text>
      <text x="180" y="58" textAnchor="middle" fontSize="7" fontWeight="800" fill={C.blueDark}>Seller</text>
      <text x="180" y="68" textAnchor="middle" fontSize="6" fill={C.slate}>Provides goods</text>

      <text x="110" y="95" textAnchor="middle" fontSize="8" fill={C.slate} fontWeight="700">Trade = Exchange of goods & services for money</text>
    </Vis>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT MAP
// ═══════════════════════════════════════════════════════════════════════════════

export const CONCEPT_VISUALS = {
  // Science KS1/KS2
  habitat:        HabitatVis,
  lifecycle:      LifeCycleVis,
  food_chain:     FoodChainBasicVis,
  seasons:        SeasonsVis,
  weather:        WeatherVis,
  materials:      MaterialsVis,
  magnet_basic:   MagnetBasicVis,
  light_basic:    LightBasicVis,
  sound_basic:    SoundBasicVis,
  teeth:          TeethVis,
  skeleton_basic: SkeletonBasicVis,
  insects:        InsectsVis,
  birds:          BirdsVis,
  fish:           FishVis,
  mammals:        MammalsVis,
  // History
  ancient_civ:    AncientCivilisationVis,
  cause_consequence: CauseConsequenceVis,
  // Geography
  continents:     ContinentsVis,
  // Commerce
  trade_basic:    TradeBasicVis,
};

export default CONCEPT_VISUALS;
