import type { ReviewItem } from "./schema";

export type ResumeKind = "base" | "tailored";
export const TAILORED_STATUSES = ["draft", "review", "ready"] as const;
export type TailoredStatus = (typeof TAILORED_STATUSES)[number];

export function parseTailoredStatus(value: unknown): TailoredStatus {
  return TAILORED_STATUSES.includes(value as TailoredStatus) ? (value as TailoredStatus) : "ready";
}

export function pendingReviewCount(reviewItems: readonly ReviewItem[]): number {
  return reviewItems.reduce((n, item) => (item.status === "pending" ? n + 1 : n), 0);
}

export function tailoredStatusFor(
  reviewItems: readonly ReviewItem[],
  intent: "finalize" | "draft" = "finalize",
): TailoredStatus {
  if (pendingReviewCount(reviewItems) > 0) return "review";
  return intent === "draft" ? "draft" : "ready";
}
