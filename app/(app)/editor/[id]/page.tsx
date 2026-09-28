import { redirect } from "next/navigation";
import { requireAllowlistedUser } from "@/lib/auth/guards";
import {
  resolveStoredResume,
  validateWorkingDoc,
  type ResumeKind,
  type ReviewItem,
} from "@/lib/resume";
import { getResume } from "@/lib/resume/queries";
import { LoadError } from "@/components/ui/load-error";
import { ResumeWorkspace } from "@/components/editor/resume-workspace";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, supabase } = await requireAllowlistedUser();
  const data = await getResume({ supabase, userId: user.id }, id);

  if (!data) redirect("/dashboard");

  const resolved = resolveStoredResume(data.doc);
  if (resolved.kind !== "ok") {
    return (
      <LoadError
        title="This resume couldn't be read"
        message="It's stored in a format this editor can't open. Your saved copy is left untouched. You can import a fresh resume to replace it."
        href="/dashboard"
        linkLabel="Back to resumes"
      />
    );
  }

  // Defensive: drop stale review items rather than blocking editing on bad metadata.
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
