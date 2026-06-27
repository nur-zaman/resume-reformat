import Link from "next/link";
import type { TailoredStatus } from "@/lib/resume";
import { StatusBadge } from "./status-badge";
import { ExportButton } from "./export-button";
import { ResumeActionsMenu } from "./resume-actions-menu";
import { actionSecondary, actionDisabled } from "./ui";

export type TailoredJob = {
  id: string;
  role: string;
  company: string;
  versionLabel: string;
  status: TailoredStatus;
  pendingCount: number;
  updatedLabel: string;
};

/** Shared 4-column template so the column header and every row stay aligned (desktop only). */
export const JOB_COLS = "md:grid-cols-[minmax(0,1fr)_140px_132px_216px]";
const JOB_GRID = `md:grid ${JOB_COLS} md:items-center md:gap-4`;

/**
 * One tailored resume as a document (open / export / review status). Application tracking — the
 * stage pipeline, dates, and notes — lives on the dedicated Job Tracker page, not here. Open
 * always works; Export is enabled only once the resume is Ready, mirroring the in-editor export
 * gate (FR-28). Rename / Duplicate / Delete sit in the overflow menu.
 */
export function TailoredJobRow({ job }: { job: TailoredJob }) {
  const subtitle = [job.company, job.versionLabel].filter(Boolean).join(" · ");

  return (
    <div className={`rounded-lg border border-hairline bg-surface-card px-5 py-4 ${JOB_GRID}`}>
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-ink" title={job.role}>
          {job.role}
        </h3>
        {subtitle && (
          <p className="mt-0.5 truncate font-mono text-xs text-muted">{subtitle}</p>
        )}
      </div>

      <div className="mt-3 md:mt-0">
        <StatusBadge status={job.status} pendingCount={job.pendingCount} />
      </div>

      <div className="mt-2 font-mono text-xs text-muted md:mt-0">{job.updatedLabel}</div>

      <div className="mt-3 flex items-center justify-end gap-2 md:mt-0">
        <Link href={`/editor/${job.id}`} className={actionSecondary}>
          Open
        </Link>
        {job.status === "ready" ? (
          <ExportButton id={job.id} />
        ) : (
          <button
            type="button"
            disabled
            className={actionDisabled}
            title={
              job.status === "review"
                ? "Resolve the AI proposals before exporting"
                : "Finish this draft before exporting"
            }
          >
            Export
          </button>
        )}
        <ResumeActionsMenu id={job.id} title={job.role} noun="tailored resume" />
      </div>
    </div>
  );
}
