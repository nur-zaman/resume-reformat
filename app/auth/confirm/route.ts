import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeNextPath } from "@/lib/auth/redirect";

/**
 * Magic-link landing. Supports both Supabase magic-link flows so it works regardless
 * of the configured email template:
 *  - PKCE / default template lands here with `?code=...` -> exchangeCodeForSession.
 *  - The custom OTP template lands here with `?token_hash=...&type=email` -> verifyOtp.
 * Either path sets the session cookie via the server client; we then redirect to
 * `next`. On failure we send the user back to /login with an error.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = getSafeNextPath(searchParams.get("next"));

  const supabase = await createClient();
  const success = new URL(next, request.nextUrl.origin);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(success);
    }
  } else if (token_hash && type === "email") {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(success);
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=link", request.nextUrl.origin),
  );
}
