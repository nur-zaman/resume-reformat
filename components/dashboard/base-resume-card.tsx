import Link from "next/link";
import { actionSecondary } from "@/components/ui/styles";
import { ResumeActionsMenu } from "./resume-actions-menu";

/**
 * The featured base-resume card: identity (initials avatar, name, headline), a glanceable
 * section list + last-updated stamp, and the primary actions (Preview, Edit). Rename /
 * Duplicate / Delete / Tailor live in the overflow menu so nothing is lost from the old
 * per-card action set. A server component; only the menu is a client island.
 */
export function BaseResumeCard({
  id,
  name,
  headline,
  initials,
  sections,
  updatedLabel,
}: {
  id: string;
  name: string;
  headline: string;
  initials: string;
  sections: string[];
  updatedLabel: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-hairline bg-surface-card p-5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-surface-elevated font-mono text-lg font-semibold text-primary"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-ink" title={name}>
            {name}
          </h3>
          {headline && (
            <p className="truncate text-sm text-body" title={headline}>
              {headline}
            </p>
          )}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted">
            {sections.length > 0 && <span>{sections.join(" · ")}</span>}
            {sections.length > 0 && (
              <span aria-hidden className="text-muted-soft">
                |
              </span>
            )}
            <span>Updated {updatedLabel}</span>
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link href={`/preview/${id}`} className={actionSecondary}>
          Preview
        </Link>
        <Link href={`/editor/${id}`} className={actionSecondary}>
          Edit base resume
        </Link>
        <ResumeActionsMenu
          id={id}
          title={name}
          links={[{ label: "Tailor to a job", href: `/editor/${id}/tailor` }]}
        />
      </div>
    </div>
  );
}
