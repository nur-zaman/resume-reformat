"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_RESUME_INPUT_CHARS,
  MAX_RESUME_PDF_BYTES,
  validateResumeInput,
  validateResumePdf,
  describePdfRejection,
  deriveResumeTitle,
  type GenerationResult,
  type ResumeDoc,
} from "@/lib/resume";
import { createResume } from "@/lib/resume/actions";
import { parseResumeAction, type ParseResumeState } from "@/lib/parsing/actions";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResumeEditor } from "@/components/editor/resume-editor";
import type { SaveResult } from "@/components/editor/save-bar";

type Phase = { name: "paste" } | { name: "review"; draft: GenerationResult };

export function OnboardingFlow() {
  const [phase, setPhase] = useState<Phase>({ name: "paste" });

  if (phase.name === "review") {
    return (
      <ReviewPhase
        draft={phase.draft}
        onStartOver={() => setPhase({ name: "paste" })}
      />
    );
  }
  return <PastePhase onParsed={(draft) => setPhase({ name: "review", draft })} />;
}

const initialParseState: ParseResumeState = { status: "idle" };

type InputMode = "text" | "pdf";

function PastePhase({ onParsed }: { onParsed: (draft: GenerationResult) => void }) {
  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(
    parseResumeAction,
    initialParseState,
  );

  // This component unmounts on success, so this effect can't re-fire with stale state.
  useEffect(() => {
    if (state.status === "success") onParsed(state.result);
  }, [state, onParsed]);

  const length = text.trim().length;
  const overLimit = length > MAX_RESUME_INPUT_CHARS;
  const overBy = length - MAX_RESUME_INPUT_CHARS;
  const canSubmit =
    !pending &&
    (mode === "text" ? validateResumeInput(text).ok : file !== null && !fileError);
  const isError = state.status === "error";

  function switchMode(next: InputMode) {
    if (next === mode) return;
    setMode(next);
    // Drop the file (not the text) so visible state matches the remounted, empty file input.
    setFile(null);
    setFileError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0] ?? null;
    if (!chosen) {
      setFile(null);
      setFileError(null);
      return;
    }
    const check = validateResumePdf({
      size: chosen.size,
      type: chosen.type,
      name: chosen.name,
    });
    if (!check.ok) {
      setFile(null);
      setFileError(describePdfRejection(check));
      e.target.value = ""; // never let an invalid file ride along on submit
      return;
    }
    setFile(chosen);
    setFileError(null);
  }

  function clearFile() {
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">
        Set up your resume
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
        Add a resume
      </h1>
      <p className="mt-2 text-sm text-muted">
        Paste your resume as text or upload a PDF. We transcribe it into an editable
        structure — nothing is invented. You&apos;ll review it before saving.
      </p>

      <div
        role="group"
        aria-label="Input method"
        className="mt-6 inline-flex rounded-md border border-hairline bg-surface-card p-1"
      >
        <ModeTab
          selected={mode === "text"}
          onClick={() => switchMode("text")}
        >
          Paste text
        </ModeTab>
        <ModeTab selected={mode === "pdf"} onClick={() => switchMode("pdf")}>
          Upload PDF
        </ModeTab>
      </div>

      <form action={formAction} className="mt-4 flex flex-col gap-3" noValidate>
        {mode === "text" ? (
          <>
            <div className="flex items-center justify-between">
              <label
                htmlFor="resume-text"
                className="text-sm font-medium text-body-strong"
              >
                Resume text
              </label>
              <span
                id="char-counter"
                aria-live="polite"
                className={cn(
                  "font-mono text-xs",
                  overLimit ? "text-error" : "text-muted",
                )}
              >
                {length.toLocaleString()} / {MAX_RESUME_INPUT_CHARS.toLocaleString()}
              </span>
            </div>

            <Textarea
              id="resume-text"
              name="resumeText"
              rows={16}
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your full resume here…"
              className="font-mono"
              aria-invalid={overLimit}
              aria-describedby={cn(
                "char-counter",
                overLimit && "limit-error",
                isError && "parse-error",
              )}
            />

            {overLimit && (
              <p id="limit-error" role="alert" className="text-sm text-error">
                Your resume is {overBy.toLocaleString()} character
                {overBy === 1 ? "" : "s"} over the{" "}
                {MAX_RESUME_INPUT_CHARS.toLocaleString()} limit. Trim it before parsing.
              </p>
            )}
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-body-strong">Resume PDF</span>
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-10 text-center",
                fileError
                  ? "border-error/60 bg-surface-card"
                  : "border-hairline bg-surface-card hover:border-primary",
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                name="resumeFile"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="sr-only"
                aria-describedby={cn(file && "file-chosen", fileError && "file-error")}
              />
              <span className="text-sm text-ink">
                {file ? "Choose a different PDF" : "Click to choose a PDF"}
              </span>
              <span className="font-mono text-xs text-muted">
                Up to {Math.round(MAX_RESUME_PDF_BYTES / (1024 * 1024))} MB · .pdf only
              </span>
            </label>

            {file && (
              <div
                id="file-chosen"
                className="flex items-center justify-between rounded-md border border-hairline bg-surface-card px-3.5 py-2.5 text-sm"
              >
                <span className="truncate text-ink" title={file.name}>
                  {file.name}{" "}
                  <span className="font-mono text-xs text-muted">
                    ({formatBytes(file.size)})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={clearFile}
                  className="ml-3 shrink-0 text-xs font-medium text-muted hover:text-ink"
                >
                  Remove
                </button>
              </div>
            )}

            {fileError && (
              <p id="file-error" role="alert" className="text-sm text-error">
                {fileError}
              </p>
            )}
          </>
        )}

        {isError && (
          <div
            id="parse-error"
            role="alert"
            className="rounded-md border border-error/40 bg-surface-card px-3.5 py-3 text-sm text-error"
          >
            {state.message}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={!canSubmit}>
            {pending ? "Parsing…" : "Parse resume"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ModeTab({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded px-3.5 py-1.5 text-sm font-medium transition-colors",
        selected
          ? "bg-surface-elevated text-ink"
          : "text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ReviewPhase({
  draft,
  onStartOver,
}: {
  draft: GenerationResult;
  onStartOver: () => void;
}) {
  const router = useRouter();

  async function handleSave(doc: ResumeDoc): Promise<SaveResult> {
    const result = await createResume({ doc, title: deriveResumeTitle(doc) });
    if (result.ok) {
      router.push(`/editor/${result.id}`);
      return { ok: true };
    }
    return { ok: false, message: result.message };
  }

  function handleStartOver() {
    if (window.confirm("Discard this parsed draft and start over?")) {
      onStartOver();
    }
  }

  return (
    <ResumeEditor
      initialDoc={draft.resume}
      initialReviewItems={[]}
      onSave={handleSave}
      requireReview
      onStartOver={handleStartOver}
    />
  );
}
