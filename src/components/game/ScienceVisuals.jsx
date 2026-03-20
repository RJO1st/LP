"use client";
// ─── Deploy to: src/components/game/ScienceVisuals.jsx ───────────────────────
// Extracted from MathsVisualiser — science-specific visual components.
// Import in MathsVisualiser: import { AtomVis, ForcesVis, ... } from "./ScienceVisuals";
import React from "react";

// ─── Shared design tokens ────────────────────────────────────────────────────
// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  // LaunchPard brand colours — used as accents on light background
  indigo:     "#4f46e5",
  indigoBg:   "#eef2ff",
  indigoBd:   "#c7d2fe",
  nebula:     "#9333ea",
  nebulaBg:   "#f5f3ff",
  nebulaBd:   "#ddd6fe",
  amber:      "#d97706",
  amberBg:    "#fffbeb",
  amberBd:    "#fde68a",
  emerald:    "#059669",
  emeraldBg:  "#ecfdf5",
  emeraldBd:  "#a7f3d0",
  rose:       "#e11d48",
  roseBg:     "#fff1f2",
  roseBd:     "#fecdd3",
  slate:      "#475569",
  slateBg:    "#f8fafc",
  slateBd:    "#e2e8f0",
  text:       "#1e293b",
  textMid:    "#64748b",
};

// ─── Shared primitives ───────────────────────────────────────────────────────
function Panel({ children, accent = T.indigo, bg, bd, ariaLabel }) {
  const panelBg = bg || "#ffffff";
  const panelBd = bd || `${accent}44`;
  return (
    <div
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      style={{
        background: panelBg,
        borderRadius: 16,
        border: `2px solid ${panelBd}`,
        boxShadow: `0 2px 12px ${accent}18`,
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}>
      {children}
    </div>
  );
}

// ─── ORBIT DOT — filled orb with strong border ────────────────────────────────
function Dot({ color, bg, border, size = 20, strikethrough = false }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: bg || color,
        border: `2.5px solid ${border || color}`,
        boxSizing: "border-box",
      }} />
      {strikethrough && (
        <svg
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          width={size} height={size}
        >
          <line
            x1={size * 0.15} y1={size * 0.85}
            x2={size * 0.85} y2={size * 0.15}
            stroke={T.rose} strokeWidth={2.5} strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}

// ─── DOT CLUSTER ─────────────────────────────────────────────────────────────
function DotCluster({ count, color, bg, border, size = 20, label }) {
  const safe = Math.min(count, 15);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      {label != null && (
        <span style={{
          fontSize: 13, fontWeight: 800, color,
          letterSpacing: 0.5,
        }}>{label}</span>
      )}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 4,
        maxWidth: safe > 5 ? 130 : 80,
        justifyContent: "center",
      }}>
        {Array.from({ length: safe }).map((_, i) => (
          <Dot key={i} color={color} bg={bg} border={border} size={size} />
        ))}
      </div>
    </div>
  );
}

// ─── LABEL CHIP ──────────────────────────────────────────────────────────────
function Chip({ children, color, bg }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      color, background: bg,
      borderRadius: 6, padding: "2px 7px",
      letterSpacing: 0.5,
    }}>
      {children}
    </span>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// SCIENCE VISUALS
// ═══════════════════════════════════════════════════════════════════════════════

