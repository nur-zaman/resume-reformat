/**
 * Password policy for invite-only sign-in. Minimum 8 characters; capped at 72 bytes
 * because that is bcrypt's (and Supabase's) hard limit. Kept pure and tested so the
 * rule is enforced consistently client- and server-side.
 */
export function isValidPassword(value: string): boolean {
  return typeof value === "string" && value.length >= 8 && value.length <= 72;
}
