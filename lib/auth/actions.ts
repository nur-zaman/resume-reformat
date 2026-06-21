"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { isValidEmail, normalizeEmail } from "@/lib/auth/email";
import { getSiteUrl } from "@/lib/auth/site-url";

export type SignInState =
  | { status: "idle" }
  | { status: "invalid"; message: string }
  | { status: "sent"; message: string };

// Identical message whether or not the email is allowlisted — never reveals
// allowlist membership (anti-enumeration, PRD §5).
const GENERIC_SENT_MESSAGE =
  "If your email is on the invite list, a sign-in link is on its way. Check your inbox.";

/**
 * Request a magic link. Gates on the allowlist BEFORE calling Supabase so a link
 * is only ever sent to allowlisted addresses, then returns a generic result either
 * way. Bound via `useActionState` from the login form.
 */
export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const raw = String(formData.get("email") ?? "");

  if (!isValidEmail(raw)) {
    return { status: "invalid", message: "Enter a valid email address." };
  }

  const email = normalizeEmail(raw);

  if (await isEmailAllowed(email)) {
    try {
      const supabase = await createClient();
      const redirectUrl = new URL("/auth/confirm", getSiteUrl());
      redirectUrl.searchParams.set("next", "/dashboard");

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl.toString(),
        },
      });

      if (error) {
        console.error("Supabase magic-link request failed", {
          name: error.name,
          message: error.message,
          status: error.status,
        });
      }
    } catch (error) {
      // Keep the response identical for allowed and unknown addresses.
      console.error("Supabase sign-in flow failed", error);
    }
  }

  return { status: "sent", message: GENERIC_SENT_MESSAGE };
}

/** Clear the session and return to the sign-in screen. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
