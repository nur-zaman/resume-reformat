import {
  collectContentIds,
  createBlock,
  createContactItem,
  createEducationEntry,
  createExperienceEntry,
  createLink,
  createSkillCategory,
  type Block,
  type ResumeDoc,
  type ReviewItem,
  type RichText,
} from "@/lib/resume";
import type { EditorAction, MoveDirection, RichTextTarget } from "./actions";
import type { EditorState } from "./state";

/**
 * The pure editor reducer. It is the real guard for the schema invariants the editor
 * must uphold (disabled buttons are only affordances): the header stays a singleton at
 * index 0, reorders are clamped, new content comes from the schema factories, and
 * removing content that backs a pending review item dismisses that item in the SAME
 * transition (PRD §7.2) so no orphaned pending item can survive.
 */

type HeaderBlock = Extract<Block, { type: "header" }>;

const PATCHABLE_ENTRY_FIELDS = new Set([
  "organization",
  "location",
  "role",
  "institution",
  "credential",
  "startDate",
  "endDate",
]);

/** Apply a string-field patch, ignoring any non-allowlisted key (e.g. id, rich text). */
function applyEntryPatch<T extends object>(entry: T, patch: Record<string, string>): T {
  const next = { ...entry } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (PATCHABLE_ENTRY_FIELDS.has(key) && typeof next[key] === "string") {
      next[key] = value;
    }
  }
  return next as T;
}

// ---------------------------------------------------------------------------
// Immutable helpers
// ---------------------------------------------------------------------------

function moveInList<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) {
    return list;
  }
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function mapBlock(doc: ResumeDoc, blockId: string, fn: (block: Block) => Block): ResumeDoc {
  return { ...doc, blocks: doc.blocks.map((b) => (b.id === blockId ? fn(b) : b)) };
}

function updateHeader(doc: ResumeDoc, fn: (header: HeaderBlock) => HeaderBlock): ResumeDoc {
  return { ...doc, blocks: doc.blocks.map((b) => (b.type === "header" ? fn(b) : b)) };
}

function setRichTextBody(doc: ResumeDoc, target: RichTextTarget, body: RichText): ResumeDoc {
  return mapBlock(doc, target.blockId, (block) => {
    switch (target.kind) {
      case "summaryBody":
        return block.type === "summary" ? { ...block, body } : block;
      case "richtextBody":
        return block.type === "richtext" ? { ...block, body } : block;
      case "experienceBullets":
        return block.type === "experience"
          ? {
              ...block,
              entries: block.entries.map((e) =>
                e.id === target.entryId ? { ...e, bullets: body } : e,
              ),
            }
          : block;
      case "educationDetails":
        return block.type === "education"
          ? {
              ...block,
              entries: block.entries.map((e) =>
                e.id === target.entryId ? { ...e, details: body } : e,
              ),
            }
          : block;
    }
  });
}

/** Drop every top-level rich-text node carrying `contentId`, wherever it lives. */
function removeContentNode(doc: ResumeDoc, contentId: string): ResumeDoc {
  const prune = (body: RichText): RichText => ({
    ...body,
    content: body.content.filter((n) => n.attrs?.contentId !== contentId),
  });
  return {
    ...doc,
    blocks: doc.blocks.map((block) => {
      switch (block.type) {
        case "summary":
        case "richtext":
          return { ...block, body: prune(block.body) };
        case "experience":
          return { ...block, entries: block.entries.map((e) => ({ ...e, bullets: prune(e.bullets) })) };
        case "education":
          return { ...block, entries: block.entries.map((e) => ({ ...e, details: prune(e.details) })) };
        default:
          return block;
      }
    }),
  };
}

/** Dismiss pending review items whose target content no longer exists (PRD §7.2). */
function reconcileReviewItems(
  doc: ResumeDoc,
  reviewItems: ReviewItem[],
  now: string,
): ReviewItem[] {
  const known = new Set(collectContentIds(doc));
  let changed = false;
  const next = reviewItems.map((item) => {
    if (item.status === "pending" && !known.has(item.targetContentId)) {
      changed = true;
      return { ...item, status: "dismissed" as const, resolvedAt: now };
    }
    return item;
  });
  return changed ? next : reviewItems;
}

