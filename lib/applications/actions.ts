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
  appliedAt?: string | null;
  followUpAt?: string | null;
  jobUrl?: string | null;
  notes?: string | null;
};

type NormalizedField =
  | { ok: true; value: string | null }
  | { ok: false };

function normalizeOptionalDate(raw: string | null | undefined): NormalizedField {
  if (raw == null) return { ok: true, value: null };
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: null };
  if (Number.isNaN(Date.parse(trimmed))) return { ok: false };
  return { ok: true, value: trimmed };
}

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

// Scoped by id + user_id; RLS is the final boundary. Never touches doc, review_items, or version.
export async function updateApplication(
  id: string,
  patch: ApplicationPatch,
): Promise<UpdateApplicationResult> {
  const auth = await authorize();
  if (!auth) return { ok: false, message: SESSION_EXPIRED_MESSAGE };
  const { user, supabase } = auth;

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
