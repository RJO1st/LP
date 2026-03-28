"use client";
// ─── Deploy to: src/components/game/BusinessVisuals.jsx ──────────────────────
// Extracted from MathsVisualiser — economics, business, and advanced graph components.
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
// BUSINESS & ADVANCED GRAPH VISUALS
// ═══════════════════════════════════════════════════════════════════════════════

export function TAccountVis({ account, debits, credits }) {
  const debitTotal  = (debits  || []).reduce((s, r) => s + r.amount, 0);
  const creditTotal = (credits || []).reduce((s, r) => s + r.amount, 0);
  const balance     = debitTotal - creditTotal;
  const Col = ({ entries, title, color }) => (
    <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
      <div style={{ padding:"4px 8px", background:color+"22", fontSize:11, fontWeight:700, color, textAlign:"center", borderBottom:`2px solid ${color}` }}>
        {title}
      </div>
      {(entries||[]).map((e, i) => (
        <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"3px 8px", fontSize:10, color:T.slate, borderBottom:"1px solid #f1f5f9" }}>
          <span>{e.label}</span>
          <span style={{ fontWeight:600 }}>£{e.amount.toLocaleString()}</span>
        </div>
      ))}
      <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 8px", fontSize:11, fontWeight:700, color, borderTop:`2px solid ${color}`, marginTop:"auto" }}>
        <span>Total</span>
        <span>£{(entries||[]).reduce((s,r)=>s+r.amount,0).toLocaleString()}</span>
      </div>
    </div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, width:"100%" }}>
      <div style={{ textAlign:"center", fontSize:12, fontWeight:700, color:T.slate, textDecoration:"underline" }}>
        {account}
      </div>
      <div style={{ display:"flex", border:`2px solid ${T.slate}`, borderRadius:8, overflow:"hidden", minHeight:100 }}>
        <Col entries={debits}  title="Dr (Debit)"  color={T.indigo} />
        <div style={{ width:2, background:T.slate }} />
        <Col entries={credits} title="Cr (Credit)" color={T.nebula} />
      </div>
      <div style={{ textAlign:"center", fontSize:11, color:T.slate }}>
        Balance: <span style={{ fontWeight:700, color: balance >= 0 ? T.indigo : T.nebula }}>
          £{Math.abs(balance).toLocaleString()} {balance >= 0 ? "Dr" : "Cr"}
        </span>
      </div>
    </div>
  );
}

