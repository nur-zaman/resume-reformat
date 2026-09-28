import { migrate } from "./migrate";
import type { ResumeDoc } from "./schema";

/**
 * Resolve a stored `resumes.doc` value for rendering or editing.
 *
 * - valid → `ok` with the migrated, hard-validated doc.
 * - missing, corrupt, or unsupported → `error`, so the page can show a first-class
 *   load-error state. The caller must NOT overwrite the stored value in this case, so
 *   the last valid resume is preserved.
 *
 * `migrate` both walks the schema version forward and ends in `ResumeDocSchema.parse`,
 * so a successful return is already fully validated.
 */
export type StoredResumeResolution =
  | { kind: "ok"; doc: ResumeDoc }
  | { kind: "error" };

export function resolveStoredResume(raw: unknown): StoredResumeResolution {
  if (raw == null) return { kind: "error" };
  try {
    return { kind: "ok", doc: migrate(raw) };
  } catch {
    return { kind: "error" };
  }
}
