import { Extension } from "@tiptap/core";

/**
 * Adds a stable `contentId` attribute to the top-level block nodes that can carry an
 * AI proposal (paragraph, bulletList, orderedList). Declaring it as a global attribute
 * is what lets the id survive edits: ProseMirror drops attrs a node type doesn't
 * declare, so without this the contentId would vanish the moment the user typed.
 *
 * Tiptap fills `default: null` for nodes without one; the editor normalizes those nulls
 * away on emit (see lib/editor/normalize.ts) so the canonical JSON stays null-free.
 */
export const ContentId = Extension.create({
  name: "contentId",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "bulletList", "orderedList"],
        attributes: {
          contentId: {
            default: null,
            keepOnSplit: false,
            parseHTML: (element) => element.getAttribute("data-content-id"),
            renderHTML: (attributes) =>
              attributes.contentId
                ? { "data-content-id": attributes.contentId as string }
                : {},
          },
        },
      },
    ];
  },
});
