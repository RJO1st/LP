"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

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

const TrendUpIcon = ({ size = 20 }) => <Icon size={size} d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />;
const TrendDownIcon = ({ size = 20 }) => <Icon size={size} d="M3 22L13 10h-9l1-8L3 14h9l-1 8z" />;
const BookIcon = ({ size = 20 }) => <Icon size={size} d={["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"]} />;
const BarChart3Icon = ({ size = 20 }) => <Icon size={size} d={["M3 3v18h18", "M18 17V9M13 17v-4M8 17v-8"]} />;
const CheckCircleIcon = ({ size = 20 }) => <Icon size={size} d={["M22 11.08V12a10 10 0 1 1-5.93-9.14", "M22 4l-7.07 7.07-3-3"]} />;
const AlertCircleIcon = ({ size = 20 }) => <Icon size={size} d={["M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2zm0-4h-2V7h2z"]} />;
const CalendarIcon = ({ size = 20 }) => <Icon size={size} d={["M8 2v4", "M16 2v4", "M3 4h18v18H3z", "M3 10h18"]} />;
const TargetIcon = ({ size = 20 }) => <Icon size={size} d={["M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-12c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"]} />;
const ChevronRightIcon = ({ size = 20 }) => <Icon size={size} d="m9 18 6-6-6-6" />;

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const formatTime = (minutes) => {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const getWeekDates = () => {
  const today = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push({
      date: date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
      fullDate: date.toISOString().split("T")[0],
    });
  }
  return days;
};

// ═══════════════════════════════════════════════════════════════════
// INSIGHT CARD COMPONENTS
// ═══════════════════════════════════════════════════════════════════

