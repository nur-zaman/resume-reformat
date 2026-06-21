import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

/**
 * Next.js 16 "proxy" (formerly middleware). Two jobs, both UX-only:
 *  1. Verify and refresh the Supabase session by calling getClaims().
 *  2. Redirect unauthenticated navigation away from protected paths to /login.
 *
 * This is NOT a security boundary — it can be bypassed by calling APIs directly.
 * Real enforcement lives in server guards (requireAllowlistedUser) and Postgres RLS.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();

  const supabase = createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Verifies the JWT signature and refreshes near-expiry tokens.
  const { data } = await supabase.auth.getClaims();

  const path = request.nextUrl.pathname;
  const isProtected = path === "/dashboard" || path.startsWith("/dashboard/");

  if (!data?.claims && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  return response;
}

export const config = {
  // Run on everything except static assets and the auth callback route.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/).*)"],
};
