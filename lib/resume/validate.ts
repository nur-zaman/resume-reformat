import type { z } from "zod";
import {
  GenerationResultSchema,
  ResumeDocSchema,
  WorkingDocSchema,
  type GenerationResult,
  type ResumeDoc,
  type WorkingDoc,
} from "./schema";

/**
 * Validation boundary (PRD §10 — shared schemas for client, server, AI, persistence).
 *
 * These wrappers return a discriminated result instead of throwing, so callers handle
 * invalid input explicitly. A single safeParse runs both shape and cross-document
 * invariants (the schemas wire the invariant checks into `.superRefine`).
 */
export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: z.ZodError };

export function validateResumeDoc(input: unknown): ValidationResult<ResumeDoc> {
  const r = ResumeDocSchema.safeParse(input);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

/** A resume + its review items (editor working state / persisted working copy). */
export function validateWorkingDoc(input: unknown): ValidationResult<WorkingDoc> {
  const r = WorkingDocSchema.safeParse(input);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

/** Tailoring endpoint envelope — may carry pending review items. */
export function validateGenerationResult(
  input: unknown,
): ValidationResult<GenerationResult> {
  const r = GenerationResultSchema.safeParse(input);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

/**
 * Parse endpoint envelope — transcription only, so it must carry NO review items
 * (PRD §6.1, §7.3).
 */
const ParseResultSchema = GenerationResultSchema.refine(
  (r) => r.reviewItems.length === 0,
  { message: "A parse result must not contain review items", path: ["reviewItems"] },
);

export function validateParseResult(
  input: unknown,
): ValidationResult<GenerationResult> {
  const r = ParseResultSchema.safeParse(input);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error };
}
