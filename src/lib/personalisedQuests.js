/**
 * personalisedQuests.js — Interest-based + learning-gap quest generation
 *
 * Instead of generic "complete 5 questions" quests, generates narrative-driven
 * quests tailored to each scholar's weak topics and favourite subjects.
 *
 * Integration:
 *   - Reads mastery data from masteryEngine (scholar_mastery table)
 *   - Reads activity history from quiz_results
 *   - Plugs into existing scholar_quests table with quest_type = "personalised"
 *   - Awards via existing awardQuestRewards flow in questSystem.js
 *
 * Usage:
 *   import { generatePersonalisedQuests } from '@/lib/personalisedQuests';
 *   const quests = await generatePersonalisedQuests(scholarId, supabase);
 */

import { getSubjectLabel } from "./subjectDisplay";

// ─── NARRATIVE TEMPLATES ─────────────────────────────────────────────────────
// Each template has a narrative frame + a concrete measurable goal.
// {subject} and {topic} are replaced with scholar-specific values.

const GAP_QUEST_TEMPLATES = [
  {
    id: "mystery_rescue",
    name: "The Mystery of {topic}",
    description: "Tara detected a weak signal from {topic} — answer {target} questions to decode the mystery!",
    icon: "🔍",
    targetRange: [5, 8],
    xpReward: 100,
    coinReward: 25,
  },
  {
    id: "bridge_builder",
    name: "Bridge the Gap: {topic}",
    description: "Build a knowledge bridge across {topic} by mastering {target} questions correctly.",
    icon: "🌉",
    targetRange: [4, 6],
    xpReward: 80,
    coinReward: 20,
  },
  {
    id: "power_up",
    name: "Power Up: {subject}",
    description: "Your {subject} skills need a boost! Complete {target} questions with 70%+ accuracy.",
    icon: "⚡",
    targetRange: [6, 10],
    xpReward: 120,
    coinReward: 30,
  },
];

const INTEREST_QUEST_TEMPLATES = [
  {
    id: "deep_dive",
    name: "Deep Dive: {topic}",
    description: "You're crushing {subject}! Push further — ace {target} questions on {topic}.",
    icon: "🚀",
    targetRange: [5, 8],
    xpReward: 90,
    coinReward: 20,
  },
  {
    id: "speed_master",
    name: "Speed Master: {subject}",
    description: "You love {subject}. Can you answer {target} questions in under 30 seconds each?",
    icon: "⏱️",
    targetRange: [3, 5],
    xpReward: 110,
    coinReward: 25,
  },
  {
    id: "streak_blitz",
    name: "{subject} Streak Blitz",
    description: "Get {target} correct answers in a row on {subject}. No mistakes!",
    icon: "🔥",
    targetRange: [4, 6],
    xpReward: 130,
    coinReward: 30,
  },
];

