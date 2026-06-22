import "server-only";

/**
 * Shared schema-retry feedback for the AI pipelines (FR-13). Both the parse and tailor
 * orchestrations append this to the single corrective retry: it names which fields/types
 * were wrong so the model can fix its shape. It may reference the model's own malformed
 * output and so must NEVER be logged.
 */

type ZodIssueLike = { path?: unknown[]; message?: string };

/** Pull a list of Zod-style issues out of whatever the SDK threw, if present. */
function extractIssues(error: unknown): ZodIssueLike[] {
  const seen = new Set<unknown>();
  let current: unknown = error;
  // Walk the cause chain: NoObjectGeneratedError → TypeValidationError → ZodError.
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const issues = (current as { issues?: unknown }).issues;
    if (Array.isArray(issues)) return issues as ZodIssueLike[];
    current = (current as { cause?: unknown }).cause;
  }
  return [];
}

/**
 * Compact, field-path feedback appended to the prompt for the single retry (FR-13).
 */
export function buildRetryFeedback(error: unknown): string {
  const issues = extractIssues(error);
  const detail =
    issues.length > 0
      ? issues
          .slice(0, 12)
          .map(
            (i) =>
              `- ${(i.path ?? []).join(".") || "(root)"}: ${i.message ?? "invalid"}`,
          )
          .join("\n")
      : "- The response was not valid JSON matching the schema. Return only the structured object, with every field of the correct type.";
  return [
    "Your previous response did not match the required structure.",
    "Fix exactly these problems and return the full corrected object:",
    detail,
  ].join("\n");
}
