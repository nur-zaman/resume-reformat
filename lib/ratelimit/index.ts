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

// Public waitlist sign-up is unauthenticated, so it's only guarded per-IP and on a much
// shorter window than generation — enough to stop a script hammering the endpoint without
// blocking a household behind one NAT from a few honest retries.
export const WAITLIST_WINDOW_SECONDS = 60 * 10; // 10 minutes
export const WAITLIST_IP_LIMIT = 5;

async function underLimit(
  key: string,
  limit: number,
  windowSeconds: number = GENERATION_WINDOW_SECONDS,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
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
 * Read whether the per-user generation quota is currently exhausted WITHOUT counting a hit
 * (backed by `public.peek_rate_limit`). Used by the dashboard to surface the "AI paused"
 * banner. Fails CLOSED to "not paused": a limiter hiccup should never nag a user that the AI
 * is off when it may not be — the real enforcement still happens at generation time.
 */
export async function isGenerationPausedForUser(userId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("peek_rate_limit", {
      p_key: `gen:user:${userId}`,
      p_limit: GENERATION_USER_LIMIT,
      p_window_seconds: GENERATION_WINDOW_SECONDS,
    });
    if (error) {
      console.error("rate_limit_peek_failed", { code: error.code });
      return false;
    }
    // peek_rate_limit returns true when still UNDER the limit; paused is the inverse.
    return data === false;
  } catch (err) {
    console.error("rate_limit_peek_client_failed", err);
    return false;
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

/**
 * Per-IP limit for the public waitlist form. Same fail-open contract as generation: a
 * limiter outage should never block a genuine sign-up — the unique email constraint is the
 * real backstop against duplicates.
 */
export async function enforceWaitlistRateLimit(ip: string): Promise<{ allowed: boolean }> {
  const ok = await underLimit(`waitlist:ip:${ip}`, WAITLIST_IP_LIMIT, WAITLIST_WINDOW_SECONDS);
  return { allowed: ok };
}
