/**
 * Resume input-length guard (PRD FR-5, §11 cost controls).
 *
 * Pure and dependency-free so the live character counter (client) and the parse server
 * action (server) measure identically — the server must never reject something the
 * counter said was fine, and oversized input must be rejected BEFORE any AI call.
 */

export const MAX_RESUME_INPUT_CHARS = 30_000;

export type ResumeInputValidation =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "too_long"; length: number };

/**
 * Trim, then measure by UTF-16 code-unit length (`String.length`) to match the PRD's
 * "characters" and the client counter. Whitespace-only input is `empty`.
 */
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

// ---------------------------------------------------------------------------
// Job description (M5 tailoring input, PRD FR-9)
// ---------------------------------------------------------------------------

export const MAX_JD_INPUT_CHARS = 40_000;

export type JobDescriptionValidation =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "too_long"; length: number };

/**
 * Validate a pasted job description identically on the client counter and the server
 * action. Same UTF-16 code-unit measure as the resume guard; oversized input is rejected
 * BEFORE any AI call to protect the free quota.
 */
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

// ---------------------------------------------------------------------------
// PDF upload (the alternative to pasted text)
// ---------------------------------------------------------------------------

/**
 * Upper bound on uploaded PDFs. Text-based resumes are well under 1 MB; this leaves room
 * for embedded fonts/images while capping cost and abuse. Must stay below the Server
 * Action `bodySizeLimit` configured in `next.config.ts` (which needs headroom for
 * multipart overhead).
 */
export const MAX_RESUME_PDF_BYTES = 5 * 1024 * 1024;

export const PDF_MEDIA_TYPE = "application/pdf";

/** The minimal shape of a chosen file — works for both a browser `File` and the server. */
export type ResumeFileLike = { size: number; type: string; name: string };

export type ResumePdfValidation =
  | { ok: true }
  | { ok: false; reason: "empty" | "wrong_type" | "too_large"; size: number };

/**
 * Validate a chosen PDF identically on the client (to gate the submit button) and the
 * server (the real boundary). Browsers sometimes report an empty `type`, so a `.pdf`
 * extension is accepted as a fallback signal.
 */
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

/** Shared user-facing copy for a rejected PDF, so client and server agree. */
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
