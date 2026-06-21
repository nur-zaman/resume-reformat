import { requireAllowlistedUser } from "@/lib/auth/guards";
import { NewResumeButton } from "@/components/dashboard/new-resume-button";
import { ResumeCard } from "@/components/dashboard/resume-card";

/**
 * Authenticated home: the user's resumes (PRD-deferred "multiple resumes", pulled forward).
 * Lists `public.resumes` newest-first with create/open/rename/duplicate/delete. Minimal and
 * mobile-friendly — a single-column card list that grows to a grid on wider viewports.
 */
type ResumeRow = { id: string; title: string; updated_at: string };

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function DashboardPage() {
  const { user, supabase } = await requireAllowlistedUser();
  const { data } = await supabase
    .from("resumes")
    .select("id, title, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const resumes = (data ?? []) as ResumeRow[];

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-primary">
            Your resumes
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Resumes</h1>
        </div>
        <NewResumeButton />
      </div>

      {resumes.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => (
            <li key={r.id}>
              <ResumeCard
                id={r.id}
                title={r.title}
                updatedLabel={DATE_FORMAT.format(new Date(r.updated_at))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-lg border border-dashed border-hairline bg-surface-card px-6 py-16 text-center">
      <h2 className="text-lg font-semibold text-ink">No resumes yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Create your first resume — import an existing one by pasting text or uploading a
        PDF, or start from a blank document.
      </p>
      <div className="mt-6 flex justify-center">
        <NewResumeButton />
      </div>
    </div>
  );
}
