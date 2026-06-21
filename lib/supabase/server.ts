import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Bound to Next.js 16's async `cookies()`. The `setAll` try/catch is required:
 * Server Components render with read-only cookies and would otherwise throw — the
 * proxy refreshes the session in that case, so the throw is safe to ignore.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfig();

  return createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — ignore; the proxy keeps cookies fresh.
          }
        },
      },
    },
  );
}
