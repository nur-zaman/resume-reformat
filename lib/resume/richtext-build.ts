import { emptyRichText } from "./factory";
import type { RichText } from "./richtext";
import type { EducationEntry, ExperienceEntry } from "./schema";

/**
 * Deterministic rich-text construction helpers shared by the parse (`assemble.ts`) and
 * tailor (`tailor-assemble.ts`) pipelines. These turn plain AI strings into valid
 * `RichText` bodies; the `proposed*` variants additionally stamp a stable `contentId` on
 * the single top-level node so a `ReviewItem` can target it. Isomorphic (no `server-only`,
 * no id minting — callers pass any contentId), so this stays importable from the barrel.
 */

type BlockNode = RichText["content"][number];
type ParagraphNode = Extract<BlockNode, { type: "paragraph" }>;

/** Trim and keep only strings with visible content. */
export function cleanStrings(values: readonly string[]): string[] {
  return values.map((v) => v.trim()).filter((v) => v.length > 0);
}

export function paragraphNode(text: string): ParagraphNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

/** A doc of one paragraph per non-empty string (empty doc if none). */
export function paragraphsToRichText(values: readonly string[]): RichText {
  return { type: "doc", content: cleanStrings(values).map(paragraphNode) };
}

/**
 * A doc with a single bulletList, one listItem (→ paragraph → text) per non-empty
 * string. Falls back to an empty doc when nothing remains, since `bulletList` requires
 * at least one item.
 */
export function bulletsToRichText(values: readonly string[]): RichText {
  const items = cleanStrings(values);
  if (items.length === 0) return emptyRichText();
  return {
    type: "doc",
    content: [
      {
        type: "bulletList",
        content: items.map((text) => ({
          type: "listItem",
          content: [paragraphNode(text)],
        })),
      },
    ],
  };
}

export function isEmptyDoc(body: RichText): boolean {
  return body.content.length === 0;
}

/**
 * A paragraph node carrying a stable `contentId` (a proposal anchor). The caller mints the
 * id and is responsible for pushing the matching `ReviewItem` in lockstep.
 */
export function proposedParagraph(text: string, contentId: string): ParagraphNode {
  return { type: "paragraph", attrs: { contentId }, content: [{ type: "text", text }] };
}

/**
 * A single bulletList whose node carries a `contentId` (a proposal anchor). Returns an
 * empty doc when nothing remains. The caller mints the id and pushes the matching
 * `ReviewItem` in lockstep.
 */
export function proposedBulletList(
  values: readonly string[],
  contentId: string,
): RichText {
  const items = cleanStrings(values);
  if (items.length === 0) return emptyRichText();
  return {
    type: "doc",
    content: [
      {
        type: "bulletList",
        attrs: { contentId },
        content: items.map((text) => ({
          type: "listItem",
          content: [paragraphNode(text)],
        })),
      },
    ],
  };
}

/** Flatten one top-level node's inline text (joining hard breaks as spaces). */
function inlineText(node: ParagraphNode): string {
  return (node.content ?? [])
    .map((n) => (n.type === "text" ? n.text : " "))
    .join("")
    .trim();
}

/**
 * Extract a rich-text body back to plain lines: one string per paragraph and one per list
 * item. The inverse of `paragraphsToRichText` / `bulletsToRichText`, used to serialise the
 * base resume for the model and to capture a proposal's "before" text. Empty lines dropped.
 */
export function richTextToPlainLines(body: RichText): string[] {
  const lines: string[] = [];
  for (const node of body.content) {
    if (node.type === "paragraph") {
      const text = inlineText(node);
      if (text !== "") lines.push(text);
    } else {
      // bulletList | orderedList → one line per listItem (its paragraphs joined).
      for (const item of node.content) {
        const text = item.content.map(inlineText).filter(Boolean).join(" ");
        if (text !== "") lines.push(text);
      }
    }
  }
  return lines;
}

/** An experience entry is worth keeping when any field or its bullets carry content. */
export function experienceEntryHasContent(e: ExperienceEntry): boolean {
  return (
    e.organization !== "" ||
    e.role !== "" ||
    e.location !== "" ||
    !isEmptyDoc(e.bullets)
  );
}

/** An education entry is worth keeping when any field or its details carry content. */
export function educationEntryHasContent(e: EducationEntry): boolean {
  return (
    e.institution !== "" ||
    e.credential !== "" ||
    e.location !== "" ||
    !isEmptyDoc(e.details)
  );
}
