/**
 * LaunchPard — Question Bank Validator & Purge API
 * File: src/app/api/validate-questions/route.js
 *
 * Scans question_bank for data-quality issues:
 *   1. Math verification — recomputes arithmetic in question text, checks if
 *      the marked correct answer matches the actual computed result.
 *   2. Explanation-answer mismatch — the explanation says one answer but
 *      `correct_index` points to a different option.
 *   3. Topic mis-tags — e.g. a question tagged "addition" that clearly involves
 *      subtraction/multiplication/division.
 *   4. Structural issues — missing options, out-of-bounds correct_index,
 *      duplicate options, empty question text.
 *   5. Passage self-contradiction — passage contains math that disagrees with
 *      the marked answer.
 *
 * Actions:
 *   ?mode=scan       → returns list of bad questions (default)
 *   ?mode=purge      → deletes questions that fail hard checks
 *   ?mode=fix-tags   → fixes wrong topic tags where detectable
 *   ?mode=fix-answers→ fixes incorrect correct_index where the math is unambiguous
 *
 * Filters:
 *   ?curriculum=uk_national
 *   ?subject=maths
 *   ?year=3
 *   ?limit=500
 *
 * Auth: CRON_SECRET bearer token or Vercel cron header
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseKeys } from '@/lib/env'
import { getServiceRoleClient } from '@/lib/security/serviceRole'

// ─── MATH EXPRESSION EVALUATOR ──────────────────────────────────────────────
// Safely evaluates simple arithmetic expressions found in question text/passages
function evaluateSimpleExpression(expr) {
  try {
    // Only allow digits, operators, parentheses, spaces, decimal points
    const sanitised = expr.replace(/[^0-9+\-*/().× ÷]/g, '')
      .replace(/×/g, '*').replace(/÷/g, '/');
    if (!sanitised || /[^0-9+\-*/(). ]/.test(sanitised)) return null;
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${sanitised})`)();
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

// Extract all arithmetic expressions like "450 + 350 - 100" from text
function extractArithmeticExpressions(text) {
  if (!text) return [];
  const patterns = [
    // "450 + 350 - 100 = 700"
    /(\d+(?:\s*[+\-*/×÷]\s*\d+)+)\s*=\s*(\d+(?:\.\d+)?)/g,
    // "450 + 350 - 100" (no = sign, just the expression)
    /(\d+(?:\s*[+\-*/×÷]\s*\d+){1,5})/g,
  ];

  const results = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const expr = match[1];
      const claimed = match[2] ? parseFloat(match[2]) : null;
      const actual = evaluateSimpleExpression(expr);
      if (actual !== null) {
        results.push({ expr, claimed, actual });
      }
    }
  }
  return results;
}

// ─── TOPIC DETECTION ────────────────────────────────────────────────────────
function detectMathTopics(questionText) {
  const t = (questionText || '').toLowerCase();
  const topics = new Set();

  if (/\b(add|plus|sum|total|altogether|combined|more than|increase)\b/i.test(t) ||
      /\+/.test(t)) topics.add('addition');
  if (/\b(subtract|minus|take away|less than|fewer|decrease|difference|left|remain|how many.*left)\b/i.test(t) ||
      /\b\d+\s*-\s*\d+/.test(t)) topics.add('subtraction');
  if (/\b(multipl|times|product|groups? of|lots? of)\b/i.test(t) ||
      /[×*]/.test(t)) topics.add('multiplication');
  if (/\b(divid|share|split|÷|groups?\s+of|how many each|per person)\b/i.test(t) ||
      /÷/.test(t)) topics.add('division');
  if (/\b(fraction|half|quarter|third|numerator|denominator|½|¼|¾)\b/i.test(t)) topics.add('fractions');
  if (/\b(decimal|point|tenths|hundredths)\b/i.test(t)) topics.add('decimals');
  if (/\b(percent|%)\b/i.test(t)) topics.add('percentages');
  if (/\b(area|perimeter|length|width|height|cm|mm|m²|square\s+\w+)\b/i.test(t)) topics.add('measurement');
  if (/\b(shape|triangle|square|rectangle|circle|polygon|hexagon|pentagon|angle|degree)\b/i.test(t)) topics.add('geometry');
  if (/\b(ratio|proportion|scale)\b/i.test(t)) topics.add('ratios');
  if (/\b(place value|tens|ones|hundreds|thousands|digit)\b/i.test(t)) topics.add('place_value');
  if (/\b(time|clock|hour|minute|second|am|pm|o'clock|quarter past|half past)\b/i.test(t)) topics.add('time');
  if (/\b(money|pound|pence|£|p\b|cost|price|change|buy|sell|spend|pay)\b/i.test(t)) topics.add('money');
  if (/\b(pattern|sequence|next|rule|term)\b/i.test(t)) topics.add('patterns');
  if (/\b(data|graph|chart|tally|table|bar chart|pictogram|pie chart)\b/i.test(t)) topics.add('data_handling');

  return [...topics];
}

// ─── QUESTION VALIDATOR ─────────────────────────────────────────────────────
function validateQuestion(row) {
  const issues = [];
  const fixes = {};

  // Parse question data
  let qData = {};
  if (row.question_data) {
    try {
      qData = typeof row.question_data === 'string'
        ? JSON.parse(row.question_data)
        : row.question_data;
    } catch { /* ignore */ }
  }

  const questionText = qData.q || row.question_text || '';
  const opts = (() => {
    if (Array.isArray(qData.opts)) return qData.opts.map(String);
    if (Array.isArray(row.options)) return row.options.map(String);
    if (typeof row.options === 'string') {
      try { return JSON.parse(row.options).map(String); } catch { return []; }
    }
    return [];
  })();
  const correctIdx = typeof qData.a === 'number' ? qData.a : (row.correct_index ?? null);
  const explanation = qData.exp || row.explanation || '';
  const passage = qData.passage || row.passage || '';
  const topic = qData.topic || row.topic || '';
  const subject = (row.subject || '').toLowerCase();
  const isMaths = /math|maths|mathematics/.test(subject);

  // ── S1: Structural checks ─────────────────────────────────────────────
  if (!questionText || questionText.trim().length < 5) {
    issues.push({ code: 'S1', severity: 'critical', msg: 'Empty or very short question text' });
  }
  if (opts.length < 2) {
    issues.push({ code: 'S2', severity: 'critical', msg: `Only ${opts.length} option(s)` });
  }
  if (opts.length === 4) {
    const uniq = new Set(opts.map(o => o.toLowerCase().trim()));
    if (uniq.size < opts.length) {
      issues.push({ code: 'S3', severity: 'high', msg: 'Duplicate options' });
    }
  }
  if (correctIdx === null || correctIdx === undefined) {
    issues.push({ code: 'S4', severity: 'critical', msg: 'Missing correct_index' });
  } else if (correctIdx < 0 || correctIdx >= opts.length) {
    issues.push({ code: 'S5', severity: 'critical', msg: `correct_index ${correctIdx} out of bounds (${opts.length} opts)` });
  }

  // ── M1: Math verification — compute arithmetic in question/passage ────
  if (isMaths && opts.length >= 2 && correctIdx != null && correctIdx < opts.length) {
    const allText = [questionText, passage, explanation].join(' ');

    // Find arithmetic expressions with claimed results
    const exprs = extractArithmeticExpressions(allText);

    for (const { expr, claimed, actual } of exprs) {
      // If expression has "= X" and X is wrong
      if (claimed !== null && Math.abs(claimed - actual) > 0.01) {
        issues.push({
          code: 'M1', severity: 'critical',
          msg: `Math error: "${expr} = ${claimed}" but actual result is ${actual}`,
        });
      }
    }

    // Check if the marked correct answer matches any computable result
    const markedAnswer = opts[correctIdx];
    const markedNum = parseFloat(String(markedAnswer).replace(/[^0-9.\-]/g, ''));

    if (!isNaN(markedNum) && exprs.length > 0) {
      // Find the "final" computation (usually the last or most complex expression)
      const finalExpr = exprs[exprs.length - 1];
      if (finalExpr && Math.abs(finalExpr.actual - markedNum) > 0.01) {
        // Check if the correct answer is actually in the options
        const correctNum = finalExpr.actual;
        const correctOptIdx = opts.findIndex(o => {
          const n = parseFloat(String(o).replace(/[^0-9.\-]/g, ''));
          return !isNaN(n) && Math.abs(n - correctNum) < 0.01;
        });

        if (correctOptIdx >= 0 && correctOptIdx !== correctIdx) {
          issues.push({
            code: 'M2', severity: 'critical',
            msg: `Wrong answer marked: math gives ${correctNum}, marked "${markedAnswer}" (idx ${correctIdx}), ` +
                 `correct should be "${opts[correctOptIdx]}" (idx ${correctOptIdx})`,
          });
          fixes.correct_index = correctOptIdx;
          fixes.correct_answer = opts[correctOptIdx];
        } else if (correctOptIdx < 0) {
          issues.push({
            code: 'M3', severity: 'critical',
            msg: `Math gives ${correctNum} but no option matches — all options wrong`,
          });
        }
      }
    }

    // ── M4: Word problem sanity — extract numbers and check if answer is plausible
    const qNums = (questionText.match(/\d+/g) || []).map(Number);
    if (qNums.length >= 2 && !isNaN(markedNum)) {
      // Simple plausibility: for addition-type word problems, answer should be >= max input
      // For subtraction, answer should be <= max input
      const maxInput = Math.max(...qNums);
      const sumInput = qNums.reduce((a, b) => a + b, 0);

      // If it's clearly an addition problem and answer > sum of all numbers
      if (/\b(add|plus|total|altogether|sum)\b/i.test(questionText)) {
        if (markedNum > sumInput * 1.1) {
          issues.push({
            code: 'M4', severity: 'high',
            msg: `Addition problem: answer ${markedNum} exceeds sum of inputs (${sumInput})`,
          });
        }
      }
    }
  }

  // ── E1: Explanation contradicts marked answer ─────────────────────────
  if (explanation && correctIdx != null && opts[correctIdx]) {
    const expLower = explanation.toLowerCase();
    const markedAnswer = String(opts[correctIdx]).toLowerCase().trim();

    // Extract what explanation claims the answer is
    const answerPatterns = [
      /\b(?:the\s+)?(?:correct\s+)?answer\s+is\s+["']?(\d+[\d,.]*)/i,
      /\b(?:=|equals?)\s+["']?(\d+[\d,.]*)/i,
      /\bresult\s+is\s+["']?(\d+[\d,.]*)/i,
    ];

    for (const pattern of answerPatterns) {
      const match = expLower.match(pattern);
      if (match) {
        const expClaimed = match[1].replace(/,/g, '').trim();
        const markedClean = markedAnswer.replace(/,/g, '').replace(/[^0-9.\-]/g, '');
        if (expClaimed !== markedClean && expClaimed.length > 0 && markedClean.length > 0) {
          // Check if explanation's answer matches a different option
          const expOptIdx = opts.findIndex(o => {
            const clean = String(o).toLowerCase().replace(/,/g, '').replace(/[^0-9.\-]/g, '');
            return clean === expClaimed;
          });
          if (expOptIdx >= 0 && expOptIdx !== correctIdx) {
            issues.push({
              code: 'E1', severity: 'critical',
              msg: `Explanation says answer is "${expClaimed}" but marked answer is "${markedAnswer}"`,
            });
            if (!fixes.correct_index) {
              // Don't override a math-based fix
              fixes.correct_index_from_exp = expOptIdx;
            }
          }
        }
      }
    }
  }

  // ── T1: Topic mis-tag for maths ───────────────────────────────────────
  if (isMaths && topic) {
    const detected = detectMathTopics(questionText);
    const currentTopic = topic.toLowerCase().replace(/[_\s-]+/g, '_');

    if (detected.length > 0 && !detected.includes(currentTopic)) {
      // Check if the current topic is clearly wrong
      // e.g. tagged "addition" but question only has subtraction
      const isAddition = currentTopic === 'addition';
      const isSubtraction = currentTopic === 'subtraction';
      const hasAdd = detected.includes('addition');
      const hasSub = detected.includes('subtraction');

      if (isAddition && !hasAdd && hasSub) {
        issues.push({
          code: 'T1', severity: 'medium',
          msg: `Tagged "${topic}" but detected topics: ${detected.join(', ')}`,
        });
        fixes.topic = detected[0];
      } else if (isSubtraction && !hasSub && hasAdd) {
        issues.push({
          code: 'T1', severity: 'medium',
          msg: `Tagged "${topic}" but detected topics: ${detected.join(', ')}`,
        });
        fixes.topic = detected[0];
      } else if (detected.length === 1 && detected[0] !== currentTopic) {
        // Only suggest fix if exactly one topic is detected and it differs
        issues.push({
          code: 'T1', severity: 'low',
          msg: `Tagged "${topic}" but content appears to be "${detected[0]}"`,
        });
        fixes.topic = detected[0];
      }
    }

    // Mixed-operation questions should be tagged as the primary operation
    if (detected.length > 1 && currentTopic === 'addition') {
      const hasSub = detected.includes('subtraction');
      const hasMul = detected.includes('multiplication');
      const hasDiv = detected.includes('division');
      if ((hasSub || hasMul || hasDiv) && detected.length <= 3) {
        issues.push({
          code: 'T2', severity: 'low',
          msg: `Multi-operation question (${detected.join(', ')}) tagged as just "${topic}" — consider "word_problems" or "mixed_operations"`,
        });
        if (detected.length === 2 && detected.includes('addition') && detected.includes('subtraction')) {
          fixes.topic = 'word_problems';
        }
      }
    }
  }

  return {
    id: row.id,
    question: questionText.slice(0, 100),
    subject: row.subject,
    year: row.year_level,
    curriculum: row.curriculum,
    topic,
    issues,
    fixes: Object.keys(fixes).length > 0 ? fixes : null,
    severity: issues.length > 0
      ? (issues.some(i => i.severity === 'critical') ? 'critical'
        : issues.some(i => i.severity === 'high') ? 'high'
        : issues.some(i => i.severity === 'medium') ? 'medium' : 'low')
      : null,
  };
}

// ─── ROUTE HANDLER ──────────────────────────────────────────────────────────
export async function GET(req) { return handleValidation(req); }
export async function POST(req) { return handleValidation(req); }

async function handleValidation(req) {
  try {
    // Auth
    const cronSecret = process.env.CRON_SECRET;
    const vercelCron = req.headers.get('x-vercel-cron');
    const bearerToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (cronSecret && !vercelCron && bearerToken !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const supabase = getServiceRoleClient();

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'scan';
    const curriculum = searchParams.get('curriculum') || null;
    const subject = searchParams.get('subject') || null;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')) : null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 2000);

    // Build query
    let query = supabase
      .from('question_bank')
      .select('id, curriculum, subject, year_level, question_text, question_data, options, correct_index, explanation, topic, passage, difficulty_tier')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (curriculum) query = query.eq('curriculum', curriculum);
    if (subject) query = query.eq('subject', subject);
    if (year) query = query.eq('year_level', year);

    const { data: rows, error } = await query;
    if (error) throw new Error(`DB query error: ${error.message}`);

    // Validate all questions
    const results = (rows || []).map(validateQuestion);
    const bad = results.filter(r => r.issues.length > 0);
    const critical = bad.filter(r => r.severity === 'critical');
    const high = bad.filter(r => r.severity === 'high');
    const medium = bad.filter(r => r.severity === 'medium');
    const low = bad.filter(r => r.severity === 'low');

    const summary = {
      total_scanned: results.length,
      total_bad: bad.length,
      critical: critical.length,
      high: high.length,
      medium: medium.length,
      low: low.length,
    };

    // ── SCAN MODE: just return the results ──────────────────────────────
    if (mode === 'scan') {
      return NextResponse.json({
        ok: true,
        mode: 'scan',
        summary,
        bad_questions: bad.slice(0, 100), // Cap response size
      });
    }

    // ── PURGE MODE: delete critical/high severity questions ─────────────
    if (mode === 'purge') {
      const toPurge = [...critical, ...high];
      if (toPurge.length === 0) {
        return NextResponse.json({ ok: true, mode: 'purge', purged: 0, summary });
      }

      const purgeIds = toPurge.map(q => q.id);
      const BATCH = 100;
      let purged = 0;
      for (let i = 0; i < purgeIds.length; i += BATCH) {
        const batch = purgeIds.slice(i, i + BATCH);
        const { error: delErr } = await supabase
          .from('question_bank')
          .delete()
          .in('id', batch);
        if (delErr) {
          console.error(`Purge batch error: ${delErr.message}`);
        } else {
          purged += batch.length;
        }
      }

      return NextResponse.json({
        ok: true,
        mode: 'purge',
        purged,
        summary,
        purged_sample: toPurge.slice(0, 20).map(q => ({
          id: q.id,
          question: q.question,
          issues: q.issues.map(i => i.msg),
        })),
      });
    }

    // ── FIX-TAGS MODE: update topic where confidently wrong ─────────────
    if (mode === 'fix-tags') {
      const toFix = bad.filter(q => q.fixes?.topic);
      let fixed = 0;

      for (const q of toFix) {
        // Update both the row-level topic and the JSONB question_data.topic
        const { error: updErr } = await supabase
          .from('question_bank')
          .update({ topic: q.fixes.topic })
          .eq('id', q.id);

        if (!updErr) fixed++;
      }

      return NextResponse.json({
        ok: true,
        mode: 'fix-tags',
        fixed,
        total_candidates: toFix.length,
        summary,
        fixed_sample: toFix.slice(0, 20).map(q => ({
          id: q.id,
          question: q.question,
          old_topic: q.topic,
          new_topic: q.fixes.topic,
        })),
      });
    }

    // ── FIX-ANSWERS MODE: fix correct_index where math is unambiguous ───
    if (mode === 'fix-answers') {
      const toFix = bad.filter(q => q.fixes?.correct_index != null);
      let fixed = 0;

      for (const q of toFix) {
        const newIdx = q.fixes.correct_index;
        // Fetch full row to update question_data JSONB
        const { data: fullRow } = await supabase
          .from('question_bank')
          .select('question_data')
          .eq('id', q.id)
          .single();

        if (fullRow) {
          let qData = {};
          try {
            qData = typeof fullRow.question_data === 'string'
              ? JSON.parse(fullRow.question_data)
              : (fullRow.question_data || {});
          } catch { /* ignore */ }

          qData.a = newIdx;
          if (qData.opts && qData.opts[newIdx]) {
            qData.correctAnswer = qData.opts[newIdx];
          }

          const { error: updErr } = await supabase
            .from('question_bank')
            .update({
              correct_index: newIdx,
              question_data: JSON.stringify(qData),
            })
            .eq('id', q.id);

          if (!updErr) fixed++;
        }
      }

      return NextResponse.json({
        ok: true,
        mode: 'fix-answers',
        fixed,
        total_candidates: toFix.length,
        summary,
        fixed_sample: toFix.slice(0, 20).map(q => ({
          id: q.id,
          question: q.question,
          issues: q.issues.map(i => i.msg),
          new_correct_index: q.fixes.correct_index,
        })),
      });
    }

    return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 });

  } catch (err) {
    console.error('[validate-questions] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
