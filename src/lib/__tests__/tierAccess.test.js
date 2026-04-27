/**
 * tierAccess.test.js
 *
 * Tests for the tier access control module. Revenue-critical — any regression
 * here can either over-gate paying customers or unlock features for free users.
 *
 * Covers: hasFeature, getLimit, canAddScholar, checkQuota,
 *         curriculumIsNigerian, regionFromCurriculum, isTierAllowedInRegion
 */

import { describe, it, expect } from 'vitest';
import {
  hasFeature,
  getLimit,
  canAddScholar,
  checkQuota,
  curriculumIsNigerian,
  regionFromCurriculum,
} from '../tierAccess.js';

// ── Test parent fixtures ───────────────────────────────────────────────────────

const freeGB = { region: 'GB', subscription_tier: 'free', ng_addons: [] };
const freeNG = { region: 'NG', subscription_tier: 'free', ng_addons: [] };
const scholar = { region: 'NG', subscription_tier: 'ng_scholar', ng_addons: [] };
const scholarWaec = { region: 'NG', subscription_tier: 'ng_scholar', ng_addons: ['waec_boost'] };
const scholarAiUnlimited = { region: 'NG', subscription_tier: 'ng_scholar', ng_addons: ['ai_unlimited'] };
const scholarFamily2 = { region: 'NG', subscription_tier: 'ng_scholar', ng_addons: ['family_child'] };
const ukPro = { region: 'GB', subscription_tier: 'uk_pro', ng_addons: [] };
const ukProExam = { region: 'GB', subscription_tier: 'uk_pro_exam', ng_addons: [] };

