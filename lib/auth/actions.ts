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

// Same message for "not invited" and "wrong password" - prevents email enumeration.
const GENERIC_INVALID = "Incorrect email or password.";

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

  // Must run before any Supabase auth call - non-invited addresses must never be created or signed in.
  if (!(await isEmailAllowed(email))) {
    return { status: "invalid", message: GENERIC_INVALID };
  }

  const supabase = await createClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (!signInError) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) {
    return { status: "invalid", message: GENERIC_INVALID };
  }

  const { error: secondSignInError } = await supabase.auth.signInWithPassword({ email, password });
  if (secondSignInError) {
    return { status: "invalid", message: GENERIC_INVALID };
  }

  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
