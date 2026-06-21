"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createEmptyResumeDoc, DEFAULT_RESUME_TITLE } from "@/lib/resume";
import { createResume } from "@/lib/resume/actions";
import { Button } from "@/components/ui/button";

/**
 * "New resume" control offering the two creation paths (confirmed with the owner): Import
 * (the paste/PDF onboarding flow) and Start blank (an empty doc created immediately, then
 * opened in the editor). A small menu keeps the dashboard header uncluttered; it closes on
 * outside-click and Escape.
 */
export function NewResumeButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function startBlank() {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await createResume({
        doc: createEmptyResumeDoc(),
        title: DEFAULT_RESUME_TITLE,
      });
      if (result.ok) router.push(`/editor/${result.id}`);
      else setError(result.message);
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
      >
        {pending ? "Creating…" : "New resume"}
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-60 overflow-hidden rounded-lg border border-hairline bg-surface-elevated py-1"
        >
          <Link
            role="menuitem"
            href="/onboarding"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-body hover:bg-surface-card"
          >
            Import (paste or PDF)
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={startBlank}
            className="block w-full px-4 py-2.5 text-left text-sm text-body hover:bg-surface-card"
          >
            Start blank
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-right text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
