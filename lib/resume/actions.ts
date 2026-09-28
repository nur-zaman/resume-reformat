"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/auth/guards";
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
import { validateParseResult, validateResumeDoc, validateWorkingDoc } from "./validate";
import { resolveStoredResume } from "./load";
import { deriveResumeTitle } from "./title";
import { tailoredStatusFor, type ResumeKind } from "./status";
import {
  applyStageChange,
  parseStageHistory,
  APPLICATION_STAGES,
  type ApplicationStage,
} from "./application";
import type { GenerationResult, ResumeDoc, ReviewItem } from "./schema";

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
 * Create a new resume row. Used by onboarding and "Start blank" (a `base` resume) and by the
 * tailoring flow (a `tailored` resume carrying its job metadata + reviewed proposals). The doc
 * is validated before any write, so an invalid document is never persisted; for tailored
 * resumes the resume + its review items are validated together so orphaned proposals can't be
 * stored either. Title falls back to the header name, then a default.
 */
export async function createResume(input: {
  doc: unknown;
  title?: string;
  /** Defaults to "base"; "tailored" persists the job metadata + review items below. */
  kind?: ResumeKind;
  company?: string;
  targetRole?: string;
  /** The base resume this was tailored from (FK; SET NULL if that base is later deleted). */
  sourceResumeId?: string;
  reviewItems?: ReviewItem[];
  /** "draft" parks an unfinished tailoring; "finalize" (default) marks a resolved one ready. */
  intent?: "finalize" | "draft";
}): Promise<CreateResumeResult> {
  const auth = await authorize();
  if (!auth) return { ok: false, message: AUTH_MESSAGE };
  const { user, supabase } = auth;

  const validated = validateResumeDoc(input.doc);
  if (!validated.ok) {
    return { ok: false, message: "This resume isn't valid and was not saved." };
  }

  const title = sanitizeTitle(input.title ?? "") || deriveResumeTitle(validated.data);

  // Base resume: unchanged insert — column defaults (kind='base', status='ready',
  // review_items='[]') keep onboarding and "Start blank" byte-identical to before.
  if (input.kind !== "tailored") {
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

  // Tailored resume: validate the doc + review items together (no orphaned proposals), then
  // derive the lifecycle status from what's still pending.
  const working = validateWorkingDoc({
    resume: validated.data,
    reviewItems: input.reviewItems ?? [],
  });
  if (!working.ok) {
    return { ok: false, message: "This tailored resume isn't valid and was not saved." };
  }
  const status = tailoredStatusFor(working.data.reviewItems, input.intent ?? "finalize");

  try {
    const { data, error } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        title,
        doc: validated.data,
        kind: "tailored",
        company: input.company?.trim() || null,
        target_role: input.targetRole?.trim() || null,
        source_resume_id: input.sourceResumeId ?? null,
        review_items: working.data.reviewItems,
        status,
      })
      .select("id")
      .single();
    if (error || !data) {
      return { ok: false, message: "We couldn't save this tailored resume. Please try again." };
    }
    revalidatePath("/dashboard");
    return { ok: true, id: data.id as string };
  } catch {
    return { ok: false, message: "We couldn't save this tailored resume. Please try again." };
  }
}

/**
 * Persist edits to an existing resume and bump its version (explicit save — autosave +
 * multi-tab compare-and-swap are M6). Scoped by `id` + `user_id`; a 0-row update is treated
 * as a failure so a good resume is never silently overwritten (FR-8 spirit).
 *
 * When `reviewItems` is supplied (the editor always supplies the working set), the resume and
 * its proposals are validated together and — for a `tailored` row — the persisted review items
 * and derived status are updated too, so resolving the last proposal flips it to `ready`. Base
 * rows ignore review items entirely, leaving their save path unchanged.
 */
