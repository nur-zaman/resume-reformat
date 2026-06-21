"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { MoveDirection } from "@/lib/editor";

/** Small, square, icon-style control button used throughout the editor chrome. */
export function IconButton({
  label,
  onClick,
  disabled,
  variant = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm transition-colors",
        "border-hairline bg-surface-elevated",
        disabled
          ? "cursor-not-allowed text-muted-soft"
          : variant === "danger"
            ? "text-body hover:border-error hover:text-error"
            : "text-body hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function MoveButtons({
  itemLabel,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  itemLabel: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: MoveDirection) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <IconButton label={`Move ${itemLabel} up`} disabled={!canMoveUp} onClick={() => onMove("up")}>
        ↑
      </IconButton>
      <IconButton label={`Move ${itemLabel} down`} disabled={!canMoveDown} onClick={() => onMove("down")}>
        ↓
      </IconButton>
    </div>
  );
}

export function VisibilityToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={visible}
      onClick={onToggle}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-md border border-hairline px-2.5 text-xs transition-colors",
        visible ? "bg-surface-elevated text-body" : "bg-surface-soft text-muted",
      )}
    >
      <span aria-hidden>{visible ? "👁" : "🚫"}</span>
      {visible ? "Visible" : "Hidden"}
    </button>
  );
}

/** Two-step delete so a single misclick cannot destroy content (PRD §12). */
export function ConfirmDeleteButton({
  label,
  onDelete,
}: {
  label: string;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <IconButton label={label} variant="danger" onClick={() => setConfirming(true)}>
        🗑
      </IconButton>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onDelete}
        className="h-8 rounded-md border border-error px-2 text-xs font-semibold text-error"
      >
        Confirm
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="h-8 rounded-md border border-hairline px-2 text-xs text-body"
      >
        Cancel
      </button>
    </div>
  );
}
