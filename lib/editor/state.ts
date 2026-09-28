import type { Issue, ResumeDoc, ReviewItem } from "@/lib/resume";

export type ValidationState =
  | { status: "valid" }
  | { status: "invalid"; issues: Issue[] };

export type SaveStatus = "idle";

export type EditorState = {
  doc: ResumeDoc;
  reviewItems: ReviewItem[];
  selectedBlockId: string | null;
  validation: ValidationState;
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
