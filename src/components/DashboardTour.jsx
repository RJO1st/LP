"use client";
/**
 * DashboardTour.jsx
 * Deploy to: src/components/DashboardTour.jsx
 *
 * Lightweight guided tour overlay. Shows step-by-step tooltip bubbles
 * pointing at dashboard sections. Dismissible, only shows once per user.
 *
 * Usage:
 *   <DashboardTour type="parent" userId={parent.id} />
 *   <DashboardTour type="scholar" userId={scholar.id} band="ks3" />
 */

import React, { useState, useEffect, useCallback } from "react";

// ── Tour steps per dashboard type ────────────────────────────────────────────

const PARENT_STEPS = [
  {
    title: "Your scholars",
    description: "Each card shows a scholar's progress. Tap to see detailed insights or start a quest for them.",
    icon: "👨‍👩‍👧‍👦",
    position: "center",
  },
  {
    title: "Progress insights",
    description: "Expand any scholar card to see mastery percentages, time spent, and topic breakdown by subject.",
    icon: "📊",
    position: "center",
  },
  {
    title: "Weekly summary",
    description: "Every week you'll receive an email summary. You can also check progress here anytime.",
    icon: "📧",
    position: "center",
  },
  {
    title: "Add a scholar",
    description: "Tap the + button to add up to 3 scholars. Each gets their own login, progress tracking, and AI tutor.",
    icon: "➕",
    position: "center",
  },
  {
    title: "Referral programme",
    description: "Share your referral code with other parents. Each signup earns you a free month of Pro.",
    icon: "🎁",
    position: "center",
  },
];

const SCHOLAR_STEPS_KS1 = [
  {
    title: "Welcome to your adventure!",
    description: "This is where your learning journey begins. Every day there's a new adventure waiting for you!",
    icon: "🦄",
    position: "center",
  },
  {
    title: "Today's Adventure",
    description: "Tap Start Adventure to answer 10 fun questions. Tara the Star will help you along the way!",
    icon: "✨",
    position: "center",
  },
  {
    title: "Your Stars",
    description: "You earn stars for every correct answer. Collect enough and you'll get stickers!",
    icon: "⭐",
    position: "center",
  },
  {
    title: "Treasure Map",
    description: "This shows all the topics you can explore. Coloured ones mean you've started learning them!",
    icon: "🗺️",
    position: "center",
  },
  {
    title: "Your pet",
    description: "Your pet grows as you earn more stars! Keep learning and watch it evolve.",
    icon: "🐣",
    position: "center",
  },
];

const SCHOLAR_STEPS_KS2 = [
  {
    title: "Welcome, Commander!",
    description: "This is Mission Control. From here you'll launch missions, track your Stardust, and climb the rankings.",
    icon: "🚀",
    position: "center",
  },
  {
    title: "Your stats",
    description: "Stardust (XP), missions completed, and your streak. Try to keep your streak going every day!",
    icon: "✨",
    position: "center",
  },
  {
    title: "Galaxy Map",
    description: "Each subject has topics to master. Green means you've started, gold means mastered. Tap any topic to practice.",
    icon: "🌌",
    position: "center",
  },
  {
    title: "Commander Rankings",
    description: "See how you compare with other scholars. Your codename keeps you anonymous.",
    icon: "🏆",
    position: "center",
  },
  {
    title: "Launch Mission",
    description: "Tap the big button to start a quest. The AI picks the best topic for you based on your progress.",
    icon: "🚀",
    position: "center",
  },
];

