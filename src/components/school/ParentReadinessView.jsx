"use client";

import React from "react";
import FeatureGate from "@/components/gates/FeatureGate";
import { hasFeature } from "@/lib/tierAccess";

// ═══════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════
const Icon = ({ d, size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const ChartIcon = ({ size = 20 }) => (
  <Icon size={size} d={["M3 3v18h18", "M18 17V9M13 17v-4M8 17v-7"]} />
);
const TrendIcon = ({ size = 20 }) => (
  <Icon size={size} d={["M23 6l-9.5 9.5-5-5L1 18M17 6h6v6"]} />
);
const CheckIcon = ({ size = 20 }) => <Icon size={size} d="M20 6 9 17l-5-5" />;
const LockIcon = ({ size = 20 }) => (
  <Icon
    size={size}
    d={["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10a4 4 0 1 1 10 0v4H7V10z"]}
  />
);

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function getReadinessColors(score) {
  // NOTE: bar class must be a complete static string — Tailwind's content scanner
  // cannot include dynamically constructed classes (e.g. text.replace("text","bg")).
  if (score >= 85) return { bg: "bg-emerald-500/20", ring: "ring-emerald-500/30", text: "text-emerald-400", bar: "bg-emerald-400", label: "Exceptional" };
  if (score >= 70) return { bg: "bg-emerald-500/20", ring: "ring-emerald-500/30", text: "text-emerald-400", bar: "bg-emerald-400", label: "Ready" };
  if (score >= 50) return { bg: "bg-amber-500/20", ring: "ring-amber-500/30", text: "text-amber-400", bar: "bg-amber-400", label: "Developing" };
  return { bg: "bg-red-500/20", ring: "ring-red-500/30", text: "text-red-400", bar: "bg-red-400", label: "Needs Support" };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function ParentReadinessView({
  scholar,
  parent,
  readinessData,
  loading = false,
}) {
  const isPaid = hasFeature(parent, "dashboard_analytics");
  const colors = getReadinessColors(readinessData?.overall_score || 0);

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-white/10 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-slate-600/30 rounded w-1/3 mb-4" />
        <div className="h-40 bg-slate-600/30 rounded mb-4" />
        <div className="h-4 bg-slate-600/30 rounded w-1/2" />
      </div>
    );
  }

  if (!readinessData) {
    return (
      <div className="bg-slate-800/50 border border-white/10 rounded-lg p-6">
        <p className="text-slate-400 text-sm">
          No readiness data available yet. Check back soon as your child progresses through lessons.
        </p>
      </div>
    );
  }

  const overallScore = readinessData.overall_score || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white mb-1">
          {scholar?.name || "Scholar"}&apos;s Readiness
        </h2>
        <p className="text-sm text-slate-400">
          Progress towards entrance exam readiness
        </p>
      </div>

      {/* Overall Score — Circular Progress Indicator */}
      <div className={`bg-slate-800/50 border border-white/10 rounded-lg p-8 text-center ${colors.bg}`}>
        <div className="flex justify-center mb-4">
          <div className={`relative w-40 h-40 rounded-full ring-8 ${colors.ring} bg-slate-900/50 flex items-center justify-center`}>
            <div className="text-center">
              <div className={`text-5xl font-black ${colors.text}`}>
                {Math.round(overallScore)}%
              </div>
              <div className="text-xs text-slate-400 mt-2">Overall Readiness</div>
            </div>
          </div>
        </div>

        {/* Grade Band Label */}
        <div className="mt-6">
          <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${colors.bg} border ${colors.ring.replace("ring", "border")} ${colors.text}`}>
            {colors.label}
          </span>
        </div>

        {/* Status message */}
        <p className="text-sm text-slate-300 mt-4 mx-auto max-w-md leading-relaxed">
          {overallScore >= 85 && "Your child is performing exceptionally well and is well-prepared for the entrance exam."}
          {overallScore >= 70 && overallScore < 85 && "Your child is on track and performing well. Continued practice will maintain this progress."}
          {overallScore >= 50 && overallScore < 70 && "Your child is developing their skills. Focused practice in weak areas will help improve readiness."}
          {overallScore < 50 && "Your child needs additional support. Target practice on weak topics is recommended."}
        </p>
      </div>

      {/* Subject Breakdown — Gated for paid tier */}
      {isPaid ? (
        <div className="bg-slate-800/50 border border-white/10 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <ChartIcon size={20} className="text-emerald-400" />
            Subject Breakdown
          </h3>

          {readinessData.subjectScores && Object.keys(readinessData.subjectScores).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(readinessData.subjectScores).map(([subject, score]) => {
                const subjectColor = getReadinessColors(score);
                return (
                  <div key={subject}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-300">
                        {formatSubjectLabel(subject)}
                      </span>
                      <span className={`text-sm font-bold ${subjectColor.text}`}>
                        {score}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${subjectColor.bar} transition-all`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Subject scores will appear as your child practises lessons.
            </p>
          )}

          {/* Topic Weaknesses */}
          {readinessData.topicWeaknesses && readinessData.topicWeaknesses.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/5">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <TrendIcon size={18} className="text-amber-400" />
                Recommended Focus Areas
              </h4>
              <div className="space-y-2">
                {readinessData.topicWeaknesses.slice(0, 3).map((topic, idx) => (
                  <div key={idx} className="bg-slate-700/30 p-3 rounded border border-white/5">
                    <p className="text-sm font-medium text-slate-200">{topic.topic}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Currently at {topic.mastery}% mastery
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Free tier — locked section */
        <FeatureGate
          parent={parent}
          feature="dashboard_analytics"
          fallback={
            <div className="bg-slate-800/50 border border-white/10 rounded-lg p-6">
              <div className="relative">
                {/* Blurred background content */}
                <div className="blur-sm opacity-40">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <ChartIcon size={20} className="text-emerald-400" />
                    Subject Breakdown
                  </h3>
                  <div className="space-y-4">
                    {["Mathematics", "English", "Verbal Reasoning", "Non-verbal Reasoning"].map(
                      (subj) => (
                        <div key={subj}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{subj}</span>
                            <span className="text-sm font-bold">---%</span>
                          </div>
                          <div className="w-full h-3 bg-slate-700/50 rounded-full" />
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Lock overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-lg backdrop-blur-sm">
                  <LockIcon size={40} className="text-amber-400 mb-3" />
                  <p className="text-center text-sm font-medium text-white max-w-xs">
                    Upgrade to Scholar to unlock detailed subject insights and topic recommendations
                  </p>
                </div>
              </div>

              {/* Upgrade button */}
              <div className="mt-4 flex justify-center">
                <a
                  href="/subscribe"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
                >
                  <CheckIcon size={16} />
                  Upgrade to Scholar
                </a>
              </div>
            </div>
          }
        />
      )}

      {/* Last updated note */}
      {readinessData.snapshot_date && (
        <p className="text-xs text-slate-500 text-center">
          Last updated {new Date(readinessData.snapshot_date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function formatSubjectLabel(subject) {
  const labels = {
    mathematics: "Maths",
    english: "English",
    verbal_reasoning: "Verbal Reasoning",
    nvr: "Non-verbal Reasoning",
    english_language: "English Language",
    english_literature: "English Literature",
    science: "Science",
    combined_science: "Combined Science",
    biology: "Biology",
    chemistry: "Chemistry",
    physics: "Physics",
  };
  return labels[subject] || subject.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
