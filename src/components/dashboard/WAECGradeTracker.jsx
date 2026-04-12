'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/components/theme/ThemeProvider';

/**
 * WAECGradeTracker.jsx
 *
 * Nigerian WAEC (West African Examinations Council) Grade Prediction Panel
 * Shows predicted WAEC grades per subject and overall "WAEC Ready" status.
 *
 * Props:
 *   scholar:   object — { id, curriculum, year_level, ... }
 *   supabase:  client — Supabase client for DB queries
 *   className: string — Optional Tailwind classes
 *
 * Features:
 *   - Shows only for ng_sss scholars (SS2/SS3 students)
 *   - Fetches scholar's topic mastery per subject
 *   - Groups mastery by subject, computes average per subject
 *   - Converts mastery score (0-1) to WAEC grade (A1-F9)
 *   - Shows "WAEC Ready ✓" badge if ≥5 subjects at C6+ (≥50% mastery)
 *   - Dark/light theme support
 *   - Loading skeleton + error handling
 */

// ═════════════════════════════════════════════════════════════════════════
// WAEC GRADING HELPER
// ═════════════════════════════════════════════════════════════════════════
function getWAECGrade(percentage) {
  if (percentage >= 85) return { grade: 'A1', label: 'Distinction', color: 'bg-emerald-900/30', textColor: 'text-emerald-400' };
  if (percentage >= 75) return { grade: 'B2', label: 'Very Good', color: 'bg-green-900/30', textColor: 'text-green-400' };
  if (percentage >= 65) return { grade: 'B3', label: 'Good', color: 'bg-green-900/30', textColor: 'text-green-400' };
  if (percentage >= 60) return { grade: 'C4', label: 'Credit', color: 'bg-amber-900/30', textColor: 'text-amber-400' };
  if (percentage >= 55) return { grade: 'C5', label: 'Credit', color: 'bg-amber-900/30', textColor: 'text-amber-400' };
  if (percentage >= 50) return { grade: 'C6', label: 'Credit', color: 'bg-amber-900/30', textColor: 'text-amber-400' };
  if (percentage >= 40) return { grade: 'D7', label: 'Pass', color: 'bg-orange-900/30', textColor: 'text-orange-400' };
  if (percentage >= 30) return { grade: 'E8', label: 'Weak Pass', color: 'bg-orange-900/30', textColor: 'text-orange-400' };
  return { grade: 'F9', label: 'Fail', color: 'bg-red-900/30', textColor: 'text-red-400' };
}

// Core 5 WAEC subjects (default) + arts/commercial alternatives
const CORE_SUBJECTS = ['mathematics', 'english', 'physics', 'chemistry', 'biology'];
const ARTS_SUBJECTS = ['mathematics', 'english', 'history', 'government', 'geography'];
const COMMERCIAL_SUBJECTS = ['mathematics', 'english', 'accounting', 'commerce', 'economics'];