const EXPLORATION_QUEST_TEMPLATES = [
  {
    id: "new_frontier",
    name: "New Frontier: {subject}",
    description: "You haven't tried {subject} yet — complete {target} questions to unlock new territory!",
    icon: "🗺️",
    targetRange: [3, 5],
    xpReward: 75,
    coinReward: 20,
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fillTemplate(template, vars) {
  let name = template.name;
  let description = template.description;
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{${key}}`;
    name = name.replaceAll(placeholder, value);
    description = description.replaceAll(placeholder, value);
  }
  return { name, description };
}

function formatTopicName(topicSlug) {
  if (!topicSlug) return "Mixed Topics";
  return topicSlug
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── CORE QUEST GENERATION ───────────────────────────────────────────────────

/**
 * Analyse scholar's mastery and activity to identify:
 * - weakTopics: topics with mastery < 0.45 (learning gaps)
 * - strongSubjects: subjects with high engagement + accuracy
 * - unexploredSubjects: subjects in curriculum but never attempted
 */
async function analyseScholarProfile(scholarId, supabaseClient) {
  const [masteryResult, activityResult, scholarResult] = await Promise.all([
    supabaseClient
      .from("scholar_mastery")
      .select("subject, topic, mastery_score, total_questions")
      .eq("scholar_id", scholarId),
    supabaseClient
      .from("quiz_results")
      .select("subject, score, created_at")
      .eq("scholar_id", scholarId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseClient
      .from("scholars")
      .select("selected_subjects, curriculum, year_level")
      .eq("id", scholarId)
      .single(),
  ]);

  const mastery = masteryResult.data || [];
  const activity = activityResult.data || [];
  const scholar = scholarResult.data;
  const selectedSubjects = scholar?.selected_subjects || [];

  // Identify weak topics (mastery < 0.45 with at least some attempts)
  const weakTopics = mastery
    .filter((m) => m.mastery_score < 0.45 && m.total_questions >= 3)
    .sort((a, b) => a.mastery_score - b.mastery_score)
    .slice(0, 5);

  // Identify strong subjects (high activity + good scores)
  const subjectStats = {};
  for (const r of activity) {
    const subj = (r.subject || "").toLowerCase();
    if (!subjectStats[subj]) subjectStats[subj] = { count: 0, totalScore: 0 };
    subjectStats[subj].count += 1;
    subjectStats[subj].totalScore += r.score || 0;
  }

  const strongSubjects = Object.entries(subjectStats)
    .filter(([, stats]) => stats.count >= 5 && stats.totalScore / stats.count >= 70)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([subj]) => subj)
    .slice(0, 3);

  // Identify unexplored subjects
  const attemptedSubjects = new Set(Object.keys(subjectStats));
  const unexploredSubjects = selectedSubjects.filter(
    (s) => !attemptedSubjects.has(s.toLowerCase())
  );

  return { weakTopics, strongSubjects, unexploredSubjects, scholar };
}

/**
 * Generate personalised quests for a scholar.
 * Returns 2-3 quests: prioritises learning gaps, then interests, then exploration.
 *
 * @param {string} scholarId
 * @param {object} supabaseClient — authenticated Supabase client
 * @returns {Promise<Array>} Quest objects ready for scholar_quests insertion
 */
export async function generatePersonalisedQuests(scholarId, supabaseClient) {
  const { weakTopics, strongSubjects, unexploredSubjects } =
    await analyseScholarProfile(scholarId, supabaseClient);

  const quests = [];
  const usedTemplateIds = new Set();

  // 1. Learning gap quest (always include if gaps exist)
  if (weakTopics.length > 0) {
    const weakest = pickRandom(weakTopics);
    const template = pickRandom(GAP_QUEST_TEMPLATES);
    const target = randomInRange(...template.targetRange);
    const { name, description } = fillTemplate(template, {
      subject: getSubjectLabel(weakest.subject),
      topic: formatTopicName(weakest.topic),
      target: String(target),
    });

    quests.push({
      scholar_id: scholarId,
      quest_type: "personalised",
      quest_id: `${template.id}_${weakest.topic}`,
      quest_name: name,
      quest_description: description,
      target_value: target,
      current_progress: 0,
      xp_reward: template.xpReward,
      coin_reward: template.coinReward,
      status: "active",
      expires_at: getWeekEnd(),
      metadata: JSON.stringify({
        category: "gap",
        subject: weakest.subject,
        topic: weakest.topic,
        icon: template.icon,
        templateId: template.id,
      }),
    });
    usedTemplateIds.add(template.id);
  }

  // 2. Interest/strength quest
  if (strongSubjects.length > 0) {
    const favSubject = pickRandom(strongSubjects);
    let template = pickRandom(INTEREST_QUEST_TEMPLATES);
    // Avoid duplicate template IDs
    let attempts = 0;
    while (usedTemplateIds.has(template.id) && attempts < 5) {
      template = pickRandom(INTEREST_QUEST_TEMPLATES);
      attempts++;
    }
    const target = randomInRange(...template.targetRange);
    const { name, description } = fillTemplate(template, {
      subject: getSubjectLabel(favSubject),
      topic: getSubjectLabel(favSubject),
      target: String(target),
    });

    quests.push({
      scholar_id: scholarId,
      quest_type: "personalised",
      quest_id: `${template.id}_${favSubject}`,
      quest_name: name,
      quest_description: description,
      target_value: target,
      current_progress: 0,
      xp_reward: template.xpReward,
      coin_reward: template.coinReward,
      status: "active",
      expires_at: getWeekEnd(),
      metadata: JSON.stringify({
        category: "interest",
        subject: favSubject,
        icon: template.icon,
        templateId: template.id,
      }),
    });
    usedTemplateIds.add(template.id);
  }

  // 3. Exploration quest (if unexplored subjects exist)
  if (unexploredSubjects.length > 0 && quests.length < 3) {
    const newSubject = pickRandom(unexploredSubjects);
    const template = EXPLORATION_QUEST_TEMPLATES[0];
    const target = randomInRange(...template.targetRange);
    const { name, description } = fillTemplate(template, {
      subject: getSubjectLabel(newSubject),
      target: String(target),
    });

    quests.push({
      scholar_id: scholarId,
      quest_type: "personalised",
      quest_id: `${template.id}_${newSubject}`,
      quest_name: name,
      quest_description: description,
      target_value: target,
      current_progress: 0,
      xp_reward: template.xpReward,
      coin_reward: template.coinReward,
      status: "active",
      expires_at: getWeekEnd(),
      metadata: JSON.stringify({
        category: "exploration",
        subject: newSubject,
        icon: template.icon,
        templateId: template.id,
      }),
    });
  }

  return quests;
}

/**
 * Check and update progress on personalised quests after a quiz.
 * Called from questSystem.updateQuestProgress or directly.
 */
export async function updatePersonalisedQuestProgress(
  scholarId,
  quizResult,
  supabaseClient
) {
  const { subject, accuracy, correctCount, totalQuestions } = quizResult;

  const { data: activeQuests } = await supabaseClient
    .from("scholar_quests")
    .select("*")
    .eq("scholar_id", scholarId)
    .eq("quest_type", "personalised")
    .eq("status", "active");

  if (!activeQuests?.length) return [];

  const completed = [];

  for (const quest of activeQuests) {
    let metadata = {};
    try {
      metadata = JSON.parse(quest.metadata || "{}");
    } catch {
      /* ignore parse errors */
    }

    const questSubject = (metadata.subject || "").toLowerCase();
    const quizSubject = (subject || "").toLowerCase();

    // Only count progress if subject matches (or quest is subject-agnostic)
    if (questSubject && questSubject !== quizSubject) continue;

    let increment = 0;
    const templateId = metadata.templateId || quest.quest_id;

    if (templateId.startsWith("speed_master")) {
      // Speed quests: count questions answered under 30s
      increment = totalQuestions; // simplified — ideally tracked per-question
    } else if (templateId.startsWith("streak_blitz")) {
      // Streak quests: need consecutive correct
      increment = correctCount >= quest.target_value ? quest.target_value : 0;
    } else if (templateId.startsWith("power_up")) {
      // Accuracy-gated: only count if 70%+ accuracy
      increment = accuracy >= 70 ? totalQuestions : 0;
    } else {
      // Default: count questions completed
      increment = totalQuestions;
    }

    if (increment <= 0) continue;

    const newProgress = Math.min(
      quest.current_progress + increment,
      quest.target_value
    );
    const isComplete = newProgress >= quest.target_value;

    await supabaseClient
      .from("scholar_quests")
      .update({
        current_progress: newProgress,
        status: isComplete ? "completed" : "active",
        completed_at: isComplete ? new Date().toISOString() : null,
      })
      .eq("id", quest.id);

    if (isComplete) completed.push(quest);
  }

  return completed;
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────

function getWeekEnd() {
  const now = new Date();
  const daysUntilSunday = 7 - now.getDay();
  const end = new Date(now);
  end.setDate(end.getDate() + (daysUntilSunday || 7));
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}
