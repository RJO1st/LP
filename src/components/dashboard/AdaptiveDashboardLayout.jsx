"use client";
/**
 * AdaptiveDashboardLayout.jsx (v10 — Band-Specific Visual & Layout Overhaul)
 * Deploy to: src/components/dashboard/AdaptiveDashboardLayout.jsx
 *
 * v10: COMPLETE REDESIGN with true band-specific layouts.
 *      Each band has unique section ordering, visual hierarchy, and component emphasis.
 *
 *      KS1 (Celestial Nursery):
 *        - Warm amber nebula background with floating particles
 *        - Large rounded StoryCards with treasure-map aesthetic
 *        - Digital Pet + Story Journal as primary content
 *        - Daily Adventure with narrative wrapper
 *        - Caterpillar progress indicators
 *
 *      KS2 (Orbital Command):
 *        - Dark space radar sweep animation
 *        - Commander Stats as primary metric row (Stardust/Missions/Streak)
 *        - Galaxy Map with orbital rings
 *        - Mission Log (styled Quest Journal)
 *        - Achievement medals prominent
 *
 *      KS3 (Career Simulator):
 *        - Light professional theme, no ambient animations
 *        - Skill Map with subject tabs as central focus
 *        - Mastery donut ring visualization
 *        - Weekly Goals checklist visible
 *        - Peer standings & career match %
 *
 *      KS4 (Exam Command):
 *        - Dark precision with cyan scan-line grid
 *        - Status bar: predicted grade + exam countdown + mastery index
 *        - Revision Planner as PRIMARY massive section
 *        - Exam Panel with grade comparison
 *        - Topic Heatmap + Flashcards + Mock Test Launcher
 *        - "AI READY" / "FOCUS" badges
 *
 * Props signature IDENTICAL to v9 — drop-in replacement.
 * ALL 17 data-connected components preserved.
 * DashboardShell v4 provides responsive chrome.
 */

import React, { useState, useMemo, lazy, Suspense } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import DashboardShell, { MIcon, NAV_CONFIG } from "./DashboardShell";

// ── Data-connected components ────────────────────────────────────────────────
import AdaptiveGreeting from "./AdaptiveGreeting";
import AdaptiveStats from "./AdaptiveStats";
import DailyAdventure from "./DailyAdventure";
import TaraEncouragement from "./TaraEncouragement";
import SkillMap from "./SkillMap";
import ConstellationMap from "./ConstellationMap";
import QuestJournal from "./QuestJournal";
import CareerPopup from "./CareerPopup";
import CareerExplorer from "./CareerExplorer";
import ExamPanel from "./ExamPanel";
import ExamModeSwitch from "./ExamModeSwitch";
import RevisionPlanner from "./RevisionPlanner";
import PeerComparison from "./PeerComparison";
import MockTestLauncher from "./MockTestLauncher";
import AdaptiveLeaderboard from "./AdaptiveLeaderboard";
import DigitalPet from "./DigitalPet";
import GoalSetting from "./GoalSetting";
import DashboardTour from "@/components/DashboardTour";
import Flashcards from "./Flashcards";
import CertificatesPanel from "./CertificatesPanel";
import SubjectProgressChart from "./SubjectProgressChart";
import { getSubjectLabel } from "@/lib/subjectDisplay";
import TaraFloatingBlurb from "./TaraFloatingBlurb";
import StickerCollection from "./StickerCollection";
import TopicPerformanceBreakdown from "@/components/TopicPerformanceBreakdown";
const NebulaTrials = lazy(() => import("@/components/game/NebulaTrials"));
import { formatGradeLabel } from "@/lib/gamificationEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// BAND-SPECIFIC AMBIENT LAYERS
// ═══════════════════════════════════════════════════════════════════════════════

function KS1Nebula() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", top: "-5%", right: "-8%", opacity: 0.4,
        background: "radial-gradient(circle, #fde68a 0%, transparent 70%)", animation: "ks1Float 28s ease-in-out infinite" }} />
      <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", bottom: "10%", left: "-5%", opacity: 0.3,
        background: "radial-gradient(circle, #e9d5ff 0%, transparent 70%)", animation: "ks1Float 32s ease-in-out infinite reverse" }} />
      <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", top: "40%", right: "20%", opacity: 0.25,
        background: "radial-gradient(circle, #fed7aa 0%, transparent 70%)", animation: "ks1Float 24s ease-in-out infinite 4s" }} />
      {Array.from({ length: 15 }, (_, i) => (
        <div key={i} style={{
          position: "absolute", width: 3, height: 3, borderRadius: "50%", background: "#fbbf24",
          left: `${(i * 7.3 + 5) % 100}%`, top: `${(i * 11.7 + 3) % 100}%`,
          opacity: 0.4, animation: `ks1Twinkle ${2 + (i % 3)}s ease-in-out infinite ${i * 0.4}s`,
        }} />
      ))}
    </div>
  );
}

function KS2Radar() {
  // Light warm ambient with subtle orbital rings and pastel accents
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {/* Soft warm gradient blobs */}
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", top: "-15%", right: "-10%", opacity: 0.15,
        background: "radial-gradient(circle, rgba(253,186,116,0.4) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", bottom: "-5%", left: "-8%", opacity: 0.12,
        background: "radial-gradient(circle, rgba(196,181,253,0.35) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", top: "40%", left: "60%", opacity: 0.08,
        background: "radial-gradient(circle, rgba(110,231,183,0.3) 0%, transparent 70%)" }} />
      {/* Orbital rings (lighter for bright theme) */}
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", opacity: 0.04,
        border: "1px solid rgba(99,102,241,0.2)", animation: "ks2Radar 28s linear infinite" }} />
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", opacity: 0.03,
        border: "1px dashed rgba(99,102,241,0.12)" }} />
      {/* Subtle floating dots */}
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 3 + (i % 3), height: 3 + (i % 3), borderRadius: "50%",
          background: i % 3 === 0 ? "#818cf8" : i % 3 === 1 ? "#fbbf24" : "#34d399",
          left: `${(i * 9.3 + 8) % 85}%`, top: `${(i * 11.7 + 5) % 85}%`,
          opacity: 0.12 + (i % 3) * 0.05,
          animation: `ks2PlanetGlow ${3 + i * 0.7}s ease-in-out infinite ${i * 0.5}s`,
        }} />
      ))}
    </div>
  );
}

function KS3HudAmbient() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {/* Faint tech grid */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.025,
        backgroundImage: "linear-gradient(rgba(91,106,191,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(91,106,191,0.3) 1px, transparent 1px)",
        backgroundSize: "60px 60px" }} />
      {/* Soft accent orb — top right */}
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", top: "-8%", right: "-12%", opacity: 0.06,
        background: "radial-gradient(circle, rgba(91,106,191,0.3) 0%, transparent 70%)" }} />
      {/* Secondary orb — bottom left */}
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", bottom: "5%", left: "-8%", opacity: 0.04,
        background: "radial-gradient(circle, rgba(14,165,233,0.25) 0%, transparent 70%)" }} />
      {/* Horizontal scan line (very subtle) */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, opacity: 0.06,
        background: "rgba(91,106,191,0.4)", animation: "ks3DataSweep 12s linear infinite" }} />
    </div>
  );
}

