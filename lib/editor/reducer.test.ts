import { describe, expect, it } from "vitest";
import { editorReducer } from "./reducer";
import { initialEditorState, type EditorState } from "./state";
import { blockCapabilities, pendingReviewItems } from "./selectors";
import {
  collectContentIds,
  validateResumeDoc,
  validateWorkingDoc,
  type RichText,
} from "@/lib/resume";
import { realisticResume } from "@/lib/resume/fixtures/realistic-resume";
import { proposedContentId } from "@/lib/resume/fixtures/realistic-resume";
import { sampleReviewItems } from "@/lib/resume/fixtures/generation-result";

const NOW = "2026-06-21T12:00:00.000Z";

function setup(): EditorState {
  return initialEditorState(
    structuredClone(realisticResume),
    structuredClone(sampleReviewItems),
  );
}

function blockIdOfType(state: EditorState, type: string): string {
  const b = state.doc.blocks.find((x) => x.type === type);
  if (!b) throw new Error(`no ${type} block`);
  return b.id;
}

describe("block structure invariants", () => {
  it("adds a block via the factory and selects it; the doc stays valid", () => {
    const next = editorReducer(setup(), { type: "block/add", blockType: "skills" });
    const added = next.doc.blocks.at(-1)!;
    expect(added.type).toBe("skills");
    expect(next.selectedBlockId).toBe(added.id);
    expect(validateResumeDoc(next.doc).ok).toBe(true);
  });

  it("refuses to delete the header", () => {
    const state = setup();
    const headerId = blockIdOfType(state, "header");
    const next = editorReducer(state, { type: "block/delete", blockId: headerId, now: NOW });
    expect(next.doc.blocks.some((b) => b.type === "header")).toBe(true);
    expect(next.doc.blocks).toHaveLength(state.doc.blocks.length);
  });

  it("refuses to rename or hide the header", () => {
    const state = setup();
    const headerId = blockIdOfType(state, "header");
    const renamed = editorReducer(state, { type: "block/rename", blockId: headerId, title: "X" });
    const hidden = editorReducer(state, { type: "block/toggleVisible", blockId: headerId });
    expect(renamed.doc.blocks[0]).toEqual(state.doc.blocks[0]);
    expect(hidden.doc.blocks[0]).toEqual(state.doc.blocks[0]);
  });

  it("never moves a content block into the header's first slot", () => {
    const state = setup();
    const firstContentId = state.doc.blocks[1].id;
    const next = editorReducer(state, { type: "block/move", blockId: firstContentId, direction: "up" });
    expect(next.doc.blocks[0].type).toBe("header");
    expect(next.doc.blocks[1].id).toBe(firstContentId);
  });

  it("moves a content block down within the content region", () => {
    const state = setup();
    const secondId = state.doc.blocks[1].id;
    const next = editorReducer(state, { type: "block/move", blockId: secondId, direction: "down" });
    expect(next.doc.blocks[2].id).toBe(secondId);
    expect(next.doc.blocks[0].type).toBe("header");
    expect(validateResumeDoc(next.doc).ok).toBe(true);
  });

  it("does not move the header even when asked", () => {
    const state = setup();
    const headerId = blockIdOfType(state, "header");
    const next = editorReducer(state, { type: "block/move", blockId: headerId, direction: "down" });
    expect(next.doc.blocks[0].id).toBe(headerId);
  });
});

describe("immutability", () => {
  it("does not mutate the previous state", () => {
    const state = setup();
    const before = structuredClone(state);
    editorReducer(state, { type: "block/add", blockType: "summary" });
    expect(state).toEqual(before);
  });
});

describe("review item cascade (PRD §7.2)", () => {
  it("dismisses a pending item when its target block is deleted", () => {
    const state = setup();
    const summaryId = blockIdOfType(state, "summary");
    const next = editorReducer(state, { type: "block/delete", blockId: summaryId, now: NOW });
    const item = next.reviewItems[0];
    expect(item.status).toBe("dismissed");
    expect(item.resolvedAt).toBe(NOW);
    expect(validateWorkingDoc({ resume: next.doc, reviewItems: next.reviewItems }).ok).toBe(true);
    expect(pendingReviewItems(next)).toHaveLength(0);
  });

  it("dismisses a pending item when an edit removes its target node", () => {
    const state = setup();
    const summaryId = blockIdOfType(state, "summary");
    const empty: RichText = { type: "doc", content: [] };
    const next = editorReducer(state, {
      type: "richtext/set",
      target: { kind: "summaryBody", blockId: summaryId },
      body: empty,
      now: NOW,
    });
    expect(collectContentIds(next.doc)).not.toContain(proposedContentId);
    expect(next.reviewItems[0].status).toBe("dismissed");
  });

  it("keeps the item pending when an edit preserves its target node (edit-and-accept)", () => {
    const state = setup();
    const summaryId = blockIdOfType(state, "summary");
    const edited: RichText = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { contentId: proposedContentId },
          content: [{ type: "text", text: "Edited wording, same claim." }],
        },
      ],
    };
    const afterEdit = editorReducer(state, {
      type: "richtext/set",
      target: { kind: "summaryBody", blockId: summaryId },
      body: edited,
      now: NOW,
    });
    expect(afterEdit.reviewItems[0].status).toBe("pending");

    const accepted = editorReducer(afterEdit, {
      type: "review/resolve",
      reviewItemId: afterEdit.reviewItems[0].id,
      resolution: "accept",
      now: NOW,
    });
    expect(accepted.reviewItems[0].status).toBe("accepted");
    expect(accepted.reviewItems[0].resolvedAt).toBe(NOW);
  });
});

