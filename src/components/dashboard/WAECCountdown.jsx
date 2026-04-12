'use client';
/**
 * WAECCountdown.jsx
 * Deploy to: src/components/dashboard/WAECCountdown.jsx
 *
 * Nigerian SSS (Senior Secondary) WAEC exam countdown component.
 * Shows urgency-based styling and contextual messaging for SSS1/SSS2/SSS3 scholars.
 *
 * Props:
 *   yearLevel   — number (1 = SSS1, 2 = SSS2, 3 = SSS3)
 *   curriculum  — string (should be 'ng_sss')
 *   className   — optional CSS class string
 */

import React, { useState, useEffect } from 'react';

export default function WAECCountdown({ yearLevel = 1, curriculum = 'ng_sss', className = '' }) {
  const [daysUntilExam, setDaysUntilExam] = useState(null);
  const [examSeason, setExamSeason] = useState('');
  const [urgencyStyle, setUrgencyStyle] = useState('calm');

  // Only show for Nigerian SSS curriculum
  if (curriculum !== 'ng_sss') return null;

  useEffect(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0 = January, 11 = December

    // WAEC sittings: May/June (around May 6) and November/December (around October 10)
    // For May/June sitting
    const mayExamDate = new Date(currentYear, 4, 6); // May 6
    // For Nov/Dec sitting
    const novExamDate = new Date(currentYear, 9, 10); // October 10

    let targetDate;
    let season;

    // Determine which sitting is next
    if (today < mayExamDate) {
      targetDate = mayExamDate;
      season = 'May/June';
    } else if (today < novExamDate) {
      targetDate = novExamDate;
      season = 'Nov/Dec';
    } else {
      // Next year's May sitting
      targetDate = new Date(currentYear + 1, 4, 6);
      season = 'May/June';
    }

    // Calculate days difference
    const timeDiff = targetDate - today;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    setDaysUntilExam(daysDiff);
    setExamSeason(season);

    // Determine urgency level
    if (daysDiff < 30) {
      setUrgencyStyle('urgent'); // red
    } else if (daysDiff < 90) {
      setUrgencyStyle('warning'); // amber
    } else {
      setUrgencyStyle('calm'); // indigo
    }
  }, []);

  const getBackgroundColor = () => {
    switch (urgencyStyle) {
      case 'urgent':
        return 'bg-red-900/40';
      case 'warning':
        return 'bg-amber-900/40';
      case 'calm':
        return 'bg-indigo-900/40';
      default:
        return 'bg-indigo-900/40';
    }
  };

  const getTextColor = () => {
    switch (urgencyStyle) {
      case 'urgent':
        return 'text-red-300';
      case 'warning':
        return 'text-amber-300';
      case 'calm':
        return 'text-indigo-300';
      default:
        return 'text-indigo-300';
    }
  };

  const getSecondaryTextColor = () => {
    switch (urgencyStyle) {
      case 'urgent':
        return 'text-red-200/70';
      case 'warning':
        return 'text-amber-200/70';
      case 'calm':
        return 'text-indigo-200/70';
      default:
        return 'text-indigo-200/70';
    }
  };

  // SSS1: WAEC in ~1 year — keep building foundation
  if (yearLevel === 1) {
    return (
      <div className={`${getBackgroundColor()} rounded-2xl border border-white/10 px-5 py-4 ${className}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🇳🇬</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
              WAEC in ~1 year
            </div>
            <div style={{ fontSize: 11, color: getSecondaryTextColor(), marginTop: 2 }}>
              Keep building your foundation — you're on track
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SSS2: Your WAEC SSCE is in X days (should take exams this year)
  if (yearLevel === 2) {
    return (
      <div className={`${getBackgroundColor()} rounded-2xl border border-white/10 px-5 py-4 ${className}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>📋</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
              Your WAEC SSCE is in {daysUntilExam !== null ? daysUntilExam : '~'} days
            </div>
            <div style={{ fontSize: 11, color: getSecondaryTextColor(), marginTop: 2 }}>
              {examSeason} sitting — {urgencyStyle === 'urgent' ? 'Final push ahead!' : 'Start your revision plan'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SSS3: WAEC Results Season or Preparation
  if (yearLevel === 3) {
    const currentMonth = new Date().getMonth();
    const isResultsSeason = currentMonth >= 11 || currentMonth < 2; // Dec-Jan results

    return (
      <div className={`${getBackgroundColor()} rounded-2xl border border-white/10 px-5 py-4 ${className}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>✨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
              {isResultsSeason ? 'WAEC Results Season' : 'Final Year — WAEC Preparation'}
            </div>
            <div style={{ fontSize: 11, color: getSecondaryTextColor(), marginTop: 2 }}>
              {isResultsSeason ? 'Results are coming — stay focused on your goals' : 'Make every question count — you\'ve got this'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
