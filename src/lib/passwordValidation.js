/**
 * passwordValidation.js — Shared password strength rules
 *
 * Used by: signup page, reset-password page
 * Passwords are hashed by Supabase Auth (bcrypt) — never stored in app.
 * This module enforces client-side strength requirements before submission.
 */

const MIN_LENGTH = 8;

const RULES = [
  { id: "length", test: (p) => p.length >= MIN_LENGTH, label: `At least ${MIN_LENGTH} characters` },
  { id: "upper", test: (p) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { id: "lower", test: (p) => /[a-z]/.test(p), label: "One lowercase letter" },
  { id: "digit", test: (p) => /\d/.test(p), label: "One number" },
];

/**
 * Validate a password against all rules.
 * @param {string} password
 * @returns {{ valid: boolean, errors: string[], passed: string[] }}
 */
export function validatePassword(password) {
  const errors = [];
  const passed = [];

  for (const rule of RULES) {
    if (rule.test(password)) {
      passed.push(rule.label);
    } else {
      errors.push(rule.label);
    }
  }

  return { valid: errors.length === 0, errors, passed };
}

/**
 * Get a human-readable strength label.
 * @param {string} password
 * @returns {"weak" | "fair" | "strong"}
 */
export function passwordStrength(password) {
  const { passed } = validatePassword(password);
  if (passed.length <= 1) return "weak";
  if (passed.length <= 3) return "fair";
  return "strong";
}

/**
 * Single-line error message for form validation.
 * @param {string} password
 * @returns {string | null} Error message or null if valid
 */
export function passwordError(password) {
  const { valid, errors } = validatePassword(password);
  if (valid) return null;
  return `Password needs: ${errors.join(", ").toLowerCase()}`;
}
