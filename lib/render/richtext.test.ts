import { describe, it, expect } from "vitest";
import type { RichText } from "@/lib/resume";
import {
  richTextToNodes,
  isRichTextEmpty,
  isLineEmpty,
  type RenderList,
  type RenderParagraph,
} from "./richtext";

describe("richTextToNodes", () => {
  it("returns no nodes for an empty document", () => {
    const body: RichText = { type: "doc", content: [] };
    expect(richTextToNodes(body)).toEqual([]);
    expect(isRichTextEmpty(body)).toBe(true);
  });

  it("maps a plain paragraph to a single line of one run", () => {
    const body: RichText = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello world" }] }],
    };
    const nodes = richTextToNodes(body);
    expect(nodes).toEqual([
      { kind: "paragraph", lines: [[{ text: "Hello world" }]] },
    ]);
  });

  it("resolves bold, italic and link marks onto runs", () => {
    const body: RichText = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "a", marks: [{ type: "bold" }] },
            { type: "text", text: "b", marks: [{ type: "italic" }] },
            {
              type: "text",
              text: "c",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
            {
              type: "text",
              text: "d",
              marks: [{ type: "bold" }, { type: "italic" }],
            },
          ],
        },
      ],
    };
    const para = richTextToNodes(body)[0] as RenderParagraph;
    expect(para.lines[0]).toEqual([
      { text: "a", bold: true },
      { text: "b", italic: true },
      { text: "c", href: "https://example.com" },
      { text: "d", bold: true, italic: true },
    ]);
  });

  it("splits a paragraph into lines on a hard break", () => {
    const body: RichText = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "line one" },
            { type: "hardBreak" },
            { type: "text", text: "line two" },
          ],
        },
      ],
    };
    const para = richTextToNodes(body)[0] as RenderParagraph;
    expect(para.lines).toEqual([[{ text: "line one" }], [{ text: "line two" }]]);
  });

  it("maps a bullet list with one item per line", () => {
    const body: RichText = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "first" }] }],
            },
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "second" }] }],
            },
          ],
        },
      ],
    };
    const list = richTextToNodes(body)[0] as RenderList;
    expect(list.kind).toBe("list");
    expect(list.ordered).toBe(false);
    expect(list.start).toBe(1);
    expect(list.items).toEqual([
      { lines: [[{ text: "first" }]] },
      { lines: [[{ text: "second" }]] },
    ]);
  });

  it("honours an ordered list's explicit start index", () => {
    const body: RichText = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          attrs: { start: 3 },
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }],
            },
          ],
        },
      ],
    };
    const list = richTextToNodes(body)[0] as RenderList;
    expect(list.ordered).toBe(true);
    expect(list.start).toBe(3);
  });
});

describe("isLineEmpty", () => {
  it("is true for a line with no runs and false otherwise", () => {
    expect(isLineEmpty([])).toBe(true);
    expect(isLineEmpty([{ text: "" }])).toBe(true);
    expect(isLineEmpty([{ text: "x" }])).toBe(false);
  });
});
