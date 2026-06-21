"use client";

import { useEffect } from "react";
import { validateWorkingDoc, type ResumeDoc, type ReviewItem } from "@/lib/resume";
import { cn } from "@/lib/utils/cn";
import { EditorProvider, useEditorStore } from "./editor-context";
import { BlockList } from "./block-list";
import { ReviewQueue } from "./review/proposal";
import { ResumePreview } from "@/components/preview/resume-preview";

/**
 * Client entry point for the resume editor. A server page seeds it with a fixture (and
 * later a parse result / Supabase read) via serializable props. State lives in a pure
 * reducer behind EditorProvider; this component owns the debounced local re-validation
 * and the desktop two-pane layout (editor left, preview right).
 */
export function ResumeEditor({
  initialDoc,
  initialReviewItems,
}: {
  initialDoc: ResumeDoc;
  initialReviewItems: ReviewItem[];
}) {
  return (
    <EditorProvider initialDoc={initialDoc} initialReviewItems={initialReviewItems}>
      <EditorWorkspace />
    </EditorProvider>
  );
}

function EditorWorkspace() {
  const { state, dispatch } = useEditorStore();

  // Re-validate the working document shortly after edits settle (FR-20). Runs off the
  // critical path; the editor stays interactive and issues surface non-blockingly.
  useEffect(() => {
    const handle = setTimeout(() => {
      const result = validateWorkingDoc({
        resume: state.doc,
        reviewItems: state.reviewItems,
      });
      dispatch({
        type: "validation/result",
        validation: result.ok
          ? { status: "valid" }
          : {
              status: "invalid",
              issues: result.error.issues.map((i) => ({
                path: i.path.map(String),
                message: i.message,
              })),
            },
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [state.doc, state.reviewItems, dispatch]);

  return (
    <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-4 px-6 py-8">
      <WorkspaceHeader />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(32rem,42rem)]">
        <div className="flex flex-col gap-4">
          <ReviewQueue />
          <BlockList />
        </div>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <ResumePreview />
        </aside>
      </div>
    </div>
  );
}

function WorkspaceHeader() {
  const { state } = useEditorStore();
  const invalid = state.validation.status === "invalid";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Resume editor</h1>
        <p className="text-xs text-muted">Edits are kept locally in this milestone.</p>
      </div>
      <div
        role="status"
        className={cn(
          "rounded-pill border px-3 py-1 text-xs font-medium",
          invalid
            ? "border-warning/40 bg-surface-elevated text-warning"
            : "border-hairline bg-surface-elevated text-success",
        )}
      >
        {invalid
          ? `${state.validation.status === "invalid" ? state.validation.issues.length : 0} issue${
              state.validation.status === "invalid" && state.validation.issues.length === 1 ? "" : "s"
            } to resolve`
          : "Document valid"}
      </div>
    </div>
  );
}
