"use client";
/**
 * DashboardRouter.jsx
 *
 * Routes to the correct KS-specific dashboard based on the scholar's age band.
 * Each KS dashboard uses DashboardShell for layout and receives data props
 * from useDashboardData via the student page.
 *
 * This replaces AdaptiveDashboardLayout for the "redesigned" dashboard mode,
 * while keeping the old layout available as a fallback.
 */

import { useMemo } from "react";
import { getAgeBand } from "@/lib/ageBandConfig";
import DashboardSkeleton from "./DashboardSkeleton";
import KS1Dashboard from "./KS1Dashboard";
import KS2Dashboard from "./KS2Dashboard";
import KS3Dashboard from "./KS3Dashboard";
import KS4Dashboard from "./KS4Dashboard";

export default function DashboardRouter({
  scholar = {},
  adaptiveData = {},
  subjects = [],
  leaderboard = [],
  onStartQuest,
  onTopicClick,
  onStartMock,
  onStartAdventure,
  onStartRevisionTopic,
  onSignOut,
  onAvatar,
  onExamModeSwitch,
  coins = 0,
  todayQCount = 0,
  effectiveTier = "pro",
  earnedBadgeIds = [],
  supabase,
}) {
  const yearLevel = parseInt(scholar?.year_level || scholar?.year || 4, 10);
  const curriculum = scholar?.curriculum || "uk_11plus";
  const band = getAgeBand(yearLevel, curriculum);

  const {
    stats = {},
    topics = [],
    journal = [],
    dailyAdventure,
    encouragement,
    examData,
    masteryData = [],
    recentQuizzes = [],
    mockTests = [],
    revisionSessions = [],
    subjectProficiency = {},
    reviewSchedule = { dueNow: [], upcoming: [] },
    activityCalendar = [],
    loading,
  } = adaptiveData;

  // Compute mastery percent for quick access
  const masteryPercent = stats.masteryPct ?? 0;

  // Format subjects for display
  const subjectList = useMemo(
    () => subjects.map((s) => (typeof s === "string" ? s : s?.slug || s?.name || "mathematics")),
    [subjects]
  );

  // Show skeleton while loading
  if (loading) {
    return <DashboardSkeleton band={band} />;
  }

  // ── Route to the correct KS dashboard ──────────────────────────────
  const commonProps = {
    scholar,
    leaderboard,
    recentQuizzes,
    onSignOut,
  };

  switch (band) {
    case "ks1":
      return (
        <KS1Dashboard
          {...commonProps}
          scholarName={scholar.name || scholar.codename || "Explorer"}
          xp={stats.xp ?? 0}
          streak={stats.streak ?? 0}
          masteryPercent={masteryPercent}
          adventuresCompleted={stats.questsCompleted ?? 0}
          stickersCollected={stats.stickersCollected ?? 0}
          journal={journal}
          dailyAdventure={dailyAdventure}
          encouragement={encouragement}
          topics={topics}
          onStartAdventure={onStartAdventure}
          onTopicClick={onTopicClick}
        />
      );

    case "ks2":
      return (
        <KS2Dashboard
          {...commonProps}
          scholar={scholar}
          subjects={subjectList}
          skillProficiency={subjectProficiency}
          weeklyXp={stats.xp ?? 0}
          streak={stats.streak ?? 0}
          masteryPercent={masteryPercent}
          topicCount={stats.topicCount ?? 0}
          totalTopics={stats.totalTopics ?? topics.length}
          topics={topics}
          coins={coins}
          nextTopic={topics.find((t) => t.status === "current")?.label || null}
          nextTopicReason={topics.find((t) => t.status === "current") ? "Your next challenge awaits!" : null}
          onStartQuest={onStartQuest}
          onTopicClick={onTopicClick}
        />
      );

    case "ks3":
      return (
        <KS3Dashboard
          {...commonProps}
          scholarName={scholar.name || scholar.codename || "Scholar"}
          xp={stats.xp ?? 0}
          streak={stats.streak ?? 0}
          masteryPercent={masteryPercent}
          questsCompleted={stats.questsCompleted ?? 0}
          subjects={subjectList}
          topics={topics}
          weeklyGoals={[]}
          focusSessions={[]}
          onStartQuest={onStartQuest}
          onTopicClick={onTopicClick}
        />
      );

    case "ks4":
      return (
        <KS4Dashboard
          {...commonProps}
          scholarName={scholar.name || scholar.codename || "Scholar"}
          predictedGrade={examData?.predictedGrade ?? stats.predictedGrade ?? "—"}
          examCountdown={
            examData?.daysUntilExam != null
              ? `${examData.daysUntilExam}d`
              : "—"
          }
          masteryPercent={masteryPercent}
          subjects={subjectList}
          topics={topics}
          examData={examData}
          mockTests={mockTests}
          revisionSessions={revisionSessions}
          onStartMock={onStartMock}
          onStartRevisionTopic={onStartRevisionTopic}
          onExamModeSwitch={onExamModeSwitch}
        />
      );

    default:
      // Fallback to KS2 for unknown bands
      return (
        <KS2Dashboard
          {...commonProps}
          scholar={scholar}
          subjects={subjectList}
          skillProficiency={subjectProficiency}
          weeklyXp={stats.xp ?? 0}
          streak={stats.streak ?? 0}
          masteryPercent={masteryPercent}
          topicCount={stats.topicCount ?? 0}
          totalTopics={stats.totalTopics ?? topics.length}
          topics={topics}
          coins={coins}
          onStartQuest={onStartQuest}
          onTopicClick={onTopicClick}
        />
      );
  }
}
