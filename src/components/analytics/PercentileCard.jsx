"use client";
// ============================================================================
// PercentileCard - Peer Comparison Display
// ============================================================================
import React from "react";
import { SUBJECT_ICONS } from "@/lib/gamificationEngine";

export default function PercentileCard({ percentiles = [], yearLevel, curriculum }) {
  if (!percentiles || percentiles.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 border-2 border-slate-100">
        <h3 className="text-xl font-black text-slate-900 mb-4">📊 Peer Comparison</h3>
        <div className="text-center py-8">
          <p className="text-slate-400 font-bold italic">
            Not enough data for peer comparison yet
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Complete more quizzes to see how your child compares to peers
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 border-2 border-slate-100">
      <h3 className="text-xl font-black text-slate-900 mb-2">📊 Peer Comparison</h3>
      <p className="text-sm text-slate-600 mb-6">
        Anonymised comparison with peers in the same year and curriculum
      </p>

      <div className="space-y-4">
        {percentiles.map((p, idx) => {
          const topPercentage = 100 - p.percentile;
          const color = topPercentage >= 75 
            ? 'emerald' 
            : topPercentage >= 50 
            ? 'blue' 
            : topPercentage >= 25 
            ? 'amber' 
            : 'slate';

          return (
            <div
              key={idx}
              className={`border-2 border-${color}-200 bg-${color}-50 rounded-2xl p-4 hover:shadow-md transition-all`}
            >
              {/* Subject Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{SUBJECT_ICONS[p.subject] || '📚'}</span>
                  <div>
                    <h4 className="font-black text-lg capitalize text-slate-900">
                      {p.subject}
                    </h4>
                    {p.topic && (
                      <p className="text-xs text-slate-600 capitalize">{p.topic}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-black text-${color}-600`}>
                    Top {topPercentage}%
                  </div>
                  <div className="text-xs text-slate-500 font-bold">
                    of {p.cohortSize} peers
                  </div>
                </div>
              </div>

              {/* Performance Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs font-bold mb-1 text-slate-600">
                  <span>Performance</span>
                  <span>{p.scholarAvg}% average</span>
                </div>
                <div className="bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`bg-${color}-500 h-3 rounded-full transition-all duration-1000`}
                    style={{ width: `${p.scholarAvg}%` }}
                  />
                </div>
              </div>

              {/* Interpretation */}
              <p className="text-sm text-slate-700 leading-relaxed">
                Your child scored{' '}
                <span className="font-black text-slate-900">{p.scholarAvg}%</span> on average,
                {' '}better than{' '}
                <span className="font-black text-slate-900">{p.percentile}%</span> of{' '}
                <span className="font-black text-slate-900">{p.cohortSize} peers</span>.
              </p>

              {/* Encouragement */}
              {topPercentage >= 75 && (
                <div className="mt-3 bg-emerald-100 border border-emerald-300 rounded-lg p-2">
                  <p className="text-xs font-bold text-emerald-800">
                    ⭐ Excellent performance! Keep up the great work!
                  </p>
                </div>
              )}
              {topPercentage >= 50 && topPercentage < 75 && (
                <div className="mt-3 bg-blue-100 border border-blue-300 rounded-lg p-2">
                  <p className="text-xs font-bold text-blue-800">
                    👍 Great progress! Consistent practice will boost performance further.
                  </p>
                </div>
              )}
              {topPercentage < 50 && (
                <div className="mt-3 bg-amber-100 border border-amber-300 rounded-lg p-2">
                  <p className="text-xs font-bold text-amber-800">
                    💪 Room for improvement! Daily practice can make a big difference.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}