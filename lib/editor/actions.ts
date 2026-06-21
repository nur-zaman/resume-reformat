import type {
  BlockType,
  ContactItem,
  Link,
  RichText,
  SkillCategory,
} from "@/lib/resume";
import type { ValidationState } from "./state";

/**
 * Editor actions. Actions that can orphan a pending review item by removing content
 * (block/entry delete, rich-text replacement, proposal dismissal) carry `now` (an ISO
 * timestamp the UI supplies) so the reducer can stamp `resolvedAt` on cascaded
 * dismissals while staying pure and deterministic.
 */

export type MoveDirection = "up" | "down";

export type RichTextTarget =
  | { kind: "summaryBody"; blockId: string }
  | { kind: "richtextBody"; blockId: string }
  | { kind: "experienceBullets"; blockId: string; entryId: string }
  | { kind: "educationDetails"; blockId: string; entryId: string };

export type EditorAction =
  // selection + validation
  | { type: "select"; blockId: string | null }
  | { type: "validation/result"; validation: ValidationState }
  // blocks
  | { type: "block/add"; blockType: Exclude<BlockType, "header"> }
  | { type: "block/delete"; blockId: string; now: string }
  | { type: "block/move"; blockId: string; direction: MoveDirection }
  | { type: "block/rename"; blockId: string; title: string }
  | { type: "block/toggleVisible"; blockId: string }
  // header
  | { type: "header/setField"; field: "name" | "headline"; value: string }
  | { type: "header/contact/add"; kind: ContactItem["kind"] }
  | {
      type: "header/contact/update";
      contactId: string;
      patch: Partial<Pick<ContactItem, "kind" | "value" | "label">>;
    }
  | { type: "header/contact/remove"; contactId: string }
  | { type: "header/contact/move"; contactId: string; direction: MoveDirection }
  | { type: "header/link/add"; label: string; href: string }
  | {
      type: "header/link/update";
      linkId: string;
      patch: Partial<Pick<Link, "label" | "href">>;
    }
  | { type: "header/link/remove"; linkId: string }
  | { type: "header/link/move"; linkId: string; direction: MoveDirection }
  // skills
  | { type: "skills/category/add"; blockId: string }
  | {
      type: "skills/category/update";
      blockId: string;
      categoryId: string;
      patch: Partial<Pick<SkillCategory, "label">>;
    }
  | { type: "skills/category/remove"; blockId: string; categoryId: string }
  | {
      type: "skills/category/move";
      blockId: string;
      categoryId: string;
      direction: MoveDirection;
    }
  | { type: "skills/items/set"; blockId: string; categoryId: string; items: string[] }
  // experience / education entries
  | { type: "entry/add"; blockId: string }
  | {
      type: "entry/update";
      blockId: string;
      entryId: string;
      patch: Record<string, string>;
    }
  | { type: "entry/remove"; blockId: string; entryId: string; now: string }
  | { type: "entry/move"; blockId: string; entryId: string; direction: MoveDirection }
  // rich text
  | { type: "richtext/set"; target: RichTextTarget; body: RichText; now: string }
  // review queue
  | {
      type: "review/resolve";
      reviewItemId: string;
      resolution: "accept" | "dismiss";
      now: string;
    };
