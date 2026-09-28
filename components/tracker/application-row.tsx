import Link from "next/link";
import {
  isClosedStage,
  type ApplicationStage,
  type StageHistoryEntry,
} from "@/lib/applications/stages";
import type { TailoredStatus } from "@/lib/resume";
import { ApplicationPanel } from "./application-panel";
import { ExportButton } from "@/components/dashboard/export-button";
import { actionSecondary, actionDisabled } from "@/components/dashboard/ui";

export type ApplicationView = {
  id: string;
  role: string;
  company: string;
  /** Resume readiness — still gates Export, mirroring the dashboard/editor export gate. */
  status: TailoredStatus;
  stage: ApplicationStage;
  appliedAt: string | null;
  followUpAt: string | null;
  jobUrl: string | null;
  notes: string | null;
  stageHistory: StageHistoryEntry[];
};

/** Shared 5-column template so the header and every row stay aligned (desktop only). */
export const APP_COLS = "md:grid-cols-[minmax(0,1fr)_148px_104px_140px_168px]";
const APP_GRID = `md:grid ${APP_COLS} md:items-center md:gap-4`;

// Dates are stored as UTC instants / date strings; pin the formatter to UTC so the server
// render is stable (no locale drift) and matches how the action stamps them.
const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

function formatDate(value: string | null): string {
  if (!value) return "—";
  const t = Date.parse(value);
  return Number.isNaN(t) ? "—" : DATE_FMT.format(new Date(t));
}

/** A follow-up is "due" once its date has passed and the application is still open. */
function isFollowUpDue(followUpAt: string | null, stage: ApplicationStage): boolean {
  if (!followUpAt || isClosedStage(stage)) return false;
  const t = Date.parse(followUpAt);
  return !Number.isNaN(t) && t <= Date.now();
}

/**
 * One application on the Job Tracker. The stage badge (column 2) opens the tracking dialog; the
 * applied / follow-up dates are read-only summaries (edited in the dialog). Open jumps to the
 * editor; Export is enabled only once the resume is Ready (FR-28).
 */
export function ApplicationRow({ app }: { app: ApplicationView }) {
  const due = isFollowUpDue(app.followUpAt, app.stage);

  return (
    <div className={`rounded-lg border border-hairline bg-surface-card px-5 py-4 ${APP_GRID}`}>
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-ink" title={app.role}>
          {app.role}
        </h3>
        {app.company && (
          <p className="mt-0.5 truncate font-mono text-xs text-muted">{app.company}</p>
        )}
      </div>

      <div className="mt-3 md:mt-0">
        <ApplicationPanel
          id={app.id}
          role={app.role}
          company={app.company}
          stage={app.stage}
          appliedAt={app.appliedAt}
          followUpAt={app.followUpAt}
          jobUrl={app.jobUrl}
          notes={app.notes}
          stageHistory={app.stageHistory}
        />
      </div>

      <div className="mt-2 font-mono text-xs text-muted md:mt-0">
        <span className="text-muted-soft md:hidden">Applied: </span>
        {formatDate(app.appliedAt)}
      </div>

      <div className="mt-2 font-mono text-xs md:mt-0">
        <span className="text-muted-soft md:hidden">Follow-up: </span>
        <span className={due ? "text-warning" : "text-muted"}>
          {formatDate(app.followUpAt)}
          {due && " · due"}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 md:mt-0">
        <Link href={`/editor/${app.id}`} className={actionSecondary}>
          Open
        </Link>
        {app.status === "ready" ? (
          <ExportButton id={app.id} />
        ) : (
          <button
            type="button"
            disabled
            className={actionDisabled}
            title={
              app.status === "review"
                ? "Resolve the AI proposals before exporting"
                : "Finish this draft before exporting"
            }
          >
            Export
          </button>
        )}
      </div>
    </div>
  );
}
