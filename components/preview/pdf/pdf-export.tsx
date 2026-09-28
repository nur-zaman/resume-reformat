"use client";

// Next 16 forbids `ssr:false` in a Server Component, so this client shell lazy-loads
// react-pdf behind `dynamic(ssr:false)` instead.

import dynamic from "next/dynamic";
import { useState } from "react";
import type { ResumeDoc } from "@/lib/resume";
import { Button } from "@/components/ui/button";

const PdfExportClient = dynamic(() => import("./pdf-export-client"), {
  ssr: false,
  loading: () => (
    <p className="rounded-lg border border-hairline bg-surface-card p-4 text-sm text-muted">
      Loading PDF engine…
    </p>
  ),
});

export function PdfExport({ doc }: { doc: ResumeDoc }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Close PDF preview" : "Export PDF"}
      </Button>
      {open ? <PdfExportClient doc={doc} /> : null}
    </div>
  );
}
