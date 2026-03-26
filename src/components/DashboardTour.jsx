"use client";
/**
 * DashboardTour.jsx (v3 — Tooltip/Popover Tour with Section Positioning)
 * Deploy to: src/components/DashboardTour.jsx
 *
 * Guided tour that POSITIONS NEAR each section (tooltip-style popover) instead
 * of a fixed bottom modal. Like Front app's onboarding tour:
 *   - Overlay darkens the page except the highlighted section
 *   - Tour card appears as a popover attached to the section with an arrow
 *   - Steps jump between sections smoothly
 *
 * Usage:
 *   <DashboardTour type="parent" userId={parent.id} />
 *   <DashboardTour type="scholar" userId={scholar.id} band="ks3" />
 *   <TourHelpButton type="scholar" userId={scholar.id} band="ks3" />
 *   <SectionTip tip="This shows your mastery across topics." />
 */

import React, { useState, useEffect, useCallback, useRef } from "react";

// ── Tour steps per dashboard type ────────────────────────────────────────────
const PARENT_STEPS = [
  { title: "Your scholars", description: "Each card shows a scholar's progress. Tap to see detailed insights or start a quest for them.", icon: "👨‍👩‍👧‍👦", section: null },
  { title: "Progress insights", description: "Expand any scholar card to see mastery percentages, time spent, and topic breakdown by subject.", icon: "📊", section: null },
  { title: "Weekly summary", description: "Every week you'll receive an email summary. You can also check progress here anytime.", icon: "📧", section: null },
  { title: "Add a scholar", description: "Tap the + button to add up to 3 scholars. Each gets their own login, progress tracking, and AI tutor.", icon: "➕", section: null },
  { title: "Referral programme", description: "Share your referral code with other parents. Each signup earns you a free month of Pro.", icon: "🎁", section: null },
];

const SCHOLAR_STEPS_KS1 = [
  { title: "Welcome to your adventure!", description: "This is your home! Every day there's a new adventure waiting for you. Let's look around!", icon: "🦄", section: null },
  { title: "Today's Adventure", description: "Tap Start Adventure to answer fun questions. Tara the Star will help you along the way!", icon: "✨", section: "adventure" },
  { title: "Treasure Map", description: "This shows all the topics you can explore. Coloured ones mean you've started learning them!", icon: "🗺️", section: "galaxy" },
  { title: "My Star Stats", description: "See how many questions you've answered, your accuracy, and your learning streak!", icon: "📊", section: "stats" },
  { title: "My Trophies", description: "Collect Bronze, Silver, Gold, Platinum, and Diamond certificates as you master topics!", icon: "🏅", section: "trophies" },
  { title: "My Space Pet", description: "Your pet grows as you earn more stars! Keep learning and watch it evolve.", icon: "🐣", section: null },
  { title: "Sticker Collection", description: "Earn stickers for reaching milestones. How many can you collect?", icon: "🌟", section: "trophies" },
];

const SCHOLAR_STEPS_KS2 = [
  { title: "Welcome, Commander!", description: "This is Mission Control. From here you'll launch missions, track your Stardust, and climb the rankings.", icon: "🚀", section: null },
  { title: "Your Commander Stats", description: "Stardust (XP), missions completed, and your streak. Try to keep your streak going every day!", icon: "✨", section: "stats" },
  { title: "Daily Mission", description: "Each day the AI picks a mission based on what you need to practise most. Complete it to earn bonus Stardust!", icon: "🎯", section: "mission" },
  { title: "Galaxy Map", description: "Each subject is a galaxy with topics to master. Green means started, gold means mastered. Tap any topic to practice.", icon: "🌌", section: "galaxy" },
  { title: "Mission Stats", description: "Track your weekly questions, accuracy, and focus time. See how your learning is improving over time.", icon: "📊", section: "stats" },
  { title: "Medal Collection", description: "Unlock Bronze, Silver, Gold, Platinum, and Diamond certificates as you master more topics.", icon: "🏅", section: null },
  { title: "Commander Rankings", description: "See how you compare with other scholars. Your codename keeps you anonymous.", icon: "🏆", section: null },
];