function moveBlock(doc: ResumeDoc, blockId: string, direction: MoveDirection): ResumeDoc {
  const index = doc.blocks.findIndex((b) => b.id === blockId);
  if (index < 0) return doc;
  if (doc.blocks[index].type === "header") return doc; // header is pinned first
  // Non-header blocks live at indexes >= 1; never let one occupy index 0.
  const to = direction === "up" ? index - 1 : index + 1;
  if (to < 1 || to > doc.blocks.length - 1) return doc;
  return { ...doc, blocks: moveInList(doc.blocks, index, to) };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "select":
      return { ...state, selectedBlockId: action.blockId };

    case "validation/result":
      return { ...state, validation: action.validation };

    case "block/add": {
      const block = createBlock(action.blockType);
      return {
        ...state,
        doc: { ...state.doc, blocks: [...state.doc.blocks, block] },
        selectedBlockId: block.id,
      };
    }

    case "block/delete": {
      const target = state.doc.blocks.find((b) => b.id === action.blockId);
      if (!target || target.type === "header") return state; // header cannot be deleted
      const doc = {
        ...state.doc,
        blocks: state.doc.blocks.filter((b) => b.id !== action.blockId),
      };
      return {
        ...state,
        doc,
        reviewItems: reconcileReviewItems(doc, state.reviewItems, action.now),
        selectedBlockId:
          state.selectedBlockId === action.blockId ? null : state.selectedBlockId,
      };
    }

    case "block/move":
      return { ...state, doc: moveBlock(state.doc, action.blockId, action.direction), selectedBlockId: action.blockId };

    case "block/rename":
      return {
        ...state,
        doc: mapBlock(state.doc, action.blockId, (b) =>
          b.type === "header" ? b : { ...b, title: action.title },
        ),
      };

    case "block/toggleVisible":
      return {
        ...state,
        doc: mapBlock(state.doc, action.blockId, (b) =>
          b.type === "header" ? b : { ...b, visible: !b.visible },
        ),
      };

    case "header/setField":
      return {
        ...state,
        doc: updateHeader(state.doc, (h) => ({ ...h, [action.field]: action.value })),
      };

    case "header/contact/add":
      return {
        ...state,
        doc: updateHeader(state.doc, (h) => ({
          ...h,
          contact: [...h.contact, createContactItem(action.kind)],
        })),
      };

    case "header/contact/update":
      return {
        ...state,
        doc: updateHeader(state.doc, (h) => ({
          ...h,
          contact: h.contact.map((c) =>
            c.id === action.contactId ? { ...c, ...action.patch } : c,
          ),
        })),
      };

    case "header/contact/remove":
      return {
        ...state,
        doc: updateHeader(state.doc, (h) => ({
          ...h,
          contact: h.contact.filter((c) => c.id !== action.contactId),
        })),
      };

    case "header/contact/move":
      return {
        ...state,
        doc: updateHeader(state.doc, (h) => {
          const i = h.contact.findIndex((c) => c.id === action.contactId);
          const to = action.direction === "up" ? i - 1 : i + 1;
          return { ...h, contact: moveInList(h.contact, i, to) };
        }),
      };

    case "header/link/add":
      return {
        ...state,
        doc: updateHeader(state.doc, (h) => ({
          ...h,
          links: [...h.links, createLink({ label: action.label, href: action.href })],
        })),
      };

    case "header/link/update":
      return {
        ...state,
        doc: updateHeader(state.doc, (h) => ({
          ...h,
          links: h.links.map((l) =>
            l.id === action.linkId ? { ...l, ...action.patch } : l,
          ),
        })),
      };

    case "header/link/remove":
      return {
        ...state,
        doc: updateHeader(state.doc, (h) => ({
          ...h,
          links: h.links.filter((l) => l.id !== action.linkId),
        })),
      };

    case "header/link/move":
      return {
        ...state,
        doc: updateHeader(state.doc, (h) => {
          const i = h.links.findIndex((l) => l.id === action.linkId);
          const to = action.direction === "up" ? i - 1 : i + 1;
          return { ...h, links: moveInList(h.links, i, to) };
        }),
      };

    case "skills/category/add":
      return {
        ...state,
        doc: mapBlock(state.doc, action.blockId, (b) =>
          b.type === "skills"
            ? { ...b, categories: [...b.categories, createSkillCategory()] }
            : b,
        ),
      };

    case "skills/category/update":
      return {
        ...state,
        doc: mapBlock(state.doc, action.blockId, (b) =>
          b.type === "skills"
            ? {
                ...b,
                categories: b.categories.map((c) =>
                  c.id === action.categoryId ? { ...c, ...action.patch } : c,
                ),
              }
            : b,
        ),
      };

    case "skills/category/remove":
      return {
        ...state,
        doc: mapBlock(state.doc, action.blockId, (b) =>
          b.type === "skills"
            ? { ...b, categories: b.categories.filter((c) => c.id !== action.categoryId) }
            : b,
        ),
      };

    case "skills/category/move":
      return {
        ...state,
        doc: mapBlock(state.doc, action.blockId, (b) => {
          if (b.type !== "skills") return b;
          const i = b.categories.findIndex((c) => c.id === action.categoryId);
          const to = action.direction === "up" ? i - 1 : i + 1;
          return { ...b, categories: moveInList(b.categories, i, to) };
        }),
      };

    case "skills/items/set":
      return {
        ...state,
        doc: mapBlock(state.doc, action.blockId, (b) =>
          b.type === "skills"
            ? {
                ...b,
                categories: b.categories.map((c) =>
                  c.id === action.categoryId ? { ...c, items: action.items } : c,
                ),
              }
            : b,
        ),
      };

    case "entry/add":
      return {
        ...state,
        doc: mapBlock(state.doc, action.blockId, (b) => {
          if (b.type === "experience") {
            return { ...b, entries: [...b.entries, createExperienceEntry()] };
          }
          if (b.type === "education") {
            return { ...b, entries: [...b.entries, createEducationEntry()] };
          }
          return b;
        }),
      };

    case "entry/update":
      return {
        ...state,
        doc: mapBlock(state.doc, action.blockId, (b) => {
          if (b.type === "experience") {
            return {
              ...b,
              entries: b.entries.map((e) =>
                e.id === action.entryId ? applyEntryPatch(e, action.patch) : e,
              ),
            };
          }
          if (b.type === "education") {
            return {
              ...b,
              entries: b.entries.map((e) =>
                e.id === action.entryId ? applyEntryPatch(e, action.patch) : e,
              ),
            };
          }
          return b;
        }),
      };

    case "entry/remove": {
      const doc = mapBlock(state.doc, action.blockId, (b) => {
        if (b.type === "experience") {
          return { ...b, entries: b.entries.filter((e) => e.id !== action.entryId) };
        }
        if (b.type === "education") {
          return { ...b, entries: b.entries.filter((e) => e.id !== action.entryId) };
        }
        return b;
      });
      return {
        ...state,
        doc,
        reviewItems: reconcileReviewItems(doc, state.reviewItems, action.now),
      };
    }

    case "entry/move":
      return {
        ...state,
        doc: mapBlock(state.doc, action.blockId, (b) => {
          if (b.type === "experience") {
            const i = b.entries.findIndex((e) => e.id === action.entryId);
            const to = action.direction === "up" ? i - 1 : i + 1;
            return { ...b, entries: moveInList(b.entries, i, to) };
          }
          if (b.type === "education") {
            const i = b.entries.findIndex((e) => e.id === action.entryId);
            const to = action.direction === "up" ? i - 1 : i + 1;
            return { ...b, entries: moveInList(b.entries, i, to) };
          }
          return b;
        }),
      };

    case "richtext/set": {
      const doc = setRichTextBody(state.doc, action.target, action.body);
      return {
        ...state,
        doc,
        reviewItems: reconcileReviewItems(doc, state.reviewItems, action.now),
      };
    }

    case "review/resolve": {
      const item = state.reviewItems.find((r) => r.id === action.reviewItemId);
      if (!item) return state;

      if (action.resolution === "accept") {
        return {
          ...state,
          reviewItems: state.reviewItems.map((r) =>
            r.id === action.reviewItemId
              ? { ...r, status: "accepted", resolvedAt: action.now }
              : r,
          ),
        };
      }

      // dismiss = remove the proposed content and mark the item dismissed.
      const doc = removeContentNode(state.doc, item.targetContentId);
      const dismissed = state.reviewItems.map((r) =>
        r.id === action.reviewItemId
          ? { ...r, status: "dismissed" as const, resolvedAt: action.now }
          : r,
      );
      return {
        ...state,
        doc,
        reviewItems: reconcileReviewItems(doc, dismissed, action.now),
      };
    }
  }
}
