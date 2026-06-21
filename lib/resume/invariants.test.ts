import { describe, expect, it } from "vitest";
import {
  collectAllIds,
  collectContentIds,
  exactlyOneHeaderFirst,
  noOrphanedPendingReviewItems,
  reviewItemStatusCoherent,
  uniqueIds,
} from "./invariants";
import { createBlock, createEmptyResumeDoc } from "./factory";
import { newId } from "./ids";
import type { ResumeDoc, ReviewItem } from "./schema";

function bulletWithContentId(contentId: string) {
  return {
    type: "doc" as const,
    content: [
      {
        type: "bulletList" as const,
        attrs: { contentId },
        content: [
          {
            type: "listItem" as const,
            content: [
              { type: "paragraph" as const, content: [{ type: "text" as const, text: "x" }] },
            ],
          },
        ],
      },
    ],
  };
}

describe("exactlyOneHeaderFirst", () => {
  it("passes for a header-first document", () => {
    expect(exactlyOneHeaderFirst(createEmptyResumeDoc())).toEqual([]);
  });

  it("flags a document whose first block is not the header", () => {
    const doc = createEmptyResumeDoc();
    const reordered: ResumeDoc = {
      ...doc,
      blocks: [createBlock("summary"), doc.blocks[0]],
    };
    expect(exactlyOneHeaderFirst(reordered).length).toBeGreaterThan(0);
  });

  it("flags two header blocks", () => {
    const doc = createEmptyResumeDoc();
    const twoHeaders: ResumeDoc = { ...doc, blocks: [doc.blocks[0], doc.blocks[0]] };
    expect(exactlyOneHeaderFirst(twoHeaders).some((i) => i.message.includes("exactly one"))).toBe(
      true,
    );
  });

  it("flags a document with no blocks", () => {
    expect(exactlyOneHeaderFirst({ schemaVersion: 1, blocks: [] }).length).toBeGreaterThan(0);
  });
});

describe("uniqueIds", () => {
  it("passes for distinct ids", () => {
    const doc = createEmptyResumeDoc();
    doc.blocks.push(createBlock("summary"), createBlock("skills"));
    expect(uniqueIds(doc)).toEqual([]);
  });

  it("flags a duplicate block id", () => {
    const doc = createEmptyResumeDoc();
    const dupe = createBlock("summary");
    doc.blocks.push(dupe, { ...dupe });
    expect(uniqueIds(doc).some((i) => i.message.includes("Duplicate id"))).toBe(true);
  });

  it("flags a duplicate content id", () => {
    const shared = newId();
    const doc = createEmptyResumeDoc();
    doc.blocks.push(
      { id: newId(), type: "summary", title: "A", visible: true, body: bulletWithContentId(shared) },
      { id: newId(), type: "richtext", title: "B", visible: true, body: bulletWithContentId(shared) },
    );
    expect(uniqueIds(doc).some((i) => i.message.includes("content id"))).toBe(true);
  });
});

describe("collectAllIds / collectContentIds", () => {
  it("collects block, entry, and nested ids but not content ids", () => {
    const doc = createEmptyResumeDoc();
    const summary = createBlock("summary");
    doc.blocks.push(summary);
    const ids = collectAllIds(doc);
    expect(ids).toContain(doc.blocks[0].id);
    expect(ids).toContain(summary.id);
  });

  it("collects content ids from rich-text bodies", () => {
    const cid = newId();
    const doc: ResumeDoc = {
      schemaVersion: 1,
      blocks: [
        createEmptyResumeDoc().blocks[0],
        { id: newId(), type: "summary", title: "S", visible: true, body: bulletWithContentId(cid) },
      ],
    };
    expect(collectContentIds(doc)).toEqual([cid]);
  });
});

describe("noOrphanedPendingReviewItems", () => {
  const cid = newId();
  const doc: ResumeDoc = {
    schemaVersion: 1,
    blocks: [
      createEmptyResumeDoc().blocks[0],
      { id: newId(), type: "summary", title: "S", visible: true, body: bulletWithContentId(cid) },
    ],
  };

  it("passes when a pending item targets an existing content id", () => {
    const items: ReviewItem[] = [
      { id: newId(), targetContentId: cid, kind: "ai_proposed_claim", reason: "r", status: "pending", originalText: "" },
    ];
    expect(noOrphanedPendingReviewItems(doc, items)).toEqual([]);
  });

  it("flags a pending item that targets a missing content id", () => {
    const items: ReviewItem[] = [
      { id: newId(), targetContentId: "missing", kind: "ai_proposed_claim", reason: "r", status: "pending", originalText: "" },
    ];
    expect(noOrphanedPendingReviewItems(doc, items).length).toBe(1);
  });

  it("ignores accepted/dismissed items targeting missing content", () => {
    const items: ReviewItem[] = [
      { id: newId(), targetContentId: "missing", kind: "ai_proposed_claim", reason: "r", status: "accepted", originalText: "", resolvedAt: new Date(0).toISOString() },
      { id: newId(), targetContentId: "missing", kind: "ai_proposed_claim", reason: "r", status: "dismissed", originalText: "", resolvedAt: new Date(0).toISOString() },
    ];
    expect(noOrphanedPendingReviewItems(doc, items)).toEqual([]);
  });
});

describe("reviewItemStatusCoherent", () => {
  it("passes for pending without resolvedAt and resolved with resolvedAt", () => {
    const items: ReviewItem[] = [
      { id: newId(), targetContentId: "a", kind: "ai_proposed_claim", reason: "r", status: "pending", originalText: "" },
      { id: newId(), targetContentId: "b", kind: "ai_proposed_claim", reason: "r", status: "accepted", originalText: "", resolvedAt: new Date(0).toISOString() },
    ];
    expect(reviewItemStatusCoherent(items)).toEqual([]);
  });

  it("flags a pending item with a resolvedAt", () => {
    const items: ReviewItem[] = [
      { id: newId(), targetContentId: "a", kind: "ai_proposed_claim", reason: "r", status: "pending", originalText: "", resolvedAt: new Date(0).toISOString() },
    ];
    expect(reviewItemStatusCoherent(items).length).toBe(1);
  });

  it("flags a resolved item missing a resolvedAt", () => {
    const items: ReviewItem[] = [
      { id: newId(), targetContentId: "a", kind: "ai_proposed_claim", reason: "r", status: "dismissed", originalText: "" },
    ];
    expect(reviewItemStatusCoherent(items).length).toBe(1);
  });
});
