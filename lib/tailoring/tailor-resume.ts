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

export type TailorInput = { baseResume: ResumeDoc; jobDescription: string };

export type GenerateTailorFn = (args: {
  system: string;
  prompt: string;
}) => Promise<AiTailorOutput>;

export type TailorResumeResult =
  | { ok: true; output: AiTailorOutput; attempts: 1 | 2 }
  | { ok: false; category: AiErrorCategory; attempts: 1 | 2 };

function defaultGenerate(): GenerateTailorFn {
  const cfg = getAiConfig();
  const provider = createGoogleGenerativeAI({ apiKey: cfg.apiKey });
  const model = provider(cfg.modelId);
  const knobs = tailorKnobs(cfg.modelId);

  // Keep structuredOutputs ON and AiTailorSchema fields REQUIRED - the constrained decoder
  // drops non-required fields. maxRetries: 0 - our explicit retry is the only one; avoids
  // silently burning the free quota.
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
      log("error", 1, category);
      return { ok: false, category, attempts: 1 };
    }
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
