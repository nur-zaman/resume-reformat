"use server";

import { revalidatePath } from "next/cache";
import { authorize, SESSION_EXPIRED_MESSAGE } from "@/lib/auth/guards";
import { validateResumeDoc, validateWorkingDoc } from "./validate";
import { resolveStoredResume } from "./load";
import { deriveResumeTitle } from "./title";
import { tailoredStatusFor, type ResumeKind } from "./status";
import type { ResumeDoc, ReviewItem } from "./schema";

export type CreateResumeResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

export type SaveResumeState =
  | { ok: true; version: number }
  | { ok: false; category: "validation" | "auth" | "network" | "unknown"; message: string };

export type MutateResumeResult = { ok: true } | { ok: false; message: string };

const TITLE_MAX = 120;

function sanitizeTitle(raw: string): string {
  return raw.trim().slice(0, TITLE_MAX);
}

export async function createResume(input: {
  doc: unknown;
  title?: string;
  kind?: ResumeKind;
  company?: string;
  targetRole?: string;
  // FK; SET NULL if that base resume is later deleted.
  sourceResumeId?: string;
  reviewItems?: ReviewItem[];
  intent?: "finalize" | "draft";
}): Promise<CreateResumeResult> {
  const auth = await authorize();
  if (!auth) return { ok: false, message: SESSION_EXPIRED_MESSAGE };
  const { user, supabase } = auth;

  const validated = validateResumeDoc(input.doc);
  if (!validated.ok) {
    return { ok: false, message: "This resume isn't valid and was not saved." };
  }

  const title = sanitizeTitle(input.title ?? "") || deriveResumeTitle(validated.data);

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

// A 0-row update is treated as a failure so a good resume is never silently overwritten.
export async function saveResume(
  id: string,
  doc: unknown,
  reviewItems?: ReviewItem[],
): Promise<SaveResumeState> {
  const auth = await authorize();
  if (!auth) return { ok: false, category: "auth", message: SESSION_EXPIRED_MESSAGE };
  const { user, supabase } = auth;

  const invalid = (): SaveResumeState => ({
    ok: false,
    category: "validation",
    message: "This resume isn't valid and was not saved.",
  });

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

export async function renameResume(
  id: string,
  rawTitle: string,
): Promise<MutateResumeResult> {
  const auth = await authorize();
  if (!auth) return { ok: false, message: SESSION_EXPIRED_MESSAGE };
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

export async function duplicateResume(id: string): Promise<CreateResumeResult> {
  const auth = await authorize();
  if (!auth) return { ok: false, message: SESSION_EXPIRED_MESSAGE };
  const { user, supabase } = auth;

  try {
    const { data: src, error: readError } = await supabase
      .from("resumes")
      .select("title, doc")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (readError || !src) return { ok: false, message: "We couldn't find that resume." };

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

export async function loadResumeForExport(id: string): Promise<ExportDocResult> {
  const auth = await authorize();
  if (!auth) return { ok: false, message: SESSION_EXPIRED_MESSAGE };
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

export async function deleteResume(id: string): Promise<MutateResumeResult> {
  const auth = await authorize();
  if (!auth) return { ok: false, message: SESSION_EXPIRED_MESSAGE };
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
