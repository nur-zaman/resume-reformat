"use client";

import {
  blockIdForContentId,
  pendingReviewItems,
} from "@/lib/editor";
import type { ReviewItem } from "@/lib/resume";
import { useEditorStore, nowIso } from "../editor-context";

function ProposalTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-primary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-on-primary">
      <span aria-hidden>✦</span> AI proposed
    </span>
  );
}

function resolveActions(dispatch: ReturnType<typeof useEditorStore>["dispatch"], id: string) {
  return {
    accept: () => dispatch({ type: "review/resolve", reviewItemId: id, resolution: "accept", now: nowIso() }),
    dismiss: () => dispatch({ type: "review/resolve", reviewItemId: id, resolution: "dismiss", now: nowIso() }),
  };
}

export function ProposalBanner({ items }: { items: ReviewItem[] }) {
  const { dispatch } = useEditorStore();
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const { accept, dismiss } = resolveActions(dispatch, item.id);
        return (
          <div
            key={item.id}
            className="rounded-md border border-primary/40 bg-surface-elevated p-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <ProposalTag />
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={accept}
                  className="h-7 rounded-md bg-primary px-2.5 text-xs font-semibold text-on-primary"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="h-7 rounded-md border border-hairline px-2.5 text-xs text-body hover:border-error hover:text-error"
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-muted">{item.reason}</p>
            <p className="mt-1 text-[11px] text-muted-soft">
              Edit the text below to revise it, then Accept — editing alone does not accept it.
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function ReviewQueue() {
  const { state, dispatch } = useEditorStore();
  const pending = pendingReviewItems(state);

  function jumpTo(item: ReviewItem) {
    const blockId = blockIdForContentId(state.doc, item.targetContentId);
    if (!blockId) return;
    dispatch({ type: "select", blockId });
    const el = document.getElementById(`block-${blockId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.focus({ preventScroll: true });
    }
  }

  return (
    <section
      aria-label="Review queue"
      className="rounded-lg border border-hairline bg-surface-card p-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Review queue
        </h2>
        <span
          className="rounded-pill bg-surface-elevated px-2 py-0.5 text-[11px] font-semibold text-body"
          aria-live="polite"
        >
          {pending.length} pending
        </span>
      </div>
      {pending.length === 0 ? (
        <p className="mt-2 text-xs text-muted">
          No pending proposals. Export is unblocked once the queue is clear.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {pending.map((item) => (
            <li key={item.id} className="rounded-md border-l-2 border-primary bg-surface-elevated p-2">
              <p className="text-xs text-body">{item.reason}</p>
              <button
                type="button"
                onClick={() => jumpTo(item)}
                className="mt-1 text-[11px] font-semibold text-primary hover:underline"
              >
                Jump to proposal →
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
