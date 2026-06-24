"use client";

import { useActionState, useId } from "react";
import { joinWaitlist, type WaitlistState } from "@/lib/waitlist/actions";
import { cn } from "@/lib/utils/cn";

const initialState: WaitlistState = { status: "idle" };

/**
 * Waitlist email capture, bound to the `joinWaitlist` server action via `useActionState`.
 * Two tones: "dark" for near-black surfaces (hero) and "onYellow" for the full-bleed yellow
 * CTA band. The input + button fuse into one pill on desktop and stack on mobile.
 *
 * Accessibility: the label is always present (sr-only), the status line is an aria-live
 * region (assertive for errors, polite otherwise), the input flips aria-invalid + describes
 * itself by the message on error, and the button reserves its width so it never jumps
 * between idle/submitting. The honeypot field is hidden from everyone but bots.
 */
export function WaitlistForm({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "onYellow";
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(joinWaitlist, initialState);
  const fieldId = useId();
  const msgId = `${fieldId}-msg`;
  const errored = state.status === "error";
  const onYellow = tone === "onYellow";

  if (state.status === "success") {
    return (
      <p
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-center justify-center gap-2 text-sm font-medium sm:justify-start",
          onYellow ? "text-on-primary" : "text-success",
          className,
        )}
      >
        <CheckIcon className="size-5 shrink-0" />
        You&rsquo;re on the list — we&rsquo;ll be in touch when your invite is ready.
      </p>
    );
  }

  return (
    <form action={formAction} noValidate className={cn("w-full max-w-md", className)}>
      <div
        className={cn(
          "flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-1.5 sm:rounded-pill sm:border sm:p-1.5",
          "sm:focus-within:border-primary",
          onYellow
            ? "sm:border-on-primary/25 sm:bg-on-primary/10"
            : "sm:border-hairline sm:bg-surface-card",
        )}
      >
        <label htmlFor={fieldId} className="sr-only">
          Work email address
        </label>
        <input
          id={fieldId}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@work.com"
          aria-invalid={errored}
          aria-describedby={errored ? msgId : undefined}
          className={cn(
            "h-11 min-w-0 flex-1 rounded-md px-4 text-sm outline-none sm:rounded-pill sm:bg-transparent py-2.5",
            onYellow
              ? "border border-on-primary/25 bg-on-primary/5 text-on-primary placeholder:text-on-primary/50 sm:border-0"
              : "border border-hairline bg-surface-card text-ink placeholder:text-muted sm:border-0",
          )}
        />
        {/* Honeypot: present in the DOM for bots, hidden from people + assistive tech and
            kept out of the tab order. `sr-only` clips it without affecting layout. */}
        <input
          type="text"
          name="company_website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="sr-only"
        />
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className={cn(
            "inline-flex h-11 min-w-34 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold",
            "transition-colors disabled:cursor-not-allowed sm:rounded-pill",
            onYellow
              ? "bg-canvas text-ink hover:bg-surface-elevated disabled:bg-surface-card disabled:text-muted"
              : "bg-primary text-on-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted",
          )}
        >
          {pending ? (
            <>
              <SpinnerIcon className="size-4 animate-spin" />
              Joining…
            </>
          ) : (
            "Join waitlist"
          )}
        </button>
      </div>
      <p
        id={msgId}
        role={errored ? "alert" : "status"}
        aria-live={errored ? "assertive" : "polite"}
        className={cn(
          "mt-2 min-h-5 px-1 text-xs",
          errored ? (onYellow ? "text-on-primary" : "text-error") : onYellow ? "text-on-primary/70" : "text-muted",
        )}
      >
        {errored ? state.message : "No spam. One email when your invite is ready."}
      </p>
    </form>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M16.5 5.5 8 14l-4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
