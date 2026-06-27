import Link from "next/link";
import { applicationStats, type ApplicationStats } from "@/lib/resume";
import { ApplicationRow, type ApplicationView, APP_COLS } from "./application-row";

/**
 * The Job Tracker list: a pipeline summary, an aligned column header (desktop only), and a
 * stack of application rows — or an empty state pointing back to tailoring. Each tailored
 * resume is one application; stage/dates/notes are edited inline via each row's dialog.
 */
export function ApplicationList({ apps }: { apps: ApplicationView[] }) {
  if (apps.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-hairline bg-surface-card/40 px-6 py-14 text-center">
        <h2 className="text-base font-semibold text-ink">No applications yet</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
          Tailor a resume to a job and it shows up here, ready to track from{" "}
          <span className="whitespace-nowrap">Not applied</span> through Offer.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-active"
        >
          Go to workspace
        </Link>
      </div>
    );
  }

  const stats = applicationStats(apps);
  const colLabel = "font-mono text-[11px] uppercase tracking-[0.16em] text-muted-soft";

  return (
    <div className="flex flex-col gap-3">
      <PipelineSummary stats={stats} />
      <div className={`hidden px-5 md:grid md:gap-4 ${APP_COLS}`}>
        <span className={colLabel}>Role</span>
        <span className={colLabel}>Stage</span>
        <span className={colLabel}>Applied</span>
        <span className={colLabel}>Follow-up</span>
        <span aria-hidden />
      </div>
      {apps.map((app) => (
        <ApplicationRow key={app.id} app={app} />
      ))}
    </div>
  );
}

/** Compact pipeline summary above the list (PRD-application-tracking §11). */
function PipelineSummary({ stats }: { stats: ApplicationStats }) {
  const parts = [
    `${stats.active} active`,
    `${stats.applied} applied`,
    `${stats.interviewing} interviewing`,
    `${stats.offers} offer${stats.offers === 1 ? "" : "s"}`,
  ];
  if (stats.responseRate !== null) {
    parts.push(`${Math.round(stats.responseRate * 100)}% response`);
  }
  return <p className="px-1 font-mono text-[11px] text-muted-soft">{parts.join("  ·  ")}</p>;
}
