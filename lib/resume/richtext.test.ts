import { describe, expect, it } from "vitest";
import {
  RichTextSchema,
  collectContentIdsFromRichText,
  isAllowedUrl,
} from "./richtext";
import { newId } from "./ids";

describe("isAllowedUrl", () => {
  it.each([
    "https://github.com/nur",
    "http://example.com",
    "https://example.com/path?q=1#frag",
    "mailto:nur@manzil.ca",
    "tel:+14165551234",
    "tel:+1 416 555 1234",
  ])("accepts %s", (url) => {
    expect(isAllowedUrl(url)).toBe(true);
  });

  it.each([
    ["javascript:alert(1)", "javascript scheme"],
    ["data:text/html,x", "data scheme"],
    ["/relative/path", "relative path"],
    ["example.com", "scheme-less"],
    ["mailto:notanemail", "mailto without @"],
    ["tel:abcdef", "tel without digits"],
    ["", "empty"],
    ["ftp://example.com", "disallowed scheme"],
  ])("rejects %s (%s)", (url) => {
    expect(isAllowedUrl(url)).toBe(false);
  });
});

describe("RichTextSchema — allowed subset", () => {
  it("accepts paragraphs with bold, italic, link marks and hard breaks", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Led ", marks: [{ type: "bold" }] },
            { type: "text", text: "the ", marks: [{ type: "italic" }] },
            {
              type: "text",
              text: "team",
              marks: [{ type: "link", attrs: { href: "https://x.com" } }],
            },
            { type: "hardBreak" },
          ],
        },
      ],
    };
    expect(RichTextSchema.safeParse(doc).success).toBe(true);
  });

  it("accepts bullet and ordered lists with a top-level contentId", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          attrs: { contentId: newId() },
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "one" }] },
              ],
            },
          ],
        },
        {
          type: "orderedList",
          attrs: { start: 2 },
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "two" }] },
              ],
            },
          ],
        },
      ],
    };
    expect(RichTextSchema.safeParse(doc).success).toBe(true);
  });

  it("accepts an empty paragraph and an empty doc", () => {
    expect(
      RichTextSchema.safeParse({ type: "doc", content: [{ type: "paragraph" }] })
        .success,
    ).toBe(true);
    expect(RichTextSchema.safeParse({ type: "doc", content: [] }).success).toBe(
      true,
    );
  });
});

describe("RichTextSchema — forbidden content fails (never silently dropped)", () => {
  const wrap = (node: unknown) => ({ type: "doc", content: [node] });
  const wrapMark = (mark: unknown) =>
    wrap({ type: "paragraph", content: [{ type: "text", text: "x", marks: [mark] }] });

  it.each([
    ["heading", { type: "heading", attrs: { level: 1 }, content: [] }],
    ["image", { type: "image", attrs: { src: "https://x.com/a.png" } }],
    ["table", { type: "table", content: [] }],
    ["codeBlock", { type: "codeBlock", content: [] }],
    ["blockquote", { type: "blockquote", content: [] }],
    ["horizontalRule", { type: "horizontalRule" }],
  ])("rejects the %s node", (_label, node) => {
    expect(RichTextSchema.safeParse(wrap(node)).success).toBe(false);
  });

  it.each([
    ["underline", { type: "underline" }],
    ["strike", { type: "strike" }],
    ["textStyle", { type: "textStyle", attrs: { color: "red" } }],
    ["highlight", { type: "highlight" }],
    ["code", { type: "code" }],
    ["superscript", { type: "superscript" }],
  ])("rejects the %s mark", (_label, mark) => {
    expect(RichTextSchema.safeParse(wrapMark(mark)).success).toBe(false);
  });

  it("rejects a link mark with a disallowed scheme", () => {
    expect(
      RichTextSchema.safeParse(
        wrapMark({ type: "link", attrs: { href: "javascript:alert(1)" } }),
      ).success,
    ).toBe(false);
  });

  it("rejects a link mark carrying extra attrs (strict)", () => {
    expect(
      RichTextSchema.safeParse(
        wrapMark({
          type: "link",
          attrs: { href: "https://x.com", target: "_blank" },
        }),
      ).success,
    ).toBe(false);
  });

  it("rejects a null contentId (null discipline)", () => {
    expect(
      RichTextSchema.safeParse(wrap({ type: "paragraph", attrs: { contentId: null } }))
        .success,
    ).toBe(false);
  });

  it("rejects an empty text node", () => {
    expect(
      RichTextSchema.safeParse(
        wrap({ type: "paragraph", content: [{ type: "text", text: "" }] }),
      ).success,
    ).toBe(false);
  });

  it("rejects nested lists (a listItem may only contain paragraphs)", () => {
    const nested = wrap({
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "bulletList",
              content: [
                { type: "listItem", content: [{ type: "paragraph" }] },
              ],
            },
          ],
        },
      ],
    });
    expect(RichTextSchema.safeParse(nested).success).toBe(false);
  });

  it("rejects an unknown attr on a paragraph (strict)", () => {
    expect(
      RichTextSchema.safeParse(wrap({ type: "paragraph", attrs: { align: "center" } }))
        .success,
    ).toBe(false);
  });
});

describe("collectContentIdsFromRichText", () => {
  it("returns top-level contentIds in document order", () => {
    const a = newId();
    const b = newId();
    const body = {
      type: "doc" as const,
      content: [
        { type: "paragraph" as const, attrs: { contentId: a } },
        { type: "paragraph" as const, content: [{ type: "text" as const, text: "x" }] },
        {
          type: "bulletList" as const,
          attrs: { contentId: b },
          content: [
            {
              type: "listItem" as const,
              content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "y" }] }],
            },
          ],
        },
      ],
    };
    expect(collectContentIdsFromRichText(body)).toEqual([a, b]);
  });

  it("returns an empty array when no node carries a contentId", () => {
    expect(
      collectContentIdsFromRichText({ type: "doc", content: [{ type: "paragraph" }] }),
    ).toEqual([]);
  });
});
