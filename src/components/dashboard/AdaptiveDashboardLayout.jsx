"use client";
/**
 * AdaptiveDashboardLayout.jsx (v7)
 * Deploy to: src/components/dashboard/AdaptiveDashboardLayout.jsx
 *
 * v7: Dynamic mastery per active subject. Free tier counter hidden for trial/pro.
 *     Clean 2-column CSS grid via <style> tag. No Tailwind arbitrary values.
 */

import React, { useState, useMemo } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import AdaptiveNavbar from "./AdaptiveNavbar";
import AdaptiveGreeting from "./AdaptiveGreeting";
import AdaptiveStats from "./AdaptiveStats";
import DailyAdventure from "./DailyAdventure";
import TaraEncouragement from "./TaraEncouragement";
import SkillMap from "./SkillMap";
import QuestJournal from "./QuestJournal";
import CareerPopup from "./CareerPopup";
import ExamPanel from "./ExamPanel";
import ExamModeSwitch from "./ExamModeSwitch";
import RevisionPlanner from "./RevisionPlanner";
import PeerComparison from "./PeerComparison";
import MockTestLauncher from "./MockTestLauncher";
import AdaptiveStartButton from "./AdaptiveStartButton";
import AdaptiveLeaderboard from "./AdaptiveLeaderboard";
import DigitalPet from "./DigitalPet";
import GoalSetting from "./GoalSetting";
import DashboardTour from "@/components/DashboardTour";

export default function AdaptiveDashboardLayout({
  scholar = {},
  stats = {},
  topics = [],
  subjects = [],
  subject = "mathematics",
  journalEntries = [],
  dailyAdventure,
  encouragement,
  careerTopic,
  examData,
  masteryData = [],
  peerComparisons = [],
  pastMocks = [],
  leaderboard = [],
  scholarId,
  supabase,
  coins = 0,
  todayQCount = 0,
  effectiveTier = "pro",
  onSignOut,
  onAvatar,
  onStartQuest,
  onTopicClick,
  onDismissEncourage,
  onDismissCareer,
  onStartAdventure,
  onStartMock,
  onExamModeSwitch,
  onStartRevisionTopic,
}) {
  const { band, theme: t } = useTheme();
  const [activeSubject, setActiveSubject] = useState(subject || subjects[0] || "mathematics");

  // ── Dynamic mastery per active subject ──────────────────────────────────
  const subjectMastery = useMemo(() => {
    const subjectRows = masteryData.filter(r =>
      (r.subject || "").toLowerCase() === (activeSubject || "").toLowerCase()
    );
    if (subjectRows.length === 0) {
      return { pct: stats.masteryPct ?? 0, count: stats.topicCount ?? 0 };
    }
    const avg = subjectRows.reduce((sum, r) => sum + (r.mastery_score ?? r.p_know ?? 0), 0) / subjectRows.length;
    return { pct: Math.round(avg * 100), count: subjectRows.length };
  }, [masteryData, activeSubject, stats]);

  // ── Only show free tier counter when actually on free plan ──────────────
  const isFreeTier = effectiveTier === "free";

  return (
    <div style={{
      minHeight: "100vh",
      background: t.colours.bg,
      fontFamily: t.fonts.body,
      color: t.colours.text,
      transition: "background 0.5s",
    }}>
      <DashboardTour type="scholar" userId={scholarId} band={band} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700;800&family=Nunito:wght@600;700;800;900&family=DM+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .lp-grid{display:grid;grid-template-columns:1fr;gap:16px}
        .lp-grid>*{min-width:0;overflow:hidden}
        @media(min-width:768px){.lp-grid{grid-template-columns:3fr 2fr}}
      `}</style>

      <AdaptiveNavbar
        xp={stats.xp ?? 0}
        coins={coins}
        todayQCount={todayQCount}
        effectiveTier={isFreeTier ? "free" : "pro"}
        onAvatar={onAvatar}
        onSignOut={onSignOut}
      />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px 40px" }}>

        <div style={{ marginBottom: 16 }}>
          <AdaptiveGreeting
            scholarName={scholar.name}
            streak={stats.streak ?? 0}
            xp={stats.xp ?? 0}
            yearLevel={scholar.year_level}
            examName={examData?.examName}
            daysUntilExam={examData?.daysUntilExam}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <AdaptiveStats stats={{
            ...stats,
            masteryPct: subjectMastery.pct,
            topicCount: subjectMastery.count,
          }} />
        </div>

        {encouragement && (
          <div style={{ marginBottom: 16 }}>
            <TaraEncouragement
              message={encouragement.text}
              visible={encouragement.visible !== false}
              onDismiss={onDismissEncourage}
            />
          </div>
        )}

        {/* ── MAIN GRID ─────────────────────────────────────────────── */}
        <div className="lp-grid">

          {/* ═══ LEFT COLUMN ═══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            {dailyAdventure && (
              <DailyAdventure
                totalQuestions={dailyAdventure.totalQuestions}
                completed={dailyAdventure.completed}
                subject={activeSubject}
                topic={topics.find(tp => tp.subject === activeSubject && tp.status === "current")?.slug || ""}
                onStart={() => onStartAdventure?.(activeSubject)}
              />
            )}
            {(band === "ks3" || band === "ks4") && (
              <ExamModeSwitch
                currentMode={scholar.exam_mode || "general"}
                curriculum={scholar.curriculum}
                onSwitch={onExamModeSwitch}
              />
            )}
            <SkillMap
              topics={topics}
              subjects={subjects}
              subject={activeSubject}
              onTopicClick={onTopicClick}
              onSubjectChange={setActiveSubject}
            />
            <QuestJournal entries={journalEntries} />
            {masteryData.length > 0 && (band === "ks3" || band === "ks4") && (
              <RevisionPlanner
                masteryData={masteryData}
                examDate={examData?.examDate}
                examName={examData?.examName}
                onStartTopic={onStartRevisionTopic}
              />
            )}
          </div>

          {/* ═══ RIGHT COLUMN ═══ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <DigitalPet totalXp={stats.xp ?? 0} scholarId={scholarId} />
            {examData && (
              <ExamPanel
                predictedGrade={examData.predictedGrade}
                previousGrade={examData.previousGrade}
                examName={examData.examName}
                daysUntilExam={examData.daysUntilExam}
                topicsRemaining={examData.topicsRemaining}
                mocksCompleted={examData.mocksCompleted}
                revisionPlan={examData.revisionPlan ?? []}
              />
            )}
            <AdaptiveLeaderboard entries={leaderboard} currentScholarId={scholarId} />
            {peerComparisons.length > 0 && (
              <PeerComparison comparisons={peerComparisons} />
            )}
            <GoalSetting scholarId={scholarId} stats={stats} />
            {careerTopic && (
              <CareerPopup topic={careerTopic} subject={activeSubject} onDismiss={onDismissCareer} />
            )}
            {(band === "ks3" || band === "ks4") && (
              <MockTestLauncher
                subject={activeSubject?.toLowerCase() || "mathematics"}
                curriculum={scholar.curriculum}
                examMode={scholar.exam_mode || "general"}
                pastMocks={pastMocks}
                onStartMock={onStartMock}
              />
            )}
          </div>

        </div>

        <div style={{ marginTop: 16 }}>
          <AdaptiveStartButton
            onClick={() => onStartQuest?.(activeSubject)}
            subject={activeSubject}
          />
        </div>
      </div>
    </div>
  );
}