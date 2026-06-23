import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for rate limiting. Vercel (and most reverse proxies) set
 * `x-forwarded-for`; the first hop is the originating client. Falls back to `x-real-ip`,
 * then a literal `"unknown"` so a missing header collapses all callers into one bucket
 * rather than throwing. Never trust this for security — it's a coarse abuse signal only.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip")?.trim() || "unknown";
}
