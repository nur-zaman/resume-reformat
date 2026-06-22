"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_JD_INPUT_CHARS,
  validateJobDescriptionInput,
  deriveResumeTitle,
  type GenerationResult,
  type ResumeDoc,
} from "@/lib/resume";
import { createResume } from "@/lib/resume/actions";
import { tailorResumeAction, type TailorState } from "@/lib/tailoring/actions";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TextInput } from "@/components/ui/text-input";
import { ResumeEditor } from "@/components/editor/resume-editor";
import type { SaveResult } from "@/components/editor/save-bar";

/**
 * Tailoring flow (PRD §6.2). Mirrors onboarding: the "paste job description" phase and the
 * "review" phase live in one client component so the generated draft is held in memory and
 * never has to survive a navigation. On save it becomes a NEW resume row (jobs/generations
 * history is M6). `useActionState` lives inside the paste phase so Start over resets cleanly.
 */
type JobMeta = { title: string; company: string };
type Phase =
  | { name: "paste" }
  | { name: "review"; draft: GenerationResult; job: JobMeta };

export function TailoringFlow({
  resumeId,
  resumeTitle,
}: {
  resumeId: string;
  resumeTitle: string;
}) {
  const [phase, setPhase] = useState<Phase>({ name: "paste" });

  if (phase.name === "review") {
    return (
      <ReviewPhase
        draft={phase.draft}
        job={phase.job}
        onStartOver={() => setPhase({ name: "paste" })}
      />
    );
  }
  return (
    <PastePhase
      resumeId={resumeId}
      resumeTitle={resumeTitle}
      onGenerated={(draft, job) => setPhase({ name: "review", draft, job })}
    />
  );
}

const initialTailorState: TailorState = { status: "idle" };

function PastePhase({
  resumeId,
  resumeTitle,
  onGenerated,
}: {
  resumeId: string;
  resumeTitle: string;
  onGenerated: (draft: GenerationResult, job: JobMeta) => void;
}) {
  const [jd, setJd] = useState("");
  const [state, formAction, pending] = useActionState(
    tailorResumeAction,
    initialTailorState,
  );

  // Advance to review once generation succeeds. This component then unmounts, so the
  // success state cannot re-fire; a later Start over remounts it fresh (idle).
  useEffect(() => {
    if (state.status === "success") onGenerated(state.result, state.job);
  }, [state, onGenerated]);

  const length = jd.trim().length;
  const overLimit = length > MAX_JD_INPUT_CHARS;
  const overBy = length - MAX_JD_INPUT_CHARS;
  const canSubmit = !pending && validateJobDescriptionInput(jd).ok;
  const isError = state.status === "error";

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">
        Tailor to a job
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
        Tailor “{resumeTitle}”
      </h1>
      <p className="mt-2 text-sm text-muted">
        Paste the job description. We tailor your resume to it and flag every new claim for
        you to review — nothing new is added to your resume until you accept it.
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-4" noValidate>
        <input type="hidden" name="resumeId" value={resumeId} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="job-title" className="text-sm font-medium text-body-strong">
              Job title <span className="text-muted">(optional)</span>
            </label>
            <TextInput
              id="job-title"
              name="jobTitle"
              placeholder="e.g. Senior Software Engineer"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="company" className="text-sm font-medium text-body-strong">
              Company <span className="text-muted">(optional)</span>
            </label>
            <TextInput id="company" name="company" placeholder="e.g. Acme" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label
            htmlFor="jd-text"
            className="text-sm font-medium text-body-strong"
          >
            Job description
          </label>
          <span
            id="jd-counter"
            aria-live="polite"
            className={cn("font-mono text-xs", overLimit ? "text-error" : "text-muted")}
          >
            {length.toLocaleString()} / {MAX_JD_INPUT_CHARS.toLocaleString()}
          </span>
        </div>

        <Textarea
          id="jd-text"
          name="jobDescription"
          rows={16}
          autoFocus
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the full job description here…"
          className="font-mono"
          aria-invalid={overLimit}
          aria-describedby={cn(
            "jd-counter",
            overLimit && "jd-limit-error",
            isError && "tailor-error",
          )}
        />

        {overLimit && (
          <p id="jd-limit-error" role="alert" className="text-sm text-error">
            The job description is {overBy.toLocaleString()} character
            {overBy === 1 ? "" : "s"} over the{" "}
            {MAX_JD_INPUT_CHARS.toLocaleString()} limit. Trim it before generating.
          </p>
        )}

        {isError && (
          <div
            id="tailor-error"
            role="alert"
            className="rounded-md border border-error/40 bg-surface-card px-3.5 py-3 text-sm text-error"
          >
            {state.message}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={!canSubmit}>
            {pending ? "Generating…" : "Generate"}
          </Button>
        </div>
      </form>
    </div>
  );
}

const TAILOR_REVIEW_NOTICE = {
  heading: "Review the AI's proposals",
  body:
    "We tailored your resume to this job. Anything new the AI proposed is highlighted and " +
    "listed below — accept, edit, or delete each one. You can't export until every proposal " +
    "is resolved. Your fixed facts (name, employers, dates, credentials) were preserved.",
};

function ReviewPhase({
  draft,
  job,
  onStartOver,
}: {
  draft: GenerationResult;
  job: JobMeta;
  onStartOver: () => void;
}) {
  const router = useRouter();

  function tailoredTitle(doc: ResumeDoc): string {
    const name = deriveResumeTitle(doc);
    const label = [job.title, job.company].filter(Boolean).join(" · ");
    return label ? `${name} — ${label}` : name;
  }

  async function handleSave(doc: ResumeDoc): Promise<SaveResult> {
    const result = await createResume({ doc, title: tailoredTitle(doc) });
    if (result.ok) {
      router.push(`/editor/${result.id}`);
      return { ok: true };
    }
    return { ok: false, message: result.message };
  }

  function handleStartOver() {
    if (window.confirm("Discard this tailored draft and start over?")) {
      onStartOver();
    }
  }

  return (
    <ResumeEditor
      initialDoc={draft.resume}
      initialReviewItems={draft.reviewItems}
      onSave={handleSave}
      saveLabel="Save tailored resume"
      requireReview
      reviewNotice={TAILOR_REVIEW_NOTICE}
      onStartOver={handleStartOver}
    />
  );
}
