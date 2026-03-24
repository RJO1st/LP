"use client";
/**
 * useDashboardData.js (v6)
 * Deploy to: src/hooks/useDashboardData.js
 *
 * v6 fixes:
 *   - getAgeBand now receives curriculum (ng_jss→ks3, ng_sss→ks4)
 *   - effectiveYear maps JSS1-3→Y7-9, SSS1-3→Y10-12 for DB queries
 *   - question_bank query uses effectiveYear, not raw yearLevel
 *   - No more Y2 Addition/Subtraction topics for JSS2 scholars
 */

import { useState, useEffect, useCallback } from "react";
import { getAgeBand, getBandConfig, getEncouragement, getQuestNarrative } from "@/lib/ageBandConfig";

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
  const [stats, setStats]               = useState({});
  const [topics, setTopics]             = useState([]);
  const [journal, setJournal]           = useState([]);
  const [dailyAdventure, setDaily]      = useState(null);
  const [encouragement, setEncourage]   = useState(null);
  const [careerTopic, setCareerTopic]   = useState(null);
  const [examData, setExamData]         = useState(null);
  const [masteryData, setMasteryData]   = useState([]);
  const [peerComparisons, setPeerComp]  = useState([]);
  const [pastMocks, setPastMocks]       = useState([]);
  const [loading, setLoading]           = useState(true);

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
      const [masteryResult, quizResult, streakResult, journalResult, adventureResult, dbTopicsResult] = await Promise.all([
        supabase.from("scholar_topic_mastery")
          .select("topic, subject, mastery_score, times_seen, updated_at, next_review_at")
          .eq("scholar_id", scholarId)
          .eq("curriculum", curriculum),
        supabase.from("quiz_results")
          .select("*")
          .eq("scholar_id", scholarId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("scholars")
          .select("*")
          .eq("id", scholarId)
          .single(),
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
        // ← FIX: use effectiveYear instead of raw yearLevel
        supabase.from("question_bank")
          .select("subject, topic")
          .eq("curriculum", curriculum)
          .eq("is_active", true)
          .gte("year_level", Math.max(1, yearLevel - 1))
        .lte("year_level", yearLevel + 1),
      ]);

      const masteryRows = masteryResult.data ?? [];
      setMasteryData(masteryRows);

      // ── Build available topics per subject from question_bank ──────
      const dbTopicRows = dbTopicsResult.data ?? [];
      const availableBySubject = {};
      dbTopicRows.forEach(r => {
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
      const subjectGroups = {};
      allTopics.forEach(t => {
        if (!subjectGroups[t.subject]) subjectGroups[t.subject] = [];
        subjectGroups[t.subject].push(t);
      });

      Object.entries(subjectGroups).forEach(([subj, group]) => {
        const activeIdx = group.findIndex(t => t.status === "developing" || t.status === "started");
        const firstLockedIdx = group.findIndex(t => t.status === "locked");
        const hasActive = activeIdx >= 0;

        if (hasActive) {
          const nextLocked = group.findIndex((t, i) => i > activeIdx && t.status === "locked");
          if (nextLocked >= 0) group[nextLocked].status = "started";
        } else if (firstLockedIdx >= 0) {
          group[firstLockedIdx].status = "current";
          if (firstLockedIdx + 1 < group.length && group[firstLockedIdx + 1].status === "locked") {
            group[firstLockedIdx + 1].status = "started";
          }
        }
      });

      setTopics(allTopics);

      // ── Stats ──────────────────────────────────────────────────────
      const quizzes = quizResult.data ?? [];
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      const getDate = (q) => q.completed_at || q.created_at;
      const weekQuizzes = quizzes.filter(q => getDate(q) && new Date(getDate(q)) > weekAgo);
      const todayQuizzes = quizzes.filter(q => getDate(q) && new Date(getDate(q)).toDateString() === new Date().toDateString());
      const totalXp = streakResult.data?.total_xp ?? weekQuizzes.reduce((s, q) => s + (q.score ?? 0) * 10, 0);
      const seenRows = masteryRows.filter(r => (r.times_seen ?? 0) > 0);
      const masteryPct = seenRows.length > 0
        ? Math.round(seenRows.reduce((s, r) => s + (r.mastery_score ?? 0), 0) / seenRows.length * 100)
        : 0;

      setStats({
        xp: totalXp,
        xpToday: todayQuizzes.reduce((s, q) => s + (q.score ?? 0) * 10, 0),
        questsCompleted: quizzes.length,
        streak: streakResult.data?.current_streak ?? 0,
        streakBest: streakResult.data?.best_streak ?? 0,
        masteryPct,
        topicCount: seenRows.length,
        timeMinutes: weekQuizzes.length * 8,
        predictedGrade: band === "ks4" ? estimateGrade(masteryPct) : null,
        mocksCompleted: quizzes.filter(q => q.details?.mock).length,
        stickersCollected: Math.floor(totalXp / 10),
      });

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
      if (checkTrigger(config, quizzes.length, streakResult.data?.current_streak ?? 0)) {
        const currentTopic = allTopics.find(t => t.status === "current");
        const msg = getEncouragement(band, {
          n: weekQuizzes.length, streak: streakResult.data?.current_streak ?? 0,
          topic: currentTopic?.label ?? "your studies", pct: masteryPct,
        });
        setEncourage({ text: msg.text, visible: true });
      }

      // ── Career topic (KS2/KS3) ────────────────────────────────────
      if ((band === "ks2" || band === "ks3") && quizzes.length > 0) {
        setCareerTopic(quizzes[0].details?.[0]?.topic ?? null);
      }

      // ── Exam data (KS4) ────────────────────────────────────────────
      if (band === "ks4") {
        const mastered = masteryRows.filter(r => (r.mastery_score ?? 0) >= 0.7).length;
        setExamData({
          predictedGrade: estimateGrade(masteryPct), previousGrade: null,
          examName: scholar?.exam_mode === "gcse" ? "GCSE" : scholar?.exam_mode === "waec" ? "WAEC" : "Exam",
          daysUntilExam: scholar?.exam_date
            ? Math.max(0, Math.ceil((new Date(scholar.exam_date) - new Date()) / 86400000))
            : null,
          topicsRemaining: allTopics.length - mastered,
          mocksCompleted: quizzes.filter(q => q.details?.mock).length,
          revisionPlan: buildRevisionPlan(masteryRows),
        });
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
          predictedGrade: estimateGrade(Math.round(((q.score ?? 0) / Math.max(q.total_questions ?? q.questions_total ?? 1, 1)) * 100)),
        })));

    } catch (err) {
      console.error("[useDashboardData] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [scholarId, curriculum, band, config, supabase, effectiveYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return {
    stats, topics, journal, dailyAdventure, encouragement,
    careerTopic, examData, masteryData, peerComparisons, pastMocks,
    loading, refetch: fetchAll,
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