const CardContainer = ({ children, className = "" }) => (
  <div
    className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow ${className}`}
  >
    {children}
  </div>
);

const CardHeader = ({ icon: Icon, title, metric }) => (
  <div className="flex items-start justify-between mb-4">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-slate-900">{metric}</p>
      </div>
    </div>
  </div>
);

// ───────────────────────────────────────────────────────────────────
// Card 1: Weekly Activity Summary
// ───────────────────────────────────────────────────────────────────

const WeeklyActivityCard = ({
  scholarName,
  weeklyStats,
  previousWeekStats,
  onViewFullReport,
}) => {
  const questionsChange = calculatePercentageChange(
    weeklyStats.questionsAnswered || 0,
    previousWeekStats.questionsAnswered || 0
  );
  const accuracyThisWeek = weeklyStats.questionsAnswered
    ? Math.round((weeklyStats.correctAnswers / weeklyStats.questionsAnswered) * 100)
    : 0;
  const accuracyLastWeek = previousWeekStats.questionsAnswered
    ? Math.round(
        (previousWeekStats.correctAnswers / previousWeekStats.questionsAnswered) * 100
      )
    : 0;

  const chartData = [
    {
      metric: "Questions",
      thisWeek: weeklyStats.questionsAnswered || 0,
      lastWeek: previousWeekStats.questionsAnswered || 0,
    },
    {
      metric: "Accuracy",
      thisWeek: accuracyThisWeek,
      lastWeek: accuracyLastWeek,
    },
    {
      metric: "Time (min)",
      thisWeek: Math.round(weeklyStats.timeSpentMinutes || 0),
      lastWeek: Math.round(previousWeekStats.timeSpentMinutes || 0),
    },
  ];

  return (
    <CardContainer>
      <CardHeader
        icon={BarChart3Icon}
        title="Weekly Activity"
        metric={`${weeklyStats.questionsAnswered || 0} Q`}
      />
      <p className="text-sm text-slate-600 mb-4">
        {scholarName} answered {weeklyStats.questionsAnswered || 0} questions with{" "}
        <span className="font-bold text-emerald-600">{accuracyThisWeek}% accuracy</span> — that's{" "}
        <span
          className={questionsChange >= 0 ? "font-bold text-emerald-600" : "font-bold text-rose-600"}
        >
          {questionsChange >= 0 ? "+" : ""}
          {questionsChange}%
        </span>{" "}
        compared to last week.
      </p>
      <div className="h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="thisWeek" fill="#10b981" name="This Week" radius={[8, 8, 0, 0]} />
            <Bar dataKey="lastWeek" fill="#cbd5e1" name="Last Week" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {onViewFullReport && (
        <button
          onClick={onViewFullReport}
          className="w-full py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          View Full Report
          <ChevronRightIcon size={16} />
        </button>
      )}
    </CardContainer>
  );
};

// ───────────────────────────────────────────────────────────────────
// Card 2: Strongest Subject
// ───────────────────────────────────────────────────────────────────

const StrongestSubjectCard = ({ subjects, masteryData, onViewSubjectDetail }) => {
  const strongest = useMemo(() => {
    if (!subjects || subjects.length === 0) return null;
    return subjects
      .map((s) => ({
        ...s,
        score: masteryData[s.key]?.compositeScore || 0,
        trend: masteryData[s.key]?.trend || 0,
      }))
      .sort((a, b) => b.score - a.score)[0];
  }, [subjects, masteryData]);

  if (!strongest) {
    return null;
  }

  const isImproving = strongest.trend > 0;

  return (
    <CardContainer>
      <CardHeader
        icon={BookIcon}
        title="Strongest Subject"
        metric={`${Math.round(strongest.score)}%`}
      />
      <p className="text-sm text-slate-600 mb-4">
        {strongest.label} is your child's strength at{" "}
        <span className="font-bold text-emerald-600">{Math.round(strongest.score)}% mastery</span>.
      </p>

      <div className="flex items-center gap-4 mb-4">
        <div className="w-24 h-24">
          <ResponsiveContainer width={96} height={96}>
            <PieChart>
              <Pie
                data={[
                  { value: strongest.score, fill: "#10b981" },
                  { value: 100 - strongest.score, fill: "#e5e7eb" },
                ]}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={48}
                dataKey="value"
                startAngle={90}
                endAngle={450}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-lg font-black text-slate-900">{strongest.label}</p>
            {isImproving && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <TrendUpIcon size={14} />
                Improving
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-3">
            {strongest.trend > 0
              ? `Trending up by ${Math.round(strongest.trend)} points`
              : "Consistent performance"}
          </p>
        </div>
      </div>

      {onViewSubjectDetail && (
        <button
          onClick={() => onViewSubjectDetail(strongest.key)}
          className="w-full py-2 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm rounded-lg transition-colors"
        >
          View Details
        </button>
      )}
    </CardContainer>
  );
};

// ───────────────────────────────────────────────────────────────────
// Card 3: Area for Growth
// ───────────────────────────────────────────────────────────────────

const AreaForGrowthCard = ({ subjects, masteryData, weeklyStats, onViewSubjectDetail }) => {
  const needsAttention = useMemo(() => {
    if (!subjects || subjects.length === 0) return null;

    // Find subject with lowest mastery OR fewest questions answered
    return subjects
      .map((s) => ({
        ...s,
        score: masteryData[s.key]?.compositeScore || 0,
        timesSeen: masteryData[s.key]?.timesSeen || 0,
      }))
      .sort((a, b) => {
        // Prioritize by mastery score, then by times seen
        if (a.score !== b.score) return a.score - b.score;
        return a.timesSeen - b.timesSeen;
      })[0];
  }, [subjects, masteryData]);

  if (!needsAttention) {
    return null;
  }

  const isNeglected = needsAttention.timesSeen < 5;

  return (
    <CardContainer className="border-amber-100 bg-amber-50">
      <CardHeader
        icon={AlertCircleIcon}
        title="Area for Growth"
        metric={`${Math.round(needsAttention.score)}%`}
      />
      <p className="text-sm text-slate-600 mb-4">
        <span className="font-bold text-slate-900">{needsAttention.label}</span> needs more
        attention.{" "}
        {isNeglected ? (
          <>
            Only <span className="font-bold text-amber-600">{needsAttention.timesSeen} practice</span> attempts
            compared to other subjects.
          </>
        ) : (
          <>
            Current mastery is{" "}
            <span className="font-bold text-amber-600">{Math.round(needsAttention.score)}%</span>,
            which is below target.
          </>
        )}
      </p>

      <div className="bg-white rounded-lg p-4 mb-4">
        <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">
          Practice Recommendation
        </p>
        <p className="text-sm text-slate-700">
          Encourage {needsAttention.timesSeen < 5 ? "starting with" : "more"} targeted practice in{" "}
          <span className="font-bold">{needsAttention.label}</span> to build confidence.
        </p>
      </div>

      {onViewSubjectDetail && (
        <button
          onClick={() => onViewSubjectDetail(needsAttention.key)}
          className="w-full py-2 px-4 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-sm rounded-lg transition-colors"
        >
          Start Practice
        </button>
      )}
    </CardContainer>
  );
};

// ───────────────────────────────────────────────────────────────────
// Card 4: Consistency Score
// ───────────────────────────────────────────────────────────────────

const ConsistencyCard = ({ weeklyStats, masteryData }) => {
  const weekDates = getWeekDates();
  const streak = weeklyStats.streakDays || 0;
  const consistencyPercent = Math.round((streak / 7) * 100);

  // Mock calendar data — in a real app, this would come from masteryData.dailyActivity
  const calendarData = weekDates.map((day) => ({
    day: day.date,
    active: Math.random() > 0.3, // Simulated activity
  }));

  return (
    <CardContainer>
      <CardHeader
        icon={CalendarIcon}
        title="Consistency Score"
        metric={`${streak}/7 Days`}
      />
      <p className="text-sm text-slate-600 mb-4">
        Your child practiced{" "}
        <span className="font-bold text-emerald-600">{streak} out of 7 days</span> this week —{" "}
        {streak >= 5 ? (
          <span className="text-emerald-600 font-bold">excellent consistency!</span>
        ) : streak >= 3 ? (
          <span className="text-amber-600 font-bold">good progress, more encouraged.</span>
        ) : (
          <span className="text-rose-600 font-bold">let's build the habit.</span>
        )}
      </p>

      <div className="flex gap-2 mb-4">
        {calendarData.map((day, idx) => (
          <div
            key={idx}
            className={`flex-1 h-12 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
              day.active
                ? "bg-emerald-500 text-white"
                : "bg-slate-100 text-slate-400"
            }`}
            title={day.active ? "Active" : "Rest day"}
          >
            {day.day}
          </div>
        ))}
      </div>

      <div className="bg-slate-50 rounded-lg p-3">
        <p className="text-xs text-slate-500 font-bold mb-2">This Week: {consistencyPercent}%</p>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              consistencyPercent >= 70
                ? "bg-emerald-500"
                : consistencyPercent >= 40
                ? "bg-amber-500"
                : "bg-rose-500"
            }`}
            style={{ width: `${consistencyPercent}%` }}
          />
        </div>
      </div>
    </CardContainer>
  );
};

