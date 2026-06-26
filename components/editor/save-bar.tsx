"use client";

import { useState } from "react";
import type { ResumeDoc, ReviewItem } from "@/lib/resume";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "./editor-context";

export type SaveResult = { ok: true } | { ok: false; message: string };
/**
 * The current review items are passed alongside the doc so a tailored resume's persisted
 * proposals + status stay in sync on save. Handlers that only persist a base resume can
 * accept just the doc — the extra argument is harmless.
 */
export type SaveHandler = (
  doc: ResumeDoc,
  reviewItems: ReviewItem[],
) => Promise<SaveResult>;

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
 *
 * An optional `onSaveDraft` adds a secondary control (used by tailoring) so an unfinished
 * draft can be parked with its proposals still pending, instead of forcing a finalize.
 */
export function SaveBar({
  onSave,
  label = "Save base resume",
  onSaveDraft,
  draftLabel = "Save as draft",
}: {
  onSave: SaveHandler;
  label?: string;
  onSaveDraft?: SaveHandler;
  draftLabel?: string;
}) {
  const { state } = useEditorStore();
  const [life, setLife] = useState<SaveLifecycle>({ kind: "idle" });

  const invalid = state.validation.status === "invalid";
  const saving = life.kind === "saving";

  async function runSave(handler: SaveHandler) {
    setLife({ kind: "saving" });
    const result = await handler(state.doc, state.reviewItems);
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
      {onSaveDraft && (
        <Button
          variant="secondary"
          type="button"
          onClick={() => runSave(onSaveDraft)}
          disabled={saving || invalid}
        >
          {draftLabel}
        </Button>
      )}
      <Button type="button" onClick={() => runSave(onSave)} disabled={saving || invalid}>
        {saving ? "Saving…" : label}
      </Button>
    </div>
  );
}
