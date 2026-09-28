import { STAGE_LABELS, type ApplicationStage } from "@/lib/applications/stages";
import { cn } from "@/lib/utils/cn";

const STAGE_STYLES: Record<ApplicationStage, string> = {
  none: "border-hairline bg-surface-elevated text-muted",
  applied: "border-hairline-strong bg-surface-elevated text-body-strong",
  interviewing: "border-warning/30 bg-warning/10 text-warning",
  offer: "border-success/30 bg-success/10 text-success",
  accepted: "border-success/40 bg-success/20 text-success",
  rejected: "border-error/30 bg-error/10 text-error",
  withdrawn: "border-hairline bg-surface-elevated text-muted",
};

const PILL =
  "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-medium";

export function StageBadge({
  stage,
  className,
}: {
  stage: ApplicationStage;
  className?: string;
}) {
  return (
    <span className={cn(PILL, STAGE_STYLES[stage], className)}>
      <StageIcon stage={stage} />
      {STAGE_LABELS[stage]}
    </span>
  );
}

function StageIcon({ stage }: { stage: ApplicationStage }) {
  if (stage === "accepted") return <CheckIcon />;
  if (stage === "rejected") return <CrossIcon />;
  return (
    <span
      aria-hidden
      className={cn(
        "h-1.5 w-1.5 rounded-full",
        stage === "none" ? "border border-current" : "bg-current",
      )}
    />
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

function CrossIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
      <path
        d="M4 4 12 12M12 4 4 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