// ───────────────────────────────────────────────────────────────────
// Card 5: Retention Health
// ───────────────────────────────────────────────────────────────────

const RetentionHealthCard = ({ masteryData, subjects }) => {
  const overdueTopics = useMemo(() => {
    if (!masteryData || Object.keys(masteryData).length === 0) return [];

    return Object.entries(masteryData)
      .filter(([_, data]) => {
        if (!data.lastSeenAt) return false;
        const daysSinceReview = Math.floor(
          (new Date() - new Date(data.lastSeenAt)) / (1000 * 60 * 60 * 24)
        );
        return daysSinceReview > 14; // Overdue after 2 weeks
      })
      .map(([key, data]) => {
        const subject = subjects?.find((s) => s.key === key);
        return {
          key,
          label: subject?.label || key.replace(/_/g, " "),
          daysSinceReview: Math.floor(
            (new Date() - new Date(data.lastSeenAt)) / (1000 * 60 * 60 * 24)
          ),
          compositeScore: data.compositeScore || 0,
        };
      })
      .sort((a, b) => b.daysSinceReview - a.daysSinceReview);
  }, [masteryData, subjects]);

  if (overdueTopics.length === 0) {
    return (
      <CardContainer>
        <CardHeader
          icon={CheckCircleIcon}
          title="Retention Health"
          metric="All Current"
        />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
            <CheckCircleIcon size={24} className="text-emerald-600" />
          </div>
          <p className="text-sm text-slate-600">
            All topics are current — no reviews are overdue.
          </p>
        </div>
      </CardContainer>
    );
  }

  return (
    <CardContainer className="border-rose-100 bg-rose-50">
      <CardHeader
        icon={AlertCircleIcon}
        title="Retention Health"
        metric={`${overdueTopics.length} Overdue`}
      />
      <p className="text-sm text-slate-600 mb-4">
        <span className="font-bold text-rose-600">{overdueTopics.length} topic</span>
        {overdueTopics.length === 1 ? " is" : "s are"} overdue for review and may start
        fading from memory.
      </p>

      <div className="space-y-2 mb-4">
        {overdueTopics.slice(0, 3).map((topic) => (
          <div
            key={topic.key}
            className="flex items-center justify-between bg-white rounded-lg p-3 border border-rose-200"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">{topic.label}</p>
              <p className="text-xs text-slate-500">
                Last reviewed {topic.daysSinceReview} days ago
              </p>
            </div>
            <span className="text-xs font-bold text-rose-600 ml-2 whitespace-nowrap">
              {topic.compositeScore}%
            </span>
          </div>
        ))}
      </div>

      {overdueTopics.length > 3 && (
        <p className="text-xs text-slate-500 text-center pb-2">
          +{overdueTopics.length - 3} more topics overdue
        </p>
      )}
    </CardContainer>
  );
};

