/**
 * Minimal className combiner — joins truthy class values with a space.
 * Kept dependency-free; swap for `clsx`/`tailwind-merge` only if a real need appears.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
