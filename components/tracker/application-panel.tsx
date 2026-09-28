"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  APPLICATION_STAGES,
  STAGE_LABELS,
  isClosedStage,
  type ApplicationStage,
  type StageHistoryEntry,
} from "@/lib/applications/stages";
import { updateApplication, type ApplicationPatch } from "@/lib/applications/actions";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { Textarea } from "@/components/ui/textarea";
import { StageBadge } from "./stage-badge";

export type ApplicationData = {
  id: string;
  role: string;
  company: string;
  stage: ApplicationStage;
  appliedAt: string | null;
  followUpAt: string | null;
  jobUrl: string | null;
  notes: string | null;
  stageHistory: StageHistoryEntry[];
};

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

// Pinned to UTC to avoid a hydration mismatch: local-timezone formatting could differ between server and client.
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(value: string): string {
  const t = Date.parse(value);
  return Number.isNaN(t) ? value : DATE_FORMAT.format(new Date(t));
}

export function ApplicationPanel(props: ApplicationData) {
  const [open, setOpen] = useState(false);
  const company = props.company ? ` at ${props.company}` : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Track application: ${props.role}${company}`}
        className="rounded-pill"
      >
        <StageBadge
          stage={props.stage}
          className="cursor-pointer transition-colors hover:border-hairline-strong"
        />
      </button>
      <ApplicationDialog open={open} onClose={() => setOpen(false)} data={props} />
    </>
  );
}

function ApplicationDialog({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: ApplicationData;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Captured on open, not computed at render (render must stay pure).
  const [today, setToday] = useState("");

  const [stage, setStage] = useState<ApplicationStage>(data.stage);
  const [appliedAt, setAppliedAt] = useState(toDateInput(data.appliedAt));
  const [followUpAt, setFollowUpAt] = useState(toDateInput(data.followUpAt));
  const [jobUrl, setJobUrl] = useState(data.jobUrl ?? "");
  const [notes, setNotes] = useState(data.notes ?? "");

  // Reset fields only when opening, so in-progress edits are never clobbered while the dialog stays open.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setStage(data.stage);
      setAppliedAt(toDateInput(data.appliedAt));
      setFollowUpAt(toDateInput(data.followUpAt));
      setJobUrl(data.jobUrl ?? "");
      setNotes(data.notes ?? "");
      setError(null);
      setToday(new Date().toISOString().slice(0, 10));
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, data]);

  function save() {
    // Send only what changed, so an untouched applied date can't override the auto-stamp.
    const patch: ApplicationPatch = {};
    if (stage !== data.stage) patch.stage = stage;
    if (appliedAt !== toDateInput(data.appliedAt)) patch.appliedAt = appliedAt || null;
    if (followUpAt !== toDateInput(data.followUpAt)) patch.followUpAt = followUpAt || null;
    const trimmedUrl = jobUrl.trim();
    if (trimmedUrl !== (data.jobUrl ?? "")) patch.jobUrl = trimmedUrl || null;
    if (notes !== (data.notes ?? "")) patch.notes = notes;

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await updateApplication(data.id, patch);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  // ISO date strings (YYYY-MM-DD) compare correctly with `<=`.
  const followUpDue =
    followUpAt !== "" && today !== "" && !isClosedStage(stage) && followUpAt <= today;

  const timeline = [...data.stageHistory].reverse();
  const label = "block text-sm font-medium text-body-strong";
  const fieldNote = "mt-1 text-xs text-muted";

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onClose();
      }}
      onClose={onClose}
      aria-labelledby="app-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-hairline bg-surface-card p-5 text-body backdrop:bg-black/70"
    >
      <header>
        <h2
          id="app-dialog-title"
          className="truncate text-base font-semibold text-ink"
          title={data.role}
        >
          {data.role}
        </h2>
        {data.company && <p className="mt-0.5 text-sm text-muted">{data.company}</p>}
      </header>

      <form
        className="mt-4 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div>
          <label htmlFor="app-stage" className={label}>
            Stage
          </label>
          <select
            id="app-stage"
            value={stage}
            onChange={(e) => setStage(e.target.value as ApplicationStage)}
            className="mt-1.5 h-10 w-full rounded-md border border-hairline bg-surface-card px-3 text-sm text-ink focus:border-primary"
          >
            {APPLICATION_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="app-applied" className={label}>
              Applied
            </label>
            <TextInput
              id="app-applied"
              type="date"
              value={appliedAt}
              onChange={(e) => setAppliedAt(e.target.value)}
              className="mt-1.5 [color-scheme:dark]"
            />
            <p className={fieldNote}>Set automatically when you mark it Applied.</p>
          </div>
          <div>
            <label htmlFor="app-followup" className={label}>
              Follow up
            </label>
            <TextInput
              id="app-followup"
              type="date"
              value={followUpAt}
              onChange={(e) => setFollowUpAt(e.target.value)}
              className="mt-1.5 [color-scheme:dark]"
            />
            <p className={cn(fieldNote, followUpDue && "text-warning")}>
              {followUpDue ? "Follow-up is due." : "Reminder shown here (no email)."}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="app-url" className={label}>
            Job posting <span className="text-muted">(optional)</span>
          </label>
          <TextInput
            id="app-url"
            type="url"
            inputMode="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1.5"
          />
          {data.jobUrl && (
            <a
              href={data.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block max-w-full truncate text-xs text-primary hover:underline"
            >
              Open saved posting ↗
            </a>
          )}
        </div>

        <div>
          <label htmlFor="app-notes" className={label}>
            Notes <span className="text-muted">(optional)</span>
          </label>
          <Textarea
            id="app-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Recruiter name, salary range, next steps…"
            className="mt-1.5"
          />
        </div>

        {timeline.length > 0 && (
          <div>
            <p className={label}>Timeline</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {timeline.map((entry, i) => (
                <li
                  key={`${entry.at}-${i}`}
                  className="flex items-center justify-between gap-3 text-xs text-muted"
                >
                  <span className="text-body">{STAGE_LABELS[entry.stage]}</span>
                  <span className="font-mono text-muted-soft">{formatDate(entry.at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <div className="mt-1 flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
