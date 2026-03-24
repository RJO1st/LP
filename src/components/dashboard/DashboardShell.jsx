"use client";
/**
 * DashboardShell.jsx — v4 REVAMP
 * Deploy to: src/components/dashboard/DashboardShell.jsx
 *
 * Three-panel responsive layout shell used by all 4 age band dashboards.
 * Space-themed with nebula backgrounds, cosmic particles, and dynamic KS theming.
 * Desktop: SideNav (left 260px) + Main Canvas + Right Sidebar (300px)
 * Mobile: No side nav + Main stacked + Bottom tab bar
 */

import React, { useState, useCallback, useEffect, useRef } from "react";

// ── Band-specific nav config ────────────────────────────────────────────────
const NAV_CONFIG = {
  ks1: {
    label: "Celestial Nursery",
    sublabel: "The Weightless Archive",
    accent: "#d4a017",
    accentGlow: "rgba(212,160,23,0.15)",
    accentBg: "rgba(212,160,23,0.08)",
    navBg: "rgba(255,252,243,0.96)",
    bodyBg: "linear-gradient(165deg, #fef9e7 0%, #fdf2d1 30%, #fce8c8 60%, #faf0e4 100%)",
    cardBg: "rgba(255,255,255,0.85)",
    textPrimary: "#3d2e0f",
    textMuted: "rgba(61,46,15,0.45)",
    font: "'Fredoka', 'Nunito', sans-serif",
    items: [
      { icon: "auto_stories", emoji: "🌟", label: "My Adventures", key: "adventure" },
      { icon: "map", emoji: "🗺️", label: "Star Map", key: "galaxy" },
      { icon: "emoji_events", emoji: "🏆", label: "My Trophies", key: "trophies" },
    ],
    cta: { icon: "lock_open", label: "Open Treasure" },
  },
  ks2: {
    label: "Orbital Command",
    sublabel: "Deep Space Operations",
    accent: "#7c83f5",
    accentGlow: "rgba(124,131,245,0.12)",
    accentBg: "rgba(124,131,245,0.08)",
    navBg: "rgba(13,17,36,0.97)",
    bodyBg: "linear-gradient(145deg, #0d1124 0%, #141838 30%, #1a1f4e 60%, #0f1530 100%)",
    cardBg: "rgba(22,28,56,0.7)",
    textPrimary: "#e8eaf6",
    textMuted: "rgba(255,255,255,0.32)",
    dark: true,
    font: "'Nunito', sans-serif",
    items: [
      { icon: "rocket_launch", emoji: "🚀", label: "Missions", key: "mission" },
      { icon: "public", emoji: "🪐", label: "Galaxy Map", key: "galaxy" },
      { icon: "military_tech", emoji: "🏅", label: "Medals", key: "trophies" },
      { icon: "leaderboard", emoji: "📊", label: "Rankings", key: "stats" },
    ],
    cta: { icon: "rocket_launch", label: "Launch Mission" },
  },
  ks3: {
    label: "LaunchPad",
    sublabel: "Career Simulator",
    accent: "#5b6abf",
    accentGlow: "rgba(91,106,191,0.1)",
    accentBg: "rgba(91,106,191,0.06)",
    navBg: "rgba(248,250,255,0.97)",
    bodyBg: "#f5f7fc",
    cardBg: "rgba(255,255,255,0.95)",
    textPrimary: "#1a1d2e",
    textMuted: "rgba(26,29,46,0.4)",
    font: "'DM Sans', 'Inter', sans-serif",
    items: [
      { icon: "assignment", emoji: "📋", label: "Challenges", key: "mission" },
      { icon: "explore", emoji: "🧭", label: "Explore", key: "galaxy" },
      { icon: "insights", emoji: "📈", label: "Progress", key: "stats" },
      { icon: "work", emoji: "💼", label: "Careers", key: "careers" },
    ],
    cta: { icon: "bolt", label: "Start Challenge" },
  },
  ks4: {
    label: "KS4 Exam Studio",
    sublabel: "Precision Command",
    accent: "#00e5c3",
    accentGlow: "rgba(0,229,195,0.08)",
    accentBg: "rgba(0,229,195,0.06)",
    navBg: "rgba(10,14,28,0.98)",
    bodyBg: "linear-gradient(160deg, #0a0e1c 0%, #111628 40%, #0d1120 100%)",
    cardBg: "rgba(18,24,44,0.8)",
    textPrimary: "#e0e6f0",
    textMuted: "rgba(255,255,255,0.28)",
    dark: true,
    font: "'JetBrains Mono', 'IBM Plex Mono', monospace",
    items: [
      { icon: "quiz", emoji: "📝", label: "Revision", key: "exams" },
      { icon: "analytics", emoji: "🎯", label: "Grade Tracker", key: "heatmap" },
      { icon: "smart_toy", emoji: "🤖", label: "Tara AI", key: "tutor" },
    ],
    cta: { icon: "play_arrow", label: "Start Revision" },
  },
};

