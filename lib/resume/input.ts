export const MAX_RESUME_INPUT_CHARS = 30_000;

export type ResumeInputValidation =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "too_long"; length: number };

export function validateResumeInput(raw: string): ResumeInputValidation {
  const text = raw.trim();
  if (text.length === 0) {
    return { ok: false, reason: "empty", length: 0 };
  }
  if (text.length > MAX_RESUME_INPUT_CHARS) {
    return { ok: false, reason: "too_long", length: text.length };
  }
  return { ok: true, text };
}

export const MAX_JD_INPUT_CHARS = 40_000;

export type JobDescriptionValidation =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "too_long"; length: number };

export function validateJobDescriptionInput(raw: string): JobDescriptionValidation {
  const text = raw.trim();
  if (text.length === 0) {
    return { ok: false, reason: "empty", length: 0 };
  }
  if (text.length > MAX_JD_INPUT_CHARS) {
    return { ok: false, reason: "too_long", length: text.length };
  }
  return { ok: true, text };
}

// Must stay below the Server Action `bodySizeLimit` in next.config.ts (needs headroom for multipart overhead).
export const MAX_RESUME_PDF_BYTES = 5 * 1024 * 1024;

export const PDF_MEDIA_TYPE = "application/pdf";

export type ResumeFileLike = { size: number; type: string; name: string };

export type ResumePdfValidation =
  | { ok: true }
  | { ok: false; reason: "empty" | "wrong_type" | "too_large"; size: number };

export function validateResumePdf(file: ResumeFileLike): ResumePdfValidation {
  if (file.size === 0) {
    return { ok: false, reason: "empty", size: 0 };
  }
  const looksPdf =
    file.type === PDF_MEDIA_TYPE || file.name.toLowerCase().endsWith(".pdf");
  if (!looksPdf) {
    return { ok: false, reason: "wrong_type", size: file.size };
  }
  if (file.size > MAX_RESUME_PDF_BYTES) {
    return { ok: false, reason: "too_large", size: file.size };
  }
  return { ok: true };
}

export function describePdfRejection(
  rejection: Extract<ResumePdfValidation, { ok: false }>,
): string {
  switch (rejection.reason) {
    case "empty":
      return "That file looks empty. Choose a PDF that contains your resume.";
    case "wrong_type":
      return "That isn't a PDF. Upload your resume as a .pdf file, or paste it as text.";
    case "too_large": {
      const limitMb = Math.round(MAX_RESUME_PDF_BYTES / (1024 * 1024));
      return `That PDF is too large. Keep it under ${limitMb} MB, or paste the text instead.`;
    }
  }
}
