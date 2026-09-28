import { z } from "zod";

// Every field is REQUIRED (no .optional()/.default()) - Gemini's structured-output decoder
// skips non-required fields, which previously returned empty arrays for every section.
const AiContact = z.object({
  kind: z
    .enum(["email", "phone", "location", "custom"])
    .describe("The kind of contact detail."),
  value: z.string().describe("The contact value exactly as written."),
  label: z
    .string()
    .describe('Label for a "custom" contact (e.g. "Portfolio"); "" for typed kinds.'),
});

const AiLink = z.object({
  label: z.string().describe('Link text (e.g. "GitHub"); "" if none.'),
  // Validated and sanitised at assemble time via `isAllowedUrl`, not here.
  href: z.string().describe("The URL."),
});

const AiHeader = z.object({
  name: z.string().describe("The person's full name."),
  headline: z
    .string()
    .describe('Professional headline/title under the name; "" if none.'),
  contacts: z
    .array(AiContact)
    .describe("Every contact detail (email, phone, location, etc.); [] if none."),
  links: z
    .array(AiLink)
    .describe("Profile/portfolio URLs from the header; [] if none."),
});

const AiSkillCategory = z.object({
  label: z.string().describe('Category name (e.g. "Languages"); "" if uncategorised.'),
  items: z.array(z.string()).describe("The skills in this category."),
});

const AiExperience = z.object({
  organization: z.string().describe("Employer / company name."),
  location: z.string().describe('Location; "" if not stated.'),
  role: z.string().describe('Job title / role; "" if not stated.'),
  startDate: z.string().describe('Start date exactly as written; "" if not stated.'),
  endDate: z
    .string()
    .describe('End date exactly as written (e.g. "Present"); "" if not stated.'),
  bullets: z
    .array(z.string())
    .describe("One plain-text entry per bullet/achievement; [] if none."),
});

const AiEducation = z.object({
  institution: z.string().describe("School / university name."),
  location: z.string().describe('Location; "" if not stated.'),
  credential: z.string().describe('Degree / credential; "" if not stated.'),
  startDate: z.string().describe('Start date exactly as written; "" if not stated.'),
  endDate: z.string().describe('End date exactly as written; "" if not stated.'),
  details: z.array(z.string()).describe("One plain-text entry per detail; [] if none."),
});

const AiCustomSection = z.object({
  title: z.string().describe("Section heading."),
  paragraphs: z
    .array(z.string())
    .describe("One plain-text entry per paragraph/line in the section."),
});

export const AiParseSchema = z.object({
  header: AiHeader.describe("The resume header: name, headline, contacts, links."),
  summary: z
    .array(z.string())
    .describe("Summary / objective paragraphs; [] if there is no summary."),
  skills: z.array(AiSkillCategory).describe("Skill categories; [] if none."),
  experience: z
    .array(AiExperience)
    .describe("Every work-experience entry, most recent first; [] if none."),
  education: z.array(AiEducation).describe("Every education entry; [] if none."),
  customSections: z
    .array(AiCustomSection)
    .describe(
      "Any section that does not fit the fields above (projects, awards, etc.); [] if none.",
    ),
});

export type AiParseOutput = z.infer<typeof AiParseSchema>;
