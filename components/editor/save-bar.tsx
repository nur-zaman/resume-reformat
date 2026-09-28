"use client";

import { useState } from "react";
import type { ResumeDoc, ReviewItem } from "@/lib/resume";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "./editor-context";

export type SaveResult = { ok: true } | { ok: false; message: string };
export type SaveHandler = (
  doc: ResumeDoc,
  reviewItems: ReviewItem[],
) => Promise<SaveResult>;

type SaveLifecycle =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

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
