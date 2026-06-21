import {
  APICallError,
  LoadAPIKeyError,
  NoObjectGeneratedError,
  TypeValidationError,
} from "ai";
import { AiConfigError } from "./config";

/**
 * The error categories the UI must distinguish (PRD §11 reliability) and that drive the
 * retry policy (FR-13). Only `validation` is retryable; everything else is surfaced as-is
 * so we never burn free quota on a retry that cannot help.
 */
export type AiErrorCategory =
  | "validation"
  | "auth"
  | "quota"
  | "network"
  | "unknown";

export class AiError extends Error {
  constructor(
    public readonly category: AiErrorCategory,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AiError";
  }
}

/**
 * Map a thrown error from the AI SDK (or our own layers) to a category. Uses the SDK's
 * cross-bundle `isInstance` guards plus HTTP status, defensively. Never returns provider
 * message text — only the enum — so callers cannot accidentally log response bodies.
 */
export function classifyAiError(err: unknown): AiErrorCategory {
  if (err instanceof AiError) return err.category;

  // Missing/invalid credentials — retrying cannot help.
  if (AiConfigError && err instanceof AiConfigError) return "auth";
  if (LoadAPIKeyError.isInstance(err)) return "auth";

  // Model produced output that failed schema/JSON parsing — the retry trigger.
  if (NoObjectGeneratedError.isInstance(err)) return "validation";
  if (TypeValidationError.isInstance(err)) return "validation";

  if (APICallError.isInstance(err)) {
    const status = err.statusCode;
    if (status === 401 || status === 403) return "auth";
    if (status === 429) return "quota";
    if (typeof status === "number" && status >= 500) return "network";
    // Connection failures surface with no status code.
    if (status === undefined) return "network";
    return "unknown";
  }

  // Bare fetch/abort/timeout failures.
  if (err instanceof TypeError) return "network";
  if (err instanceof Error && err.name === "AbortError") return "network";

  return "unknown";
}
