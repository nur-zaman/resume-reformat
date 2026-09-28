const actionBase =
  "inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium " +
  "transition-colors disabled:cursor-not-allowed";

export const actionSecondary =
  `${actionBase} border border-hairline bg-surface-card text-body ` +
  "hover:bg-surface-elevated hover:text-ink disabled:text-muted";

export const actionPrimary =
  `${actionBase} bg-primary font-semibold text-on-primary hover:bg-primary-active`;

export const actionDisabled = `${actionBase} border border-hairline/70 text-muted-soft`;

export const sectionLabel =
  "font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted";
