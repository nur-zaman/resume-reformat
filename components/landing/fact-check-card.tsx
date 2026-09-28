import { cn } from "@/lib/utils/cn";

type Verdict = "flagged" | "verified";

type ReviewItem = {
  claim: string;
  verdict: Verdict;
  note: string;
};

const ITEMS: ReviewItem[] = [
  {
    claim: "Increased annual revenue by $4M",
    verdict: "flagged",
    note: "No source in your resume",
  },
  {
    claim: "Led migration of 12 microservices to Kubernetes",
    verdict: "verified",
    note: "Matches “Platform Engineer, 2020”",
  },
  {
    claim: "Mentored 5 junior engineers to promotion",
    verdict: "verified",
    note: "Matches “Tech Lead, 2022”",
  },
];

export function FactCheckCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface-card">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
        <span className="font-mono text-xs text-muted">review · 3 claims checked</span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-warning">
          <span className="size-1.5 rounded-pill bg-warning" />1 needs review
        </span>
      </div>
      <ul className="divide-y divide-hairline">
        {ITEMS.map((item) => {
          const flagged = item.verdict === "flagged";
          return (
            <li key={item.claim} className="flex items-start gap-3 px-5 py-4">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-pill",
                  flagged ? "bg-warning/15 text-warning" : "bg-success/15 text-success",
                )}
              >
                {flagged ? <AlertIcon className="size-3" /> : <CheckIcon className="size-3" />}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm text-body-strong",
                    flagged && "text-muted line-through decoration-warning/50",
                  )}
                >
                  {item.claim}
                </p>
                <p
                  className={cn(
                    "mt-0.5 font-mono text-xs",
                    flagged ? "text-warning" : "text-muted",
                  )}
                >
                  {item.note}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M16.5 5.5 8 14l-4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M10 6v5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="10" cy="14.5" r="1.1" fill="currentColor" />
    </svg>
  );
}
