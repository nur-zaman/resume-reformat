const SAFE_ORIGIN = "https://internal.invalid";

// Same-origin absolute paths only - rejects protocol-relative URLs, backslash variants,
// and malformed input (prevents open redirects).
export function getSafeNextPath(
  candidate: string | null,
  fallback = "/dashboard",
): string {
  if (!candidate?.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(candidate, SAFE_ORIGIN);
    if (url.origin !== SAFE_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
