/**
 * calculationUtils.js — Shared calculation helpers
 *
 * Centralises common calculations (accuracy percentages, safe division)
 * used across quiz engines, dashboards, analytics, and reporting.
 *
 * Usage:
 *   import { calculatePercentage, calculateAccuracy } from '@/lib/calculationUtils';
 *   const pct = calculatePercentage(correct, total);          // → 0–100
 *   const acc = calculateAccuracy(correct, total);            // → 0–100 (alias)
 *   const ratio = safeDivide(numerator, denominator, 0);      // → number
 */

/**
 * Safe division — returns fallback when denominator is zero or non-numeric.
 * @param {number} numerator
 * @param {number} denominator
 * @param {number} [fallback=0]
 * @returns {number}
 */
export function safeDivide(numerator, denominator, fallback = 0) {
  if (!denominator || !Number.isFinite(denominator) || denominator === 0) {
    return fallback;
  }
  return numerator / denominator;
}

/**
 * Calculate a rounded percentage (0–100) with zero-division protection.
 * @param {number} numerator   — e.g. correct answers
 * @param {number} denominator — e.g. total questions
 * @param {number} [fallback=0] — returned when denominator is 0
 * @returns {number} Integer 0–100
 */
export function calculatePercentage(numerator, denominator, fallback = 0) {
  if (!denominator || denominator === 0) return fallback;
  return Math.round((numerator / denominator) * 100);
}

/**
 * Alias for calculatePercentage — reads better in quiz/mastery contexts.
 * @param {number} correct
 * @param {number} total
 * @returns {number} Integer 0–100
 */
export function calculateAccuracy(correct, total) {
  return calculatePercentage(correct, total, 0);
}

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Validate that an index is within array bounds.
 * @param {number} index
 * @param {Array} array
 * @returns {boolean}
 */
export function isValidIndex(index, array) {
  return (
    typeof index === "number" &&
    Number.isFinite(index) &&
    index >= 0 &&
    index < (array?.length ?? 0)
  );
}

/**
 * Return a safe index — falls back to 0 if out of bounds.
 * @param {number} index
 * @param {Array} array
 * @param {number} [fallback=0]
 * @returns {number}
 */
export function safeIndex(index, array, fallback = 0) {
  return isValidIndex(index, array) ? index : fallback;
}
