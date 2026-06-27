"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Primary app navigation in the protected header. Two destinations over the same data: the
 * Workspace (resumes as editable documents) and the Job Tracker (those tailored resumes as a
 * job-application pipeline). The active link is highlighted and marked `aria-current`.
 */
const LINKS = [
  { href: "/dashboard", label: "Workspace" },
  { href: "/tracker", label: "Job Tracker" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-surface-elevated text-ink"
                : "text-muted hover:text-body-strong",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
