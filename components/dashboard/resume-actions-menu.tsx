"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { renameResume, duplicateResume, deleteResume } from "@/lib/resume/actions";
import { TextInput } from "@/components/ui/text-input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * The "⋯" overflow menu carried by every base-resume card and tailored-job row. Keeps the
 * full resume CRUD — Rename (dialog), Duplicate, Delete (confirm) — reachable from the
 * redesigned dashboard without cluttering each row with five buttons. Optional `links` (e.g.
 * "Tailor to a job") render above the mutating actions. Mutations run through the existing
 * server actions, then `router.refresh()` re-reads the list.
 */
export function ResumeActionsMenu({
  id,
  title,
  noun = "resume",
  links = [],
}: {
  id: string;
  title: string;
  noun?: string;
  links?: { label: string; href: string }[];
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
      setError(`Enter a name for this ${noun}.`);
      return;
    }
    run(() => renameResume(id, next), () => setRenaming(false));
  }

  const menuItem =
    "block w-full px-3.5 py-2 text-left text-sm text-body hover:bg-surface-card disabled:text-muted";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${title}`}
        disabled={pending}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-hairline text-muted transition-colors hover:bg-surface-elevated hover:text-ink disabled:cursor-not-allowed"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
          <circle cx="8" cy="3" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="8" cy="13" r="1.4" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-lg border border-hairline bg-surface-elevated py-1 shadow-lg shadow-black/40"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              role="menuitem"
              href={link.href}
              onClick={() => setOpen(false)}
              className={menuItem}
            >
              {link.label}
            </Link>
          ))}
          {links.length > 0 && <div className="my-1 h-px bg-hairline" aria-hidden />}
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            onClick={() => {
              setOpen(false);
              setDraftTitle(title);
              setError(null);
              setRenaming(true);
            }}
          >
            Rename
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            onClick={() => {
              setOpen(false);
              run(() => duplicateResume(id));
            }}
          >
            Duplicate
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${menuItem} text-error hover:bg-surface-card`}
            onClick={() => {
              setOpen(false);
              setConfirmOpen(true);
            }}
          >
            Delete
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="absolute right-0 mt-1 w-52 text-right text-xs text-error">
          {error}
        </p>
      )}

      <RenameDialog
        open={renaming}
        value={draftTitle}
        pending={pending}
        onChange={setDraftTitle}
        onSave={saveRename}
        onClose={() => {
          setRenaming(false);
          setError(null);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete this ${noun}?`}
        description={`“${title}” will be permanently deleted. This can't be undone.`}
        confirmLabel="Delete"
        pending={pending}
        onConfirm={() => run(() => deleteResume(id), () => setConfirmOpen(false))}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function RenameDialog({
  open,
  value,
  pending,
  onChange,
  onSave,
  onClose,
}: {
  open: boolean;
  value: string;
  pending: boolean;
  onChange: (v: string) => void;
  onSave: () => void;
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
      <h2 className="text-base font-semibold text-ink">Rename</h2>
      <label htmlFor="rename-field" className="mt-3 block text-sm text-muted">
        Name
      </label>
      <TextInput
        id="rename-field"
        value={value}
        autoFocus
        className="mt-1.5"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave();
        }}
      />
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </dialog>
  );
}
