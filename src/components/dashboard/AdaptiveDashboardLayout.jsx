"use client";
/**
 * AdaptiveDashboardLayout.jsx (v5)
 * Deploy to: src/components/dashboard/AdaptiveDashboardLayout.jsx
 *
 * v5: 2-column grid layout on desktop. Responsive single column on mobile.
 *     Left: greeting, stats, skill map, daily adventure
 *     Right: pet, leaderboard, journal, career/exam, revision, flashcards, mock
 */

import React, { useState } from "react";
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

const SUBJECT_LABELS = {
  mathematics: "Maths", maths: "Maths", english: "English",
  english_studies: "English", science: "Science", basic_science: "Science",
  verbal_reasoning: "Verbal Reasoning", non_verbal_reasoning: "NVR",
  history: "History", geography: "Geography", computing: "Computing",
  physics: "Physics", chemistry: "Chemistry", biology: "Biology",
};

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
  onStartQuest,
  onTopicClick,
  onDismissEncourage,
  onDismissCareer,
  onStartAdventure,
  onStartMock,
  onExamModeSwitch,
  onStartRevisionTopic,
}) {
  const { band, theme: t, isDark } = useTheme();
  const [activeSubject, setActiveSubject] = useState(subject || subjects[0] || "mathematics");

  return (
    <div style={{
      minHeight: "100vh",
      background: t.colours.bg,
      fontFamily: t.fonts.body,
      color: t.colours.text,
      transition: "background 0.5s",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700;800&family=Nunito:wght@600;700;800;900&family=DM+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
      `}</style>

      <AdaptiveNavbar xp={stats.xp ?? 0} />

      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "0 16px 40px",
      }}>
        {/* ── TOP: Greeting + Stats (full width) ────────────────────── */}
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
          <AdaptiveStats stats={stats} />
        </div>

        {/* ── Tara encouragement (full width) ────────────────────────── */}
        {encouragement && (
          <div style={{ marginBottom: 16 }}>
            <TaraEncouragement
              message={encouragement.text}
              visible={encouragement.visible !== false}
              onDismiss={onDismissEncourage}
            />
          </div>
        )}

        {/* ── MAIN GRID: 2 columns on desktop ────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
        }}>
          {/* Desktop: 2-column layout */}
          <style>{`
            @media (min-width: 768px) {
              .lp-dash-grid { grid-template-columns: 3fr 2fr !important; }
            }
          `}</style>
          <div className="lp-dash-grid" style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 16,
          }}>

            {/* ═══ LEFT COLUMN ═══════════════════════════════════════ */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Daily Adventure — KS1 */}
              {dailyAdventure && (
                <DailyAdventure
                  totalQuestions={dailyAdventure.totalQuestions}
                  completed={dailyAdventure.completed}
                  subject={activeSubject}
                  topic={topics.find(t => t.subject === activeSubject && t.status === "current")?.slug || ""}
                  onStart={() => onStartAdventure?.(activeSubject)}
                />
              )}

              {/* Exam mode switch — KS3/KS4 */}
              {(band === "ks3" || band === "ks4") && (
                <ExamModeSwitch
                  currentMode={scholar.exam_mode || "general"}
                  curriculum={scholar.curriculum}
                  onSwitch={onExamModeSwitch}
                />
              )}

              {/* Skill Map with subject tabs */}
              <SkillMap
                topics={topics}
                subjects={subjects}
                subject={activeSubject}
                onTopicClick={onTopicClick}
                onSubjectChange={setActiveSubject}
              />

              {/* Quest Journal — KS1+KS2 */}
              <QuestJournal entries={journalEntries} />

              {/* Revision Planner — KS3/KS4 */}
              {masteryData.length > 0 && (band === "ks3" || band === "ks4") && (
                <RevisionPlanner
                  masteryData={masteryData}
                  examDate={examData?.examDate}
                  examName={examData?.examName}
                  onStartTopic={onStartRevisionTopic}
                />
              )}
            </div>

            {/* ═══ RIGHT COLUMN ══════════════════════════════════════ */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Digital Pet — KS1/KS2 */}
              <DigitalPet totalXp={stats.xp ?? 0} scholarId={scholarId} />

              {/* Exam Panel — KS4 */}
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

              {/* Leaderboard */}
              <AdaptiveLeaderboard entries={leaderboard} currentScholarId={scholarId} />

              {/* Peer Comparison — KS3/KS4 */}
              {peerComparisons.length > 0 && (
                <PeerComparison comparisons={peerComparisons} />
              )}

              {/* Goal Setting — KS3 */}
              <GoalSetting scholarId={scholarId} stats={stats} />

              {/* Career Popup — KS2/KS3 */}
              {careerTopic && (
                <CareerPopup topic={careerTopic} subject={activeSubject} onDismiss={onDismissCareer} />
              )}

              {/* Mock Test Launcher — KS3/KS4 */}
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
        </div>

        {/* ── START QUEST CTA (full width) ───────────────────────────── */}
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