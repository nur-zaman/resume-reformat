"use client";

import { useEffect, useRef } from "react";
import { validateWorkingDoc, type ResumeDoc, type ReviewItem } from "@/lib/resume";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { EditorProvider, useEditorStore } from "./editor-context";
import { BlockList } from "./block-list";
import { ReviewQueue } from "./review/proposal";
import { SaveBar, type SaveHandler } from "./save-bar";
import { ResumePreview } from "@/components/preview/resume-preview";

export type ReviewNotice = { heading: string; body: string };

export function ResumeEditor({
  initialDoc,
  initialReviewItems,
  onSave,
  saveLabel,
  onSaveDraft,
  draftLabel,
  requireReview = false,
  reviewNotice,
  onStartOver,
}: {
  initialDoc: ResumeDoc;
  initialReviewItems: ReviewItem[];
  onSave?: SaveHandler;
  saveLabel?: string;
  onSaveDraft?: SaveHandler;
  draftLabel?: string;
  requireReview?: boolean;
  reviewNotice?: ReviewNotice;
  onStartOver?: () => void;
}) {
  return (
    <EditorProvider initialDoc={initialDoc} initialReviewItems={initialReviewItems}>
      <EditorWorkspace
        onSave={onSave}
        saveLabel={saveLabel}
        onSaveDraft={onSaveDraft}
        draftLabel={draftLabel}
        requireReview={requireReview}
        reviewNotice={reviewNotice}
        onStartOver={onStartOver}
      />
    </EditorProvider>
  );
}

function EditorWorkspace({
  onSave,
  saveLabel,
  onSaveDraft,
  draftLabel,
  requireReview,
  reviewNotice,
  onStartOver,
}: {
  onSave?: SaveHandler;
  saveLabel?: string;
  onSaveDraft?: SaveHandler;
  draftLabel?: string;
  requireReview: boolean;
  reviewNotice?: ReviewNotice;
  onStartOver?: () => void;
}) {
  const { state, dispatch } = useEditorStore();

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
      {requireReview && (
        <VerificationBanner notice={reviewNotice} onStartOver={onStartOver} />
      )}
      <WorkspaceHeader hasSave={Boolean(onSave)} />
      {onSave && (
        <SaveBar
          onSave={onSave}
          label={saveLabel}
          onSaveDraft={onSaveDraft}
          draftLabel={draftLabel}
        />
      )}
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

function VerificationBanner({
  notice,
  onStartOver,
}: {
  notice?: ReviewNotice;
  onStartOver?: () => void;
}) {
  const headingRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const heading = notice?.heading ?? "Review before saving";
  const body =
    notice?.body ??
    "We transcribed your resume — we did not invent or fact-check anything. Verify the details, especially dates, names, links, and credentials, before you save.";

  return (
    <div
      role="note"
      className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-warning/40 bg-surface-card px-4 py-3"
    >
      <div className="max-w-3xl">
        <p
          ref={headingRef}
          tabIndex={-1}
          className="text-sm font-semibold text-warning outline-none"
        >
          {heading}
        </p>
        <p className="mt-1 text-sm text-body">{body}</p>
      </div>
      {onStartOver && (
        <Button variant="secondary" type="button" onClick={onStartOver}>
          Start over
        </Button>
      )}
    </div>
  );
}

function WorkspaceHeader({ hasSave }: { hasSave: boolean }) {
  const { state } = useEditorStore();
  const invalid = state.validation.status === "invalid";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Resume editor</h1>
        <p className="text-xs text-muted">
          {hasSave
            ? "Edit the structured fields, then save your base resume."
            : "Edits are kept locally in this milestone."}
        </p>
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
