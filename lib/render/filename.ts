import type { ResumeDoc } from "@/lib/resume";

export function slugifySegment(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDateForFilename(date: Date): string {
  const yyyy = date.getFullYear().toString().padStart(4, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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
