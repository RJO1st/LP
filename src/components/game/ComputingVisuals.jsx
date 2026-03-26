"use client";
// ─── ComputingVisuals.jsx ──────────────────────────────────────────────────
// Subject-appropriate visuals for Computing / Computer Science topics.
// Covers: flowcharts, binary, boolean logic, networks, sorting algorithms,
// pseudocode blocks, and database tables.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const T = {
  cyan:     "#0891b2",
  cyanBg:   "#ecfeff",
  cyanBd:   "#a5f3fc",
  indigo:   "#4f46e5",
  indigoBg: "#eef2ff",
  indigoBd: "#c7d2fe",
  emerald:  "#059669",
  emeraldBg:"#ecfdf5",
  emeraldBd:"#a7f3d0",
  amber:    "#d97706",
  amberBg:  "#fffbeb",
  amberBd:  "#fde68a",
  rose:     "#e11d48",
  roseBg:   "#fff1f2",
  slate:    "#475569",
  slateBg:  "#f8fafc",
  text:     "#1e293b",
  textMid:  "#64748b",
};

function Panel({ children, accent = T.cyan, label }) {
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      style={{
        background: "#fff",
        borderRadius: 16,
        border: `2px solid ${accent}44`,
        boxShadow: `0 2px 12px ${accent}18`,
        padding: "16px 14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
      }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. FLOWCHART VIS — algorithms, sequences, selection, loops
// ═══════════════════════════════════════════════════════════════════════════════
export function FlowchartVis({ steps = [], title = "Algorithm" }) {
  // Default demo steps if none provided
  const nodes = steps.length > 0 ? steps : [
    { type: "terminal", text: "Start" },
    { type: "process", text: "Get input" },
    { type: "decision", text: "Valid?" },
    { type: "process", text: "Process data" },
    { type: "terminal", text: "End" },
  ];

  const W = 220, nodeH = 32, gap = 14, padTop = 10;
  const totalH = padTop + nodes.length * (nodeH + gap) + 10;

  const SHAPE_COLORS = {
    terminal:  { fill: T.cyanBg,    stroke: T.cyan,    text: T.cyan },
    process:   { fill: T.indigoBg,  stroke: T.indigo,  text: T.indigo },
    decision:  { fill: T.amberBg,   stroke: T.amber,   text: T.amber },
    io:        { fill: T.emeraldBg, stroke: T.emerald,  text: T.emerald },
  };

  return (
    <Panel label={`Flowchart: ${title}`}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.cyan, letterSpacing: 0.5 }}>
        {title.toUpperCase()}
      </div>
      <svg viewBox={`0 0 ${W} ${totalH}`} width="100%" style={{ maxWidth: 220 }}>
        {nodes.map((node, i) => {
          const cx = W / 2;
          const cy = padTop + i * (nodeH + gap) + nodeH / 2;
          const colors = SHAPE_COLORS[node.type] || SHAPE_COLORS.process;
          const nw = 140, nh = nodeH;

          // Arrow from previous node
          const arrow = i > 0 ? (
            <g key={`arr-${i}`}>
              <line
                x1={cx} y1={cy - nh / 2 - gap}
                x2={cx} y2={cy - nh / 2}
                stroke={T.slate} strokeWidth={1.5}
                markerEnd="url(#fc-arrow)"
              />
              {/* Yes/No labels on decision output */}
              {nodes[i - 1]?.type === "decision" && (
                <text x={cx + 8} y={cy - nh / 2 - gap / 2} fontSize={8} fill={T.emerald} fontWeight={700}>
                  Yes
                </text>
              )}
            </g>
          ) : null;

          let shape;
          if (node.type === "terminal") {
            // Rounded rectangle (stadium)
            shape = (
              <rect
                x={cx - nw / 2} y={cy - nh / 2}
                width={nw} height={nh}
                rx={nh / 2} ry={nh / 2}
                fill={colors.fill} stroke={colors.stroke} strokeWidth={2}
                className="vis-node"
              />
            );
          } else if (node.type === "decision") {
            // Diamond
            const hw = nw / 2 + 6, hh = nh / 2 + 4;
            shape = (
              <polygon
                points={`${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`}
                fill={colors.fill} stroke={colors.stroke} strokeWidth={2}
                className="vis-node"
              />
            );
          } else if (node.type === "io") {
            // Parallelogram
            const skew = 10;
            shape = (
              <polygon
                points={`${cx - nw / 2 + skew},${cy - nh / 2} ${cx + nw / 2 + skew},${cy - nh / 2} ${cx + nw / 2 - skew},${cy + nh / 2} ${cx - nw / 2 - skew},${cy + nh / 2}`}
                fill={colors.fill} stroke={colors.stroke} strokeWidth={2}
                className="vis-node"
              />
            );
          } else {
            // Rectangle (process)
            shape = (
              <rect
                x={cx - nw / 2} y={cy - nh / 2}
                width={nw} height={nh}
                rx={4} ry={4}
                fill={colors.fill} stroke={colors.stroke} strokeWidth={2}
                className="vis-node"
              />
            );
          }

          return (
            <g key={i}>
              {arrow}
              {shape}
              <text
                x={cx} y={cy + 1}
                textAnchor="middle" dominantBaseline="central"
                fontSize={10} fontWeight={700} fill={colors.text}
              >
                {node.text.length > 18 ? node.text.slice(0, 16) + "…" : node.text}
              </text>
            </g>
          );
        })}
        <defs>
          <marker id="fc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth={8} markerHeight={8} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={T.slate} />
          </marker>
        </defs>
      </svg>
      {/* Legend */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { label: "Start/End", color: T.cyan, shape: "⬭" },
          { label: "Process", color: T.indigo, shape: "▭" },
          { label: "Decision", color: T.amber, shape: "◇" },
          { label: "Input/Output", color: T.emerald, shape: "▱" },
        ].map(l => (
          <span key={l.label} style={{ fontSize: 8, color: l.color, fontWeight: 600 }}>
            {l.shape} {l.label}
          </span>
        ))}
      </div>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. BINARY VIS — binary numbers, bits, conversion
// ═══════════════════════════════════════════════════════════════════════════════
export function BinaryVis({ value = 42, bits = 8 }) {
  const clamped = Math.max(0, Math.min(value, Math.pow(2, bits) - 1));
  const binary = clamped.toString(2).padStart(bits, "0");
  const placeValues = Array.from({ length: bits }, (_, i) => Math.pow(2, bits - 1 - i));

  return (
    <Panel label={`Binary: ${clamped} in ${bits}-bit binary`}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.cyan, letterSpacing: 0.5 }}>
        BINARY REPRESENTATION
      </div>
      {/* Place values */}
      <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
        {placeValues.map((pv, i) => (
          <div key={i} style={{
            width: 28, textAlign: "center",
            fontSize: 8, fontWeight: 600, color: T.textMid,
          }}>
            {pv}
          </div>
        ))}
      </div>
      {/* Bit boxes */}
      <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
        {binary.split("").map((bit, i) => (
          <div
            key={i}
            className="vis-bit"
            style={{
              width: 28, height: 28,
              borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800,
              fontFamily: "monospace",
              background: bit === "1" ? T.cyan : T.slateBg,
              color: bit === "1" ? "#fff" : T.textMid,
              border: `2px solid ${bit === "1" ? T.cyan : "#e2e8f0"}`,
              transition: "all 0.3s ease",
            }}
          >
            {bit}
          </div>
        ))}
      </div>
      {/* Decimal value */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, color: T.textMid, fontWeight: 600 }}>DECIMAL</span>
        <span style={{
          fontSize: 16, fontWeight: 800, color: T.cyan,
          background: T.cyanBg, padding: "2px 10px", borderRadius: 8,
          border: `2px solid ${T.cyanBd}`,
          fontFamily: "monospace",
        }}>
          {clamped}
        </span>
      </div>
      {/* Active place values */}
      <div style={{ fontSize: 9, color: T.textMid, textAlign: "center" }}>
        {binary.split("").map((bit, i) => bit === "1" ? placeValues[i] : null).filter(Boolean).join(" + ")} = {clamped}
      </div>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. BOOLEAN LOGIC VIS — AND, OR, NOT, XOR gates
