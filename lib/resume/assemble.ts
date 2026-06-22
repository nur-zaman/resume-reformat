import { newId } from "./ids";
import { CURRENT_SCHEMA_VERSION } from "./version";
import { isAllowedUrl } from "./richtext";
import {
  createContactItem,
  createEducationEntry,
  createExperienceEntry,
  createLink,
  createSkillCategory,
} from "./factory";
import {
  bulletsToRichText,
  cleanStrings,
  educationEntryHasContent,
  experienceEntryHasContent,
  isEmptyDoc,
  paragraphsToRichText,
} from "./richtext-build";
import type {
  Block,
  ContactItem,
  EducationEntry,
  ExperienceEntry,
  GenerationResult,
  Link,
  SkillCategory,
} from "./schema";
import type { AiParseOutput } from "./parse-schema";

/**
 * Deterministically build the canonical `GenerationResult` from the lean AI output
 * (M4, PRD §6.1). This is the second layer of the parse pipeline: the model fills
 * `AiParseSchema` with plain content, and this function mints every stable id (via the
 * factories / `newId`), constructs valid rich-text bodies, sanitises URLs, and drops
 * empty sections. The result is designed to pass `validateParseResult` — it carries NO
 * review items (parsing is transcription) and no `contentId`s (those are minted only for
 * proposal-bearing nodes).
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function assembleContact(
  input: AiParseOutput["header"]["contacts"][number],
): ContactItem {
  const value = input.value.trim();
  const label = (input.label ?? "").trim();
  // The canonical schema rejects a malformed email value; demote it to a `custom`
  // contact (preserving the text) rather than failing the whole parse.
  if (input.kind === "email" && value !== "" && !EMAIL_RE.test(value)) {
    const item = createContactItem("custom");
    return { ...item, value, label: label || "Email" };
  }
  const item = createContactItem(input.kind);
  return { ...item, value, label };
}

function assembleLinks(inputs: AiParseOutput["header"]["links"]): Link[] {
  return inputs
    .filter((l) => isAllowedUrl(l.href.trim()))
    .map((l) => createLink({ label: l.label.trim(), href: l.href.trim() }));
}

function assembleSkillCategories(
  inputs: AiParseOutput["skills"],
): SkillCategory[] {
  return inputs
    .map((c) => {
      const base = createSkillCategory();
      return { ...base, label: c.label.trim(), items: cleanStrings(c.items) };
    })
    .filter((c) => c.label !== "" || c.items.length > 0);
}

function assembleExperienceEntries(
  inputs: AiParseOutput["experience"],
): ExperienceEntry[] {
  return inputs
    .map((e) => {
      const base = createExperienceEntry();
      return {
        ...base,
        organization: e.organization.trim(),
        location: (e.location ?? "").trim(),
        role: (e.role ?? "").trim(),
        startDate: (e.startDate ?? "").trim(),
        endDate: (e.endDate ?? "").trim(),
        bullets: bulletsToRichText(e.bullets),
      };
    })
    .filter(experienceEntryHasContent);
}

function assembleEducationEntries(
  inputs: AiParseOutput["education"],
): EducationEntry[] {
  return inputs
    .map((e) => {
      const base = createEducationEntry();
      return {
        ...base,
        institution: e.institution.trim(),
        location: (e.location ?? "").trim(),
        credential: (e.credential ?? "").trim(),
        startDate: (e.startDate ?? "").trim(),
        endDate: (e.endDate ?? "").trim(),
        details: bulletsToRichText(e.details),
      };
    })
    .filter(educationEntryHasContent);
}

export function assembleResumeDoc(ai: AiParseOutput): GenerationResult {
  const blocks: Block[] = [
    {
      id: newId(),
      type: "header",
      name: ai.header.name.trim(),
      headline: (ai.header.headline ?? "").trim(),
      contact: ai.header.contacts.map(assembleContact),
      links: assembleLinks(ai.header.links),
    },
  ];

  const summaryBody = paragraphsToRichText(ai.summary);
  if (!isEmptyDoc(summaryBody)) {
    blocks.push({
      id: newId(),
      type: "summary",
      title: "Summary",
      visible: true,
      body: summaryBody,
    });
  }

  const categories = assembleSkillCategories(ai.skills);
  if (categories.length > 0) {
    blocks.push({
      id: newId(),
      type: "skills",
      title: "Skills",
      visible: true,
      categories,
    });
  }

  const experienceEntries = assembleExperienceEntries(ai.experience);
  if (experienceEntries.length > 0) {
    blocks.push({
      id: newId(),
      type: "experience",
      title: "Experience",
      visible: true,
      entries: experienceEntries,
    });
  }

  const educationEntries = assembleEducationEntries(ai.education);
  if (educationEntries.length > 0) {
    blocks.push({
      id: newId(),
      type: "education",
      title: "Education",
      visible: true,
      entries: educationEntries,
    });
  }

  for (const section of ai.customSections) {
    const body = paragraphsToRichText(section.paragraphs);
    const title = section.title.trim();
    if (title === "" && isEmptyDoc(body)) continue;
    blocks.push({
      id: newId(),
      type: "richtext",
      title: title || "Section",
      visible: true,
      body,
    });
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    resume: { schemaVersion: CURRENT_SCHEMA_VERSION, blocks },
    reviewItems: [],
    inferredJob: {},
  };
}
