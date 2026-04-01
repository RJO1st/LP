"use client";
/**
 * useDashboardData.js (v7)
 * Deploy to: src/hooks/useDashboardData.js
 *
 * v7 changes:
 *   - Integrated with analyticsService.js for cached, centralised queries
 *   - Safe exam date validation (no NaN)
 *   - Exports recentQuizzes, mockTests, revisionSessions, leaderboard for KS dashboards
 *   - getAgeBand now receives curriculum (ng_jss→ks3, ng_sss→ks4)
 *   - effectiveYear maps JSS1-3→Y7-9, SSS1-3→Y10-12 for DB queries
 */

import { useState, useEffect, useCallback } from "react";
import { getAgeBand, getBandConfig, getEncouragement, getQuestNarrative } from "@/lib/ageBandConfig";
import { computeExamReadinessIndex, predictGrade, fetchExamBoardData } from "@/lib/learningPathEngine";
import {
  getMasteryData,
  getQuizResults,
  getWeeklySummary,
  getExamReadiness,
  getSubjectProficiency,
  getReviewSchedule,
  getActivityCalendar,
  invalidateCache,
} from "@/lib/analyticsService";

// ── Year mapping: scholar.year_level → DB year_level ─────────────────────────
function getEffectiveYear(yearLevel, curriculum) {
  const yr = Number(yearLevel || 1);
  const c = (curriculum || "").toLowerCase();
  if (c === "ng_jss") return yr + 6;   // JSS1→7, JSS2→8, JSS3→9
  if (c === "ng_sss") return yr + 9;   // SS1→10, SS2→11, SS3→12
  return yr;
}

const MATHS_TOPICS_BY_BAND = {
  ks1: ['place_value','number_bonds','addition','subtraction','counting','shapes','measurement','time','money','halving','position_and_direction','sorting'],
  ks2: ['place_value','number_bonds','addition','subtraction','multiplication','division','fractions','decimals','percentages','ratio_and_proportion','area_and_perimeter','angles_and_shapes','data_handling','probability','time','money','measurement','coordinates','symmetry','rounding'],
  ks3: ['addition','subtraction','multiplication','division','fractions','decimals','percentages','ratio_and_proportion','algebra_basics','linear_equations','area_and_perimeter','angles_and_shapes','data_handling','probability','pythagoras_theorem','trigonometry','sequences','transformations','graphs'],
  ks4: ['fractions','decimals','percentages','ratio_and_proportion','algebra_basics','linear_equations','quadratic_equations','simultaneous_equations','area_and_perimeter','angles_and_shapes','data_handling','probability','pythagoras_theorem','trigonometry','circle_theorems','vectors','statistics','calculus'],
};

