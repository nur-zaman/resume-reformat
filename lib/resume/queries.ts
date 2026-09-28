import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type Scope = { supabase: SupabaseClient; userId: string };

export type ResumeSummaryRow = {
  id: string;
  title: string;
  doc: unknown;
  kind: string | null;
  company: string | null;
  target_role: string | null;
  review_items: unknown;
  status: string | null;
  version: number | null;
  updated_at: string;
};

export type ResumeRow = {
  id: string;
  title: string;
  doc: unknown;
  kind: string | null;
  review_items: unknown;
};

export type ApplicationRow = {
  id: string;
  company: string | null;
  target_role: string | null;
  status: string | null;
  application_stage: string | null;
  applied_at: string | null;
  follow_up_at: string | null;
  job_url: string | null;
  notes: string | null;
  stage_history: unknown;
};

export async function listResumes({ supabase, userId }: Scope): Promise<ResumeSummaryRow[]> {
  const { data } = await supabase
    .from("resumes")
    .select("id, title, doc, kind, company, target_role, review_items, status, version, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as ResumeSummaryRow[];
}

export async function getResume({ supabase, userId }: Scope, id: string): Promise<ResumeRow | null> {
  const { data } = await supabase
    .from("resumes")
    .select("id, title, doc, kind, review_items")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as ResumeRow | null) ?? null;
}

export async function listApplications({ supabase, userId }: Scope): Promise<ApplicationRow[]> {
  const { data } = await supabase
    .from("resumes")
    .select(
      "id, company, target_role, status, application_stage, applied_at, follow_up_at, job_url, notes, stage_history",
    )
    .eq("user_id", userId)
    .eq("kind", "tailored")
    .order("updated_at", { ascending: false });
  return (data ?? []) as ApplicationRow[];
}
