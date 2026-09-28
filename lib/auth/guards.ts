import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowed } from "@/lib/auth/allowlist";

/**
 * Server-side authorization boundary. The proxy and layouts redirect for UX, but
 * these helpers — plus Postgres RLS — are the real enforcement. Every protected
 * server action and route handler should gate on `requireAllowlistedUser`.
 */

export type AuthenticatedUser = { id: string; email: string };

/** Returns minimal identity claims from a cryptographically verified JWT. */
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

/**
 * Resolve session + allowlist in one call so UI can branch three ways:
 * redirect (unauthenticated), access-denied (authenticated but not allowlisted),
 * or render (allowed).
 */
export async function getAuthState(): Promise<AuthState> {
  const user = await getUser();
  if (!user) return { status: "unauthenticated" };
  const allowed = await isEmailAllowed(user.email);
  return allowed ? { status: "allowed", user } : { status: "denied", user };
}

/** Thrown by `requireAllowlistedUser` so callers can map to 401/403 responses. */
export class AuthorizationError extends Error {
  constructor(public reason: "unauthenticated" | "forbidden") {
    super(reason);
    this.name = "AuthorizationError";
  }
}

/**
 * Hard guard for protected mutations and route handlers. Throws unless the caller
 * has a valid session AND is allowlisted. Returns the user and a request-scoped
 * Supabase client (RLS still applies to its queries).
 */
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
