import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Secret-key Supabase client. It bypasses RLS, stays server-only, and is used
 * solely for the pre-auth allowlist check. Never import it into client code.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Missing Supabase admin configuration. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SECRET_KEY.",
    );
  }

  return createSupabaseClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
