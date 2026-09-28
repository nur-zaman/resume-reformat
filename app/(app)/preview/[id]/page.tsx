import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAllowlistedUser } from "@/lib/auth/guards";
import { resolveStoredResume } from "@/lib/resume";
import { getResume } from "@/lib/resume/queries";
import { LoadError } from "@/components/ui/load-error";
import { ResumeDocument } from "@/components/preview/resume-document";
import { PdfExport } from "@/components/preview/pdf/pdf-export";
import { actionSecondary } from "@/components/ui/styles";

/**
 * Read-only preview of one resume — the canonical HTML sheet (same template as the editor's
 * live pane) plus a PDF download. Loaded scoped by id + owner (RLS is the real boundary). A
 * missing/foreign id returns to the dashboard; a doc that can't be read shows a first-class
 * load error without touching the stored value (FR-8).
 */
export default async function PreviewPage({
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
        message="It's stored in a format this preview can't open. Your saved copy is left untouched."
        href="/dashboard"
        linkLabel="Back to workspace"
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/dashboard" className="text-muted hover:text-ink">
          Workspace
        </Link>
        <span aria-hidden className="text-muted-soft">
          /
        </span>
        <span className="truncate font-medium text-body-strong" title={data.title}>
          {data.title}
        </span>
        <span aria-hidden className="text-muted-soft">
          /
        </span>
        <span className="text-muted">Preview</span>
      </nav>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Preview
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
            {data.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Read-only. Generate a PDF, or open the editor to make changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/editor/${data.id}`} className={actionSecondary}>
            Edit
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <PdfExport doc={resolved.doc} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-hairline bg-surface-soft p-4">
        <div className="mx-auto w-[816px] max-w-full">
          <ResumeDocument doc={resolved.doc} />
        </div>
      </div>
    </div>
  );
}
