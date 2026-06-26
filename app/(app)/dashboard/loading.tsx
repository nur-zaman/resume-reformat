import { WorkspaceHeading } from "@/components/dashboard/workspace-heading";
import {
  BaseResumeCardSkeleton,
  TailoredJobRowSkeleton,
} from "@/components/dashboard/skeletons";
import { sectionLabel } from "@/components/dashboard/ui";

/**
 * Route-level loading state for the dashboard (screenshot 2). The page heading renders for
 * real so the workspace feels instant; the data bands stream in behind skeletons. The
 * "AI paused" banner is intentionally omitted here — it's conditional, and showing it
 * unconditionally would flash for users who aren't actually paused.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <WorkspaceHeading
        action={
          <span className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold text-on-primary opacity-70">
            + New tailoring
          </span>
        }
      />

      <section className="mt-10">
        <p className={sectionLabel}>Base resume</p>
        <div className="mt-4">
          <BaseResumeCardSkeleton />
        </div>
      </section>

      <section className="mt-12">
        <p className={sectionLabel}>Tailored jobs</p>
        <div className="mt-4 flex flex-col gap-3">
          <TailoredJobRowSkeleton />
          <TailoredJobRowSkeleton />
          <TailoredJobRowSkeleton />
          <TailoredJobRowSkeleton />
        </div>
      </section>
    </div>
  );
}
