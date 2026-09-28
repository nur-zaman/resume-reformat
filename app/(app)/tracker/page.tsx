import { requireAllowlistedUser } from "@/lib/auth/guards";
import { parseApplicationStage, parseStageHistory } from "@/lib/applications/stages";
import { parseTailoredStatus } from "@/lib/resume";
import { listApplications, type ApplicationRow } from "@/lib/resume/queries";
import { ApplicationList } from "@/components/tracker/application-list";
import type { ApplicationView } from "@/components/tracker/application-row";

/**
 * Job Tracker — the application pipeline. Every tailored resume (kind='tailored') is one
 * application; this page is the dedicated home for its stage, dates, posting link, notes, and
 * timeline (the dashboard keeps the same resumes as editable documents). Scoped by owner; RLS
 * is the final boundary. Stage/date edits go through `updateApplication` and never touch the
 * resume document, so the two views stay independent.
 */
function toView(row: ApplicationRow): ApplicationView {
  return {
    id: row.id,
    role: row.target_role?.trim() || "Tailored resume",
    company: row.company?.trim() ?? "",
    status: parseTailoredStatus(row.status),
    stage: parseApplicationStage(row.application_stage),
    appliedAt: row.applied_at ?? null,
    followUpAt: row.follow_up_at ?? null,
    jobUrl: row.job_url ?? null,
    notes: row.notes ?? null,
    stageHistory: parseStageHistory(row.stage_history),
  };
}

export default async function TrackerPage() {
  const { user, supabase } = await requireAllowlistedUser();
  const apps = (await listApplications({ supabase, userId: user.id })).map(toView);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <header>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Job Tracker
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Job Tracker</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Track each tailored resume through your application pipeline — stage, key dates, the
          posting link, and notes. Changing a stage never edits the resume itself.
        </p>
      </header>

      <div className="mt-8">
        <ApplicationList apps={apps} />
      </div>
    </div>
  );
}