export function ForcesVis({ force1, force2, label1 = "Push", label2 = "Friction" }) {
  const FIXED = 64; // all arrows same length — direction only
  const W = 240, H = 90;
  const cx = W / 2; // centre x = object midpoint

  return (
    <Panel accent={T.indigo} bg={T.slateBg} bd={T.slateBd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* ── force1 label above right arrow ── */}
        <text x={cx + 8 + FIXED / 2} y={20} textAnchor="middle"
          fontSize={9} fontWeight="700" fill={T.indigo}>
          {label1}
        </text>
        <text x={cx + 8 + FIXED / 2} y={31} textAnchor="middle"
          fontSize={9} fontWeight="600" fill={T.indigo}>
          {force1}N →
        </text>
        {/* ── force2 label above left arrow ── */}
        <text x={cx - 8 - FIXED / 2} y={20} textAnchor="middle"
          fontSize={9} fontWeight="700" fill={T.rose}>
          {label2}
        </text>
        <text x={cx - 8 - FIXED / 2} y={31} textAnchor="middle"
          fontSize={9} fontWeight="600" fill={T.rose}>
          ← {force2}N
        </text>
        {/* ── object block ── */}
        <rect x={cx - 26} y={42} width={52} height={28} rx={6}
          fill="white" stroke={T.slateBd} strokeWidth={2}/>
        <text x={cx} y={60} textAnchor="middle"
          fontSize={9} fontWeight="700" fill={T.slate}>OBJECT</text>
        {/* ── right arrow (solid) ── */}
        <line x1={cx + 26} y1={56} x2={cx + 26 + FIXED} y2={56}
          stroke={T.indigo} strokeWidth={3} strokeLinecap="round"/>
        <polygon
          points={`${cx+26+FIXED},56 ${cx+26+FIXED-8},51 ${cx+26+FIXED-8},61`}
          fill={T.indigo}/>
        {/* ── left arrow (dashed — pattern diff for colour blindness) ── */}
        <line x1={cx - 26} y1={56} x2={cx - 26 - FIXED} y2={56}
          stroke={T.rose} strokeWidth={3} strokeDasharray="5,3" strokeLinecap="round"/>
        <polygon
          points={`${cx-26-FIXED},56 ${cx-26-FIXED+8},51 ${cx-26-FIXED+8},61`}
          fill={T.rose}/>
      </svg>
    </Panel>
  );
}

// VELOCITY ────────────────────────────────────────────────────────────────────
// Confirmed working layout (browser-tested):
//   Row structure (per 48px slot):
//     y+0–13:  label ("initial (u)")
//     y+16–30: badge rect with speed value — ABOVE the shaft, never overlapping
//     y+36:    arrow shaft + arrowhead
//   Divider line between rows.
//   SVG uses viewBox + width:100% — scales to panel, no fixed-px overflow.
//   ARROW_MAX = VB_W - X0 - 18 → arrowhead tip always inside viewBox.
export function VelocityVis({ v1, v2, label1 = "initial", label2 = "final", unit = "m/s" }) {
  const VB_W      = 200;
  const X0        = 4;
  const ARROW_MAX = VB_W - X0 - 18; // 178px — head tip always inside
  const BW        = 40;             // badge width
  const maxV      = Math.max(v1, v2 ?? 0, 1);
  const toPx      = (v) => Math.max(24, Math.round((v / maxV) * ARROW_MAX));
  const px1       = toPx(v1);
  const px2       = v2 != null ? toPx(v2) : null;
  const VB_H      = px2 != null ? 92 : 44;

  // Badge x: nudged right of label, clamped so it never leaves viewBox
  const bx1 = Math.min(X0 + 12, VB_W - BW);
  const bx2 = px2 != null ? Math.min(X0 + px2 / 2 - BW / 2, VB_W - BW) : 0;

  return (
    <Panel accent={T.indigo} bg={T.indigoBg} bd={T.indigoBd}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: "100%", display: "block" }}>
        {/* ── row 1 ── */}
        <text x={X0} y={13} fontSize={9} fontWeight="700" fill={T.indigo}>{label1}</text>
        <rect x={bx1} y={16} width={BW} height={14} rx={3}
          fill={T.indigoBg} stroke={T.indigoBd} strokeWidth={1.5}/>
        <text x={bx1 + BW / 2} y={27} textAnchor="middle"
          fontSize={8} fontWeight="700" fill={T.indigo}>{v1} {unit}</text>
        <line x1={X0} y1={36} x2={X0 + px1 - 10} y2={36}
          stroke={T.indigo} strokeWidth={3} strokeLinecap="round"/>
        <polygon
          points={`${X0+px1},36 ${X0+px1-10},31 ${X0+px1-10},41`}
          fill={T.indigo}/>

        {/* ── divider + row 2 ── */}
        {px2 != null && (
          <>
            <line x1={0} y1={48} x2={VB_W} y2={48} stroke={T.slateBd} strokeWidth={1}/>
            <text x={X0} y={61} fontSize={9} fontWeight="700" fill={T.nebula}>{label2}</text>
            <rect x={bx2} y={64} width={BW} height={14} rx={3}
              fill={T.nebulaBg} stroke={T.nebulaBd} strokeWidth={1.5}/>
            <text x={bx2 + BW / 2} y={75} textAnchor="middle"
              fontSize={8} fontWeight="700" fill={T.nebula}>{v2} {unit}</text>
            <line x1={X0} y1={84} x2={X0 + px2 - 10} y2={84}
              stroke={T.nebula} strokeWidth={3} strokeLinecap="round"/>
            <polygon
              points={`${X0+px2},84 ${X0+px2-10},79 ${X0+px2-10},89`}
              fill={T.nebula}/>
          </>
        )}
      </svg>
      {px2 != null && (
        <Chip
          color={v2 > v1 ? T.emerald : v2 < v1 ? T.rose : T.slate}
          bg={v2 > v1 ? T.emeraldBg : v2 < v1 ? T.roseBg : T.slateBg}
        >
          {v2 > v1 ? "speeding up ↑" : v2 < v1 ? "slowing down ↓" : "constant speed"}
        </Chip>
      )}
    </Panel>
  );
}

