// Capped at 72 bytes - bcrypt's (and Supabase's) hard limit, not an arbitrary choice.
export function isValidPassword(value: string): boolean {
  return typeof value === "string" && value.length >= 8 && value.length <= 72;
}
