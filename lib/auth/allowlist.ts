import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/auth/email";

// Uses the service-role client so allowed_emails is never exposed to browser clients;
// no enumeration-prone public RPC.
export async function isEmailAllowed(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("allowed_emails")
      .select("email")
      .eq("email", normalized)
      .maybeSingle();

    if (error) {
      console.error("Supabase allowlist lookup failed", {
        code: error.code,
        message: error.message,
      });
      return false;
    }

    return data !== null;
  } catch (error) {
    console.error("Supabase allowlist client failed", error);
    return false;
  }
}