// ───────────────────────────────────────────────────────────────────
// Card 6: Exam Readiness (conditional)
// ───────────────────────────────────────────────────────────────────

const ExamReadinessCard = ({ examTarget, masteryData, subjects }) => {
  if (!examTarget) return null;

  const avgMastery = useMemo(() => {
    if (!masteryData || Object.keys(masteryData).length === 0) return 0;
    const scores = Object.values(masteryData).map((d) => d.compositeScore || 0);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [masteryData]);

  const daysUntilExam = Math.floor(
    (new Date(examTarget.targetDate) - new Date()) / (1000 * 60 * 60 * 24)
  );

  const readinessStatus =
    avgMastery >= 70 ? "on track" : avgMastery >= 50 ? "needs focus" : "urgent";
  const statusColor =
    readinessStatus === "on track"
      ? "emerald"
      : readinessStatus === "needs focus"
      ? "amber"
      : "rose";

  return (
    <CardContainer className={`border-${statusColor}-100 bg-${statusColor}-50`}>
      <CardHeader
        icon={TargetIcon}
        title="Exam Readiness"
        metric={`${avgMastery}%`}
      />
      <p className="text-sm text-slate-600 mb-4">
        <span className="font-bold text-slate-900 capitalize">{examTarget.type}</span> readiness
        at <span className={`font-bold text-${statusColor}-600`}>{avgMastery}%</span> — currently{" "}
        <span className={`font-bold text-${statusColor}-600`}>{readinessStatus}</span> with{" "}
        <span className="font-bold text-slate-900">{Math.max(daysUntilExam, 0)} days</span> remaining.
      </p>

      <div className="bg-white rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-slate-600 uppercase">Overall Readiness</p>
          <p className={`text-sm font-black text-${statusColor}-600`}>{avgMastery}%</p>
        </div>
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full bg-${statusColor}-500 transition-all`}
            style={{ width: `${avgMastery}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center">
        Exam date:{" "}
        {new Date(examTarget.targetDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </CardContainer>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function ParentInsightCards({
  scholarName = "Scholar",
  subjects = [],
  masteryData = {},
  weeklyStats = {},
  previousWeekStats = {},
  examTarget = null,
  onViewSubjectDetail,
  onViewFullReport,
}) {
  // Determine which cards to show based on data availability
  const hasWeeklyData = weeklyStats.questionsAnswered > 0;
  const hasSubjects = subjects.length > 0;
  const hasMasteryData = Object.keys(masteryData).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 mb-1">Learning Insights</h2>
        <p className="text-sm text-slate-500">
          Data-driven insights about {scholarName}'s learning progress
        </p>
      </div>

      {/* Empty state */}
      {!hasWeeklyData && !hasMasteryData && (
        <CardContainer className="text-center py-12">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-lg font-black text-slate-700 mb-2">No Data Yet</p>
          <p className="text-sm text-slate-500">
            Insights will appear once {scholarName} completes their first quiz or practice session.
          </p>
        </CardContainer>
      )}

      {/* Cards Grid */}
      {(hasWeeklyData || hasMasteryData) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hasWeeklyData && (
            <WeeklyActivityCard
              scholarName={scholarName}
              weeklyStats={weeklyStats}
              previousWeekStats={previousWeekStats}
              onViewFullReport={onViewFullReport}
            />
          )}

          {hasSubjects && hasMasteryData && (
            <StrongestSubjectCard
              subjects={subjects}
              masteryData={masteryData}
              onViewSubjectDetail={onViewSubjectDetail}
            />
          )}

          {hasSubjects && hasMasteryData && (
            <AreaForGrowthCard
              subjects={subjects}
              masteryData={masteryData}
              weeklyStats={weeklyStats}
              onViewSubjectDetail={onViewSubjectDetail}
            />
          )}

          {hasWeeklyData && (
            <ConsistencyCard
              weeklyStats={weeklyStats}
              masteryData={masteryData}
            />
          )}

          {hasMasteryData && (
            <RetentionHealthCard
              masteryData={masteryData}
              subjects={subjects}
            />
          )}

          {examTarget && (
            <ExamReadinessCard
              examTarget={examTarget}
              masteryData={masteryData}
              subjects={subjects}
            />
          )}
        </div>
      )}
    </div>
  );
}
