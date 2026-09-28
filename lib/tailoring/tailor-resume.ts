import "server-only";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { AiTailorSchema, type AiTailorOutput } from "./schema";
import type { ResumeDoc } from "@/lib/resume/schema";
import { getAiConfig } from "@/lib/ai/config";
import { tailorKnobs } from "@/lib/ai/generation-config";
import { classifyAiError, type AiErrorCategory } from "@/lib/ai/errors";
import { buildTailorSystemPrompt, buildTailorUserPrompt } from "./prompt";
import { buildRetryFeedback } from "@/lib/ai/retry-feedback";
import { logAiEvent } from "@/lib/ai/log";

/**
 * Resume tailoring orchestration (M5). Pure AI concern — auth, input validation, rate
 * limiting, and assembly live in the server action, keeping this unit-testable via the
 * injected `generate` seam (no network). Implements the FR-13 retry policy: one corrective
 * retry, and ONLY on a schema-validation failure. Mirrors `parse-resume.ts`.
 */

export type TailorInput = { baseResume: ResumeDoc; jobDescription: string };

export type GenerateTailorFn = (args: {
  system: string;
  prompt: string;
}) => Promise<AiTailorOutput>;

export type TailorResumeResult =
  | { ok: true; output: AiTailorOutput; attempts: 1 | 2 }
  | { ok: false; category: AiErrorCategory; attempts: 1 | 2 };

/** Production generator: the configured Gemini model via the Vercel AI SDK. */
function defaultGenerate(): GenerateTailorFn {
  const cfg = getAiConfig();
  const provider = createGoogleGenerativeAI({ apiKey: cfg.apiKey });
  const model = provider(cfg.modelId);
  // Tailoring is the reasoning-heavy step (what to surface, is a unit a proposal, infer the
  // job), so it gets a little reasoning budget. Gated on the model family (Gemini 3 →
  // thinkingLevel "low"; 2.5 → temperature + dynamic thinkingBudget). See ./generation-config.
  const knobs = tailorKnobs(cfg.modelId);

  // Keep Gemini's native structured-output mode ON; AiTailorSchema is REQUIRED throughout
  // so the constrained decoder doesn't drop fields. Our explicit feedback-bearing retry is
  // the ONLY retry (maxRetries: 0) — it protects the free quota (PRD §11).
  return async ({ system, prompt }) => {
    const { object } = await generateObject({
      model,
      schema: AiTailorSchema,
      system,
      prompt,
      maxRetries: 0,
      ...knobs,
    });
    return object;
  };
}

export async function tailorResume(
  input: TailorInput,
  opts?: { generate?: GenerateTailorFn },
): Promise<TailorResumeResult> {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const log = (
    status: "success" | "error",
    attempts: 1 | 2,
    errorCategory?: AiErrorCategory,
  ) =>
    logAiEvent({
      requestId,
      event: "tailor",
      status,
      attempts,
      durationMs: Date.now() - startedAt,
      modelId: process.env.AI_MODEL_ID,
      errorCategory,
    });

  let generate: GenerateTailorFn;
  try {
    generate = opts?.generate ?? defaultGenerate();
  } catch (err) {
    // Missing/invalid config (e.g. no API key) → classified, no AI call made.
    const category = classifyAiError(err);
    log("error", 1, category);
    return { ok: false, category, attempts: 1 };
  }

  const system = buildTailorSystemPrompt();
  const basePrompt = buildTailorUserPrompt(input.baseResume, input.jobDescription);

  try {
    const output = await generate({ system, prompt: basePrompt });
    log("success", 1);
    return { ok: true, output, attempts: 1 };
  } catch (err) {
    const category = classifyAiError(err);
    if (category !== "validation") {
      // auth / quota / network / unknown — retrying cannot help (FR-13, §11).
      log("error", 1, category);
      return { ok: false, category, attempts: 1 };
    }
    // Exactly one retry, with corrective feedback derived from the failure.
    const retryPrompt = `${basePrompt}\n\n${buildRetryFeedback(err)}`;
    try {
      const output = await generate({ system, prompt: retryPrompt });
      log("success", 2);
      return { ok: true, output, attempts: 2 };
    } catch (err2) {
      const category2 = classifyAiError(err2);
      log("error", 2, category2);
      return { ok: false, category: category2, attempts: 2 };
    }
  }
}
