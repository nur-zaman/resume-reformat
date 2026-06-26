"use client";

import Link from "next/link";
import {
  pendingReviewCount,
  type ResumeDoc,
  type ResumeKind,
  type ReviewItem,
} from "@/lib/resume";
import { saveResume } from "@/lib/resume/actions";
import { ResumeEditor } from "./resume-editor";
import type { SaveResult } from "./save-bar";

/**
 * Editing one saved resume. The same editor serves onboarding review and later editing
 * (PRD FR-7); explicit save persists to `public.resumes` by id (autosave is M6). A slim
 * breadcrumb gives a way back to the dashboard now that resumes live at `/editor/[id]`.
 *
 * A `tailored` resume carries its AI proposals: they seed the review queue, and while any are
 * still pending the review banner shows and export stays blocked (FR-28). Save persists the
 * current proposals so the resume's dashboard status (review → ready) tracks the user's
 * decisions. A `base` resume has no proposals and behaves exactly as before.
 */
const TAILORED_REVIEW_NOTICE = {
  heading: "Resolve the AI's proposals",
  body:
    "This resume was tailored to a job. Anything new the AI proposed is highlighted and listed " +
    "below — accept, edit, or delete each one. You can't export until every proposal is resolved.",
};

export function ResumeWorkspace({
  id,
  title,
  initialDoc,
  kind = "base",
  initialReviewItems = [],
}: {
  id: string;
  title: string;
  initialDoc: ResumeDoc;
  kind?: ResumeKind;
  initialReviewItems?: ReviewItem[];
}) {
  async function handleSave(
    doc: ResumeDoc,
    reviewItems: ReviewItem[],
  ): Promise<SaveResult> {
    const result = await saveResume(id, doc, reviewItems);
    return result.ok ? { ok: true } : { ok: false, message: result.message };
  }

  const hasPending = pendingReviewCount(initialReviewItems) > 0;

  return (
    <div className="flex flex-1 flex-col">
      <nav className="mx-auto flex w-full max-w-[100rem] items-center gap-2 px-6 pt-6 text-sm">
        <Link href="/dashboard" className="text-muted hover:text-ink">
          Workspace
        </Link>
        <span aria-hidden className="text-muted-soft">
          /
        </span>
        <span className="truncate font-medium text-body-strong" title={title}>
          {title}
        </span>
      </nav>
      <ResumeEditor
        initialDoc={initialDoc}
        initialReviewItems={initialReviewItems}
        onSave={handleSave}
        saveLabel={kind === "tailored" ? "Save tailored resume" : "Save base resume"}
        requireReview={kind === "tailored" && hasPending}
        reviewNotice={kind === "tailored" ? TAILORED_REVIEW_NOTICE : undefined}
      />
    </div>
  );
}
