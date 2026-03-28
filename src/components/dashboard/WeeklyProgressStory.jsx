'use client';

import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, Flame, Zap } from 'lucide-react';

/**
 * WeeklyProgressStory Component
 * Narrates the scholar's weekly learning journey with age-appropriate storytelling,
 * visual timeline, achievement badges, and motivational CTAs.
 */
export default function WeeklyProgressStory({
  scholarName = 'Scholar',
  weeklyStats = {},
  subjectBreakdown = [],
  previousWeekStats = {},
  currentRealm = null,
  ageBand = 'ks2',
}) {
  // Extract stats with defaults
  const stats = useMemo(() => ({
    questionsAnswered: weeklyStats.questionsAnswered || 0,
    correctAnswers: weeklyStats.correctAnswers || 0,
    subjectsStudied: weeklyStats.subjectsStudied || 0,
    streakDays: weeklyStats.streakDays || 0,
    xpEarned: weeklyStats.xpEarned || 0,
    topicsCompleted: weeklyStats.topicsCompleted || 0,
    newBadges: weeklyStats.newBadges || [],
    dailyActivity: weeklyStats.dailyActivity || [], // Array of 7 days with stats
  }), [weeklyStats]);

  const prevStats = useMemo(() => ({
    questionsAnswered: previousWeekStats.questionsAnswered || 0,
    correctAnswers: previousWeekStats.correctAnswers || 0,
    xpEarned: previousWeekStats.xpEarned || 0,
  }), [previousWeekStats]);

  // Calculate accuracy percentage
  const accuracy = stats.questionsAnswered > 0
    ? Math.round((stats.correctAnswers / stats.questionsAnswered) * 100)
    : 0;

  // Compare week-over-week
  const questionDelta = stats.questionsAnswered - prevStats.questionsAnswered;
  const xpDelta = stats.xpEarned - prevStats.xpEarned;

  // Find best and most improved subjects
  const bestSubject = subjectBreakdown.length > 0
    ? subjectBreakdown.reduce((best, current) =>
        current.accuracyThisWeek > (best.accuracyThisWeek || 0) ? current : best
      )
    : null;

  const mostImproved = subjectBreakdown.length > 0
    ? subjectBreakdown.reduce((best, current) =>
        (current.masteryChange || 0) > (best.masteryChange || 0) ? current : best
      )
    : null;

  // Get realm metaphor
  const realmName = currentRealm?.name || 'the Learning Realm';
  const realmChapter = currentRealm?.chapter || null;

  // Generate narrative based on age band
  const narrative = useMemo(() => {
    const narrativeTemplates = {
      ks1: {
        intro: `🎉 What an adventure, ${scholarName}! This week, you were absolutely amazing!`,
        body: `You answered ${stats.questionsAnswered} questions across ${stats.subjectsStudied} different subjects, and you got ${accuracy}% right! That's brilliant! 🌟 `,
        realm: realmChapter
          ? `You journeyed through ${realmName} and reached Chapter ${realmChapter}. What an explorer you are! 🗺️`
          : `You explored ${realmName} and made it your own! 🎪`,
        comparison: questionDelta > 0
          ? `You practiced ${Math.abs(questionDelta)} more questions than last week! That's dedication! 💪`
          : questionDelta < 0
          ? `Let's practice a bit more this week to beat last week! You've got this! 📚`
          : `You're keeping up the great pace! Keep it going! ⚡`,
        streak: stats.streakDays > 0
          ? `You've practiced for ${stats.streakDays} days in a row! That's incredible! 🔥`
          : `Ready to start a new streak this week? You can do it! 🚀`,
      },
      ks2: {
        intro: `This week, ${scholarName}, you embarked on a remarkable quest through the learning realms.`,
        body: `You conquered ${stats.questionsAnswered} questions across ${stats.subjectsStudied} domains with a commanding ${accuracy}% accuracy. ⚔️ `,
        realm: realmChapter
          ? `Your journey took you deeper into the ${realmName}, pushing you to Chapter ${realmChapter}. You're progressing well!`
          : `You ventured boldly into the ${realmName}, proving your courage and curiosity.`,
        comparison: questionDelta > 0
          ? `That's ${Math.abs(questionDelta)} more questions than last week—your momentum is building! 🌊`
          : questionDelta < 0
          ? `You explored less this week. Next week, aim to reclaim your stride! 🎯`
          : `You've matched last week's pace—consistency is the key to mastery!`,
        streak: stats.streakDays > 0
          ? `You've maintained a ${stats.streakDays}-day practice streak! The habit is forming! 🔥`
          : `This is the perfect moment to ignite a new learning streak!`,
      },
      ks3: {
        intro: `${scholarName}, your weekly learning metrics show impressive focus and dedication.`,
        body: `You tackled ${stats.questionsAnswered} questions across ${stats.subjectsStudied} subjects, maintaining an ${accuracy}% success rate. 📊 `,
        realm: realmChapter
          ? `In the ${realmName}, you've progressed to Chapter ${realmChapter}, demonstrating clear advancement in your learning pathway.`
          : `Your exploration of the ${realmName} reflects your commitment to mastering diverse domains.`,
        comparison: questionDelta > 0
          ? `Week-on-week growth: +${Math.abs(questionDelta)} questions. This trajectory is excellent. 📈`
          : questionDelta < 0
          ? `Last week's volume was higher. Identify any barriers to practice and address them strategically. 🎯`
          : `Consistent engagement across weeks—this stability shows professional discipline.`,
        streak: stats.streakDays > 0
          ? `Your ${stats.streakDays}-day streak reflects the habit-building essential for exam success. Maintain it! 🔥`
          : `Build a consistent daily practice habit. Even 15 minutes daily compounds significantly.`,
      },
      ks4: {
        intro: `${scholarName}, your weekly performance analysis indicates strategic progress toward your academic targets.`,
        body: `You completed ${stats.questionsAnswered} questions across ${stats.subjectsStudied} domains with ${accuracy}% accuracy. ✓ `,
        realm: realmChapter
          ? `Your progression in the ${realmName} (Chapter ${realmChapter}) aligns with exam specification coverage and demonstrates disciplined preparation.`
          : `Your engagement with the ${realmName} addresses key examination content areas effectively.`,
        comparison: questionDelta > 0
          ? `Volume increase: +${Math.abs(questionDelta)} questions (+${Math.round((questionDelta / prevStats.questionsAnswered) * 100)}%). This escalation supports exam readiness. 📈`
          : questionDelta < 0
          ? `Volume decreased by ${Math.abs(questionDelta)} questions. Ensure weekly minimums align with your revision timeline. 🎯`
          : `Maintained consistent weekly volume—optimal for sustained learning consolidation.`,
        streak: stats.streakDays > 0
          ? `${stats.streakDays}-day engagement streak. Consistency compounds understanding exponentially in exam preparation. 🔥`
          : `Establish daily practice as non-negotiable. Distributed practice optimizes long-term retention.',
      },
    };

    const template = narrativeTemplates[ageBand] || narrativeTemplates.ks2;
    return Object.keys(template).reduce((acc, key) => {
      acc[key] = template[key];
      return acc;
    }, {});
  }, [scholarName, stats, accuracy, questionDelta, realmName, realmChapter, ageBand, prevStats.questionsAnswered]);

  // Generate CTA based on context
  const cta = useMemo(() => {
    if (stats.streakDays > 0 && stats.streakDays % 7 === 0) {
      const emojis = ['🔥', '⚡', '💪', '🚀'];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      return {
        text: `Keep your ${stats.streakDays}-day streak alive! One more day ${emoji}`,
        icon: Flame,
        color: 'text-orange-400',
      };
    }
    if (accuracy < 70 && mostImproved) {
      return {
        text: `Let's strengthen ${mostImproved.label}—we believe in you! 💡`,
        icon: Zap,
        color: 'text-yellow-400',
      };
    }
    if (questionDelta > 10 || xpDelta > 200) {
      return {
        text: `Amazing momentum! Ready for a boss challenge? 💪`,
        icon: TrendingUp,
        color: 'text-green-400',
      };
    }
    return {
      text: `Keep exploring the realms! You're doing great 🌟`,
      icon: Sparkles,
      color: 'text-indigo-400',
    };
  }, [stats.streakDays, accuracy, mostImproved, questionDelta, xpDelta]);

  const CTAIcon = cta.icon;

  // Subject icon mapping (realm-based)
  const subjectIcons = {
    maths: '🔢',
    english: '📖',
    'verbal-reasoning': '💭',
    'non-verbal-reasoning': '🧩',
    science: '🔬',
    history: '📜',
    geography: '🗺️',
    computing: '💻',
  };

  // Daily activity color coding
  const getDayColor = (dayIndex) => {
    if (!stats.dailyActivity || stats.dailyActivity.length === 0) {
      return 'bg-slate-700'; // Default neutral
    }
    const dayData = stats.dailyActivity[dayIndex];
    if (!dayData || dayData.questionsAnswered === 0) {
      return 'bg-slate-700/50'; // Missed day
    }
    if ((dayData.correctAnswers / dayData.questionsAnswered) >= 0.8) {
      return 'bg-green-600'; // Excellent
    }
    if ((dayData.correctAnswers / dayData.questionsAnswered) >= 0.6) {
      return 'bg-blue-600'; // Good
    }
    return 'bg-yellow-600'; // Room for improvement
  };

  // Get day labels
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Main Story Card */}
      <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-xl border border-slate-700/50 p-6 md:p-8 shadow-2xl overflow-hidden mb-6">
        {/* Gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-indigo-600/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Decorative background elements */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10">
          {/* Story Title */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg md:text-xl font-bold text-indigo-300">
              Your Weekly Learning Story
            </h2>
          </div>

          {/* Main Narrative - with typing animation effect */}
          <div className="space-y-4">
            {/* Intro */}
            <p className="text-lg md:text-xl font-semibold text-white leading-relaxed animate-pulse-slow">
              {narrative.intro}
            </p>

            {/* Body with stats */}
            <p className="text-base md:text-lg text-slate-200 leading-relaxed">
              {narrative.body}
              {bestSubject && (
                <span className="text-indigo-300 font-semibold">
                  Your strongest area was <span className="text-indigo-200">{bestSubject.label}</span> at {bestSubject.accuracyThisWeek}%.{' '}
                </span>
              )}
              {mostImproved && (
                <span className="text-green-300">
                  And {mostImproved.label} showed the most growth! 📈
                </span>
              )}
            </p>

            {/* Realm narrative */}
            <p className="text-base md:text-lg text-slate-200 leading-relaxed italic text-indigo-200">
              {narrative.realm}
            </p>

            {/* Comparison */}
            <p className="text-base md:text-lg text-slate-300 leading-relaxed">
              {narrative.comparison}
            </p>

            {/* Streak */}
            <p className="text-base md:text-lg text-slate-300 leading-relaxed">
              {narrative.streak}
            </p>

            {/* XP earned highlight */}
            {stats.xpEarned > 0 && (
              <div className="mt-4 p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-lg">
                <p className="text-indigo-200 font-semibold">
                  ⚡ You earned <span className="text-indigo-300 text-lg">{stats.xpEarned}</span> XP this week!
                  {xpDelta > 0 && (
                    <span className="text-green-400 ml-2">+{xpDelta} vs last week</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Activity Timeline */}
      {stats.dailyActivity && stats.dailyActivity.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/30 p-6 mb-6">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-400 rounded-full" />
            Daily Activity This Week
          </h3>

          <div className="flex gap-3 justify-between md:justify-start overflow-x-auto pb-2">
            {dayLabels.map((day, index) => {
              const dayData = stats.dailyActivity[index];
              const isPracticed = dayData && dayData.questionsAnswered > 0;
              const dayAccuracy = isPracticed
                ? Math.round((dayData.correctAnswers / dayData.questionsAnswered) * 100)
                : 0;

              return (
                <div
                  key={day}
                  className="flex flex-col items-center gap-2 group cursor-pointer flex-shrink-0"
                  title={isPracticed ? `${day}: ${dayData.questionsAnswered} questions, ${dayAccuracy}% accuracy` : `${day}: No practice`}
                >
                  {/* Day circle */}
                  <div className={`relative w-10 h-10 rounded-full ${getDayColor(index)} flex items-center justify-center font-bold text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-indigo-500/50`}>
                    {isPracticed ? (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-400/0 group-hover:border-indigo-400/50 transition-all" />
                      </>
                    ) : (
                      <span className="text-xs opacity-50">—</span>
                    )}
                  </div>

                  {/* Day label */}
                  <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
                    {day}
                  </span>

                  {/* Tooltip on hover */}
                  {isPracticed && (
                    <div className="absolute bottom-full mb-2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                      {dayData.questionsAnswered} Q • {dayAccuracy}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Activity legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 rounded-full" />
              <span>Excellent (80%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full" />
              <span>Good (60-79%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-600 rounded-full" />
              <span>Improving (Below 60%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-700/50 rounded-full" />
              <span>Missed day</span>
            </div>
          </div>
        </div>
      )}

      {/* Subject Breakdown Cards */}
      {subjectBreakdown && subjectBreakdown.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {subjectBreakdown.slice(0, 4).map((subject, index) => (
            <div
              key={subject.key || index}
              className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-4 hover:border-slate-600/50 transition-all duration-300"
            >
              {/* Subject icon and name */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">
                  {subjectIcons[subject.key] || '📚'}
                </span>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-100">{subject.label}</h4>
                  <p className="text-xs text-slate-400">
                    {subject.questionsThisWeek} questions this week
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Accuracy</span>
                  <span className="font-semibold text-indigo-300">
                    {subject.accuracyThisWeek}%
                  </span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(subject.accuracyThisWeek || 0, 100)}%` }}
                  />
                </div>
              </div>

              {/* Mastery change */}
              {subject.masteryChange !== undefined && (
                <div className="mt-3 pt-3 border-t border-slate-700/30">
                  <p className={`text-sm font-semibold flex items-center gap-1 ${
                    subject.masteryChange > 0
                      ? 'text-green-400'
                      : subject.masteryChange < 0
                      ? 'text-orange-400'
                      : 'text-slate-400'
                  }`}>
                    {subject.masteryChange > 0 ? '📈' : subject.masteryChange < 0 ? '📉' : '→'}
                    {subject.masteryChange > 0 ? '+' : ''}{subject.masteryChange}% mastery
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Badges Section */}
      {stats.newBadges && stats.newBadges.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/30 p-6 mb-6">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            New Achievements Unlocked
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {stats.newBadges.map((badge, index) => (
              <div
                key={badge.id || index}
                className="relative group"
              >
                {/* Badge card with celebration animation */}
                <div className="relative bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-lg p-4 text-center hover:border-yellow-400/50 transition-all duration-300 animate-bounce-gentle"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Badge icon */}
                  <div className="text-3xl mb-2 animate-spin-slow" style={{ animationDelay: `${index * 150}ms` }}>
                    {badge.icon || '🏆'}
                  </div>

                  {/* Badge name */}
                  <p className="text-xs font-semibold text-slate-100 line-clamp-2">
                    {badge.name}
                  </p>

                  {/* Unlock tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    {badge.description || 'Achievement unlocked!'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Motivational CTA */}
      <div className="bg-gradient-to-r from-indigo-600/30 via-purple-600/30 to-indigo-600/30 border border-indigo-500/30 rounded-xl p-6 backdrop-blur-sm">
        <button
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/50"
          onClick={() => {
            // This would typically navigate to practice/learning interface
            console.log('CTA clicked - navigate to practice');
          }}
          aria-label="Start learning"
        >
          <CTAIcon className="w-5 h-5" />
          <span>{cta.text}</span>
        </button>

        {/* Additional context */}
        <p className="text-center text-slate-400 text-sm mt-3">
          {stats.streakDays > 1
            ? `You've got a ${stats.streakDays}-day streak going—don't break it!`
            : stats.topicsCompleted > 0
            ? `You've completed ${stats.topicsCompleted} topics this week. Amazing!`
            : `Every question you practice builds your mastery. Let's go!`}
        </p>
      </div>

      {/* Styles for animations */}
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        @keyframes bounce-gentle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .animate-bounce-gentle {
          animation: bounce-gentle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        /* Scrollbar styling for timeline */
        .overflow-x-auto::-webkit-scrollbar {
          height: 4px;
        }

        .overflow-x-auto::-webkit-scrollbar-track {
          background: transparent;
        }

        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.5);
          border-radius: 2px;
        }

        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.7);
        }
      `}</style>
    </div>
  );
}
