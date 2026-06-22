import "server-only";

/**
 * Metadata-only operational logging for AI calls (PRD §11). NEVER pass raw resume text,
 * job descriptions, prompts, model responses, ZodError contents, tokens, or keys here —
 * only the fields below, which cannot leak user content.
 */
export type AiLogRecord = {
  requestId: string;
  event: "parse" | "tailor";
  status: "success" | "error";
  durationMs: number;
  attempts: number;
  modelId?: string;
  errorCategory?: string;
};

export function logAiEvent(record: AiLogRecord): void {
  console.info(JSON.stringify({ kind: "ai_event", ...record }));
}
