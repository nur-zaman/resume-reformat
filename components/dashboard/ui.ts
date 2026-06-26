/**
 * Shared class strings for the dashboard's compact row actions. The global `Button` is the
 * h-10/px-5 page CTA; dashboard rows use a slightly smaller (h-9) action sized to sit inside a
 * resume card or job row. Tokens only — no new colors (DESIGN.md).
 */
const actionBase =
  "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium " +
  "transition-colors disabled:cursor-not-allowed";

/** Dark outline action — Preview, Edit, Open. */
export const actionSecondary =
  `${actionBase} border border-hairline bg-surface-card text-body ` +
  "hover:bg-surface-elevated hover:text-ink disabled:text-muted";

/** Electric-yellow action — an enabled Export. */
export const actionPrimary =
  `${actionBase} bg-primary font-semibold text-on-primary hover:bg-primary-active`;

/** A blocked Export (proposals unresolved / draft) — present but visibly inert. */
export const actionDisabled = `${actionBase} border border-hairline/70 text-muted-soft`;

/** Eyebrow used above each dashboard band (WORKSPACE / BASE RESUME / TAILORED JOBS). */
export const sectionLabel =
  "font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted";
