import "server-only";
import { generateObject, type ModelMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { AiParseSchema, type AiParseOutput } from "@/lib/resume/parse-schema";
import { getAiConfig } from "./config";
import { classifyAiError, type AiErrorCategory } from "./errors";
import {
  buildParseSystemPrompt,
  buildParseUserPrompt,
  buildParsePdfPrompt,
  buildRetryFeedback,
} from "./parse-prompt";
import { logAiEvent } from "./log";

/**
 * Resume parse orchestration (M4). Pure AI concern — auth, input validation, and assembly
 * live in the server action, which keeps this unit-testable by injecting a `generate` seam
 * (no network). Implements the FR-13 retry policy: one corrective retry, and ONLY on a
 * schema-validation failure.
 *
 * The source is either pasted text or an uploaded PDF. PDFs are sent to Gemini directly as
 * a file part (the model reads them natively) rather than extracting text ourselves.
 */

/** What the user gave us to transcribe. */
export type ParseSource =
  | { kind: "text"; text: string }
  | { kind: "pdf"; bytes: Uint8Array; filename?: string };

/** An attached file for multimodal input (currently only PDF). */
export type ParseFile = { bytes: Uint8Array; mediaType: string; filename?: string };

export type GenerateObjectFn = (args: {
  system: string;
  prompt: string;
  /** When present, sent alongside the prompt as a file message part. */
  file?: ParseFile;
}) => Promise<AiParseOutput>;

export type ParseResumeResult =
  | { ok: true; output: AiParseOutput; attempts: 1 | 2 }
  | { ok: false; category: AiErrorCategory; attempts: 1 | 2 };

/** Production generator: the configured Gemini model via the Vercel AI SDK. */
function defaultGenerate(): GenerateObjectFn {
  const cfg = getAiConfig();
  const provider = createGoogleGenerativeAI({ apiKey: cfg.apiKey });
  const model = provider(cfg.modelId);

  // Keep Gemini's native structured-output mode ON (the default). It binds the model to
  // our exact field names; with it OFF the model invents its own shape (`company`,
  // `highlights`, summary-as-string…) and validation fails. The complement is that
  // `AiParseSchema` is REQUIRED throughout (no .optional()/.default()) — Gemini's
  // constrained decoder skips non-required fields, which previously returned empty
  // sections. See lib/resume/parse-schema.ts.
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
        // Our explicit, feedback-bearing retry is the ONLY retry — protects free quota.
        maxRetries: 0,
      });
      return object;
    }

    const { object } = await generateObject({
      model,
      schema: AiParseSchema,
      system,
      prompt,
      maxRetries: 0,
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
    // Missing/invalid config (e.g. no API key) → classified, no AI call made.
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
      // auth / quota / network / unknown — retrying cannot help (FR-13, §11).
      log("error", 1, category);
      return { ok: false, category, attempts: 1 };
    }
    // Exactly one retry, with corrective feedback derived from the failure.
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
