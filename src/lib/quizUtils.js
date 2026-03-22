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
// Journal integration — dynamically imported inside saveQuizResult

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
  const PASSAGE_SIGNALS = [
    'passage', 'the text above', 'the text below', 'the extract',
    'the story', 'the poem', 'the paragraph', 'the article',
    'in the passage', 'from the passage', 'according to the passage',
    'read the', 'based on the reading', 'the author',
    'in the story', 'from the story', 'the moral of',
    'in the poem', 'the narrator', 'the character',
  ];
  const looksPassageDependent = PASSAGE_SIGNALS.some(s => lower.includes(s));
  if (looksPassageDependent && !q.passage) {
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
  studentId, subject, curriculum, questions, answers, topicSummary, xpPerQuestion,
  timeSpentSeconds,
}) {
  if (!studentId) return;

  // Normalise subject to canonical DB value
  const SUBJECT_ALIASES = {
    maths: 'mathematics', math: 'mathematics',
    verbal: 'verbal_reasoning',
    nvr: 'non_verbal_reasoning',
    basic_science: 'science',
  };
  const normSubject = SUBJECT_ALIASES[subject?.toLowerCase()] || subject;

  try {
    const details = questions.map((q, i) => ({
      question_id: q.id    || null,
      subject:     q.subject || subject,
      topic:       q.topic   || 'general',
      correct:     answers[i]?.isCorrect ?? false,
    }));
    const finalScore = details.filter(d => d.correct).length;
    const xp         = finalScore * (xpPerQuestion || 10);
    const accuracy   = questions.length > 0
      ? Math.round((finalScore / questions.length) * 100) : 0;

    // Collect unique topics from this session
    const topics = [...new Set(questions.map(q => q.topic).filter(Boolean))];

    // quiz_results row — only columns that exist on the table
    const { error: insertErr } = await supabase.from('quiz_results').insert({
      scholar_id:         studentId,
      subject:            normSubject,
      curriculum:         curriculum || 'uk_national',
      score:              finalScore,
      questions_total:    questions.length,
      accuracy,
      time_spent_seconds: timeSpentSeconds || 0,
      topics:             JSON.stringify(topics),
    });

    if (insertErr) {
      console.error('[saveQuizResult] insert failed:', insertErr.message);
      // Retry with absolute minimum columns
      const { error: retryErr } = await supabase.from('quiz_results').insert({
        scholar_id:      studentId,
        subject:         normSubject,
        score:           finalScore,
        questions_total: questions.length,
      });
      if (retryErr) console.error('[saveQuizResult] minimal insert also failed:', retryErr.message);
    }

    // question history (only rows with real DB ids)
    const dbIds = questions.map(q => q.id).filter(Boolean);
    if (dbIds.length > 0) {
      try {
        await supabase.from('scholar_question_history').insert(
          dbIds.map(qid => ({
            scholar_id:  studentId,
            question_id: qid,
            answered_at: new Date().toISOString(),
          }))
        );
      } catch (err) { console.warn('[saveQuizResult] history insert failed:', err?.message); }
    }

    // XP + skill update via RPCs (fire-and-forget, non-fatal)
    try { await supabase.rpc('update_scholar_skills', { p_scholar_id: studentId, p_details: details }); }
    catch (err) { console.warn('[saveQuizResult] update_scholar_skills RPC failed:', err?.message); }

    try { await supabase.rpc('increment_scholar_xp', { s_id: studentId, xp_to_add: xp }); }
    catch (err) { console.warn('[saveQuizResult] increment_scholar_xp RPC failed:', err?.message); }

    // ── Journal entry for KS1/KS2 adaptive dashboards (non-fatal) ─────
    try {
      const { createJournalEntry } = await import('@/lib/journalIntegration');
      createJournalEntry(supabase, {
        scholarId: studentId,
        subject: normSubject,
        topic: questions[0]?.topic || 'general',
        score: finalScore,
        total: questions.length,
        yearLevel: parseInt(questions[0]?.year_level || questions[0]?._studentYear || 4, 10),
      });
    } catch (journalErr) {
      console.warn('[saveQuizResult] Journal entry failed (non-fatal):', journalErr?.message);
    }

    // First-quiz parent email
    try {
      const { count } = await supabase
        .from('quiz_results')
        .select('*', { count: 'exact', head: true })
        .eq('scholar_id', studentId);

      if (count === 1) {
        const { data: scholar } = await supabase
          .from('scholars').select('name, parent_id').eq('id', studentId).single();
        if (scholar?.parent_id) {
          const { data: parent } = await supabase
            .from('parents').select('email, full_name').eq('id', scholar.parent_id).single();
          if (parent?.email) {
            await fetch('/api/emails/send-first-quiz', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                parentEmail: parent.email, parentName: parent.full_name,
                scholarName: scholar.name, subject,
                score: finalScore, totalQuestions: questions.length, xpEarned: xp,
              }),
            });
          }
        }
      }
    } catch (emailErr) {
      console.warn('[saveQuizResult] First-quiz email failed silently:', emailErr?.message);
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