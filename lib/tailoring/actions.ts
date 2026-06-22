"use server";

import { headers } from "next/headers";
import { requireAllowlistedUser, AuthorizationError } from "@/lib/auth/guards";
import { tailorResume } from "@/lib/ai/tailor-resume";
import type { AiErrorCategory } from "@/lib/ai/errors";
import { logAiEvent } from "@/lib/ai/log";
import { enforceGenerationRateLimit } from "@/lib/ratelimit";
import { assembleTailoredResult } from "@/lib/resume/tailor-assemble";
import { validateGenerationResult } from "@/lib/resume/validate";
import { resolveStoredResume } from "@/lib/resume/load";
import { validateJobDescriptionInput, MAX_JD_INPUT_CHARS } from "@/lib/resume/input";
import type { GenerationResult } from "@/lib/resume/schema";

/**
 * Tailoring server action (PRD §6.2). Like `parseResumeAction`, it gates on
 * `requireAllowlistedUser` (the real authorization boundary), rejects oversized input and
 * rate-limited callers BEFORE any AI cost, validates the assembled output, and returns a
 * DRAFT for client-side review. Nothing is persisted here — jobs/generations persistence is
 * M6; the reviewed draft is saved as a new resume via `createResume` (FR-14 holds trivially:
 * we never persist invalid output).
 */

export type TailorState =
  | { status: "idle" }
  | {
      status: "success";
      result: GenerationResult;
      job: { title: string; company: string };
    }
  | { status: "error"; category: AiErrorCategory; message: string };

const TAILOR_ERROR_COPY: Record<AiErrorCategory, string> = {
  validation: "We couldn't tailor this resume. Please try again.",
  quota: "The generator is busy right now. Please try again in a few minutes.",
  network: "We couldn't reach the generator. Check your connection and try again.",
  auth: "Your session has expired. Refresh the page and sign in again.",
  unknown: "Something went wrong while generating. Please try again.",
};

function tailorError(category: AiErrorCategory, message?: string): TailorState {
  return { status: "error", category, message: message ?? TAILOR_ERROR_COPY[category] };
}

/** Best-effort client IP for the per-IP limit. Vercel sets `x-forwarded-for`. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip")?.trim() || "unknown";
}

export async function tailorResumeAction(
  _prev: TailorState,
  formData: FormData,
): Promise<TailorState> {
  // 1. Authorize before reading input or incurring any AI cost.
  let user, supabase;
  try {
    ({ user, supabase } = await requireAllowlistedUser());
  } catch (err) {
    if (err instanceof AuthorizationError) return tailorError("auth");
    throw err;
  }

  // 2. Identify the base resume and read optional job metadata.
  const resumeId = String(formData.get("resumeId") ?? "");
  if (resumeId === "") {
    return tailorError("validation", "We couldn't find the base resume. Reopen it and try again.");
  }
  const userTitle = String(formData.get("jobTitle") ?? "").trim();
  const userCompany = String(formData.get("company") ?? "").trim();

  // 3. Deterministic input guard — rejected BEFORE any AI call (FR-9, §11).
  const jd = validateJobDescriptionInput(String(formData.get("jobDescription") ?? ""));
  if (!jd.ok) {
    return tailorError(
      "validation",
      jd.reason === "empty"
        ? "Paste the job description before generating."
        : `The job description is ${jd.length.toLocaleString()} characters; the limit is ${MAX_JD_INPUT_CHARS.toLocaleString()}. Trim it before generating.`,
    );
  }

  // 4. Per-user + per-IP rate limit (protect the free quota).
  const ip = await clientIp();
  const { allowed } = await enforceGenerationRateLimit({ userId: user.id, ip });
  if (!allowed) {
    return tailorError(
      "quota",
      "You've reached the generation limit for now. Please try again later.",
    );
  }

  // 5. Load the base resume, scoped by id + user (RLS is the final boundary).
  const { data, error } = await supabase
    .from("resumes")
    .select("doc")
    .eq("id", resumeId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) {
    return tailorError("validation", "We couldn't load that resume. Reopen it and try again.");
  }
  const resolved = resolveStoredResume(data.doc);
  if (resolved.kind !== "ok") {
    return tailorError("validation", "That resume isn't valid and can't be tailored.");
  }
  const baseResume = resolved.doc;

  // 6. AI tailor (handles its own single retry on schema failure).
  const tailored = await tailorResume({ baseResume, jobDescription: jd.text });
  if (!tailored.ok) return tailorError(tailored.category);

  // 7. Deterministic assembly into the canonical envelope, then the strict gate.
  const envelope = assembleTailoredResult(tailored.output, baseResume);
  const checked = validateGenerationResult(envelope);
  if (!checked.ok) {
    // An assembled doc that fails validation is an assembler bug, not bad model output.
    logAiEvent({
      requestId: crypto.randomUUID(),
      event: "tailor",
      status: "error",
      attempts: tailored.attempts,
      durationMs: 0,
      modelId: process.env.AI_MODEL_ID,
      errorCategory: "validation",
    });
    return tailorError("validation");
  }

  // 8. Title rule (§6.2): user-entered wins; otherwise fall back to inferred metadata.
  const job = {
    title: userTitle || checked.data.inferredJob.title || "",
    company: userCompany || checked.data.inferredJob.company || "",
  };

  // 9. Return the draft for review — NOT persisted (review precedes any save; M6 adds
  //    jobs/generations history).
  return { status: "success", result: checked.data, job };
}
