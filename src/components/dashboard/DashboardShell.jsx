"use client";
/**
 * DashboardShell.jsx — v5 PREMIUM BAND REDESIGN
 * Deploy to: src/components/dashboard/DashboardShell.jsx
 *
 * Premium band-specific redesign: each KS band feels like a COMPLETELY DIFFERENT product.
 * Desktop: SideNav (left 260px) + Main Canvas + Right Sidebar (300px)
 * Mobile: No side nav + Main stacked + Bottom tab bar
 * Kept exact same API and exports for backward compatibility.
 */

import React, { useState, useCallback, useEffect, useRef, useLayoutEffect } from "react";

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
    dark: false,
    navRadius: "28px",
    navItemHeight: 48,
    items: [
      { icon: "auto_stories", emoji: "🌟", label: "My Adventures", key: "adventure" },
      { icon: "map", emoji: "🗺️", label: "Treasure Map", key: "galaxy" },
      { icon: "emoji_events", emoji: "🏆", label: "My Trophies", key: "trophies" },
    ],
    cta: { icon: "lock_open", label: "Open Treasure" },
  },
  ks2: {
    label: "Orbital Command",
    sublabel: "Deep Space Operations",
    accent: "#6366f1",
    accentGlow: "rgba(99,102,241,0.12)",
    accentBg: "rgba(99,102,241,0.06)",
    navBg: "rgba(255,252,248,0.97)",
    bodyBg: "linear-gradient(165deg, #fef7ed 0%, #fef3e2 30%, #fdf2d1 50%, #fef9f0 100%)",
    cardBg: "rgba(255,255,255,0.9)",
    textPrimary: "#1e1b4b",
    textMuted: "#7c6fdb",
    dark: false,
    font: "'Nunito', sans-serif",
    navRadius: "20px",
    navItemHeight: 44,
    items: [
      { icon: "rocket_launch", emoji: "🚀", label: "Missions", key: "mission" },
      { icon: "public", emoji: "🪐", label: "Galaxy Map", key: "galaxy" },
      { icon: "calculate", emoji: "✖️", label: "Nebula Trials", desc: "Times Table", key: "nebula-trials", action: "nebula-trials" },
      { icon: "leaderboard", emoji: "📊", label: "Key Stats", key: "stats" },
      { icon: "military_tech", emoji: "🏅", label: "Medals", key: "trophies" },
    ],
    cta: { icon: "rocket_launch", label: "Launch Mission" },
  },
  ks3: {
    label: "Career Simulator",
    sublabel: "Career Simulator",
    accent: "#5b6abf",
    accentGlow: "rgba(91,106,191,0.1)",
    accentBg: "rgba(91,106,191,0.06)",
    navBg: "rgba(12,15,26,0.95)",
    bodyBg: "#0c0f1a",
    cardBg: "rgba(255,255,255,0.04)",
    textPrimary: "#e2e8f0",
    textMuted: "rgba(148,163,184,0.5)",
    font: "'DM Sans', 'JetBrains Mono', 'Inter', sans-serif",
    dark: true,
    navRadius: "12px",
    navItemHeight: 40,
    items: [
      { icon: "assignment", emoji: "📋", label: "Challenges", key: "mission" },
      { icon: "insights", emoji: "📈", label: "Radar", key: "stats" },
      { icon: "explore", emoji: "🧭", label: "Navigation", key: "galaxy" },
      { icon: "work", emoji: "💼", label: "Careers", key: "careers" },
      { icon: "quiz", emoji: "📝", label: "Practice Exams", key: "exam-papers", action: "exam-papers" },
    ],
    cta: { icon: "bolt", label: "Start Challenge" },
  },
  ks4: {
    label: "Zenith Station",
    sublabel: "Peak Operations",
    accent: "#8b5cf6",
    accentGlow: "rgba(139,92,246,0.10)",
    accentBg: "rgba(139,92,246,0.06)",
    navBg: "rgba(10,10,20,0.95)",
    bodyBg: "#0a0a14",
    cardBg: "rgba(18,16,32,0.7)",
    textPrimary: "#eee8ff",
    textMuted: "rgba(196,181,253,0.65)",
    dark: true,
    font: "'DM Sans', 'IBM Plex Mono', 'Inter', sans-serif",
    navRadius: "10px",
    navItemHeight: 36,
    items: [
      { icon: "school", emoji: "🎓", label: "Exam Mastery", key: "exams" },
      { icon: "description", emoji: "📝", label: "Exam Papers", key: "exam-papers", action: "exam-papers" },
      { icon: "insights", emoji: "📈", label: "Telemetry", key: "stats" },
      { icon: "psychology", emoji: "🧠", label: "Star Chart", key: "heatmap" },
      { icon: "assignment", emoji: "📋", label: "Simulation Bay", key: "tutor" },
    ],
    cta: { icon: "play_arrow", label: "Launch Deep Space" },
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
  // Try exact anchor first, then data-section attribute, then scroll to top
  const el = document.getElementById(`section-${key}`)
    || document.querySelector(`[data-section="${key}"]`);
  if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  // Fallback: scroll main content to top
  const main = document.querySelector(".dashboard-shell main");
  if (main) main.scrollTo({ top: 0, behavior: "smooth" });
}