function KS4AtelierAmbient() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {/* Vivid purple orb — top right */}
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", top: "-12%", right: "-18%", opacity: 0.2,
        background: "radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)" }} />
      {/* Secondary violet orb — bottom left */}
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", bottom: "0%", left: "-12%", opacity: 0.15,
        background: "radial-gradient(circle, rgba(167,139,250,0.3) 0%, transparent 70%)" }} />
      {/* Small accent orb — center left */}
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", top: "40%", left: "20%", opacity: 0.08,
        background: "radial-gradient(circle, rgba(109,40,217,0.25) 0%, transparent 70%)" }} />
      {/* Subtle grid pattern */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.02,
        backgroundImage: "linear-gradient(rgba(124,58,237,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.2) 1px, transparent 1px)",
        backgroundSize: "80px 80px" }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND-SPECIFIC CARD WRAPPERS & TYPOGRAPHY
// ═══════════════════════════════════════════════════════════════════════════════

function BandCard({ band, children, glow, accent, className = "", style = {}, id, "data-section": dataSection }) {
  // "Liquid glass" aesthetic: translucent, heavy blur, subtle inner highlight
  const styles = {
    ks1: {
      background: "rgba(255,255,255,0.55)", borderRadius: 24,
      border: glow ? "1.5px solid rgba(212,160,23,0.2)" : "1px solid rgba(255,255,255,0.5)",
      boxShadow: glow
        ? "0 8px 32px rgba(212,160,23,0.1), inset 0 1px 0 rgba(255,255,255,0.6)"
        : "0 2px 16px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.5)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", padding: 20,
    },
    ks2: {
      background: "rgba(255,255,255,0.75)", borderRadius: 20,
      border: `1px solid ${glow ? "rgba(99,102,241,0.15)" : "rgba(0,0,0,0.04)"}`,
      boxShadow: glow
        ? "0 4px 24px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.9)"
        : "0 2px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", padding: 20,
    },
    ks3: {
      background: "rgba(255,255,255,0.65)", borderRadius: 14,
      border: glow ? "1px solid rgba(91,106,191,0.18)" : "1px solid rgba(91,106,191,0.08)",
      boxShadow: glow
        ? "0 4px 24px rgba(91,106,191,0.08), inset 0 1px 0 rgba(255,255,255,0.8), 0 0 0 0.5px rgba(91,106,191,0.06)"
        : "0 1px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.7)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", padding: 20,
      position: "relative", overflow: "hidden",
    },
    ks4: {
      background: "rgba(255,255,255,0.82)", borderRadius: 16,
      border: `1px solid ${glow ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.08)"}`,
      boxShadow: glow
        ? "0 4px 24px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.9)"
        : "0 2px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", padding: 20,
      position: "relative", overflow: "hidden",
    },
  };
  return (
    <div id={id} data-section={dataSection} style={{ ...styles[band] || styles.ks3, ...style }} className={className}>
      {band === "ks4" && glow && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "200%",
            background: "linear-gradient(180deg, transparent, rgba(124,58,237,0.03), transparent)",
            animation: "ks4Scan 5s linear infinite" }} />
        </div>
      )}
      {/* KS3 HUD accent corners + top edge glow */}
      {band === "ks3" && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 14, overflow: "hidden" }}>
          {/* Top accent edge line */}
          <div style={{ position: "absolute", top: 0, left: 12, right: 12, height: 1,
            background: glow
              ? "linear-gradient(90deg, transparent, rgba(91,106,191,0.35) 20%, rgba(14,165,233,0.25) 50%, rgba(91,106,191,0.35) 80%, transparent)"
              : "linear-gradient(90deg, transparent, rgba(91,106,191,0.12) 30%, rgba(91,106,191,0.12) 70%, transparent)",
          }} />
          {/* Corner bracket — top-left */}
          <svg width="18" height="18" style={{ position: "absolute", top: 4, left: 4 }}>
            <path d="M0 14 L0 2 Q0 0 2 0 L14 0" fill="none" stroke="rgba(91,106,191,0.2)" strokeWidth="1.5" />
          </svg>
          {/* Corner bracket — top-right */}
          <svg width="18" height="18" style={{ position: "absolute", top: 4, right: 4 }}>
            <path d="M18 14 L18 2 Q18 0 16 0 L4 0" fill="none" stroke="rgba(91,106,191,0.2)" strokeWidth="1.5" />
          </svg>
          {/* Corner bracket — bottom-left */}
          <svg width="18" height="18" style={{ position: "absolute", bottom: 4, left: 4 }}>
            <path d="M0 4 L0 16 Q0 18 2 18 L14 18" fill="none" stroke="rgba(91,106,191,0.12)" strokeWidth="1.5" />
          </svg>
          {/* Corner bracket — bottom-right */}
          <svg width="18" height="18" style={{ position: "absolute", bottom: 4, right: 4 }}>
            <path d="M18 4 L18 16 Q18 18 16 18 L4 18" fill="none" stroke="rgba(91,106,191,0.12)" strokeWidth="1.5" />
          </svg>
          {/* Faint tech grid overlay */}
          {glow && (
            <div style={{ position: "absolute", inset: 0, opacity: 0.018,
              backgroundImage: "linear-gradient(rgba(91,106,191,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(91,106,191,0.4) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }} />
          )}
        </div>
      )}
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

