import type { TailoredStatus } from "@/lib/resume";
import { cn } from "@/lib/utils/cn";

export function StatusBadge({
  status,
  pendingCount,
}: {
  status: TailoredStatus;
  pendingCount: number;
}) {
  const pill =
    "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-medium";

  if (status === "review") {
    return (
      <span className={cn(pill, "border-primary/30 bg-primary/10 text-primary")}>
        <WarningIcon />
        {pendingCount} to review
      </span>
    );
  }
  if (status === "ready") {
    return (
      <span className={cn(pill, "border-success/30 bg-success/10 text-success")}>
        <CheckIcon />
        Ready
      </span>
    );
  }
  return (
    <span className={cn(pill, "border-hairline bg-surface-elevated text-muted")}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-muted" />
      Draft
    </span>
  );
}

function WarningIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <path
        d="M8 2.5 14.5 13.5H1.5L8 2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M8 6.5V9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11.4" r="0.7" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
