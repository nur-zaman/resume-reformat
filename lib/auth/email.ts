/**
 * Email normalization + validation. Pure functions (unit-tested) so the same rule
 * is applied at sign-in, in the allowlist comparison, and in SQL (lower(trim(...))).
 */

/** Trim surrounding whitespace and lowercase. Matches the SQL normalization. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// Pragmatic single-line check: non-empty local part, an @, a dotted domain.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True when `value` looks like a syntactically valid email after normalization. */
export function isValidEmail(value: string): boolean {
  const email = normalizeEmail(value);
  return email.length <= 254 && EMAIL_RE.test(email);
}
