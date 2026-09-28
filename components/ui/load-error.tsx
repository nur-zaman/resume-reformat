import Link from "next/link";

export function LoadError({
  title,
  message,
  href,
  linkLabel,
}: {
  title: string;
  message: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-error">
          Couldn&apos;t open your resume
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <Link
          href={href}
          className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-active"
        >
          {linkLabel}
        </Link>
      </div>
    </div>
  );
}
