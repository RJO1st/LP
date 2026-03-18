/**
 * UpgradeModal.jsx
 * Deploy to: src/components/UpgradeModal.jsx
 *
 * Shown when a Free-tier scholar:
 * - Hits their 10 question/day limit
 * - Tries to access Tara AI
 * - Tries to access mock tests
 * - Tries to access parent dashboard features
 *
 * Displays usage stats and regional pricing with upgrade CTA.
 */

"use client";
import React from "react";
import Link from "next/link";

const PRICING = {
  uk:    { currency: "£",  monthly: "12.99", annual: "109.99", annualMo: "9.17",  flag: "🇬🇧" },
  ng:    { currency: "₦",  monthly: "9,999", annual: "99,999", annualMo: "8,333", flag: "🇳🇬" },
  ca:    { currency: "C$", monthly: "19.99", annual: "169.99", annualMo: "14.17", flag: "🇨🇦" },
  other: { currency: "£",  monthly: "12.99", annual: "109.99", annualMo: "9.17",  flag: "🌍" },
};

export default function UpgradeModal({
  onClose,
  reason = "daily_limit_reached", // "daily_limit_reached" | "tara_locked" | "feature_locked"
  todayCount = 0,
  dailyLimit = 10,
  scholarName = "Scholar",
  region = "uk",
}) {
  const p = PRICING[region] || PRICING.uk;

  const titles = {
    daily_limit_reached: "You've reached today's limit!",
    tara_locked: "Tara AI is a Pro feature",
    feature_locked: "This feature is Pro-only",
  };

  const descriptions = {
    daily_limit_reached: `${scholarName} answered ${todayCount} questions today — that's great work! Upgrade to Pro for unlimited practice every day.`,
    tara_locked: `Tara's "Explain It Back" tutoring helps scholars understand why answers are right or wrong. Upgrade to unlock Tara for ${scholarName}.`,
    feature_locked: `This feature is available on the Pro plan. Upgrade to unlock the full LaunchPard experience for ${scholarName}.`,
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="text-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
            <span className="text-3xl">
              {reason === "daily_limit_reached" ? "🚀" : reason === "tara_locked" ? "🤖" : "⭐"}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">
            {titles[reason] || titles.feature_locked}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {descriptions[reason] || descriptions.feature_locked}
          </p>
        </div>

        {/* Daily limit progress (only for limit reached) */}
        {reason === "daily_limit_reached" && (
          <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100">
            <div className="flex justify-between text-xs text-slate-500 font-bold mb-2">
              <span>Today's questions</span>
              <span className="text-indigo-600">{todayCount}/{dailyLimit}</span>
            </div>
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (todayCount / dailyLimit) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Resets at midnight · Come back tomorrow for 10 more free questions
            </p>
          </div>
        )}

        {/* Pro benefits */}
        <div className="space-y-2 mb-5">
          {[
            ["🚀", "Unlimited questions every day"],
            ["🤖", "Tara AI tutor — personalised feedback"],
            ["📊", "Full parent dashboard + weekly reports"],
            ["📝", "Mock tests & exam prep"],
            ["🏆", "Certificates & leaderboards"],
          ].map(([icon, text], i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm">
              <span className="text-base flex-shrink-0">{icon}</span>
              <span className="text-slate-700 font-medium">{text}</span>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 mb-5 border border-indigo-100 text-center">
          <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider mb-1">Pro Plan</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-black text-indigo-700">{p.currency}{p.annualMo}</span>
            <span className="text-sm text-indigo-400">/month</span>
          </div>
          <p className="text-xs text-indigo-400 mt-1">
            Billed {p.currency}{p.annual}/year · 2 months free
          </p>
        </div>

        {/* CTAs */}
        <Link
          href="/subscribe"
          className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black py-3.5 rounded-xl text-center text-sm shadow-lg shadow-indigo-500/20 transition-all"
        >
          Upgrade to Pro
        </Link>
        <button
          onClick={onClose}
          className="block w-full text-center text-sm text-slate-400 font-bold mt-3 hover:text-slate-600 transition-colors"
        >
          {reason === "daily_limit_reached" ? "I'll come back tomorrow" : "Maybe later"}
        </button>
      </div>
    </div>
  );
}

/**
 * Small inline banner version — for embedding in dashboard sections
 * Shows when a feature is locked (not a modal, just an inline prompt)
 */
export function UpgradeBanner({ feature = "This feature", region = "uk", compact = false }) {
  const p = PRICING[region] || PRICING.uk;

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">⭐</span>
          <p className="text-xs text-indigo-700 font-bold truncate">{feature} is Pro-only</p>
        </div>
        <Link href="/subscribe" className="text-xs font-black text-indigo-600 bg-indigo-100 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors whitespace-nowrap">
          Upgrade
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 text-center">
      <span className="text-3xl block mb-3">⭐</span>
      <p className="text-sm font-black text-indigo-900 mb-1">{feature} requires Pro</p>
      <p className="text-xs text-indigo-500 mb-4">
        From {p.currency}{p.annualMo}/mo · Unlimited questions, Tara AI, parent dashboard & more
      </p>
      <Link href="/subscribe" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors">
        Upgrade to Pro
      </Link>
    </div>
  );
}