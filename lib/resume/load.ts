import { migrate } from "./migrate";
import type { ResumeDoc } from "./schema";

/**
 * Resolve a stored `profiles.base_resume` value for the editor (M4).
 *
 * - `null`/absent → the user has not onboarded yet → `redirect-onboarding`.
 * - present and valid → `ok` with the migrated, hard-validated doc.
 * - present but corrupt/unsupported → `error`, so the page can show a first-class
 *   load-error state. The caller must NOT overwrite the stored value in this case, so
 *   the last valid base resume is preserved (FR-8).
 *
 * `migrate` both walks the schema version forward and ends in `ResumeDocSchema.parse`,
 * so a successful return is already fully validated.
 */
export type StoredResumeResolution =
  | { kind: "redirect-onboarding" }
  | { kind: "ok"; doc: ResumeDoc }
  | { kind: "error" };

export function resolveStoredResume(raw: unknown): StoredResumeResolution {
  if (raw == null) return { kind: "redirect-onboarding" };
  try {
    return { kind: "ok", doc: migrate(raw) };
  } catch {
    return { kind: "error" };
  }
}
