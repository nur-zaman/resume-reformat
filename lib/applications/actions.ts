"use server";

import { revalidatePath } from "next/cache";
import { authorize, SESSION_EXPIRED_MESSAGE } from "@/lib/auth/guards";
import {
  applyStageChange,
  parseStageHistory,
  APPLICATION_STAGES,
  type ApplicationStage,
} from "./stages";

export type UpdateApplicationResult = { ok: true } | { ok: false; message: string };

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
): Promise<UpdateApplicationResult> {
  const auth = await authorize();
  if (!auth) return { ok: false, message: SESSION_EXPIRED_MESSAGE };
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
