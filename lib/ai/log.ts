import "server-only";

// Metadata only - never pass raw resume text, job descriptions, prompts, model responses, or credentials here.
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
