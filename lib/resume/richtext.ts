import { z } from "zod";
import { UuidSchema } from "./ids";

const ALLOWED_URL_PROTOCOLS = new Set(["https:", "http:", "mailto:", "tel:"]);

// Explicit allowlist: rejects javascript:/data: and other unsafe or scheme-less values.
export function isAllowedUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (!ALLOWED_URL_PROTOCOLS.has(url.protocol)) return false;

  switch (url.protocol) {
    case "http:":
    case "https:":
      return url.hostname.length > 0;
    case "mailto:": {
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

export const RichTextSchema = z.strictObject({
  type: z.literal("doc"),
  content: z.array(BlockNodeSchema),
});

export type Mark = z.infer<typeof MarkSchema>;
export type InlineNode = z.infer<typeof InlineNodeSchema>;
export type BlockNode = z.infer<typeof BlockNodeSchema>;
export type RichText = z.infer<typeof RichTextSchema>;

export function collectContentIdsFromRichText(body: RichText): string[] {
  const ids: string[] = [];
  for (const node of body.content) {
    const contentId = node.attrs?.contentId;
    if (contentId) ids.push(contentId);
  }
  return ids;
}
