import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeNextPath } from "@/lib/auth/redirect";

/**
 * Magic-link landing. Supabase's email template points here with `token_hash` and
 * `type`; we verify the OTP (which sets the session cookie via the server client)
 * and redirect to `next`. On failure we send the user back to /login with an error.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = getSafeNextPath(searchParams.get("next"));

  if (token_hash && type === "email") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.nextUrl.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=link", request.nextUrl.origin),
  );
}
