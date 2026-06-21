"use client";

/**
 * The editor's right-pane live preview (PRD FR-26) plus the export controls.
 *
 * Renders the fixed HTML template (ResumeDocument) from the current working document. A
 * zoom toolbar lets the user read the sheet comfortably: "Fit width" scales the US-Letter
 * sheet to the pane (the default), and 100%/±/manual zoom enlarge it with the pane
 * scrolling in both axes. The sheet is a continuous paper column — true page breaks are
 * shown in the PDF preview, not simulated here. Export is gated (FR-28): while AI proposals
 * are pending the PDF button is disabled and links to the next unresolved item.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  blockIdForContentId,
  canExport,
  pendingReviewItems,
} from "@/lib/editor";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/components/editor/editor-context";
import { ResumeDocument } from "./resume-document";
import { PdfExport } from "./pdf/pdf-export";

/** US Letter width (612pt) in CSS px at 96dpi — the unscaled sheet width. */
const PAPER_PX = Math.round((612 * 96) / 72); // 816
/** Pane inner padding (Tailwind p-4) subtracted when computing the fit-width scale. */
const PANE_PAD = 16;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

type Zoom = { mode: "fit" } | { mode: "manual"; value: number };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function ResumePreview() {
  const { state, dispatch } = useEditorStore();
  const exportable = canExport(state);
  const pending = pendingReviewItems(state);

  const paneRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [unscaledHeight, setUnscaledHeight] = useState(0);
  const [zoom, setZoom] = useState<Zoom>({ mode: "fit" });

  useEffect(() => {
    const pane = paneRef.current;
    const sheet = sheetRef.current;
    if (!pane || !sheet) return;

    const recompute = () => {
      const available = pane.clientWidth - PANE_PAD * 2;
      setFitScale(clamp(available / PAPER_PX, MIN_ZOOM, MAX_ZOOM));
      // offsetHeight is pre-transform, so this is the unscaled sheet height.
      setUnscaledHeight(sheet.offsetHeight);
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(pane);
    ro.observe(sheet);
    return () => ro.disconnect();
  }, []);

  const scale = zoom.mode === "fit" ? fitScale : zoom.value;
  const sheetWidth = Math.round(PAPER_PX * scale);
  const sheetHeight = Math.round(unscaledHeight * scale);

  const adjustZoom = useCallback(
    (delta: number) =>
      setZoom((z) => ({
        mode: "manual",
        value: clamp((z.mode === "fit" ? fitScale : z.value) + delta, MIN_ZOOM, MAX_ZOOM),
      })),
    [fitScale],
  );

  const jumpToFirstPending = useCallback(() => {
    const first = pending[0];
    if (!first) return;
    const blockId = blockIdForContentId(state.doc, first.targetContentId);
    if (!blockId) return;
    dispatch({ type: "select", blockId });
    const el = document.getElementById(`block-${blockId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.focus({ preventScroll: true });
    }
  }, [pending, state.doc, dispatch]);

  return (
    <div className="flex flex-col gap-3">
      {exportable ? (
        <PdfExport doc={state.doc} />
      ) : (
        <div className="flex flex-col gap-2">
          <Button type="button" disabled>
            Export PDF
          </Button>
          <p className="text-xs text-warning">
            {pending.length} AI proposal{pending.length === 1 ? "" : "s"} to resolve before
            export.{" "}
            <button
              type="button"
              onClick={jumpToFirstPending}
              className="font-semibold text-primary hover:underline"
            >
              Go to next unresolved item →
            </button>
          </p>
        </div>
      )}

      <ZoomToolbar
        percent={Math.round(scale * 100)}
        isFit={zoom.mode === "fit"}
        onFit={() => setZoom({ mode: "fit" })}
        onReset={() => setZoom({ mode: "manual", value: 1 })}
        onZoomIn={() => adjustZoom(ZOOM_STEP)}
        onZoomOut={() => adjustZoom(-ZOOM_STEP)}
        canZoomIn={scale < MAX_ZOOM}
        canZoomOut={scale > MIN_ZOOM}
      />

      <div
        ref={paneRef}
        className="overflow-auto rounded-lg border border-hairline bg-surface-soft p-4 lg:max-h-[calc(100vh-7rem)]"
      >
        <div style={{ width: sheetWidth || undefined, height: sheetHeight || undefined }}>
          <div
            ref={sheetRef}
            style={{
              width: PAPER_PX,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <ResumeDocument doc={state.doc} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ZoomToolbar({
  percent,
  isFit,
  onFit,
  onReset,
  onZoomIn,
  onZoomOut,
  canZoomIn,
  canZoomOut,
}: {
  percent: number;
  isFit: boolean;
  onFit: () => void;
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Preview zoom">
      <ToolbarButton onClick={onFit} active={isFit}>
        Fit width
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-hairline" aria-hidden />
      <ToolbarButton onClick={onZoomOut} disabled={!canZoomOut} aria-label="Zoom out">
        −
      </ToolbarButton>
      <button
        type="button"
        onClick={onReset}
        className="h-7 min-w-14 rounded-md px-2 text-center text-xs font-medium tabular-nums text-body hover:bg-surface-elevated"
        aria-label="Reset zoom to 100%"
      >
        {percent}%
      </button>
      <ToolbarButton onClick={onZoomIn} disabled={!canZoomIn} aria-label="Zoom in">
        +
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 items-center justify-center rounded-md border px-2.5 text-xs font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "border-primary/40 bg-surface-elevated text-ink"
          : "border-hairline text-body hover:bg-surface-elevated",
        className,
      )}
      {...props}
    />
  );
}
