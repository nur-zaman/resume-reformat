import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAllowlistedUser } from "@/lib/auth/guards";
import {
  resolveStoredResume,
  validateWorkingDoc,
  type ResumeKind,
  type ReviewItem,
} from "@/lib/resume";
import { ResumeWorkspace } from "@/components/editor/resume-workspace";

/**
 * Edit one of the user's resumes. Loads `public.resumes` scoped by id + owner (RLS is the
 * real boundary). A missing/foreign id → back to the dashboard; a stored doc that fails
 * validation → a first-class load-error state that never overwrites the stored value
 * (FR-8); otherwise seed the editor.
 */
export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, supabase } = await requireAllowlistedUser();
  const { data } = await supabase
    .from("resumes")
    .select("id, title, doc, kind, review_items")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) redirect("/dashboard");

  const resolved = resolveStoredResume(data.doc);
  if (resolved.kind !== "ok") return <EditorLoadError />;

  // Persisted proposals seed the review queue. Validate them against the resolved doc and
  // drop them defensively if they no longer line up — never block editing on bad metadata.
  const kind: ResumeKind = data.kind === "tailored" ? "tailored" : "base";
  let reviewItems: ReviewItem[] = [];
  if (kind === "tailored") {
    const working = validateWorkingDoc({
      resume: resolved.doc,
      reviewItems: data.review_items ?? [],
    });
    if (working.ok) reviewItems = working.data.reviewItems;
  }

  return (
    <ResumeWorkspace
      id={data.id}
      title={data.title}
      initialDoc={resolved.doc}
      kind={kind}
      initialReviewItems={reviewItems}
    />
  );
}

function EditorLoadError() {
  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-error">
          Couldn&apos;t open your resume
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
          This resume couldn&apos;t be read
        </h1>
        <p className="mt-2 text-sm text-muted">
          It&apos;s stored in a format this editor can&apos;t open. Your saved copy is left
          untouched. You can import a fresh resume to replace it.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-active"
        >
          Back to resumes
        </Link>
      </div>
    </div>
  );
}
