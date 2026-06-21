"use client";

import { useState } from "react";
import type { ResumeDoc } from "@/lib/resume";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "./editor-context";

export type SaveResult = { ok: true } | { ok: false; message: string };
export type SaveHandler = (doc: ResumeDoc) => Promise<SaveResult>;

type SaveLifecycle =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

/**
 * Explicit "Save base resume" control (M4). Reads the current document from the editor
 * store and calls the page-supplied `onSave`. The save lifecycle is kept component-local
 * on purpose: the reducer's `saveStatus`/`revision` seams stay reserved for the M6
 * autosave + multi-tab compare-and-swap work. Save is blocked while the document is
 * invalid (the WorkspaceHeader shows the issue count).
 */
export function SaveBar({ onSave, label = "Save base resume" }: {
  onSave: SaveHandler;
  label?: string;
}) {
  const { state } = useEditorStore();
  const [life, setLife] = useState<SaveLifecycle>({ kind: "idle" });

  const invalid = state.validation.status === "invalid";
  const saving = life.kind === "saving";

  async function handleSave() {
    setLife({ kind: "saving" });
    const result = await onSave(state.doc);
    setLife(
      result.ok ? { kind: "saved" } : { kind: "error", message: result.message },
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <p role="status" aria-live="polite" className="text-xs">
        {life.kind === "saving" && <span className="text-muted">Saving…</span>}
        {life.kind === "saved" && <span className="text-success">Saved</span>}
        {invalid && life.kind !== "saving" && (
          <span className="text-warning">Resolve the issues above to save.</span>
        )}
      </p>
      {life.kind === "error" && (
        <p role="alert" className="text-xs text-error">
          {life.message}
        </p>
      )}
      <Button type="button" onClick={handleSave} disabled={saving || invalid}>
        {saving ? "Saving…" : label}
      </Button>
    </div>
  );
}