// ═══════════════════════════════════════════════════════════════════════════════
export function BooleanLogicVis({ gate = "AND", inputA = true, inputB = true }) {
  const GATES = {
    AND:  { symbol: "∧", fn: (a, b) => a && b, color: T.indigo },
    OR:   { symbol: "∨", fn: (a, b) => a || b, color: T.emerald },
    NOT:  { symbol: "¬", fn: (a) => !a, color: T.rose },
    XOR:  { symbol: "⊕", fn: (a, b) => a !== b, color: T.amber },
    NAND: { symbol: "⊼", fn: (a, b) => !(a && b), color: "#7c3aed" },
    NOR:  { symbol: "⊽", fn: (a, b) => !(a || b), color: "#0d9488" },
  };

  const g = GATES[gate.toUpperCase()] || GATES.AND;
  const isUnary = gate.toUpperCase() === "NOT";
  const output = isUnary ? g.fn(inputA) : g.fn(inputA, inputB);

  const W = 200, H = isUnary ? 90 : 120;

  function BitBox({ x, y, val, label }) {
    return (
      <g>
        <rect x={x - 16} y={y - 12} width={32} height={24} rx={6}
          fill={val ? T.cyanBg : T.slateBg}
          stroke={val ? T.cyan : "#e2e8f0"} strokeWidth={2}
        />
        <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central"
          fontSize={12} fontWeight={800} fontFamily="monospace"
          fill={val ? T.cyan : T.textMid}
        >
          {val ? "1" : "0"}
        </text>
        <text x={x} y={y - 18} textAnchor="middle" fontSize={8} fontWeight={600} fill={T.textMid}>
          {label}
        </text>
      </g>
    );
  }

  return (
    <Panel label={`Boolean ${gate} gate`}>
      <div style={{ fontSize: 11, fontWeight: 700, color: g.color, letterSpacing: 0.5 }}>
        {gate.toUpperCase()} GATE
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 200 }}>
        {/* Inputs */}
        <BitBox x={40} y={30} val={inputA} label="Input A" />
        {!isUnary && <BitBox x={40} y={70} val={inputB} label="Input B" />}

        {/* Gate shape */}
        <rect
          x={80} y={isUnary ? 18 : 28}
          width={50} height={isUnary ? 24 : 44}
          rx={10}
          fill={`${g.color}15`} stroke={g.color} strokeWidth={2}
        />
        <text
          x={105} y={isUnary ? 32 : 52}
          textAnchor="middle" dominantBaseline="central"
          fontSize={16} fontWeight={800} fill={g.color}
        >
          {g.symbol}
        </text>

        {/* Wires */}
        <line x1={56} y1={30} x2={80} y2={isUnary ? 30 : 40} stroke={T.slate} strokeWidth={1.5} />
        {!isUnary && <line x1={56} y1={70} x2={80} y2={60} stroke={T.slate} strokeWidth={1.5} />}
        <line x1={130} y1={isUnary ? 30 : 50} x2={144} y2={isUnary ? 30 : 50} stroke={T.slate} strokeWidth={1.5} markerEnd="url(#bool-arrow)" />

        {/* Output */}
        <BitBox x={160} y={isUnary ? 30 : 50} val={output} label="Output" />

        <defs>
          <marker id="bool-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth={6} markerHeight={6} orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={T.slate} />
          </marker>
        </defs>
      </svg>
      {/* Truth expression */}
      <div style={{
        fontSize: 10, fontWeight: 700, fontFamily: "monospace",
        color: g.color, background: `${g.color}10`, padding: "4px 12px",
        borderRadius: 8, border: `1.5px solid ${g.color}30`,
      }}>
        {isUnary
          ? `NOT ${inputA ? "1" : "0"} = ${output ? "1" : "0"}`
          : `${inputA ? "1" : "0"} ${gate} ${inputB ? "1" : "0"} = ${output ? "1" : "0"}`
        }
      </div>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. NETWORK DIAGRAM VIS — basic network topology
