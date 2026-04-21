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

import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import gsap from "gsap";
import DashboardShell, { MIcon, NAV_CONFIG } from "./DashboardShell";

// ── Data-connected components ────────────────────────────────────────────────
import AdaptiveGreeting from "./AdaptiveGreeting";
import AdaptiveStats from "./AdaptiveStats";
import DailyAdventure from "./DailyAdventure";
import TaraEncouragement from "./TaraEncouragement";
import SkillMap from "./SkillMap";
import dynamic from "next/dynamic";
const GalaxyMap = dynamic(() => import("@/components/adventure/GalaxyMap"), { ssr: false });
const PhaserGalaxyMap = dynamic(() => import("@/components/phaser/PhaserGalaxyMap"), { ssr: false });
const PhaserConstellationMap = dynamic(() => import("@/components/phaser/PhaserConstellationMap"), { ssr: false });
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
import DashboardTour, { TourHelpButton, SectionTip } from "@/components/DashboardTour";
import Flashcards from "./Flashcards";
import CertificatesPanel from "./CertificatesPanel";
import SubjectProgressChart from "./SubjectProgressChart";
import { getSubjectLabel } from "@/lib/subjectDisplay";
import TaraFloatingBlurb from "./TaraFloatingBlurb";

// ── KS4 Phase 1 Visualizations + Analytics Charts ──────────────────────────
import MasteryProgressChart from "./ProgressChart";
import TopicHeatmap from "./TopicHeatmap";
import RetentionHealthRing from "./RetentionHealthRing";
import StudySessionMetrics from "./StudySessionMetrics";
import CertificateProgress from "./CertificateProgress";
import MockTestDebrief from "./MockTestDebrief";
import WAECCountdown from "./WAECCountdown";
import WAECGradeTracker from "./WAECGradeTracker";

// 3D Simulation Cards — shelved

// ── Export Report helper ─────────────────────────────────────────────────────
function generateReport({ scholar, stats, masteryData, subjects, activeSubject, band }) {
  const titleCase = s => (s || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  // Group mastery by subject
  const bySubject = {};
  (masteryData || []).forEach(r => {
    const subj = (r.subject || "unknown").toLowerCase();
    if (!bySubject[subj]) bySubject[subj] = [];
    bySubject[subj].push(r);
  });

  let topicRows = "";
  Object.entries(bySubject).forEach(([subj, rows]) => {
    const sorted = rows.sort((a, b) => (b.mastery_score ?? 0) - (a.mastery_score ?? 0));
    sorted.forEach(r => {
      const pct = Math.round((r.mastery_score ?? 0) * 100);
      const tier = pct >= 90 ? "Stellar" : pct >= 70 ? "Proficient" : pct >= 50 ? "Developing" : pct >= 30 ? "Emerging" : "Beginner";
      const color = pct >= 70 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
      topicRows += `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${getSubjectLabel(subj, band)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${titleCase(r.topic)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">
          <span style="color:${color};font-weight:700">${pct}%</span>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${tier}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${r.times_seen ?? 0}</td>
      </tr>`;
    });
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Scholar Report — ${scholar.name || "Scholar"}</title>
<style>body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:40px;color:#1e293b;background:#fff}
h1{font-size:28px;margin:0 0 4px}h2{font-size:18px;color:#6d28d9;margin:32px 0 12px;border-bottom:2px solid #ede9fe;padding-bottom:6px}
.meta{color:#64748b;font-size:13px;margin-bottom:24px}.stats{display:flex;gap:20px;margin:20px 0}
.stat-card{flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center}
.stat-val{font-size:32px;font-weight:900;color:#6d28d9}.stat-lbl{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-top:4px}
table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f8fafc;padding:10px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:2px solid #e2e8f0}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
@media print{body{padding:20px}.no-print{display:none}}</style></head>
<body>
<h1>📊 Scholar Progress Report</h1>
<p class="meta">${scholar.name || "Scholar"} · Year ${scholar.year_level || "?"} · ${titleCase(scholar.curriculum || "uk_national")} · Generated ${date}</p>
<div class="stats">
  <div class="stat-card"><div class="stat-val">${(stats.xp ?? 0).toLocaleString()}</div><div class="stat-lbl">Total Stardust</div></div>
  <div class="stat-card"><div class="stat-val">${stats.questsCompleted ?? 0}</div><div class="stat-lbl">Missions Completed</div></div>
  <div class="stat-card"><div class="stat-val">${stats.streak ?? 0}</div><div class="stat-lbl">Day Streak</div></div>
</div>
<h2>Subject &amp; Topic Mastery</h2>
<table><thead><tr><th>Subject</th><th>Topic</th><th style="text-align:center">Mastery</th><th style="text-align:center">Tier</th><th style="text-align:center">Attempts</th></tr></thead>
<tbody>${topicRows || '<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8">No mastery data yet</td></tr>'}</tbody></table>
<div class="footer">Quest Academy — LaunchPard · This report is auto-generated from the scholar's learning data.</div>
<script class="no-print">window.onload=()=>window.print();<\/script>
</body></html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
import StickerCollection from "./StickerCollection";
import TopicPerformanceBreakdown from "@/components/TopicPerformanceBreakdown";
import FeatureGate from "@/components/gates/FeatureGate";
import { hasFeature, canAddScholar } from "@/lib/tierAccess";
import PushNotificationPrompt from "@/components/pwa/PushNotificationPrompt";
import MasteryConfetti, { useMasteryConfetti } from "@/components/MasteryConfetti";
import DifficultyBadge from "@/components/DifficultyBadge";
import StreakHeatmap from "@/components/StreakHeatmap";
import MemoryGuardianPlaceholder from "@/components/dashboard/MemoryGuardianPlaceholder";
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
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden", background: "#0c0f1a" }}>
      {/* Tech grid — tight 32px grid, subtle blue-slate */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.06,
        backgroundImage: "linear-gradient(rgba(91,106,191,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(91,106,191,0.6) 1px, transparent 1px)",
        backgroundSize: "32px 32px" }} />
      {/* Radar sweep — bottom-right quadrant */}
      <div style={{ position: "absolute", width: 600, height: 600, bottom: "-15%", right: "-10%", opacity: 0.08 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
          border: "1px solid rgba(91,106,191,0.25)" }} />
        <div style={{ position: "absolute", inset: "15%", borderRadius: "50%",
          border: "1px solid rgba(91,106,191,0.18)" }} />
        <div style={{ position: "absolute", inset: "30%", borderRadius: "50%",
          border: "1px solid rgba(91,106,191,0.12)" }} />
        {/* Sweep arm */}
        <div style={{ position: "absolute", top: "50%", left: "50%", width: "50%", height: 2,
          background: "linear-gradient(90deg, rgba(91,106,191,0.5), transparent)",
          transformOrigin: "0 50%", animation: "ks3RadarSweep 8s linear infinite" }} />
      </div>
      {/* Soft accent orb — top right, blue-slate */}
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", top: "-8%", right: "-12%", opacity: 0.08,
        background: "radial-gradient(circle, rgba(91,106,191,0.25) 0%, transparent 70%)" }} />
      {/* Secondary orb — bottom left, cyan */}
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", bottom: "5%", left: "-8%", opacity: 0.06,
        background: "radial-gradient(circle, rgba(14,165,233,0.25) 0%, transparent 70%)" }} />
      {/* Horizontal scan line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, opacity: 0.08,
        background: "rgba(91,106,191,0.5)", animation: "ks3ScanLine 12s linear infinite" }} />
      {/* Vertical scan line */}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 1, opacity: 0.06,
        background: "rgba(91,106,191,0.4)", animation: "ks3VSweep 18s linear infinite" }} />
      {/* HUD corner brackets — viewport corners, brighter */}
      <svg width="60" height="60" style={{ position: "absolute", top: 12, left: 12, opacity: 0.15 }}>
        <path d="M0 50 L0 4 Q0 0 4 0 L50 0" fill="none" stroke="rgba(91,106,191,0.4)" strokeWidth="2" />
      </svg>
      <svg width="60" height="60" style={{ position: "absolute", top: 12, right: 12, opacity: 0.15 }}>
        <path d="M60 50 L60 4 Q60 0 56 0 L10 0" fill="none" stroke="rgba(91,106,191,0.4)" strokeWidth="2" />
      </svg>
      <svg width="60" height="60" style={{ position: "absolute", bottom: 12, left: 12, opacity: 0.15 }}>
        <path d="M0 10 L0 56 Q0 60 4 60 L50 60" fill="none" stroke="rgba(91,106,191,0.4)" strokeWidth="2" />
      </svg>
      <svg width="60" height="60" style={{ position: "absolute", bottom: 12, right: 12, opacity: 0.15 }}>
        <path d="M60 10 L60 56 Q60 60 56 60 L10 60" fill="none" stroke="rgba(91,106,191,0.4)" strokeWidth="2" />
      </svg>
    </div>
  );
}

