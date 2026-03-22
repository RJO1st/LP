"use client";
/**
 * AdaptiveDashboardLayout.jsx (v4)
 * Deploy to: src/components/dashboard/AdaptiveDashboardLayout.jsx
 *
 * v4: Wider max-width. No rainbow emoji. DailyAdventure dynamic by subject.
 *     Active subject state lifted here so DailyAdventure + SkillMap + Start button sync.
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

const SUBJECT_LABELS = {
  mathematics: "Maths", maths: "Maths", english: "English",
  english_studies: "English", science: "Science", basic_science: "Science",
  verbal_reasoning: "Verbal Reasoning", non_verbal_reasoning: "NVR",
  history: "History", geography: "Geography", computing: "Computing",
  physics: "Physics", chemistry: "Chemistry", biology: "Biology",
  religious_studies: "Religious Studies",
religious_education: "Religious Education",
design_and_technology: "Design & Technology",
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

  // Wider layout for better subject tab display
  const maxWidth = band === "ks4" ? 640 : band === "ks3" ? 600 : 580;

  const activeLabel = SUBJECT_LABELS[activeSubject] || activeSubject.replace(/_/g, " ");

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
        maxWidth,
        margin: "0 auto",
        padding: "0 16px 40px",
        display: "flex",
        flexDirection: "column",
        gap: band === "ks1" ? 18 : 14,
      }}>
        <AdaptiveGreeting
          scholarName={scholar.name}
          streak={stats.streak ?? 0}
          xp={stats.xp ?? 0}
          yearLevel={scholar.year_level}
          examName={examData?.examName}
          daysUntilExam={examData?.daysUntilExam}
        />

        <AdaptiveStats stats={stats} />

        {/* Daily Adventure — dynamic by active subject */}
        {dailyAdventure && (
          <DailyAdventure
            totalQuestions={dailyAdventure.totalQuestions}
            completed={dailyAdventure.completed}
            subject={activeSubject}
            topic={topics.find(t => t.subject === activeSubject && t.status === "current")?.slug || ""}
            onStart={() => onStartAdventure?.(activeSubject)}
          />
        )}

        {encouragement && (
          <TaraEncouragement
            message={encouragement.text}
            visible={encouragement.visible !== false}
            onDismiss={onDismissEncourage}
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

        {peerComparisons.length > 0 && <PeerComparison comparisons={peerComparisons} />}

        <QuestJournal entries={journalEntries} />

        {careerTopic && (
          <CareerPopup topic={careerTopic} subject={activeSubject} onDismiss={onDismissCareer} />
        )}

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

        {masteryData.length > 0 && (band === "ks3" || band === "ks4") && (
          <RevisionPlanner
            masteryData={masteryData}
            examDate={examData?.examDate}
            examName={examData?.examName}
            onStartTopic={onStartRevisionTopic}
          />
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

        {/* Start quest button — launches the active subject */}
        <AdaptiveStartButton onClick={() => onStartQuest?.(activeSubject)} />
      </div>
    </div>
  );
}