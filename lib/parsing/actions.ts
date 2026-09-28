"use server";

import { authorize } from "@/lib/auth/guards";
import type { AiErrorCategory } from "@/lib/ai/errors";
import { logAiEvent } from "@/lib/ai/log";
import {
  validateResumeInput,
  validateResumePdf,
  describePdfRejection,
  MAX_RESUME_INPUT_CHARS,
} from "@/lib/resume/input";
import { validateParseResult } from "@/lib/resume/validate";
import type { GenerationResult } from "@/lib/resume/schema";
import { parseResume, type ParseSource } from "./parse-resume";
import { assembleResumeDoc } from "./assemble";


export type ParseResumeState =
  | { status: "idle" }
  | { status: "success"; result: GenerationResult }
  | { status: "error"; category: AiErrorCategory; message: string };

const PARSE_ERROR_COPY: Record<AiErrorCategory, string> = {
  validation:
    "We couldn't read this as a resume. Check that it's plain resume text and try again.",
  quota: "The parser is busy right now. Please try again in a few minutes.",
  network: "We couldn't reach the parser. Check your connection and try again.",
  auth: "Your session has expired. Refresh the page and sign in again.",
  unknown: "Something went wrong while parsing. Please try again.",
};

function parseError(category: AiErrorCategory, message?: string): ParseResumeState {
  return { status: "error", category, message: message ?? PARSE_ERROR_COPY[category] };
}

export async function parseResumeAction(
  _prev: ParseResumeState,
  formData: FormData,
): Promise<ParseResumeState> {
  // 1. Authorize before reading input or incurring any AI cost.
  if (!(await authorize())) return parseError("auth");

  // 2. Deterministic input guard — rejected BEFORE any AI call and never retried. A PDF
  //    upload takes precedence over the textarea when both are present.
  const file = formData.get("resumeFile");
  let source: ParseSource;
  if (file instanceof File && file.size > 0) {
    const check = validateResumePdf({ size: file.size, type: file.type, name: file.name });
    if (!check.ok) return parseError("validation", describePdfRejection(check));
    source = {
      kind: "pdf",
      bytes: new Uint8Array(await file.arrayBuffer()),
      filename: file.name,
    };
  } else {
    const input = validateResumeInput(String(formData.get("resumeText") ?? ""));
    if (!input.ok) {
      return parseError(
        "validation",
        input.reason === "empty"
          ? "Paste your resume text, or upload a PDF, before parsing."
          : `Your resume is ${input.length.toLocaleString()} characters; the limit is ${MAX_RESUME_INPUT_CHARS.toLocaleString()}. Trim it before parsing.`,
      );
    }
    source = { kind: "text", text: input.text };
  }

  // 3. AI parse (handles its own single retry on schema failure).
  const parsed = await parseResume(source);
  if (!parsed.ok) return parseError(parsed.category);

  // 4. Deterministic assembly into the canonical doc, then the strict gate.
  const envelope = assembleResumeDoc(parsed.output);
  const checked = validateParseResult(envelope);
  if (!checked.ok) {
    // An assembled doc that fails validation is an assembler bug, not bad model output.
    logAiEvent({
      requestId: crypto.randomUUID(),
      event: "parse",
      status: "error",
      attempts: parsed.attempts,
      durationMs: 0,
      modelId: process.env.AI_MODEL_ID,
      errorCategory: "validation",
    });
    return parseError("validation");
  }

  // 5. Return the draft for review — NOT persisted (review precedes the first save).
  return { status: "success", result: checked.data };
}
