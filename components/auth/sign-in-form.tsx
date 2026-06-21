"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";

const initialState: SignInState = { status: "idle" };

export function SignInForm({ linkError }: { linkError?: boolean }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const invalid = state.status === "invalid";

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-muted">
          Invite-only. Use your invited email — your password is set the first time you
          sign in.
        </p>
      </div>

      {linkError && (
        <p role="alert" className="text-sm text-error">
          That sign-in link was invalid or expired. Sign in with your password below.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-body-strong">
          Email
        </label>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-invalid={invalid}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-body-strong">
          Password
        </label>
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          aria-invalid={invalid}
          aria-describedby={invalid ? "signin-error" : undefined}
        />
      </div>

      {invalid && (
        <p id="signin-error" role="alert" className="text-sm text-error">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