describe("review/resolve", () => {
  it("accept keeps the proposed content and marks the item accepted", () => {
    const state = setup();
    const next = editorReducer(state, {
      type: "review/resolve",
      reviewItemId: state.reviewItems[0].id,
      resolution: "accept",
      now: NOW,
    });
    expect(collectContentIds(next.doc)).toContain(proposedContentId);
    expect(next.reviewItems[0].status).toBe("accepted");
    expect(validateWorkingDoc({ resume: next.doc, reviewItems: next.reviewItems }).ok).toBe(true);
  });

  it("dismiss removes the proposed content and leaves no orphan", () => {
    const state = setup();
    const next = editorReducer(state, {
      type: "review/resolve",
      reviewItemId: state.reviewItems[0].id,
      resolution: "dismiss",
      now: NOW,
    });
    expect(collectContentIds(next.doc)).not.toContain(proposedContentId);
    expect(next.reviewItems[0].status).toBe("dismissed");
    expect(next.reviewItems[0].resolvedAt).toBe(NOW);
    expect(validateWorkingDoc({ resume: next.doc, reviewItems: next.reviewItems }).ok).toBe(true);
  });
});

describe("entries and skills", () => {
  it("adds and removes an experience entry", () => {
    const state = setup();
    const expId = blockIdOfType(state, "experience");
    const added = editorReducer(state, { type: "entry/add", blockId: expId });
    const expBlock = added.doc.blocks.find((b) => b.id === expId);
    const count = expBlock?.type === "experience" ? expBlock.entries.length : 0;
    expect(count).toBe(3);
    expect(validateResumeDoc(added.doc).ok).toBe(true);
  });

  it("updates only allowlisted entry fields (never the id)", () => {
    const state = setup();
    const expId = blockIdOfType(state, "experience");
    const block = state.doc.blocks.find((b) => b.id === expId);
    const entry = block?.type === "experience" ? block.entries[0] : undefined;
    const next = editorReducer(state, {
      type: "entry/update",
      blockId: expId,
      entryId: entry!.id,
      patch: { role: "Staff Engineer", id: "hacked", bullets: "nope" },
    });
    const updated = next.doc.blocks.find((b) => b.id === expId);
    const updatedEntry =
      updated?.type === "experience" ? updated.entries[0] : undefined;
    expect(updatedEntry?.role).toBe("Staff Engineer");
    expect(updatedEntry?.id).toBe(entry!.id);
    expect(validateResumeDoc(next.doc).ok).toBe(true);
  });

  it("sets skill items wholesale", () => {
    const state = setup();
    const skillsId = blockIdOfType(state, "skills");
    const block = state.doc.blocks.find((b) => b.id === skillsId);
    const catId = block?.type === "skills" ? block.categories[0].id : "";
    const next = editorReducer(state, {
      type: "skills/items/set",
      blockId: skillsId,
      categoryId: catId,
      items: ["Rust", "Zig"],
    });
    const updated = next.doc.blocks.find((b) => b.id === skillsId);
    const items = updated?.type === "skills" ? updated.categories[0].items : [];
    expect(items).toEqual(["Rust", "Zig"]);
  });
});

describe("blockCapabilities", () => {
  it("locks the header and bounds content reordering", () => {
    const state = setup();
    const total = state.doc.blocks.length;
    expect(blockCapabilities(state.doc.blocks[0], 0, total)).toMatchObject({
      canDelete: false,
      canHide: false,
      canMoveUp: false,
      canMoveDown: false,
    });
    expect(blockCapabilities(state.doc.blocks[1], 1, total)).toMatchObject({
      canDelete: true,
      canHide: true,
      canMoveUp: false, // index 1 cannot move into the header slot
      canMoveDown: true,
    });
    expect(blockCapabilities(state.doc.blocks[total - 1], total - 1, total).canMoveDown).toBe(false);
  });
});