// ── Tech grid background (KS3/KS4) ──────────────────────────────────────────
function TechGridBg({ band }) {
  const cfg = NAV_CONFIG[band];
  if (!cfg?.dark) return null;

  const gridColor = band === "ks3" ? "rgba(91,106,191,0.03)" : "rgba(139,92,246,0.02)";

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
      style={{
        background: `repeating-linear-gradient(
          0deg,
          ${gridColor} 0px,
          ${gridColor} 1px,
          transparent 1px,
          transparent 40px
        ),
        repeating-linear-gradient(
          90deg,
          ${gridColor} 0px,
          ${gridColor} 1px,
          transparent 1px,
          transparent 40px
        )`,
      }}
    />
  );
}

// ── Cosmic particle field (KS1/KS2) ──────────────────────────────────────────
function CosmicParticles({ band }) {
  const cfg = NAV_CONFIG[band];
  if (cfg?.dark) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: Math.random() * 2 + 0.5,
          height: Math.random() * 2 + 0.5,
          background: cfg.accent,
          borderRadius: "50%",
          opacity: Math.random() * 0.2 + 0.03,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animation: `cosmic-drift ${15 + Math.random() * 25}s linear infinite`,
          animationDelay: `${Math.random() * -25}s`,
        }} />
      ))}
    </div>
  );
}

