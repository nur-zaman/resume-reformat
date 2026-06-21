import { describe, expect, it } from "vitest";
import { normalizeRichTextJson } from "./normalize";
import { RichTextSchema } from "@/lib/resume";

describe("normalizeRichTextJson", () => {
  it("strips a null contentId and drops the emptied attrs object", () => {
    const input = { type: "doc", content: [{ type: "paragraph", attrs: { contentId: null } }] };
    expect(normalizeRichTextJson(input)).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    });
  });

  it("keeps a real contentId and other attrs", () => {
    const input = {
      type: "doc",
      content: [
        { type: "paragraph", attrs: { contentId: "abc" } },
        { type: "orderedList", attrs: { contentId: null, start: 2 }, content: [] },
      ],
    };
    expect(normalizeRichTextJson(input)).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", attrs: { contentId: "abc" } },
        { type: "orderedList", attrs: { start: 2 }, content: [] },
      ],
    });
  });

  it("recurses into content and marks, stripping null attrs on a link mark", () => {
    const input = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { contentId: null },
          content: [
            {
              type: "text",
              text: "x",
              marks: [{ type: "link", attrs: { href: "https://x.com" } }],
            },
          ],
        },
      ],
    };
    const normalized = normalizeRichTextJson(input);
    // The normalized output must satisfy the strict canonical schema.
    expect(RichTextSchema.safeParse(normalized).success).toBe(true);
  });
});
