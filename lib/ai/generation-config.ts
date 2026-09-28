import "server-only";
import type { JSONObject } from "@ai-sdk/provider";

// Gemini 3 ignores/rejects `temperature` and uses `thinkingLevel` instead of `thinkingBudget`.
// Verify gemini-3.1-flash-lite still accepts thinkingConfig.thinkingLevel on first deploy;
// if rejected, the safe rollback is to return `{}` from the Gemini-3 branches below.
type ThinkingLevel = "minimal" | "low" | "medium" | "high";

export type GenerationKnobs = {
  temperature?: number;
  providerOptions?: Record<string, JSONObject>;
};

function isGemini3(modelId: string): boolean {
  return /(^|[/-])gemini-3/i.test(modelId);
}

function gemini3(thinkingLevel: ThinkingLevel): GenerationKnobs {
  return { providerOptions: { google: { thinkingConfig: { thinkingLevel } } } };
}

function gemini25(temperature: number, thinkingBudget: number): GenerationKnobs {
  return { temperature, providerOptions: { google: { thinkingConfig: { thinkingBudget } } } };
}

export function parseKnobs(modelId: string): GenerationKnobs {
  return isGemini3(modelId) ? gemini3("minimal") : gemini25(0, 0);
}

export function tailorKnobs(modelId: string): GenerationKnobs {
  return isGemini3(modelId) ? gemini3("low") : gemini25(0.4, -1);
}