// ── Material icon helper ────────────────────────────────────────────────────
function MIcon({ name, filled, size = 24, className = "", style = {} }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: filled
          ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
          : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        ...style,
      }}
    >
      {name}
    </span>
  );
}

export { MIcon, NAV_CONFIG };

// ── Scroll to section helper ────────────────────────────────────────────────
function scrollToSection(key) {
  const el = document.getElementById(`section-${key}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Cosmic particle field (subtle ambient effect) ───────────────────────────
function CosmicParticles({ band }) {
  const cfg = NAV_CONFIG[band];
  if (!cfg?.dark) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: Math.random() * 2 + 1,
          height: Math.random() * 2 + 1,
          background: cfg.accent,
          borderRadius: "50%",
          opacity: Math.random() * 0.3 + 0.05,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `cosmic-drift ${12 + Math.random() * 20}s linear infinite`,
          animationDelay: `${Math.random() * -20}s`,
        }} />
      ))}
    </div>
  );
}

// ── Side Navigation ─────────────────────────────────────────────────────────
function SideNav({ band, activeTab, onTabChange, scholarName, onStartQuest }) {
  const cfg = NAV_CONFIG[band] || NAV_CONFIG.ks2;
  const isDark = cfg.dark;

  return (
    <aside
      className="hidden lg:flex flex-col h-screen w-[260px] fixed left-0 top-0 z-50 py-6 px-4"
      style={{
        background: cfg.navBg,
        borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)"}`,
        backdropFilter: "blur(20px)",
        fontFamily: cfg.font,
      }}
    >
      {/* Brand */}
      <div className="mb-10 px-3">
        <div className="flex items-center gap-3 mb-1">
          {band === "ks1" && <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: cfg.accentBg }}><MIcon name="auto_awesome" filled size={18} style={{ color: cfg.accent }} /></div>}
          {band === "ks2" && <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,131,245,0.15)" }}><MIcon name="rocket_launch" filled size={16} style={{ color: cfg.accent }} /></div>}
          {band === "ks3" && <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: cfg.accentBg }}><MIcon name="terminal" size={16} style={{ color: cfg.accent }} /></div>}
          {band === "ks4" && <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: cfg.accentBg }}><MIcon name="precision_manufacturing" size={16} style={{ color: cfg.accent }} /></div>}
          <h1 className="text-base font-bold tracking-tight" style={{ color: isDark ? "#fff" : cfg.textPrimary }}>
            {cfg.label}
          </h1>
        </div>
        <p className="text-[9px] uppercase tracking-[0.2em] font-bold ml-11"
          style={{ color: cfg.textMuted }}>{cfg.sublabel}</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 px-1">
        {cfg.items.map((item) => {
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => { onTabChange(item.key); scrollToSection(item.key); }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200"
              style={{
                background: active ? cfg.accentBg : "transparent",
                color: active ? (isDark ? "#fff" : cfg.accent) : cfg.textMuted,
                borderLeft: active ? `3px solid ${cfg.accent}` : "3px solid transparent",
                letterSpacing: band === "ks4" ? "0.03em" : "0",
              }}
            >
              {item.emoji ? (
                <span className="text-base w-5 text-center shrink-0">{item.emoji}</span>
              ) : (
                <MIcon name={item.icon} filled={active} size={20} />
              )}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Scholar identity */}
      <div className="mt-auto px-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
          style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black"
            style={{ background: `${cfg.accent}18`, color: cfg.accent }}>
            {(scholarName || "S")[0].toUpperCase()}
          </div>
          <p className="text-xs font-bold truncate flex-1"
            style={{ color: isDark ? "rgba(255,255,255,0.7)" : cfg.textPrimary }}>
            {scholarName || "Scholar"}
          </p>
        </div>
      </div>
    </aside>
  );
}

