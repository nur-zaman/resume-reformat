/**
 * PDF download filename construction (PRD FR-30).
 *
 * Produces names like `first-last_company_role_YYYY-MM-DD.pdf` with unsafe filename
 * characters removed. Pure and deterministic: the calling component supplies the date
 * (no clock access here), so this is fully unit-testable.
 */

import type { ResumeDoc } from "@/lib/resume";

/**
 * Lowercase a single name segment and reduce it to a safe `[a-z0-9-]` slug:
 * diacritics stripped, runs of unsafe characters collapsed to a single hyphen, and
 * leading/trailing hyphens trimmed. Returns "" when nothing survives.
 */
export function slugifySegment(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Format a Date as `YYYY-MM-DD` (local date) for the filename suffix. */
export function formatDateForFilename(date: Date): string {
  const yyyy = date.getFullYear().toString().padStart(4, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Build a PDF filename from optional name/company/role segments plus a `YYYY-MM-DD`
 * date. Empty or unslugifiable segments are dropped; if every segment is empty the
 * stem falls back to `resume`.
 */
export function buildPdfFilename(input: {
  name?: string;
  company?: string;
  role?: string;
  date: string;
}): string {
  const stem =
    [input.name, input.company, input.role]
      .map((s) => (s ? slugifySegment(s) : ""))
      .filter((s) => s.length > 0)
      .join("_") || "resume";
  return `${stem}_${input.date}.pdf`;
}

/**
 * Convenience over `buildPdfFilename`: derive the candidate name from the resume's
 * header. Company/role come from job context when available (wired in M5/M6); for now
 * they are optional and omitted when absent.
 */
export function resumeFileName(
  doc: ResumeDoc,
  opts: { company?: string; role?: string; date: string },
): string {
  const header = doc.blocks.find((b) => b.type === "header");
  const name = header && header.type === "header" ? header.name : "";
  return buildPdfFilename({
    name,
    company: opts.company,
    role: opts.role,
    date: opts.date,
  });
}
