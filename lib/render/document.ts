/**
 * Shared document model for the renderers (PRD §10).
 *
 * Turns a `ResumeDoc` into the ordered, visibility-filtered list of blocks both
 * renderers iterate, and centralises the small bits of header/date formatting so the
 * HTML and PDF outputs are assembled from identical data. Markup is each renderer's
 * own concern; WHAT to render lives here.
 */

import type { Block, ContactItem } from "@/lib/resume";
import { DATE_SEPARATOR } from "./tokens";

export type HeaderBlock = Extract<Block, { type: "header" }>;
export type ContentBlock = Exclude<Block, { type: "header" }>;

/**
 * The blocks to render, in order: the header first (it is pinned first and never
 * hidden), then every non-header block that is `visible`, in document order. The
 * schema already guarantees exactly one header at index 0, but we resolve it
 * explicitly rather than trusting position.
 */
export function resumeToSections(doc: Block[] | { blocks: Block[] }): Block[] {
  const blocks = Array.isArray(doc) ? doc : doc.blocks;
  const header = blocks.find((b) => b.type === "header");
  const rest = blocks.filter((b) => b.type !== "header" && b.visible);
  return header ? [header, ...rest] : rest;
}

/** The display string for a single contact item (value, falling back to its label). */
export function contactDisplay(item: ContactItem): string {
  if (item.kind === "custom" && item.label && item.value) {
    return `${item.label}: ${item.value}`;
  }
  return item.value || item.label;
}

/** Non-empty contact display strings for the header line. */
export function contactValues(header: HeaderBlock): string[] {
  return header.contact.map(contactDisplay).filter((s) => s.length > 0);
}

/**
 * Format an entry's date range from its display-date strings (e.g. "2021" / "Present").
 * Either side may be "", in which case only the present side is shown.
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = startDate.trim();
  const end = endDate.trim();
  if (start && end) return `${start}${DATE_SEPARATOR}${end}`;
  return start || end;
}
