/**
 * Placeholder for the right-hand preview pane. The live, fixed-template HTML/PDF
 * preview is the M3 deliverable; in M2 this keeps the two-pane layout intact and tells
 * the user where the preview will appear.
 */
export function PreviewPlaceholder() {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-hairline bg-surface-soft p-8 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Preview</p>
      <p className="mt-2 text-sm font-medium text-body">Live preview arrives in M3</p>
      <p className="mt-1 max-w-xs text-xs text-muted">
        The fixed-template HTML preview and PDF export render from this same document in
        the next milestone.
      </p>
    </div>
  );
}
