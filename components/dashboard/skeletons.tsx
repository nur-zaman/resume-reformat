import { JOB_COLS } from "./tailored-job-row";

/** Loading placeholders for the dashboard's data bands (route `loading.tsx`, screenshot 2). */

function Bar({ className }: { className?: string }) {
  return <span className={`block rounded bg-surface-elevated ${className ?? ""}`} />;
}

export function BaseResumeCardSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-lg border border-hairline bg-surface-card p-5">
      <span className="h-14 w-14 shrink-0 rounded-md bg-surface-elevated" />
      <div className="flex-1 space-y-2.5">
        <Bar className="h-4 w-40" />
        <Bar className="h-3 w-56" />
        <Bar className="h-3 w-80 max-w-full" />
      </div>
    </div>
  );
}

export function TailoredJobRowSkeleton() {
  return (
    <div
      className={`animate-pulse rounded-lg border border-hairline bg-surface-card px-5 py-4 md:grid md:items-center md:gap-4 ${JOB_COLS}`}
    >
      <div className="space-y-2">
        <Bar className="h-4 w-48" />
        <Bar className="h-3 w-28" />
      </div>
      <Bar className="mt-3 h-6 w-24 rounded-pill md:mt-0" />
      <Bar className="mt-2 h-3 w-24 md:mt-0" />
      <div className="mt-3 flex justify-end gap-2 md:mt-0">
        <Bar className="h-9 w-16 rounded-md" />
        <Bar className="h-9 w-16 rounded-md" />
      </div>
    </div>
  );
}