function SectionHeader({ band, icon, title, subtitle, accent, size = "md" }) {
  const cfg = NAV_CONFIG[band] || NAV_CONFIG.ks2;
  const isDark = cfg.dark;
  const fontSizes = {
    sm: { title: 13, subtitle: 10, icon: 14 },
    md: { title: 15, subtitle: 10, icon: 16 },
    lg: { title: 18, subtitle: 11, icon: 20 },
    xl: { title: 22, subtitle: 12, icon: 24 },
  };
  const fs = fontSizes[size] || fontSizes.md;
  const isKs3 = band === "ks3";

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {icon && (
          <div style={{
            width: fs.icon + 8, height: fs.icon + 8,
            borderRadius: band === "ks1" ? 12 : band === "ks4" ? 8 : isKs3 ? 6 : 10,
            background: isKs3 ? `linear-gradient(135deg, ${cfg.accent}12, ${cfg.accent}08)` : `${cfg.accent}15`,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: isKs3 ? `1px solid ${cfg.accent}18` : `1px solid ${cfg.accent}20`,
            boxShadow: isKs3 ? `0 0 8px ${cfg.accent}08` : "none",
          }}>
            <span style={{ fontSize: fs.icon }}>{icon}</span>
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: fs.title, fontWeight: 800,
            color: isDark ? "#fff" : cfg.textPrimary, fontFamily: cfg.font,
            letterSpacing: band === "ks4" ? "0.04em" : isKs3 ? "0.02em" : 0,
          }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: fs.subtitle, fontWeight: 600, color: cfg.textMuted,
              textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        {/* KS3 HUD data tick marks */}
        {isKs3 && (
          <div style={{ display: "flex", gap: 2, opacity: 0.15 }}>
            {[6, 10, 14, 8, 12].map((h, i) => (
              <div key={i} style={{ width: 2, height: h, borderRadius: 1, background: cfg.accent }} />
            ))}
          </div>
        )}
      </div>
      {/* KS3 accent underline */}
      {isKs3 && (
        <div style={{ marginTop: 8, height: 1, borderRadius: 1,
          background: `linear-gradient(90deg, ${cfg.accent}25, ${cfg.accent}08 60%, transparent)`,
        }} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL KEYFRAMES
// ═══════════════════════════════════════════════════════════════════════════════

function BandKeyframes({ band }) {
  const keyframes = {
    ks1: `
      @keyframes ks1Float { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-30px) scale(1.05)} }
      @keyframes ks1Twinkle { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:0.7;transform:scale(1.2)} }
      @keyframes ks1Bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    `,
    ks2: `
      @keyframes ks2Radar { 0%{transform:translate(-50%,-50%) rotate(0deg)} 100%{transform:translate(-50%,-50%) rotate(360deg)} }
      @keyframes ks2PlanetGlow { 0%,100%{opacity:0.15;transform:scale(1)} 50%{opacity:0.35;transform:scale(1.3)} }
      @keyframes ks2OrbitPulse { 0%,100%{opacity:0.08} 50%{opacity:0.15} }
    `,
    ks3: `
      @keyframes ks3EdgePulse { 0%,100%{opacity:0.15} 50%{opacity:0.35} }
      @keyframes ks3DataSweep { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
    `,
    ks4: `
      @keyframes ks4Scan { 0%{backgroundPosition:0 0} 100%{backgroundPosition:0 100%} }
      @keyframes ks4GlowPulse { 0%,100%{box-shadow:0 0 20px rgba(124,58,237,0.1)} 50%{box-shadow:0 0 30px rgba(124,58,237,0.18)} }
      @keyframes ks4Badge { 0%,100%{opacity:0.8;transform:scale(1)} 50%{opacity:1;transform:scale(1.03)} }
      @keyframes ks4NodePulse { 0%,100%{opacity:0.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
      @keyframes ks4DonutFill { from{stroke-dashoffset:251} to{stroke-dashoffset:var(--target)} }
    `,
  };
  return <style>{keyframes[band] || ""}</style>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdaptiveDashboardLayout({
  scholar = {}, stats = {}, topics = [], subjects = [], subject = "mathematics",
  journalEntries = [], dailyAdventure, encouragement, careerTopic, examData,
  masteryData = [], peerComparisons = [], pastMocks = [], leaderboard = [],
  scholarId, supabase, coins = 0, todayQCount = 0, effectiveTier = "pro",
  earnedBadgeIds = [],
  onSignOut, onAvatar, onStartQuest, onTopicClick, onDismissEncourage,
  onDismissCareer, onStartAdventure, onStartMock, onExamModeSwitch, onStartRevisionTopic,
}) {
  const { band, theme: t } = useTheme();
  const [activeSubject, setActiveSubject] = useState(subject || subjects[0] || "mathematics");
  const [activeTab, setActiveTab] = useState(
    band === "ks1" ? "adventure" : band === "ks2" ? "mission" : band === "ks4" ? "exams" : "mission"
  );
  const [showNebulaTrials, setShowNebulaTrials] = useState(false);

  // Handle nav actions (e.g. opening modals from nav buttons)
  const handleNavAction = (action) => {
    if (action === "nebula-trials") setShowNebulaTrials(true);
  };

  const subjectMastery = useMemo(() => {
    const rows = masteryData.filter(r => (r.subject || "").toLowerCase() === (activeSubject || "").toLowerCase());
    if (rows.length === 0) return { pct: stats.masteryPct ?? 0, count: stats.topicCount ?? 0 };
    const avg = rows.reduce((s, r) => s + (r.mastery_score ?? r.p_know ?? 0), 0) / rows.length;
    return { pct: Math.round(avg * 100), count: rows.length };
  }, [masteryData, activeSubject, stats]);

  const isFreeTier = effectiveTier === "free";
  // Exam mode is only active when parent explicitly enrolled scholar in a valid exam mode (e.g. "eleven_plus")
  const hasActiveExamMode = scholar.exam_mode && scholar.exam_mode !== "none" && scholar.exam_mode !== "general";
  const cfg = NAV_CONFIG[band] || NAV_CONFIG.ks2;
  const isDark = cfg.dark;
  const gradeLabel = formatGradeLabel?.(scholar.year_level, scholar.curriculum) || `Year ${scholar.year_level || "?"}`;

  // ═══════════════════════════════════════════════════════════════════════════
  // BAND-SPECIFIC MAIN CONTENT LAYOUTS
  // ═══════════════════════════════════════════════════════════════════════════

  const mainContent = (
    <>
      <BandKeyframes band={band} />
      {band === "ks1" && <KS1Nebula />}
      {band === "ks2" && <KS2Radar />}
      {band === "ks3" && <KS3HudAmbient />}
      {band === "ks4" && <KS4AtelierAmbient />}

      <div style={{ display: "flex", flexDirection: "column", gap: band === "ks1" ? 16 : 14, position: "relative", zIndex: 1 }}>

        {/* Section anchors removed — scroll handled by DashboardShell scrollToSection */}

        {/* ══════════════════════════════════════════════════════════════════════
            KS1: CELESTIAL NURSERY (Warm, Playful, Story-Focused)
            ══════════════════════════════════════════════════════════════════════ */}
        {band === "ks1" && (
          <>
            {/* Hero Greeting + Stats */}
            <BandCard band={band} glow>
              <AdaptiveGreeting
                scholarName={scholar.name} streak={stats.streak ?? 0} xp={stats.xp ?? 0}
                yearLevel={scholar.year_level} examName={examData?.examName}
                daysUntilExam={examData?.daysUntilExam}
                avatar={scholar.avatar} onAvatarClick={onAvatar}
              />
              <div style={{ marginTop: 16 }}>
                <AdaptiveStats stats={{ ...stats, masteryPct: subjectMastery.pct, topicCount: subjectMastery.count }} />
              </div>
            </BandCard>

            {/* Encouragement */}
            {encouragement && (
              <BandCard band={band}>
                <TaraEncouragement
                  message={encouragement.text}
                  visible={encouragement.visible !== false}
                  onDismiss={onDismissEncourage}
                />
              </BandCard>
            )}

            {/* Daily Adventure with Narrative */}
            {dailyAdventure && (
              <BandCard band={band} glow data-section="adventure">
                <SectionHeader band={band} icon="🗺️" title="Today's Adventure" subtitle="narrative quest" />
                <DailyAdventure
                  totalQuestions={dailyAdventure.totalQuestions} completed={dailyAdventure.completed}
                  subject={activeSubject}
                  topic={topics.find(tp => tp.subject === activeSubject && tp.status === "current")?.slug || ""}
                  onStart={() => onStartAdventure?.(activeSubject)}
                />
              </BandCard>
            )}

            {/* Treasure Map (Skill Map) */}
            <BandCard band={band} glow data-section="galaxy">
              <SectionHeader band={band} icon="🗺️" title="Treasure Map" subtitle="explore subjects" size="lg" />
              <SkillMap
                topics={topics} subjects={subjects} subject={activeSubject}
                onTopicClick={onTopicClick} onSubjectChange={setActiveSubject}
              />
            </BandCard>

            {/* Subject Year Progression */}
            {masteryData.length > 0 && (
              <BandCard band={band}>
                <SectionHeader band={band} icon="📊" title="My Progress" subtitle="subject mastery" />
                <SubjectProgressChart masteryData={masteryData} subjects={subjects} />
              </BandCard>
            )}

            {/* Digital Pet (main content — prominent for KS1) */}
            <BandCard band={band} glow>
              <SectionHeader band={band} icon="🐾" title="My Space Pet" subtitle="feed me stars!" size="lg" />
              <DigitalPet totalXp={stats.xp ?? 0} scholarId={scholarId} />
            </BandCard>

            {/* Story Journal */}
            <BandCard band={band}>
              <SectionHeader band={band} icon="📖" title="Story Journal" subtitle="your quest log" />
              <QuestJournal entries={journalEntries} />
            </BandCard>

            {/* Star Collectors (Leaderboard) */}
            {leaderboard.length > 0 && (
              <BandCard band={band}>
                <SectionHeader band={band} icon="🌟" title="Star Collectors" subtitle="top explorers" />
                <AdaptiveLeaderboard entries={leaderboard} currentScholarId={scholarId} />
              </BandCard>
            )}

            {/* Sticker Collection */}
            <div data-section="trophies">
            <StickerCollection
              band="ks1"
              earnedBadgeIds={earnedBadgeIds}
              milestones={{
                questsCompleted: stats.questsCompleted ?? stats.quests ?? 0,
                streak: stats.streak ?? 0,
                accuracy: stats.bestAccuracy ?? stats.accuracy ?? 0,
                totalXP: stats.xp ?? stats.totalXP ?? 0,
              }}
            />
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            KS2: ORBITAL COMMAND (Bright, Space Commander, Mission-Driven)
            ══════════════════════════════════════════════════════════════════════ */}
        {band === "ks2" && (
          <>
            {/* Hero Greeting + Commander Stats */}
            <BandCard band={band} glow>
              <AdaptiveGreeting
                scholarName={scholar.name} streak={stats.streak ?? 0} xp={stats.xp ?? 0}
                yearLevel={scholar.year_level} examName={examData?.examName}
                daysUntilExam={examData?.daysUntilExam}
                avatar={scholar.avatar} onAvatarClick={onAvatar}
              />
              <div style={{ marginTop: 20 }}>
                {/* Commander Stats Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  <div style={{ textAlign: "center", padding: "14px 8px", borderRadius: 14, background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.06))", border: "1px solid rgba(99,102,241,0.15)" }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>✨</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#4f46e5" }}>{(stats.xp ?? 0).toLocaleString()}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#6366f1", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Stardust</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "14px 8px", borderRadius: 14, background: "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(217,70,239,0.06))", border: "1px solid rgba(168,85,247,0.15)" }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>🚀</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#7c3aed" }}>{stats.questsCompleted ?? 0}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#8b5cf6", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Missions</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "14px 8px", borderRadius: 14, background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(251,191,36,0.06))", border: "1px solid rgba(245,158,11,0.15)" }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>🔥</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: "#d97706" }}>{stats.streak ?? 0}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#b45309", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Streak</div>
                  </div>
                </div>
              </div>
            </BandCard>

            {/* Encouragement */}
            {encouragement && (
              <BandCard band={band}>
                <TaraEncouragement
                  message={encouragement.text}
                  visible={encouragement.visible !== false}
                  onDismiss={onDismissEncourage}
                />
              </BandCard>
            )}

            {/* Daily Mission — anchor always present so nav link works */}
            <div id="section-mission" data-section="mission" />
            {dailyAdventure && (
              <BandCard band={band} glow>
                <SectionHeader band={band} icon="🚀" title="Daily Mission" subtitle="today's objective" />
                <DailyAdventure
                  totalQuestions={dailyAdventure.totalQuestions} completed={dailyAdventure.completed}
                  subject={activeSubject}
                  topic={topics.find(tp => tp.subject === activeSubject && tp.status === "current")?.slug || ""}
                  onStart={() => onStartAdventure?.(activeSubject)}
                />
              </BandCard>
            )}

            {/* Galaxy Map (Skill Map) */}
            <BandCard band={band} glow data-section="galaxy">
              <SectionHeader band={band} icon="🌌" title="Galaxy Map" subtitle="orbital rings" />
              <SkillMap
                topics={topics} subjects={subjects} subject={activeSubject}
                onTopicClick={onTopicClick} onSubjectChange={setActiveSubject}
              />
            </BandCard>

            {/* Mission Log (Quest Journal) */}
            <BandCard band={band}>
              <SectionHeader band={band} icon="📡" title="Mission Log" subtitle="comms history" />
              <QuestJournal entries={journalEntries} />
            </BandCard>

            {/* Current Objective / Status Bar */}
            <BandCard band={band}>
              <SectionHeader band={band} icon="🎯" title="Current Objective" />
              <div style={{
                marginTop: 12,
                padding: "16px",
                borderRadius: 12,
                background: "rgba(79,70,229,0.06)",
                border: "1px solid rgba(79,70,229,0.14)",
              }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#4f46e5",
                  marginBottom: 8,
                }}>
                  Mastery Progress: {subjectMastery.pct}%
                </div>
                <div style={{
                  width: "100%",
                  height: 8,
                  borderRadius: 4,
                  background: "rgba(79,70,229,0.12)",
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${subjectMastery.pct}%`,
                    background: "linear-gradient(90deg, #4f46e5, #7c3aed)",
                    borderRadius: 4,
                    transition: "width 0.3s ease",
                  }} />
                </div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#7c3aed",
                  marginTop: 8,
                  textTransform: "uppercase",
                }}>
                  {subjectMastery.count} topics remaining
                </div>
              </div>
            </BandCard>

            {/* Subject Year Progression */}
            {masteryData.length > 0 && (
              <BandCard band={band}>
                <SectionHeader band={band} icon="📡" title="Mission Progress" subtitle="subject mastery" />
                <SubjectProgressChart masteryData={masteryData} subjects={subjects} />
              </BandCard>
            )}

            {/* Achievement Medals */}
            <div data-section="trophies">
            <StickerCollection
              band="ks2"
              earnedBadgeIds={earnedBadgeIds}
              milestones={{
                questsCompleted: stats.questsCompleted ?? stats.quests ?? 0,
                streak: stats.streak ?? 0,
                accuracy: stats.bestAccuracy ?? stats.accuracy ?? 0,
                totalXP: stats.xp ?? stats.totalXP ?? 0,
              }}
            />
            </div>

            {/* Space Pet (after achievements) */}
            <BandCard band={band} glow>
              <SectionHeader band={band} icon="🐾" title="Space Pet" subtitle="your cosmic companion" size="lg" />
              <DigitalPet totalXp={stats.xp ?? 0} scholarId={scholarId} />
            </BandCard>

            {/* Key Stats Panel */}
            <BandCard band={band} data-section="stats">
              <SectionHeader band={band} icon="📊" title="Key Stats" subtitle="mission intel" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "linear-gradient(135deg, rgba(79,70,229,0.1), rgba(99,102,241,0.04))", border: "1px solid rgba(79,70,229,0.18)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>🎯 Accuracy</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#4f46e5" }}>{stats.bestAccuracy ?? stats.accuracy ?? 0}%</div>
                </div>
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "linear-gradient(135deg, rgba(124,58,237,0.1), rgba(168,85,247,0.04))", border: "1px solid rgba(124,58,237,0.18)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>⭐ Mastery</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#7c3aed" }}>{subjectMastery.pct}%</div>
                </div>
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "linear-gradient(135deg, rgba(37,99,235,0.1), rgba(59,130,246,0.04))", border: "1px solid rgba(37,99,235,0.18)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>🪐 Topics</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#2563eb" }}>{subjectMastery.count}</div>
                </div>
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(251,191,36,0.04))", border: "1px solid rgba(245,158,11,0.18)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>💰 Coins</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#b45309" }}>{coins}</div>
                </div>
              </div>
            </BandCard>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <BandCard band={band}>
                <SectionHeader band={band} icon="🏅" title="Rankings" subtitle="top commanders" />
                <AdaptiveLeaderboard entries={leaderboard} currentScholarId={scholarId} />
              </BandCard>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            KS3: CAREER SIMULATOR (Light, Professional, Data-Focused)
            ══════════════════════════════════════════════════════════════════════ */}
        {band === "ks3" && (
          <>
            {/* Hero Greeting + Stats */}
            <BandCard band={band} glow>
              <AdaptiveGreeting
                scholarName={scholar.name} streak={stats.streak ?? 0} xp={stats.xp ?? 0}
                yearLevel={scholar.year_level} examName={examData?.examName}
                daysUntilExam={examData?.daysUntilExam}
                avatar={scholar.avatar} onAvatarClick={onAvatar}
              />
              <div style={{ marginTop: 16 }}>
                <AdaptiveStats stats={{ ...stats, masteryPct: subjectMastery.pct, topicCount: subjectMastery.count }} />
              </div>
            </BandCard>

            {/* Exam Mode Switch — only for scholars with active exam mode (e.g. 11+) */}
            {hasActiveExamMode && (
              <BandCard band={band}>
                <ExamModeSwitch
                  currentMode={scholar.exam_mode || "general"}
                  curriculum={scholar.curriculum}
                  onSwitch={onExamModeSwitch}
                />
              </BandCard>
            )}

            {/* Encouragement */}
            {encouragement && (
              <BandCard band={band}>
                <TaraEncouragement
                  message={encouragement.text}
                  visible={encouragement.visible !== false}
                  onDismiss={onDismissEncourage}
                />
              </BandCard>
            )}

            {/* Daily Challenge */}
            {dailyAdventure && (
              <BandCard band={band} glow data-section="mission">
                <SectionHeader band={band} icon="🎯" title="Daily Challenge" subtitle="career skill builder" />
                <DailyAdventure
                  totalQuestions={dailyAdventure.totalQuestions} completed={dailyAdventure.completed}
                  subject={activeSubject}
                  topic={topics.find(tp => tp.subject === activeSubject && tp.status === "current")?.slug || ""}
                  onStart={() => onStartAdventure?.(activeSubject)}
                />
              </BandCard>
            )}

            {/* PRIMARY: Skill Map with Tabs */}
            <BandCard band={band} glow data-section="galaxy">
              <SectionHeader band={band} icon="📈" title="Skill Map" subtitle="subject progress" size="lg" />
              <SkillMap
                topics={topics} subjects={subjects} subject={activeSubject}
                onTopicClick={onTopicClick} onSubjectChange={setActiveSubject}
              />
            </BandCard>

            {/* Mastery Visualization */}
            <BandCard band={band} data-section="stats">
              <SectionHeader band={band} icon="🎯" title="Mastery Progress" />
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 32,
                padding: "20px 0",
              }}>
                {/* Donut Ring SVG */}
                <svg width={120} height={120} style={{ filter: "drop-shadow(0 4px 12px rgba(91,106,191,0.1))" }}>
                  <circle cx={60} cy={60} r={50} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={8} />
                  <circle
                    cx={60} cy={60} r={50} fill="none" stroke="#5b6abf"
                    strokeWidth={8} strokeDasharray={`${(subjectMastery.pct / 100) * 314.159} 314.159`}
                    strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dasharray 0.3s ease" }}
                  />
                  <text x={60} y={65} textAnchor="middle" fontSize={32} fontWeight={900} fill="#5b6abf">
                    {subjectMastery.pct}%
                  </text>
                </svg>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1d2e", marginBottom: 8 }}>
                    {subjectMastery.count} Topics
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(26,29,46,0.5)", lineHeight: 1.5 }}>
                    Continue learning to improve mastery across all subjects.
                  </div>
                </div>
              </div>
            </BandCard>

            {/* Weekly Goals */}
            <BandCard band={band}>
              <SectionHeader band={band} icon="✓" title="Weekly Goals" subtitle="track progress" />
              <GoalSetting scholarId={scholarId} stats={stats} />
            </BandCard>

            {/* Subject Year Progression */}
            {masteryData.length > 0 && (
              <BandCard band={band}>
                <SectionHeader band={band} icon="📈" title="Year Progression" subtitle="all subjects" />
                <SubjectProgressChart masteryData={masteryData} subjects={subjects} />
              </BandCard>
            )}

            {/* Topic Performance Breakdown */}
            {scholarId && supabase && (
              <BandCard band={band}>
                <SectionHeader band={band} icon="📊" title="Topic Breakdown" subtitle="per-topic performance" />
                <TopicPerformanceBreakdown scholarId={scholarId} subject={activeSubject} supabase={supabase} />
              </BandCard>
            )}

            {/* Quest Journal */}
            <BandCard band={band}>
              <SectionHeader band={band} icon="📋" title="Quest Journal" />
              <QuestJournal entries={journalEntries} />
            </BandCard>

            {/* Career Explorer (nav anchor for "Careers" tab) */}
            <BandCard band={band} data-section="careers">
              <SectionHeader band={band} icon="💼" title="Career Explorer" subtitle="how topics connect to real careers" />
              <CareerExplorer topics={topics} activeSubject={activeSubject} />
              {careerTopic && (
                <div style={{ marginTop: 12 }}>
                  <CareerPopup topic={careerTopic} subject={activeSubject} onDismiss={onDismissCareer} />
                </div>
              )}
            </BandCard>

            {/* Mock Test Launcher (mobile) */}
            <div className="xl:hidden">
              <BandCard band={band}>
                <MockTestLauncher
                  subject={activeSubject?.toLowerCase() || "mathematics"}
                  curriculum={scholar.curriculum} examMode={scholar.exam_mode || "general"}
                  pastMocks={pastMocks} onStartMock={onStartMock}
                />
              </BandCard>
            </div>

            {/* Skill Badges */}
            <StickerCollection
              band="ks3"
              earnedBadgeIds={earnedBadgeIds}
              milestones={{
                questsCompleted: stats.questsCompleted ?? stats.quests ?? 0,
                streak: stats.streak ?? 0,
                accuracy: stats.bestAccuracy ?? stats.accuracy ?? 0,
                totalXP: stats.xp ?? stats.totalXP ?? 0,
                masteryPct: subjectMastery.pct ?? 0,
              }}
            />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            KS4: ZENITH STATION (Light, Elegant, Precision-Focused)
            ══════════════════════════════════════════════════════════════════════ */}
        {band === "ks4" && (
          <>
            {/* ── Mission Telemetry Header ─────────────────────────── */}
            <div data-section="exams" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: -4 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: 4 }}>Mission Telemetry</div>
                <h2 style={{ fontSize: 24, fontWeight: 900, color: "#1e1b4b", margin: 0 }}>Knowledge Frontier</h2>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ padding: "8px 16px", borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)", color: "#7c3aed", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Export Report</button>
                <button onClick={() => onStartQuest?.(activeSubject)} style={{ padding: "8px 16px", borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }}>Launch Deep Space</button>
              </div>
            </div>

            {/* ── 3-column Status Metrics ───────────────────────────── */}
            <div data-section="stats" style={{ height: 0, margin: 0, padding: 0 }} />
            {(() => {
              const isExamMode = hasActiveExamMode;
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  <BandCard band={band} glow>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
                        {isExamMode ? "Predicted Grade" : "Total XP"}
                      </div>
                      <div style={{ fontSize: 34, fontWeight: 900, color: "#7c3aed", fontFamily: "'DM Sans', sans-serif" }}>
                        {isExamMode ? (examData?.predictedGrade || "—") : (stats.xp ?? 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(30,27,75,0.4)", marginTop: 2 }}>
                        {isExamMode ? "Target: A*" : "Experience points"}
                      </div>
                    </div>
                  </BandCard>
                  <BandCard band={band}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>Mastery Index</div>
                      <div style={{ fontSize: 34, fontWeight: 900, color: "#1e1b4b", fontFamily: "'DM Sans', sans-serif" }}>{subjectMastery.pct}<span style={{ fontSize: 16, color: "rgba(30,27,75,0.3)" }}>%</span></div>
                      <div style={{ height: 5, borderRadius: 3, background: "rgba(124,58,237,0.1)", marginTop: 8, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 3, width: `${subjectMastery.pct}%`, background: "linear-gradient(90deg, #7c3aed, #a78bfa)", transition: "width 0.8s ease" }} />
                      </div>
                    </div>
                  </BandCard>
                  <BandCard band={band}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: isExamMode && (examData?.daysUntilExam ?? 999) <= 30 ? "#ef4444" : "#7c3aed", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
                        {isExamMode ? "Countdown" : "Streak"}
                      </div>
                      <div style={{ fontSize: 34, fontWeight: 900, color: isExamMode && (examData?.daysUntilExam ?? 999) <= 30 ? "#ef4444" : "#1e1b4b", fontFamily: "'DM Sans', sans-serif" }}>
                        {isExamMode ? (examData?.daysUntilExam ?? "—") : (stats.streak ?? 0)}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(30,27,75,0.4)", marginTop: 2 }}>
                        {isExamMode ? "days to exam" : "day streak"}
                      </div>
                    </div>
                  </BandCard>
                </div>
              );
            })()}

            {/* Encouragement */}
            {encouragement && (
              <BandCard band={band}>
                <TaraEncouragement
                  message={encouragement.text}
                  visible={encouragement.visible !== false}
                  onDismiss={onDismissEncourage}
                />
              </BandCard>
            )}

            {/* ── Sub-Topic Proficiency Card ────────────────────────── */}
            <BandCard band={band} glow>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.15em" }}>Sub-Topic Proficiency</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1e1b4b", marginTop: 2 }}>Mastery by Subject</div>
                </div>
                {/* Subject tabs */}
                <div style={{ display: "flex", gap: 6 }}>
                  {subjects.slice(0, 4).map((s) => {
                    const active = (activeSubject || "").toLowerCase() === s.toLowerCase();
                    return (
                      <button key={s} onClick={() => setActiveSubject(s)}
                        style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1px solid", transition: "all 0.2s",
                          background: active ? "#7c3aed" : "rgba(124,58,237,0.04)",
                          color: active ? "#fff" : "#7c3aed",
                          borderColor: active ? "#7c3aed" : "rgba(124,58,237,0.12)",
                        }}>
                        {getSubjectLabel(s, band).split(" ")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <TopicPerformanceBreakdown scholarId={scholarId} subject={activeSubject} supabase={supabase} />
            </BandCard>

            {/* ── Constellation Star Chart (full-width for visibility) ──── */}
            <div data-section="heatmap">
              <BandCard band={band} glow>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>The Constellation</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#1e1b4b", marginBottom: 12 }}>Star Chart</div>
                <ConstellationMap
                  topics={topics} subjects={subjects} subject={activeSubject}
                  onTopicClick={onTopicClick} onSubjectChange={setActiveSubject}
                />
              </BandCard>
            </div>

            {/* ── Deep Space Threshold + Orbital Efficiency (2-col below constellation) ──── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Deep Space Threshold — donut */}
              <BandCard band={band}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>Deep Space Threshold</div>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 8 }}>
                  <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
                    <svg viewBox="0 0 90 90" style={{ width: 90, height: 90 }}>
                      <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(124,58,237,0.08)" strokeWidth="8" />
                      <circle cx="45" cy="45" r="38" fill="none" stroke="#7c3aed" strokeWidth="8" strokeLinecap="round"
                        strokeDasharray="238.76" strokeDashoffset={238.76 * (1 - Math.min((stats.streak ?? 0) / 30, 1))}
                        transform="rotate(-90 45 45)" style={{ transition: "stroke-dashoffset 1s ease" }} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: "#1e1b4b" }}>{stats.streak ?? 0}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(30,27,75,0.35)", textTransform: "uppercase" }}>days</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>Weekly Goal</div>
                    <div style={{ fontSize: 11, color: "rgba(30,27,75,0.45)", marginTop: 2 }}>
                      {Math.round(Math.min((stats.streak ?? 0) / 7, 1) * 100)}% reached
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(124,58,237,0.08)", marginTop: 8, width: 120, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 2, width: `${Math.min((stats.streak ?? 0) / 7, 1) * 100}%`, background: "linear-gradient(90deg, #7c3aed, #a78bfa)" }} />
                    </div>
                  </div>
                </div>
              </BandCard>

              {/* Orbital Efficiency */}
              <BandCard band={band}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>Orbital Efficiency</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: "#1e1b4b" }}>{((subjectMastery.pct / 10) || 0).toFixed(1)}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(30,27,75,0.3)" }}>/10</span>
                </div>
                <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, marginTop: 4,
                  background: subjectMastery.pct >= 80 ? "rgba(16,185,129,0.08)" : subjectMastery.pct >= 50 ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)",
                  color: subjectMastery.pct >= 80 ? "#059669" : subjectMastery.pct >= 50 ? "#d97706" : "#dc2626",
                  border: `1px solid ${subjectMastery.pct >= 80 ? "rgba(16,185,129,0.15)" : subjectMastery.pct >= 50 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)"}`,
                }}>
                  {subjectMastery.pct >= 80 ? "OPTIMAL FLOW" : subjectMastery.pct >= 50 ? "DEVELOPING" : "WARMING UP"}
                </div>
                {/* Mini bar chart */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, marginTop: 12, height: 32 }}>
                  {[65, 72, 58, 80, 91, 85, subjectMastery.pct].map((v, i) => (
                    <div key={i} style={{ flex: 1, height: `${v * 0.32}px`, borderRadius: 3, background: i === 6 ? "#7c3aed" : "rgba(124,58,237,0.12)", transition: "height 0.5s ease" }} />
                  ))}
                </div>
              </BandCard>
            </div>

            {/* ── Active Research Modules (Revision Planner) ─────────── */}
            {masteryData.length > 0 && (
              <BandCard band={band} glow>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.15em" }}>Active Research Modules</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#1e1b4b", marginTop: 2 }}>Revision Planner</div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase" }}>Targeting Grade Boundaries</div>
                </div>
                <RevisionPlanner
                  masteryData={masteryData} examDate={examData?.examDate}
                  examName={examData?.examName} onStartTopic={onStartRevisionTopic}
                />
              </BandCard>
            )}

            {/* ── Exam Panel (only for scholars enrolled in exam mode e.g. 11+) ──────── */}
            {examData && hasActiveExamMode && (
              <BandCard band={band}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>Grade Trajectory</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#1e1b4b", marginBottom: 12 }}>Exam Intelligence</div>
                <ExamPanel
                  predictedGrade={examData.predictedGrade} previousGrade={examData.previousGrade}
                  examName={examData.examName} daysUntilExam={examData.daysUntilExam}
                  topicsRemaining={examData.topicsRemaining} mocksCompleted={examData.mocksCompleted}
                  revisionPlan={examData.revisionPlan ?? []}
                />
              </BandCard>
            )}

            {/* ── Simulation Bay (main content anchor for nav linking) ─── */}
            <div data-section="tutor">
              <BandCard band={band} glow>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>Simulation Bay</div>
                <MockTestLauncher
                  subject={activeSubject?.toLowerCase() || "mathematics"}
                  curriculum={scholar.curriculum} examMode={scholar.exam_mode || "general"}
                  pastMocks={pastMocks} onStartMock={onStartMock}
                />
              </BandCard>
            </div>

            {/* ── Discovery Feed (mobile: Flashcards) ────────── */}
            <div className="xl:hidden">
              <BandCard band={band} glow>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>Active Recall</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#1e1b4b", marginBottom: 12 }}>Flashcard Deck</div>
                <Flashcards scholarId={scholarId} subject={activeSubject}
                  curriculum={scholar.curriculum} supabase={supabase} />
              </BandCard>
            </div>

            {/* ── Year Progression Chart (from KS3 data viz) ──── */}
            {masteryData.length > 0 && (
              <BandCard band={band}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>Orbital Trajectory</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#1e1b4b", marginBottom: 12 }}>Year Progression</div>
                <SubjectProgressChart masteryData={masteryData} subjects={subjects} />
              </BandCard>
            )}

            {/* ── Weekly Goals ──── */}
            <BandCard band={band}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>Mission Objectives</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#1e1b4b", marginBottom: 12 }}>Weekly Goals</div>
              <GoalSetting scholarId={scholarId} stats={stats} />
            </BandCard>

            {/* ── Quest Journal ──── */}
            <BandCard band={band}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>Flight Log</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#1e1b4b", marginBottom: 12 }}>Recent Activity</div>
              <QuestJournal entries={journalEntries} />
            </BandCard>

            {/* Sticker Collection */}
            <StickerCollection
              band="ks4"
              earnedBadgeIds={earnedBadgeIds}
              milestones={{
                questsCompleted: stats.questsCompleted ?? stats.quests ?? 0,
                streak: stats.streak ?? 0,
                accuracy: stats.bestAccuracy ?? stats.accuracy ?? 0,
                totalXP: stats.xp ?? stats.totalXP ?? 0,
                masteryPct: subjectMastery.pct ?? 0,
                mocksCompleted: examData?.mocksCompleted ?? 0,
              }}
            />
          </>
        )}

        {/* ── Certificates — all bands (self-gates: returns null if no certs) ── */}
        {masteryData.length > 0 && (
          <BandCard band={band}>
            <CertificatesPanel records={masteryData} scholarName={scholar.name || "Scholar"} />
          </BandCard>
        )}
      </div>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RIGHT SIDEBAR — Band-Adaptive Components
  // ═══════════════════════════════════════════════════════════════════════════
  const rightSidebar = (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative", zIndex: 1 }}>

      {/* KS1: Digital Pet Prominent */}
      {band === "ks1" && <DigitalPet totalXp={stats.xp ?? 0} scholarId={scholarId} />}

      {/* KS2: Leaderboard + Career Mini-Cards */}
      {band === "ks2" && (
        <>
          <AdaptiveLeaderboard entries={leaderboard} currentScholarId={scholarId} />
          {careerTopic && <CareerPopup topic={careerTopic} subject={activeSubject} onDismiss={onDismissCareer} />}
        </>
      )}

      {/* KS3: Peer Comparison + Leaderboard + Career */}
      {band === "ks3" && (
        <>
          {peerComparisons.length > 0 && <PeerComparison comparisons={peerComparisons} />}
          <AdaptiveLeaderboard entries={leaderboard} currentScholarId={scholarId} />
          {careerTopic && <CareerPopup topic={careerTopic} subject={activeSubject} onDismiss={onDismissCareer} />}
        </>
      )}

      {/* KS4: Flashcards + Mock Test + Leaderboard */}
      {band === "ks4" && (
        <>
          <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.08)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>Active Recall</div>
            <Flashcards scholarId={scholarId} subject={activeSubject}
              curriculum={scholar.curriculum} supabase={supabase} />
          </div>
          <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.08)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>Simulation Bay</div>
            <MockTestLauncher
              subject={activeSubject?.toLowerCase() || "mathematics"}
              curriculum={scholar.curriculum} examMode={scholar.exam_mode || "general"}
              pastMocks={pastMocks} onStartMock={onStartMock}
            />
          </div>
          {peerComparisons.length > 0 && <PeerComparison comparisons={peerComparisons} />}
          <AdaptiveLeaderboard entries={leaderboard} currentScholarId={scholarId} />
        </>
      )}

      {/* All bands: Common sidebar items */}
      {band !== "ks1" && <DigitalPet totalXp={stats.xp ?? 0} scholarId={scholarId} />}

      {/* Exam panel only for KS3+ when parent explicitly enrolled scholar in exam mode */}
      {band !== "ks4" && band !== "ks1" && band !== "ks2" && examData && hasActiveExamMode && <ExamPanel
        predictedGrade={examData.predictedGrade} previousGrade={examData.previousGrade}
        examName={examData.examName} daysUntilExam={examData.daysUntilExam}
        topicsRemaining={examData.topicsRemaining} mocksCompleted={examData.mocksCompleted}
        revisionPlan={examData.revisionPlan ?? []}
      />}

      {band !== "ks2" && band !== "ks3" && <AdaptiveLeaderboard entries={leaderboard} currentScholarId={scholarId} />}

      {band === "ks1" && peerComparisons.length > 0 && <PeerComparison comparisons={peerComparisons} />}

      {band !== "ks3" && band !== "ks4" && <GoalSetting scholarId={scholarId} stats={stats} />}

      {band !== "ks4" && <Flashcards scholarId={scholarId} subject={activeSubject}
        curriculum={scholar.curriculum} supabase={supabase} />}

      {band !== "ks2" && band !== "ks4" && careerTopic && <CareerPopup topic={careerTopic} subject={activeSubject} onDismiss={onDismissCareer} />}

      {/* Mock Test Launcher (desktop only, KS3/4) */}
      <div className="hidden xl:block">
        {(band === "ks3" || band === "ks4") && (
          <MockTestLauncher
            subject={activeSubject?.toLowerCase() || "mathematics"}
            curriculum={scholar.curriculum} examMode={scholar.exam_mode || "general"}
            pastMocks={pastMocks} onStartMock={onStartMock}
          />
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TOP BAR BADGES
  // ═══════════════════════════════════════════════════════════════════════════
  const topBarLeft = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 14px", borderRadius: 999,
        background: cfg.accentBg, border: `1px solid ${cfg.accentGlow || cfg.accentBg}` }}>
        <span style={{ fontSize: 12 }}>⚡</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: cfg.accent }}>
          {(stats.xp ?? 0).toLocaleString()} XP
        </span>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.textMuted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
        {gradeLabel}
      </span>
      {(stats.streak ?? 0) > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999,
          background: isDark ? "rgba(249,115,22,0.08)" : "rgba(249,115,22,0.06)",
          border: `1px solid ${isDark ? "rgba(249,115,22,0.12)" : "rgba(249,115,22,0.1)"}` }}>
          <span style={{ fontSize: 12 }}>🔥</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#fb923c" : "#ea580c" }}>{stats.streak}d</span>
        </div>
      )}
      {coins > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999,
          background: isDark ? "rgba(234,179,8,0.08)" : "rgba(234,179,8,0.06)",
          border: `1px solid ${isDark ? "rgba(234,179,8,0.12)" : "rgba(234,179,8,0.1)"}` }}>
          <span style={{ fontSize: 12 }}>🪙</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#facc15" : "#ca8a04" }}>{coins}</span>
        </div>
      )}
      {isFreeTier && <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b" }}>{todayQCount}/10 today</span>}

      {/* KS4: Status badges */}
      {band === "ks4" && subjectMastery.pct >= 80 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999,
          background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", animation: "ks4Badge 2s ease-in-out infinite" }}>
          <span style={{ fontSize: 10 }}>✓</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em" }}>OPTIMAL</span>
        </div>
      )}
    </div>
  );

  const topBarRight = (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {onAvatar && (
        <button onClick={onAvatar} style={{
          padding: "4px 10px", borderRadius: 8,
          background: "transparent", border: "none",
          cursor: "pointer", color: cfg.textMuted,
          display: "flex", alignItems: "center", gap: 4,
        }} title="Avatar Shop">
          <MIcon name="face" size={18} />
          <span className="hidden lg:inline" style={{ fontSize: 11, fontWeight: 700 }}>Avatar</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      <DashboardTour type="scholar" userId={scholarId} band={band} />
      <TaraFloatingBlurb scholarName={scholar.name} />
      <DashboardShell
        band={band}
        scholarName={scholar.name || scholar.codename || "Scholar"}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSignOut={onSignOut}
        onStartQuest={() => onStartQuest?.(activeSubject)}
        onAction={handleNavAction}
        yearLevel={scholar.year_level || 3}
        mainContent={mainContent}
        rightSidebar={rightSidebar}
        topBarLeft={topBarLeft}
        topBarRight={topBarRight}
      />
      {/* Nebula Trials modal (KS2 Y3+) — dark underlay hides dashboard completely */}
      {showNebulaTrials && (
        <div className="fixed inset-0 z-[7999]" style={{ backgroundColor: "#0a0a1a" }}>
          <Suspense fallback={null}>
            <NebulaTrials
              student={scholar}
              onClose={() => setShowNebulaTrials(false)}
              onXPEarned={async (xp) => {
                if (scholar?.id && xp > 0 && supabase) {
                  await supabase.from("scholar_skill_levels").upsert({
                    scholar_id: scholar.id, subject: "maths", skill: "times_tables", xp_total: xp,
                  }, { onConflict: "scholar_id,subject,skill", ignoreDuplicates: false });
                }
              }}
            />
          </Suspense>
        </div>
      )}
    </>
  );
}