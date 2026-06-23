"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/http/client-ip";
import { isValidEmail, normalizeEmail } from "@/lib/auth/email";
import { enforceWaitlistRateLimit } from "@/lib/ratelimit";

/**
 * Public waitlist sign-up (the landing page's only write path). There is no auth here —
 * the gate is a deterministic email check, a per-IP rate limit, and a hidden honeypot
 * field. Writes go through the server-side secret key (`waitlist_signups` is never exposed
 * to the Data API), and the unique-email constraint makes a repeat sign-up an idempotent
 * no-op. Bound via `useActionState` from the waitlist form.
 */
export type WaitlistState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

const GENERIC_ERROR = "Something went wrong. Please try again.";

export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  // Honeypot: a hidden, label-less field real users never see. A filled value means a bot,
  // so we report success and silently drop it (no signal back about the trap).
  if (String(formData.get("company_website") ?? "").trim() !== "") {
    return { status: "success" };
  }

  const rawEmail = String(formData.get("email") ?? "");
  if (!isValidEmail(rawEmail)) {
    return { status: "error", message: "Enter a valid email address." };
  }
  const email = normalizeEmail(rawEmail);

  // Coarse per-IP abuse guard. Fails open (a limiter outage shouldn't block sign-ups).
  const { allowed } = await enforceWaitlistRateLimit(await clientIp());
  if (!allowed) {
    return { status: "error", message: "Too many attempts. Please try again in a few minutes." };
  }

  try {
    const admin = createAdminClient();
    // Idempotent: a duplicate email is silently ignored, so re-submitting reads as success
    // without leaking whether the address was already on the list.
    const { error } = await admin
      .from("waitlist_signups")
      .upsert({ email, source: "landing" }, { onConflict: "email", ignoreDuplicates: true });
    if (error) {
      console.error("waitlist_insert_failed", { code: error.code, message: error.message });
      return { status: "error", message: GENERIC_ERROR };
    }
  } catch (err) {
    console.error("waitlist_client_failed", err);
    return { status: "error", message: GENERIC_ERROR };
  }

  return { status: "success" };
}
