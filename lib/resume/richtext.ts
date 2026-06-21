import { z } from "zod";
import { UuidSchema } from "./ids";

/**
 * Constrained ATS-safe rich-text schema (PRD §4, §7.1).
 *
 * The canonical rich text is ProseMirror/Tiptap JSON narrowed to a closed subset:
 * paragraphs, bullet/ordered lists, hard breaks, and the bold / italic / link marks.
 * Anything outside this subset — headings, tables, images, code blocks, colors,
 * underline, strike, custom attrs — FAILS validation rather than being silently
 * dropped. The editor's Tiptap instance is configured to emit exactly this shape, so
 * the schema and the editor are two ends of one contract.
 *
 * The node hierarchy is acyclic (doc → block → listItem → paragraph → inline), so it
 * is defined bottom-up without z.lazy. Nested lists are intentionally not allowed:
 * a listItem may only contain paragraphs.
 */

// ---------------------------------------------------------------------------
// URL scheme validation — shared by the link mark and the header `links` schema.
// ---------------------------------------------------------------------------

const ALLOWED_URL_PROTOCOLS = new Set(["https:", "http:", "mailto:", "tel:"]);

/**
 * True only for absolute URLs with an explicit, safe scheme. Rejects `javascript:`,
 * `data:`, relative, and scheme-less values. Web URLs require a host; mailto/tel
 * require a plausible address/number after the scheme.
 */
export function isAllowedUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false; // relative or malformed
  }
  if (!ALLOWED_URL_PROTOCOLS.has(url.protocol)) return false;

  switch (url.protocol) {
    case "http:":
    case "https:":
      return url.hostname.length > 0;
    case "mailto:": {
      // Everything after `mailto:` up to any `?` query is the address list.
      const address = decodeURIComponent(url.pathname.split("?")[0]);
      return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address);
    }
    case "tel:": {
      const number = decodeURIComponent(url.pathname);
      return /[0-9]/.test(number) && /^[+]?[0-9().\-\s]+$/.test(number);
    }
    default:
      return false;
  }
}

const HttpsUrl = z.string().refine(isAllowedUrl, {
  message: "URL must use an https:, http:, mailto:, or tel: scheme",
});

// ---------------------------------------------------------------------------
// Marks
// ---------------------------------------------------------------------------

const BoldMarkSchema = z.strictObject({ type: z.literal("bold") });
const ItalicMarkSchema = z.strictObject({ type: z.literal("italic") });
const LinkMarkSchema = z.strictObject({
  type: z.literal("link"),
  attrs: z.strictObject({ href: HttpsUrl }),
});

export const MarkSchema = z.discriminatedUnion("type", [
  BoldMarkSchema,
  ItalicMarkSchema,
  LinkMarkSchema,
]);

// ---------------------------------------------------------------------------
// Inline nodes
// ---------------------------------------------------------------------------

const TextNodeSchema = z.strictObject({
  type: z.literal("text"),
  text: z.string().min(1),
  marks: z.array(MarkSchema).optional(),
});

const HardBreakNodeSchema = z.strictObject({ type: z.literal("hardBreak") });

const InlineNodeSchema = z.discriminatedUnion("type", [
  TextNodeSchema,
  HardBreakNodeSchema,
]);

// ---------------------------------------------------------------------------
// Block nodes. Top-level blocks (direct children of `doc`) may carry a stable
// `contentId` so a ReviewItem can target them; it is minted on demand only for
// proposal-bearing nodes, never `null`.
// ---------------------------------------------------------------------------

const ParagraphNodeSchema = z.strictObject({
  type: z.literal("paragraph"),
  content: z.array(InlineNodeSchema).optional(),
  attrs: z.strictObject({ contentId: UuidSchema.optional() }).optional(),
});

const ListItemNodeSchema = z.strictObject({
  type: z.literal("listItem"),
  content: z.array(ParagraphNodeSchema).min(1),
});

const BulletListNodeSchema = z.strictObject({
  type: z.literal("bulletList"),
  content: z.array(ListItemNodeSchema).min(1),
  attrs: z.strictObject({ contentId: UuidSchema.optional() }).optional(),
});

const OrderedListNodeSchema = z.strictObject({
  type: z.literal("orderedList"),
  content: z.array(ListItemNodeSchema).min(1),
  attrs: z
    .strictObject({
      contentId: UuidSchema.optional(),
      start: z.number().int().positive().optional(),
    })
    .optional(),
});

const BlockNodeSchema = z.discriminatedUnion("type", [
  ParagraphNodeSchema,
  BulletListNodeSchema,
  OrderedListNodeSchema,
]);

/** A complete rich-text body. Empty body is `{ type: "doc", content: [] }`. */
export const RichTextSchema = z.strictObject({
  type: z.literal("doc"),
  content: z.array(BlockNodeSchema),
});

export type Mark = z.infer<typeof MarkSchema>;
export type InlineNode = z.infer<typeof InlineNodeSchema>;
export type BlockNode = z.infer<typeof BlockNodeSchema>;
export type RichText = z.infer<typeof RichTextSchema>;

/**
 * Collect the `contentId`s carried by the top-level block nodes of a rich-text body.
 * These are the anchors a ReviewItem.targetContentId may point at.
 */
export function collectContentIdsFromRichText(body: RichText): string[] {
  const ids: string[] = [];
  for (const node of body.content) {
    const contentId = node.attrs?.contentId;
    if (contentId) ids.push(contentId);
  }
  return ids;
}
