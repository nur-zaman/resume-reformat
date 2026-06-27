import { TailoredJobRow, type TailoredJob, JOB_COLS } from "./tailored-job-row";

/**
 * The "Tailored jobs" band: an aligned column header (desktop only) over a stack of job rows,
 * or a quiet empty state prompting the first tailoring. These are the tailored resumes as
 * documents; track them as job applications on the Job Tracker page.
 */
export function TailoredJobs({ jobs }: { jobs: TailoredJob[] }) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-hairline bg-surface-card/40 px-6 py-12 text-center">
        <p className="text-sm font-medium text-body">No tailored resumes yet</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
          Start a new tailoring to adapt your base resume to a specific job. Each one shows up
          here with its review status and version history.
        </p>
      </div>
    );
  }

  const colLabel =
    "font-mono text-[11px] uppercase tracking-[0.16em] text-muted-soft";

  return (
    <div className="flex flex-col gap-3">
      <div className={`hidden px-5 md:grid md:gap-4 ${JOB_COLS}`}>
        <span className={colLabel}>Role</span>
        <span className={colLabel}>Status</span>
        <span className={colLabel}>Updated</span>
        <span aria-hidden />
      </div>
      {jobs.map((job) => (
        <TailoredJobRow key={job.id} job={job} />
      ))}
    </div>
  );
}
