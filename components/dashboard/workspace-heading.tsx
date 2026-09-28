export function WorkspaceHeading({ action }: { action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="max-w-2xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Workspace
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">
          Tailor your resume
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          One base resume, tailored to every role. Resolve AI proposals, then export a clean PDF.
        </p>
      </div>
      {action}
    </div>
  );
}
