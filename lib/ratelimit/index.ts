import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Per-user and per-IP generation rate limits (PRD §11 cost controls). Backed by the
 * atomic `public.check_rate_limit` fixed-window function, called with the server-side
 * secret key (the only role granted EXECUTE). Both limits must pass.
 *
 * Fails OPEN on a limiter error: the AI provider's own 429 (surfaced as the `quota`
 * category) is the real backstop against burning the free quota, and a limiter outage
 * should not lock out legitimate users.
 */

export const GENERATION_WINDOW_SECONDS = 60 * 60; // 1 hour
export const GENERATION_USER_LIMIT = 20;
export const GENERATION_IP_LIMIT = 40;

async function underLimit(key: string, limit: number): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: GENERATION_WINDOW_SECONDS,
    });
    if (error) {
      console.error("rate_limit_check_failed", { code: error.code });
      return true; // fail open
    }
    return data === true;
  } catch (err) {
    console.error("rate_limit_client_failed", err);
    return true; // fail open
  }
}

/**
 * Enforce both generation limits. Checks the per-user key first (the primary control), then
 * the per-IP key. Each call counts one hit against its window.
 */
export async function enforceGenerationRateLimit(input: {
  userId: string;
  ip: string;
}): Promise<{ allowed: boolean }> {
  const userOk = await underLimit(`gen:user:${input.userId}`, GENERATION_USER_LIMIT);
  if (!userOk) return { allowed: false };
  const ipOk = await underLimit(`gen:ip:${input.ip}`, GENERATION_IP_LIMIT);
  return { allowed: ipOk };
}
