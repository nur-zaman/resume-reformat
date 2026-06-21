import {
  collectContentIdsFromRichText,
  type Block,
  type ResumeDoc,
  type ReviewItem,
} from "@/lib/resume";
import type { EditorState } from "./state";

/** Pure derived reads over editor state. */

export function pendingReviewItems(state: EditorState): ReviewItem[] {
  return state.reviewItems.filter((r) => r.status === "pending");
}

/** The pending review item targeting a content node, if any (for decorations). */
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

/**
 * What the controls for a block may do. The header is pinned: it cannot be renamed,
 * hidden, deleted, or moved. Non-header blocks never move above index 1 (index 0 is
 * the header), so the first content block cannot move up and the last cannot move down.
 */
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

/** The content ids carried by a single block's rich-text bodies. */
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

/** Which block holds the rich-text node carrying `contentId` (for review jump-to). */
export function blockIdForContentId(doc: ResumeDoc, contentId: string): string | null {
  for (const block of doc.blocks) {
    if (blockContentIds(block).includes(contentId)) return block.id;
  }
  return null;
}
