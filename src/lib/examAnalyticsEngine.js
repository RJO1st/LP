'use strict';

/**
 * examAnalyticsEngine.js — Rich analytics computed after marking is complete.
 *
 * Generates detailed analytics entry for completed exam sittings.
 * Called after all exam_answers have been marked with marks_awarded values.
 *
 * Exports:
 * - generateExamAnalytics(sittingId, options) — Main orchestrator
 * - predictGrade(percentage, board, subject, year, session, options) — Grade prediction
 * - computeTopicScores(questions, answers) — Topic breakdown
 * - generateImprovementSuggestions(topicScores, answers, questions) — AI-free suggestions
 * - computeExamTechnique(answers, questions, paper) — Technique analysis
 * - getScholarGradeTrajectory(scholarId, subject, options) — Historical progress
 */

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT GRADE BOUNDARIES
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_GRADE_SCALES = {
  gcse_9_1: [
    { grade: '9', minPercent: 80 },
    { grade: '8', minPercent: 70 },
    { grade: '7', minPercent: 61 },
    { grade: '6', minPercent: 52 },
    { grade: '5', minPercent: 43 },
    { grade: '4', minPercent: 34 },
    { grade: '3', minPercent: 25 },
    { grade: '2', minPercent: 16 },
    { grade: '1', minPercent: 7 },
  ],
  waec: [
    { grade: 'A1', minPercent: 85 },
    { grade: 'B2', minPercent: 75 },
    { grade: 'B3', minPercent: 65 },
    { grade: 'C4', minPercent: 60 },
    { grade: 'C5', minPercent: 55 },
    { grade: 'C6', minPercent: 50 },
    { grade: 'D7', minPercent: 40 },
    { grade: 'E8', minPercent: 30 },
    { grade: 'F9', minPercent: 0 },
  ],
  eleven_plus: [
    { grade: 'Pass (High)', minPercent: 85 },
    { grade: 'Pass', minPercent: 70 },
    { grade: 'Near Pass', minPercent: 55 },
    { grade: 'Below', minPercent: 0 },
  ],
};

