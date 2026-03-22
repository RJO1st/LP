"use client";
/**
 * useDashboardData.js (v4)
 * Deploy to: src/hooks/useDashboardData.js
 *
 * v4: Topics tagged with subject. Fetches mastery across ALL subjects.
 *     SkillMap subject tabs work because each topic has topic.subject.
 */

import { useState, useEffect, useCallback } from "react";
import { getAgeBand, getBandConfig, getEncouragement, getQuestNarrative } from "@/lib/ageBandConfig";

const TOPICS_BY_YEAR_BAND = {
  ks1: ['place_value','number_bonds','addition','subtraction','counting','shapes','measurement','time','money','halving','position_and_direction','sorting'],
  ks2: ['place_value','number_bonds','addition','subtraction','multiplication','division','fractions','decimals','percentages','ratio_and_proportion','area_and_perimeter','angles_and_shapes','data_handling','probability','time','money','measurement','coordinates','symmetry','rounding'],
  ks3: ['place_value','addition','subtraction','multiplication','division','fractions','decimals','percentages','ratio_and_proportion','algebra_basics','linear_equations','area_and_perimeter','angles_and_shapes','data_handling','probability','pythagoras_theorem','trigonometry','sequences','transformations','graphs'],
  ks4: ['fractions','decimals','percentages','ratio_and_proportion','algebra_basics','linear_equations','quadratic_equations','simultaneous_equations','area_and_perimeter','angles_and_shapes','data_handling','probability','pythagoras_theorem','trigonometry','circle_theorems','vectors','statistics','calculus','sequences','graphs','transformations'],
};

