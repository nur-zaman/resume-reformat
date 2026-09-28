import { signOut } from "@/lib/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        Sign out
      </button>
    </form>
  );
}
