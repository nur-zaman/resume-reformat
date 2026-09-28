import "server-only";
import { generateObject, type ModelMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { AiParseSchema, type AiParseOutput } from "./schema";
import { getAiConfig } from "@/lib/ai/config";
import { parseKnobs } from "@/lib/ai/generation-config";
import { classifyAiError, type AiErrorCategory } from "@/lib/ai/errors";
import {
  buildParseSystemPrompt,
  buildParseUserPrompt,
  buildParsePdfPrompt,
  buildRetryFeedback,
} from "./prompt";
import { logAiEvent } from "@/lib/ai/log";

export type ParseSource =
  | { kind: "text"; text: string }
  | { kind: "pdf"; bytes: Uint8Array; filename?: string };

export type ParseFile = { bytes: Uint8Array; mediaType: string; filename?: string };

export type GenerateObjectFn = (args: {
  system: string;
  prompt: string;
  file?: ParseFile;
}) => Promise<AiParseOutput>;

export type ParseResumeResult =
  | { ok: true; output: AiParseOutput; attempts: 1 | 2 }
  | { ok: false; category: AiErrorCategory; attempts: 1 | 2 };

function defaultGenerate(): GenerateObjectFn {
  const cfg = getAiConfig();
  const provider = createGoogleGenerativeAI({ apiKey: cfg.apiKey });
  const model = provider(cfg.modelId);
  const knobs = parseKnobs(cfg.modelId);

  // Keep structuredOutputs ON and AiParseSchema fields REQUIRED - Gemini's constrained
  // decoder skips non-required fields, which previously returned empty sections.
  return async ({ system, prompt, file }) => {
    if (file) {
      const messages: ModelMessage[] = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "file", data: file.bytes, mediaType: file.mediaType, filename: file.filename },
          ],
        },
      ];
      const { object } = await generateObject({
        model,
        schema: AiParseSchema,
        system,
        messages,
        // maxRetries: 0 - our explicit retry is the only one; avoids silently burning the free quota.
        maxRetries: 0,
        ...knobs,
      });
      return object;
    }

    const { object } = await generateObject({
      model,
      schema: AiParseSchema,
      system,
      prompt,
      maxRetries: 0,
      ...knobs,
    });
    return object;
  };
}

export async function parseResume(
  source: ParseSource,
  opts?: { generate?: GenerateObjectFn },
): Promise<ParseResumeResult> {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const log = (
    status: "success" | "error",
    attempts: 1 | 2,
    errorCategory?: AiErrorCategory,
  ) =>
    logAiEvent({
      requestId,
      event: "parse",
      status,
      attempts,
      durationMs: Date.now() - startedAt,
      modelId: process.env.AI_MODEL_ID,
      errorCategory,
    });

  let generate: GenerateObjectFn;
  try {
    generate = opts?.generate ?? defaultGenerate();
  } catch (err) {
    const category = classifyAiError(err);
    log("error", 1, category);
    return { ok: false, category, attempts: 1 };
  }

  const system = buildParseSystemPrompt();
  const basePrompt =
    source.kind === "pdf" ? buildParsePdfPrompt() : buildParseUserPrompt(source.text);
  const file: ParseFile | undefined =
    source.kind === "pdf"
      ? { bytes: source.bytes, mediaType: "application/pdf", filename: source.filename }
      : undefined;

  try {
    const output = await generate({ system, prompt: basePrompt, file });
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
      const output = await generate({ system, prompt: retryPrompt, file });
      log("success", 2);
      return { ok: true, output, attempts: 2 };
    } catch (err2) {
      const category2 = classifyAiError(err2);
      log("error", 2, category2);
      return { ok: false, category: category2, attempts: 2 };
    }
  }
}
