"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  renameResume,
  duplicateResume,
  deleteResume,
} from "@/lib/resume/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * One resume in the dashboard list. Open (link), Rename (inline edit), Duplicate, and
 * Delete (confirmation). Mutations run through server actions, then `router.refresh()`
 * re-reads the list (the actions also `revalidatePath("/dashboard")`).
 */
export function ResumeCard({
  id,
  title,
  updatedLabel,
}: {
  id: string;
  title: string;
  updatedLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(
    action: () => Promise<{ ok: boolean; message?: string }>,
    onOk?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.message ?? "Something went wrong.");
        return;
      }
      onOk?.();
      router.refresh();
    });
  }

  function saveRename() {
    const next = draftTitle.trim();
    if (next === "") {
      setError("Enter a name for this resume.");
      return;
    }
    run(() => renameResume(id, next), () => setRenaming(false));
  }

  function cancelRename() {
    setRenaming(false);
    setDraftTitle(title);
    setError(null);
  }

  const actionBtn =
    "inline-flex h-10 items-center rounded-md border border-hairline px-3 text-sm text-body transition-colors hover:bg-surface-elevated disabled:cursor-not-allowed disabled:text-muted";

  return (
    <Card className="flex h-full flex-col gap-3">
      {renaming ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`rename-${id}`} className="sr-only">
            Resume name
          </label>
          <TextInput
            id={`rename-${id}`}
            value={draftTitle}
            autoFocus
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveRename();
              if (e.key === "Escape") cancelRename();
            }}
          />
          <div className="flex gap-2">
            <Button type="button" onClick={saveRename} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={cancelRename}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-ink" title={title}>
            {title}
          </h2>
          <p className="mt-1 text-xs text-muted">Updated {updatedLabel}</p>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      )}

      {!renaming && (
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Link
            href={`/editor/${id}`}
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-active"
          >
            Open
          </Link>
          <Link href={`/editor/${id}/tailor`} className={actionBtn}>
            Tailor
          </Link>
          <button
            type="button"
            onClick={() => setRenaming(true)}
            disabled={pending}
            className={actionBtn}
          >
            Rename
          </button>
          <button
            type="button"
            onClick={() => run(() => duplicateResume(id))}
            disabled={pending}
            className={actionBtn}
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={pending}
            className={`${actionBtn} text-error`}
          >
            Delete
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this resume?"
        description={`“${title}” will be permanently deleted. This can't be undone.`}
        confirmLabel="Delete"
        pending={pending}
        onConfirm={() => run(() => deleteResume(id), () => setConfirmOpen(false))}
        onClose={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
