import { migrate } from "./migrate";
import type { ResumeDoc } from "./schema";

// On error, the caller must not overwrite the stored value — preserve the last valid resume.
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
