"use server";

import { clientIp } from "@/lib/http/client-ip";
import { authorize } from "@/lib/auth/guards";
import { tailorResume } from "./tailor-resume";
import type { AiErrorCategory } from "@/lib/ai/errors";
import { logAiEvent } from "@/lib/ai/log";
import { enforceGenerationRateLimit } from "@/lib/ratelimit";
import { assembleTailoredResult } from "./assemble";
import { validateGenerationResult } from "@/lib/resume/validate";
import { resolveStoredResume } from "@/lib/resume/load";
import { validateJobDescriptionInput, MAX_JD_INPUT_CHARS } from "@/lib/resume/input";
import type { GenerationResult } from "@/lib/resume/schema";

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

export async function tailorResumeAction(
  _prev: TailorState,
  formData: FormData,
): Promise<TailorState> {
  const auth = await authorize();
  if (!auth) return tailorError("auth");
  const { user, supabase } = auth;

  const resumeId = String(formData.get("resumeId") ?? "");
  if (resumeId === "") {
    return tailorError("validation", "We couldn't find the base resume. Reopen it and try again.");
  }
  const userTitle = String(formData.get("jobTitle") ?? "").trim();
  const userCompany = String(formData.get("company") ?? "").trim();

  const jd = validateJobDescriptionInput(String(formData.get("jobDescription") ?? ""));
  if (!jd.ok) {
    return tailorError(
      "validation",
      jd.reason === "empty"
        ? "Paste the job description before generating."
        : `The job description is ${jd.length.toLocaleString()} characters; the limit is ${MAX_JD_INPUT_CHARS.toLocaleString()}. Trim it before generating.`,
    );
  }

  const ip = await clientIp();
  const { allowed } = await enforceGenerationRateLimit({ userId: user.id, ip });
  if (!allowed) {
    return tailorError(
      "quota",
      "You've reached the generation limit for now. Please try again later.",
    );
  }

  // Scoped by id + user; RLS is the final boundary.
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

  const tailored = await tailorResume({ baseResume, jobDescription: jd.text });
  if (!tailored.ok) return tailorError(tailored.category);

  const envelope = assembleTailoredResult(tailored.output, baseResume);
  const checked = validateGenerationResult(envelope);
  if (!checked.ok) {
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

  const job = {
    title: userTitle || checked.data.inferredJob.title || "",
    company: userCompany || checked.data.inferredJob.company || "",
  };

  return { status: "success", result: checked.data, job };
}
