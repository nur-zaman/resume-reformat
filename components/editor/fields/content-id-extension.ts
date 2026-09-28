import { Extension } from "@tiptap/core";

// ProseMirror drops attrs a node type doesn't declare, so contentId must be a global
// attribute or it vanishes on the user's next edit.
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
