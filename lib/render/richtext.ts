// The only walker of rich-text content used by the renderers, so bold/italic/link/
// hard-break handling cannot diverge between the HTML preview and the PDF output.

import type { RichText, InlineNode } from "@/lib/resume";

export type InlineRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
};

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

function listItemLines(paragraphs: { content?: InlineNode[] }[]): RenderLine[] {
  return paragraphs.flatMap((p) => inlineToLines(p.content));
}

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

export function isRichTextEmpty(body: RichText): boolean {
  return body.content.length === 0;
}

export function isLineEmpty(line: RenderLine): boolean {
  return line.every((run) => run.text.length === 0);
}