// ── Side Navigation ─────────────────────────────────────────────────────────
function SideNav({ band, activeTab, onTabChange, scholarName, onStartQuest, onAction, navItems }) {
  const cfg = NAV_CONFIG[band] || NAV_CONFIG.ks2;
  const isDark = cfg.dark;
  const items = navItems || cfg.items;

  // KS3/KS4 specific styles
  const isKS3 = band === "ks3";
  const isKS4 = band === "ks4";
  const isKS1 = band === "ks1";

  return (
    <aside
      className="hidden lg:flex flex-col h-screen w-[260px] fixed left-0 top-0 z-50 py-6 px-4"
      style={{
        background: cfg.navBg,
        borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)"}`,
        backdropFilter: isDark ? "blur(30px)" : "blur(20px)",
        fontFamily: cfg.font,
        ...(isDark && { boxShadow: `inset -1px 0 0 ${isDark ? "rgba(255,255,255,0.02)" : "none"}` }),
      }}
    >
      {/* Brand */}
      <div className="mb-10 px-3">
        <div className="flex items-center gap-3 mb-1">
          {isKS1 && (
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: cfg.accentBg, fontSize: 20, lineHeight: 1 }}
            >
              ✨
            </div>
          )}
          {band === "ks2" && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.15)", fontSize: 16, lineHeight: 1 }}
            >
              🚀
            </div>
          )}
          {isKS3 && (
            <div
              className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 font-bold"
              style={{
                background: cfg.accentBg,
                border: `1px solid ${cfg.accent}40`,
                color: cfg.accent,
                fontSize: 11,
                letterSpacing: "-0.02em",
              }}
            >
              {"</>"}
            </div>
          )}
          {isKS4 && (
            <div
              className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
              style={{
                background: cfg.accentBg,
                border: `1px solid ${cfg.accent}30`,
                color: cfg.accent,
                fontSize: 13,
                lineHeight: 1,
              }}
            >
              ◆
            </div>
          )}
          <h1
            className={`font-bold tracking-tight ${isKS1 ? "text-base" : isKS4 ? "text-sm" : "text-base"}`}
            style={{ color: isDark ? "#fff" : cfg.textPrimary }}
          >
            {cfg.label}
          </h1>
        </div>
        <p
          className="uppercase tracking-[0.2em] font-bold"
          style={{
            color: cfg.textMuted,
            fontSize: isKS1 ? "8px" : "9px",
            marginLeft: isKS1 ? 52 : 44,
          }}
        >
          {cfg.sublabel}
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 px-1" aria-label="Dashboard navigation">
        {items.map((item) => {
          const active = activeTab === item.key;

          return (
            <button
              key={item.key}
              onClick={() => { if (item.action && onAction) { onAction(item.action); } else { onTabChange(item.key); scrollToSection(item.key); } }}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              className="flex items-center gap-3 w-full text-left rounded transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{
                "--tw-ring-color": cfg.accent,
                padding: `${isKS1 ? 12 : 8}px 16px`,
                minHeight: `${cfg.navItemHeight}px`,
                borderRadius: cfg.navRadius,
                background: active
                  ? isDark
                    ? `rgba(${band === "ks3" ? "91,106,191" : "124,58,237"},0.15)`
                    : cfg.accentBg
                  : "transparent",
                color: active ? (isDark ? "#fff" : cfg.accent) : cfg.textMuted,
                borderLeft: !isDark ? `3px solid ${active ? cfg.accent : "transparent"}` : "none",
                fontSize: isKS1 ? "14px" : isKS4 ? "12px" : "13px",
                fontWeight: isKS1 || band === "ks2" ? 600 : isKS4 ? 500 : 500,
                letterSpacing: isKS4 ? "0.02em" : "0",
                ...(isKS3 && active && {
                  borderLeft: `2px solid ${cfg.accent}`,
                  paddingLeft: "14px",
                  boxShadow: `inset 0 0 0 1px ${cfg.accent}40`,
                }),
                ...(isKS4 && active && {
                  borderLeft: `2px solid ${cfg.accent}`,
                  paddingLeft: "14px",
                  boxShadow: `inset 0 0 0 1px ${cfg.accent}20`,
                }),
              }}
            >
              {item.emoji && !isKS4 ? (
                <span className={`w-5 text-center shrink-0 ${isKS1 ? "text-lg" : "text-base"}`}>{item.emoji}</span>
              ) : (
                <MIcon
                  name={item.icon}
                  filled={active}
                  size={isKS1 ? 22 : isKS4 ? 16 : 20}
                  style={{ color: active ? cfg.accent : cfg.textMuted }}
                />
              )}
              <div className="flex flex-col items-start min-w-0">
                <span className="truncate">{item.label}</span>
                {item.desc && (
                  <span
                    className="text-[10px] font-medium opacity-60 -mt-0.5 truncate"
                    style={{ fontSize: isKS1 ? "10px" : "9px" }}
                  >
                    {item.desc}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Scholar identity */}
      <div className="mt-auto px-1">
        <div
          className={`flex items-center gap-3 px-3 py-2.5 rounded-${isKS1 ? "xl" : isKS4 ? "lg" : "lg"}`}
          style={{
            background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            borderRadius: isKS1 ? "16px" : isKS4 ? "10px" : "12px",
          }}
        >
          <div
            className="rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
            style={{
              width: isKS1 ? 36 : 32,
              height: isKS1 ? 36 : 32,
              background: `${cfg.accent}18`,
              color: cfg.accent,
            }}
          >
            {(scholarName || "S")[0].toUpperCase()}
          </div>
          <p
            className="text-xs font-bold truncate flex-1"
            style={{ color: isDark ? "rgba(255,255,255,0.7)" : cfg.textPrimary }}
          >
            {scholarName || "Scholar"}
          </p>
        </div>
      </div>
    </aside>
  );
}

// ── Bottom Tab Bar (mobile) ─────────────────────────────────────────────────
function BottomTabs({ band, activeTab, onTabChange, onAction, navItems }) {
  const cfg = NAV_CONFIG[band] || NAV_CONFIG.ks2;
  const isDark = cfg.dark;
  const items = navItems || cfg.items;
  const isKS1 = band === "ks1";

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-2 z-50"
      role="tablist"
      aria-label="Dashboard sections"
      style={{
        paddingBottom: isKS1 ? "32px" : "24px",
        paddingTop: isKS1 ? "16px" : "12px",
        background: isDark ? "rgba(10,14,28,0.98)" : "rgba(255,255,255,0.98)",
        backdropFilter: "blur(20px)",
        borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)"}`,
      }}
    >
      {items.slice(0, 5).map((item) => {
        const active = activeTab === item.key;
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={active}
            aria-label={item.label}
            onClick={() => { if (item.action && onAction) { onAction(item.action); } else { onTabChange(item.key); scrollToSection(item.key); } }}
            className="flex flex-col items-center justify-center rounded transition-all focus-visible:outline-none focus-visible:ring-2"
            style={{
              color: active ? cfg.accent : cfg.textMuted,
              background: active
                ? isDark
                  ? `rgba(${band === "ks3" ? "91,106,191" : band === "ks4" ? "124,58,237" : "0,0,0"},0.15)`
                  : cfg.accentBg
                : "transparent",
              padding: isKS1 ? "12px 16px" : "8px 12px",
              minWidth: isKS1 ? 72 : 64,
              borderRadius: isKS1 ? "16px" : "8px",
              fontSize: isKS1 ? "11px" : "9px",
            }}
          >
            <div style={{ width: isKS1 ? 28 : 24, height: isKS1 ? 28 : 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {item.emoji && !band === "ks4" ? (
                <span style={{ fontSize: isKS1 ? 20 : 18, lineHeight: 1 }}>{item.emoji}</span>
              ) : (
                <MIcon name={item.icon} filled={active} size={isKS1 ? 24 : 22} />
              )}
            </div>
            <span
              className="font-bold uppercase tracking-[0.06em] mt-1"
              style={{
                lineHeight: 1,
                fontSize: isKS1 ? "10px" : "9px",
                fontWeight: isKS1 ? 700 : 600,
              }}
            >
              {item.label}
            </span>
            {item.desc && <span className="text-[7px] font-semibold opacity-50 mt-0.5" style={{ lineHeight: 1 }}>{item.desc}</span>}
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
  onAction,
  yearLevel = 3,
  mainContent,
  rightSidebar,
  topBarLeft,
  topBarRight,
}) {
  const cfg = NAV_CONFIG[band] || NAV_CONFIG.ks2;
  // Filter nav items by yearLevel (minYear support)
  const navItems = cfg.items.filter((item) => !item.minYear || yearLevel >= item.minYear);
  const isDark = cfg.dark;
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ── Imperatively override html/body backgrounds to prevent white/dark bleed ──
  // For dark bands (ks3/ks4), we set transparent so the ambient component (position:fixed)
  // handles the base colour — no solid paint to cover the nebula/star effects.
  useEffect(() => {
    const baseBg = isDark
      ? "transparent"
      : (band === "ks1" ? "#fef9e7" : band === "ks4" ? "#f8f7ff" : "#f5f7fc");

    const html = document.documentElement;
    const body = document.body;
    // Save originals
    const origHtmlBg = html.style.background;
    const origBodyBg = body.style.background;
    const origBodyBgColor = body.style.backgroundColor;
    // Set overrides
    html.style.background = baseBg;
    html.style.margin = "0";
    html.style.padding = "0";
    html.style.minHeight = "100vh";
    body.style.background = isDark ? "transparent" : (typeof cfg.bodyBg === "string" && cfg.bodyBg.includes("gradient") ? cfg.bodyBg : baseBg);
    body.style.backgroundColor = baseBg;
    body.style.margin = "0";
    body.style.padding = "0";
    body.style.minHeight = "100vh";
    // Also make #__next transparent
    const nextEl = document.getElementById("__next");
    const origNextBg = nextEl?.style.background;
    if (nextEl) { nextEl.style.background = "transparent"; nextEl.style.backgroundColor = "transparent"; }
    // Walk up from __next and clear backgrounds on wrapper divs
    let el = nextEl?.firstElementChild;
    const cleared = [];
    while (el && cleared.length < 5) {
      cleared.push({ el, bg: el.style.background, bgc: el.style.backgroundColor });
      el.style.background = "transparent";
      el.style.backgroundColor = "transparent";
      el = el.firstElementChild;
    }
    return () => {
      html.style.background = origHtmlBg;
      body.style.background = origBodyBg;
      body.style.backgroundColor = origBodyBgColor;
      if (nextEl) nextEl.style.background = origNextBg || "";
      cleared.forEach(({ el: e, bg, bgc }) => { e.style.background = bg; e.style.backgroundColor = bgc; });
    };
  }, [band, cfg, isDark]);

  return (
    <div className="dashboard-shell min-h-screen relative" style={{ background: isDark ? "transparent" : cfg.bodyBg, fontFamily: cfg.font }}>
      {/* Skip to content link — keyboard accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-bold"
        style={{ background: cfg.accent, color: "#fff" }}>
        Skip to main content
      </a>

      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <CosmicParticles band={band} />
      <TechGridBg band={band} />

      <SideNav band={band} activeTab={activeTab} onTabChange={onTabChange}
        scholarName={scholarName} onStartQuest={onStartQuest} onAction={onAction} navItems={navItems} />

      {/* Top Bar */}
      <header
        className="fixed top-0 right-0 z-40 flex justify-between items-center px-4 lg:px-8 h-14"
        style={{
          left: "0",
          background: isDark
            ? (band === "ks3" ? "rgba(12,15,26,0.90)" : "rgba(10,10,20,0.90)")
            : "rgba(255,255,255,0.90)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)"}`,
          fontFamily: cfg.font,
        }}
      >
        <div className="lg:hidden flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight" style={{ color: cfg.accent }}>{cfg.label}</span>
        </div>
        <div className="hidden lg:flex items-center" style={{ marginLeft: "260px" }}>{topBarLeft}</div>
        <div className="flex items-center gap-1 lg:gap-2">
          {topBarRight}
          <button
            style={{
              padding: "4px 10px",
              borderRadius: 8,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: cfg.textMuted,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            title="Notifications"
            aria-label="Notifications"
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>🔔</span>
            <span className="hidden lg:inline" style={{ fontSize: 11, fontWeight: 700 }}>Alerts</span>
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              padding: "4px 10px",
              borderRadius: 8,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#ef4444",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            title="Sign out"
            aria-label="Sign out"
          >
            <span style={{ fontSize: 14, lineHeight: 1, fontWeight: 700 }}>→</span>
            <span className="hidden lg:inline" style={{ fontSize: 11, fontWeight: 700 }}>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="pt-14 pb-20 lg:pb-0 lg:ml-[260px] relative z-10" style={{ minHeight: "100vh", background: "transparent" }}>
        <div className="flex min-h-[calc(100vh-3.5rem)]">
          <main id="main-content" role="main" aria-label="Dashboard content" className="flex-1 px-3 pt-1 pb-0 lg:px-5 lg:pt-1 lg:pb-0 overflow-y-auto">{mainContent}</main>

          {rightSidebar && (
            <aside role="complementary" aria-label="Dashboard sidebar" className={`
              hidden xl:block right-0 top-14 bottom-0 w-[300px] xl:w-[300px] z-30
              border-l overflow-y-auto transition-transform duration-300 shrink-0
              ${showRightPanel ? "fixed translate-x-0 !block" : "translate-x-full xl:translate-x-0"}
            `}
            style={{
              background: "transparent",
              borderColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.04)",
            }}>
              <div className="p-5 space-y-5">{rightSidebar}</div>
            </aside>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog" aria-modal="true" aria-label="Sign out confirmation"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogoutConfirm(false); }}>
          <div style={{
            background: isDark ? "#1e1b4b" : "#fff",
            borderRadius: 20, padding: "28px 24px", maxWidth: 340, width: "100%",
            boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
            border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🚪</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: isDark ? "#fff" : "#1e293b", marginBottom: 8 }}>
              Leaving so soon?
            </div>
            <div style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.6)" : "#64748b", marginBottom: 24, lineHeight: 1.5 }}>
              Your progress is saved, but any active quest will be paused. Are you sure you want to sign out?
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{
                flex: 1, padding: "12px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 800,
                background: isDark ? "rgba(255,255,255,0.1)" : "#f1f5f9",
                color: isDark ? "#fff" : "#475569",
              }}>
                Stay
              </button>
              <button onClick={() => { setShowLogoutConfirm(false); onSignOut?.(); }} style={{
                flex: 1, padding: "12px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 800,
                background: "#ef4444", color: "#fff",
              }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomTabs band={band} activeTab={activeTab} onTabChange={onTabChange} onAction={onAction} navItems={navItems} />

      <style>{`
        @keyframes cosmic-drift {
          0% { transform: translateY(0) translateX(0); opacity: 0.1; }
          50% { opacity: 0.2; }
          100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
        }
        /* Prevent white/dark bleed at bottom/edges of dashboards */
        html, body, #__next { min-height: 100vh; margin: 0 !important; padding: 0 !important; }
        html { background: ${isDark ? "transparent" : (band === "ks1" ? "#fef9e7" : band === "ks4" ? "#f8f7ff" : "#f5f7fc")} !important; }
        body { background: ${isDark ? "transparent" : cfg.bodyBg} !important; min-height: 100vh !important; background-attachment: fixed !important; background-color: ${isDark ? "transparent" : (band === "ks1" ? "#fef9e7" : band === "ks4" ? "#f8f7ff" : "#f5f7fc")} !important; }
        #__next, #__next > div, #__next > div > div, #__next > main, main { background: transparent !important; background-color: transparent !important; }
        /* Kill any stray white backgrounds from layout wrappers */
        body > div, body > div > div, body > div > div > div { background-color: transparent !important; }
        /* Respect user preference for reduced motion */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
        /* Focus visible styling for keyboard navigation */
        .dashboard-shell *:focus-visible {
          outline: 2px solid ${cfg.accent};
          outline-offset: 2px;
          border-radius: 4px;
        }
        /* Screen reader only utility */
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        .sr-only:focus, .focus\\:not-sr-only:focus { position: fixed; width: auto; height: auto; padding: initial; margin: initial; overflow: visible; clip: auto; white-space: normal; }
      `}</style>
    </div>
  );
}
