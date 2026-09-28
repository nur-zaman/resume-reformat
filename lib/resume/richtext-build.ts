import { emptyRichText } from "./factory";
import type { RichText } from "./richtext";
import type { EducationEntry, ExperienceEntry } from "./schema";

type BlockNode = RichText["content"][number];
type ParagraphNode = Extract<BlockNode, { type: "paragraph" }>;

export function cleanStrings(values: readonly string[]): string[] {
  return values.map((v) => v.trim()).filter((v) => v.length > 0);
}

export function paragraphNode(text: string): ParagraphNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

export function paragraphsToRichText(values: readonly string[]): RichText {
  return { type: "doc", content: cleanStrings(values).map(paragraphNode) };
}

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

// Caller mints the contentId and must push the matching ReviewItem in lockstep.
export function proposedParagraph(text: string, contentId: string): ParagraphNode {
  return { type: "paragraph", attrs: { contentId }, content: [{ type: "text", text }] };
}

// Caller mints the contentId and must push the matching ReviewItem in lockstep.
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

function inlineText(node: ParagraphNode): string {
  return (node.content ?? [])
    .map((n) => (n.type === "text" ? n.text : " "))
    .join("")
    .trim();
}

export function richTextToPlainLines(body: RichText): string[] {
  const lines: string[] = [];
  for (const node of body.content) {
    if (node.type === "paragraph") {
      const text = inlineText(node);
      if (text !== "") lines.push(text);
    } else {
      for (const item of node.content) {
        const text = item.content.map(inlineText).filter(Boolean).join(" ");
        if (text !== "") lines.push(text);
      }
    }
  }
  return lines;
}

export function experienceEntryHasContent(e: ExperienceEntry): boolean {
  return (
    e.organization !== "" ||
    e.role !== "" ||
    e.location !== "" ||
    !isEmptyDoc(e.bullets)
  );
}

export function educationEntryHasContent(e: EducationEntry): boolean {
  return (
    e.institution !== "" ||
    e.credential !== "" ||
    e.location !== "" ||
    !isEmptyDoc(e.details)
  );
}
