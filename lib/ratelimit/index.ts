import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const GENERATION_WINDOW_SECONDS = 60 * 60; // 1 hour
export const GENERATION_USER_LIMIT = 20;
export const GENERATION_IP_LIMIT = 40;

// Unauthenticated sign-up: guarded per-IP only, short window - stops script hammering
// without blocking a household behind one NAT.
export const WAITLIST_WINDOW_SECONDS = 60 * 10; // 10 minutes
export const WAITLIST_IP_LIMIT = 5;

// Fails OPEN on a limiter error - the AI provider's own 429 is the real backstop against
// burning quota; an outage shouldn't lock out legitimate users.
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

// Fails CLOSED to "not paused" - a limiter hiccup shouldn't wrongly tell the user AI is
// off; real enforcement still happens at generation time.
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

export async function enforceGenerationRateLimit(input: {
  userId: string;
  ip: string;
}): Promise<{ allowed: boolean }> {
  const userOk = await underLimit(`gen:user:${input.userId}`, GENERATION_USER_LIMIT);
  if (!userOk) return { allowed: false };
  const ipOk = await underLimit(`gen:ip:${input.ip}`, GENERATION_IP_LIMIT);
  return { allowed: ipOk };
}

// Same fail-open contract as generation - the unique email constraint is the real
// backstop against duplicate sign-ups.
export async function enforceWaitlistRateLimit(ip: string): Promise<{ allowed: boolean }> {
  const ok = await underLimit(`waitlist:ip:${ip}`, WAITLIST_IP_LIMIT, WAITLIST_WINDOW_SECONDS);
  return { allowed: ok };
}