// FOOD CHAIN ─────────────────────────────────────────────────────────────────
export function FoodChainVis({ chain }) {
  return (
    <Panel accent={T.emerald} bg={T.emeraldBg} bd={T.emeraldBd}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        {chain.map((org, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              background: "white", borderRadius: 10, padding: "8px 10px",
              border: `1.5px solid ${T.emeraldBd}`, minWidth: 60,
            }}>
              <span style={{ fontSize: 26 }}>{org.emoji}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: T.emerald,
                textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center" }}>
                {org.name}
              </span>
              {org.role && <span style={{ fontSize: 8, color: T.textMid }}>{org.role}</span>}
            </div>
            {i < chain.length - 1 && (
              <svg width={22} height={14}>
                <defs>
                  <marker id={`fc${i}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill={T.amber}/>
                  </marker>
                </defs>
                <line x1={0} y1={7} x2={16} y2={7} stroke={T.amber} strokeWidth={2.5} markerEnd={`url(#fc${i})`}/>
              </svg>
            )}
          </div>
        ))}
      </div>
      <Chip color={T.amber} bg={T.amberBg}>energy flows →</Chip>
    </Panel>
  );
}

export function AtomVis({ protons, neutrons, electrons, element }) {
  const shells = [2, 8, 8, 18];
  let rem = electrons;
  const shellCounts = shells.map(cap => { const n = Math.min(rem, cap); rem -= n; return n; });
  const usedShells = shellCounts.filter(n => n > 0);
  const maxR = 56 + usedShells.length * 20;
  const cx = maxR + 4, cy = maxR + 4, W = (maxR + 4) * 2;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <svg width={W} height={W} viewBox={`0 0 ${W} ${W}`}>
        {/* Nucleus */}
        <circle cx={cx} cy={cy} r={18} fill={T.indigoBg} stroke={T.indigo} strokeWidth={2} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={8} fontWeight="700" fill={T.indigo}>{protons}p</text>
        <text x={cx} y={cy + 6} textAnchor="middle" fontSize={8} fontWeight="700" fill={T.nebula}>{neutrons}n</text>
        {/* Electron shells */}
        {usedShells.map((count, si) => {
          const r = 30 + (si + 1) * 22;
          return (
            <g key={si}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={T.slate} strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
              {Array.from({ length: count }, (_, ei) => {
                const angle = (ei / count) * 2 * Math.PI - Math.PI / 2;
                const ex = cx + r * Math.cos(angle);
                const ey = cy + r * Math.sin(angle);
                return <circle key={ei} cx={ex} cy={ey} r={4} fill={T.emerald} stroke="white" strokeWidth={1} />;
              })}
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize:11, color:T.slate, fontWeight:600 }}>
        {element && <span style={{ color:T.indigo, fontWeight:800 }}>{element} · </span>}
        {protons}p · {neutrons}n · {electrons}e⁻
      </div>
    </div>
  );
}

// ── Periodic Table Section ────────────────────────────────────────────────────
export function PeriodicTableVis({ symbol, name, atomicNumber, atomicMass, group, period, category }) {
  const CAT_COLORS = {
    "alkali metal":       { bg:"#fef3c7", border:"#f59e0b", text:"#92400e" },
    "alkaline earth":     { bg:"#fce7f3", border:"#ec4899", text:"#9d174d" },
    "transition metal":   { bg:"#dbeafe", border:"#3b82f6", text:"#1e40af" },
    "non-metal":          { bg:"#dcfce7", border:"#22c55e", text:"#14532d" },
    "noble gas":          { bg:"#f3e8ff", border:"#a855f7", text:"#581c87" },
    "halogen":            { bg:"#ffedd5", border:"#f97316", text:"#7c2d12" },
    "metalloid":          { bg:"#ecfccb", border:"#84cc16", text:"#365314" },
    "metal":              { bg:"#f1f5f9", border:"#64748b", text:"#1e293b" },
  };
  const c = CAT_COLORS[category?.toLowerCase()] || CAT_COLORS["metal"];
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <div style={{
        width:100, border:`3px solid ${c.border}`, borderRadius:8,
        background:c.bg, padding:"10px 12px", textAlign:"center",
        boxShadow:"0 2px 8px rgba(0,0,0,0.12)",
      }}>
        <div style={{ fontSize:10, color:c.text, fontWeight:600 }}>{atomicNumber}</div>
        <div style={{ fontSize:32, fontWeight:900, color:c.text, lineHeight:1.1 }}>{symbol}</div>
        <div style={{ fontSize:9, color:c.text, fontWeight:600, marginTop:2 }}>{name}</div>
        <div style={{ fontSize:9, color:c.text, opacity:0.8 }}>{atomicMass}</div>
      </div>
      <div style={{ display:"flex", gap:12, fontSize:11, color:T.slate }}>
        {group && <span>Group {group}</span>}
        {period && <span>Period {period}</span>}
        {category && <span style={{ color:c.border, fontWeight:700 }}>{category}</span>}
      </div>
    </div>
  );
}

