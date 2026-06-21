import Link from "next/link";
import { getUser } from "@/lib/auth/guards";

/**
 * M1 placeholder: confirms the authenticated + allowlisted shell works end to end.
 * Onboarding, the resume editor, and tailoring land in later milestones.
 */
export default async function DashboardPage() {
  const user = await getUser();

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">
          Signed in
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-muted">
          You&apos;re authenticated as{" "}
          <span className="font-mono text-body">{user?.email}</span>. Job tailoring
          arrives in the next milestones.
        </p>
        <Link
          href="/editor"
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-active"
        >
          Open the resume editor
        </Link>
      </div>
    </div>
  );
}
