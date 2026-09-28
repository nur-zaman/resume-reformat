import { newId } from "@/lib/resume/ids";
import { CURRENT_SCHEMA_VERSION } from "@/lib/resume/version";
import { isAllowedUrl } from "@/lib/resume/richtext";
import {
  createContactItem,
  createEducationEntry,
  createExperienceEntry,
  createLink,
  createSkillCategory,
} from "@/lib/resume/factory";
import {
  bulletsToRichText,
  cleanStrings,
  educationEntryHasContent,
  experienceEntryHasContent,
  isEmptyDoc,
  paragraphsToRichText,
} from "@/lib/resume/richtext-build";
import type {
  Block,
  ContactItem,
  EducationEntry,
  ExperienceEntry,
  GenerationResult,
  Link,
  SkillCategory,
} from "@/lib/resume/schema";
import type { AiParseOutput } from "./schema";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function assembleContact(
  input: AiParseOutput["header"]["contacts"][number],
): ContactItem {
  const value = input.value.trim();
  const label = (input.label ?? "").trim();
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