// Topic-specific improvement suggestions (templates)
const IMPROVEMENT_TEMPLATES = {
  method_marks: 'You lost {marks} marks on method in {topic}. Show each step clearly on a new line—examiners award marks for process, not just the final answer.',
  weak_topic: 'Your weakest area is {topic} ({percentage}%). Focus on: {focus_points}. Practice {num_questions} questions on this topic.',
  accuracy: 'You made careless errors in {topic}. Double-check calculations and re-read questions before submitting.',
  time_management: 'You spent {percent}% of time on Section {section}, which is worth {worth}% of marks. Allocate time proportionally—aim for {suggested} minutes per mark.',
  not_attempted: 'You didn\'t attempt {count} question(s). In timed exams, attempt all questions—even partial working can earn marks.',
  strong_topic: 'Excellent work on {topic}! You scored {percentage}%. Consolidate this strength while improving weaker areas.',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 1. MAIN ORCHESTRATOR — generateExamAnalytics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * generateExamAnalytics(sittingId, options)
 * Main orchestrator. Called after marking is complete.
 * Fetches all data and computes analytics.
 *
 * @param {string} sittingId — UUID of exam_sittings record
 * @param {object} options — { supabase }
 * @returns {Promise<object>} — Analytics object to upsert into exam_analytics
 */
export async function generateExamAnalytics(sittingId, options) {
  const { supabase } = options;

  if (!supabase) {
    throw new Error('supabase client required');
  }

  // Fetch sitting + paper + answers + questions
  const [sittingData, answersData, questionsData, boundariesData, trajectoryData] = await Promise.all([
    supabase
      .from('exam_sittings')
      .select('id, scholar_id, exam_paper_id, mode, started_at, finished_at, total_score, max_possible_score, percentage, predicted_grade, is_complete')
      .eq('id', sittingId)
      .maybeSingle(),
    supabase
      .from('exam_answers')
      .select('id, sitting_id, question_id, marks_awarded, marks_possible, is_correct, time_spent_seconds, flagged_for_review')
      .eq('sitting_id', sittingId)
      .order('submitted_at', { ascending: true }),
    supabase
      .from('exam_questions')
      .select('id, exam_paper_id, topic_slug, question_number, marks, mark_breakdown')
      .eq('exam_paper_id', (await supabase.from('exam_sittings').select('exam_paper_id').eq('id', sittingId).maybeSingle()).data?.exam_paper_id),
    supabase
      .from('grade_boundaries')
      .select('exam_board, subject, year, session, boundaries')
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('exam_sittings')
      .select('finished_at, percentage, predicted_grade')
      .eq('scholar_id', (await supabase.from('exam_sittings').select('scholar_id').eq('id', sittingId).maybeSingle()).data?.scholar_id)
      .eq('is_complete', true)
      .order('finished_at', { ascending: true }),
  ]);

  const sitting = sittingData.data || sittingData;
  const answers = answersData.data || answersData || [];
  const questions = questionsData.data || questionsData || [];
  const boundaries = boundariesData.data?.[0] || null;
  const trajectory = trajectoryData.data || trajectoryData || [];

  if (!sitting || !sitting.id) {
    throw new Error(`Sitting ${sittingId} not found or is incomplete`);
  }

  if (!sitting.is_complete || sitting.total_score === null) {
    throw new Error('Sitting must be marked complete with total_score before analytics generation');
  }

  // ─── Compute analytics components ───

  const topicScores = computeTopicScores(questions, answers);
  const weakTopics = identifyWeakTopics(topicScores);
  const strongTopics = identifyStrongTopics(topicScores);
  const improvementSuggestions = generateImprovementSuggestions(topicScores, answers, questions);
  const examTechnique = computeExamTechnique(answers, questions, sitting);
  const gradeData = predictGrade(
    sitting.percentage || 0,
    boundaries?.exam_board || 'uk_gcse',
    boundaries?.subject,
    boundaries?.year,
    boundaries?.session,
    { boundaries: boundaries?.boundaries }
  );

  // ─── Fetch paper for metadata ───
  const { data: paper } = await supabase
    .from('exam_papers')
    .select('exam_board, subject, year, session, total_marks, duration_minutes')
    .eq('id', sitting.exam_paper_id)
    .maybeSingle();

  // Build grade trajectory
  const gradeTrajectory = trajectory.map(row => ({
    date: row.finished_at?.split('T')[0],
    percentage: row.percentage,
    predicted_grade: row.predicted_grade,
  }));

  // ─── Build analytics record ───
  const analytics = {
    scholar_id: sitting.scholar_id,
    exam_paper_id: sitting.exam_paper_id,
    sitting_id: sitting.id,
    topic_scores: topicScores,
    weak_topics: weakTopics,
    strong_topics: strongTopics,
    grade_trajectory: gradeTrajectory,
    improvement_suggestions: improvementSuggestions,
    exam_technique_notes: examTechnique,
    grade: gradeData.grade,
    next_grade: gradeData.nextGrade,
    marks_to_next_grade: gradeData.marksToNext,
    percentage_overall: sitting.percentage,
    created_at: new Date().toISOString(),
  };

  // Upsert into exam_analytics
  const { error: upsertError } = await supabase
    .from('exam_analytics')
    .upsert(
      { ...analytics, updated_at: new Date().toISOString() },
      { onConflict: 'sitting_id' }
    );

  if (upsertError) {
    console.error('Failed to upsert exam_analytics:', upsertError);
    throw upsertError;
  }

  return analytics;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GRADE PREDICTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * predictGrade(percentage, board, subject, year, session, options)
 * Maps percentage to predicted grade using boundaries.
 *
 * @param {number} percentage — Exam score as percentage (0-100)
 * @param {string} board — Exam board (e.g., "aqa", "edexcel", "waec")
 * @param {string} subject — Subject (e.g., "mathematics", "english")
 * @param {number} year — Year level (e.g., 11, 12)
 * @param {string} session — Session (e.g., "January", "June")
 * @param {object} options — { boundaries: array or gradeBoundaries object }
 * @returns {object} — { grade, nextGrade, marksToNext, boundaryUsed }
 */
export function predictGrade(percentage, board, subject, year, session, options = {}) {
  percentage = Math.max(0, Math.min(100, percentage || 0));

  let boundaries = null;
  let boundaryUsed = 'estimated';

  // Use provided boundaries if available
  if (options.boundaries) {
    if (Array.isArray(options.boundaries)) {
      boundaries = options.boundaries;
    } else if (options.boundaries.boundaries && Array.isArray(options.boundaries.boundaries)) {
      boundaries = options.boundaries.boundaries;
    }
    boundaryUsed = 'actual';
  }

  // Fallback to default scale
  if (!boundaries) {
    if (board && board.toLowerCase().includes('waec')) {
      boundaries = DEFAULT_GRADE_SCALES.waec;
    } else if (board && board.toLowerCase().includes('11plus')) {
      boundaries = DEFAULT_GRADE_SCALES.eleven_plus;
    } else {
      boundaries = DEFAULT_GRADE_SCALES.gcse_9_1;
    }
  }

  // Normalize boundary format: { grade, minPercent } or { grade, min_percent }
  const normalized = boundaries.map(b => ({
    grade: b.grade,
    minPercent: b.minPercent !== undefined ? b.minPercent : b.min_percent,
  }));

  // Sort highest-first
  const sorted = [...normalized].sort((a, b) => (b.minPercent || 0) - (a.minPercent || 0));

  // Find current grade and next grade
  let currentGrade = sorted[sorted.length - 1]?.grade || '—';
  let nextGrade = null;
  let marksToNext = 0;

  for (let i = 0; i < sorted.length; i++) {
    const threshold = sorted[i].minPercent || 0;
    if (percentage >= threshold) {
      currentGrade = sorted[i].grade;
      // Next grade is one level up
      if (i > 0) {
        const nextThreshold = sorted[i - 1].minPercent || 0;
        nextGrade = sorted[i - 1].grade;
        marksToNext = Math.max(0, Math.round(nextThreshold - percentage));
      }
      break;
    }
  }

  return {
    grade: currentGrade,
    nextGrade,
    marksToNext,
    boundaryUsed,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TOPIC SCORES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * computeTopicScores(questions, answers)
 * Groups questions by topic_slug, sums marks, computes percentage.
 *
 * @param {array} questions — Exam questions with { id, topic_slug, marks }
 * @param {array} answers — Exam answers with { question_id, marks_awarded, marks_possible, is_correct }
 * @returns {object} — { topic_slug: { marks_scored, marks_available, percentage, questions_correct, questions_total } }
 */
export function computeTopicScores(questions, answers) {
  const topicScores = {};

  // Build question map
  const questionMap = {};
  questions.forEach(q => {
    questionMap[q.id] = {
      topic_slug: q.topic_slug || 'other',
      marks: q.marks || 0,
    };
  });

  // Group answers by topic
  answers.forEach(answer => {
    const question = questionMap[answer.question_id];
    if (!question) return;

    const topic = question.topic_slug;
    const marksAwarded = answer.marks_awarded || 0;
    const marksPossible = answer.marks_possible || question.marks || 0;

    if (!topicScores[topic]) {
      topicScores[topic] = {
        marks_scored: 0,
        marks_available: 0,
        questions_correct: 0,
        questions_total: 0,
      };
    }

    topicScores[topic].marks_scored += marksAwarded;
    topicScores[topic].marks_available += marksPossible;
    topicScores[topic].questions_total += 1;

    if (answer.is_correct) {
      topicScores[topic].questions_correct += 1;
    }
  });

  // Compute percentages
  Object.keys(topicScores).forEach(topic => {
    const scores = topicScores[topic];
    scores.percentage = scores.marks_available > 0
      ? Math.round((scores.marks_scored / scores.marks_available) * 100)
      : 0;
  });

  return topicScores;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. WEAK & STRONG TOPICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * identifyWeakTopics(topicScores)
 * Returns topics below 60%, sorted worst-first.
 *
 * @param {object} topicScores — Output from computeTopicScores
 * @returns {array} — [{ topic, percentage, suggestion }, ...]
 */
export function identifyWeakTopics(topicScores) {
  return Object.entries(topicScores)
    .filter(([_, scores]) => scores.percentage < 60)
    .sort((a, b) => a[1].percentage - b[1].percentage)
    .map(([topic, scores]) => ({
      topic,
      percentage: scores.percentage,
      suggestion: generateTopicSuggestion(topic, scores),
    }));
}

/**
 * identifyStrongTopics(topicScores)
 * Returns topics at 75%+, sorted best-first.
 *
 * @param {object} topicScores — Output from computeTopicScores
 * @returns {array} — [{ topic, percentage }, ...]
 */
export function identifyStrongTopics(topicScores) {
  return Object.entries(topicScores)
    .filter(([_, scores]) => scores.percentage >= 75)
    .sort((a, b) => b[1].percentage - a[1].percentage)
    .map(([topic, scores]) => ({
      topic,
      percentage: scores.percentage,
    }));
}

/**
 * generateTopicSuggestion(topic, scores)
 * Generates a specific, actionable suggestion for a weak topic.
 *
 * @param {string} topic — Topic slug
 * @param {object} scores — { marks_scored, marks_available, percentage, questions_correct, questions_total }
 * @returns {string}
 */
export function generateTopicSuggestion(topic, scores) {
  // Map topic slugs to key concepts (can be expanded)
  const topicFocusMap = {
    simultaneous_equations: 'elimination method, substitution method, and graphical interpretation',
    trigonometry: 'SOH-CAH-TOA, identifying which ratio to use, and angle calculations',
    probability: 'tree diagrams, combined events, and probability rules',
    circle_theorems: 'angle properties, tangent relationships, and chord theorems',
    vectors: 'vector notation, addition, scalar multiplication, and displacement',
    quadratic_equations: 'factorising, completing the square, and the quadratic formula',
    algebra: 'rearranging, expanding brackets, and equation solving',
    fractions: 'adding, subtracting, multiplying, and dividing fractions',
    percentages: 'calculating percentages, percentage increase/decrease, and compound percentages',
    geometry: 'angle properties, area and perimeter, and 3D shapes',
    statistics: 'mean, median, mode, range, and data interpretation',
    number_operations: 'addition, subtraction, multiplication, division, and order of operations',
  };

  const focusPoints = topicFocusMap[topic] || 'fundamental concepts and problem-solving strategies';
  const avgQuestionsPerTopic = Math.ceil(scores.questions_total);
  const recommendedQuestions = Math.max(5, avgQuestionsPerTopic * 2);

  return `Focus on: ${focusPoints}. Practice ${recommendedQuestions} questions on this topic.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. IMPROVEMENT SUGGESTIONS (AI-free, deterministic)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * generateImprovementSuggestions(topicScores, answers, questions)
 * Analyzes patterns and generates 3-5 specific suggestions.
 * No AI calls—pure deterministic analysis.
 *
 * @param {object} topicScores — Output from computeTopicScores
 * @param {array} answers — Exam answers with { question_id, marks_awarded, marks_possible, is_correct, time_spent_seconds }
 * @param {array} questions — Exam questions with { id, topic_slug, marks }
 * @returns {array} — [string, ...]
 */
export function generateImprovementSuggestions(topicScores, answers, questions) {
  const suggestions = [];

  // ─── Pattern 1: Weak topics (< 60%) ───
  const weakTopics = identifyWeakTopics(topicScores);
  if (weakTopics.length > 0) {
    const weakestTopic = weakTopics[0];
    suggestions.push(
      `Your weakest area is ${weakestTopic.topic} (${weakestTopic.percentage}%). ${weakestTopic.suggestion}`
    );
  }

  // ─── Pattern 2: Method marks ───
  let marksLostToMethod = 0;
  let methodTopics = [];
  answers.forEach(answer => {
    if (answer.marks_awarded !== null && answer.marks_possible !== null) {
      const shortfall = answer.marks_possible - answer.marks_awarded;
      if (shortfall > 0 && !answer.is_correct) {
        marksLostToMethod += shortfall;
        const question = questions.find(q => q.id === answer.question_id);
        if (question && !methodTopics.includes(question.topic_slug)) {
          methodTopics.push(question.topic_slug);
        }
      }
    }
  });

  if (marksLostToMethod >= 3) {
    const topicPhrase = methodTopics.length > 0 ? `in ${methodTopics[0]}` : '';
    suggestions.push(
      `You lost ${marksLostToMethod} marks on method ${topicPhrase}. Show each step clearly on a new line—examiners award marks for process, not just the final answer.`
    );
  }

  // ─── Pattern 3: Accuracy errors ───
  const accuracyErrors = answers.filter(a => a.is_correct === false && a.marks_awarded === 0).length;
  if (accuracyErrors >= 2) {
    suggestions.push(
      `You made careless errors in ${accuracyErrors} question(s). Double-check calculations and re-read questions carefully before submitting.`
    );
  }

  // ─── Pattern 4: Not attempted ───
  const notAttempted = answers.filter(a => !a.scholar_answer_text && a.marks_awarded === 0).length;
  if (notAttempted > 0) {
    suggestions.push(
      `You didn't attempt ${notAttempted} question(s). In timed exams, attempt all questions—even partial working can earn marks. Leave no blank spaces.`
    );
  }

  // ─── Pattern 5: Time management (if time_spent_seconds available) ───
  const totalTime = answers.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);
  if (totalTime > 0) {
    const avgTimePerMark = totalTime / Math.max(1, Object.values(topicScores).reduce((sum, s) => sum + s.marks_available, 0));
    if (avgTimePerMark > 180) {
      // More than 3 min per mark = slow
      suggestions.push(
        `Your average time per mark is ${Math.round(avgTimePerMark / 60)} minutes. Practice timed conditions to improve pace—aim for 1-2 minutes per mark on most questions.`
      );
    }
  }

  // Return up to 5 suggestions
  return suggestions.slice(0, 5);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. EXAM TECHNIQUE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * computeExamTechnique(answers, questions, sitting)
 * Analyzes exam technique: time allocation, marks lost, etc.
 *
 * @param {array} answers — Exam answers
 * @param {array} questions — Exam questions
 * @param {object} sitting — Sitting record with { max_possible_score, total_score, finished_at, started_at }
 * @returns {object} — { time_distribution, marks_lost_to_method, marks_lost_to_accuracy, questions_not_attempted, average_time_per_mark }
 */
export function computeExamTechnique(answers, questions, sitting) {
  const technique = {
    time_distribution: {},
    marks_lost_to_method: 0,
    marks_lost_to_accuracy: 0,
    questions_not_attempted: 0,
    average_time_per_mark: 0,
    flagged_for_review_count: 0,
  };

  // Build question map
  const questionMap = {};
  questions.forEach(q => {
    questionMap[q.id] = q;
  });

  // Analyze answers
  answers.forEach(answer => {
    const question = questionMap[answer.question_id];
    if (!question) return;

    // Not attempted
    if (!answer.scholar_answer_text && answer.marks_awarded === 0) {
      technique.questions_not_attempted += 1;
    }

    // Method vs accuracy loss
    if (answer.marks_awarded !== null && answer.marks_possible !== null) {
      const shortfall = answer.marks_possible - answer.marks_awarded;
      if (shortfall > 0) {
        if (!answer.is_correct) {
          // Lost to method (no marks for incorrect answer but method could be shown)
          technique.marks_lost_to_method += Math.ceil(shortfall / 2);
          technique.marks_lost_to_accuracy += Math.floor(shortfall / 2);
        } else {
          // Partial credit—likely method
          technique.marks_lost_to_method += shortfall;
        }
      }
    }

    // Flagged for review
    if (answer.flagged_for_review) {
      technique.flagged_for_review_count += 1;
    }
  });

  // Average time per mark
  const totalTime = answers.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);
  const totalMarksAvailable = Math.max(1, sitting.max_possible_score || 1);
  technique.average_time_per_mark = totalTime > 0 ? Math.round(totalTime / totalMarksAvailable) : 0;

  return technique;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. GRADE TRAJECTORY (Historical Progress)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * getScholarGradeTrajectory(scholarId, subject, options)
 * Fetches all completed sittings for a scholar + subject.
 * Returns array of { date, percentage, predicted_grade } sorted chronologically.
 *
 * @param {string} scholarId — Scholar UUID
 * @param {string} subject — Subject (e.g., "mathematics", "english")
 * @param {object} options — { supabase }
 * @returns {Promise<array>} — [{ date, percentage, predicted_grade }, ...]
 */
export async function getScholarGradeTrajectory(scholarId, subject, options) {
  const { supabase } = options;

  if (!supabase) {
    throw new Error('supabase client required');
  }

  if (!scholarId || !subject) {
    throw new Error('scholarId and subject required');
  }

  const { data: sittings, error } = await supabase
    .from('exam_sittings')
    .select(`
      finished_at, percentage, predicted_grade,
      exam_papers!inner(subject)
    `)
    .eq('scholar_id', scholarId)
    .eq('exam_papers.subject', subject)
    .eq('is_complete', true)
    .order('finished_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch grade trajectory:', error);
    throw error;
  }

  return (sittings || []).map(sitting => ({
    date: sitting.finished_at ? sitting.finished_at.split('T')[0] : null,
    percentage: sitting.percentage,
    predicted_grade: sitting.predicted_grade,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY: format topic name for display
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * formatTopicName(slug)
 * Converts topic_slug to readable title.
 * E.g., "simultaneous_equations" → "Simultaneous Equations"
 *
 * @param {string} slug
 * @returns {string}
 */
export function formatTopicName(slug) {
  if (!slug) return 'Other';
  return slug
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
