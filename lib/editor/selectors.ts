import {
  collectContentIdsFromRichText,
  type Block,
  type ResumeDoc,
  type ReviewItem,
} from "@/lib/resume";
import type { EditorState } from "./state";

export function pendingReviewItems(state: EditorState): ReviewItem[] {
  return state.reviewItems.filter((r) => r.status === "pending");
}

// An orphaned review item is always still "pending", so checking pending items alone
// also covers orphans.
export function canExport(state: EditorState): boolean {
  return pendingReviewItems(state).length === 0;
}

export function reviewItemForContentId(
  reviewItems: ReviewItem[],
  contentId: string,
): ReviewItem | undefined {
  return reviewItems.find((r) => r.status === "pending" && r.targetContentId === contentId);
}

export type BlockCapabilities = {
  canRename: boolean;
  canHide: boolean;
  canDelete: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

export function blockCapabilities(
  block: Block,
  index: number,
  total: number,
): BlockCapabilities {
  if (block.type === "header") {
    return {
      canRename: false,
      canHide: false,
      canDelete: false,
      canMoveUp: false,
      canMoveDown: false,
    };
  }
  return {
    canRename: true,
    canHide: true,
    canDelete: true,
    canMoveUp: index > 1,
    canMoveDown: index < total - 1,
  };
}

export function findBlock(doc: ResumeDoc, blockId: string): Block | undefined {
  return doc.blocks.find((b) => b.id === blockId);
}

export function blockContentIds(block: Block): string[] {
  switch (block.type) {
    case "summary":
    case "richtext":
      return collectContentIdsFromRichText(block.body);
    case "experience":
      return block.entries.flatMap((e) => collectContentIdsFromRichText(e.bullets));
    case "education":
      return block.entries.flatMap((e) => collectContentIdsFromRichText(e.details));
    default:
      return [];
  }
}

export function blockIdForContentId(doc: ResumeDoc, contentId: string): string | null {
  for (const block of doc.blocks) {
    if (blockContentIds(block).includes(contentId)) return block.id;
  }
  return null;
}
