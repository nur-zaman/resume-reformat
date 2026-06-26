/**
 * Shown only when the user's per-hour generation quota is exhausted (see
 * `isGenerationPausedForUser`). Reassures that the non-AI paths still work, so a paused
 * generator never reads as a broken app. The yellow left rule is a real element (not a
 * border-side override) so it renders identically regardless of utility ordering — and
 * carries the brand voltage without filling a whole surface (DESIGN.md: yellow stays scarce
 * at the element level).
 */
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
