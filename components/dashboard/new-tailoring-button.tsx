"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export type TailorBase = { id: string; label: string };

export function NewTailoringButton({ bases }: { bases: TailorBase[] }) {
  const [open, setOpen] = useState(false);
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

  const label = (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="text-base leading-none">
        +
      </span>
      New tailoring
    </span>
  );

  if (bases.length === 0) {
    return (
      <Button type="button" disabled title="Add a base resume first">
        {label}
      </Button>
    );
  }

  if (bases.length === 1) {
    return (
      <Link
        href={`/editor/${bases[0].id}/tailor`}
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-active"
      >
        {label}
      </Link>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-lg border border-hairline bg-surface-elevated py-1 shadow-lg shadow-black/40"
        >
          <p className="px-3.5 py-2 text-xs text-muted">Tailor from…</p>
          {bases.map((base) => (
            <Link
              key={base.id}
              role="menuitem"
              href={`/editor/${base.id}/tailor`}
              onClick={() => setOpen(false)}
              className="block truncate px-3.5 py-2 text-sm text-body hover:bg-surface-card"
              title={base.label}
            >
              {base.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
