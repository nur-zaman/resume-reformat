import { requireAllowlistedUser } from "@/lib/auth/guards";
import {
  parseStageHistory,
  APPLICATION_STAGES,
  type ApplicationStage,
} from "@/lib/applications/stages";
import type { TailoredStatus } from "@/lib/resume";
import { ApplicationList } from "@/components/tracker/application-list";
import type { ApplicationView } from "@/components/tracker/application-row";

/**
 * Job Tracker — the application pipeline. Every tailored resume (kind='tailored') is one
 * application; this page is the dedicated home for its stage, dates, posting link, notes, and
 * timeline (the dashboard keeps the same resumes as editable documents). Scoped by owner; RLS
 * is the final boundary. Stage/date edits go through `updateApplication` and never touch the
 * resume document, so the two views stay independent.
 */
type TrackerRow = {
  id: string;
  company: string | null;
  target_role: string | null;
  status: string | null;
  application_stage: string | null;
  applied_at: string | null;
  follow_up_at: string | null;
  job_url: string | null;
  notes: string | null;
  stage_history: unknown;
};

const VALID_STATUSES: TailoredStatus[] = ["draft", "review", "ready"];

function toView(row: TrackerRow): ApplicationView {
  const status = VALID_STATUSES.includes(row.status as TailoredStatus)
    ? (row.status as TailoredStatus)
    : "ready";
  const stage = APPLICATION_STAGES.includes(row.application_stage as ApplicationStage)
    ? (row.application_stage as ApplicationStage)
    : "none";
  return {
    id: row.id,
    role: row.target_role?.trim() || "Tailored resume",
    company: row.company?.trim() ?? "",
    status,
    stage,
    appliedAt: row.applied_at ?? null,
    followUpAt: row.follow_up_at ?? null,
    jobUrl: row.job_url ?? null,
    notes: row.notes ?? null,
    stageHistory: parseStageHistory(row.stage_history),
  };
}

export default async function TrackerPage() {
  const { user, supabase } = await requireAllowlistedUser();
  const { data } = await supabase
    .from("resumes")
    .select(
      "id, company, target_role, status, application_stage, applied_at, follow_up_at, job_url, notes, stage_history",
    )
    .eq("user_id", user.id)
    .eq("kind", "tailored")
    .order("updated_at", { ascending: false });

  const apps = ((data ?? []) as TrackerRow[]).map(toView);

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
