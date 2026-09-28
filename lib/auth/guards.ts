import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";

// Proxy/layouts redirect for UX only - these helpers plus Postgres RLS are the real
// enforcement boundary. Every protected server action/route handler should gate on
// `requireAllowlistedUser`.
export const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Refresh the page and sign in again.";

export type AuthenticatedUser = { id: string; email: string };

// Returns identity claims from a cryptographically verified JWT.
export const getUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub || !claims.email || claims.is_anonymous === true) {
    return null;
  }

  return { id: claims.sub, email: claims.email };
});

export type AuthState =
  | { status: "unauthenticated" }
  | { status: "denied"; user: AuthenticatedUser }
  | { status: "allowed"; user: AuthenticatedUser };

export async function getAuthState(): Promise<AuthState> {
  const user = await getUser();
  if (!user) return { status: "unauthenticated" };
  const allowed = await isEmailAllowed(user.email);
  return allowed ? { status: "allowed", user } : { status: "denied", user };
}

export class AuthorizationError extends Error {
  constructor(public reason: "unauthenticated" | "forbidden") {
    super(reason);
    this.name = "AuthorizationError";
  }
}

// Throws unless the session is valid AND allowlisted; the returned client is still
// RLS-scoped, not an admin client.
export async function requireAllowlistedUser(): Promise<{
  user: AuthenticatedUser;
  supabase: SupabaseClient;
}> {
  const user = await getUser();

  if (!user) throw new AuthorizationError("unauthenticated");
  if (!(await isEmailAllowed(user.email))) {
    throw new AuthorizationError("forbidden");
  }
  return { user, supabase: await createClient() };
}

export async function authorize(): Promise<Awaited<
  ReturnType<typeof requireAllowlistedUser>
> | null> {
  try {
    return await requireAllowlistedUser();
  } catch (err) {
    if (err instanceof AuthorizationError) return null;
    throw err;
  }
}
