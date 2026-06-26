"use client";

import { useState } from "react";
import { loadResumeForExport } from "@/lib/resume/actions";
import { formatDateForFilename, resumeFileName } from "@/lib/render/filename";
import { actionPrimary } from "./ui";

/**
 * One-click PDF export for a Ready tailored job. The doc is fetched on demand and the react-pdf
 * engine is dynamically imported only when the user clicks — so it never weighs down the
 * dashboard bundle and never runs on the server (it's browser-only). The blob is built and
 * downloaded locally; nothing is uploaded, matching the in-editor export contract (FR-30).
 */
export function ExportButton({ id, label = "Export" }: { id: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      const res = await loadResumeForExport(id);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      const [{ pdf }, { ResumePdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/preview/pdf/resume-pdf"),
      ]);
      const blob = await pdf(<ResumePdf doc={res.doc} />).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = resumeFileName(res.doc, { date: formatDateForFilename(new Date()) });
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Open the resume and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={handleExport} disabled={busy} className={actionPrimary}>
        {busy ? "Exporting…" : label}
      </button>
      {error && (
        <p
          role="alert"
          className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border border-error/40 bg-surface-card px-2 py-1 text-right text-xs text-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}
