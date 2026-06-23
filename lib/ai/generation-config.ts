import "server-only";
import type { JSONObject } from "@ai-sdk/provider";

/**
 * Per-task generation knobs, gated on the configured model family (PRD §10: the exact model
 * id is deployment config, not hard-coded product behaviour). Two task profiles:
 *
 *   - PARSE is faithful transcription — it wants determinism, not reasoning.
 *   - TAILOR is the reasoning-heavy step (decide what to surface, whether a unit is a net-new
 *     proposal, infer the job) — it gets a little reasoning budget.
 *
 * The current deployment model is `gemini-3.1-flash-lite` (the Gemini 3 family), which differs
 * from Gemini 2.5 in two ways that matter here:
 *
 *   - Gemini 3 ignores / can reject `temperature` (and `topP`/`topK`): its reasoning path is
 *     tuned for the default sampling, so we set NO temperature on Gemini 3.
 *   - Gemini 3 controls reasoning depth with `thinkingLevel` ("minimal" | "low" | "medium" |
 *     "high"); `thinkingBudget` is a Gemini-2.5-only knob and is invalid on Gemini 3.
 *
 * So we branch on the model family. If `AI_MODEL_ID` is ever pointed back at a 2.5 model, the
 * 2.5 branch sets a deterministic `temperature` + `thinkingBudget` instead. Both branches leave
 * `structuredOutputs` at its default (on) — the constrained decoder is what binds the model to
 * our exact field names (see lib/resume/parse-schema.ts), so we never disable it.
 *
 * VERIFY ON FIRST DEPLOY: that `gemini-3.1-flash-lite` accepts `thinkingConfig.thinkingLevel`.
 * If the API rejects it, the safe rollback is to return `{}` from the Gemini-3 branches — the
 * parse/tailor calls worked with no generation config at all before this change.
 */

type ThinkingLevel = "minimal" | "low" | "medium" | "high";

// Matches the AI SDK's `ProviderOptions` (= Record<string, JSONObject>), so the value spreads
// cleanly into generateObject. Keyed by provider id ("google"); the inner object is validated
// at runtime by @ai-sdk/google's own option schema.
export type GenerationKnobs = {
  temperature?: number;
  providerOptions?: Record<string, JSONObject>;
};

/** Gemini 3.x (incl. 3.1 flash-lite). Matches "gemini-3", "gemini-3.1-…", "models/gemini-3…". */
function isGemini3(modelId: string): boolean {
  return /(^|[/-])gemini-3/i.test(modelId);
}

/** Gemini 3.x: control reasoning with `thinkingLevel`; set no temperature. */
function gemini3(thinkingLevel: ThinkingLevel): GenerationKnobs {
  return { providerOptions: { google: { thinkingConfig: { thinkingLevel } } } };
}

/** Gemini 2.5 fallback: deterministic-ish temperature + numeric `thinkingBudget`. */
function gemini25(temperature: number, thinkingBudget: number): GenerationKnobs {
  return { temperature, providerOptions: { google: { thinkingConfig: { thinkingBudget } } } };
}

/** Transcription: floor reasoning on Gemini 3 ("minimal"); temperature 0, thinking off on 2.5. */
export function parseKnobs(modelId: string): GenerationKnobs {
  return isGemini3(modelId) ? gemini3("minimal") : gemini25(0, 0);
}

/** Tailoring: a little reasoning ("low") on Gemini 3; modest temperature + dynamic thinking on 2.5. */
export function tailorKnobs(modelId: string): GenerationKnobs {
  return isGemini3(modelId) ? gemini3("low") : gemini25(0.4, -1);
}