const SCHOLAR_STEPS_KS3 = [
  { title: "Your Dashboard", description: "Everything you need in one place: mastery stats, skill map, practice tests, and study metrics.", icon: "🔭", section: null },
  { title: "Mastery Tracker", description: "The donut ring shows your overall mastery percentage. It updates after every quest based on accuracy and consistency.", icon: "📊", section: "stats" },
  { title: "Skill Map", description: "All your subjects and topics. Blue means in progress. Tap any subject tab to switch view. The AI picks your weakest area automatically.", icon: "📈", section: "galaxy" },
  { title: "Study Metrics", description: "Questions answered, accuracy percentage, focus time, and streak. Track your weekly learning patterns.", icon: "📊", section: "stats" },
  { title: "Retention & Certificates", description: "Memory Health shows how well you're retaining topics. Certificates track your milestones from Bronze to Diamond.", icon: "🧠", section: null },
  { title: "Topic Heatmap", description: "Colour-coded grid showing your mastery level for every topic. Green is strong, red needs work. Tap any topic to practise it.", icon: "🔥", section: "heatmap" },
  { title: "Weekly Goals", description: "Set targets for the week. Track your progress and build consistency. Try to hit all goals!", icon: "🎯", section: null },
  { title: "Practice Tests", description: "Take timed mock tests. Your results feed into your mastery score and help the AI adjust your learning path.", icon: "📋", section: "tutor" },
  { title: "Career Explorer", description: "See how each topic connects to real-world careers. Discover where your skills could take you.", icon: "💼", section: "careers" },
];

const SCHOLAR_STEPS_KS4 = [
  { title: "Exam Preparation Hub", description: "Welcome to Zenith Station. Every feature here is designed around your target grade and exam date.", icon: "📐", section: null },
  { title: "Predicted Grade & Countdown", description: "Your predicted grade is calculated from mastery, coverage, and retention across all topics. The countdown shows days until your exam.", icon: "📊", section: "exams" },
  { title: "Study Session Metrics", description: "Questions this week, accuracy, focus time, and streak. The readiness gauge shows your overall exam preparedness.", icon: "📊", section: "stats" },
  { title: "Star Chart", description: "Interactive constellation map of all topics. Size and brightness represent mastery level. Tap any topic to start practising.", icon: "🌌", section: "heatmap" },
  { title: "Topic Mastery Heatmap", description: "Colour-coded grid: green means strong, amber means developing, red needs urgent attention. Tap any topic to revise.", icon: "🔥", section: "heatmap" },
  { title: "Retention & Certificates", description: "The health ring shows memory strength per subject. Certificates track milestones from Bronze to Diamond across subjects.", icon: "🧠", section: null },
  { title: "Revision Planner", description: "AI-generated daily schedule. Prioritises topics closest to your next grade boundary using spaced repetition.", icon: "📅", section: null },
  { title: "Exam Intelligence", description: "Grade trajectory panel showing predicted vs previous grade, topics remaining, and mocks completed.", icon: "📈", section: "exams" },
  { title: "Mock Tests", description: "Timed practice under exam conditions. After completing a mock, you'll see a debrief with strengths, weaknesses, and direct links to revise.", icon: "📝", section: "tutor" },
  { title: "Flashcards", description: "Auto-generated from your weak topics. Flip to reveal answers, mark what you know. A focused way to revise key facts.", icon: "📇", section: null },
];

function getScholarSteps(band) {
  switch (band) {
    case "ks1": return SCHOLAR_STEPS_KS1;
    case "ks2": return SCHOLAR_STEPS_KS2;
    case "ks3": return SCHOLAR_STEPS_KS3;
    case "ks4": return SCHOLAR_STEPS_KS4;
    default:    return SCHOLAR_STEPS_KS2;
  }
}

