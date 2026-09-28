import Link from "next/link";
import { requireAllowlistedUser } from "@/lib/auth/guards";
import { isGenerationPausedForUser } from "@/lib/ratelimit";
import {
  pendingReviewCount,
  resolveStoredResume,
  type Block,
  type ResumeDoc,
  parseTailoredStatus,
  type ReviewItem,
} from "@/lib/resume";
import { listResumes, type ResumeSummaryRow } from "@/lib/resume/queries";
import { WorkspaceHeading } from "@/components/dashboard/workspace-heading";
import { AiPausedBanner } from "@/components/dashboard/ai-paused-banner";
import { NewTailoringButton, type TailorBase } from "@/components/dashboard/new-tailoring-button";
import { NewResumeButton } from "@/components/dashboard/new-resume-button";
import { BaseResumeCard } from "@/components/dashboard/base-resume-card";
import { TailoredJobs } from "@/components/dashboard/tailored-jobs";
import type { TailoredJob } from "@/components/dashboard/tailored-job-row";
import { sectionLabel } from "@/components/ui/styles";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const DATETIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default async function DashboardPage() {
  const { user, supabase } = await requireAllowlistedUser();
  const [rows, aiPaused] = await Promise.all([
    listResumes({ supabase, userId: user.id }),
    isGenerationPausedForUser(user.id),
  ]);

  const bases = rows.filter((r) => r.kind !== "tailored");
  const tailored = rows.filter((r) => r.kind === "tailored");

  const tailorBases: TailorBase[] = bases.map((r) => ({
    id: r.id,
    label: resumeName(r),
  }));
  const jobs: TailoredJob[] = tailored.map(toJob);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <WorkspaceHeading action={<NewTailoringButton bases={tailorBases} />} />

      {aiPaused && (
        <div className="mt-8">
          <AiPausedBanner />
        </div>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <p className={sectionLabel}>Base resume</p>
          {bases.length > 0 && (
            <NewResumeButton variant="ghost" label="New base resume" />
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {bases.length === 0 ? (
            <BaseResumeEmptyState />
          ) : (
            bases.map((r) => <BaseResumeCard key={r.id} {...toBaseCard(r)} />)
          )}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-2.5">
            <p className={sectionLabel}>Tailored jobs</p>
            {jobs.length > 0 && (
              <span className="text-xs text-muted-soft">{jobs.length} active</span>
            )}
          </div>
          {jobs.length > 0 && (
            <Link
              href="/tracker"
              className="text-xs font-medium text-primary hover:underline"
            >
              Open job tracker →
            </Link>
          )}
        </div>
        <div className="mt-4">
          <TailoredJobs jobs={jobs} />
        </div>
      </section>
    </div>
  );
}

function BaseResumeEmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-hairline bg-surface-card/40 px-6 py-14 text-center">
      <h2 className="text-base font-semibold text-ink">No base resume yet</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
        Add your resume — import an existing one by pasting text or uploading a PDF, or start
        from a blank document. Then tailor it to any role.
      </p>
      <div className="mt-6 flex justify-center">
        <NewResumeButton label="Add base resume" />
      </div>
    </div>
  );
}

function headerBlock(doc: ResumeDoc): Extract<Block, { type: "header" }> | undefined {
  return doc.blocks.find(
    (b): b is Extract<Block, { type: "header" }> => b.type === "header",
  );
}

function resumeName(row: ResumeSummaryRow): string {
  const resolved = resolveStoredResume(row.doc);
  if (resolved.kind === "ok") {
    const name = headerBlock(resolved.doc)?.name.trim();
    if (name) return name;
  }
  return row.title || "Untitled resume";
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toBaseCard(row: ResumeSummaryRow) {
  const resolved = resolveStoredResume(row.doc);
  const doc = resolved.kind === "ok" ? resolved.doc : null;
  const header = doc ? headerBlock(doc) : undefined;
  const name = header?.name.trim() || row.title || "Untitled resume";
  const sections = doc
    ? doc.blocks
        .filter((b) => (b.type === "header" ? true : b.visible))
        .map((b) => (b.type === "header" ? "Header" : b.title))
    : [];
  return {
    id: row.id,
    name,
    headline: header?.headline.trim() ?? "",
    initials: initialsFor(name),
    sections,
    updatedLabel: DATE_FORMAT.format(new Date(row.updated_at)),
  };
}

function toJob(row: ResumeSummaryRow): TailoredJob {
  const items = (Array.isArray(row.review_items) ? row.review_items : []) as ReviewItem[];
  const version = (row.version ?? 0) + 1;
  return {
    id: row.id,
    role: row.target_role?.trim() || "Tailored resume",
    company: row.company?.trim() ?? "",
    versionLabel: `${version} version${version === 1 ? "" : "s"}`,
    status: parseTailoredStatus(row.status),
    pendingCount: pendingReviewCount(items),
    updatedLabel: DATETIME_FORMAT.format(new Date(row.updated_at)),
  };
}
