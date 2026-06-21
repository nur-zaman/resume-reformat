import type { Issue, ResumeDoc, ReviewItem } from "@/lib/resume";

/**
 * Editor working state. The reducer (reducer.ts) is the only thing that mutates it,
 * and it stays a pure function so invariant logic is unit-testable without a DOM.
 */

export type ValidationState =
  | { status: "valid" }
  | { status: "invalid"; issues: Issue[] };

/**
 * Save status seam for M6. Only "idle" exists in M2; persistence/autosave widens this
 * to saving | saved | error | offline.
 */
export type SaveStatus = "idle";

export type EditorState = {
  doc: ResumeDoc;
  reviewItems: ReviewItem[];
  /** The block the user last acted on — used for focus management on reorder/add. */
  selectedBlockId: string | null;
  validation: ValidationState;
  // Inert M6 seams (multi-tab compare-and-swap + autosave status). Unused in M2.
  saveStatus: SaveStatus;
  revision: number;
};

export function initialEditorState(
  doc: ResumeDoc,
  reviewItems: ReviewItem[],
): EditorState {
  return {
    doc,
    reviewItems,
    selectedBlockId: null,
    validation: { status: "valid" },
    saveStatus: "idle",
    revision: 0,
  };
}
