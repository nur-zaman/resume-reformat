"use client";

import Link from "next/link";
import type { ResumeDoc } from "@/lib/resume";
import { saveResume } from "@/lib/resume/actions";
import { ResumeEditor } from "./resume-editor";
import type { SaveResult } from "./save-bar";

/**
 * Editing one saved resume. The same editor serves onboarding review and later editing
 * (PRD FR-7); explicit save persists to `public.resumes` by id (autosave is M6). A slim
 * breadcrumb gives a way back to the dashboard now that resumes live at `/editor/[id]`.
 * No verification banner here — that is only for fresh parse drafts in onboarding.
 */
export function ResumeWorkspace({
  id,
  title,
  initialDoc,
}: {
  id: string;
  title: string;
  initialDoc: ResumeDoc;
}) {
  async function handleSave(doc: ResumeDoc): Promise<SaveResult> {
    const result = await saveResume(id, doc);
    return result.ok ? { ok: true } : { ok: false, message: result.message };
  }

  return (
    <div className="flex flex-1 flex-col">
      <nav className="mx-auto flex w-full max-w-[100rem] items-center gap-2 px-6 pt-6 text-sm">
        <Link href="/dashboard" className="text-muted hover:text-ink">
          Resumes
        </Link>
        <span aria-hidden className="text-muted-soft">
          /
        </span>
        <span className="truncate font-medium text-body-strong" title={title}>
          {title}
        </span>
      </nav>
      <ResumeEditor initialDoc={initialDoc} initialReviewItems={[]} onSave={handleSave} />
    </div>
  );
}
