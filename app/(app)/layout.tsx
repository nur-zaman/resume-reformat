import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth/guards";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Wordmark } from "@/components/ui/wordmark";

/**
 * Protected shell. Server-side guard branches three ways:
 *  - unauthenticated -> redirect to /login (the proxy also does this for UX)
 *  - authenticated but not allowlisted -> clear access-denied state
 *  - allowed -> render the app chrome
 * This is a server boundary, but RLS remains the final guarantee for data access.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthState();

  if (auth.status === "unauthenticated") {
    redirect("/login");
  }

  if (auth.status === "denied") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Access not enabled
          </h1>
          <p className="mt-2 text-sm text-muted">
            You&apos;re signed in as{" "}
            <span className="font-mono text-body">{auth.user.email}</span>, but this
            address isn&apos;t on the invite list. Contact the owner if you think this
            is a mistake.
          </p>
          <div className="mt-6 flex justify-center">
            <SignOutButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-16 items-center justify-between border-b border-hairline px-6">
        <Link
          href="/dashboard"
          aria-label="Resume Reformatter — go to dashboard"
          className="text-ink hover:text-body-strong"
        >
          <Wordmark iconSize={26} className="text-sm" />
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-xs text-muted sm:inline">
            {auth.user.email}
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
