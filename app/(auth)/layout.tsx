import Link from "next/link";

/** Centered, responsive surface for sign-in. Landing + auth are the only responsive screens. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 inline-block font-mono text-sm tracking-tight text-muted hover:text-body"
        >
          resume<span className="text-primary">/</span>reformatter
        </Link>
        {children}
      </div>
    </div>
  );
}
