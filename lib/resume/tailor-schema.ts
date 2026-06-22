import { z } from "zod";

/**
 * The lean schema the AI model fills when TAILORING a base resume to a job description
 * (M5). Like the parse schema (`./parse-schema`), this is deliberately NOT the canonical
 * `ResumeDoc`: the model never mints ids, `schemaVersion`, `contentId`s, or review items.
 * It returns plain content plus per-unit proposal markers, and `assembleTailoredResult`
 * (see `./tailor-assemble`) deterministically builds the canonical `GenerationResult` —
 * minting every id, stamping a `contentId` on each proposed top-level node, and emitting a
 * matching pending `ReviewItem`.
 *
 * IMPORTANT — every field is REQUIRED (no `.optional()` / `.default()`), exactly as in the
 * parse schema: Gemini's constrained decoder SKIPS non-required fields. "Absent" is encoded
 * as "" / [] / false, and `.describe()` tells the model so.
 *
 * The HEADER is intentionally absent: identity (name, contacts, links) is pinned from the
 * base resume in assembly and is never AI-writable — the strongest possible guard against
 * fabrication or prompt injection from the (untrusted) job description. The model may only
 * propose a tailored `headline`.
 *
 * Proposal granularity is the top-level rich-text node, because only paragraph / bulletList
 * / orderedList nodes can carry a `contentId` (a `listItem` cannot). So summary and
 * custom-section paragraphs are proposable PER PARAGRAPH, while an experience/education
 * entry's bullets are ATOMIC — the whole bullet set is either clean (reworded facts) or a
 * single proposal anchored on the one bulletList node.
 */

/** Marks a single unit as a NEW/strengthened claim (a proposal) with a JD-tied reason. */
const AiProposable = z.object({
  proposed: z
    .boolean()
    .describe(
      "true ONLY if this unit adds a NEW claim/metric/credential or materially " +
        "strengthens one beyond the base resume. false for rewording, condensing, or " +
        "reordering of facts already present in the base resume.",
    ),
  reason: z
    .string()
    .describe(
      "When proposed=true: one sentence, tied to the job description, naming the added or " +
        'strengthened claim. Use "" when proposed=false.',
    ),
});

const AiTailorSummaryParagraph = AiProposable.extend({
  text: z.string().describe('One summary paragraph, plain text. "" to drop it.'),
});

const AiTailorExperience = z.object({
  organization: z.string().describe("Employer name — copy verbatim from the base resume."),
  location: z.string().describe('Location — copy verbatim; "" if absent.'),
  role: z.string().describe("Role/title — copy verbatim from the base resume."),
  startDate: z.string().describe("Start date — copy verbatim from the base resume."),
  endDate: z.string().describe("End date — copy verbatim from the base resume."),
  bullets: z
    .array(z.string())
    .describe("Tailored bullets, one plain string each; [] to omit the entry's bullets."),
  bulletsProposed: z
    .boolean()
    .describe(
      "true if the tailored bullets ADD or materially strengthen a claim/metric/credential " +
        "vs the base resume; false if only reworded, reordered, or condensed.",
    ),
  bulletsReason: z
    .string()
    .describe('Why proposed, tied to the JD. "" when bulletsProposed=false.'),
});

const AiTailorEducation = z.object({
  institution: z.string().describe("School/university — copy verbatim from the base resume."),
  location: z.string().describe('Location — copy verbatim; "" if absent.'),
  credential: z.string().describe("Degree/credential — copy verbatim from the base resume."),
  startDate: z.string().describe("Start date — copy verbatim from the base resume."),
  endDate: z.string().describe("End date — copy verbatim from the base resume."),
  details: z
    .array(z.string())
    .describe("Tailored details, one plain string each; [] to omit."),
  detailsProposed: z
    .boolean()
    .describe("true if details ADD or strengthen a claim vs the base resume; else false."),
  detailsReason: z
    .string()
    .describe('Why proposed, tied to the JD. "" when detailsProposed=false.'),
});

const AiTailorSkillCategory = z.object({
  label: z.string().describe('Category name (e.g. "Languages"); "" if uncategorised.'),
  items: z
    .array(z.string())
    .describe(
      "Skills for this category, REORDERED/SELECTED from the base resume only. Do NOT add " +
        "skills the candidate does not already list.",
    ),
});

const AiTailorCustomParagraph = AiProposable.extend({
  text: z.string().describe("One paragraph of an existing custom section."),
});

const AiTailorCustomSection = z.object({
  title: z.string().describe("Existing section heading, copied from the base resume."),
  paragraphs: z
    .array(AiTailorCustomParagraph)
    .describe("Paragraphs of this section, each with its own proposed flag."),
});

const AiTailorNewSection = z.object({
  title: z.string().describe("Heading for a brand-new section proposed for this job."),
  paragraphs: z.array(z.string()).describe("One plain string per paragraph."),
  reason: z
    .string()
    .describe("Why this new section helps for the job (tied to the JD)."),
});

export const AiTailorSchema = z.object({
  headline: z
    .string()
    .describe(
      "A tailored professional headline aligned to the job, or the base headline reworded. " +
        '"" to keep the base headline. Do NOT change name, contacts, or links — those are ' +
        "fixed identity facts and are ignored.",
    ),
  summary: z
    .array(AiTailorSummaryParagraph)
    .describe("Tailored summary paragraphs; [] for no summary."),
  skills: z
    .array(AiTailorSkillCategory)
    .describe("Tailored (reordered/selected) skill categories; [] if none."),
  experience: z
    .array(AiTailorExperience)
    .describe(
      "Every kept experience entry, reordered for relevance to the job; fixed facts " +
        "unchanged. Omit an entry by leaving it out.",
    ),
  education: z
    .array(AiTailorEducation)
    .describe("Every kept education entry; fixed facts unchanged."),
  customSections: z
    .array(AiTailorCustomSection)
    .describe("Existing non-standard sections carried through; [] if none."),
  proposedSections: z
    .array(AiTailorNewSection)
    .describe("Brand-new sections proposed for this job; [] if none."),
  inferredJob: z
    .object({
      title: z.string().describe('Job title inferred from the JD; "" if unclear.'),
      company: z.string().describe('Company inferred from the JD; "" if unclear.'),
    })
    .describe("Best-effort job metadata read from the (untrusted) job description."),
});

export type AiTailorOutput = z.infer<typeof AiTailorSchema>;