// ── State Changes (Solid/Liquid/Gas) ─────────────────────────────────────────
export function StateChangesVis({ highlighted }) {
  const states = ["Solid","Liquid","Gas"];
  const transitions = [
    { from:0, to:1, label:"Melting",     dir:"→", energy:"+ heat" },
    { from:1, to:0, label:"Freezing",    dir:"←", energy:"- heat" },
    { from:1, to:2, label:"Evaporation", dir:"→", energy:"+ heat" },
    { from:2, to:1, label:"Condensation",dir:"←", energy:"- heat" },
    { from:0, to:2, label:"Sublimation", dir:"↑", energy:"+ heat", skip:true },
  ];
  const hiSet = new Set((highlighted||[]).map(s=>s.toLowerCase()));
  const STATE_ICONS = ["🧊","💧","💨"];
  const STATE_COLORS = [
    { bg:"#dbeafe", border:"#3b82f6" },
    { bg:"#bfdbfe", border:"#60a5fa" },
    { bg:"#e0f2fe", border:"#38bdf8" },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
        {states.map((s, i) => {
          const isHi = hiSet.has(s.toLowerCase());
          const c = STATE_COLORS[i];
          return (
            <React.Fragment key={s}>
              <div style={{
                padding:"8px 10px", background: isHi ? c.border : c.bg,
                border:`2px solid ${c.border}`, borderRadius:8,
                textAlign:"center", minWidth:52,
              }}>
                <div style={{ fontSize:18 }}>{STATE_ICONS[i]}</div>
                <div style={{ fontSize:11, fontWeight:700, color: isHi ? "white" : c.border }}>{s}</div>
              </div>
              {i < 2 && <span style={{ fontSize:18, color:T.slate }}>⇌</span>}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, width:"100%" }}>
        {transitions.filter(t => !t.skip).map((tr, i) => (
          <div key={i} style={{
            padding:"3px 8px", background:T.indigoBg, borderRadius:6,
            fontSize:10, color:T.slate, textAlign:"center",
          }}>
            <span style={{ fontWeight:700, color:T.indigo }}>{tr.label}</span>
            {" "}({tr.energy})
          </div>
        ))}
      </div>
    </div>
  );
}

// ── pH Scale ──────────────────────────────────────────────────────────────────
export function PHScaleVis({ value, substance }) {
  const gradient = "linear-gradient(to right, #dc2626,#ea580c,#d97706,#ca8a04,#65a30d,#16a34a,#0d9488,#0891b2,#2563eb,#7c3aed,#6d28d9,#4c1d95,#1e1b4b,#0f172a)";
  const pct = (value / 14) * 100;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6, width:"100%" }}>
      <div style={{ position:"relative", height:24, borderRadius:12, background:gradient, border:"2px solid #e2e8f0" }}>
        {value !== undefined && (
          <div style={{
            position:"absolute", left:`${pct}%`, top:-6,
            transform:"translateX(-50%)",
            width:12, height:36, display:"flex", flexDirection:"column", alignItems:"center",
          }}>
            <div style={{ width:2, height:10, background:"#1e293b" }} />
            <div style={{
              background:"#1e293b", color:"white", borderRadius:4,
              padding:"2px 6px", fontSize:10, fontWeight:800, whiteSpace:"nowrap",
            }}>{value}</div>
          </div>
        )}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:T.slate, fontWeight:600 }}>
        <span style={{ color:"#dc2626" }}>0 — Strong Acid</span>
        <span style={{ color:"#16a34a" }}>7 — Neutral</span>
        <span style={{ color:"#4c1d95" }}>14 — Strong Alkali</span>
      </div>
      {substance && (
        <div style={{ textAlign:"center", fontSize:11, color:T.slate }}>
          <span style={{ fontWeight:700, color:T.indigo }}>{substance}</span> — pH {value}
        </div>
      )}
    </div>
  );
}