// ── Bottom Tab Bar (mobile) ─────────────────────────────────────────────────
function BottomTabs({ band, activeTab, onTabChange }) {
  const cfg = NAV_CONFIG[band] || NAV_CONFIG.ks2;
  const isDark = cfg.dark;

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-2 pb-6 pt-3 z-50"
      style={{
        background: isDark ? "rgba(10,14,28,0.95)" : "rgba(255,255,255,0.95)",
        backdropFilter: "blur(20px)",
        borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)"}`,
      }}
    >
      {cfg.items.slice(0, 4).map((item) => {
        const active = activeTab === item.key;
        return (
          <button
            key={item.key}
            onClick={() => { onTabChange(item.key); scrollToSection(item.key); }}
            className="flex flex-col items-center justify-center rounded-xl transition-all"
            style={{
              color: active ? cfg.accent : cfg.textMuted,
              background: active ? cfg.accentBg : "transparent",
              padding: "6px 12px",
              minWidth: 64,
            }}
          >
            <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {item.emoji ? (
                <span style={{ fontSize: 18, lineHeight: 1 }}>{item.emoji}</span>
              ) : (
                <MIcon name={item.icon} filled={active} size={22} />
              )}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-[0.06em] mt-1" style={{ lineHeight: 1 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Main Shell ──────────────────────────────────────────────────────────────
export default function DashboardShell({
  band = "ks2",
  scholarName,
  activeTab,
  onTabChange,
  onSignOut,
  onStartQuest,
  mainContent,
  rightSidebar,
  topBarLeft,
  topBarRight,
}) {
  const cfg = NAV_CONFIG[band] || NAV_CONFIG.ks2;
  const isDark = cfg.dark;
  const [showRightPanel, setShowRightPanel] = useState(false);

  return (
    <div className="dashboard-shell min-h-screen relative" style={{ background: cfg.bodyBg, fontFamily: cfg.font }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <CosmicParticles band={band} />

      <SideNav band={band} activeTab={activeTab} onTabChange={onTabChange}
        scholarName={scholarName} onStartQuest={onStartQuest} />

      {/* Top Bar */}
      <header
        className="fixed top-0 right-0 z-40 flex justify-between items-center px-4 lg:px-8 h-14"
        style={{
          left: "0",
          paddingLeft: undefined, /* handled by responsive classes */
          background: isDark ? "rgba(10,14,28,0.85)" : "rgba(255,255,255,0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)"}`,
          fontFamily: cfg.font,
        }}
      >
        <div className="lg:hidden flex items-center gap-2">
          <span className="text-base font-bold tracking-tight" style={{ color: cfg.accent }}>{cfg.label}</span>
        </div>
        <div className="hidden lg:flex items-center" style={{ marginLeft: "260px" }}>{topBarLeft}</div>
        <div className="flex items-center gap-3">
          {topBarRight}
          <button onClick={onSignOut}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: cfg.textMuted }} title="Sign out">
            <MIcon name="logout" size={20} />
          </button>
          <button onClick={() => setShowRightPanel(!showRightPanel)}
            className="xl:hidden p-2 rounded-lg transition-colors"
            style={{ color: cfg.textMuted }}>
            <MIcon name={showRightPanel ? "close" : "smart_toy"} size={20} />
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="pt-14 pb-20 lg:pb-0 lg:ml-[260px] relative z-10" style={{ minHeight: "100vh", background: "transparent" }}>
        <div className="flex min-h-[calc(100vh-3.5rem)]">
          <main className="flex-1 px-3 py-1 lg:px-5 lg:py-1.5 overflow-y-auto">{mainContent}</main>

          {rightSidebar && (
            <aside className={`
              fixed xl:static right-0 top-14 bottom-0 w-[300px] xl:w-[300px] z-30
              border-l overflow-y-auto transition-transform duration-300
              ${showRightPanel ? "translate-x-0" : "translate-x-full xl:translate-x-0"}
            `}
            style={{
              background: isDark ? "rgba(10,14,28,0.96)" : "rgba(248,250,255,0.96)",
              borderColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
              backdropFilter: "blur(20px)",
              borderTopLeftRadius: 20,
              borderBottomLeftRadius: 20,
            }}>
              <div className="p-5 space-y-5">{rightSidebar}</div>
            </aside>
          )}
        </div>
      </div>

      <BottomTabs band={band} activeTab={activeTab} onTabChange={onTabChange} />

      <style>{`
        @keyframes cosmic-drift {
          0% { transform: translateY(0) translateX(0); opacity: 0.1; }
          50% { opacity: 0.3; }
          100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
        }
        /* Prevent white bleed at bottom/edges of dashboards */
        html, body, #__next { min-height: 100vh; margin: 0; padding: 0; }
        html { background: ${cfg.dark ? "#0a0e1c" : "#fef9e7"} !important; }
        body { background: ${cfg.bodyBg} !important; min-height: 100vh; background-attachment: fixed; background-color: ${cfg.dark ? "#0a0e1c" : "#fef9e7"} !important; }
        #__next { min-height: 100vh; background: transparent !important; }
      `}</style>
    </div>
  );
}