// ─────────────────────────────────────────────────────────────────────────────
describe('hasFeature — GB free', () => {
  it('free GB has no boss_battles', () => {
    expect(hasFeature(freeGB, 'boss_battles')).toBe(false);
  });
  it('free GB has no simulations_3d', () => {
    expect(hasFeature(freeGB, 'simulations_3d')).toBe(false);
  });
  it('free GB has no offline_mode', () => {
    expect(hasFeature(freeGB, 'offline_mode')).toBe(false);
  });
  it('free GB has 0 exam_papers — falsy', () => {
    expect(hasFeature(freeGB, 'exam_papers')).toBe(false);
  });
  it('free GB has 10 daily_questions — truthy', () => {
    expect(hasFeature(freeGB, 'daily_questions')).toBe(true);
  });
  it('free GB scholars_max is 1 — truthy', () => {
    expect(hasFeature(freeGB, 'scholars_max')).toBe(true);
  });
  it('unknown feature returns false', () => {
    expect(hasFeature(freeGB, 'made_up_feature')).toBe(false);
  });
  it('null parent returns false', () => {
    expect(hasFeature(null, 'boss_battles')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('hasFeature — NG free', () => {
  it('NG free has no boss_battles', () => {
    expect(hasFeature(freeNG, 'boss_battles')).toBe(false);
  });
  it('NG free has 0 feedback_monthly', () => {
    expect(hasFeature(freeNG, 'feedback_monthly')).toBe(false);
  });
  it('NG free has 10 daily_questions — truthy', () => {
    expect(hasFeature(freeNG, 'daily_questions')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('hasFeature — ng_scholar base', () => {
  it('ng_scholar has boss_battles', () => {
    expect(hasFeature(scholar, 'boss_battles')).toBe(true);
  });
  it('ng_scholar has simulations_3d', () => {
    expect(hasFeature(scholar, 'simulations_3d')).toBe(true);
  });
  it('ng_scholar has offline_mode', () => {
    expect(hasFeature(scholar, 'offline_mode')).toBe(true);
  });
  it('ng_scholar has exam_papers (20)', () => {
    expect(hasFeature(scholar, 'exam_papers')).toBe(true);
  });
  it('ng_scholar has 50/mo feedback cap — truthy', () => {
    expect(hasFeature(scholar, 'feedback_monthly')).toBe(true);
  });
  it('ng_scholar scholars_max is 1 base', () => {
    expect(getLimit(scholar, 'scholars_max')).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('hasFeature — ng_scholar + waec_boost add-on', () => {
  it('waec_boost removes feedback_monthly cap (→ Infinity)', () => {
    expect(getLimit(scholarWaec, 'feedback_monthly')).toBe(Infinity);
  });
  it('waec_boost gives full_paper_level analytics', () => {
    expect(getLimit(scholarWaec, 'dashboard_analytics')).toBe('full_paper_level');
  });
  it('boss_battles still true with waec_boost', () => {
    expect(hasFeature(scholarWaec, 'boss_battles')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('hasFeature — ng_scholar + ai_unlimited add-on', () => {
  it('ai_unlimited removes feedback cap (→ Infinity)', () => {
    expect(getLimit(scholarAiUnlimited, 'feedback_monthly')).toBe(Infinity);
  });
  it('analytics unchanged without waec_boost', () => {
    // ai_unlimited doesn't add paper-level analytics
    expect(getLimit(scholarAiUnlimited, 'dashboard_analytics')).toBe('full');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('hasFeature — UK paid tiers', () => {
  it('uk_pro has boss_battles', () => {
    expect(hasFeature(ukPro, 'boss_battles')).toBe(true);
  });
  it('uk_pro has unlimited daily_questions', () => {
    expect(getLimit(ukPro, 'daily_questions')).toBe(Infinity);
  });
  it('uk_pro has 0 exam_papers (wrong: exam tier needed)', () => {
    expect(getLimit(ukPro, 'exam_papers')).toBe(0);
  });
  it('uk_pro_exam has unlimited exam_papers', () => {
    expect(getLimit(ukProExam, 'exam_papers')).toBe(Infinity);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('getLimit', () => {
  it('free GB daily_questions = 10', () => {
    expect(getLimit(freeGB, 'daily_questions')).toBe(10);
  });
  it('ng_scholar exam_papers = 20', () => {
    expect(getLimit(scholar, 'exam_papers')).toBe(20);
  });
  it('ng_scholar + waec_boost feedback_monthly = Infinity', () => {
    expect(getLimit(scholarWaec, 'feedback_monthly')).toBe(Infinity);
  });
  it('unknown feature returns 0', () => {
    expect(getLimit(freeGB, 'does_not_exist')).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('canAddScholar', () => {
  it('free parent at 1 scholar cannot add another (max 1)', () => {
    expect(canAddScholar(freeNG, 1)).toBe(false);
  });
  it('free parent at 0 scholars can add one', () => {
    expect(canAddScholar(freeNG, 0)).toBe(true);
  });
  it('ng_scholar base at 1 scholar cannot add (max 1)', () => {
    expect(canAddScholar(scholar, 1)).toBe(false);
  });
  it('ng_scholar + family_child at 1 scholar CAN add (max becomes 2)', () => {
    expect(canAddScholar(scholarFamily2, 1)).toBe(true);
  });
  it('ng_scholar + family_child at 2 scholars cannot add', () => {
    expect(canAddScholar(scholarFamily2, 2)).toBe(false);
  });
  it('uk_pro at 2 scholars CAN add (max 3)', () => {
    expect(canAddScholar(ukPro, 2)).toBe(true);
  });
  it('uk_pro at 3 scholars cannot add', () => {
    expect(canAddScholar(ukPro, 3)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('checkQuota', () => {
  it('free NG: feedback_monthly=0, used=0 → not allowed', () => {
    const result = checkQuota(freeNG, 'feedback_monthly', 0);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('ng_scholar: feedback_monthly=50, used=49 → allowed, 1 remaining', () => {
    const result = checkQuota(scholar, 'feedback_monthly', 49);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
    expect(result.unlimited).toBe(false);
  });

  it('ng_scholar: feedback_monthly=50, used=50 → not allowed', () => {
    const result = checkQuota(scholar, 'feedback_monthly', 50);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('ng_scholar + waec_boost: unlimited feedback → always allowed', () => {
    const result = checkQuota(scholarWaec, 'feedback_monthly', 9999);
    expect(result.allowed).toBe(true);
    expect(result.unlimited).toBe(true);
    expect(result.remaining).toBe(Infinity);
  });

  it('treats negative usedThisPeriod as 0', () => {
    const result = checkQuota(scholar, 'feedback_monthly', -5);
    expect(result.used).toBe(0);
    expect(result.remaining).toBe(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('curriculumIsNigerian', () => {
  it('ng_primary → true', () => expect(curriculumIsNigerian('ng_primary')).toBe(true));
  it('ng_jss → true',     () => expect(curriculumIsNigerian('ng_jss')).toBe(true));
  it('ng_sss → true',     () => expect(curriculumIsNigerian('ng_sss')).toBe(true));
  it('uk_national → false', () => expect(curriculumIsNigerian('uk_national')).toBe(false));
  it('uk_11plus → false',   () => expect(curriculumIsNigerian('uk_11plus')).toBe(false));
  it('ib_pyp → false',      () => expect(curriculumIsNigerian('ib_pyp')).toBe(false));
  it('empty string → false', () => expect(curriculumIsNigerian('')).toBe(false));
  it('null → false',         () => expect(curriculumIsNigerian(null)).toBe(false));
  it('uppercase NG_JSS → true (case-insensitive)', () =>
    expect(curriculumIsNigerian('NG_JSS')).toBe(true));
});

// ─────────────────────────────────────────────────────────────────────────────
describe('regionFromCurriculum', () => {
  it('ng_primary → NG', () => expect(regionFromCurriculum('ng_primary')).toBe('NG'));
  it('ng_jss → NG',     () => expect(regionFromCurriculum('ng_jss')).toBe('NG'));
  it('uk_national → GB', () => expect(regionFromCurriculum('uk_national')).toBe('GB'));
  it('null → GB',        () => expect(regionFromCurriculum(null)).toBe('GB'));
  it('ib_pyp → GB',      () => expect(regionFromCurriculum('ib_pyp')).toBe('GB'));
});
