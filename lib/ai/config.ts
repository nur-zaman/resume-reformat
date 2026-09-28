import "server-only";

export type AiConfig = {
  provider: "google";
  modelId: string;
  apiKey: string;
};

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}

export function getAiConfig(): AiConfig {
  const modelId = process.env.AI_MODEL_ID;
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!modelId) {
    throw new AiConfigError(
      "Missing AI_MODEL_ID. Set it to the configured Gemini Flash model id.",
    );
  }
  if (!apiKey) {
    throw new AiConfigError(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY (server-only AI credential).",
    );
  }

  return { provider: "google", modelId, apiKey };
}