// ── Position calculator ─────────────────────────────────────────────────────
// Returns { top, left, arrowSide } for the popover relative to a target element.
// arrowSide: "top" means arrow points up (popover below), "bottom" means arrow points down (popover above)
function calcPopoverPosition(targetEl) {
  if (!targetEl) return null;
  const rect = targetEl.getBoundingClientRect();
  const viewH = window.innerHeight;
  const viewW = window.innerWidth;
  const popW = Math.min(380, viewW - 32);
  const popH = 260; // estimated max

  // Prefer below the section
  let top, arrowSide;
  const spaceBelow = viewH - rect.bottom;
  const spaceAbove = rect.top;

  if (spaceBelow >= popH + 20) {
    top = rect.bottom + 12;
    arrowSide = "top"; // arrow on top of popover, pointing up at section
  } else if (spaceAbove >= popH + 20) {
    top = rect.top - popH - 12;
    arrowSide = "bottom"; // arrow on bottom, pointing down
  } else {
    // Place at vertical center of viewport
    top = Math.max(16, (viewH - popH) / 2);
    arrowSide = "none";
  }

  // Horizontal: center on the section, clamp to viewport
  let left = rect.left + rect.width / 2 - popW / 2;
  left = Math.max(16, Math.min(left, viewW - popW - 16));

  // Arrow horizontal offset (relative to popover left)
  const arrowLeft = Math.max(24, Math.min(rect.left + rect.width / 2 - left, popW - 24));

  return { top, left, width: popW, arrowSide, arrowLeft };
}

// ── Spotlight helper ────────────────────────────────────────────────────────
// Creates a CSS clip-path that punches a hole around the target element
function getSpotlightClip(targetEl) {
  if (!targetEl) return "none";
  const rect = targetEl.getBoundingClientRect();
  const pad = 8;
  const r = 12;
  const x = rect.left - pad;
  const y = rect.top - pad;
  const w = rect.width + pad * 2;
  const h = rect.height + pad * 2;
  // Use polygon with rounded corners via inset
  return { x, y, w, h, r };
}