export default function useDashboardData(scholar, supabase) {
  const [stats, setStats]                     = useState({});
  const [topics, setTopics]                   = useState([]);
  const [journal, setJournal]                 = useState([]);
  const [dailyAdventure, setDaily]            = useState(null);
  const [encouragement, setEncourage]         = useState(null);
  const [careerTopic, setCareerTopic]         = useState(null);
  const [examData, setExamData]               = useState(null);
  const [masteryData, setMasteryData]         = useState([]);
  const [peerComparisons, setPeerComp]        = useState([]);
  const [pastMocks, setPastMocks]             = useState([]);
  const [recentQuizzes, setRecentQuizzes]     = useState([]);
  const [mockTests, setMockTests]             = useState([]);
  const [revisionSessions, setRevisionSess]   = useState([]);
  const [leaderboard, setLeaderboard]         = useState([]);
  const [subjectProficiency, setSubjProf]     = useState({});
  const [reviewSchedule, setReviewSchedule]   = useState({ dueNow: [], upcoming: [] });
  const [activityCalendar, setActivityCal]    = useState([]);
  const [loading, setLoading]                 = useState(true);

  const scholarId  = scholar?.id;
  const yearLevel  = parseInt(scholar?.year_level || scholar?.year, 10) || 4;
  const curriculum = scholar?.curriculum || "uk_11plus";
  const band       = getAgeBand(yearLevel, curriculum);        // ← FIX: pass curriculum
  const config     = getBandConfig(band);
  const effectiveYear = getEffectiveYear(yearLevel, curriculum); // ← FIX: mapped year for DB

  const fetchAll = useCallback(async () => {
    if (!scholarId || !supabase) return;
    setLoading(true);

    try {
      // ── Use analyticsService for cached, centralised queries ──────
      const [masteryRows, quizzes, weeklySummary, journalResult, adventureResult, dbTopicsResult, subjProf, schedule, activityCal] = await Promise.all([
        getMasteryData(scholarId, curriculum, supabase),
        getQuizResults(scholarId, supabase, 100),
        getWeeklySummary(scholarId, curriculum, supabase),
        config.dashboard.questJournal
          ? supabase.from("quest_journal").select("entry_date, entry_text, icon")
              .eq("scholar_id", scholarId).order("created_at", { ascending: false }).limit(5)
          : Promise.resolve({ data: [] }),
        config.dashboard.dailyAdventure
          ? supabase.from("daily_adventure").select("*")
              .eq("scholar_id", scholarId)
              .eq("adventure_date", new Date().toISOString().split("T")[0])
              .maybeSingle()
          : Promise.resolve({ data: null }),
        // Use effectiveYear (mapped for NG curricula) so JSS/SSS scholars
        // get topics at their actual DB year_level (7-12), not raw 1-3
        supabase.from("question_bank")
          .select("subject, topic")
          .eq("curriculum", curriculum)
          .eq("is_active", true)
          .gte("year_level", Math.max(1, effectiveYear - 1))
          .lte("year_level", effectiveYear + 1),
        getSubjectProficiency(scholarId, curriculum, supabase),
        getReviewSchedule(scholarId, curriculum, supabase),
        getActivityCalendar(scholarId, supabase, 90),
      ]);

      setMasteryData(masteryRows);
      setSubjProf(subjProf);
      setReviewSchedule(schedule);
      setActivityCal(activityCal);

      // ── Build available topics per subject from question_bank ──────
      const dbTopicRows = dbTopicsResult.data ?? [];
      const availableBySubject = {};
      dbTopicRows.forEach(r => {
        if (!r.subject || !r.topic) return;
        if (!availableBySubject[r.subject]) availableBySubject[r.subject] = new Set();
        availableBySubject[r.subject].add(r.topic);
      });

      // Also include topics the scholar already has mastery data for
      // (handles subjects where question_bank year_level range doesn't
      //  match but the scholar has previously engaged with the topic)
      masteryRows.forEach(r => {
        if (!r.subject || !r.topic) return;
        if (!availableBySubject[r.subject]) availableBySubject[r.subject] = new Set();
        availableBySubject[r.subject].add(r.topic);
      });

      // For maths, also include the year-band curated list
      const mathsAllowed = new Set(MATHS_TOPICS_BY_BAND[band] || MATHS_TOPICS_BY_BAND.ks2);
      ['mathematics', 'maths', 'math'].forEach(key => {
        if (!availableBySubject[key]) availableBySubject[key] = new Set();
        mathsAllowed.forEach(t => availableBySubject[key].add(t));
      });

      // ── Build topic list for SkillMap ──────────────────────────────
      const allTopics = [];
      const masteryByKey = {};
      masteryRows.forEach(r => { masteryByKey[`${r.subject}:${r.topic}`] = r; });

      Object.entries(availableBySubject).forEach(([subj, topicSet]) => {
        const isMaths = subj === "mathematics" || subj === "maths" || subj === "math";
        const slugs = Array.from(topicSet);

        // For maths, filter by year band
        const filtered = isMaths
          ? slugs.filter(s => mathsAllowed.has(s))
          : slugs;

        filtered.forEach(slug => {
          const row = masteryByKey[`${subj}:${slug}`];
          const mastery = row?.mastery_score ?? 0;
          const seen = (row?.times_seen ?? 0) > 0;
          let status = "locked";
          if (mastery >= 0.8) status = "mastered";
          else if (seen && mastery >= 0.55) status = "developing";
          else if (seen) status = "started";

          allTopics.push({
            slug,
            label: slug.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
                       .replace(/\bAnd\b/g, "&").replace(/\bOf\b/g, "of"),
            strand: getStrand(slug),
            mastery,
            status,
            subject: subj,
          });
        });
      });

      // ── Mark current + unlock progression per subject ──────────────
      // Also archive mastered topics so the active list stays focused
      const subjectGroups = {};
      allTopics.forEach(t => {
        if (!subjectGroups[t.subject]) subjectGroups[t.subject] = [];
        subjectGroups[t.subject].push(t);
      });

      Object.entries(subjectGroups).forEach(([subj, group]) => {
        // Archive mastered topics — they move to a separate "completed" section
        group.forEach(t => {
          t.archived = t.status === "mastered";
        });

        // Only consider non-archived topics for progression unlock
        const active = group.filter(t => !t.archived);
        const activeIdx = active.findIndex(t => t.status === "developing" || t.status === "started");
        const firstLockedIdx = active.findIndex(t => t.status === "locked");
        const hasActive = activeIdx >= 0;

        if (hasActive) {
          const nextLocked = active.findIndex((t, i) => i > activeIdx && t.status === "locked");
          if (nextLocked >= 0) active[nextLocked].status = "started";
        } else if (firstLockedIdx >= 0) {
          active[firstLockedIdx].status = "current";
          if (firstLockedIdx + 1 < active.length && active[firstLockedIdx + 1].status === "locked") {
            active[firstLockedIdx + 1].status = "started";
          }
        }
      });

      // Sort: active topics first, archived (mastered) at the end
      allTopics.sort((a, b) => {
        if (a.archived && !b.archived) return 1;
        if (!a.archived && b.archived) return -1;
        return 0;
      });

      setTopics(allTopics);

      // ── Stats (via analyticsService weeklySummary) ───────────────
      const getDate = (q) => q.completed_at || q.created_at;
      const masteryPct = weeklySummary.masteryPct ?? 0;

      setStats({
        xp: weeklySummary.xp ?? 0,
        xpToday: weeklySummary.xpToday ?? 0,
        questsCompleted: weeklySummary.questsCompleted ?? 0,
        streak: weeklySummary.streak ?? 0,
        streakBest: weeklySummary.streakBest ?? 0,
        masteryPct,
        topicCount: weeklySummary.topicCount ?? 0,
        totalTopics: weeklySummary.totalTopics ?? 0,
        timeMinutes: weeklySummary.timeMinutes ?? 0,
        predictedGrade: band === "ks4" ? predictGrade(masteryPct, null, curriculum).grade : null,
        mocksCompleted: quizzes.filter(q => q.details?.mock).length,
        stickersCollected: weeklySummary.stickersCollected ?? 0,
      });

      // ── Recent quizzes for KS dashboard sidebar ──────────────────
      setRecentQuizzes(quizzes.slice(0, 5).map(q => ({
        id: q.id,
        subject: q.subject || q.details?.subject || "mathematics",
        topic: q.topic || q.details?.topic || "",
        score: q.score ?? 0,
        total: q.total_questions ?? q.questions_total ?? 0,
        date: getDate(q),
      })));

      // ── Journal ────────────────────────────────────────────────────
      setJournal((journalResult.data ?? []).map(e => ({
        date: formatRelativeDate(e.entry_date), entry: e.entry_text, icon: e.icon,
      })));

      // ── Daily adventure ────────────────────────────────────────────
      if (config.dashboard.dailyAdventure) {
        const adv = adventureResult.data;
        const currentTopic = allTopics.find(t => t.status === "current");
        const adventureSubject = currentTopic?.subject || "mathematics";
        const adventureTopic = currentTopic?.slug || "addition";
        setDaily(adv
          ? { narrative: adv.narrative, totalQuestions: adv.total_questions, completed: adv.completed }
          : { narrative: getQuestNarrative(band, adventureSubject, adventureTopic), totalQuestions: 10, completed: 0 }
        );
      }

      // ── Encouragement ──────────────────────────────────────────────
      const currentStreak = weeklySummary.streak ?? 0;
      const weeklyQuizCount = weeklySummary.weeklyQuizCount ?? quizzes.length;
      if (checkTrigger(config, quizzes.length, currentStreak)) {
        const currentTopic = allTopics.find(t => t.status === "current");
        const msg = getEncouragement(band, {
          n: weeklyQuizCount, streak: currentStreak,
          topic: currentTopic?.label ?? "your studies", pct: masteryPct,
        });
        setEncourage({ text: msg.text, visible: true });
      }

      // ── Career topic (KS2/KS3) ────────────────────────────────────
      if ((band === "ks2" || band === "ks3") && quizzes.length > 0) {
        setCareerTopic(quizzes[0].details?.[0]?.topic ?? null);
      }

      // ── Exam data (KS4) — via analyticsService with NaN-safe dates ──
      if (band === "ks4") {
        const examReadiness = await getExamReadiness(scholar, supabase);
        if (examReadiness) {
          const mastered = masteryRows.filter(r => (r.mastery_score ?? 0) >= 0.7).length;
          setExamData({
            ...examReadiness,
            topicsRemaining: allTopics.length - mastered,
            mocksCompleted: quizzes.filter(q => q.details?.mock).length,
            revisionPlan: buildRevisionPlan(masteryRows),
          });
        }

        // ── Mock tests & revision sessions for KS4Dashboard props ──
        setMockTests(quizzes
          .filter(q => q.details?.mock || (q.total_questions ?? q.questions_total ?? 0) >= 20)
          .slice(0, 5)
          .map(q => ({
            id: q.id,
            subject: q.subject || q.details?.subject || "mathematics",
            score: q.score ?? 0,
            total: q.total_questions ?? q.questions_total ?? 0,
            date: getDate(q),
            predictedGrade: predictGrade(
              Math.round(((q.score ?? 0) / Math.max(q.total_questions ?? q.questions_total ?? 1, 1)) * 100),
              null, curriculum
            ).grade,
          }))
        );

        setRevisionSess(buildRevisionPlan(masteryRows));
      }

      // ── Peer comparisons ───────────────────────────────────────────
      if (band === "ks3" || band === "ks4") {
        setPeerComp(masteryRows
          .filter(r => (r.mastery_score ?? 0) > 0).slice(0, 5)
          .map(r => ({
            topic: r.topic, subject: r.subject,
            percentile: Math.max(5, Math.round((1 - (r.mastery_score ?? 0)) * 60 + Math.random() * 20)),
            direction: "stable",
          })));
      }

      // ── Past mocks ─────────────────────────────────────────────────
      setPastMocks(quizzes
        .filter(q => q.details?.mock || (q.total_questions ?? q.questions_total ?? 0) >= 20)
        .map(q => ({
          date: getDate(q), score: q.score ?? 0, total: q.total_questions ?? q.questions_total ?? 0,
          predictedGrade: predictGrade(Math.round(((q.score ?? 0) / Math.max(q.total_questions ?? q.questions_total ?? 1, 1)) * 100), null, curriculum).grade,
        })));

    } catch (err) {
      console.error("[useDashboardData] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [scholarId, curriculum, band, config, supabase, effectiveYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Real-time Supabase subscriptions ─────────────────────────────
  useEffect(() => {
    if (!scholarId || !supabase) return;

    const channel = supabase
      .channel(`dashboard-${scholarId}`)
      // Listen for mastery updates (topic completion, spaced repetition)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scholar_topic_mastery",
          filter: `scholar_id=eq.${scholarId}`,
        },
        () => {
          invalidateCache(`mastery:${scholarId}`);
          invalidateCache(`weeklySummary:${scholarId}`);
          invalidateCache(`subjectProf:${scholarId}`);
          invalidateCache(`examReadiness:${scholarId}`);
          fetchAll();
        }
      )
      // Listen for new quiz completions
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quiz_results",
          filter: `scholar_id=eq.${scholarId}`,
        },
        () => {
          invalidateCache(`quizResults:${scholarId}`);
          invalidateCache(`weeklySummary:${scholarId}`);
          invalidateCache(`activityCal:${scholarId}`);
          fetchAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scholarId, supabase, fetchAll]);

  return {
    stats, topics, journal, dailyAdventure, encouragement,
    careerTopic, examData, masteryData, peerComparisons, pastMocks,
    recentQuizzes, mockTests, revisionSessions, leaderboard,
    subjectProficiency, reviewSchedule, activityCalendar,
    loading, refetch: fetchAll,
    invalidateAll: () => {
      invalidateCache(`mastery:${scholarId}`);
      invalidateCache(`weeklySummary:${scholarId}`);
      invalidateCache(`quizResults:${scholarId}`);
      invalidateCache(`subjectProf:${scholarId}`);
      invalidateCache(`examReadiness:${scholarId}`);
      invalidateCache(`activityCal:${scholarId}`);
    },
    invalidateCache: () => invalidateCache(`mastery:${scholarId}`),
  };
}

function getStrand(slug) {
  const f = ['place_value','number_bonds','addition','subtraction','counting','shapes','measurement','time','money','halving','sorting','position_and_direction','phonics','reading_comprehension','spelling','punctuation','grammar_basics','vocabulary'];
  const m = ['multiplication','division','fractions','decimals','percentages','ratio_and_proportion','area_and_perimeter','angles_and_shapes','data_handling','probability','coordinates','symmetry','rounding','negative_numbers','sequences','graphs','creative_writing','persuasive_writing','inference','comprehension'];
  if (f.includes(slug)) return 'foundation';
  if (m.includes(slug)) return 'intermediate';
  return 'advanced';
}
function formatRelativeDate(ds) { if (!ds) return ""; const d = new Date(ds), diff = Math.floor((new Date() - d) / 864e5); return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : diff < 7 ? d.toLocaleDateString("en-GB", { weekday: "short" }) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); }
function estimateGrade(p) { return p >= 90 ? "9" : p >= 80 ? "8" : p >= 70 ? "7" : p >= 60 ? "6" : p >= 50 ? "5" : p >= 40 ? "4" : "3"; }
function checkTrigger(c, t, s) { const f = c.encouragement.frequency; return (f === "every_5_correct" && t > 0 && t % 5 === 0) || (f === "every_10_correct" && t > 0 && t % 10 === 0) || (f === "every_20_correct" && t > 0 && t % 20 === 0) || (f === "milestone_only" && [10, 50, 100].includes(t)) || (s > 0 && [3, 7, 14, 30].includes(s)); }
function buildRevisionPlan(rows) { return rows.filter(r => (r.mastery_score ?? 0) < .7 && (r.times_seen ?? 0) > 0).sort((a, b) => (a.mastery_score ?? 0) - (b.mastery_score ?? 0)).slice(0, 3).map((w, i) => ({ title: (w.topic || "General").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), duration: `${15 + i * 5} min`, status: i === 0 ? "next" : "pending" })); }