// ── Break-Even Chart ──────────────────────────────────────────────────────────
export function BreakEvenVis({ fixedCost, variableCostPerUnit, pricePerUnit, breakEvenQty }) {
  const W = 200, H = 140, PAD = 30;
  const maxQ = (breakEvenQty || 100) * 1.6;
  const maxC = pricePerUnit * maxQ;
  const scaleX = (q) => PAD + (q / maxQ) * (W - PAD);
  const scaleY = (c) => H - PAD - (c / maxC) * (H - PAD);
  const fixedY = scaleY(fixedCost);
  const beX = scaleX(breakEvenQty || 0);
  const beY = scaleY((breakEvenQty || 0) * pricePerUnit);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Axes */}
        <line className="vis-axis" x1={PAD} y1={H-PAD} x2={W} y2={H-PAD} stroke={T.slate} strokeWidth={1.5} />
        <line className="vis-axis" x1={PAD} y1={0}    x2={PAD} y2={H-PAD} stroke={T.slate} strokeWidth={1.5} />
        <text className="vis-label" x={W/2} y={H-4} textAnchor="middle" fontSize={8} fill={T.slate}>Quantity (units)</text>
        <text className="vis-label" x={8} y={H/2} textAnchor="middle" fontSize={8} fill={T.slate} transform={`rotate(-90 8 ${H/2})`}>Cost / Revenue (£)</text>
        {/* Fixed cost line */}
        <line className="vis-arc" x1={PAD} y1={fixedY} x2={W} y2={fixedY} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4,3" />
        <text className="vis-label" x={W-4} y={fixedY - 4} textAnchor="end" fontSize={8} fill="#94a3b8" fontWeight="600">FC</text>
        {/* Total cost line */}
        <line className="vis-arc" x1={PAD} y1={fixedY} x2={W} y2={scaleY(fixedCost + (maxQ * variableCostPerUnit))}
          stroke={T.indigo} strokeWidth={2} />
        <text className="vis-label" x={W-4} y={scaleY(fixedCost + maxQ*variableCostPerUnit)-4} textAnchor="end" fontSize={8} fill={T.indigo} fontWeight="700">TC</text>
        {/* Revenue line */}
        <line className="vis-arc" x1={PAD} y1={H-PAD} x2={W} y2={scaleY(maxQ * pricePerUnit)}
          stroke={T.emerald} strokeWidth={2} />
        <text className="vis-label" x={W-4} y={scaleY(maxQ*pricePerUnit)-4} textAnchor="end" fontSize={8} fill={T.emerald} fontWeight="700">TR</text>
        {/* Break-even point */}
        {breakEvenQty && (
          <>
            <line className="vis-axis" x1={beX} y1={H-PAD} x2={beX} y2={beY} stroke={T.nebula} strokeWidth={1} strokeDasharray="3,3" />
            <circle className="vis-mark" cx={beX} cy={beY} r={5} fill={T.nebula} />
            <text className="vis-label" x={beX} y={beY - 8} textAnchor="middle" fontSize={8} fill={T.nebula} fontWeight="700">BEP</text>
          </>
        )}
      </svg>
      {breakEvenQty && (
        <div style={{ fontSize:11, color:T.slate }}>
          Break-even: <span style={{ fontWeight:700, color:T.nebula }}>{breakEvenQty} units</span>
          {" "} · Revenue = Cost = <span style={{ fontWeight:700 }}>£{(breakEvenQty * pricePerUnit).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

// ── Supply & Demand Curves ────────────────────────────────────────────────────
export function SupplyDemandVis({ eqPrice, eqQty, shift }) {
  const W = 180, H = 150, PAD = 28;
  const scaleX = (q) => PAD + q * ((W - PAD) / 100);
  const scaleY = (p) => H - PAD - p * ((H - PAD) / 100);
  // Demand: downward slope  D: P = 90 - 0.8Q
  // Supply: upward slope    S: P = 10 + 0.8Q
  const demandPath = `M ${scaleX(0)} ${scaleY(90)} L ${scaleX(100)} ${scaleY(10)}`;
  const supplyPath = `M ${scaleX(0)} ${scaleY(10)} L ${scaleX(100)} ${scaleY(90)}`;
  const eq = eqQty || 50, ep = eqPrice || 50;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line className="vis-axis" x1={PAD} y1={H-PAD} x2={W}   y2={H-PAD} stroke={T.slate} strokeWidth={1.5} />
        <line className="vis-axis" x1={PAD} y1={0}    x2={PAD}   y2={H-PAD} stroke={T.slate} strokeWidth={1.5} />
        <text className="vis-label" x={W/2}  y={H-6}  textAnchor="middle" fontSize={8} fill={T.slate}>Quantity</text>
        <text className="vis-label" x={8}    y={H/2}  textAnchor="middle" fontSize={8} fill={T.slate} transform={`rotate(-90 8 ${H/2})`}>Price</text>
        {/* Demand curve */}
        <path className="vis-arc" d={demandPath} fill="none" stroke={T.indigo} strokeWidth={2} />
        <text className="vis-label" x={W-8} y={scaleY(12)} textAnchor="end" fontSize={9} fill={T.indigo} fontWeight="800">D</text>
        {/* Supply curve */}
        <path className="vis-arc" d={supplyPath} fill="none" stroke={T.emerald} strokeWidth={2} />
        <text className="vis-label" x={W-8} y={scaleY(88)} textAnchor="end" fontSize={9} fill={T.emerald} fontWeight="800">S</text>
        {/* Equilibrium */}
        <line className="vis-axis" x1={scaleX(eq)} y1={H-PAD} x2={scaleX(eq)} y2={scaleY(ep)} stroke={T.nebula} strokeWidth={1} strokeDasharray="3,3" />
        <line className="vis-axis" x1={PAD} y1={scaleY(ep)} x2={scaleX(eq)} y2={scaleY(ep)} stroke={T.nebula} strokeWidth={1} strokeDasharray="3,3" />
        <circle className="vis-mark" cx={scaleX(eq)} cy={scaleY(ep)} r={5} fill={T.nebula} />
        <text className="vis-label" x={scaleX(eq)+4} y={scaleY(ep)-4} fontSize={8} fill={T.nebula} fontWeight="700">E</text>
      </svg>
      <div style={{ fontSize:11, color:T.slate, textAlign:"center" }}>
        Equilibrium: P = <span style={{ fontWeight:700, color:T.nebula }}>{ep}</span>
        {" "} · Q = <span style={{ fontWeight:700, color:T.nebula }}>{eq}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSER — TIER 4
// ═══════════════════════════════════════════════════════════════════════════════

// ── Profit & Loss Statement ──────────────────────────────────────────────────
export function ProfitLossVis({ revenue = 50000, cogs = 20000, expenses = 15000 }) {
  const gross = revenue - cogs;
  const net = gross - expenses;
  const isProfit = net >= 0;
  const fmt = (n) => (n < 0 ? "-" : "") + "₦" + Math.abs(n).toLocaleString();
  const rows = [
    { label: "Revenue", amount: revenue, color: T.emerald },
    { label: "Cost of Goods Sold", amount: -cogs, color: T.rose },
    { label: "Gross Profit", amount: gross, color: gross >= 0 ? T.emerald : T.rose, bold: true },
    { label: "Operating Expenses", amount: -expenses, color: T.rose },
    { label: isProfit ? "Net Profit" : "Net Loss", amount: net, color: isProfit ? T.emerald : T.rose, bold: true },
  ];
  return (
    <Panel accent={T.emerald} bg="#fff" bd={T.emeraldBd} ariaLabel="Profit & Loss Statement">
      <span style={{ fontSize: 11, fontWeight: 800, color: T.emerald, textTransform: "uppercase", letterSpacing: 1 }}>Income Statement</span>
      <div style={{ width: "100%", fontSize: 12 }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", padding: "4px 8px",
            borderBottom: r.bold ? `2px solid ${r.color}22` : `1px solid #f1f5f9`,
            fontWeight: r.bold ? 800 : 500, color: r.bold ? r.color : T.text,
          }}>
            <span>{r.label}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(r.amount)}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── Trade Flow / Distribution Channel ────────────────────────────────────────
export function TradeFlowVis({ flowType = "distribution" }) {
  const FLOWS = {
    distribution: { label: "Distribution Channel", steps: ["Manufacturer", "Wholesaler", "Retailer", "Consumer"], colors: [T.indigo, T.nebula, T.amber, T.emerald] },
    international: { label: "International Trade", steps: ["Exporter", "Customs", "Shipping", "Importer"], colors: [T.indigo, T.amber, T.emerald, T.nebula] },
    banking: { label: "Banking Flow", steps: ["Depositor", "Bank", "Borrower", "Repayment"], colors: [T.emerald, T.indigo, T.amber, T.rose] },
  };
  const flow = FLOWS[flowType] || FLOWS.distribution;
  return (
    <Panel accent={T.indigo} bg="#fff" bd={T.indigoBd} ariaLabel={flow.label}>
      <span style={{ fontSize: 11, fontWeight: 800, color: T.indigo, textTransform: "uppercase", letterSpacing: 1 }}>{flow.label}</span>
      <svg viewBox="0 0 220 50" style={{ width: "100%", maxWidth: 260 }}>
        {flow.steps.map((step, i) => {
          const x = 10 + i * 55;
          return (
            <g key={i}>
              <rect x={x} y={8} width={44} height={22} rx={6} fill={`${flow.colors[i]}15`} stroke={flow.colors[i]} strokeWidth={1.5} />
              <text x={x + 22} y={23} textAnchor="middle" fontSize={6} fontWeight="700" fill={flow.colors[i]}>{step}</text>
              {i < flow.steps.length - 1 && (
                <path d={`M${x + 46} 19 L${x + 53} 19`} stroke={T.textMid} strokeWidth={1.2} markerEnd="url(#arrowTF)" />
              )}
            </g>
          );
        })}
        <defs><marker id="arrowTF" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L6,3 L0,6 Z" fill={T.textMid} /></marker></defs>
      </svg>
    </Panel>
  );
}

// ── Business Organisation / Structure ────────────────────────────────────────
export function OrgStructureVis({ orgType = "sole_trader" }) {
  const ORGS = {
    sole_trader:  { label: "Sole Proprietorship", icon: "👤", desc: "One owner, unlimited liability", color: T.amber },
    partnership:  { label: "Partnership", icon: "🤝", desc: "2-20 partners, shared liability", color: T.indigo },
    limited:      { label: "Limited Company", icon: "🏢", desc: "Shareholders, limited liability", color: T.emerald },
    plc:          { label: "Public Ltd Company", icon: "📈", desc: "Shares traded publicly", color: T.nebula },
    cooperative:  { label: "Cooperative", icon: "🤲", desc: "Member-owned, democratic control", color: T.rose },
  };
  const org = ORGS[orgType] || ORGS.sole_trader;
  return (
    <Panel accent={org.color} bg="#fff" bd={`${org.color}44`} ariaLabel={org.label}>
      <span style={{ fontSize: 11, fontWeight: 800, color: org.color, textTransform: "uppercase", letterSpacing: 1 }}>{org.label}</span>
      <div style={{ fontSize: 36, lineHeight: 1 }}>{org.icon}</div>
      <span style={{ fontSize: 11, color: T.textMid, fontWeight: 600, textAlign: "center" }}>{org.desc}</span>
    </Panel>
  );
}

// ── Marketing Mix (4Ps) ──────────────────────────────────────────────────────
export function MarketingMixVis({ highlight }) {
  const PS = [
    { label: "Product", icon: "📦", color: T.indigo, desc: "What you sell" },
    { label: "Price", icon: "💰", color: T.emerald, desc: "What you charge" },
    { label: "Place", icon: "📍", color: T.amber, desc: "Where you sell" },
    { label: "Promotion", icon: "📣", color: T.nebula, desc: "How you sell" },
  ];
  return (
    <Panel accent={T.indigo} bg="#fff" bd={T.indigoBd} ariaLabel="Marketing Mix - 4Ps">
      <span style={{ fontSize: 11, fontWeight: 800, color: T.indigo, textTransform: "uppercase", letterSpacing: 1 }}>Marketing Mix</span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, width: "100%" }}>
        {PS.map((p, i) => {
          const isHL = highlight && p.label.toLowerCase() === highlight.toLowerCase();
          return (
            <div key={i} style={{
              padding: "6px 8px", borderRadius: 8, textAlign: "center",
              background: isHL ? `${p.color}15` : "#f8fafc",
              border: `1.5px solid ${isHL ? p.color : "#e2e8f0"}`,
              transform: isHL ? "scale(1.05)" : "none", transition: "all 0.2s",
            }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{p.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: p.color }}>{p.label}</div>
              <div style={{ fontSize: 8, color: T.textMid }}>{p.desc}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 4 + EXTENDED PARSER + MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export function MotionGraphVis({ motionType = "distance_time", curveType = "constant" }) {
  const W = 200, H = 130, PAD = 24;
  const chartW = W - PAD*2, chartH = H - PAD*2;
  const yLabel = motionType === "distance_time" ? "d" : "v";
  const xLabel = "t";
  const color = motionType === "distance_time" ? T.indigo : T.emerald;

  const curves = {
    constant:      `M ${PAD},${H-PAD} L ${W-PAD},${PAD+20}`,
    accelerating:  `M ${PAD},${H-PAD} Q ${W-PAD},${H-PAD} ${W-PAD},${PAD+10}`,
    decelerating:  `M ${PAD},${PAD+10} Q ${PAD},${H-PAD} ${W-PAD},${H-PAD}`,
    stationary:    `M ${PAD},${H-PAD-40} L ${W-PAD},${H-PAD-40}`,
  };

  const labels = {
    constant:      motionType === "distance_time" ? "constant speed" : "constant acceleration",
    accelerating:  motionType === "distance_time" ? "speeding up" : "increasing acceleration",
    decelerating:  motionType === "distance_time" ? "slowing down" : "decelerating",
    stationary:    motionType === "distance_time" ? "not moving" : "constant velocity",
  };

  return (
    <Panel accent={color} bg={T.slateBg} bd={T.slateBd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Grid */}
        <line className="vis-axis" x1={PAD} y1={PAD} x2={PAD} y2={H-PAD} stroke={T.slateBd} strokeWidth={1}/>
        <line className="vis-axis" x1={PAD} y1={H-PAD} x2={W-PAD} y2={H-PAD} stroke={T.slateBd} strokeWidth={1}/>
        {/* Axes arrows */}
        <polygon className="vis-mark" points={`${PAD},${PAD-2} ${PAD-3},${PAD+6} ${PAD+3},${PAD+6}`} fill={color}/>
        <polygon className="vis-mark" points={`${W-PAD+2},${H-PAD} ${W-PAD-6},${H-PAD-3} ${W-PAD-6},${H-PAD+3}`} fill={color}/>
        {/* Axis labels — offset from axis tips for clarity */}
        <text className="vis-label" x={PAD-14} y={PAD+4} fontSize={11} fontWeight="800" fill={color}>{yLabel}</text>
        <text className="vis-label" x={W-PAD+4} y={H-PAD+16} fontSize={11} fontWeight="800" fill={color}>{xLabel}</text>
        {/* Origin */}
        <text className="vis-label" x={PAD-8} y={H-PAD+10} fontSize={8} fill={T.textMid}>0</text>
        {/* Curve */}
        <path className="vis-arc" d={curves[curveType] || curves.constant}
          stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round"/>
        {/* Annotations sit below axis line with space — not overlapping curve */}
        {motionType === "distance_time" && (
          <text className="vis-label" x={W-PAD-4} y={H-PAD-6} textAnchor="end" fontSize={7} fill={T.textMid}>
            gradient = speed
          </text>
        )}
        {motionType === "velocity_time" && (
          <text className="vis-label" x={W-PAD-4} y={H-PAD-6} textAnchor="end" fontSize={7} fill={T.textMid}>
            area under = distance
          </text>
        )}
      </svg>
      <div style={{marginTop:6}}>
        <Chip color={color} bg={color === T.indigo ? T.indigoBg : T.emeraldBg}>{labels[curveType]}</Chip>
      </div>
    </Panel>
  );
}

// ── CIRCUIT DIAGRAM ──────────────────────────────────────────────────────────
// type: "series" | "parallel"
export function CircuitVis({ type = "series" }) {
  const W = 200, H = 110;
  const color = T.indigo;
  // Both circuits as clean SVG paths using standard UK symbols
  return (
    <Panel accent={color} bg={T.slateBg} bd={T.slateBd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {type === "series" ? (
          <g>
            {/* Rectangular loop */}
            <polyline points="20,30 20,90 180,90 180,30 20,30" fill="none" stroke={color} strokeWidth={2}/>
            {/* Battery symbol on left side */}
            <line x1={20} y1={50} x2={20} y2={56} stroke={color} strokeWidth={3}/>
            <line x1={15} y1={58} x2={25} y2={58} stroke={color} strokeWidth={2.5}/>
            <line x1={17} y1={61} x2={23} y2={61} stroke={color} strokeWidth={2}/>
            <line x1={20} y1={63} x2={20} y2={69} stroke={color} strokeWidth={3}/>
            <text x={28} y={62} fontSize={8} fill={color}>cell</text>
            {/* Bulb 1 on top */}
            <circle cx={75} cy={30} r={9} fill="white" stroke={color} strokeWidth={2}/>
            <line x1={70} y1={34} x2={80} y2={26} stroke={color} strokeWidth={1.2}/>
            <line x1={80} y1={34} x2={70} y2={26} stroke={color} strokeWidth={1.2}/>
            {/* Bulb 2 on top */}
            <circle cx={130} cy={30} r={9} fill="white" stroke={color} strokeWidth={2}/>
            <line x1={125} y1={34} x2={135} y2={26} stroke={color} strokeWidth={1.2}/>
            <line x1={135} y1={34} x2={125} y2={26} stroke={color} strokeWidth={1.2}/>
            <text x={100} y={105} textAnchor="middle" fontSize={8} fontWeight="700" fill={color}>SERIES</text>
          </g>
        ) : (
          <g>
            {/* Outer loop */}
            <polyline points="20,20 20,90 180,90 180,20" fill="none" stroke={color} strokeWidth={2}/>
            <line x1={20} y1={20} x2={180} y2={20} stroke={color} strokeWidth={2}/>
            {/* Junction dots */}
            <circle cx={20} cy={20} r={3.5} fill={color}/>
            <circle cx={20} cy={90} r={3.5} fill={color}/>
            <circle cx={180} cy={20} r={3.5} fill={color}/>
            <circle cx={180} cy={90} r={3.5} fill={color}/>
            {/* Battery on left */}
            <line x1={20} y1={44} x2={20} y2={50} stroke={color} strokeWidth={3}/>
            <line x1={15} y1={52} x2={25} y2={52} stroke={color} strokeWidth={2.5}/>
            <line x1={17} y1={55} x2={23} y2={55} stroke={color} strokeWidth={2}/>
            <line x1={20} y1={57} x2={20} y2={63} stroke={color} strokeWidth={3}/>
            {/* Branch connector */}
            <line x1={100} y1={20} x2={100} y2={90} stroke={color} strokeWidth={2}/>
            <circle cx={100} cy={20} r={3.5} fill={color}/>
            <circle cx={100} cy={90} r={3.5} fill={color}/>
            {/* Bulb left branch */}
            <circle cx={60} cy={55} r={9} fill="white" stroke={color} strokeWidth={2}/>
            <line x1={55} y1={59} x2={65} y2={51} stroke={color} strokeWidth={1.2}/>
            <line x1={65} y1={59} x2={55} y2={51} stroke={color} strokeWidth={1.2}/>
            {/* Bulb right branch */}
            <circle cx={140} cy={55} r={9} fill="white" stroke={color} strokeWidth={2}/>
            <line x1={135} y1={59} x2={145} y2={51} stroke={color} strokeWidth={1.2}/>
            <line x1={145} y1={59} x2={135} y2={51} stroke={color} strokeWidth={1.2}/>
            <text x={100} y={105} textAnchor="middle" fontSize={8} fontWeight="700" fill={color}>PARALLEL</text>
          </g>
        )}
      </svg>
    </Panel>
  );
}

// ── QUADRATIC GRAPH SKETCH ────────────────────────────────────────────────────
// Shows parabola shape, marks roots and vertex. Does NOT give the answer.
export function QuadraticVis({ a = 1, roots, vertex, label }) {
  const W = 200, H = 130, PAD = 20;
  const cW = W - PAD*2, cH = H - PAD*2;
  // Normalise to viewport: roots in [-3,3] range
  const xMin = -3.5, xMax = 3.5;
  const toSx = x => PAD + ((x - xMin) / (xMax - xMin)) * cW;
  // Generate curve points
  const pts = [];
  const r1 = roots?.[0] ?? -1.5, r2 = roots?.[1] ?? 1.5;
  const vx = vertex?.x ?? (r1+r2)/2;
  const vy = vertex?.y ?? (a > 0 ? -2 : 2);
  const yMin = Math.min(vy - 0.5, -2.5), yMax = Math.max(2.5, -vy + 0.5);
  const toSy = y => PAD + cH - ((y - yMin) / (yMax - yMin)) * cH;

  for (let xi = 0; xi <= 60; xi++) {
    const x = xMin + (xi / 60) * (xMax - xMin);
    const y = a * (x - vx)**2 + vy;
    pts.push(`${toSx(x)},${toSy(y)}`);
  }
  const originY = toSy(0), originX = toSx(0);
  const color = T.indigo;

  return (
    <Panel accent={color} bg={T.slateBg} bd={T.slateBd}>
      {label && <Chip color={color} bg={T.indigoBg}>{label}</Chip>}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Axes */}
        <line className="vis-axis" x1={PAD} y1={originY} x2={W-PAD} y2={originY} stroke="#94a3b8" strokeWidth={1.5}/>
        <line className="vis-axis" x1={originX} y1={PAD} x2={originX} y2={H-PAD} stroke="#94a3b8" strokeWidth={1.5}/>
        {/* Axis arrows */}
        <polygon className="vis-mark" points={`${W-PAD},${originY} ${W-PAD-6},${originY-3} ${W-PAD-6},${originY+3}`} fill="#94a3b8"/>
        <polygon className="vis-mark" points={`${originX},${PAD} ${originX-3},${PAD+6} ${originX+3},${PAD+6}`} fill="#94a3b8"/>
        <text className="vis-label" x={W-PAD+2} y={originY+4} fontSize={8} fill={T.textMid}>x</text>
        <text className="vis-label" x={originX+3} y={PAD-2} fontSize={8} fill={T.textMid}>y</text>
        {/* Curve */}
        <polyline className="vis-arc" points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        {/* Roots */}
        {roots?.map((rx, i) => (
          <g key={i}>
            <circle className="vis-mark" cx={toSx(rx)} cy={originY} r={4} fill={color}/>
            <text className="vis-label" x={toSx(rx)} y={originY+12} textAnchor="middle" fontSize={8} fontWeight="700" fill={color}>x={rx}</text>
          </g>
        ))}
        {/* Vertex */}
        {vertex && (
          <g>
            <circle className="vis-mark" cx={toSx(vx)} cy={toSy(vy)} r={4} fill={T.nebula}/>
            <text className="vis-label" x={toSx(vx)+6} y={toSy(vy)-4} fontSize={8} fontWeight="700" fill={T.nebula}>({vx},{vy})</text>
          </g>
        )}
      </svg>
    </Panel>
  );
}

// ── PERIODIC TABLE ELEMENT CARD ───────────────────────────────────────────────
const PT_GROUP_COLORS = {
  "alkali":      { bg:"#fef3c7", bd:"#f59e0b", text:"#92400e" },
  "alkaline":    { bg:"#fef9c3", bd:"#eab308", text:"#713f12" },
  "transition":  { bg:"#fce7f3", bd:"#db2777", text:"#831843" },
  "nonmetal":    { bg:"#ecfdf5", bd:"#10b981", text:"#064e3b" },
  "noble":       { bg:"#f5f3ff", bd:"#8b5cf6", text:"#4c1d95" },
  "metalloid":   { bg:"#eff6ff", bd:"#3b82f6", text:"#1e3a8a" },
  "halogen":     { bg:"#fff1f2", bd:"#f43f5e", text:"#881337" },
  "default":     { bg:"#f8fafc", bd:"#94a3b8", text:"#1e293b" },
};
export function ElementVis({ symbol, name, atomicNumber, mass, group, period, groupType = "default" }) {
  const c = PT_GROUP_COLORS[groupType] || PT_GROUP_COLORS.default;
  const W = 180, H = 100;
  return (
    <Panel accent={c.bd} bg={c.bg} bd={c.bd}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Element tile */}
        <rect className="vis-bar" x={55} y={4} width={70} height={78} rx={8} fill="white" stroke={c.bd} strokeWidth={2}/>
        <text className="vis-label" x={90} y={22} textAnchor="middle" fontSize={10} fill={c.text}>{atomicNumber}</text>
        <text className="vis-label" x={90} y={55} textAnchor="middle" fontSize={28} fontWeight="900" fill={c.text}>{symbol}</text>
        <text className="vis-label" x={90} y={68} textAnchor="middle" fontSize={9} fontWeight="700" fill={c.text}>{name}</text>
        <text className="vis-label" x={90} y={78} textAnchor="middle" fontSize={8} fill={c.text}>{mass}</text>
        {/* Group / Period badges */}
        <rect className="vis-bar" x={2} y={36} width={48} height={14} rx={4} fill={c.bg} stroke={c.bd} strokeWidth={1}/>
        <text className="vis-label" x={26} y={47} textAnchor="middle" fontSize={8} fontWeight="700" fill={c.text}>Group {group}</text>
        <rect className="vis-bar" x={130} y={36} width={48} height={14} rx={4} fill={c.bg} stroke={c.bd} strokeWidth={1}/>
        <text className="vis-label" x={154} y={47} textAnchor="middle" fontSize={8} fontWeight="700" fill={c.text}>Period {period}</text>
      </svg>
    </Panel>
  );
}

// ─── EXTEND PARSER ────────────────────────────────────────────────────────────
// Wraps the existing parseVisual. Called parseVisualExtended — the main export
// calls this instead.
// ─── EXTERNAL INTERACTIVE COMPONENTS (separate files for maintainability) ────
// These are imported lazily in the rendering switch below:
//   InteractiveGraph.jsx  → CoordinateGraphVis (equations + interactive plot)
//   DataTable.jsx         → DataTableVis
//   LongMultiplication.jsx → LongMultiplicationVis
//   MultiSelect.jsx       → MultiSelectVis
// Import them at the top of this file or use React.lazy:
import InteractiveGraph from "./InteractiveGraph";
import DataTable from "./DataTable";
import LongMultiplication from "./LongMultiplication";