const SCHOLAR_STEPS_KS3 = [
  {
    title: "Your dashboard",
    description: "Everything you need in one place: mastery stats, skill map, revision planner, and practice tests.",
    icon: "🔭",
    position: "center",
  },
  {
    title: "Mastery tracker",
    description: "Shows your mastery percentage across topics. This updates after every quest based on your accuracy.",
    icon: "📊",
    position: "center",
  },
  {
    title: "Skill Map",
    description: "All your subjects and topics. Blue means in progress. Tap any subject tab to switch. The AI picks your weakest area automatically.",
    icon: "📊",
    position: "center",
  },
  {
    title: "Revision Planner",
    description: "AI-suggested daily revision schedule based on your mastery gaps. Each topic shows time estimate and a Start button.",
    icon: "📅",
    position: "center",
  },
  {
    title: "Practice Tests",
    description: "Take timed mock tests to prepare for exams. Your predicted grade updates after each attempt.",
    icon: "📋",
    position: "center",
  },
  {
    title: "Weekly Goals",
    description: "Set targets for the week. Track your progress and build consistency.",
    icon: "🎯",
    position: "center",
  },
];

const SCHOLAR_STEPS_KS4 = [
  {
    title: "Exam preparation hub",
    description: "Focused on getting you exam-ready. Every feature here is designed around your target grade.",
    icon: "📐",
    position: "center",
  },
  {
    title: "Predicted grade",
    description: "Based on your mastery across all topics. This updates after every practice session and mock test.",
    icon: "📊",
    position: "center",
  },
  {
    title: "Skill heatmap",
    description: "Your subjects and topics at a glance. Focus on the gaps — the AI prioritises your weakest areas.",
    icon: "📊",
    position: "center",
  },
  {
    title: "Revision plan",
    description: "AI-generated daily schedule. Prioritises topics closest to the next grade boundary.",
    icon: "📅",
    position: "center",
  },
  {
    title: "Mock tests",
    description: "Timed practice under exam conditions. Results feed into your predicted grade.",
    icon: "📝",
    position: "center",
  },
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

// ── Tour Component ───────────────────────────────────────────────────────────

export default function DashboardTour({ type = "scholar", userId, band = "ks2" }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  const storageKey = `lp_tour_${type}_${userId}`;
  const steps = type === "parent" ? PARENT_STEPS : getScholarSteps(band);

  useEffect(() => {
    // Only show tour once per user per dashboard type
    try {
      const seen = localStorage.getItem(storageKey);
      if (!seen) setVisible(true);
    } catch {
      // localStorage unavailable
    }
  }, [storageKey]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try { localStorage.setItem(storageKey, "1"); } catch {}
  }, [storageKey]);

  const next = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  if (!visible || steps.length === 0) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-[8000] flex items-center justify-center p-4"
      style={{ background: "rgba(15,10,40,0.7)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}>

      <div className="rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden"
        style={{
          animation: "lp-tour-in 0.3s ease",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)",
        }}>
        <style>{`
          @keyframes lp-tour-in {
            from { opacity: 0; transform: translateY(16px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100/50">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="p-6">
          {/* Icon + step counter */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-3xl">{current.icon}</span>
            <span className="text-xs font-bold text-slate-400">
              {step + 1} of {steps.length}
            </span>
          </div>

          {/* Content */}
          <h3 className="text-lg font-black text-slate-800 mb-2">{current.title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">{current.description}</p>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button onClick={prev}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                Back
              </button>
            )}
            <div className="flex-1" />
            <button onClick={dismiss}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
              Skip tour
            </button>
            <button onClick={next}
              className="px-5 py-2.5 rounded-xl text-sm font-black text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg">
              {isLast ? "Got it!" : "Next"}
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-4">
            {steps.map((_, i) => (
              <div key={i} className="transition-all duration-200"
                style={{
                  width: i === step ? 16 : 6, height: 6, borderRadius: 3,
                  background: i === step ? "#6366f1" : i < step ? "#a5b4fc" : "#e2e8f0",
                }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manually trigger the tour (e.g. from a "?" help button).
 */
export function useTourReset(type, userId) {
  return useCallback(() => {
    try { localStorage.removeItem(`lp_tour_${type}_${userId}`); } catch {}
    window.location.reload();
  }, [type, userId]);
}