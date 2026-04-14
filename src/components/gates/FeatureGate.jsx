"use client";
/**
 * FeatureGate — wraps any tier-gated UI.
 *
 * Usage:
 *   <FeatureGate parent={parent} feature="exam_papers">
 *     <ExamOrchestrator {...props} />
 *   </FeatureGate>
 *
 * If the parent's tier has the feature, children render normally.
 * If not, a themed upgrade prompt renders with the cheapest tier that
 * would unlock the feature (derived from getUpgradeReason()).
 *
 * Props:
 *   parent       — the parent record (must include region, subscription_tier)
 *   feature      — feature key (see TIER_DEFS in lib/tierAccess.js)
 *   children     — gated content
 *   fallback     — optional custom fallback (string | ReactNode). Default: upgrade card.
 *   asCard       — if true, renders a full BandCard-style upsell; if false, renders a compact inline banner. Default true.
 */
import React from 'react';
import Link from 'next/link';
import { hasFeature, getUpgradeReason, getTierLabel } from '@/lib/tierAccess';

export default function FeatureGate({ parent, feature, children, fallback, asCard = true }) {
  // Defensive: if parent is null/undefined (e.g., still loading), render nothing rather than
  // flashing the upgrade prompt. Callers should handle loading state themselves.
  if (!parent) return null;

  if (hasFeature(parent, feature)) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  const { requiredTier, region } = getUpgradeReason(parent, feature) || {};
  const tierLabel = requiredTier ? getTierLabel(requiredTier) : 'a paid plan';
  const featureLabel = FEATURE_LABELS[feature] || feature.replace(/_/g, ' ');
  const isNG = region === 'NG';
  const accent = isNG ? 'emerald' : 'indigo';

  const message = requiredTier
    ? `Upgrade to ${tierLabel} to unlock ${featureLabel}.`
    : `This is a paid feature. Upgrade your plan to unlock ${featureLabel}.`;

  if (asCard) {
    return (
      <div className={`bg-white dark:bg-slate-800/40 border-2 border-dashed border-${accent}-400/40 dark:border-${accent}-500/40 rounded-3xl p-8 text-center`}>
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-xl font-black text-slate-900 dark:text-slate-50 mb-2 capitalize">
          {featureLabel}
        </h3>
        <p className="text-slate-700 dark:text-slate-300 mb-6 max-w-sm mx-auto">{message}</p>
        <Link
          href="/subscribe"
          className={`inline-flex items-center gap-2 bg-${accent}-500 hover:bg-${accent}-600 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-${accent}-500/20`}
        >
          View plans <span>→</span>
        </Link>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 text-xs font-bold text-${accent}-700 dark:text-${accent}-300 bg-${accent}-50 dark:bg-${accent}-900/20 border border-${accent}-200 dark:border-${accent}-500/30 rounded-full px-3 py-1.5`}>
      <span>🔒</span>
      <span>{featureLabel} · <Link href="/subscribe" className="underline">Upgrade</Link></span>
    </div>
  );
}

// Human-readable labels for each feature key
const FEATURE_LABELS = {
  boss_battles: 'Boss Battles',
  simulations_3d: 'Interactive 3D Simulations',
  exam_papers: 'GCSE & WAEC Exam Papers',
  live_qa: 'Live Tutor Q&A Sessions',
  offline_mode: 'Offline Learning Mode',
  dashboard_analytics: 'Full Dashboard Analytics',
  feedback_monthly: 'Tara AI Feedback',
  daily_questions: 'Unlimited Questions',
};
