import { redirect } from "next/navigation";
import { requireAllowlistedUser } from "@/lib/auth/guards";
import { resolveStoredResume } from "@/lib/resume";
import { getResume } from "@/lib/resume/queries";
import { LoadError } from "@/components/ui/load-error";
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
  const data = await getResume({ supabase, userId: user.id }, id);

  if (!data) redirect("/dashboard");

  // Confirm the base resume is valid before the user invests in pasting a job description.
  const resolved = resolveStoredResume(data.doc);
  if (resolved.kind !== "ok") {
    return (
      <LoadError
        title="This resume can't be tailored"
        message="It's stored in a format this editor can't open, so it can't be tailored. Your saved copy is left untouched."
        href={`/editor/${data.id}`}
        linkLabel="Back to the editor"
      />
    );
  }

  return <TailoringFlow resumeId={data.id} resumeTitle={data.title} />;
}
