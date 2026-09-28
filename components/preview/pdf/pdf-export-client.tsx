"use client";

import { useEffect } from "react";
import { usePDF } from "@react-pdf/renderer";
import type { ResumeDoc } from "@/lib/resume";
import { formatDateForFilename, resumeFileName } from "@/lib/render/filename";
import { ResumePdf } from "./resume-pdf";

export default function PdfExportClient({ doc }: { doc: ResumeDoc }) {
  const [instance, update] = usePDF({ document: <ResumePdf doc={doc} /> });

  useEffect(() => {
    update(<ResumePdf doc={doc} />);
  }, [doc, update]);

  const fileName = resumeFileName(doc, { date: formatDateForFilename(new Date()) });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-surface-card p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Generated in your browser · never uploaded
        </p>
        <a
          href={instance.loading || instance.error ? undefined : instance.url ?? undefined}
          download={fileName}
          aria-disabled={instance.loading || !!instance.error || !instance.url}
          className={
            "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-semibold " +
            "bg-primary text-on-primary hover:bg-primary-active " +
            "aria-disabled:pointer-events-none aria-disabled:bg-primary-disabled aria-disabled:text-muted"
          }
        >
          Download PDF
        </a>
      </div>

      <div className="overflow-hidden rounded-md border border-hairline bg-paper">
        {instance.error ? (
          <PdfMessage tone="error">
            The PDF could not be generated. Edit the resume and try again.
          </PdfMessage>
        ) : instance.loading || !instance.url ? (
          <PdfMessage>Rendering PDF…</PdfMessage>
        ) : (
          <iframe
            src={instance.url}
            title="Resume PDF preview"
            className="h-[560px] w-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}

function PdfMessage({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "error";
}) {
  return (
    <p
      className={
        "flex h-[560px] items-center justify-center p-6 text-center text-sm " +
        (tone === "error" ? "text-error" : "text-muted")
      }
    >
      {children}
    </p>
  );
}