function KS4AtelierAmbient() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {/* Base — deep obsidian */}
      <div style={{ position: "absolute", inset: 0, background: "#0a0a14" }} />

      {/* Nebula washes — dramatic, clearly visible glows */}
      <div style={{ position: "absolute", inset: 0,
        background: [
          "radial-gradient(ellipse 100% 80% at 10% 0%, rgba(139,92,246,0.35) 0%, transparent 55%)",
          "radial-gradient(ellipse 80% 70% at 90% 80%, rgba(99,102,241,0.25) 0%, transparent 50%)",
          "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(109,40,217,0.15) 0%, transparent 50%)",
          "radial-gradient(ellipse 70% 50% at 75% 15%, rgba(167,139,250,0.20) 0%, transparent 50%)",
          "radial-gradient(ellipse 50% 60% at 30% 70%, rgba(124,58,237,0.18) 0%, transparent 50%)",
        ].join(", "),
      }} />

      {/* Star field — clearly visible scattered dots */}
      <div style={{ position: "absolute", inset: 0,
        backgroundImage: [
          "radial-gradient(2.5px 2.5px at 20% 15%, rgba(167,139,250,0.85) 0%, transparent 100%)",
          "radial-gradient(2px 2px at 45% 35%, rgba(139,92,246,0.7) 0%, transparent 100%)",
          "radial-gradient(2.5px 2.5px at 72% 22%, rgba(196,181,253,0.8) 0%, transparent 100%)",
          "radial-gradient(2px 2px at 15% 65%, rgba(167,139,250,0.65) 0%, transparent 100%)",
          "radial-gradient(2.5px 2.5px at 88% 55%, rgba(139,92,246,0.7) 0%, transparent 100%)",
          "radial-gradient(2px 2px at 55% 78%, rgba(196,181,253,0.65) 0%, transparent 100%)",
          "radial-gradient(2.5px 2.5px at 33% 92%, rgba(167,139,250,0.7) 0%, transparent 100%)",
          "radial-gradient(3px 3px at 8% 42%, rgba(255,255,255,0.6) 0%, transparent 100%)",
          "radial-gradient(3px 3px at 62% 8%, rgba(255,255,255,0.55) 0%, transparent 100%)",
          "radial-gradient(2px 2px at 95% 90%, rgba(139,92,246,0.65) 0%, transparent 100%)",
          "radial-gradient(3px 3px at 40% 5%, rgba(255,255,255,0.5) 0%, transparent 100%)",
          "radial-gradient(2px 2px at 78% 48%, rgba(196,181,253,0.6) 0%, transparent 100%)",
          "radial-gradient(2.5px 2.5px at 5% 88%, rgba(167,139,250,0.65) 0%, transparent 100%)",
          "radial-gradient(3px 3px at 52% 60%, rgba(255,255,255,0.45) 0%, transparent 100%)",
          "radial-gradient(2px 2px at 25% 42%, rgba(196,181,253,0.55) 0%, transparent 100%)",
          "radial-gradient(2.5px 2.5px at 68% 72%, rgba(167,139,250,0.6) 0%, transparent 100%)",
          "radial-gradient(2px 2px at 82% 32%, rgba(255,255,255,0.4) 0%, transparent 100%)",
          "radial-gradient(3px 3px at 12% 28%, rgba(139,92,246,0.55) 0%, transparent 100%)",
        ].join(", "),
      }} />

      {/* Grid overlay — visible, masked to center with fade-out edges */}
      <div style={{ position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(139,92,246,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.08) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 70%)",
      }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND-SPECIFIC CARD WRAPPERS & TYPOGRAPHY
// ═══════════════════════════════════════════════════════════════════════════════

function BandCard({ band, children, glow, accent, className = "", style = {}, id, "data-section": dataSection }) {
  const cardRef = useRef(null);

  // ── GSAP scroll-triggered entrance animation ──────────────────────────────
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    // Start invisible + shifted down
    gsap.set(el, { opacity: 0, y: 30 });
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          gsap.to(el, {
            opacity: 1, y: 0,
            duration: 0.55, ease: "power3.out",
            delay: Math.random() * 0.12, // slight stagger variation
          });
          observer.unobserve(el);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── CSS 3D tilt on hover (pointer-follow) ─────────────────────────────────
  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;  // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const tiltX = -y * 3;   // subtle: max 1.5deg
    const tiltY = x * 3;
    gsap.to(el, {
      rotateX: tiltX, rotateY: tiltY,
      duration: 0.4, ease: "power2.out", overwrite: "auto",
    });
  };
  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    gsap.to(el, {
      rotateX: 0, rotateY: 0, scale: 1,
      duration: 0.5, ease: "elastic.out(1, 0.5)", overwrite: "auto",
    });
  };

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
      background: "rgba(15,20,35,0.6)", borderRadius: 12,
      border: glow ? "1px solid rgba(91,106,191,0.25)" : "1px solid rgba(91,106,191,0.12)",
      boxShadow: glow
        ? "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03), 0 0 20px rgba(91,106,191,0.08)"
        : "0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", padding: 20,
      position: "relative", overflow: "hidden",
    },
    ks4: {
      background: "rgba(18,16,32,0.7)", borderRadius: 16,
      border: `1px solid ${glow ? "rgba(139,92,246,0.25)" : "rgba(139,92,246,0.12)"}`,
      boxShadow: glow
        ? "0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03), 0 0 40px rgba(139,92,246,0.06)"
        : "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.02)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", padding: 20,
      position: "relative", overflow: "hidden",
    },
  };
  const cardStyle = styles[band] || styles.ks3;
  return (
    <div
      ref={cardRef}
      id={id}
      data-section={dataSection}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...cardStyle, ...style,
        perspective: "800px",
        transformStyle: "preserve-3d",
        willChange: "transform, opacity",
        transition: "box-shadow 0.3s ease",
      }}
      className={`band-card-3d ${className}`}
    >
      {band === "ks4" && glow && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 16, overflow: "hidden" }}>
          {/* Top edge highlight — thin violet gradient line */}
          <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
            background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.3) 50%, transparent)",
          }} />
          {/* Subtle scan sweep */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "200%",
            background: "linear-gradient(180deg, transparent, rgba(139,92,246,0.03), transparent)",
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
// KS3 HUD PANEL — Cockpit dock panel wrapper with designation label
// ═══════════════════════════════════════════════════════════════════════════════

function HudPanel({ designation, label, children, glow, span, dataSection, style: extraStyle = {} }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    gsap.set(el, { opacity: 0, y: 20 });
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        gsap.to(el, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", delay: Math.random() * 0.1 });
        obs.unobserve(el);
      }
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={panelRef}
      data-section={dataSection}
      style={{
        position: "relative", borderRadius: 12, overflow: "hidden",
        background: "rgba(15,20,35,0.5)",
        border: glow ? "1px solid rgba(91,106,191,0.25)" : "1px solid rgba(91,106,191,0.15)",
        boxShadow: glow ? "0 4px 20px rgba(0,0,0,0.3), 0 0 20px rgba(91,106,191,0.08)" : "0 4px 20px rgba(0,0,0,0.3)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        animation: glow ? "ks3PanelGlow 6s ease-in-out infinite" : "none",
        gridColumn: span === 2 ? "1 / -1" : "auto",
        ...extraStyle,
      }}
    >
      {/* Top designation bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "6px 14px", borderBottom: "1px solid rgba(91,106,191,0.12)",
        background: "rgba(91,106,191,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {designation && (
            <span style={{
              fontSize: 9, fontWeight: 900, fontFamily: "'DM Mono', 'JetBrains Mono', monospace",
              color: "#fff", letterSpacing: "0.15em", textTransform: "uppercase",
              background: "#5b6abf", padding: "2px 8px", borderRadius: 4,
              border: "1px solid rgba(91,106,191,0.3)",
            }}>{designation}</span>
          )}
          {label && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(148,163,184,0.6)",
              letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
          )}
        </div>
        {/* Status dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981",
            boxShadow: "0 0 8px rgba(16,185,129,0.6)", animation: "ks3GaugePulse 3s ease-in-out infinite" }} />
          <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(16,185,129,0.8)",
            textTransform: "uppercase", letterSpacing: "0.1em" }}>LIVE</span>
        </div>
      </div>
      {/* HUD corner accents inside panel */}
      <svg width="14" height="14" style={{ position: "absolute", top: 30, left: 4, opacity: 0.12 }}>
        <path d="M0 12 L0 2 Q0 0 2 0 L12 0" fill="none" stroke="#5b6abf" strokeWidth="1.2" />
      </svg>
      <svg width="14" height="14" style={{ position: "absolute", top: 30, right: 4, opacity: 0.12 }}>
        <path d="M14 12 L14 2 Q14 0 12 0 L2 0" fill="none" stroke="#5b6abf" strokeWidth="1.2" />
      </svg>
      {/* Content area */}
      <div style={{ padding: 16 }}>
        {children}
      </div>
    </div>
  );
}

