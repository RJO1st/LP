/**
 * quizUtils.js
 * Deploy to: src/app/lib/quizUtils.js
 *
 * Shared utilities used by all quiz engines:
 *   normalizeQuestion       — shuffle MCQ opts, keep correct answer index accurate
 *   validateAndFixQuestion  — drop structurally broken questions
 *   dbRowToQuestion         — Supabase row → UI question object
 *   buildCompletionPayload  — standard shape passed to onComplete()
 *   saveQuizResult          — write quiz_results + history + XP to Supabase
 *   getSessionTimer         — total session timer per engine type (seconds)
 *   getPerQuestionTimer     — per-question countdown for MainQuizEngine (seconds)
 */

// ─── SHUFFLE ──────────────────────────────────────────────────────────────────
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─── NORMALIZE QUESTION ───────────────────────────────────────────────────────
/**
 * Shuffles MCQ options while keeping the correct answer index accurate.
 * Non-MCQ types are returned unchanged.
 */
export function normalizeQuestion(q) {
  if (!q) return q;
  const type = q.type || 'mcq';
  if (type !== 'mcq' || !q.opts?.length) return q;

  const opts    = [...q.opts];
  const safeA   = (typeof q.a === 'number' && q.a >= 0 && q.a < opts.length) ? q.a : 0;
  const correct = opts[safeA];
  const shuffled = shuffle(opts);

  return { ...q, opts: shuffled, a: shuffled.indexOf(correct), correctAnswer: correct };
}

// ─── VALIDATE & FIX QUESTION ──────────────────────────────────────────────────
/**
 * Returns null for structurally broken questions or ones that reference
 * a missing passage. Attempts index recovery from correctAnswer string.
 */
export function validateAndFixQuestion(q, idx = 0) {
  if (!q || typeof q !== 'object') return null;
  if (!q.q || typeof q.q !== 'string' || !q.q.trim()) return null;
  if (!Array.isArray(q.opts) || q.opts.length === 0) return null;

  // Discard passage-dependent questions with no passage
  const lower = q.q.toLowerCase();
  if ((lower.includes('passage') || lower.includes('the text above')) && !q.passage) {
    console.warn(`[quizUtils] Discarding Q${idx + 1} — references passage but none attached.`);
    return null;
  }

  const v = { ...q, opts: q.opts.map(String) };

  if (typeof v.a !== 'number' || v.a < 0 || v.a >= v.opts.length) {
    if (v.correctAnswer) {
      const recovered = v.opts.findIndex(o => String(o) === String(v.correctAnswer));
      if (recovered >= 0) v.a = recovered;
      else return null;
    } else return null;
  }

  if (!v.correctAnswer) v.correctAnswer = v.opts[v.a];
  return v;
}

// ─── DB ROW → QUESTION ───────────────────────────────────────────────────────
/**
 * Maps a raw Supabase question_bank row to the UI question shape.
 * Handles question_data JSONB column if present.
 */
export function dbRowToQuestion(row, fallbackSubject) {
  const parse = (val, fb) => {
    if (Array.isArray(val) || (val && typeof val === 'object' && !Array.isArray(val))) return val;
    try { return val ? JSON.parse(val) : fb; } catch { return fb; }
  };

  let d = row;
  if (row.question_data) {
    const p = parse(row.question_data, {});
    d = {
      ...row,
      question_text: p.q    || row.question_text,
      options:       p.opts  || row.options,
      correct_index: typeof p.a === 'number' ? p.a : (p.a != null ? parseInt(p.a, 10) : row.correct_index),
      explanation:   p.exp   || row.explanation,
      passage:       p.passage || row.passage,
      topic:         p.topic   || row.topic,
      hints:         p.hints   || row.hints,
    };
  }

  const opts         = parse(d.options, []).map(String);
  const rawIdx       = d.correct_index ?? 0;
  const safeIdx      = (typeof rawIdx === 'number' && rawIdx >= 0 && rawIdx < opts.length) ? rawIdx : 0;
  const correctAnswer = opts[safeIdx] || null;

  // If question_data has correctAnswer, use it to recover the true index
  let finalIdx = safeIdx;
  if (row.question_data) {
    const p = parse(row.question_data, {});
    if (p.correctAnswer) {
      const recovered = opts.findIndex(o => o === String(p.correctAnswer));
      if (recovered >= 0) finalIdx = recovered;
    }
  }

  return {
    id:           row.id,
    q:            d.question_text  || '',
    opts,
    a:            finalIdx,
    correctAnswer,
    exp:          d.explanation    || '',
    subject:      row.subject      || fallbackSubject || 'maths',
    topic:        d.topic          || 'general',
    passage:      d.passage        || null,
    hints:        parse(d.hints, []),
    image_url:    d.image_url      || row.image_url || null,
    difficulty:   d.difficulty     || row.difficulty || 50,
    difficultyTier: row.difficulty_tier || 'developing',
    _raw: row,
  };
}