// ── Molecule Structure (ball-and-stick) ───────────────────────────────────────
export function MoleculeVis({ formula, bonds }) {
  // bonds = [{ from:{x,y,label,color}, to:{x,y,label,color}, type:"single"|"double" }]
  const PRESET_MOLECULES = {
    H2O: {
      atoms:[{x:50,y:30,label:"O",color:"#ef4444",r:14},{x:18,y:62,label:"H",color:"#94a3b8",r:10},{x:82,y:62,label:"H",color:"#94a3b8",r:10}],
      bonds:[{from:0,to:1,type:"single"},{from:0,to:2,type:"single"}],
    },
    CO2: {
      atoms:[{x:50,y:45,label:"C",color:"#374151",r:12},{x:14,y:45,label:"O",color:"#ef4444",r:14},{x:86,y:45,label:"O",color:"#ef4444",r:14}],
      bonds:[{from:0,to:1,type:"double"},{from:0,to:2,type:"double"}],
    },
    CH4: {
      atoms:[{x:50,y:50,label:"C",color:"#374151",r:12},{x:50,y:14,label:"H",color:"#94a3b8",r:9},{x:80,y:68,label:"H",color:"#94a3b8",r:9},{x:20,y:68,label:"H",color:"#94a3b8",r:9},{x:50,y:86,label:"H",color:"#94a3b8",r:9}],
      bonds:[{from:0,to:1,type:"single"},{from:0,to:2,type:"single"},{from:0,to:3,type:"single"},{from:0,to:4,type:"single"}],
    },
    O2: {
      atoms:[{x:30,y:45,label:"O",color:"#ef4444",r:14},{x:70,y:45,label:"O",color:"#ef4444",r:14}],
      bonds:[{from:0,to:1,type:"double"}],
    },
    N2: {
      atoms:[{x:30,y:45,label:"N",color:"#3b82f6",r:13},{x:70,y:45,label:"N",color:"#3b82f6",r:13}],
      bonds:[{from:0,to:1,type:"triple"}],
    },
    HCl: {
      atoms:[{x:28,y:45,label:"H",color:"#94a3b8",r:9},{x:72,y:45,label:"Cl",color:"#84cc16",r:14}],
      bonds:[{from:0,to:1,type:"single"}],
    },
    NaCl: {
      atoms:[{x:28,y:45,label:"Na⁺",color:"#f59e0b",r:14},{x:72,y:45,label:"Cl⁻",color:"#84cc16",r:14}],
      bonds:[{from:0,to:1,type:"ionic"}],
    },
  };
  const mol = PRESET_MOLECULES[formula] || null;
  if (!mol) return <div style={{ fontSize:12, color:T.slate, padding:8 }}>{formula}</div>;
  const BOND_COLORS = { single:"#475569", double:"#2563eb", triple:"#7c3aed", ionic:"#f59e0b" };
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        {mol.bonds.map((b, i) => {
          const a1 = mol.atoms[b.from], a2 = mol.atoms[b.to];
          const dx = a2.x - a1.x, dy = a2.y - a1.y;
          const len = Math.sqrt(dx*dx + dy*dy);
          const nx = -dy/len * 3, ny = dx/len * 3;
          const count = b.type === "triple" ? 3 : b.type === "double" ? 2 : 1;
          const offsets = count === 1 ? [0] : count === 2 ? [-1,1] : [-2,0,2];
          return offsets.map((o, oi) => (
            <line key={`${i}-${oi}`}
              x1={a1.x + nx*o} y1={a1.y + ny*o} x2={a2.x + nx*o} y2={a2.y + ny*o}
              stroke={BOND_COLORS[b.type] || "#475569"}
              strokeWidth={b.type === "ionic" ? 1.5 : 2}
              strokeDasharray={b.type === "ionic" ? "4,2" : undefined}
            />
          ));
        })}
        {mol.atoms.map((a, i) => (
          <g key={i}>
            <circle cx={a.x} cy={a.y} r={a.r} fill={a.color} stroke="white" strokeWidth={1.5} />
            <text x={a.x} y={a.y} textAnchor="middle" dominantBaseline="central"
              fontSize={a.r > 12 ? 9 : 8} fontWeight="800" fill="white">{a.label}</text>
          </g>
        ))}
      </svg>
      <div style={{ fontSize:12, fontWeight:800, color:T.indigo, fontFamily:"monospace" }}>{formula}</div>
    </div>
  );
}

