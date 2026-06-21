"use server";

import { revalidatePath } from "next/cache";
import { requireAllowlistedUser, AuthorizationError } from "@/lib/auth/guards";
import { parseResume } from "@/lib/ai/parse-resume";
import type { AiErrorCategory } from "@/lib/ai/errors";
import { logAiEvent } from "@/lib/ai/log";
import {
  validateResumeInput,
  validateResumePdf,
  describePdfRejection,
  MAX_RESUME_INPUT_CHARS,
} from "./input";
import type { ParseSource } from "@/lib/ai/parse-resume";
import { assembleResumeDoc } from "./assemble";
import { validateParseResult, validateResumeDoc } from "./validate";
import { deriveResumeTitle } from "./title";
import type { GenerationResult } from "./schema";

/**
 * Server actions for resume parsing and the resume CRUD that backs the dashboard. Every
 * action gates on `requireAllowlistedUser` (the real authorization boundary — middleware is
 * UX only) and never persists invalid data. Parsing returns a DRAFT for client-side review;
 * nothing is written until the user explicitly saves (PRD §6.1, FR-7). Resume rows live in
 * `public.resumes` (one per row, many per user) and are always scoped by `id` + `user_id`
 * in addition to RLS.
 */

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

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
  try {
    await requireAllowlistedUser();
  } catch (err) {
    if (err instanceof AuthorizationError) return parseError("auth");
    throw err;
  }

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

// ---------------------------------------------------------------------------
// Resume CRUD (public.resumes — one row per resume, many per user)
// ---------------------------------------------------------------------------

export type CreateResumeResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

export type SaveResumeState =
  | { ok: true; version: number }
  | { ok: false; category: "validation" | "auth" | "network" | "unknown"; message: string };

export type MutateResumeResult = { ok: true } | { ok: false; message: string };

const TITLE_MAX = 120;
const AUTH_MESSAGE = "Your session has expired. Refresh the page and sign in again.";

function sanitizeTitle(raw: string): string {
  return raw.trim().slice(0, TITLE_MAX);
}

/**
 * Create a new resume row. Used by onboarding (a reviewed parse draft) and by the
 * dashboard's "Start blank" (an empty doc). The doc is validated before any write, so an
 * invalid document is never persisted. Title falls back to the header name, then a default.
 */
export async function createResume(input: {
  doc: unknown;
  title?: string;
}): Promise<CreateResumeResult> {
  let user, supabase;
  try {
    ({ user, supabase } = await requireAllowlistedUser());
  } catch (err) {
    if (err instanceof AuthorizationError) return { ok: false, message: AUTH_MESSAGE };
    throw err;
  }

  const validated = validateResumeDoc(input.doc);
  if (!validated.ok) {
    return { ok: false, message: "This resume isn't valid and was not saved." };
  }

  const title = sanitizeTitle(input.title ?? "") || deriveResumeTitle(validated.data);

  try {
    const { data, error } = await supabase
      .from("resumes")
      .insert({ user_id: user.id, title, doc: validated.data })
      .select("id")
      .single();
    if (error || !data) {
      return { ok: false, message: "We couldn't create the resume. Please try again." };
    }
    revalidatePath("/dashboard");
    return { ok: true, id: data.id as string };
  } catch {
    return { ok: false, message: "We couldn't create the resume. Please try again." };
  }
}

/**
 * Persist edits to an existing resume and bump its version (explicit save — autosave +
 * multi-tab compare-and-swap are M6). Scoped by `id` + `user_id`; a 0-row update is treated
 * as a failure so a good resume is never silently overwritten (FR-8 spirit).
 */
export async function saveResume(id: string, doc: unknown): Promise<SaveResumeState> {
  let user, supabase;
  try {
    ({ user, supabase } = await requireAllowlistedUser());
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { ok: false, category: "auth", message: AUTH_MESSAGE };
    }
    throw err;
  }

  const validated = validateResumeDoc(doc);
  if (!validated.ok) {
    return {
      ok: false,
      category: "validation",
      message: "This resume isn't valid and was not saved.",
    };
  }

  const failed = (category: "network" | "unknown"): SaveResumeState => ({
    ok: false,
    category,
    message: "We couldn't save your resume. Please try again.",
  });

  try {
    const { data: current, error: readError } = await supabase
      .from("resumes")
      .select("version")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (readError || !current) return failed("network");

    const nextVersion = (current.version ?? 0) + 1;
    const { data: updated, error: updateError } = await supabase
      .from("resumes")
      .update({ doc: validated.data, version: nextVersion })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("version")
      .single();

    if (updateError || !updated) return failed("network");
    revalidatePath("/dashboard");
    revalidatePath(`/editor/${id}`);
    return { ok: true, version: updated.version as number };
  } catch {
    return failed("unknown");
  }
}

/** Rename a resume. Empty titles are rejected; nothing is written when invalid. */
export async function renameResume(
  id: string,
  rawTitle: string,
): Promise<MutateResumeResult> {
  let user, supabase;
  try {
    ({ user, supabase } = await requireAllowlistedUser());
  } catch (err) {
    if (err instanceof AuthorizationError) return { ok: false, message: AUTH_MESSAGE };
    throw err;
  }

  const title = sanitizeTitle(rawTitle);
  if (title === "") return { ok: false, message: "Enter a name for this resume." };

  try {
    const { data, error } = await supabase
      .from("resumes")
      .update({ title })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: "We couldn't rename this resume." };
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, message: "We couldn't rename this resume." };
  }
}

/** Copy an existing resume into a new row titled "<title> (copy)". */
export async function duplicateResume(id: string): Promise<CreateResumeResult> {
  let user, supabase;
  try {
    ({ user, supabase } = await requireAllowlistedUser());
  } catch (err) {
    if (err instanceof AuthorizationError) return { ok: false, message: AUTH_MESSAGE };
    throw err;
  }

  try {
    const { data: src, error: readError } = await supabase
      .from("resumes")
      .select("title, doc")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (readError || !src) return { ok: false, message: "We couldn't find that resume." };

    // Defensive: never copy a doc that no longer validates.
    const validated = validateResumeDoc(src.doc);
    if (!validated.ok) {
      return { ok: false, message: "That resume can't be duplicated because it's invalid." };
    }

    const title = sanitizeTitle(`${src.title} (copy)`);
    const { data, error } = await supabase
      .from("resumes")
      .insert({ user_id: user.id, title, doc: validated.data })
      .select("id")
      .single();
    if (error || !data) {
      return { ok: false, message: "We couldn't duplicate this resume." };
    }
    revalidatePath("/dashboard");
    return { ok: true, id: data.id as string };
  } catch {
    return { ok: false, message: "We couldn't duplicate this resume." };
  }
}

/** Permanently delete a resume the user owns. */
export async function deleteResume(id: string): Promise<MutateResumeResult> {
  let user, supabase;
  try {
    ({ user, supabase } = await requireAllowlistedUser());
  } catch (err) {
    if (err instanceof AuthorizationError) return { ok: false, message: AUTH_MESSAGE };
    throw err;
  }

  try {
    const { error } = await supabase
      .from("resumes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { ok: false, message: "We couldn't delete this resume." };
    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, message: "We couldn't delete this resume." };
  }
}
