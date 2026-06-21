/**
 * Shared rich-text traversal (PRD §10 — "share rich-text traversal logic").
 *
 * Converts the canonical constrained ProseMirror JSON (`RichText` from
 * `@/lib/resume`) into a small, renderer-agnostic intermediate model that both the
 * HTML preview and the react-pdf renderer consume. This is the ONLY walker of
 * rich-text content used by the renderers, so bold/italic/link/hard-break handling
 * cannot diverge between the two outputs.
 *
 * The intermediate model is intentionally flat:
 *   - a paragraph is an array of `lines`; a hard break starts a new line
 *   - a list is its `ordered` flag, a `start` index, and its items
 *   - each list item is itself an array of `lines` (a list item may hold >1 paragraph)
 *   - a `line` is an array of `InlineRun`s, each carrying its resolved marks
 */

import type { RichText, InlineNode } from "@/lib/resume";

/** A run of text with its resolved inline marks. `href` implies a link. */
export type InlineRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
};

/** A single visual line: a sequence of styled runs. */
export type RenderLine = InlineRun[];

export type RenderParagraph = { kind: "paragraph"; lines: RenderLine[] };
export type RenderListItem = { lines: RenderLine[] };
export type RenderList = {
  kind: "list";
  ordered: boolean;
  start: number;
  items: RenderListItem[];
};
export type RenderNode = RenderParagraph | RenderList;

/** Split a paragraph's inline content into lines, breaking on `hardBreak`. */
function inlineToLines(content: InlineNode[] | undefined): RenderLine[] {
  const lines: RenderLine[] = [[]];
  for (const node of content ?? []) {
    if (node.type === "hardBreak") {
      lines.push([]);
      continue;
    }
    const run: InlineRun = { text: node.text };
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") run.bold = true;
      else if (mark.type === "italic") run.italic = true;
      else if (mark.type === "link") run.href = mark.attrs.href;
    }
    lines[lines.length - 1].push(run);
  }
  return lines;
}

/** Collect the lines of a list item across its (one or more) paragraphs. */
function listItemLines(paragraphs: { content?: InlineNode[] }[]): RenderLine[] {
  return paragraphs.flatMap((p) => inlineToLines(p.content));
}

/** Convert a `RichText` body into the renderer-agnostic node model. */
export function richTextToNodes(body: RichText): RenderNode[] {
  const out: RenderNode[] = [];
  for (const node of body.content) {
    if (node.type === "paragraph") {
      out.push({ kind: "paragraph", lines: inlineToLines(node.content) });
    } else if (node.type === "bulletList") {
      out.push({
        kind: "list",
        ordered: false,
        start: 1,
        items: node.content.map((item) => ({ lines: listItemLines(item.content) })),
      });
    } else if (node.type === "orderedList") {
      out.push({
        kind: "list",
        ordered: true,
        start: node.attrs?.start ?? 1,
        items: node.content.map((item) => ({ lines: listItemLines(item.content) })),
      });
    }
  }
  return out;
}

/** True when a rich-text body has no content (e.g. `{ type: "doc", content: [] }`). */
export function isRichTextEmpty(body: RichText): boolean {
  return body.content.length === 0;
}

/** True when a line carries no visible text (so renderers can drop empty paragraphs). */
export function isLineEmpty(line: RenderLine): boolean {
  return line.every((run) => run.text.length === 0);
}
