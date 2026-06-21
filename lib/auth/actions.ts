"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailAllowed } from "@/lib/auth/allowlist";
import { isValidEmail, normalizeEmail } from "@/lib/auth/email";
import { isValidPassword } from "@/lib/auth/password";

export type SignInState =
  | { status: "idle" }
  | { status: "invalid"; message: string };

// Identical message for "not invited" and "wrong password" so sign-in never reveals
// allowlist membership or which emails have accounts (anti-enumeration, PRD §5).
const GENERIC_INVALID = "Incorrect email or password.";

/**
 * Invite-only password sign-in. The allowlist is the gate: a non-invited address is
 * never created or signed in. For an invited address the password is set on first
 * sign-in (the account is created server-side with the admin client, pre-confirmed,
 * so no email is sent), then verified on every later sign-in. Bound via
 * `useActionState` from the login form.
 */
export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const rawEmail = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!isValidEmail(rawEmail)) {
    return { status: "invalid", message: "Enter a valid email address." };
  }
  if (!isValidPassword(password)) {
    return { status: "invalid", message: "Password must be at least 8 characters." };
  }

  const email = normalizeEmail(rawEmail);

  // Gate before any auth call so non-invited addresses are never created or signed in.
  if (!(await isEmailAllowed(email))) {
    return { status: "invalid", message: GENERIC_INVALID };
  }

  const supabase = await createClient();

  // Returning user: verify the password.
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (!signInError) {
    redirect("/dashboard");
  }

  // First sign-in: create the account (pre-confirmed, no email) and sign in.
  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) {
    // Account already exists -> the password was simply wrong; other errors -> generic.
    return { status: "invalid", message: GENERIC_INVALID };
  }

  const { error: secondSignInError } = await supabase.auth.signInWithPassword({ email, password });
  if (secondSignInError) {
    return { status: "invalid", message: GENERIC_INVALID };
  }

  redirect("/dashboard");
}

/** Clear the session and return to the sign-in screen. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