// ── Core Tour Card (shared between auto + manual) ───────────────────────────
function TourCard({ steps, step, onNext, onPrev, onDismiss, position, dismissLabel }) {
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  // If no position info, float at bottom centre (for steps with no section)
  const hasPosition = position && position.arrowSide !== undefined;
  const popStyle = hasPosition ? {
    position: "fixed",
    top: position.top,
    left: position.left,
    width: position.width,
    zIndex: 8002,
  } : {
    position: "fixed",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    width: Math.min(380, typeof window !== "undefined" ? window.innerWidth - 32 : 380),
    zIndex: 8002,
  };

  return (
    <div style={popStyle}>
      {/* Arrow pointing UP (popover below section) */}
      {hasPosition && position.arrowSide === "top" && (
        <div style={{
          position: "absolute", top: -8, left: position.arrowLeft - 8,
          width: 16, height: 16, background: "rgba(255,255,255,0.97)",
          transform: "rotate(45deg)", borderRadius: 3,
          boxShadow: "-2px -2px 4px rgba(0,0,0,0.06)",
          zIndex: -1,
        }} />
      )}

      <div style={{
        borderRadius: 16, overflow: "hidden",
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.7)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.22), 0 0 0 1px rgba(99,102,241,0.08)",
        animation: "lp-tour-pop 0.25s ease",
      }}>
        <style>{`
          @keyframes lp-tour-pop {
            from { opacity: 0; transform: translateY(${hasPosition && position.arrowSide === "bottom" ? "-8" : "8"}px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Progress bar */}
        <div style={{ height: 3, background: "rgba(0,0,0,0.04)" }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: "linear-gradient(90deg, #6366f1, #a855f7)",
            transition: "width 0.3s ease",
            width: `${((step + 1) / steps.length) * 100}%`,
          }} />
        </div>

        <div style={{ padding: "16px 18px 14px" }}>
          {/* Icon + counter */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 26 }}>{current.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8" }}>
              {step + 1} / {steps.length}
            </span>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 900, color: "#1e293b", marginBottom: 4, lineHeight: 1.3 }}>{current.title}</h3>
          <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, marginBottom: 14, margin: 0 }}>{current.description}</p>

          {/* Dot navigation */}
          <div style={{ display: "flex", justifyContent: "center", gap: 4, margin: "12px 0 10px" }}>
            {steps.map((s, i) => (
              <div key={i} style={{
                width: i === step ? 16 : 6, height: 6, borderRadius: 3,
                background: i === step ? "#6366f1" : i < step ? "#a5b4fc" : "#e2e8f0",
                transition: "all 0.2s",
              }} />
            ))}
          </div>

          {/* Nav buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {!isFirst && (
              <button onClick={onPrev} style={{
                padding: "7px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                color: "#64748b", background: "transparent", border: "none", cursor: "pointer",
              }}>Back</button>
            )}
            <div style={{ flex: 1 }} />
            <button onClick={onDismiss} style={{
              padding: "7px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              color: "#94a3b8", background: "transparent", border: "none", cursor: "pointer",
            }}>{dismissLabel || "Skip"}</button>
            <button onClick={onNext} style={{
              padding: "7px 16px", borderRadius: 10, fontSize: 12, fontWeight: 800,
              color: "#fff", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #6366f1, #7c3aed)",
              boxShadow: "0 3px 12px rgba(99,102,241,0.3)",
            }}>{isLast ? "Got it!" : "Next"}</button>
          </div>
        </div>
      </div>

      {/* Arrow pointing DOWN (popover above section) */}
      {hasPosition && position.arrowSide === "bottom" && (
        <div style={{
          position: "absolute", bottom: -8, left: position.arrowLeft - 8,
          width: 16, height: 16, background: "rgba(255,255,255,0.97)",
          transform: "rotate(45deg)", borderRadius: 3,
          boxShadow: "2px 2px 4px rgba(0,0,0,0.06)",
          zIndex: -1,
        }} />
      )}
    </div>
  );
}

// ── Find section element ────────────────────────────────────────────────────
function findSectionEl(sectionName) {
  if (!sectionName) return null;
  return (
    document.querySelector(`[data-section="${sectionName}"]`) ||
    document.querySelector(`[data-tour="${sectionName}"]`) ||
    document.getElementById(`section-${sectionName}`)
  );
}

// ── Main Tour Component ─────────────────────────────────────────────────────

export default function DashboardTour({ type = "scholar", userId, band = "ks2" }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState(null);
  const [spotlight, setSpotlight] = useState(null);

  const storageKey = `lp_tour_${type}_${userId}`;
  const steps = type === "parent" ? PARENT_STEPS : getScholarSteps(band);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(storageKey);
      if (!seen) {
        const t = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [storageKey]);

  // Position popover near current step's section
  const updatePosition = useCallback(() => {
    const section = steps[step]?.section;
    const el = findSectionEl(section);
    if (el) {
      // Scroll into view first
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Recompute after scroll settles
      setTimeout(() => {
        setPosition(calcPopoverPosition(el));
        setSpotlight(getSpotlightClip(el));
      }, 400);
    } else {
      setPosition(null);
      setSpotlight(null);
    }
  }, [step, steps]);

  useEffect(() => {
    if (visible) updatePosition();
  }, [step, visible, updatePosition]);

  // Recompute on resize
  useEffect(() => {
    if (!visible) return;
    const handler = () => updatePosition();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [visible, updatePosition]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try { localStorage.setItem(storageKey, "1"); } catch {}
  }, [storageKey]);

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else dismiss();
  };
  const prev = () => { if (step > 0) setStep(s => s - 1); };

  if (!visible || steps.length === 0) return null;

  return (
    <>
      {/* Overlay with spotlight cutout */}
      <div
        onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        style={{
          position: "fixed", inset: 0, zIndex: 8000,
          background: "rgba(15,10,40,0.5)",
          backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
          transition: "background 0.3s",
        }}
      >
        {/* Spotlight highlight ring */}
        {spotlight && (
          <div style={{
            position: "fixed",
            top: spotlight.y, left: spotlight.x,
            width: spotlight.w, height: spotlight.h,
            borderRadius: spotlight.r,
            boxShadow: "0 0 0 9999px rgba(15,10,40,0.5)",
            border: "2px solid rgba(99,102,241,0.4)",
            pointerEvents: "none",
            transition: "all 0.4s ease",
            zIndex: 8001,
          }} />
        )}
      </div>

      <TourCard
        steps={steps} step={step}
        onNext={next} onPrev={prev} onDismiss={dismiss}
        position={position} dismissLabel="Skip"
      />
    </>
  );
}

// ── Help Button ─────────────────────────────────────────────────────────────

export function TourHelpButton({ type = "scholar", userId, band = "ks2" }) {
  const [showTour, setShowTour] = useState(false);
  const storageKey = `lp_tour_${type}_${userId}`;

  const handleClick = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch {}
    setShowTour(true);
  }, [storageKey]);

  return (
    <>
      <button
        onClick={handleClick}
        title="Dashboard guide"
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 7000,
          width: 40, height: 40, borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #7c3aed)",
          border: "2px solid rgba(255,255,255,0.3)",
          color: "#fff", fontSize: 18, fontWeight: 900,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        ?
      </button>
      {showTour && (
        <DashboardTourManual type={type} userId={userId} band={band} onClose={() => setShowTour(false)} />
      )}
    </>
  );
}

// Manual tour (triggered by help button)
function DashboardTourManual({ type, userId, band, onClose }) {
  const [step, setStep] = useState(0);
  const [position, setPosition] = useState(null);
  const [spotlight, setSpotlight] = useState(null);
  const steps = type === "parent" ? PARENT_STEPS : getScholarSteps(band);

  const updatePosition = useCallback(() => {
    const section = steps[step]?.section;
    const el = findSectionEl(section);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        setPosition(calcPopoverPosition(el));
        setSpotlight(getSpotlightClip(el));
      }, 400);
    } else {
      setPosition(null);
      setSpotlight(null);
    }
  }, [step, steps]);

  useEffect(() => {
    updatePosition();
  }, [step, updatePosition]);

  useEffect(() => {
    const handler = () => updatePosition();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [updatePosition]);

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else onClose();
  };
  const prev = () => { if (step > 0) setStep(s => s - 1); };

  if (steps.length === 0) return null;

  return (
    <>
      <div
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: "fixed", inset: 0, zIndex: 8000,
          background: "rgba(15,10,40,0.5)",
          backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
        }}
      >
        {spotlight && (
          <div style={{
            position: "fixed",
            top: spotlight.y, left: spotlight.x,
            width: spotlight.w, height: spotlight.h,
            borderRadius: spotlight.r,
            boxShadow: "0 0 0 9999px rgba(15,10,40,0.5)",
            border: "2px solid rgba(99,102,241,0.4)",
            pointerEvents: "none",
            transition: "all 0.4s ease",
            zIndex: 8001,
          }} />
        )}
      </div>

      <TourCard
        steps={steps} step={step}
        onNext={next} onPrev={prev} onDismiss={onClose}
        position={position} dismissLabel="Close"
      />
    </>
  );
}

// ── Per-Section Tip ─────────────────────────────────────────────────────────
export function SectionTip({ tip, style }) {
  const [open, setOpen] = useState(false);
  const tipRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (tipRef.current && !tipRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <span ref={tipRef} style={{ position: "relative", display: "inline-flex", ...style }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 18, height: 18, borderRadius: "50%",
          background: open ? "#6366f1" : "rgba(99,102,241,0.1)",
          border: "1px solid rgba(99,102,241,0.2)",
          color: open ? "#fff" : "#6366f1",
          fontSize: 10, fontWeight: 900,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          padding: 0, lineHeight: 1, transition: "all 0.15s",
        }}
        title="What's this?"
      >
        ?
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(30,41,59,0.95)", color: "#f1f5f9",
          fontSize: 11, lineHeight: 1.5, fontWeight: 500,
          padding: "10px 14px", borderRadius: 10,
          minWidth: 200, maxWidth: 280,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          zIndex: 100, animation: "lp-tip-in 0.15s ease",
        }}>
          <style>{`@keyframes lp-tip-in { from { opacity: 0; transform: translateX(-50%) translateY(4px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
          {tip}
          <div style={{
            position: "absolute", bottom: -5, left: "50%",
            width: 10, height: 10, background: "rgba(30,41,59,0.95)",
            borderRadius: 2, transform: "translateX(-50%) rotate(45deg)",
          }} />
        </div>
      )}
    </span>
  );
}

/**
 * @deprecated Use TourHelpButton component instead.
 */
export function useTourReset(type, userId) {
  return useCallback(() => {
    try { localStorage.removeItem(`lp_tour_${type}_${userId}`); } catch {}
    window.location.reload();
  }, [type, userId]);
}
