'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
  Calendar,
  Flame,
  Zap,
  BookOpen,
  ChevronRight,
  Clock,
  Target,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

// Configuration for exam-critical subjects by exam type
const EXAM_CONFIG = {
  '11plus': {
    critical: ['maths', 'english', 'reasoning'],
    weights: { maths: 1.0, english: 0.9, reasoning: 0.8 },
  },
  gcse: {
    critical: ['maths', 'english', 'sciences'],
    weights: { maths: 1.0, english: 1.0, sciences: 0.9 },
  },
  waec: {
    critical: ['maths', 'english', 'sciences'],
    weights: { maths: 1.0, english: 1.0, sciences: 0.9 },
  },
  bece: {
    critical: ['maths', 'english', 'sciences'],
    weights: { maths: 1.0, english: 1.0, sciences: 0.9 },
  },
};

// Age band configurations for language and time blocks
const AGE_CONFIG = {
  ks1: {
    timeBlock: 5,
    language: 'explore',
    emoji: '🚀',
    maxBlocksPerSubject: 1,
  },
  ks2: {
    timeBlock: 10,
    language: 'mission',
    emoji: '🎯',
    maxBlocksPerSubject: 2,
  },
  ks3: {
    timeBlock: 15,
    language: 'review',
    emoji: '📚',
    maxBlocksPerSubject: 2,
  },
  ks4: {
    timeBlock: 15,
    language: 'revision',
    emoji: '⚡',
    maxBlocksPerSubject: 3,
  },
};

/**
 * SmartStudyPlanner Component
 * Generates personalized daily and weekly study plans based on mastery data,
 * spaced repetition, and exam targets.
 */