// ── Cell Diagram ──────────────────────────────────────────────────────────────
export function CellVis({ cellType }) {
  const isPlant = cellType === "plant";
  const parts = isPlant
    ? [
        { label:"Cell wall", desc:"Rigid outer layer" },
        { label:"Cell membrane", desc:"Controls what enters/leaves" },
        { label:"Nucleus", desc:"Controls cell activities" },
        { label:"Cytoplasm", desc:"Jelly-like fluid" },
        { label:"Chloroplast", desc:"Site of photosynthesis" },
        { label:"Vacuole", desc:"Stores water/sap" },
        { label:"Mitochondria", desc:"Releases energy" },
      ]
    : [
        { label:"Cell membrane", desc:"Controls what enters/leaves" },
        { label:"Nucleus", desc:"Controls cell activities" },
        { label:"Cytoplasm", desc:"Jelly-like fluid" },
        { label:"Mitochondria", desc:"Releases energy" },
        { label:"Ribosome", desc:"Makes proteins" },
      ];
  const colors = [T.emerald, T.indigo, T.nebula, "#f59e0b", "#22c55e", "#0891b2", "#ec4899"];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{
        padding:"6px 12px", background: isPlant ? "#dcfce7" : "#dbeafe",
        border:`2px solid ${isPlant ? T.emerald : T.indigo}`, borderRadius:8,
        fontSize:12, fontWeight:700, color: isPlant ? "#14532d" : "#1e40af",
        textAlign:"center",
      }}>{isPlant ? "🌿 Plant Cell" : "🔬 Animal Cell"}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
        {parts.map((p, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:colors[i % colors.length], flexShrink:0 }} />
            <div style={{ fontSize:11 }}>
              <span style={{ fontWeight:700, color:colors[i % colors.length] }}>{p.label}</span>
              <span style={{ color:T.slate }}> — {p.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Punnett Square ────────────────────────────────────────────────────────────
export function PunnettVis({ parent1, parent2, trait }) {
  // parent1 = "Aa", parent2 = "Aa"
  const a1 = parent1.split(""), a2 = parent2.split("");
  const combos = [
    a1[0]+a2[0], a1[0]+a2[1],
    a1[1]+a2[0], a1[1]+a2[1],
  ];
  const isDom = (g) => g[0] === g[0].toUpperCase() && g[0] !== g[1];
  const isHom = (g) => g[0] === g[1];
  const getLabel = (g) => isHom(g) ? (isDom(g) ? "Dom. Homozygous" : "Rec. Homozygous") : "Heterozygous";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      {trait && <div style={{ fontSize:11, color:T.slate, fontWeight:600 }}>{trait}</div>}
      <div style={{ display:"grid", gridTemplateColumns:"28px 1fr 1fr", gridTemplateRows:"28px 1fr 1fr", gap:3 }}>
        <div />
        {a2.map((g,i) => (
          <div key={i} style={{ textAlign:"center", fontSize:14, fontWeight:800, color:T.nebula }}>{g}</div>
        ))}
        {a1.map((g1, ri) => (
          <React.Fragment key={ri}>
            <div style={{ fontSize:14, fontWeight:800, color:T.indigo, alignSelf:"center", textAlign:"center" }}>{g1}</div>
            {a2.map((g2, ci) => {
              const combo = ri === 0 ? combos[ci] : combos[ci + 2];
              const dom = combo.includes(combo[0].toUpperCase()) && combo[0] !== combo[1];
              return (
                <div key={ci} style={{
                  width:52, height:40, borderRadius:6,
                  background: dom ? T.indigoBg : T.nebulaBg,
                  border:`2px solid ${dom ? T.indigo : T.nebula}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:14, fontWeight:800, color: dom ? T.indigo : T.nebula,
                }}>{combo}</div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{ fontSize:10, color:T.slate }}>
        {combos.filter(g => g.includes(g[0].toUpperCase()) && g[0] !== g[1]).length}/4 heterozygous
      </div>
    </div>
  );
}

// ── Energy Stores Transfer ─────────────────────────────────────────────────────
export function EnergyStoresVis({ stores, transfers }) {
  const STORE_ICONS = {
    kinetic:"⚡", thermal:"🔥", chemical:"⚗️", gravitational:"⬆️",
    elastic:"🌀", nuclear:"☢️", electromagnetic:"💡", sound:"🔊",
  };
  const COLORS = [T.indigo, T.nebula, T.emerald, "#f59e0b", "#ef4444", "#06b6d4"];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"center" }}>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
        {stores.map((s, i) => (
          <div key={i} style={{
            padding:"6px 10px", background:COLORS[i % COLORS.length] + "22",
            border:`2px solid ${COLORS[i % COLORS.length]}`, borderRadius:8,
            textAlign:"center", minWidth:70,
          }}>
            <div style={{ fontSize:20 }}>{STORE_ICONS[s.type] || "⚡"}</div>
            <div style={{ fontSize:10, fontWeight:700, color:COLORS[i % COLORS.length] }}>{s.label || s.type}</div>
            {s.value && <div style={{ fontSize:10, color:T.slate }}>{s.value} J</div>}
          </div>
        ))}
      </div>
      {transfers && transfers.map((tr, i) => (
        <div key={i} style={{
          display:"flex", alignItems:"center", gap:4, fontSize:11, color:T.slate,
        }}>
          <span style={{ fontWeight:700, color:T.indigo }}>{tr.from}</span>
          <span>→</span>
          <span style={{ fontStyle:"italic" }}>{tr.method}</span>
          <span>→</span>
          <span style={{ fontWeight:700, color:T.nebula }}>{tr.to}</span>
        </div>
      ))}
    </div>
  );
}

// ── Wave Diagram ──────────────────────────────────────────────────────────────
export function WaveVis({ type, wavelength, amplitude, label }) {
  const W = 200, H = 80, mid = H / 2;
  const isLongitudinal = type === "longitudinal";
  const wavePath = () => {
    const cycles = 2;
    const pts = [];
    for (let i = 0; i <= W; i += 2) {
      const y = mid - (amplitude || 24) * Math.sin((i / W) * cycles * 2 * Math.PI);
      pts.push(`${i},${y}`);
    }
    return "M " + pts.join(" L ");
  };
  if (isLongitudinal) {
    const bars = Array.from({ length: 20 }, (_, i) => {
      const x = (i / 20) * W;
      const compression = Math.sin((i / 20) * 4 * Math.PI);
      const opacity = (compression + 1) / 2;
      return { x, opacity };
    });
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
        <svg width={W} height={40} viewBox={`0 0 ${W} 40`}>
          {bars.map((b, i) => (
            <rect key={i} x={b.x} y={8} width={W/20 - 1} height={24}
              fill={T.indigo} opacity={b.opacity * 0.8 + 0.1} rx={1} />
          ))}
          <text x={W/2} y={36} textAnchor="middle" fontSize={9} fill={T.slate}>Compressions and rarefactions</text>
        </svg>
        <div style={{ fontSize:11, fontWeight:700, color:T.indigo }}>{label || "Longitudinal wave (e.g. sound)"}</div>
      </div>
    );
  }
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1={0} y1={mid} x2={W} y2={mid} stroke={T.slate} strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
        <path d={wavePath()} fill="none" stroke={T.indigo} strokeWidth={2.5} />
        {/* Wavelength arrow */}
        <line x1={10} y1={16} x2={10 + W/2} y2={16} stroke={T.nebula} strokeWidth={1.5} markerEnd="url(#wEnd)" />
        <text x={10 + W/4} y={13} textAnchor="middle" fontSize={8} fill={T.nebula} fontWeight="700">λ (wavelength)</text>
        {/* Amplitude arrow */}
        <line x1={W-12} y1={mid} x2={W-12} y2={mid - (amplitude||24)} stroke={T.emerald} strokeWidth={1.5} />
        <text x={W-22} y={mid - 10} fontSize={8} fill={T.emerald} fontWeight="700">A</text>
      </svg>
      <div style={{ fontSize:11, fontWeight:700, color:T.indigo }}>{label || "Transverse wave (e.g. light)"}</div>
    </div>
  );
}

// ── Electromagnetic Spectrum ──────────────────────────────────────────────────
export function EMSpectrumVis({ highlighted }) {
  const bands = [
    { name:"Radio",     color:"#7c3aed", freq:"<10⁹ Hz",   use:"Broadcasting" },
    { name:"Microwave", color:"#2563eb", freq:"10⁹–10¹² Hz", use:"Cooking, comms" },
    { name:"Infrared",  color:"#ea580c", freq:"10¹²–10¹⁴", use:"Thermal imaging" },
    { name:"Visible",   color:"#16a34a", freq:"10¹⁴–10¹⁵", use:"Sight, cameras" },
    { name:"UV",        color:"#ca8a04", freq:"10¹⁵–10¹⁶", use:"Sterilisation" },
    { name:"X-ray",     color:"#dc2626", freq:"10¹⁶–10¹⁹", use:"Medical imaging" },
    { name:"Gamma",     color:"#991b1b", freq:">10¹⁹ Hz",  use:"Cancer treatment" },
  ];
  const hiSet = new Set((highlighted || []).map(s => s.toLowerCase()));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, width:"100%" }}>
      <div style={{ display:"flex", height:20, borderRadius:6, overflow:"hidden" }}>
        {bands.map((b, i) => (
          <div key={i} style={{
            flex:1, background:b.color,
            opacity: hiSet.size === 0 || hiSet.has(b.name.toLowerCase()) ? 1 : 0.3,
          }} />
        ))}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, color:T.slate }}>
        <span>← longer wavelength / lower frequency / less energy</span>
        <span>shorter wavelength / higher frequency / more energy →</span>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:3, marginTop:2 }}>
        {bands.map((b, i) => {
          const isHi = hiSet.size === 0 || hiSet.has(b.name.toLowerCase());
          return (
            <div key={i} style={{
              padding:"2px 6px", background: isHi ? b.color + "22" : "#f8fafc",
              border:`1px solid ${isHi ? b.color : "#e2e8f0"}`, borderRadius:4,
              fontSize:9, fontWeight: isHi ? 700 : 400, color: isHi ? b.color : T.slate,
            }}>{b.name}</div>
          );
        })}
      </div>
    </div>
  );
}

// ── Free Body Diagram ─────────────────────────────────────────────────────────
export function FreeBodyVis({ forces }) {
  // forces = [{ label, value, direction:"up"|"down"|"left"|"right", color }]
  const cx = 60, cy = 60;
  const DIR = {
    up:    { dx:0, dy:-1, lx:0,   ly:-52 },
    down:  { dx:0, dy:1,  lx:0,   ly:52  },
    left:  { dx:-1, dy:0, lx:-52, ly:0   },
    right: { dx:1, dy:0,  lx:52,  ly:0   },
  };
  const FORCE_COLORS = { up:T.emerald, down:T.nebula, left:T.indigo, right:"#f59e0b" };
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <defs>
          {["up","down","left","right"].map(dir => (
            <marker key={dir} id={`fbArrow-${dir}`} markerWidth={8} markerHeight={8} refX={4} refY={3} orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill={FORCE_COLORS[dir]} />
            </marker>
          ))}
        </defs>
        {/* Object */}
        <rect x={cx-14} y={cy-14} width={28} height={28} rx={4} fill={T.indigoBg} stroke={T.indigo} strokeWidth={2} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={8} fill={T.indigo} fontWeight="700">obj</text>
        {/* Force arrows */}
        {forces.map((f, i) => {
          const d = DIR[f.direction];
          if (!d) return null;
          const mag = Math.min(Math.max((f.value || 1) / 20, 0.4), 1);
          const len = 32 * mag + 14;
          const ex = cx + d.dx * len, ey = cy + d.dy * len;
          const color = FORCE_COLORS[f.direction];
          return (
            <g key={i}>
              <line x1={cx + d.dx*14} y1={cy + d.dy*14} x2={ex} y2={ey}
                stroke={color} strokeWidth={2.5} markerEnd={`url(#fbArrow-${f.direction})`} />
              <text x={cx + d.lx * 0.8} y={cy + d.ly * 0.8}
                textAnchor="middle" dominantBaseline="central" fontSize={8} fill={color} fontWeight="700">
                {f.label}{f.value ? ` (${f.value}N)` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}