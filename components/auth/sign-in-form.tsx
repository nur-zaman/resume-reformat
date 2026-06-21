"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";

const initialState: SignInState = { status: "idle" };

export function SignInForm({ linkError }: { linkError?: boolean }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  // Success state: replace the form with a confirmation (anti-enumeration message).
  if (state.status === "sent") {
    return (
      <div
        role="status"
        className="rounded-lg border border-hairline bg-surface-card p-6 text-sm text-body"
      >
        <p className="mb-1 font-semibold text-ink">Check your inbox</p>
        <p>{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-muted">
          Enter your invited email to get a magic sign-in link.
        </p>
      </div>

      {linkError && (
        <p role="alert" className="text-sm text-error">
          That sign-in link was invalid or expired. Request a new one below.
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
          aria-invalid={state.status === "invalid"}
          aria-describedby={state.status === "invalid" ? "email-error" : undefined}
        />
        {state.status === "invalid" && (
          <p id="email-error" role="alert" className="text-sm text-error">
            {state.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send magic link"}
      </Button>
    </form>
  );
}