export default function SmartStudyPlanner({
  scholarName = 'Scholar',
  subjects = [],
  masteryData = {},
  examTarget = null,
  dailyGoal = 30,
  streak = 0,
  onStartSession = () => {},
  ageBand = 'ks2',
}) {
  // State for today's sessions and which ones are completed
  const [completedSessions, setCompletedSessions] = useState([]);

  // Validate inputs
  const validAgeBand = AGE_CONFIG[ageBand] ? ageBand : 'ks2';
  const ageConfig = AGE_CONFIG[validAgeBand];

  /**
   * Calculate priority and urgency for each subject based on mastery data
   */
  const calculateSubjectPriority = useCallback(
    (subjectKey, subjectData) => {
      const now = new Date();
      const lastSeen = subjectData.lastSeenAt
        ? new Date(subjectData.lastSeenAt)
        : null;

      // Days since last review
      const daysSinceLastSeen = lastSeen
        ? Math.floor((now - lastSeen) / (1000 * 60 * 60 * 24))
        : 999;

      // SM-2 spaced repetition interval
      const interval = subjectData.intervalDays || 1;
      const isOverdue = daysSinceLastSeen > interval;
      const overdueDays = Math.max(0, daysSinceLastSeen - interval);

      // Stability (0-1): how consistent the learner is
      const stability = Math.min(1, subjectData.stability || 0.5);

      // Weakness score: inverse of composite mastery
      const compositeScore = subjectData.compositeScore || 0;
      const weakness = Math.max(0, 1 - compositeScore);

      // Recency penalty: last seen recently = lower priority
      const recency = subjectData.recency || 0; // 0-1, 1 = very recent

      // Exam weight
      let examWeight = 0;
      if (examTarget) {
        const examConfig = EXAM_CONFIG[examTarget.type];
        if (examConfig && examConfig.weights[subjectKey]) {
          examWeight = examConfig.weights[subjectKey];
        }
      }

      // Priority formula: overdue reviews trump everything
      let priority = 0;
      if (isOverdue) {
        priority = overdueDays * 3 * (1 - stability) + weakness * 2 + examWeight * 1;
      } else {
        priority = weakness * 2 + examWeight * 1 + (1 - recency) * 0.5;
      }

      return {
        subjectKey,
        subjectLabel: subjects.find((s) => s.key === subjectKey)?.label || subjectKey,
        subjectIcon: subjects.find((s) => s.key === subjectKey)?.icon || BookOpen,
        priority,
        isOverdue,
        overdueDays,
        daysSinceLastSeen,
        interval,
        stability,
        weakness,
        compositeScore,
        recency,
        examWeight,
      };
    },
    [subjects],
  );

  /**
   * Generate today's study plan
   */
  const todaysPlan = useMemo(() => {
    if (!subjects || subjects.length === 0) {
      return {
        sessions: [],
        totalMinutes: 0,
        message: 'No subjects configured yet',
      };
    }

    // Calculate priority for all subjects
    const subjectsWithPriority = subjects
      .map((subject) => {
        const data = masteryData[subject.key] || {};
        return calculateSubjectPriority(subject.key, data);
      })
      .sort((a, b) => b.priority - a.priority);

    // Allocate time blocks until dailyGoal is met
    const sessions = [];
    let totalMinutes = 0;
    const blockCountPerSubject = {};

    for (const subject of subjectsWithPriority) {
      if (totalMinutes >= dailyGoal) break;

      const maxBlocks = ageConfig.maxBlocksPerSubject;
      const currentBlocks = blockCountPerSubject[subject.subjectKey] || 0;

      if (currentBlocks >= maxBlocks) continue;

      const remainingGoal = dailyGoal - totalMinutes;
      const sessionTime = Math.min(
        ageConfig.timeBlock,
        remainingGoal,
      );

      if (sessionTime < 5) break; // Minimum 5 minute session

      // Determine reason for this session
      let reason = 'Maintain & extend';
      let reasonEmoji = '📈';

      if (subject.isOverdue) {
        reason = `Due for review (${subject.overdueDays}d overdue)`;
        reasonEmoji = '⏰';
      } else if (subject.weakness > 0.5) {
        reason = 'Weakest area — focus time';
        reasonEmoji = '🎯';
      } else if (subject.examWeight > 0) {
        reason = 'Exam prep priority';
        reasonEmoji = '📚';
      }

      sessions.push({
        id: `${subject.subjectKey}-${sessions.length}`,
        subjectKey: subject.subjectKey,
        subjectLabel: subject.subjectLabel,
        subjectIcon: subject.subjectIcon,
        timeInMinutes: sessionTime,
        reason,
        reasonEmoji,
        priority: subject.priority,
        isOverdue: subject.isOverdue,
        compositeScore: subject.compositeScore,
      });

      totalMinutes += sessionTime;
      blockCountPerSubject[subject.subjectKey] =
        (blockCountPerSubject[subject.subjectKey] || 0) + 1;
    }

    return {
      sessions,
      totalMinutes,
      message:
        sessions.length === 0
          ? 'All caught up! Review to strengthen your knowledge.'
          : null,
    };
  }, [subjects, masteryData, dailyGoal, calculateSubjectPriority, ageConfig.maxBlocksPerSubject, ageConfig.timeBlock]);

  /**
   * Generate week schedule
   */
  const weekSchedule = useMemo(() => {
    const today = new Date();
    const schedule = {};
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    // Initialize 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = dayNames[date.getDay()];
      schedule[dayName] = {
        date: date.toISOString().split('T')[0],
        dayName,
        isToday: i === 0,
        plannedSubjects: [],
      };
    }

    // Distribute today's plan across first day, others get variation
    if (todaysPlan.sessions.length > 0) {
      schedule['Sunday'].plannedSubjects = todaysPlan.sessions
        .slice(0, 2)
        .map((s) => ({
          subjectKey: s.subjectKey,
          label: s.subjectLabel,
          time: s.timeInMinutes,
          icon: s.subjectIcon,
        }));

      // Distribute remaining subjects across the week using spaced scheduling
      const allSubjectsWithData = subjects.map((s) => {
        const data = masteryData[s.key] || {};
        return {
          ...s,
          lastSeenAt: data.lastSeenAt,
          interval: data.intervalDays || 1,
        };
      });

      let dayIndex = 1;
      for (const subject of allSubjectsWithData) {
        if (dayIndex >= 7) break;
        if (
          schedule['Sunday'].plannedSubjects.some(
            (ps) => ps.subjectKey === subject.key,
          )
        ) {
          continue;
        }

        const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIndex - 1];
        schedule[dayName].plannedSubjects.push({
          subjectKey: subject.key,
          label: subject.label,
          time: ageConfig.timeBlock,
          icon: subject.icon,
        });
        dayIndex += 1;
      }
    }

    return schedule;
  }, [todaysPlan, subjects, masteryData, ageConfig.timeBlock]);

  /**
   * Calculate exam countdown and progress
   */
  const examCountdown = useMemo(() => {
    if (!examTarget) return null;

    const today = new Date();
    const examDate = new Date(examTarget.targetDate);
    const daysUntilExam = Math.ceil(
      (examDate - today) / (1000 * 60 * 60 * 24),
    );

    // Check if on track: have reviewed critical subjects recently
    const examConfig = EXAM_CONFIG[examTarget.type] || {};
    const criticalSubjects = examConfig.critical || [];

    let reviewedCritical = 0;
    for (const subjectKey of criticalSubjects) {
      const data = masteryData[subjectKey] || {};
      const lastSeen = data.lastSeenAt
        ? new Date(data.lastSeenAt)
        : new Date(0);
      const daysSinceReview = Math.floor(
        (today - lastSeen) / (1000 * 60 * 60 * 24),
      );

      // On track if reviewed within last 7 days
      if (daysSinceReview <= 7) {
        reviewedCritical += 1;
      }
    }

    const isOnTrack = reviewedCritical >= criticalSubjects.length * 0.66;
    const recommendedDailyIncrease = isOnTrack
      ? 0
      : Math.max(5, Math.ceil((15 - dailyGoal) / Math.max(daysUntilExam, 1)));

    return {
      daysUntilExam,
      isOnTrack,
      recommendedDailyIncrease,
      examType: examTarget.type,
    };
  }, [examTarget, masteryData, dailyGoal]);

  /**
   * Calculate streak status
   */
  const streakStatus = useMemo(() => {
    let milestone = null;
    if (streak > 0 && streak % 100 === 0) {
      milestone = { days: 100, text: '🌟 Century! Amazing dedication!' };
    } else if (streak > 0 && streak % 60 === 0) {
      milestone = { days: 60, text: '🏆 Two months of excellence!' };
    } else if (streak > 0 && streak % 30 === 0) {
      milestone = { days: 30, text: '⭐ One month strong!' };
    } else if (streak > 0 && streak % 14 === 0) {
      milestone = { days: 14, text: '💪 Two weeks in!' };
    } else if (streak > 0 && streak % 7 === 0) {
      milestone = { days: 7, text: '🔥 One week streak!' };
    }

    const isAtRisk = streak > 0 && todaysPlan.sessions.length === 0;

    return {
      milestone,
      isAtRisk,
    };
  }, [streak, todaysPlan.sessions.length]);

  /**
   * Handler for completing a session
   */
  const handleSessionComplete = useCallback(
    (sessionId) => {
      setCompletedSessions((prev) =>
        prev.includes(sessionId)
          ? prev.filter((id) => id !== sessionId)
          : [...prev, sessionId],
      );
    },
    [],
  );

  /**
   * Handler for starting a session
   */
  const handleStartSession = useCallback(
    (subjectKey) => {
      onStartSession(subjectKey);
    },
    [onStartSession],
  );

  // Determine if we have any mastery data
  const hasMasteryData = Object.keys(masteryData).length > 0;

  return (
    <div className="space-y-6 bg-slate-900 text-slate-100 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Today&apos;s Study Plan
          </h2>
          <p className="text-slate-400 text-sm">
            Personalized for {scholarName}
          </p>
        </div>

        {/* Streak Display */}
        {streak > 0 && (
          <div className="flex items-center gap-2 bg-orange-900/30 border border-orange-700/50 rounded-lg px-4 py-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-bold text-orange-300">{streak} day streak</span>
          </div>
        )}
      </div>

      {/* Streak Milestone Alert */}
      {streakStatus.milestone && (
        <div className="bg-purple-900/40 border border-purple-600/50 rounded-lg p-4 flex items-start gap-3">
          <span className="text-2xl">{streakStatus.milestone.text.split(' ')[0]}</span>
          <p className="text-purple-200 text-sm">
            {streakStatus.milestone.text}
          </p>
        </div>
      )}

      {/* At-Risk Alert */}
      {streakStatus.isAtRisk && (
        <div className="bg-amber-900/40 border border-amber-600/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-200">Study today to keep your streak!</p>
            <p className="text-amber-200/70 text-sm">
              Start a session to maintain your {streak} day streak.
            </p>
          </div>
        </div>
      )}

      {/* Exam Countdown (if applicable) */}
      {examCountdown && (
        <div className={`rounded-lg p-4 border flex items-start gap-3 ${
          examCountdown.isOnTrack
            ? 'bg-green-900/30 border-green-600/50'
            : 'bg-red-900/30 border-red-600/50'
        }`}>
          <Target className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            examCountdown.isOnTrack ? 'text-green-400' : 'text-red-400'
          }`} />
          <div className="flex-1">
            <p className={`font-semibold ${
              examCountdown.isOnTrack ? 'text-green-200' : 'text-red-200'
            }`}>
              {examCountdown.daysUntilExam} days until {examCountdown.examType.toUpperCase()}
            </p>
            <p className={`text-sm ${
              examCountdown.isOnTrack
                ? 'text-green-200/70'
                : 'text-red-200/70'
            }`}>
              {examCountdown.isOnTrack ? (
                <>You&apos;re on track! Keep up the momentum.</>
              ) : (
                <>Behind schedule. Consider adding {examCountdown.recommendedDailyIncrease}+ minutes daily.</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Today's Sessions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Today's Sessions
          </h3>
          <span className="text-sm text-slate-400">
            {todaysPlan.totalMinutes} / {dailyGoal} min
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{
              width: `${Math.min(100, (todaysPlan.totalMinutes / dailyGoal) * 100)}%`,
            }}
          />
        </div>

        {/* Sessions List */}
        {todaysPlan.sessions.length > 0 ? (
          <div className="space-y-2">
            {todaysPlan.sessions.map((session) => {
              const isCompleted = completedSessions.includes(session.id);
              return (
                <div
                  key={session.id}
                  className={`rounded-lg border p-4 transition-all duration-200 ${
                    isCompleted
                      ? 'bg-slate-800/50 border-slate-700/50'
                      : 'bg-slate-800 border-slate-700 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => handleSessionComplete(session.id)}
                          className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
                          aria-label={`Mark ${session.subjectLabel} session as complete`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-slate-600 rounded-full" />
                          )}
                        </button>
                        <h4 className={`font-semibold ${
                          isCompleted ? 'text-slate-400 line-through' : 'text-white'
                        }`}>
                          {session.subjectLabel}
                        </h4>
                      </div>
                      <p className="text-sm text-slate-400 ml-7">
                        <span className="mr-2">{session.reasonEmoji}</span>
                        {session.reason}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-medium text-indigo-300 bg-indigo-900/30 px-3 py-1 rounded-full">
                        {session.timeInMinutes} min
                      </span>
                      <button
                        onClick={() => handleStartSession(session.subjectKey)}
                        className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        aria-label={`Start ${session.subjectLabel} session`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : hasMasteryData ? (
          <div className="rounded-lg bg-slate-800 border border-slate-700 p-4 text-center">
            <p className="text-slate-300">
              {todaysPlan.message || 'All caught up! Review to strengthen your knowledge.'}
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-slate-800 border border-slate-700 p-6 text-center">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-medium mb-2">
              Welcome! Start your first study session.
            </p>
            <p className="text-slate-400 text-sm">
              Once you complete some study sessions, your personalized plan will appear here.
            </p>
          </div>
        )}
      </div>

      {/* Weekly Overview */}
      <div className="space-y-3 pt-4 border-t border-slate-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          This Week
        </h3>

        <div className="overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-min">
            {Object.values(weekSchedule).map((day) => (
              <div
                key={day.date}
                className={`flex-shrink-0 w-24 rounded-lg border p-3 transition-all duration-200 ${
                  day.isToday
                    ? 'bg-indigo-900/40 border-indigo-500/60'
                    : 'bg-slate-800 border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm text-white">
                    {day.dayName.slice(0, 3)}
                  </p>
                  {day.isToday && (
                    <span className="text-xs bg-indigo-500 text-white px-2 py-1 rounded font-medium">
                      Now
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {day.plannedSubjects.length > 0 ? (
                    day.plannedSubjects.map((subject, idx) => (
                      <div
                        key={`${day.date}-${idx}`}
                        className="text-xs bg-slate-700/50 rounded px-2 py-1 text-slate-200 truncate"
                        title={subject.label}
                      >
                        {subject.label.slice(0, 8)}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">Rest day</p>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-2">
                  {day.plannedSubjects.reduce((sum, s) => sum + (s.time || 0), 0)} min
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Tip */}
      <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-3">
        <p className="text-xs text-slate-400 flex items-start gap-2">
          <Zap className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-400" />
          <span>
            <strong>Pro tip:</strong> Consistent daily study beats cramming. Your plan adapts as you learn!
          </span>
        </p>
      </div>
    </div>
  );
}