// ─── BUILD COMPLETION PAYLOAD ─────────────────────────────────────────────────
/**
 * Returns the standard object passed to onComplete(payload).
 */
export function buildCompletionPayload({ answers, totalQuestions, xpPerQuestion, topicSummary }) {
  const finalScore = answers.filter(a => a.isCorrect).length;
  const accuracy   = totalQuestions > 0 ? Math.round((finalScore / totalQuestions) * 100) : 0;
  return {
    score:        finalScore,
    totalScore:   finalScore * xpPerQuestion,
    accuracy,
    answers,
    topicSummary,
  };
}

// ─── SAVE QUIZ RESULT ─────────────────────────────────────────────────────────
/**
 * Fire-and-forget writes:
 *   quiz_results, scholar_question_history, update_scholar_skills, increment_scholar_xp
 * Also triggers first-quiz parent email if this is the scholar's first completed session.
 *
 * Tier 1 additions vs previous:
 *   timeSpentSeconds  — session duration in seconds (passed from QuestOrchestrator)
 *   questions_correct — alias for score, queried by WeeklyMissionPlan + TopicPerformanceBreakdown
 *   questions_total   — alias for total_questions, queried by same components
 *   topic_summary     — JSONB per-topic breakdown, queried by TopicPerformanceBreakdown
 */
export async function saveQuizResult(supabase, {
  studentId, subject, questions, answers, topicSummary, xpPerQuestion,
  timeSpentSeconds,
}) {
  if (!studentId) return;
  try {
    const details = questions.map((q, i) => ({
      question_id: q.id    || null,
      subject:     q.subject || subject,
      topic:       q.topic   || 'general',
      correct:     answers[i]?.isCorrect ?? false,
    }));
    const finalScore = details.filter(d => d.correct).length;
    const xp         = finalScore * (xpPerQuestion || 10);

    // quiz_results row — Tier 1 fields added
    await supabase.from('quiz_results').insert({
      scholar_id:         studentId,
      subject,
      score:              finalScore,
      total_questions:    questions.length,
      questions_correct:  finalScore,
      questions_total:    questions.length,
      topic_summary:      topicSummary || {},
      time_spent_seconds: timeSpentSeconds || 0,
      completed_at:       new Date().toISOString(),
      details,
    });

    // question history (only rows with real DB ids)
    const dbIds = questions.map(q => q.id).filter(Boolean);
    if (dbIds.length > 0) {
      await supabase.from('scholar_question_history').insert(
        dbIds.map(qid => ({
          scholar_id:  studentId,
          question_id: qid,
          answered_at: new Date().toISOString(),
        }))
      );
    }

    // XP + skill update via RPCs
    await supabase.rpc('update_scholar_skills', { p_scholar_id: studentId, p_details: details });
    await supabase.rpc('increment_scholar_xp',  { s_id: studentId, xp_to_add: xp });

    // First-quiz parent email
    const { count } = await supabase
      .from('quiz_results')
      .select('*', { count: 'exact', head: true })
      .eq('scholar_id', studentId);

    if (count === 1) {
      try {
        const { data: scholar } = await supabase
          .from('scholars').select('name, parent_id').eq('id', studentId).single();
        const { data: parent } = await supabase
          .from('parents').select('email, full_name').eq('id', scholar.parent_id).single();
        await fetch('/api/emails/send-first-quiz', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            parentEmail: parent.email, parentName: parent.full_name,
            scholarName: scholar.name, subject,
            score: finalScore, totalQuestions: questions.length, xpEarned: xp,
          }),
        });
      } catch (emailErr) {
        console.warn('[saveQuizResult] First-quiz email failed silently:', emailErr?.message);
      }
    }
  } catch (err) {
    console.error('[saveQuizResult] Failed:', err?.message);
  }
}

// ─── TIMERS ───────────────────────────────────────────────────────────────────

/**
 * Total session timer (seconds) for split-layout engines (RCE, STEM, Humanities).
 * Younger scholars get more time per session.
 */
export function getSessionTimer(engineType, student) {
  const year = parseInt(student?.year_level || student?.year || 5, 10);
  const base = {
    reading:    year <= 3 ? 480 : year <= 6 ? 420 : 360,
    stem:       year <= 3 ? 600 : year <= 6 ? 540 : 480,
    humanities: year <= 3 ? 480 : year <= 6 ? 420 : 360,
  };
  return base[engineType] ?? 420;
}

/**
 * Per-question timer (seconds) for the MainQuizEngine countdown.
 */
export function getPerQuestionTimer(student) {
  const year = parseInt(student?.year_level || student?.year || 5, 10);
  if (year <= 2) return 60;
  if (year <= 4) return 50;
  if (year <= 7) return 45;
  return 40;
}