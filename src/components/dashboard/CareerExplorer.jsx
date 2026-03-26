"use client";
/**
 * CareerExplorer.jsx
 * Deploy to: src/components/dashboard/CareerExplorer.jsx
 *
 * Always-visible KS3 career exploration panel showing how topics
 * connect to real-world careers. Used as the `data-section="careers"`
 * anchor so the nav link always works.
 */

import React, { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

const CAREER_DATA = {
  forces: { career: "Mechanical Engineer", icon: "🔧", hook: "Engineers use forces to design bridges, rockets, and roller coasters." },
  percentages: { career: "Finance Analyst", icon: "📊", hook: "Finance analysts use percentages every day to track market performance." },
  algebra: { career: "Software Developer", icon: "💻", hook: "Developers use algebra to write algorithms that power apps and games." },
  persuasive_writing: { career: "Barrister", icon: "⚖️", hook: "Lawyers use persuasive writing to win cases in court." },
  probability: { career: "Game Designer", icon: "🎮", hook: "Game designers use probability to balance difficulty and rewards." },
  genetics: { career: "Doctor", icon: "🩺", hook: "Doctors use genetics to diagnose conditions and develop treatments." },
  data_handling: { career: "Data Scientist", icon: "📈", hook: "Data scientists use statistics to find patterns in millions of records." },
  electricity: { career: "Electrical Engineer", icon: "⚡", hook: "Electrical engineers design the circuits in your phone and laptop." },
  chemical_reactions: { career: "Pharmacist", icon: "💊", hook: "Pharmacists use chemistry to develop medicines that save lives." },
  ecology: { career: "Environmental Scientist", icon: "🌿", hook: "Environmental scientists study ecosystems to protect endangered species." },
  multiplication: { career: "Game Designer", icon: "🎲", hook: "Game designers use multiplication for damage, loot drops, and XP scaling." },
  fractions: { career: "Chef", icon: "👨‍🍳", hook: "Chefs use fractions every day — half a cup, quarter teaspoon, two-thirds of a recipe." },
  addition: { career: "Shopkeeper", icon: "🏪", hook: "Shopkeepers use addition to count money and give the right change." },
  subtraction: { career: "Pilot", icon: "✈️", hook: "Pilots use subtraction to calculate how much fuel is left for landing." },
  division: { career: "Chef", icon: "🍕", hook: "Pizza chefs use division to cut pizzas into equal slices for everyone." },
  ratios: { career: "Architect", icon: "🏗️", hook: "Architects use ratios to scale drawings into actual buildings." },
  angles: { career: "Surveyor", icon: "📐", hook: "Surveyors measure angles to map land and plan construction sites." },
  area: { career: "Interior Designer", icon: "🏠", hook: "Interior designers calculate area to plan furniture layouts." },
  volume: { career: "Chemical Engineer", icon: "🧪", hook: "Chemical engineers measure volume to mix solutions precisely." },
  graphs: { career: "Economist", icon: "📉", hook: "Economists read graphs to spot trends and predict market changes." },
  coordinates: { career: "Cartographer", icon: "🗺️", hook: "Cartographers use coordinates to create maps that guide people worldwide." },
  photosynthesis: { career: "Agricultural Scientist", icon: "🌾", hook: "Agricultural scientists study photosynthesis to grow better crops." },
  evolution: { career: "Palaeontologist", icon: "🦕", hook: "Palaeontologists study evolution to understand how life changed over millions of years." },
  atoms: { career: "Nuclear Physicist", icon: "⚛️", hook: "Nuclear physicists study atoms to develop clean energy sources." },
  light: { career: "Optometrist", icon: "👁️", hook: "Optometrists understand light to prescribe glasses and treat eye conditions." },
  sound: { career: "Audio Engineer", icon: "🎧", hook: "Audio engineers use the science of sound to produce music and films." },
};

export default function CareerExplorer({ topics = [], activeSubject }) {
  const { theme: t } = useTheme();
  const [expanded, setExpanded] = useState(false);

  // Match available topics with career data
  const matched = topics
    .filter(tp => tp.subject === activeSubject || !activeSubject)
    .map(tp => {
      const key = (tp.slug || tp.label || "").toLowerCase().replace(/\s+/g, "_");
      const data = CAREER_DATA[key];
      if (!data) return null;
      return { ...data, topic: tp.label || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), mastery: tp.mastery || 0, key };
    })
    .filter(Boolean);

  // Also add any unmatched career items for display
  const topicKeys = topics.map(tp => (tp.slug || tp.label || "").toLowerCase().replace(/\s+/g, "_"));
  const extra = Object.entries(CAREER_DATA)
    .filter(([k]) => !topicKeys.includes(k))
    .map(([k, v]) => ({ ...v, topic: k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), mastery: 0, key: k }));

  const allCareers = [...matched, ...(expanded ? extra.slice(0, 6) : [])];
  const displayCareers = expanded ? allCareers : allCareers.slice(0, 4);

  if (displayCareers.length === 0) {
    // Fallback: show a selection from CAREER_DATA
    const fallback = Object.entries(CAREER_DATA).slice(0, 4).map(([k, v]) => ({
      ...v, topic: k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), mastery: 0, key: k,
    }));
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {fallback.map(c => (
            <CareerCard key={c.key} career={c} theme={t} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {displayCareers.map(c => (
          <CareerCard key={c.key} career={c} theme={t} />
        ))}
      </div>
      {(matched.length + extra.length) > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            marginTop: 12, padding: "6px 16px", borderRadius: 8,
            background: "transparent", border: "1.5px solid rgba(91,106,191,0.15)",
            color: "#5b6abf", fontSize: 11, fontWeight: 700,
            cursor: "pointer", fontFamily: t.fonts.body,
          }}
        >
          {expanded ? "Show less" : `Explore ${matched.length + extra.length - 4} more careers`}
        </button>
      )}
    </div>
  );
}

function CareerCard({ career, theme: t }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(14,165,233,0.04), rgba(91,106,191,0.04))",
      border: "1px solid rgba(91,106,191,0.1)",
      borderRadius: 12, padding: 14,
      transition: "all 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 20 }}>{career.icon}</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1a1d2e", fontFamily: t.fonts.display, lineHeight: 1.2 }}>
            {career.career}
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            uses {career.topic}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "rgba(26,29,46,0.6)", lineHeight: 1.5, fontFamily: t.fonts.body }}>
        {career.hook}
      </div>
      {career.mastery > 0 && (
        <div style={{
          marginTop: 8, height: 3, borderRadius: 2, background: "rgba(91,106,191,0.08)", overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${Math.round(career.mastery * 100)}%`,
            background: "linear-gradient(90deg, #0ea5e9, #5b6abf)",
          }} />
        </div>
      )}
    </div>
  );
}
