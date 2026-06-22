import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAllowlistedUser } from "@/lib/auth/guards";
import { resolveStoredResume } from "@/lib/resume";
import { TailoringFlow } from "@/components/tailoring/tailoring-flow";

/**
 * Tailor one of the user's resumes to a job description (PRD §6.2). Loads the base resume
 * scoped by id + owner (RLS is the real boundary). A missing/foreign id → back to the
 * dashboard; a stored doc that fails validation → a first-class load-error state (FR-8).
 * The generated draft is reviewed and saved as a NEW resume; jobs/generations history is M6.
 */
export default async function TailorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, supabase } = await requireAllowlistedUser();
  const { data } = await supabase
    .from("resumes")
    .select("id, title, doc")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) redirect("/dashboard");

  // Confirm the base resume is valid before the user invests in pasting a job description.
  const resolved = resolveStoredResume(data.doc);
  if (resolved.kind !== "ok") return <TailorLoadError id={data.id} />;

  return <TailoringFlow resumeId={data.id} resumeTitle={data.title} />;
}

function TailorLoadError({ id }: { id: string }) {
  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-error">
          Couldn&apos;t open your resume
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
          This resume can&apos;t be tailored
        </h1>
        <p className="mt-2 text-sm text-muted">
          It&apos;s stored in a format this editor can&apos;t open, so it can&apos;t be
          tailored. Your saved copy is left untouched.
        </p>
        <Link
          href={`/editor/${id}`}
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-active"
        >
          Back to the editor
        </Link>
      </div>
    </div>
  );
}
