import type { Block, ContactItem } from "@/lib/resume";
import { DATE_SEPARATOR } from "./tokens";

export type HeaderBlock = Extract<Block, { type: "header" }>;
export type ContentBlock = Exclude<Block, { type: "header" }>;

// The schema already guarantees exactly one header at index 0, but it's resolved
// explicitly here rather than trusting position.
export function resumeToSections(doc: Block[] | { blocks: Block[] }): Block[] {
  const blocks = Array.isArray(doc) ? doc : doc.blocks;
  const header = blocks.find((b) => b.type === "header");
  const rest = blocks.filter((b) => b.type !== "header" && b.visible);
  return header ? [header, ...rest] : rest;
}

export function contactDisplay(item: ContactItem): string {
  if (item.kind === "custom" && item.label && item.value) {
    return `${item.label}: ${item.value}`;
  }
  return item.value || item.label;
}

export function contactValues(header: HeaderBlock): string[] {
  return header.contact.map(contactDisplay).filter((s) => s.length > 0);
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = startDate.trim();
  const end = endDate.trim();
  if (start && end) return `${start}${DATE_SEPARATOR}${end}`;
  return start || end;
}
