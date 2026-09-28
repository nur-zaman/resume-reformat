import "server-only";
import { headers } from "next/headers";

// Best-effort only - x-forwarded-for/x-real-ip can be spoofed. Never trust this for
// security; it's a coarse abuse signal only.
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip")?.trim() || "unknown";
}
