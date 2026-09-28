import type { z } from "zod";
import {
  GenerationResultSchema,
  ResumeDocSchema,
  WorkingDocSchema,
  type GenerationResult,
  type ResumeDoc,
  type WorkingDoc,
} from "./schema";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: z.ZodError };

export function validateResumeDoc(input: unknown): ValidationResult<ResumeDoc> {
  const r = ResumeDocSchema.safeParse(input);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export function validateWorkingDoc(input: unknown): ValidationResult<WorkingDoc> {
  const r = WorkingDocSchema.safeParse(input);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

export function validateGenerationResult(
  input: unknown,
): ValidationResult<GenerationResult> {
  const r = GenerationResultSchema.safeParse(input);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error };
}

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
