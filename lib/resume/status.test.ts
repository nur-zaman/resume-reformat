import { describe, expect, it } from "vitest";
import type { ReviewItem } from "./schema";
import { pendingReviewCount, tailoredStatusFor } from "./status";

function reviewItem(status: ReviewItem["status"]): ReviewItem {
  return {
    id: "00000000-0000-4000-8000-000000000000",
    targetContentId: "c-1",
    kind: "ai_proposed_claim",
    reason: "Proposed for the job",
    status,
    originalText: "",
    ...(status === "pending" ? {} : { resolvedAt: "2026-06-24T00:00:00.000Z" }),
  };
}

describe("pendingReviewCount", () => {
  it("counts only pending items", () => {
    expect(pendingReviewCount([])).toBe(0);
    expect(
      pendingReviewCount([
        reviewItem("pending"),
        reviewItem("accepted"),
        reviewItem("pending"),
        reviewItem("dismissed"),
      ]),
    ).toBe(2);
  });
});

describe("tailoredStatusFor", () => {
  it("is 'review' whenever a proposal is still pending, regardless of intent", () => {
    expect(tailoredStatusFor([reviewItem("pending")])).toBe("review");
    expect(tailoredStatusFor([reviewItem("pending")], "draft")).toBe("review");
    expect(tailoredStatusFor([reviewItem("pending"), reviewItem("accepted")], "finalize")).toBe(
      "review",
    );
  });

  it("finalizes to 'ready' when nothing is pending", () => {
    expect(tailoredStatusFor([])).toBe("ready");
    expect(tailoredStatusFor([reviewItem("accepted"), reviewItem("dismissed")])).toBe("ready");
  });

  it("parks to 'draft' on a draft save when nothing is pending", () => {
    expect(tailoredStatusFor([], "draft")).toBe("draft");
    expect(tailoredStatusFor([reviewItem("accepted")], "draft")).toBe("draft");
  });
});
