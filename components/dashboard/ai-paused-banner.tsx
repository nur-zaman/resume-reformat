export function AiPausedBanner() {
  return (
    <div
      role="status"
      className="flex overflow-hidden rounded-md border border-hairline bg-surface-card"
    >
      <span aria-hidden className="w-[3px] shrink-0 bg-primary" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5">
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          AI paused
        </span>
        <span className="text-sm text-body">
          Free-tier generation quota reached. Editing and export still work — new tailorings
          resume later today.
        </span>
      </div>
    </div>
  );
}
