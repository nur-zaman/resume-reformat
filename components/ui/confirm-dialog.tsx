"use client";

import { useEffect, useRef } from "react";
import { Button } from "./button";

/**
 * Accessible confirmation for destructive actions (DESIGN.md: destructive actions require
 * clear labels + confirmation). Built on the native `<dialog>` element so focus-trapping
 * and Esc-to-close come for free; styled with the app tokens. Controlled via `open`.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  pending = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onClose();
      }}
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-lg border border-hairline bg-surface-card p-5 text-body backdrop:bg-black/70"
    >
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onClose} disabled={pending}>
          {cancelLabel}
        </Button>
        <Button variant="danger" type="button" onClick={onConfirm} disabled={pending}>
          {pending ? "Deleting…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
