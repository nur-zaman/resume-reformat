import "server-only";

// May reference the model's own malformed output - never log this.
type ZodIssueLike = { path?: unknown[]; message?: string };

function extractIssues(error: unknown): ZodIssueLike[] {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const issues = (current as { issues?: unknown }).issues;
    if (Array.isArray(issues)) return issues as ZodIssueLike[];
    current = (current as { cause?: unknown }).cause;
  }
  return [];
}

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