function getYearFilteredTopics(band) {
  return new Set(TOPICS_BY_YEAR_BAND[band] || TOPICS_BY_YEAR_BAND.ks2);
}

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
  const band       = getAgeBand(yearLevel);
  const config     = getBandConfig(band);

  const fetchAll = useCallback(async () => {
    if (!scholarId || !supabase) return;
    setLoading(true);

    try {
      const [masteryResult, quizResult, streakResult, journalResult, adventureResult] = await Promise.all([
        // Fetch ALL subjects' mastery (not just one)
        supabase.from("scholar_topic_mastery")
          .select("topic, subject, mastery_score, times_seen, updated_at, next_review_at")
          .eq("scholar_id", scholarId)
          .eq("curriculum", curriculum),
        supabase.from("quiz_results")
          .select("score, total_questions, subject, completed_at, details")
          .eq("scholar_id", scholarId)
          .order("completed_at", { ascending: false })
          .limit(100),
        supabase.from("scholars")
          .select("current_streak, best_streak, total_xp")
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
      ]);

      const masteryRows = masteryResult.data ?? [];
      setMasteryData(masteryRows);

      // ── Build topics per subject, year-filtered for maths ──────────
      const mathsAllowed = getYearFilteredTopics(band);
      const allTopics = [];

      // Group mastery by subject
      const bySubject = {};
      masteryRows.forEach(r => {
        if (!bySubject[r.subject]) bySubject[r.subject] = [];
        bySubject[r.subject].push(r);
      });

      // For each subject, build topic nodes
      Object.entries(bySubject).forEach(([subj, rows]) => {
        const isMaths = subj === "mathematics" || subj === "maths" || subj === "math";

        rows.forEach(row => {
          // Year-filter maths topics (don't show Pythagoras to Y1)
          if (isMaths && !mathsAllowed.has(row.topic)) return;

          const mastery = row.mastery_score ?? 0;
          const seen = (row.times_seen ?? 0) > 0;
          let status = "locked";
          if (mastery >= 0.8) status = "mastered";
          else if (seen && mastery >= 0.55) status = "developing";
          else if (seen) status = "started";

          allTopics.push({
            slug: row.topic,
            label: (row.topic || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
                       .replace(/\bAnd\b/g, "&").replace(/\bOf\b/g, "of"),
            strand: getStrand(row.topic),
            mastery,
            status,
            subject: subj,
          });
        });

        // For maths: also add unseen allowed topics so the map shows the full path
        if (isMaths) {
          const seenSlugs = new Set(rows.map(r => r.topic));
          Array.from(mathsAllowed).forEach(slug => {
            if (seenSlugs.has(slug)) return;
            allTopics.push({
              slug,
              label: slug.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
                         .replace(/\bAnd\b/g, "&").replace(/\bOf\b/g, "of"),
              strand: getStrand(slug),
              mastery: 0,
              status: "locked",
              subject: subj,
            });
          });
        }
      });

      // If scholar has no mastery data at all, seed maths topics as locked
      if (allTopics.length === 0) {
        Array.from(mathsAllowed).forEach(slug => {
          allTopics.push({
            slug,
            label: slug.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
                       .replace(/\bAnd\b/g, "&").replace(/\bOf\b/g, "of"),
            strand: getStrand(slug),
            mastery: 0,
            status: "locked",
            subject: "mathematics",
          });
        });
        // Mark first topic as "current"
        if (allTopics.length > 0) allTopics[0].status = "current";
        if (allTopics.length > 1) allTopics[1].status = "started";
      }

      // Mark current topic per subject
      const subjectsProcessed = new Set();
      allTopics.forEach((t, i) => {
        if (subjectsProcessed.has(t.subject)) return;
        if (t.status === "locked") {
          // Find first locked in this subject — mark as current
          const firstLocked = allTopics.findIndex(
            x => x.subject === t.subject && x.status === "locked"
          );
          const hasActive = allTopics.some(
            x => x.subject === t.subject && (x.status === "current" || x.status === "developing")
          );
          if (!hasActive && firstLocked >= 0) {
            allTopics[firstLocked].status = "current";
            if (firstLocked + 1 < allTopics.length && allTopics[firstLocked + 1].subject === t.subject) {
              allTopics[firstLocked + 1].status = "started";
            }
            subjectsProcessed.add(t.subject);
          }
        }
      });

      setTopics(allTopics);

      // ── Stats ──────────────────────────────────────────────────────
      const quizzes = quizResult.data ?? [];
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      const weekQuizzes = quizzes.filter(q => new Date(q.completed_at) > weekAgo);
      const todayQuizzes = quizzes.filter(q => new Date(q.completed_at).toDateString() === new Date().toDateString());
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

      // ── Career topic (KS3) ─────────────────────────────────────────
      if (band === "ks3" && quizzes.length > 0) {
        setCareerTopic(quizzes[0].details?.[0]?.topic ?? null);
      }

      // ── Exam data (KS4) ────────────────────────────────────────────
      if (band === "ks4") {
        const mastered = masteryRows.filter(r => (r.mastery_score ?? 0) >= 0.7).length;
        setExamData({
          predictedGrade: estimateGrade(masteryPct), previousGrade: null,
          examName: scholar?.exam_mode === "gcse" ? "GCSE" : scholar?.exam_mode === "waec" ? "WAEC" : "Exam",
          daysUntilExam: 42, topicsRemaining: allTopics.length - mastered,
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
        .filter(q => q.details?.mock || (q.total_questions ?? 0) >= 20)
        .map(q => ({
          date: q.completed_at, score: q.score ?? 0, total: q.total_questions ?? 0,
          predictedGrade: estimateGrade(Math.round(((q.score ?? 0) / Math.max(q.total_questions ?? 1, 1)) * 100)),
        })));

    } catch (err) {
      console.error("[useDashboardData] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [scholarId, curriculum, band, config, supabase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return {
    stats, topics, journal, dailyAdventure, encouragement,
    careerTopic, examData, masteryData, peerComparisons, pastMocks,
    loading, refetch: fetchAll,
  };
}

function getStrand(slug) {
  const f = ['place_value','number_bonds','addition','subtraction','counting','shapes','measurement','time','money','halving','sorting','position_and_direction'];
  const m = ['multiplication','division','fractions','decimals','percentages','ratio_and_proportion','area_and_perimeter','angles_and_shapes','data_handling','probability','coordinates','symmetry','rounding','negative_numbers','sequences','graphs'];
  if (f.includes(slug)) return 'foundation';
  if (m.includes(slug)) return 'intermediate';
  return 'advanced';
}
function formatRelativeDate(ds) { const d=new Date(ds),diff=Math.floor((new Date()-d)/864e5); return diff===0?"Today":diff===1?"Yesterday":diff<7?d.toLocaleDateString("en-GB",{weekday:"short"}):d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}); }
function estimateGrade(p) { return p>=90?"9":p>=80?"8":p>=70?"7":p>=60?"6":p>=50?"5":p>=40?"4":"3"; }
function checkTrigger(c,t,s) { const f=c.encouragement.frequency; return (f==="every_5_correct"&&t>0&&t%5===0)||(f==="every_10_correct"&&t>0&&t%10===0)||(f==="every_20_correct"&&t>0&&t%20===0)||(f==="milestone_only"&&[10,50,100].includes(t))||(s>0&&[3,7,14,30].includes(s)); }
function buildRevisionPlan(rows) { return rows.filter(r=>(r.mastery_score??0)<.7&&(r.times_seen??0)>0).sort((a,b)=>(a.mastery_score??0)-(b.mastery_score??0)).slice(0,3).map((w,i)=>({title:(w.topic||"General").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()),duration:`${15+i*5} min`,status:i===0?"next":"pending"})); }