export default function WAECGradeTracker({ scholar, supabase, className = '' }) {
  const { isDark } = useTheme();
  const [gradeData, setGradeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Only render for ng_sss scholars
  if (!scholar || scholar.curriculum !== 'ng_sss') {
    return null;
  }

  useEffect(() => {
    const fetchGradeData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!scholar.id) {
          throw new Error('Scholar ID required');
        }

        // Fetch scholar's mastery data per subject
        const { data: masteryRows, error: fetchError } = await supabase
          .from('scholar_topic_mastery')
          .select('subject, mastery_score')
          .eq('scholar_id', scholar.id);

        if (fetchError) {
          throw fetchError;
        }

        if (!masteryRows || masteryRows.length === 0) {
          setGradeData({
            subjects: [],
            creditCount: 0,
            isWAECReady: false,
          });
          return;
        }

        // Group by subject and compute average mastery per subject
        const subjectMap = new Map();

        masteryRows.forEach((row) => {
          const subject = row.subject?.toLowerCase();
          if (!subject) return;

          if (!subjectMap.has(subject)) {
            subjectMap.set(subject, { scores: [], subject });
          }
          subjectMap.get(subject).scores.push(row.mastery_score || 0);
        });

        // Compute average mastery per subject and convert to WAEC grade
        const subjects = Array.from(subjectMap.values())
          .map((item) => {
            const avgMastery = item.scores.reduce((a, b) => a + b, 0) / item.scores.length;
            const percentage = avgMastery * 100;
            const grade = getWAECGrade(percentage);

            return {
              subject: item.subject,
              displayName: item.subject.charAt(0).toUpperCase() + item.subject.slice(1),
              mastery: avgMastery,
              percentage: Math.round(percentage),
              grade: grade.grade,
              label: grade.label,
              color: grade.color,
              textColor: grade.textColor,
              isCredit: percentage >= 50, // C6+ = Credit
            };
          })
          .sort((a, b) => b.mastery - a.mastery); // Highest mastery first

        // Check if WAEC ready (≥5 subjects at C6+, 50% mastery)
        const creditCount = subjects.filter((s) => s.isCredit).length;
        const isWAECReady = creditCount >= 5;

        setGradeData({
          subjects,
          creditCount,
          isWAECReady,
        });
      } catch (err) {
        console.error('[WAECGradeTracker] Fetch error:', err);
        setError(err.message || 'Failed to load grade data');
      } finally {
        setLoading(false);
      }
    };

    if (scholar?.id) {
      fetchGradeData();
    }
  }, [scholar?.id, supabase]);

  // Loading skeleton
  if (loading) {
    return (
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-4 sm:p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-gray-300 dark:bg-gray-600 rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded" />
                <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-4 sm:p-6 ${className}`}>
        <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>Grade data unavailable</p>
      </div>
    );
  }

  // Empty state
  if (!gradeData || gradeData.subjects.length === 0) {
    return (
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-4 sm:p-6 ${className}`}>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          🇳🇬 WAEC Grade Tracker
        </h3>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Take more quests to see predicted grades
        </p>
      </div>
    );
  }

  return (
    <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        🇳🇬 WAEC Grade Tracker
      </h3>

      {/* Subject Rows */}
      <div className="space-y-3 mb-4">
        {gradeData.subjects.map((subject) => (
          <div key={subject.subject} className="flex items-center justify-between gap-4">
            {/* Subject Name + Bar */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center gap-2 mb-1">
                <span className={`text-sm font-medium truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {subject.displayName}
                </span>
                <span className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {subject.percentage}%
                </span>
              </div>
              {/* Mastery bar */}
              <div className={`h-2 w-full rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'} overflow-hidden`}>
                <div
                  className={`h-full transition-all ${
                    subject.percentage >= 85
                      ? 'bg-emerald-500'
                      : subject.percentage >= 75
                        ? 'bg-green-500'
                        : subject.percentage >= 65
                          ? 'bg-green-400'
                          : subject.percentage >= 50
                            ? 'bg-amber-500'
                            : subject.percentage >= 40
                              ? 'bg-orange-500'
                              : 'bg-red-500'
                  }`}
                  style={{ width: `${subject.percentage}%` }}
                />
              </div>
            </div>

            {/* Grade Badge */}
            <div className={`${subject.color} rounded px-2.5 py-1 flex items-center gap-1.5 min-w-max`}>
              <span className={`text-sm font-bold ${subject.textColor}`}>{subject.grade}</span>
              {subject.isCredit && <span className="text-xs text-emerald-400">✓</span>}
            </div>
          </div>
        ))}
      </div>

      {/* WAEC Ready Status */}
      <div className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} pt-4`}>
        {gradeData.isWAECReady ? (
          <div className={`${isDark ? 'bg-emerald-900/20' : 'bg-emerald-50'} rounded-lg p-3 text-center border ${isDark ? 'border-emerald-800' : 'border-emerald-200'}`}>
            <p className={`text-sm font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              ✓ WAEC Ready
            </p>
            <p className={`text-xs ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>
              {gradeData.creditCount} subjects at Credit level
            </p>
          </div>
        ) : (
          <div className={`${isDark ? 'bg-amber-900/20' : 'bg-amber-50'} rounded-lg p-3 text-center border ${isDark ? 'border-amber-800' : 'border-amber-200'}`}>
            <p className={`text-sm font-semibold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              {5 - gradeData.creditCount} subjects to Credit level
            </p>
            <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
              Currently {gradeData.creditCount}/5 subjects at C6+
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
