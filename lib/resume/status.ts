import type { ReviewItem } from "./schema";

/**
 * Tailored-resume status model (M6-lite).
 *
 * A resume is either a `base` resume (edited directly) or a `tailored` resume produced for a
 * specific job. Only tailored resumes carry a lifecycle status, derived from their persisted
 * review items so the dashboard's "Tailored jobs" table and the editor stay in agreement:
 *
 *   - `review` — at least one AI proposal is still pending the user's decision.
 *   - `ready`  — every proposal is resolved; the resume is exportable.
 *   - `draft`  — parked with nothing pending (e.g. a tailoring saved before it was finished,
 *                or one that produced no proposals at all).
 *
 * Pure (no IDs, no DB) so the create/save server actions and unit tests share one source of
 * truth. See [[m5-tailoring]] for where these resumes come from.
 */
export type ResumeKind = "base" | "tailored";
export type TailoredStatus = "draft" | "review" | "ready";

/** How many AI proposals still need a decision. */
export function pendingReviewCount(reviewItems: readonly ReviewItem[]): number {
  return reviewItems.reduce((n, item) => (item.status === "pending" ? n + 1 : n), 0);
}

/**
 * Resolve a tailored resume's status from its review items and the user's save intent.
 *
 * Pending proposals always win (the resume can't be "ready" with unresolved claims). With
 * nothing pending, a `finalize` save lands on `ready` while a `draft` save parks it as
 * `draft` — this is what makes all three states reachable from the tailoring flow.
 */
export function tailoredStatusFor(
  reviewItems: readonly ReviewItem[],
  intent: "finalize" | "draft" = "finalize",
): TailoredStatus {
  if (pendingReviewCount(reviewItems) > 0) return "review";
  return intent === "draft" ? "draft" : "ready";
}
