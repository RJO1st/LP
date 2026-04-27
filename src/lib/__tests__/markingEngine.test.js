/**
 * markingEngine.test.js
 *
 * Tests for the pure, deterministic functions in markingEngine.js.
 * AI-backed functions (markWithAI, markSitting) are excluded here —
 * their integration is covered by manual QA and future e2e tests.
 *
 * Pure functions under test:
 *   levenshtein, normalizeAnswer, parseNumericAnswer,
 *   isNumericMatch, markDeterministic (MCQ + numeric + short-answer paths)
 */

import { describe, it, expect, vi } from 'vitest';

// Mock external dependencies that markingEngine imports at module level.
// These are not exercised in the pure-function tests but must resolve.
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: vi.fn() } },
  })),
}));

vi.mock('@/lib/examRAG', () => ({
  getMarkSchemeContext: vi.fn().mockResolvedValue(''),
}));

vi.mock('@/lib/calculationUtils', () => ({
  calculatePercentage: vi.fn((a, b) => (b === 0 ? 0 : (a / b) * 100)),
}));

import {
  levenshtein,
  normalizeAnswer,
  parseNumericAnswer,
  isNumericMatch,
  markDeterministic,
} from '../markingEngine.js';

// ─────────────────────────────────────────────────────────────────────────────
describe('levenshtein', () => {
  it('identical strings → 0', () => {
    expect(levenshtein('hello', 'hello')).toBe(0);
  });
  it('empty strings → 0', () => {
    expect(levenshtein('', '')).toBe(0);
  });
  it('one empty string → length of other', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });
  it('single substitution', () => {
    expect(levenshtein('cat', 'bat')).toBe(1);
  });
  it('single insertion', () => {
    expect(levenshtein('cat', 'cats')).toBe(1);
  });
  it('single deletion', () => {
    expect(levenshtein('cats', 'cat')).toBe(1);
  });
  it('classic kitten→sitting', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });
  it('completely different words', () => {
    expect(levenshtein('abc', 'xyz')).toBe(3);
  });
  it('common typo: teh → the', () => {
    expect(levenshtein('teh', 'the')).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('normalizeAnswer', () => {
  it('lowercases input', () => {
    expect(normalizeAnswer('HELLO')).toBe('hello');
  });
  it('trims leading/trailing whitespace', () => {
    expect(normalizeAnswer('  hello  ')).toBe('hello');
  });
  it('collapses internal spaces', () => {
    expect(normalizeAnswer('hello   world')).toBe('hello world');
  });
  it('removes punctuation: comma, period, exclamation, question mark', () => {
    expect(normalizeAnswer('Hello, world!')).toBe('hello world');
    expect(normalizeAnswer('Is it correct?')).toBe('is it correct');
  });
  it('returns empty string for null', () => {
    expect(normalizeAnswer(null)).toBe('');
  });
  it('returns empty string for empty string', () => {
    expect(normalizeAnswer('')).toBe('');
  });
  it('returns empty string for non-string', () => {
    expect(normalizeAnswer(42)).toBe('');
  });
  it('preserves "and" within text', () => {
    expect(normalizeAnswer('bread and butter')).toBe('bread and butter');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('parseNumericAnswer', () => {
  it('parses integer string', () => {
    expect(parseNumericAnswer('42')).toBe(42);
  });
  it('parses decimal string', () => {
    expect(parseNumericAnswer('3.14')).toBeCloseTo(3.14);
  });
  it('parses percentage (35% → 0.35)', () => {
    expect(parseNumericAnswer('35%')).toBeCloseTo(0.35);
  });
  it('parses fraction (7/2 → 3.5)', () => {
    expect(parseNumericAnswer('7/2')).toBeCloseTo(3.5);
  });
  it('parses simple scientific notation (1.5e3 → 1500)', () => {
    expect(parseNumericAnswer('1.5e3')).toBeCloseTo(1500);
  });
  it('returns null for non-numeric text', () => {
    expect(parseNumericAnswer('hello')).toBeNull();
  });
  it('returns null for null input', () => {
    expect(parseNumericAnswer(null)).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(parseNumericAnswer('')).toBeNull();
  });
  it('returns null for Infinity', () => {
    expect(parseNumericAnswer('Infinity')).toBeNull();
  });
  it('division by zero fraction returns null', () => {
    expect(parseNumericAnswer('5/0')).toBeNull();
  });
  it('negative number', () => {
    expect(parseNumericAnswer('-7')).toBe(-7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('isNumericMatch', () => {
  it('exact match returns true', () => {
    expect(isNumericMatch(42, 42)).toBe(true);
  });
  it('within ±0.5% tolerance returns true', () => {
    // 100 × 0.005 = 0.5 tolerance
    expect(isNumericMatch(100.4, 100)).toBe(true);
    expect(isNumericMatch(99.6, 100)).toBe(true);
  });
  it('outside tolerance returns false', () => {
    expect(isNumericMatch(101, 100)).toBe(false);
  });
  it('zero expected: exact match only', () => {
    expect(isNumericMatch(0, 0)).toBe(true);
    expect(isNumericMatch(0.001, 0)).toBe(false);
  });
  it('negative values: exact match', () => {
    expect(isNumericMatch(-5, -5)).toBe(true);
  });
  it('NaN input returns false', () => {
    expect(isNumericMatch(NaN, 42)).toBe(false);
    expect(isNumericMatch(42, NaN)).toBe(false);
  });
  it('Infinity input returns false', () => {
    expect(isNumericMatch(Infinity, 42)).toBe(false);
  });
  it('custom tolerance respected', () => {
    // 10% tolerance on 100 → allows up to 10
    expect(isNumericMatch(108, 100, 0.10)).toBe(true);
    expect(isNumericMatch(115, 100, 0.10)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('markDeterministic — MCQ', () => {
  const mcqQuestion = {
    question_type: 'mcq',
    correct_mcq_index: 2,
    marks: 1,
    acceptable_answers: null,
    mark_breakdown: null,
    options: ['A', 'B', 'C', 'D'],
  };

  it('correct MCQ index → full marks', () => {
    const result = markDeterministic(mcqQuestion, null, { mcqSelectedIndex: 2 });
    expect(result.is_correct).toBe(true);
    expect(result.marks_awarded).toBe(1);
  });

  it('wrong MCQ index → zero marks', () => {
    const result = markDeterministic(mcqQuestion, null, { mcqSelectedIndex: 0 });
    expect(result.is_correct).toBe(false);
    expect(result.marks_awarded).toBe(0);
  });

  it('MCQ with string answer matching index → correct', () => {
    // ExamRunner sometimes sends '2' as string
    const result = markDeterministic(mcqQuestion, '2', {});
    expect(result.is_correct).toBe(true);
  });

  it('MCQ with null correct_mcq_index → 0 marks, reason set', () => {
    const q = { ...mcqQuestion, correct_mcq_index: null };
    const result = markDeterministic(q, null, { mcqSelectedIndex: 0 });
    expect(result.marks_awarded).toBe(0);
    expect(result.reason).toBeTruthy();
  });

  it('question with no mark scheme → 0 marks', () => {
    const q = {
      question_type: 'short_answer',
      marks: 2,
      acceptable_answers: null,
      mark_breakdown: null,
      correct_mcq_index: null,
    };
    const result = markDeterministic(q, 'some answer', {});
    expect(result.marks_awarded).toBe(0);
    expect(result.reason).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('markDeterministic — numeric', () => {
  const numericQuestion = {
    question_type: 'numeric',
    marks: 2,
    correct_mcq_index: null,
    mark_breakdown: null,
    acceptable_answers: { exact: '42', tolerance: 0.005 },
  };

  it('exact numeric answer → full marks', () => {
    const result = markDeterministic(numericQuestion, '42', {});
    expect(result.is_correct).toBe(true);
    expect(result.marks_awarded).toBe(2);
  });

  it('within-tolerance numeric answer → full marks', () => {
    const result = markDeterministic(numericQuestion, '42.1', {});
    expect(result.is_correct).toBe(true);
  });

  it('out-of-tolerance numeric answer → 0 marks', () => {
    const result = markDeterministic(numericQuestion, '50', {});
    expect(result.is_correct).toBe(false);
    expect(result.marks_awarded).toBe(0);
  });

  it('non-parseable text for numeric question → 0 marks', () => {
    const result = markDeterministic(numericQuestion, 'forty two', {});
    expect(result.is_correct).toBe(false);
    expect(result.marks_awarded).toBe(0);
  });
});
