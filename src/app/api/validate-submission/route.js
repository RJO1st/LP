// ═══════════════════════════════════════════════════════════════════════════
// API ROUTE: Validate Quiz Submission
// File: src/app/api/quiz/validate-submission/route.js
// Validates answer + explanation using OpenRouter AI
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { validateExplanation } from '@/lib/aiValidator';
import { validateSubmissionSchema, parseBody } from '@/lib/validation';

export async function POST(request) {
  try {
    // ── Authentication check ──────────────────────────────────────────────
    const authSupabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await authSupabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const scholarId = session.user.id;

    const supabase = createRouteHandlerClient({ cookies });

    const body = await request.json();

    // ── Zod validation ─────────────────────────────────────────────────────
    const parsed = parseBody(validateSubmissionSchema, {
      question: body.question || body.questionId,
      answer: body.answer || body.explanation,
      subject: body.subject,
      year: body.year,
    })
    if (!parsed.success) return parsed.error

    const {
      questionId,
      numericalAnswer,
      explanation,
      workPhotoUrl,
      timeSpentSeconds,
      sessionId
    } = {
      questionId: body.questionId,
      numericalAnswer: body.numericalAnswer,
      explanation: body.explanation,
      workPhotoUrl: body.workPhotoUrl,
      timeSpentSeconds: body.timeSpentSeconds,
      sessionId: body.sessionId,
    };

    // Get question details
    const { data: question, error: questionError } = await supabase
      .from('question_bank')
      .select('*')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Check numerical answer
    const tolerance = question.answer_tolerance || 1.0;
    const correctAnswer = question.numerical_answer;
    const isNumericalCorrect = Math.abs(
      parseFloat(numericalAnswer) - parseFloat(correctAnswer)
    ) <= tolerance;

    // AI validate explanation
    const aiValidation = await validateExplanation(
      explanation,
      question.question_data.q,
      numericalAnswer.toString(),
      correctAnswer.toString()
    );

    // Calculate scores
    let scores = {
      numerical: isNumericalCorrect ? 50 : 0,
      explanation: Math.round(aiValidation.understanding_score * 0.3), // Max 30
      authenticity: aiValidation.likely_ai_generated ? -20 : 10,
      time: 0,
      work_photo: workPhotoUrl ? 0 : -50 // Must have photo!
    };

    // Time validation
    const minTime = question.min_time_seconds || 30;
    const maxTime = question.max_time_seconds || 300;

    if (timeSpentSeconds >= minTime && timeSpentSeconds <= maxTime) {
      scores.time = 10; // Optimal time
    } else if (timeSpentSeconds < minTime) {
      scores.time = 0; // Too fast = suspicious
      
      // Flag as suspicious
      await supabase.from('anti_cheat_flags').insert({
        scholar_id: scholarId,
        question_id: questionId,
        flag_type: 'TOO_FAST',
        severity: isNumericalCorrect ? 'high' : 'medium',
        details: {
          time_spent: timeSpentSeconds,
          expected_min: minTime,
          was_correct: isNumericalCorrect
        },
        confidence: 0.8
      });
    } else {
      scores.time = 5; // Slow but thorough
    }

    // Total score
    const totalScore = Math.max(0, Object.values(scores).reduce((a, b) => a + b, 0));

    // Flag if AI-generated
    if (aiValidation.likely_ai_generated) {
      await supabase.from('anti_cheat_flags').insert({
        scholar_id: scholarId,
        question_id: questionId,
        flag_type: 'AI_GENERATED_EXPLANATION',
        severity: 'high',
        details: {
          red_flags: aiValidation.red_flags,
          confidence: aiValidation.confidence,
          explanation_excerpt: explanation.substring(0, 200)
        },
        confidence: aiValidation.confidence
      });
    }

    // Save quiz result
    const { data: quizResult, error: saveError } = await supabase
      .from('quiz_results')
      .insert({
        scholar_id: scholarId,
        question_id: questionId,
        subject: question.subject,
        score: isNumericalCorrect ? 1 : 0,
        total_questions: 1,
        requires_explanation: true,
        explanation_text: explanation,
        explanation_length: explanation.length,
        work_photo_url: workPhotoUrl,
        time_spent_seconds: timeSpentSeconds,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving quiz result:', saveError);
      throw saveError;
    }

    // Save AI validation
    await supabase.from('ai_validation_results').insert({
      quiz_result_id: quizResult.id,
      scholar_id: scholarId,
      question_text: question.question_data.q,
      student_answer: numericalAnswer.toString(),
      student_explanation: explanation,
      understanding_score: aiValidation.understanding_score,
      likely_ai_generated: aiValidation.likely_ai_generated,
      confidence: aiValidation.confidence,
      feedback: aiValidation.feedback,
      red_flags: aiValidation.red_flags,
      strengths: aiValidation.strengths,
      model_used: aiValidation.model_used,
      validation_cost: aiValidation.validation_cost,
      explanation_points: scores.explanation,
      authenticity_penalty: aiValidation.likely_ai_generated ? 20 : 0
    });

    // Update scholar stats
    const xpEarned = totalScore;
    await supabase.rpc('update_scholar_xp', {
      p_scholar_id: scholarId,
      p_xp_amount: xpEarned
    });

    // Mark session as complete
    if (sessionId) {
      await supabase
        .from('work_upload_sessions')
        .update({ is_active: false })
        .eq('session_id', sessionId);
    }

    return NextResponse.json({
      success: true,
      result: {
        isCorrect: isNumericalCorrect,
        scores,
        totalScore,
        xpEarned,
        aiValidation: {
          understanding_score: aiValidation.understanding_score,
          likely_ai_generated: aiValidation.likely_ai_generated,
          feedback: aiValidation.feedback,
          red_flags: aiValidation.red_flags,
          strengths: aiValidation.strengths
        }
      }
    });

  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: error.message || 'Validation failed' },
      { status: 500 }
    );
  }
}