export async function saveResume(
  id: string,
  doc: unknown,
  reviewItems?: ReviewItem[],
): Promise<SaveResumeState> {
  const auth = await authorize();
  if (!auth) return { ok: false, category: "auth", message: AUTH_MESSAGE };
  const { user, supabase } = auth;

  const invalid = (): SaveResumeState => ({
    ok: false,
    category: "validation",
    message: "This resume isn't valid and was not saved.",
  });

  // Validate the doc — together with its review items when provided, so a save can never
  // persist proposals orphaned by an edit that deleted their target content.
  let resume: ResumeDoc;
  let items: ReviewItem[] | null = null;
  if (reviewItems) {
    const working = validateWorkingDoc({ resume: doc, reviewItems });
    if (!working.ok) return invalid();
    resume = working.data.resume;
    items = working.data.reviewItems;
  } else {
    const validated = validateResumeDoc(doc);
    if (!validated.ok) return invalid();
    resume = validated.data;
  }

  const failed = (category: "network" | "unknown"): SaveResumeState => ({
    ok: false,
    category,
    message: "We couldn't save your resume. Please try again.",
  });

  try {
    const { data: current, error: readError } = await supabase
      .from("resumes")
      .select("version, kind")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (readError || !current) return failed("network");

    const nextVersion = (current.version ?? 0) + 1;
    const patch: Record<string, unknown> = { doc: resume, version: nextVersion };
    // Only tailored rows track review items + status; base rows are left untouched.
    if (items !== null && current.kind === "tailored") {
      patch.review_items = items;
      patch.status = tailoredStatusFor(items, "finalize");
    }

    const { data: updated, error: updateError } = await supabase
      .from("resumes")
      .update(patch)
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
  const auth = await authorize();
  if (!auth) return { ok: false, message: AUTH_MESSAGE };
  const { user, supabase } = auth;

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
  const auth = await authorize();
  if (!auth) return { ok: false, message: AUTH_MESSAGE };
  const { user, supabase } = auth;

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

export type ExportDocResult =
  | { ok: true; doc: ResumeDoc }
  | { ok: false; message: string };

/**
 * Fetch a resume's validated doc for client-side PDF export from the dashboard. Kept separate
 * from the dashboard list query so the (potentially large) doc is fetched on demand — only
 * when the user actually clicks Export — rather than shipped with every row.
 */
export async function loadResumeForExport(id: string): Promise<ExportDocResult> {
  const auth = await authorize();
  if (!auth) return { ok: false, message: AUTH_MESSAGE };
  const { user, supabase } = auth;

  try {
    const { data, error } = await supabase
      .from("resumes")
      .select("doc")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !data) return { ok: false, message: "We couldn't load that resume." };

    const resolved = resolveStoredResume(data.doc);
    if (resolved.kind !== "ok") {
      return { ok: false, message: "That resume can't be exported because it's invalid." };
    }
    return { ok: true, doc: resolved.doc };
  } catch {
    return { ok: false, message: "We couldn't load that resume. Please try again." };
  }
}

/** Permanently delete a resume the user owns. */
export async function deleteResume(id: string): Promise<MutateResumeResult> {
  const auth = await authorize();
  if (!auth) return { ok: false, message: AUTH_MESSAGE };
  const { user, supabase } = auth;

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

// ---------------------------------------------------------------------------
// Application tracking (tailored rows only — PRD-application-tracking)
// ---------------------------------------------------------------------------

const NOTES_MAX = 5_000;

export type ApplicationPatch = {
  stage?: ApplicationStage;
  /** Explicit user edit of the applied date — overrides the stage-change auto-stamp. */
  appliedAt?: string | null;
  followUpAt?: string | null;
  jobUrl?: string | null;
  notes?: string | null;
};

type NormalizedField =
  | { ok: true; value: string | null }
  | { ok: false };

/** A `<input type="date">` / ISO value, or null when cleared. Rejects unparseable input. */
function normalizeOptionalDate(raw: string | null | undefined): NormalizedField {
  if (raw == null) return { ok: true, value: null };
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (Number.isNaN(Date.parse(trimmed))) return { ok: false };
  return { ok: true, value: trimmed };
}

/** A job-posting link restricted to http(s) (§10), or null when cleared. */
function normalizeJobUrl(raw: string | null | undefined): NormalizedField {
  if (raw == null) return { ok: true, value: null };
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false };
  return { ok: true, value: url.toString() };
}

/**
 * Update a tailored resume's application-tracking fields (stage, dates, posting URL, notes).
 * Mirrors `saveResume`'s contract: auth-gated, scoped by `id` + `user_id` (RLS is the final
 * boundary), and it never touches the resume `doc`, `review_items`, or `version` (FR-AT-5).
 * Writes to a base resume are rejected (FR-AT-6). A stage change stamps `applied_at` on the
 * first apply and appends to the timeline (FR-AT-2/3); only the fields present in `patch` are
 * written, so an absent key is left untouched.
 */
export async function updateApplication(
  id: string,
  patch: ApplicationPatch,
): Promise<MutateResumeResult> {
  const auth = await authorize();
  if (!auth) return { ok: false, message: AUTH_MESSAGE };
  const { user, supabase } = auth;

  // Reject an unknown stage before any read (the TS type is not a runtime guarantee).
  if (patch.stage !== undefined && !APPLICATION_STAGES.includes(patch.stage)) {
    return { ok: false, message: "That isn't a valid application stage." };
  }

  try {
    const { data: current, error: readError } = await supabase
      .from("resumes")
      .select("kind, application_stage, applied_at, stage_history")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError || !current) {
      return { ok: false, message: "We couldn't find that application." };
    }
    if (current.kind !== "tailored") {
      return { ok: false, message: "Only tailored resumes can be tracked as applications." };
    }

    const update: Record<string, unknown> = {};

    // Stage change → applied_at auto-stamp + timeline append (no-op when unchanged).
    if (patch.stage !== undefined) {
      const before = {
        stage: (current.application_stage as ApplicationStage | null) ?? "none",
        appliedAt: (current.applied_at as string | null) ?? null,
        stageHistory: parseStageHistory(current.stage_history),
      };
      const after = applyStageChange(before, patch.stage, new Date().toISOString());
      if (after !== before) {
        update.application_stage = after.stage;
        update.applied_at = after.appliedAt;
        update.stage_history = after.stageHistory;
      }
    }

    // An explicit applied-date edit wins over the auto-stamp above (FR-AT-2).
    if ("appliedAt" in patch) {
      const result = normalizeOptionalDate(patch.appliedAt);
      if (!result.ok) return { ok: false, message: "Enter a valid applied date." };
      update.applied_at = result.value;
    }
    if ("followUpAt" in patch) {
      const result = normalizeOptionalDate(patch.followUpAt);
      if (!result.ok) return { ok: false, message: "Enter a valid follow-up date." };
      update.follow_up_at = result.value;
    }
    if ("jobUrl" in patch) {
      const result = normalizeJobUrl(patch.jobUrl);
      if (!result.ok) {
        return { ok: false, message: "Enter a valid http(s) link to the job posting." };
      }
      update.job_url = result.value;
    }
    if ("notes" in patch) {
      const trimmed = (patch.notes ?? "").trim();
      update.notes = trimmed === "" ? null : trimmed.slice(0, NOTES_MAX);
    }

    // Nothing actually changed (e.g. a same-stage write) — succeed without a DB round-trip.
    if (Object.keys(update).length === 0) return { ok: true };

    const { data: updated, error: updateError } = await supabase
      .from("resumes")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .single();
    if (updateError || !updated) {
      return { ok: false, message: "We couldn't update this application. Please try again." };
    }

    revalidatePath("/dashboard");
    return { ok: true };
  } catch {
    return { ok: false, message: "We couldn't update this application. Please try again." };
  }
}