// ═══════════════════════════════════════════════════════════════════════════════
export function NetworkDiagramVis({ topology = "star", highlighted = "" }) {
  const W = 220, H = 150;
  const cx = W / 2, cy = H / 2;

  const TOPOLOGIES = {
    star: {
      nodes: [
        { id: "server", x: cx, y: cy, icon: "🖥️", label: "Server" },
        { id: "pc1", x: cx - 60, y: 25, icon: "💻", label: "PC 1" },
        { id: "pc2", x: cx + 60, y: 25, icon: "💻", label: "PC 2" },
        { id: "pc3", x: cx - 60, y: H - 25, icon: "💻", label: "PC 3" },
        { id: "pc4", x: cx + 60, y: H - 25, icon: "💻", label: "PC 4" },
      ],
      edges: [["server","pc1"],["server","pc2"],["server","pc3"],["server","pc4"]],
    },
    bus: {
      nodes: [
        { id: "pc1", x: 30, y: 30, icon: "💻", label: "PC 1" },
        { id: "pc2", x: 80, y: 30, icon: "💻", label: "PC 2" },
        { id: "pc3", x: 130, y: 30, icon: "💻", label: "PC 3" },
        { id: "pc4", x: 180, y: 30, icon: "💻", label: "PC 4" },
      ],
      edges: [],
      bus: true,
    },
    ring: {
      nodes: [
        { id: "pc1", x: cx, y: 20, icon: "💻", label: "PC 1" },
        { id: "pc2", x: cx + 70, y: cy, icon: "💻", label: "PC 2" },
        { id: "pc3", x: cx, y: H - 20, icon: "💻", label: "PC 3" },
        { id: "pc4", x: cx - 70, y: cy, icon: "💻", label: "PC 4" },
      ],
      edges: [["pc1","pc2"],["pc2","pc3"],["pc3","pc4"],["pc4","pc1"]],
    },
    internet: {
      nodes: [
        { id: "client", x: 35, y: cy, icon: "💻", label: "Client" },
        { id: "router", x: 85, y: cy, icon: "📡", label: "Router" },
        { id: "isp", x: 135, y: cy, icon: "🌐", label: "ISP" },
        { id: "server", x: 190, y: cy, icon: "🖥️", label: "Server" },
      ],
      edges: [["client","router"],["router","isp"],["isp","server"]],
    },
  };

  const topo = TOPOLOGIES[topology] || TOPOLOGIES.star;
  const nodeMap = Object.fromEntries(topo.nodes.map(n => [n.id, n]));

  return (
    <Panel label={`${topology} network topology`}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.cyan, letterSpacing: 0.5 }}>
        {topology.toUpperCase()} NETWORK
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 220 }}>
        {/* Bus backbone */}
        {topo.bus && (
          <>
            <line x1={20} y1={70} x2={W - 20} y2={70} stroke={T.cyan} strokeWidth={3} strokeLinecap="round" />
            {topo.nodes.map(n => (
              <line key={`bus-${n.id}`} x1={n.x} y1={n.y + 15} x2={n.x} y2={70} stroke={T.slate} strokeWidth={1.5} />
            ))}
          </>
        )}

        {/* Edges */}
        {topo.edges.map(([from, to], i) => {
          const a = nodeMap[from], b = nodeMap[to];
          if (!a || !b) return null;
          const isHighlighted = highlighted === from || highlighted === to;
          return (
            <line key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={isHighlighted ? T.cyan : "#cbd5e1"}
              strokeWidth={isHighlighted ? 2.5 : 1.5}
              strokeDasharray={isHighlighted ? "none" : "4,3"}
            />
          );
        })}

        {/* Nodes */}
        {topo.nodes.map(n => {
          const isHl = highlighted === n.id;
          return (
            <g key={n.id} className="vis-network-node">
              <circle
                cx={n.x} cy={n.y} r={16}
                fill={isHl ? T.cyanBg : "#fff"}
                stroke={isHl ? T.cyan : "#e2e8f0"}
                strokeWidth={isHl ? 2.5 : 1.5}
              />
              <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="central" fontSize={14}>
                {n.icon}
              </text>
              <text x={n.x} y={n.y + 24} textAnchor="middle" fontSize={7} fontWeight={600}
                fill={isHl ? T.cyan : T.textMid}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. CODE BLOCK VIS — pseudocode / programming concepts
// ═══════════════════════════════════════════════════════════════════════════════
export function CodeBlockVis({ lines = [], concept = "sequence", language = "pseudocode" }) {
  const DEMO_LINES = {
    sequence: [
      { text: "name ← INPUT(\"Enter name\")", indent: 0 },
      { text: "greeting ← \"Hello \" + name", indent: 0 },
      { text: "OUTPUT(greeting)", indent: 0 },
    ],
    selection: [
      { text: "score ← INPUT(\"Enter score\")", indent: 0 },
      { text: "IF score >= 50 THEN", indent: 0, keyword: true },
      { text: "OUTPUT(\"Pass\")", indent: 1 },
      { text: "ELSE", indent: 0, keyword: true },
      { text: "OUTPUT(\"Fail\")", indent: 1 },
      { text: "ENDIF", indent: 0, keyword: true },
    ],
    loop: [
      { text: "total ← 0", indent: 0 },
      { text: "FOR i ← 1 TO 10", indent: 0, keyword: true },
      { text: "total ← total + i", indent: 1 },
      { text: "ENDFOR", indent: 0, keyword: true },
      { text: "OUTPUT(total)", indent: 0 },
    ],
    variable: [
      { text: "age ← 12", indent: 0 },
      { text: "name ← \"Alex\"", indent: 0 },
      { text: "height ← 1.45", indent: 0 },
      { text: "isStudent ← TRUE", indent: 0 },
    ],
    function: [
      { text: "FUNCTION double(n)", indent: 0, keyword: true },
      { text: "RETURN n × 2", indent: 1 },
      { text: "ENDFUNCTION", indent: 0, keyword: true },
      { text: "", indent: 0 },
      { text: "result ← double(5)", indent: 0 },
      { text: "OUTPUT(result)", indent: 0 },
    ],
  };

  const codeLines = lines.length > 0 ? lines : (DEMO_LINES[concept] || DEMO_LINES.sequence);

  const KEYWORD_RE = /\b(IF|THEN|ELSE|ENDIF|FOR|TO|ENDFOR|WHILE|ENDWHILE|FUNCTION|ENDFUNCTION|RETURN|INPUT|OUTPUT|AND|OR|NOT|REPEAT|UNTIL|DO|PROCEDURE|ENDPROCEDURE)\b/g;

  function highlightLine(text) {
    const parts = [];
    let lastIdx = 0;
    let match;
    const re = new RegExp(KEYWORD_RE.source, "g");
    while ((match = re.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push(<span key={lastIdx}>{text.slice(lastIdx, match.index)}</span>);
      }
      parts.push(
        <span key={match.index} style={{ color: T.cyan, fontWeight: 800 }}>
          {match[0]}
        </span>
      );
      lastIdx = re.lastIndex;
    }
    if (lastIdx < text.length) parts.push(<span key={lastIdx}>{text.slice(lastIdx)}</span>);
    return parts;
  }

  return (
    <Panel label={`Code: ${concept}`}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.cyan, letterSpacing: 0.5 }}>
        {language.toUpperCase()} — {concept.toUpperCase().replace("_", " ")}
      </div>
      <div style={{
        background: "#0f172a",
        borderRadius: 10,
        padding: "10px 12px",
        width: "100%",
        maxWidth: 240,
        fontFamily: "'Courier New', monospace",
        fontSize: 10,
        lineHeight: 1.7,
        color: "#e2e8f0",
        overflowX: "auto",
      }}>
        {codeLines.map((line, i) => (
          <div key={i} style={{ paddingLeft: (line.indent || 0) * 16 }}>
            <span style={{ color: "#475569", marginRight: 8, userSelect: "none" }}>
              {String(i + 1).padStart(2, " ")}
            </span>
            {line.text ? highlightLine(line.text) : <br />}
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SORTING VIS — visual representation of sorting algorithms
// ═══════════════════════════════════════════════════════════════════════════════
export function SortingVis({ values = [7, 3, 9, 1, 5, 8, 2, 6], algorithm = "bubble", highlightIdx = [] }) {
  const maxVal = Math.max(...values, 1);
  const W = 220, H = 100, barW = Math.min(22, (W - 20) / values.length - 2);

  const ALGO_LABELS = {
    bubble: "Bubble Sort",
    selection: "Selection Sort",
    insertion: "Insertion Sort",
    merge: "Merge Sort",
    linear: "Linear Search",
    binary: "Binary Search",
  };

  return (
    <Panel label={`${ALGO_LABELS[algorithm] || algorithm}: sorting/searching visualisation`}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.indigo, letterSpacing: 0.5 }}>
        {(ALGO_LABELS[algorithm] || algorithm).toUpperCase()}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 220 }}>
        {values.map((v, i) => {
          const barH = (v / maxVal) * (H - 30);
          const x = 10 + i * (barW + 2);
          const y = H - 10 - barH;
          const isHighlighted = highlightIdx.includes(i);
          return (
            <g key={i} className="vis-sort-bar">
              <rect
                x={x} y={y} width={barW} height={barH}
                rx={3}
                fill={isHighlighted ? T.cyan : T.indigoBg}
                stroke={isHighlighted ? T.cyan : T.indigoBd}
                strokeWidth={1.5}
              />
              <text
                x={x + barW / 2} y={H - 2}
                textAnchor="middle" fontSize={8} fontWeight={700}
                fill={isHighlighted ? T.cyan : T.textMid}
              >
                {v}
              </text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. DATABASE TABLE VIS — tables, fields, records for DB topics
// ═══════════════════════════════════════════════════════════════════════════════
export function DatabaseTableVis({ tableName = "Students", fields = [], records = [] }) {
  const defaultFields = ["ID", "Name", "Age", "Class"];
  const defaultRecords = [
    ["1", "Alex", "12", "7B"],
    ["2", "Sam", "11", "7A"],
    ["3", "Jordan", "12", "7B"],
  ];
  const cols = fields.length > 0 ? fields : defaultFields;
  const rows = records.length > 0 ? records : defaultRecords;

  return (
    <Panel label={`Database table: ${tableName}`}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.indigo, letterSpacing: 0.5 }}>
        TABLE: {tableName.toUpperCase()}
      </div>
      <div style={{
        width: "100%", maxWidth: 240, overflowX: "auto",
        borderRadius: 8, border: `2px solid ${T.indigoBd}`,
      }}>
        <table style={{
          width: "100%", borderCollapse: "collapse",
          fontSize: 10, fontFamily: "monospace",
        }}>
          <thead>
            <tr>
              {cols.map((col, i) => (
                <th key={i} style={{
                  background: T.indigoBg, color: T.indigo,
                  fontWeight: 700, padding: "5px 8px",
                  borderBottom: `2px solid ${T.indigoBd}`,
                  textAlign: "left", whiteSpace: "nowrap",
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{
                    padding: "4px 8px",
                    borderBottom: ri < rows.length - 1 ? "1px solid #e2e8f0" : "none",
                    color: ci === 0 ? T.cyan : T.text,
                    fontWeight: ci === 0 ? 700 : 400,
                    whiteSpace: "nowrap",
                  }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 10, fontSize: 8, color: T.textMid, fontWeight: 600 }}>
        <span>🔑 Primary Key: {cols[0]}</span>
        <span>📋 {rows.length} Records</span>
      </div>
    </Panel>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. HTML/CSS VIS — web development concepts
// ═══════════════════════════════════════════════════════════════════════════════
export function HTMLStructureVis({ tag = "div", children = [] }) {
  const defaultChildren = [
    { tag: "h1", content: "My Page" },
    { tag: "p", content: "Hello world!" },
    { tag: "img", content: "photo.jpg", selfClosing: true },
  ];
  const items = children.length > 0 ? children : defaultChildren;

  const TAG_COLORS = {
    html: T.rose, head: T.amber, body: T.indigo, div: T.indigo,
    h1: T.cyan, h2: T.cyan, h3: T.cyan, p: T.emerald,
    img: T.amber, a: "#7c3aed", ul: T.indigo, li: T.slate,
    span: T.emerald, section: T.indigo, header: T.rose, footer: T.rose,
  };

  function getColor(t) { return TAG_COLORS[t] || T.slate; }

  return (
    <Panel label={`HTML structure: ${tag} element`}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.cyan, letterSpacing: 0.5 }}>
        HTML STRUCTURE
      </div>
      <div style={{
        background: "#0f172a",
        borderRadius: 10,
        padding: "10px 12px",
        width: "100%",
        maxWidth: 240,
        fontFamily: "'Courier New', monospace",
        fontSize: 10,
        lineHeight: 1.8,
        color: "#e2e8f0",
      }}>
        <div>
          <span style={{ color: T.textMid }}>&lt;</span>
          <span style={{ color: getColor(tag), fontWeight: 700 }}>{tag}</span>
          <span style={{ color: T.textMid }}>&gt;</span>
        </div>
        {items.map((child, i) => (
          <div key={i} style={{ paddingLeft: 16 }}>
            <span style={{ color: T.textMid }}>&lt;</span>
            <span style={{ color: getColor(child.tag), fontWeight: 700 }}>{child.tag}</span>
            <span style={{ color: T.textMid }}>&gt;</span>
            {!child.selfClosing && (
              <>
                <span style={{ color: "#fbbf24" }}>{child.content}</span>
                <span style={{ color: T.textMid }}>&lt;/</span>
                <span style={{ color: getColor(child.tag), fontWeight: 700 }}>{child.tag}</span>
                <span style={{ color: T.textMid }}>&gt;</span>
              </>
            )}
          </div>
        ))}
        <div>
          <span style={{ color: T.textMid }}>&lt;/</span>
          <span style={{ color: getColor(tag), fontWeight: 700 }}>{tag}</span>
          <span style={{ color: T.textMid }}>&gt;</span>
        </div>
      </div>
    </Panel>
  );
}
