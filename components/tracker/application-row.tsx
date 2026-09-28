import Link from "next/link";
import {
  isClosedStage,
  type ApplicationStage,
  type StageHistoryEntry,
} from "@/lib/applications/stages";
import type { TailoredStatus } from "@/lib/resume";
import { ApplicationPanel } from "./application-panel";
import { ExportButton } from "@/components/dashboard/export-button";
import { actionSecondary, actionDisabled } from "@/components/ui/styles";

export type ApplicationView = {
  id: string;
  role: string;
  company: string;
  status: TailoredStatus;
  stage: ApplicationStage;
  appliedAt: string | null;
  followUpAt: string | null;
  jobUrl: string | null;
  notes: string | null;
  stageHistory: StageHistoryEntry[];
};

export const APP_COLS = "md:grid-cols-[minmax(0,1fr)_148px_104px_140px_168px]";
const APP_GRID = `md:grid ${APP_COLS} md:items-center md:gap-4`;

// Pinned to UTC: matches how dates are stored/stamped and keeps server rendering locale-stable.
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

function isFollowUpDue(followUpAt: string | null, stage: ApplicationStage): boolean {
  if (!followUpAt || isClosedStage(stage)) return false;
  const t = Date.parse(followUpAt);
  return !Number.isNaN(t) && t <= Date.now();
}

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
