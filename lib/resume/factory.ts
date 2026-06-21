import { newId } from "./ids";
import { CURRENT_SCHEMA_VERSION } from "./version";
import type { RichText } from "./richtext";
import type {
  Block,
  BlockType,
  ContactItem,
  EducationEntry,
  ExperienceEntry,
  Link,
  ResumeDoc,
  ReviewItem,
  SkillCategory,
} from "./schema";

/**
 * Constructors that mint fresh stable ids. These are the only place (besides ids.ts)
 * that creates ids, so "what a valid new block/entry looks like" lives with the schema
 * rather than the editor. Every constructor returns a structurally valid value: empty
 * blocks and entries are legal (free-text fields may be ""), so the editor never opens
 * in an invalid state.
 */

export function emptyRichText(): RichText {
  return { type: "doc", content: [] };
}

export function createHeaderBlock(): Block {
  return {
    id: newId(),
    type: "header",
    name: "",
    headline: "",
    contact: [],
    links: [],
  };
}

export function createEmptyResumeDoc(): ResumeDoc {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, blocks: [createHeaderBlock()] };
}

const DEFAULT_TITLES: Record<Exclude<BlockType, "header">, string> = {
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  richtext: "Section",
};

export function createBlock(type: Exclude<BlockType, "header">): Block {
  const id = newId();
  const title = DEFAULT_TITLES[type];
  switch (type) {
    case "summary":
      return { id, type, title, visible: true, body: emptyRichText() };
    case "skills":
      return { id, type, title, visible: true, categories: [] };
    case "experience":
      return { id, type, title, visible: true, entries: [] };
    case "education":
      return { id, type, title, visible: true, entries: [] };
    case "richtext":
      return { id, type, title, visible: true, body: emptyRichText() };
  }
}

export function createExperienceEntry(): ExperienceEntry {
  return {
    id: newId(),
    organization: "",
    location: "",
    role: "",
    startDate: "",
    endDate: "",
    bullets: emptyRichText(),
  };
}

export function createEducationEntry(): EducationEntry {
  return {
    id: newId(),
    institution: "",
    location: "",
    credential: "",
    startDate: "",
    endDate: "",
    details: emptyRichText(),
  };
}

export function createSkillCategory(): SkillCategory {
  return { id: newId(), label: "", items: [] };
}

export function createContactItem(kind: ContactItem["kind"]): ContactItem {
  return { id: newId(), kind, value: "", label: "" };
}

/** Links are created with a real, scheme-validated href (the add-link flow commits both). */
export function createLink(init: { label: string; href: string }): Link {
  return { id: newId(), label: init.label, href: init.href };
}

export function createReviewItem(init: {
  targetContentId: string;
  reason: string;
  originalText?: string;
}): ReviewItem {
  return {
    id: newId(),
    targetContentId: init.targetContentId,
    kind: "ai_proposed_claim",
    reason: init.reason,
    status: "pending",
    originalText: init.originalText ?? "",
  };
}