// ── KS3 Subject Radar — hexagonal subject mastery visualization ─────────────
function SubjectRadar({ subjects, masteryData }) {
  const subjectList = subjects?.length ? subjects.slice(0, 6) : ["Maths", "English", "Science"];
  const count = subjectList.length;
  const cx = 90, cy = 90, maxR = 70;

  // compute mastery per subject
  const values = subjectList.map(subj => {
    const items = masteryData.filter(m => (m.subject || "").toLowerCase() === subj.toLowerCase());
    if (!items.length) return 0;
    const avg = items.reduce((s, m) => s + (m.mastery_score ?? m.composite_mastery ?? 0), 0) / items.length;
    return Math.min(100, Math.round(avg));
  });

  const angleStep = (2 * Math.PI) / count;
  const startAngle = -Math.PI / 2; // top

  const getPoint = (i, r) => {
    const angle = startAngle + i * angleStep;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  // grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];
  // data polygon
  const dataPoints = values.map((v, i) => getPoint(i, (v / 100) * maxR));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + " Z";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={180} height={180} viewBox="0 0 180 180">
        {/* Grid rings */}
        {rings.map((r, ri) => {
          const pts = Array.from({ length: count }, (_, i) => getPoint(i, r * maxR));
          const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + " Z";
          return <path key={ri} d={path} fill="none" stroke="rgba(91,106,191,0.15)"
            strokeWidth={ri === rings.length - 1 ? 1.5 : 0.8} strokeDasharray={ri < rings.length - 1 ? "3 3" : "none"} />;
        })}
        {/* Axis lines */}
        {subjectList.map((_, i) => {
          const [ex, ey] = getPoint(i, maxR);
          return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(91,106,191,0.12)" strokeWidth="0.8" />;
        })}
        {/* Data polygon */}
        <path d={dataPath} fill="rgba(91,106,191,0.15)" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round" />
        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="#818cf8" stroke="#0c0f1a" strokeWidth="1.5" />
        ))}
        {/* Labels */}
        {subjectList.map((subj, i) => {
          const [lx, ly] = getPoint(i, maxR + 16);
          return (
            <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
              fontSize="8" fontWeight="700" fill="rgba(148,163,184,0.7)"
              style={{ fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {subj.slice(0, 6)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ── KS3 Gauge Readout — arc gauge for a single metric ───────────────────────
function HudGauge({ value = 0, max = 100, label, colour = "#5b6abf", size = 64 }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const r = (size - 10) / 2;
  const cx = size / 2, cy = size / 2;
  // 240-degree arc (from 150deg to 390deg)
  const arcLen = (240 / 360) * 2 * Math.PI * r;
  const filled = (pct / 100) * arcLen;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(91,106,191,0.12)" strokeWidth={4}
          strokeDasharray={`${arcLen} 999`}
          strokeLinecap="round"
          style={{ transform: "rotate(150deg)", transformOrigin: "50% 50%" }} />
        {/* Filled arc */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={colour} strokeWidth={4}
          strokeDasharray={`${filled} 999`}
          strokeLinecap="round"
          style={{ transform: "rotate(150deg)", transformOrigin: "50% 50%", transition: "stroke-dasharray 0.8s ease" }} />
        {/* Value text */}
        <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.28} fontWeight="900" fill={colour}
          style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {typeof value === "number" ? Math.round(value) : value}
        </text>
      </svg>
      <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(148,163,184,0.5)",
        textTransform: "uppercase", letterSpacing: "0.1em", lineHeight: 1 }}>{label}</span>
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
      @keyframes ks3ScanLine { 0%{transform:translateY(-100%)} 100%{transform:translateY(200%)} }
      @keyframes ks3DataSweep { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      @keyframes ks3VSweep { 0%{transform:translateY(-100%)} 100%{transform:translateY(200%)} }
      @keyframes ks3RadarSweep { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
      @keyframes ks3GaugePulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
      @keyframes ks3PanelGlow { 0%,100%{box-shadow:0 4px 20px rgba(0,0,0,0.3)} 50%{box-shadow:0 4px 20px rgba(0,0,0,0.3), 0 0 20px rgba(91,106,191,0.12)} }
      @keyframes ks3GridPulse { 0%,100%{opacity:0.06} 50%{opacity:0.09} }
    `,
    ks4: `
      @keyframes ks4Scan { 0%{backgroundPosition:0 0} 100%{backgroundPosition:0 100%} }
      @keyframes ks4GlowPulse { 0%,100%{box-shadow:0 0 20px rgba(139,92,246,0.1)} 50%{box-shadow:0 0 32px rgba(139,92,246,0.18)} }
      @keyframes ks4Badge { 0%,100%{opacity:0.8;transform:scale(1)} 50%{opacity:1;transform:scale(1.03)} }
      @keyframes ks4GridFade { 0%,100%{opacity:0.04} 50%{opacity:0.07} }
      @keyframes ks4NodePulse { 0%,100%{opacity:0.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
      @keyframes ks4DonutFill { from{stroke-dashoffset:251} to{stroke-dashoffset:var(--target)} }
      @keyframes ks4StatusPulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
    `,
  };
  const shared3D = `
    .band-card-3d {
      transform-style: preserve-3d;
      transition: box-shadow 0.3s ease;
    }
    .band-card-3d:hover {
      box-shadow: 0 12px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9) !important;
    }
  `;
  return <style>{shared3D}{keyframes[band] || ""}</style>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEEKLY ACTIVITY GRID — 7-day streak/activity visualisation
// ═══════════════════════════════════════════════════════════════════════════════

function WeeklyActivityGrid({ activityCalendar = [], stats = {} }) {
  const { band } = useTheme();
  const isDark = band === "ks3" || band === "ks4";
  const days = useMemo(() => {
    const today = new Date();
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const entry = activityCalendar.find((a) => a.date === iso);
      const dayLabel = d.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 2);
      const isToday = i === 0;
      result.push({
        date: iso,
        dayLabel,
        isToday,
        questionsAnswered: entry?.questionsAnswered ?? entry?.questions_answered ?? 0,
        minutesSpent: entry?.minutesSpent ?? entry?.minutes_spent ?? 0,
        hasActivity: (entry?.questionsAnswered ?? entry?.questions_answered ?? 0) > 0,
      });
    }
    return result;
  }, [activityCalendar]);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
        {days.map((day, index) => {
          const intensity = Math.min(day.questionsAnswered / 15, 1); // max out at 15 questions
          return (
            <div key={`${day.date}-${index}`} style={{ flex: 1, textAlign: "center" }}>
              <div style={{
                fontSize: 9, fontWeight: 700,
                color: day.isToday
                  ? (isDark ? "#a78bfa" : "#8b5cf6")
                  : (isDark ? "rgba(148,163,184,0.4)" : "rgba(30,27,75,0.35)"),
                marginBottom: 4, textTransform: "uppercase",
              }}>
                {day.dayLabel}
              </div>
              <div style={{
                width: "100%", aspectRatio: "1", borderRadius: 8, minHeight: 28,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: day.hasActivity
                  ? (isDark ? `rgba(139,92,246,${0.15 + intensity * 0.35})` : `rgba(139,92,246,${0.08 + intensity * 0.32})`)
                  : day.isToday
                    ? (isDark ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.04)")
                    : (isDark ? "rgba(148,163,184,0.04)" : "rgba(30,27,75,0.02)"),
                border: day.isToday
                  ? (isDark ? "2px solid rgba(167,139,250,0.35)" : "2px solid rgba(139,92,246,0.3)")
                  : day.hasActivity
                    ? (isDark ? "1px solid rgba(139,92,246,0.2)" : "1px solid rgba(139,92,246,0.12)")
                    : (isDark ? "1px solid rgba(148,163,184,0.06)" : "1px solid rgba(30,27,75,0.04)"),
                transition: "all 0.3s",
              }}>
                {day.hasActivity ? (
                  <span style={{ fontSize: 10, fontWeight: 800, color: isDark ? "#c4b5fd" : "#8b5cf6" }}>{day.questionsAnswered}</span>
                ) : day.isToday ? (
                  <span style={{ fontSize: 8, fontWeight: 600, color: isDark ? "rgba(167,139,250,0.5)" : "rgba(139,92,246,0.4)" }}>today</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: isDark ? "rgba(148,163,184,0.4)" : "rgba(30,27,75,0.3)" }}>
          {days.filter((d) => d.hasActivity).length}/7 active days
        </span>
        <span style={{ fontSize: 9, fontWeight: 700, color: isDark ? "#a78bfa" : "#8b5cf6" }}>
          {days.reduce((s, d) => s + d.questionsAnswered, 0)} total questions
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW SCHEDULE WIDGET — spaced repetition due topics
// ═══════════════════════════════════════════════════════════════════════════════

function ReviewScheduleWidget({ reviewSchedule = { dueNow: [], upcoming: [] }, onTopicClick, subject }) {
  const { band } = useTheme();
  const isDark = band === "ks3" || band === "ks4";
  const dueNow = reviewSchedule.dueNow || [];
  const upcoming = reviewSchedule.upcoming || [];
  if (dueNow.length === 0 && upcoming.length === 0) return null;

  const titleCase = (s) => (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div>
      {dueNow.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: isDark ? "#f87171" : "#ef4444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
            Due Now ({dueNow.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {dueNow.slice(0, 5).map((item, i) => (
              <button
                key={i}
                onClick={() => onTopicClick?.({ topic: item.topic, subject: item.subject || subject })}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 10px", borderRadius: 8,
                  background: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)",
                  border: isDark ? "1px solid rgba(239,68,68,0.2)" : "1px solid rgba(239,68,68,0.12)",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? "#e2e8f0" : "#1e1b4b" }}>{titleCase(item.topic)}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: isDark ? "#f87171" : "#ef4444" }}>Review</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {upcoming.length > 0 && (
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: isDark ? "#60a5fa" : "#3b82f6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
            Upcoming ({upcoming.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {upcoming.slice(0, 4).map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "5px 10px", borderRadius: 6,
                background: isDark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.04)",
                border: isDark ? "1px solid rgba(59,130,246,0.15)" : "1px solid rgba(59,130,246,0.08)",
              }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: isDark ? "rgba(226,232,240,0.6)" : "rgba(30,27,75,0.6)" }}>{titleCase(item.topic)}</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: isDark ? "rgba(96,165,250,0.7)" : "rgba(59,130,246,0.6)" }}>
                  {item.next_review_at ? new Date(item.next_review_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COIN SHOP BANNER — prominent "coins + open shop" shortcut in dashboard
// ═══════════════════════════════════════════════════════════════════════════════

function CoinShopBanner({ coins = 0, onOpenShop, isDark = false }) {
  const [showGuide, setShowGuide] = React.useState(false);
  if (!onOpenShop) return null;
  return (
    <div style={{ borderRadius: 14, overflow: "hidden", border: "2px solid #fcd34d", background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)", boxShadow: "0 2px 12px rgba(251,191,36,0.18)" }}>
      <button
        onClick={onOpenShop}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", cursor: "pointer", background: "transparent", border: "none",
          transition: "all 0.2s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>💰</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#92400e", lineHeight: 1 }}>{coins.toLocaleString()}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.06em" }}>Coins</div>
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 10,
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          color: "white", fontSize: 10, fontWeight: 900, textTransform: "uppercase",
          letterSpacing: "0.04em",
          boxShadow: "0 2px 8px rgba(217,119,6,0.3)",
        }}>
          🎨 Shop
        </div>
      </button>
      {/* How to Earn guide toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowGuide(g => !g); }}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          padding: "5px 0", background: "rgba(146,64,14,0.06)", border: "none", borderTop: "1px solid rgba(251,191,36,0.3)",
          cursor: "pointer", fontSize: 10, fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.08em",
        }}
      >
        {showGuide ? "▴ Hide" : "▾ How to earn coins"}
      </button>
      {showGuide && (
        <div style={{ padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            { icon: "🎯", text: "Complete a quiz", detail: "+10 coins" },
            { icon: "⭐", text: "Perfect score", detail: "+20 bonus" },
            { icon: "🔥", text: "Streak milestones", detail: "+5/+15/+30" },
            { icon: "🆕", text: "First topic attempt", detail: "+25 bonus" },
            { icon: "🏆", text: "Quest completion", detail: "+8 coins" },
            { icon: "🚀", text: "Full mission", detail: "+50 coins" },
          ].map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{m.icon}</span>
              <span style={{ fontWeight: 700, color: isDark ? "#e2e8f0" : "#1e293b", flex: 1 }}>{m.text}</span>
              <span style={{ fontWeight: 800, color: "#d97706", fontSize: 10 }}>{m.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdaptiveDashboardLayout({
  scholar = {}, stats = {}, topics = [], subjects = [], subject = "mathematics",
  journalEntries = [], dailyAdventure, encouragement, careerTopic, examData,
  masteryData = [], peerComparisons = [], pastMocks = [], leaderboard = [],
  recentQuizzes = [], mockTests = [], revisionSessions = [],
  subjectProficiency = {}, reviewSchedule = { dueNow: [], upcoming: [] },
  activityCalendar = [],
  scholarId, supabase, coins = 0, todayQCount = 0, effectiveTier = "pro",
  earnedBadgeIds = [], isFirstLogin = false,
  parent = null,  // parent record with region + subscription_tier — drives feature gates
  onSignOut, onAvatar, onStartQuest, onTopicClick, onDismissEncourage,
  onDismissCareer, onStartAdventure, onStartMock, onExamModeSwitch, onStartRevisionTopic, onOpenExams,
  onLaunch3DSimulation,
}) {
  const { band, theme: t, isDark } = useTheme();
  const [activeSubject, setActiveSubject] = useState(subject || subjects[0] || "mathematics");
  const [activeTab, setActiveTab] = useState(
    band === "ks1" ? "adventure" : band === "ks2" ? "mission" : band === "ks4" ? "exams" : "mission"
  );
  const [showNebulaTrials, setShowNebulaTrials] = useState(false);
  const [mockDebriefResult, setMockDebriefResult] = useState(null);

  // ── Mastery confetti ──────────────────────────────────────────────────────
  const { confettiTopic, clearConfetti } = useMasteryConfetti(topics);

  // ── Difficulty level (avg mastery across all topics) ─────────────────────
  const avgMastery = topics.length
    ? topics.reduce((s, t) => s + (t.p_mastery ?? 0), 0) / topics.length
    : 0;

  // ── Tier-gating shim ─────────────────────────────────────────────────────
  // Every feature-gated callback is wrapped so that an under-privileged tier
  // is routed to /subscribe instead of silently failing. UI cards remain
  // visible (driven by `canUse*` flags below) so users see what they're
  // missing.
  const canUseExamPapers    = hasFeature(parent, 'exam_papers');
  const canUse3DSimulations = hasFeature(parent, 'simulations_3d');
  const canUseBossBattles   = hasFeature(parent, 'boss_battles');

  const gatedOpenExams = () => {
    if (!canUseExamPapers) { window.location.href = '/subscribe?feature=exam_papers'; return; }
    if (onOpenExams) onOpenExams();
  };
  const gatedLaunch3DSim = (simId) => {
    if (!canUse3DSimulations) { window.location.href = '/subscribe?feature=simulations_3d'; return; }
    if (onLaunch3DSimulation) onLaunch3DSimulation(simId);
  };

  // Handle nav actions (e.g. opening modals from nav buttons)
  const handleNavAction = (action) => {
    if (action === "nebula-trials") {
      if (!canUseBossBattles) { window.location.href = '/subscribe?feature=boss_battles'; return; }
      setShowNebulaTrials(true);
    }
    if (action === "exam-papers") gatedOpenExams();
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

        {/* Push notification opt-in — shown once until dismissed */}
        <PushNotificationPrompt scholarId={scholarId} />

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
                isFirstLogin={isFirstLogin} questsCompleted={stats.questsCompleted ?? 0}
                curriculum={scholar.curriculum}
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

            {/* ── Study Session Metrics (KS1-friendly) ─────── */}
            <BandCard band={band}>
              <SectionHeader band={band} icon="📊" title="My Star Stats" subtitle="how I'm doing" />
              <StudySessionMetrics stats={stats} examData={null} masteryData={masteryData} />
            </BandCard>

            {/* ── Certificate Progress ─────── */}
            {masteryData.length > 0 && (
              <BandCard band={band}>
                <SectionHeader band={band} icon="🏅" title="My Trophies" subtitle="keep exploring!" />
                <CertificateProgress masteryData={masteryData} subjects={subjects} />
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
                <AdaptiveLeaderboard entries={leaderboard} currentScholarId={scholarId} curriculum={scholar.curriculum} />
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
                isFirstLogin={isFirstLogin} questsCompleted={stats.questsCompleted ?? 0}
                curriculum={scholar.curriculum}
              />
              <div style={{ marginTop: 20 }}>
                {/* Commander Stats Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  <div style={{ textAlign: "center", padding: "14px 6px", borderRadius: 14, background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.06))", border: "1px solid rgba(99,102,241,0.15)", overflow: "hidden" }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>✨</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#4f46e5", lineHeight: 1.1 }}>{(stats.xp ?? 0).toLocaleString()}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#6366f1", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Stardust</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "14px 6px", borderRadius: 14, background: "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(217,70,239,0.06))", border: "1px solid rgba(168,85,247,0.15)", overflow: "hidden" }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>🚀</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#8b5cf6", lineHeight: 1.1 }}>{stats.questsCompleted ?? 0}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#8b5cf6", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Missions Completed</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "14px 6px", borderRadius: 14, background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(251,191,36,0.06))", border: "1px solid rgba(245,158,11,0.15)", overflow: "hidden" }}>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>🔥</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#d97706", lineHeight: 1.1 }}>{stats.streak ?? 0}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#b45309", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Streak</div>
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

            {/* Galaxy Map — Phaser-powered orbital ring layout */}
            <BandCard band={band} glow data-section="galaxy">
              <SectionHeader band={band} icon="🌌" title="Galaxy Map" subtitle="orbital rings" />
              <PhaserGalaxyMap
                scholar={scholar}
                subjects={subjects}
                masteryRecords={masteryData}
                height={460}
                onLaunchQuest={(subjectKey) => {
                  setActiveSubject(subjectKey);
                  if (onStartQuest) onStartQuest(subjectKey);
                  else if (onTopicClick) onTopicClick(subjectKey);
                }}
              />
            </BandCard>

            {/* ── Study Session Metrics (KS2-appropriate) ─────── */}
            <BandCard band={band}>
              <SectionHeader band={band} icon="📊" title="Mission Stats" subtitle="this week" />
              <StudySessionMetrics stats={stats} examData={null} masteryData={masteryData} />
            </BandCard>

            {/* ── Certificate Progress (KS2-appropriate) ─────── */}
            {masteryData.length > 0 && (
              <BandCard band={band}>
                <SectionHeader band={band} icon="🏅" title="Medal Collection" subtitle="unlock certificates" />
                <CertificateProgress masteryData={masteryData} subjects={subjects} />
              </BandCard>
            )}


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
                    background: "linear-gradient(90deg, #4f46e5, #8b5cf6)",
                    borderRadius: 4,
                    transition: "width 0.3s ease",
                  }} />
                </div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#8b5cf6",
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
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(168,85,247,0.04))", border: "1px solid rgba(139,92,246,0.18)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>⭐ Mastery</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#8b5cf6" }}>{subjectMastery.pct}%</div>
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
                <AdaptiveLeaderboard entries={leaderboard} currentScholarId={scholarId} curriculum={scholar.curriculum} />
              </BandCard>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            KS3: SPACE SIMULATOR HUD (Light, Professional, Cockpit-Instrumentation)
            ══════════════════════════════════════════════════════════════════════ */}
        {band === "ks3" && (
          <>
            {/* ── COMMAND DECK: Hero Greeting + Gauge Cluster ────────────────── */}
            <HudPanel designation="CMD" label="Command Deck" glow span={2}>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 280px", minWidth: 0 }}>
                  <AdaptiveGreeting
                    scholarName={scholar.name} streak={stats.streak ?? 0} xp={stats.xp ?? 0}
                    yearLevel={scholar.year_level} examName={examData?.examName}
                    daysUntilExam={examData?.daysUntilExam}
                    avatar={scholar.avatar} onAvatarClick={onAvatar}
                    isFirstLogin={isFirstLogin} questsCompleted={stats.questsCompleted ?? 0}
                    curriculum={scholar.curriculum}
                  />
                </div>
                {/* Instrument gauge cluster */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center", padding: "8px 0" }}>
                  <HudGauge value={subjectMastery.pct} label="Mastery" colour="#5b6abf" />
                  <HudGauge value={stats.bestAccuracy ?? stats.accuracy ?? 0} label="Accuracy" colour="#3b82f6" />
                  <HudGauge value={Math.min(stats.streak ?? 0, 30)} max={30} label="Streak" colour="#f59e0b" />
                  <HudGauge value={examData?.readiness?.score ?? 0} label="Ready" colour="#10b981" />
                </div>
              </div>
              {/* Compact stats row */}
              <div style={{ marginTop: 12, borderTop: "1px solid rgba(91,106,191,0.08)", paddingTop: 10 }}>
                <AdaptiveStats stats={{ ...stats, masteryPct: subjectMastery.pct, topicCount: subjectMastery.count }} />
              </div>
            </HudPanel>

            {/* Exam Mode Switch — only for scholars with active exam mode (e.g. 11+) */}
            {hasActiveExamMode && (
              <HudPanel designation="EXM" label="Exam Configuration">
                <ExamModeSwitch
                  currentMode={scholar.exam_mode || "general"}
                  curriculum={scholar.curriculum}
                  onSwitch={onExamModeSwitch}
                />
              </HudPanel>
            )}

            {/* Encouragement */}
            {encouragement && (
              <HudPanel designation="COM" label="Mission Control">
                <TaraEncouragement
                  message={encouragement.text}
                  visible={encouragement.visible !== false}
                  onDismiss={onDismissEncourage}
                />
              </HudPanel>
            )}

            {/* ── MISSION BAY: Daily Challenge ───────────────────────────────── */}
            {dailyAdventure && (
              <HudPanel designation="MSN" label="Mission Bay" glow dataSection="mission">
                <SectionHeader band={band} icon="🎯" title="Daily Challenge" subtitle="career skill builder" />
                <DailyAdventure
                  totalQuestions={dailyAdventure.totalQuestions} completed={dailyAdventure.completed}
                  subject={activeSubject}
                  topic={topics.find(tp => tp.subject === activeSubject && tp.status === "current")?.slug || ""}
                  onStart={() => onStartAdventure?.(activeSubject)}
                />
              </HudPanel>
            )}

            {/* ── 2-COLUMN INSTRUMENT PANEL: Radar + Skill Map ───────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 12 }}>
              {/* Subject Radar Display */}
              <HudPanel designation="RDR" label="Subject Scan" dataSection="stats">
                <SubjectRadar subjects={subjects} masteryData={masteryData} />
                <div style={{ textAlign: "center", marginTop: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: "#818cf8", fontFamily: "'DM Sans', sans-serif" }}>
                    {subjectMastery.pct}%
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(148,163,184,0.4)", marginLeft: 4 }}>OVERALL</span>
                </div>
                <div style={{ fontSize: 10, color: "rgba(148,163,184,0.4)", textAlign: "center", marginTop: 2 }}>
                  {subjectMastery.count} topics tracked
                </div>
              </HudPanel>

              {/* Navigation Map — Skill Map with Tabs */}
              <HudPanel designation="NAV" label="Navigation Map" glow dataSection="galaxy">
                <SkillMap
                  topics={topics} subjects={subjects} subject={activeSubject}
                  onTopicClick={onTopicClick} onSubjectChange={setActiveSubject}
                />
              </HudPanel>
            </div>

            {/* ── TELEMETRY: Study Session Metrics ───────────────────────────── */}
            <HudPanel designation="TEL" label="Performance Telemetry">
              <StudySessionMetrics stats={stats} examData={examData} masteryData={masteryData} />
            </HudPanel>


            {/* ── 2-COLUMN: Retention + Certificates ─────────────────────────── */}
            {masteryData.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <HudPanel designation="RET" label="Memory Health">
                  <RetentionHealthRing examData={examData} masteryData={masteryData} subjects={subjects} compact />
                </HudPanel>
                <HudPanel designation="CRT" label="Certifications">
                  <CertificateProgress masteryData={masteryData} subjects={subjects} />
                </HudPanel>
              </div>
            )}

            {/* ── OBJECTIVES: Weekly Goals ────────────────────────────────────── */}
            <HudPanel designation="OBJ" label="Weekly Objectives">
              <GoalSetting scholarId={scholarId} stats={stats} />
            </HudPanel>

            {/* ── PRACTICE EXAMS: Mock Test Gateway (KS3) ─────────────────────── */}
            <HudPanel designation="PRC" label="Practice Exams">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: "#cbd5e1", margin: 0 }}>
                  Sharpen your skills with practice exam papers
                </p>
                <button
                  onClick={gatedOpenExams}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: "rgba(91,106,191,0.15)",
                    color: "#818cf8",
                    fontSize: 11,
                    fontWeight: 700,
                    border: "1px solid rgba(91,106,191,0.25)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "rgba(91,106,191,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "rgba(91,106,191,0.15)";
                  }}
                >
                  Browse
                </button>
              </div>
            </HudPanel>

            {/* ── TRAJECTORY: Year Progression ───────────────────────────────── */}
            {masteryData.length > 0 && (
              <HudPanel designation="TRJ" label="Flight Trajectory">
                <SubjectProgressChart masteryData={masteryData} subjects={subjects} />
              </HudPanel>
            )}

            {/* ── DIAGNOSTICS: Topic Breakdown + Heatmap ─────────────────────── */}
            {scholarId && supabase && (
              <HudPanel designation="DGN" label="Topic Diagnostics" glow>
                <div style={{ marginBottom: 12 }}>
                  <TopicPerformanceBreakdown scholarId={scholarId} subject={activeSubject} supabase={supabase} />
                </div>
                {masteryData.length > 0 && (
                  <>
                    <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(91,106,191,0.15) 20%, rgba(91,106,191,0.15) 80%, transparent)", margin: "8px 0 12px" }} />
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.12em" }}>Thermal Scan</span>
                    </div>
                    <TopicHeatmap
                      masteryData={masteryData}
                      subject={activeSubject?.toLowerCase() || "mathematics"}
                      onTopicClick={onTopicClick}
                      compact
                    />
                  </>
                )}
              </HudPanel>
            )}

            {/* ── FLIGHT LOG: Quest Journal ───────────────────────────────────── */}
            <HudPanel designation="LOG" label="Flight Log">
              <QuestJournal entries={journalEntries} />
            </HudPanel>

            {/* ── CAREER OPS: Career Explorer ─────────────────────────────────── */}
            <HudPanel designation="COP" label="Career Operations" dataSection="careers">
              <CareerExplorer topics={topics} activeSubject={activeSubject} />
              {careerTopic && (
                <div style={{ marginTop: 12 }}>
                  <CareerPopup topic={careerTopic} subject={activeSubject} onDismiss={onDismissCareer} />
                </div>
              )}
            </HudPanel>

            {/* ── SIMULATION BAY: Mock Test Launcher (mobile) ─────────────────── */}
            <div className="xl:hidden">
              <HudPanel designation="SIM" label="Simulation Bay">
                <MockTestLauncher
                  subject={activeSubject?.toLowerCase() || "mathematics"}
                  curriculum={scholar.curriculum} examMode={scholar.exam_mode || "general"}
                  pastMocks={pastMocks} onStartMock={onStartMock}
                />
              </HudPanel>
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
            {/* ── Scholar Greeting + Knowledge Frontier + Status Metrics (unified card) ────── */}
            <BandCard band={band} glow>
              <AdaptiveGreeting
                scholarName={scholar.name} streak={stats.streak ?? 0} xp={stats.xp ?? 0}
                yearLevel={scholar.year_level} examName={examData?.examName}
                daysUntilExam={examData?.daysUntilExam}
                avatar={scholar.avatar} onAvatarClick={onAvatar}
                isFirstLogin={isFirstLogin} questsCompleted={stats.questsCompleted ?? 0}
                curriculum={scholar.curriculum}
              />

              {/* ── Inline 3-column status metrics ────── */}
              <div data-section="stats" style={{ height: 0, margin: 0, padding: 0 }} />
              {(() => {
                const isExamMode = hasActiveExamMode;
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(139,92,246,0.1)" }}>
                    <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: 10, background: "rgba(139,92,246,0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, fontSize: 9, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                        {isExamMode ? "Predicted Grade" : "Total XP"}
                        {isExamMode && <SectionTip tip="Your predicted grade is calculated from topic mastery (60%), coverage across the syllabus (25%), and retention strength (15%). It updates after every practice session." style={{ marginLeft: 2 }} />}
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: "#ede9fe", fontFamily: "'DM Sans', sans-serif" }}>
                        {isExamMode ? (examData?.predictedGrade || "—") : (stats.xp ?? 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(167,139,250,0.4)", marginTop: 1 }}>
                        {isExamMode
                          ? (examData?.readiness?.nextGrade
                              ? `${examData.readiness.pointsToNext}pts to ${examData.readiness.nextGrade}`
                              : examData?.readiness?.label ?? "Target: A*")
                          : "Experience points"}
                      </div>
                    </div>
                    <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: 10, background: "rgba(139,92,246,0.06)" }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{getSubjectLabel(activeSubject, band)} Mastery</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: "#ede9fe", fontFamily: "'DM Sans', sans-serif", fontVariantNumeric: "tabular-nums" }}>{subjectMastery.pct}<span style={{ fontSize: 12, color: "rgba(167,139,250,0.4)" }}>%</span></div>
                      <div style={{ height: 4, borderRadius: 2, background: "rgba(139,92,246,0.12)", marginTop: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 2, width: `${subjectMastery.pct}%`, background: "linear-gradient(90deg, #8b5cf6, #a78bfa)", transition: "width 0.8s ease" }} />
                      </div>
                    </div>
                    <div style={{ textAlign: "center", padding: "8px 4px", borderRadius: 10, background: isExamMode && (examData?.daysUntilExam ?? 999) <= 30 ? "rgba(239,68,68,0.08)" : "rgba(139,92,246,0.06)" }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: isExamMode && (examData?.daysUntilExam ?? 999) <= 30 ? "#ef4444" : "#a78bfa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                        {isExamMode ? "Countdown" : "Streak"}
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: isExamMode && (examData?.daysUntilExam ?? 999) <= 30 ? "#ef4444" : "#ede9fe", fontFamily: "'DM Sans', sans-serif", fontVariantNumeric: "tabular-nums" }}>
                        {isExamMode ? (examData?.daysUntilExam ?? "—") : (stats.streak ?? 0)}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 600, color: "rgba(167,139,250,0.4)", marginTop: 1 }}>
                        {isExamMode ? "days to exam" : "day streak"}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── Action buttons row ────── */}
              <div data-section="exams" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: 12, gap: 8 }}>
                <button onClick={() => generateReport({ scholar, stats, masteryData, subjects, activeSubject, band })} style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)", color: "#a78bfa", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Export Report</button>
                <button onClick={() => onStartMock?.({ category: "exam_prep", subject: activeSubject })} style={{ padding: "6px 12px", borderRadius: 8, background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", border: "none", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 10px rgba(139,92,246,0.3)" }}>Launch Deep Space</button>
              </div>
            </BandCard>

            {/* ── Study Session Metrics (compact) ──────────────── */}
            <BandCard band={band}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.12em" }}>Performance Telemetry</div>
                  <SectionTip tip="Questions answered, accuracy, focus time, and streak this week. The readiness gauge shows your overall exam preparedness based on mastery, coverage, and retention." />
                </div>
              </div>
              <StudySessionMetrics stats={stats} examData={examData} masteryData={masteryData} />
            </BandCard>

            {/* ── Weekly Activity + Review Schedule (2-col) ──── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <BandCard band={band}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.12em" }}>Weekly Activity</div>
                  <SectionTip tip="Your study activity over the past 7 days. Each cell shows questions answered that day." />
                </div>
                <WeeklyActivityGrid activityCalendar={activityCalendar} stats={stats} />
              </BandCard>
              <BandCard band={band}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.12em" }}>Spaced Review</div>
                  <SectionTip tip="Topics due for review based on spaced repetition scheduling. Reviewing at the right time strengthens long-term memory." />
                </div>
                <ReviewScheduleWidget reviewSchedule={reviewSchedule} onTopicClick={onTopicClick} subject={activeSubject} />
              </BandCard>
            </div>

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

            {/* ── WAEC Countdown (ng_sss scholars only) ──── */}
            {scholar.curriculum === 'ng_sss' && (
              <BandCard band={band}>
                <WAECCountdown curriculum={scholar.curriculum} yearLevel={scholar.year_level} />
              </BandCard>
            )}

            {/* ── Constellation Star Chart (Phaser-powered, full-width) ──── */}
            <div data-section="heatmap">
              <BandCard band={band} glow>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>The Constellation</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#ede9fe", marginBottom: 12 }}>Star Chart</div>
                <PhaserConstellationMap
                  topics={topics} subjects={subjects} subject={activeSubject}
                  onTopicClick={onTopicClick} onSubjectChange={setActiveSubject}
                  height={480}
                />
              </BandCard>
            </div>

            {/* ── Topic Mastery (Proficiency + Heatmap combined) ──── */}
            <BandCard band={band} glow>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.15em" }}>Topic Mastery</div>
                    <SectionTip tip="Sub-topic proficiency breakdown + colour-coded heatmap. Green = strong (80%+), blue = good (60%+), amber = developing (40%+), red = needs work. Tap any topic to revise." />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: isDark ? "#ede9fe" : "#1e1b4b", marginTop: 2 }}>Proficiency & Thermal Scan</div>
                </div>
                {/* Subject tabs */}
                <div style={{ display: "flex", gap: 6 }}>
                  {subjects.slice(0, 4).map((s) => {
                    const active = (activeSubject || "").toLowerCase() === s.toLowerCase();
                    return (
                      <button key={s} onClick={() => setActiveSubject(s)}
                        style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1px solid", transition: "all 0.2s",
                          background: active ? "#8b5cf6" : "rgba(139,92,246,0.08)",
                          color: active ? "#fff" : "#a78bfa",
                          borderColor: active ? "#8b5cf6" : "rgba(139,92,246,0.15)",
                        }}>
                        {getSubjectLabel(s, band).split(" ")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sub-topic proficiency breakdown */}
              <TopicPerformanceBreakdown scholarId={scholarId} subject={activeSubject} supabase={supabase} />

              {/* Divider */}
              <div style={{ borderTop: "1px solid rgba(139,92,246,0.08)", margin: "14px 0" }} />

              {/* Heatmap grid */}
              <div style={{ fontSize: 9, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Thermal Scan</div>
              <TopicHeatmap
                masteryData={masteryData}
                subject={activeSubject?.toLowerCase() || "mathematics"}
                onTopicClick={onTopicClick}
                compact
              />
            </BandCard>


            {/* ── Mastery Progress Chart (KS3/KS4 — Recharts line chart) ──── */}
            {(band === "ks3" || band === "ks4") && (recentQuizzes.length > 0 || masteryData.length > 0) && (
              <BandCard band={band}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em" }}>Progress Trajectory</div>
                  <SectionTip tip="Mastery % over time per subject. Filter subjects using the pills. Zoom into date ranges with the brush selector (KS3/4)." />
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#ede9fe", marginBottom: 12 }}>Mastery Over Time</div>
                <MasteryProgressChart
                  masteryData={masteryData}
                  quizResults={recentQuizzes}
                  band={band}
                />
              </BandCard>
            )}

            {/* ── Streak Heatmap (KS2, KS3, KS4) ──────────────────── */}
            {(band === "ks2" || band === "ks3" || band === "ks4") && supabase && scholarId && (
              <StreakHeatmap scholarId={scholarId} supabase={supabase} />
            )}

            {/* ── Retention Health + Certificate Progress (2-col) ──── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <BandCard band={band}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em" }}>Memory Integrity</div>
                  <SectionTip tip="Multi-ring chart showing how well you're retaining topics. Inner ring = overall retention. Outer rings = top subjects. Topics are 'retained' when you've reviewed them 2+ times with mastery above 40%." />
                </div>
                <RetentionHealthRing examData={examData} masteryData={masteryData} subjects={subjects} />
              </BandCard>
              <BandCard band={band}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em" }}>Achievement Vault</div>
                  <SectionTip tip="Track certificate milestones per subject. Bronze (3 topics), Silver (5), Gold (8), Platinum (12), Diamond (18). Master topics to unlock the next level!" />
                </div>
                <CertificateProgress masteryData={masteryData} subjects={subjects} />
              </BandCard>
            </div>

            {/* ── Deep Space Threshold + Orbital Efficiency (2-col below constellation) ──── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Deep Space Threshold — donut */}
              <BandCard band={band}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>Deep Space Threshold</div>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 8 }}>
                  <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
                    <svg viewBox="0 0 90 90" style={{ width: 90, height: 90 }}>
                      <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="8" />
                      <circle cx="45" cy="45" r="38" fill="none" stroke="#8b5cf6" strokeWidth="8" strokeLinecap="round"
                        strokeDasharray="238.76" strokeDashoffset={238.76 * (1 - Math.min((stats.streak ?? 0) / 30, 1))}
                        transform="rotate(-90 45 45)" style={{ transition: "stroke-dashoffset 1s ease" }} />
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: "#ede9fe", fontVariantNumeric: "tabular-nums" }}>{stats.streak ?? 0}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(167,139,250,0.4)", textTransform: "uppercase" }}>days</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#ede9fe" }}>Weekly Goal</div>
                    <div style={{ fontSize: 11, color: "rgba(167,139,250,0.5)", marginTop: 2 }}>
                      {Math.round(Math.min((stats.streak ?? 0) / 7, 1) * 100)}% reached
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(139,92,246,0.12)", marginTop: 8, width: 120, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 2, width: `${Math.min((stats.streak ?? 0) / 7, 1) * 100}%`, background: "linear-gradient(90deg, #8b5cf6, #a78bfa)" }} />
                    </div>
                  </div>
                </div>
              </BandCard>

              {/* Orbital Efficiency */}
              <BandCard band={band}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>Orbital Efficiency</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: "#ede9fe", fontVariantNumeric: "tabular-nums" }}>{((subjectMastery.pct / 10) || 0).toFixed(1)}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(167,139,250,0.3)" }}>/10</span>
                </div>
                <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, marginTop: 4,
                  background: subjectMastery.pct >= 80 ? "rgba(16,185,129,0.12)" : subjectMastery.pct >= 50 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)",
                  color: subjectMastery.pct >= 80 ? "#4ade80" : subjectMastery.pct >= 50 ? "#facc15" : "#f87171",
                  border: `1px solid ${subjectMastery.pct >= 80 ? "rgba(16,185,129,0.25)" : subjectMastery.pct >= 50 ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"}`,
                }}>
                  {subjectMastery.pct >= 80 ? "OPTIMAL FLOW" : subjectMastery.pct >= 50 ? "DEVELOPING" : "WARMING UP"}
                </div>
                {/* Mini bar chart */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, marginTop: 12, height: 32 }}>
                  {[65, 72, 58, 80, 91, 85, subjectMastery.pct].map((v, i) => (
                    <div key={i} style={{ flex: 1, height: `${v * 0.32}px`, borderRadius: 3, background: i === 6 ? "#8b5cf6" : "rgba(139,92,246,0.15)", transition: "height 0.5s ease" }} />
                  ))}
                </div>
              </BandCard>
            </div>

            {/* ── Active Research Modules (Revision Planner) ─────────── */}
            {masteryData.length > 0 && (
              <BandCard band={band} glow>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em" }}>Active Research Modules</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#ede9fe", marginTop: 2 }}>Revision Planner</div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase" }}>Targeting Grade Boundaries</div>
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
                <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>Grade Trajectory</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#ede9fe", marginBottom: 12 }}>Exam Intelligence</div>
                <ExamPanel
                  predictedGrade={examData.predictedGrade} previousGrade={examData.previousGrade}
                  examName={examData.examName} daysUntilExam={examData.daysUntilExam}
                  topicsRemaining={examData.topicsRemaining} mocksCompleted={examData.mocksCompleted}
                  revisionPlan={examData.revisionPlan ?? []}
                />
              </BandCard>
            )}

            {/* ── WAEC Grade Tracker (ng_sss scholars only) ──────────────── */}
            {scholar.curriculum === 'ng_sss' && (
              <BandCard band={band} glow>
                <WAECGradeTracker scholar={scholar} supabase={supabase} />
              </BandCard>
            )}

            {/* ── Exam Papers (KS4 official papers gateway) ──────────────── */}
            <BandCard band={band} glow>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>Examination Centre</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#ede9fe" }}>Exam Papers</div>
                </div>
                <button
                  onClick={gatedOpenExams}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "scale(1.05)";
                    e.target.style.boxShadow = "0 10px 20px rgba(139,92,246,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "scale(1)";
                    e.target.style.boxShadow = "none";
                  }}
                >
                  Browse Papers
                </button>
              </div>
              <p style={{ fontSize: 13, color: "#c4b5fd", marginTop: 12, lineHeight: 1.5 }}>
                Access official exam papers, practice questions, and timed mock tests. Prepare systematically with papers from your curriculum board.
              </p>
            </BandCard>

            {/* ── Simulation Bay (main content anchor for nav linking) ─── */}
            <div data-section="tutor">
              <BandCard band={band} glow>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>Simulation Bay</div>
                <MockTestLauncher
                  subject={activeSubject?.toLowerCase() || "mathematics"}
                  curriculum={scholar.curriculum} examMode={scholar.exam_mode || "general"}
                  pastMocks={pastMocks} onStartMock={onStartMock}
                />
              </BandCard>
            </div>

            {/* ── Mock Test Debrief (shown after completing a mock) ─── */}
            {mockDebriefResult && (
              <BandCard band={band} glow>
                <MockTestDebrief
                  mockResult={mockDebriefResult}
                  masteryData={masteryData}
                  examData={examData}
                  onReviseTopic={(topic, subject) => onStartRevisionTopic?.({ topic, subject })}
                  onRetake={() => {
                    setMockDebriefResult(null);
                    onStartMock?.({ category: "exam_prep", subject: activeSubject });
                  }}
                  onClose={() => setMockDebriefResult(null)}
                />
              </BandCard>
            )}

            {/* ── Discovery Feed (mobile: Flashcards) ────────── */}
            <div className="xl:hidden">
              <BandCard band={band} glow>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>Active Recall</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#ede9fe", marginBottom: 12 }}>Flashcard Deck</div>
                <Flashcards scholarId={scholarId} subject={activeSubject}
                  curriculum={scholar.curriculum} supabase={supabase} yearLevel={scholar.year_level} />
              </BandCard>
            </div>

            {/* ── Year Progression Chart (from KS3 data viz) ──── */}
            {masteryData.length > 0 && (
              <BandCard band={band}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>Orbital Trajectory</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#ede9fe", marginBottom: 12 }}>Year Progression</div>
                <SubjectProgressChart masteryData={masteryData} subjects={subjects} />
              </BandCard>
            )}

            {/* ── Weekly Goals ──── */}
            <BandCard band={band}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>Mission Objectives</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#ede9fe", marginBottom: 12 }}>Weekly Goals</div>
              <GoalSetting scholarId={scholarId} stats={stats} />
            </BandCard>

            {/* ── Quest Journal ──── */}
            <BandCard band={band}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 2 }}>Flight Log</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#ede9fe", marginBottom: 12 }}>Recent Activity</div>
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

      {/* Coin Shop shortcut — all bands */}
      <CoinShopBanner coins={coins} onOpenShop={onAvatar} isDark={isDark} />

      {/* KS1: Digital Pet Prominent */}
      {band === "ks1" && <DigitalPet totalXp={stats.xp ?? 0} scholarId={scholarId} />}

      {/* KS2: Digital Pet + Leaderboard + Career Mini-Cards */}
      {band === "ks2" && (
        <>
          <DigitalPet totalXp={stats.xp ?? 0} scholarId={scholarId} />
          <AdaptiveLeaderboard entries={leaderboard} currentScholarId={scholarId} curriculum={scholar.curriculum} />
          {careerTopic && <CareerPopup topic={careerTopic} subject={activeSubject} onDismiss={onDismissCareer} />}
        </>
      )}

      {/* KS3: Peer Comparison + Leaderboard + Career */}
      {band === "ks3" && (
        <>
          {peerComparisons.length > 0 && <PeerComparison comparisons={peerComparisons} />}
          <AdaptiveLeaderboard entries={leaderboard} currentScholarId={scholarId} curriculum={scholar.curriculum} />
          {careerTopic && <CareerPopup topic={careerTopic} subject={activeSubject} onDismiss={onDismissCareer} />}
        </>
      )}

      {/* KS4: Flashcards + Mock Test + Leaderboard */}
      {band === "ks4" && (
        <>
          <div style={{ padding: "12px 14px", borderRadius: 12,
            background: "rgba(12,8,20,0.6)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(167,139,250,0.1)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>Active Recall</div>
            <Flashcards scholarId={scholarId} subject={activeSubject}
              curriculum={scholar.curriculum} supabase={supabase} yearLevel={scholar.year_level} />
          </div>
          <div style={{ padding: "12px 14px", borderRadius: 12,
            background: "rgba(12,8,20,0.6)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(167,139,250,0.1)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>Simulation Bay</div>
            <MockTestLauncher
              subject={activeSubject?.toLowerCase() || "mathematics"}
              curriculum={scholar.curriculum} examMode={scholar.exam_mode || "general"}
              pastMocks={pastMocks} onStartMock={onStartMock}
            />
          </div>
          {/* Compact Retention Ring in sidebar */}
          <div style={{ padding: "12px 14px", borderRadius: 12,
            background: "rgba(12,8,20,0.6)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(167,139,250,0.1)" }}>
            <RetentionHealthRing examData={examData} masteryData={masteryData} subjects={subjects} compact />
          </div>
          {peerComparisons.length > 0 && <PeerComparison comparisons={peerComparisons} />}
          <AdaptiveLeaderboard entries={leaderboard} currentScholarId={scholarId} curriculum={scholar.curriculum} />
        </>
      )}

      {/* All bands except KS1/KS2 (already placed above): Digital Pet */}
      {band !== "ks1" && band !== "ks2" && <DigitalPet totalXp={stats.xp ?? 0} scholarId={scholarId} />}

      {/* Exam panel only for KS3+ when parent explicitly enrolled scholar in exam mode */}
      {band !== "ks4" && band !== "ks1" && band !== "ks2" && examData && hasActiveExamMode && <ExamPanel
        predictedGrade={examData.predictedGrade} previousGrade={examData.previousGrade}
        examName={examData.examName} daysUntilExam={examData.daysUntilExam}
        topicsRemaining={examData.topicsRemaining} mocksCompleted={examData.mocksCompleted}
        revisionPlan={examData.revisionPlan ?? []}
      />}

      {band === "ks1" && <AdaptiveLeaderboard entries={leaderboard} currentScholarId={scholarId} curriculum={scholar.curriculum} />}

      {band === "ks1" && peerComparisons.length > 0 && <PeerComparison comparisons={peerComparisons} />}

      {band !== "ks3" && band !== "ks4" && <GoalSetting scholarId={scholarId} stats={stats} />}

      {band !== "ks4" && <Flashcards scholarId={scholarId} subject={activeSubject}
        curriculum={scholar.curriculum} supabase={supabase} yearLevel={scholar.year_level} />}

      {band !== "ks2" && band !== "ks4" && careerTopic && <CareerPopup topic={careerTopic} subject={activeSubject} onDismiss={onDismissCareer} />}

      {/* Memory Guardian — coming soon teaser for KS2+ */}
      {band !== "ks1" && (
        <MemoryGuardianPlaceholder
          band={band}
          canAccess={canUseBossBattles}
          dueTopics={topics.filter(t => (t.p_mastery ?? 0) < 0.5 && t.next_review).length}
        />
      )}

      {/* Mock Test Launcher (desktop only, KS3 — KS4 has its own in the band-specific block above) */}
      <div className="hidden xl:block">
        {band === "ks3" && (
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
          background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)", animation: "ks4Badge 2s ease-in-out infinite" }}>
          <span style={{ fontSize: 10 }}>✓</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.06em" }}>OPTIMAL</span>
        </div>
      )}
    </div>
  );

  const topBarRight = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {/* Adaptive difficulty level badge */}
      {topics.length > 0 && (
        <DifficultyBadge avgMastery={avgMastery} compact />
      )}
      {onAvatar && (
        <button onClick={onAvatar} style={{
          padding: "4px 10px", borderRadius: 8,
          background: "transparent", border: "none",
          cursor: "pointer", color: cfg.textMuted,
          display: "flex", alignItems: "center", gap: 4,
        }} title="Avatar Shop">
          <span style={{ fontSize: 16, lineHeight: 1 }}>👤</span>
          <span className="hidden lg:inline" style={{ fontSize: 11, fontWeight: 700 }}>Avatar</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mastery celebration confetti — fires when a topic crosses 0.8 */}
      <MasteryConfetti
        trigger={!!confettiTopic}
        topicName={confettiTopic}
        onComplete={clearConfetti}
      />

      <DashboardTour type="scholar" userId={scholarId} band={band} />
      <TourHelpButton type="scholar" userId={scholarId} band={band} />
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