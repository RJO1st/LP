"use client";
/**
 * HumanitiesVisuals.jsx — Visual components for humanities & vocational subjects
 *
 * Covers: Civic Education, Religious Studies, Social Studies, Government,
 *         Economics (extended), Design & Technology, Cultural/Creative Arts,
 *         Agricultural Science, Further Mathematics, Pre-Vocational Studies,
 *         Business Education, Canadian History
 *
 * Each component is self-contained with inline styles for consistency.
 */
import React from "react";

const CARD = {
  borderRadius: 14, padding: "16px 18px",
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
};
const LABEL = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.5 };
const TITLE = { fontSize: 15, fontWeight: 800, marginBottom: 8 };

// ── Civic Education: Rights & Responsibilities, Government Structure ────────
export function CivicEducationVis({ topic = "rights", items = [] }) {
  const presets = {
    rights: {
      title: "Rights & Responsibilities",
      color: "#60a5fa",
      pairs: [
        { right: "Right to Education", duty: "Attend school regularly" },
        { right: "Right to Vote", duty: "Participate in elections" },
        { right: "Right to Life", duty: "Respect others' lives" },
        { right: "Freedom of Speech", duty: "Speak responsibly" },
      ],
    },
    values: {
      title: "National Values",
      color: "#34d399",
      pairs: [
        { right: "Honesty", duty: "Be truthful in all dealings" },
        { right: "Integrity", duty: "Do the right thing always" },
        { right: "Discipline", duty: "Follow rules and guidelines" },
        { right: "Unity", duty: "Work together for common good" },
      ],
    },
    citizenship: {
      title: "Good Citizenship",
      color: "#fbbf24",
      pairs: [
        { right: "Obey laws", duty: "Legal obligation" },
        { right: "Pay taxes", duty: "Civic duty" },
        { right: "Vote", duty: "Democratic right" },
        { right: "Serve the nation", duty: "Patriotic duty" },
      ],
    },
  };

  const data = presets[topic] || presets.rights;
  const displayItems = items.length > 0 ? items : data.pairs;

  return (
    <div style={{ ...CARD, borderColor: `${data.color}30` }}>
      <div style={{ ...LABEL, color: data.color }}>Civic Education</div>
      <div style={{ ...TITLE, color: data.color }}>{data.title}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {displayItems.map((p, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px", borderRadius: 10,
            background: `${data.color}08`, border: `1px solid ${data.color}15`,
          }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${data.color}20`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, color: data.color, flexShrink: 0 }}>
              {i + 1}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{p.right}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{p.duty}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Government Structure Vis ────────────────────────────────────────────────
export function GovernmentVis({ system = "three_arms" }) {
  const systems = {
    three_arms: {
      title: "Arms of Government",
      color: "#a78bfa",
      items: [
        { name: "Legislature", role: "Makes laws", icon: "📜" },
        { name: "Executive", role: "Implements laws", icon: "🏛️" },
        { name: "Judiciary", role: "Interprets laws", icon: "⚖️" },
      ],
    },
    tiers: {
      title: "Tiers of Government",
      color: "#f472b6",
      items: [
        { name: "Federal", role: "National governance", icon: "🇳🇬" },
        { name: "State", role: "State-level administration", icon: "🏢" },
        { name: "Local", role: "Grassroots governance", icon: "🏘️" },
      ],
    },
    democracy: {
      title: "Features of Democracy",
      color: "#22d3ee",
      items: [
        { name: "Free Elections", role: "Citizens choose leaders", icon: "🗳️" },
        { name: "Rule of Law", role: "Everyone equal before law", icon: "⚖️" },
        { name: "Fundamental Rights", role: "Protected liberties", icon: "🛡️" },
        { name: "Press Freedom", role: "Independent media", icon: "📰" },
      ],
    },
  };

  const data = systems[system] || systems.three_arms;

  return (
    <div style={{ ...CARD, borderColor: `${data.color}30` }}>
      <div style={{ ...LABEL, color: data.color }}>Government</div>
      <div style={{ ...TITLE, color: data.color }}>{data.title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.items.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", borderRadius: 10,
            background: `${data.color}08`, border: `1px solid ${data.color}15`,
          }}>
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{item.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{item.role}</div>
            </div>
          </div>
        ))}
      </div>
      {data.items.length === 3 && (
        <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: `${data.color}60`, fontWeight: 600 }}>
          Separation of Powers — checks & balances
        </div>
      )}
    </div>
  );
}

// ── Religious Studies: World Religions Overview ─────────────────────────────
export function ReligiousStudiesVis({ religion = "overview" }) {
  const religions = {
    overview: {
      title: "Major World Religions",
      color: "#fbbf24",
      items: [
        { name: "Christianity", symbol: "✝️", followers: "2.4B", book: "Bible" },
        { name: "Islam", symbol: "☪️", followers: "1.9B", book: "Quran" },
        { name: "Hinduism", symbol: "🕉️", followers: "1.2B", book: "Vedas" },
        { name: "Buddhism", symbol: "☸️", followers: "500M", book: "Tripitaka" },
      ],
    },
    christianity: {
      title: "Christianity",
      color: "#60a5fa",
      items: [
        { name: "Old Testament", symbol: "📖", followers: "39 Books", book: "Law & Prophecy" },
        { name: "New Testament", symbol: "📘", followers: "27 Books", book: "Gospel & Letters" },
        { name: "Ten Commandments", symbol: "📜", followers: "Moral Law", book: "Exodus 20" },
      ],
    },
    islam: {
      title: "Islam",
      color: "#34d399",
      items: [
        { name: "Five Pillars", symbol: "🕌", followers: "Core Practice", book: "Shahada to Hajj" },
        { name: "Quran", symbol: "📗", followers: "114 Surahs", book: "Holy Book" },
        { name: "Prophet Muhammad", symbol: "☪️", followers: "PBUH", book: "Final Messenger" },
      ],
    },
  };

  const data = religions[religion] || religions.overview;

  return (
    <div style={{ ...CARD, borderColor: `${data.color}30` }}>
      <div style={{ ...LABEL, color: data.color }}>Religious Studies</div>
      <div style={{ ...TITLE, color: data.color }}>{data.title}</div>
      <div style={{ display: "grid", gridTemplateColumns: data.items.length === 4 ? "1fr 1fr" : "1fr", gap: 8 }}>
        {data.items.map((r, i) => (
          <div key={i} style={{
            padding: "10px 12px", borderRadius: 10, textAlign: "center",
            background: `${data.color}08`, border: `1px solid ${data.color}15`,
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{r.symbol}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{r.name}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{r.book}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Design & Technology: Process Diagram ────────────────────────────────────
export function DesignTechVis({ process = "design_cycle" }) {
  const processes = {
    design_cycle: {
      title: "Design Process",
      color: "#f472b6",
      steps: ["Identify Need", "Research", "Design", "Make", "Test", "Evaluate"],
    },
    materials: {
      title: "Material Properties",
      color: "#fb923c",
      steps: ["Hardness", "Strength", "Flexibility", "Durability", "Conductivity", "Aesthetics"],
    },
    food_safety: {
      title: "Food Safety",
      color: "#34d399",
      steps: ["Wash Hands", "Check Dates", "Store Correctly", "Cook Thoroughly", "Avoid Cross-contamination", "Serve Safely"],
    },
  };

  const data = processes[process] || processes.design_cycle;

  return (
    <div style={{ ...CARD, borderColor: `${data.color}30` }}>
      <div style={{ ...LABEL, color: data.color }}>Design & Technology</div>
      <div style={{ ...TITLE, color: data.color }}>{data.title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
        {data.steps.map((step, i) => (
          <React.Fragment key={i}>
            <div style={{
              padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: `${data.color}15`, color: data.color,
              border: `1px solid ${data.color}25`,
            }}>
              {step}
            </div>
            {i < data.steps.length - 1 && (
              <div style={{ display: "flex", alignItems: "center", color: `${data.color}40`, fontSize: 14 }}>→</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Agricultural Science: Farming / Soil / Crop ─────────────────────────────
export function AgricultureVis({ topic = "soil_types" }) {
  const topics = {
    soil_types: {
      title: "Soil Types",
      color: "#a3866a",
      items: [
        { name: "Sandy", desc: "Large particles, drains fast", pct: "Low nutrients" },
        { name: "Clay", desc: "Tiny particles, holds water", pct: "Rich nutrients" },
        { name: "Loam", desc: "Perfect mix — best for farming", pct: "Balanced" },
        { name: "Silt", desc: "Fine particles, fertile", pct: "Medium drainage" },
      ],
    },
    crop_rotation: {
      title: "Crop Rotation",
      color: "#22c55e",
      items: [
        { name: "Year 1 — Legumes", desc: "Fix nitrogen in soil", pct: "Beans, peas" },
        { name: "Year 2 — Cereals", desc: "Use stored nitrogen", pct: "Maize, wheat" },
        { name: "Year 3 — Root Crops", desc: "Break up soil", pct: "Cassava, yam" },
        { name: "Year 4 — Fallow", desc: "Rest and recover", pct: "Cover crops" },
      ],
    },
    farm_tools: {
      title: "Farm Tools & Uses",
      color: "#fb923c",
      items: [
        { name: "Cutlass", desc: "Clearing bush and weeds", pct: "Manual tool" },
        { name: "Hoe", desc: "Tilling and making ridges", pct: "Manual tool" },
        { name: "Plough", desc: "Turning and loosening soil", pct: "Mechanical" },
        { name: "Harvester", desc: "Gathering mature crops", pct: "Mechanical" },
      ],
    },
  };

  const data = topics[topic] || topics.soil_types;

  return (
    <div style={{ ...CARD, borderColor: `${data.color}30` }}>
      <div style={{ ...LABEL, color: data.color }}>Agricultural Science</div>
      <div style={{ ...TITLE, color: data.color }}>{data.title}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {data.items.map((item, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 12px", borderRadius: 10,
            background: `${data.color}08`, border: `1px solid ${data.color}15`,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{item.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{item.desc}</div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: data.color, flexShrink: 0 }}>{item.pct}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Economics: Macro Concepts ────────────────────────────────────────────────
export function EconomicsVis({ concept = "inflation" }) {
  const concepts = {
    inflation: {
      title: "Inflation",
      color: "#ef4444",
      desc: "General rise in price level over time",
      factors: ["Excess money supply", "Demand-pull", "Cost-push", "Imported inflation"],
    },
    demand_supply: {
      title: "Demand & Supply",
      color: "#22d3ee",
      desc: "Market forces that determine price",
      factors: ["Price ↑ → Demand ↓", "Price ↓ → Demand ↑", "Price ↑ → Supply ↑", "Equilibrium at intersection"],
    },
    gdp: {
      title: "GDP Components",
      color: "#34d399",
      desc: "Gross Domestic Product = C + I + G + (X − M)",
      factors: ["Consumption (C)", "Investment (I)", "Government Spending (G)", "Net Exports (X−M)"],
    },
  };

  const data = concepts[concept] || concepts.inflation;

  return (
    <div style={{ ...CARD, borderColor: `${data.color}30` }}>
      <div style={{ ...LABEL, color: data.color }}>Economics</div>
      <div style={{ ...TITLE, color: data.color }}>{data.title}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>{data.desc}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {data.factors.map((f, i) => (
          <div key={i} style={{
            padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: `${data.color}10`, color: "rgba(255,255,255,0.7)",
            borderLeft: `3px solid ${data.color}`,
          }}>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Generic Topic Card (fallback for any subject without a specific visual) ─
export function TopicCardVis({ subject = "", topic = "", color = "#a78bfa", points = [] }) {
  const displayPoints = points.length > 0 ? points : [
    "Review the key concepts",
    "Apply knowledge to the question",
    "Consider all options carefully",
  ];

  return (
    <div style={{ ...CARD, borderColor: `${color}30` }}>
      <div style={{ ...LABEL, color }}>{subject}</div>
      <div style={{ ...TITLE, color }}>{topic || "Key Concepts"}</div>
      <div style={{ display: "grid", gap: 6 }}>
        {displayPoints.map((p, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 12px", borderRadius: 8,
            background: `${color}08`, fontSize: 12, color: "rgba(255,255,255,0.6)",
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, color, opacity: 0.7 }}>●</span>
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}
