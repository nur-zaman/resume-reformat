import {
  APICallError,
  LoadAPIKeyError,
  NoObjectGeneratedError,
  TypeValidationError,
} from "ai";
import { AiConfigError } from "./config";

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

// Never returns provider message text, only the enum, so callers can't accidentally log response bodies.
export function classifyAiError(err: unknown): AiErrorCategory {
  if (err instanceof AiError) return err.category;

  if (AiConfigError && err instanceof AiConfigError) return "auth";
  if (LoadAPIKeyError.isInstance(err)) return "auth";

  if (NoObjectGeneratedError.isInstance(err)) return "validation";
  if (TypeValidationError.isInstance(err)) return "validation";

  if (APICallError.isInstance(err)) {
    const status = err.statusCode;
    if (status === 401 || status === 403) return "auth";
    if (status === 429) return "quota";
    if (typeof status === "number" && status >= 500) return "network";
    if (status === undefined) return "network";
    return "unknown";
  }

  if (err instanceof TypeError) return "network";
  if (err instanceof Error && err.name === "AbortError") return "network";

  return "unknown";
}
