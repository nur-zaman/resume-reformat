import { z } from "zod";
import { CURRENT_SCHEMA_VERSION } from "./version";
import { UuidSchema } from "./ids";
import { RichTextSchema, isAllowedUrl } from "./richtext";
import {
  resumeDocCrossChecks,
  reviewStateCrossChecks,
} from "./invariants";

/**
 * The canonical resume document and its companion contracts (PRD §7).
 *
 * Shared boundary schemas for the editor, AI endpoints, and persistence. Every object
 * is a `z.strictObject`, so unknown keys are rejected and never silently persisted.
 *
 * null / empty discipline (PRD §7.1): `visible` is always a present boolean on
 * non-header blocks; optional text fields are required strings that may be ""; optional
 * arrays are required and may be []. The ONLY `.optional()` data field is
 * `ReviewItem.resolvedAt`. `.nullable()` is used nowhere — `null` is never a valid value.
 */

// ---------------------------------------------------------------------------
// Shared leaves
// ---------------------------------------------------------------------------

const NonEmptyString = z.string().min(1);

/** A display date such as "2023", "May 2023", or "Present"; may be "". */
const DisplayDate = z.string();

const UrlString = z.string().refine(isAllowedUrl, {
  message: "URL must use an https:, http:, mailto:, or tel: scheme",
});

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

/**
 * A typed contact detail. `kind` drives rendering (email → mailto:, phone → tel:);
 * `label` names a `custom` item and is "" otherwise. Profile/web URLs live in `links`.
 */
export const ContactItemSchema = z
  .strictObject({
    id: UuidSchema,
    kind: z.enum(["email", "phone", "location", "custom"]),
    value: z.string(),
    label: z.string(),
  })
  .superRefine((item, ctx) => {
    // Validate the address shape only once the user has entered something, so a
    // freshly-added blank contact item is not reported as an error.
    if (
      item.kind === "email" &&
      item.value !== "" &&
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(item.value)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Email contact value must be a valid email address",
        path: ["value"],
      });
    }
  });

export const LinkSchema = z.strictObject({
  id: UuidSchema,
  label: z.string(),
  href: UrlString,
});

const HeaderBlockSchema = z.strictObject({
  id: UuidSchema,
  type: z.literal("header"),
  name: z.string(),
  headline: z.string(),
  contact: z.array(ContactItemSchema),
  links: z.array(LinkSchema),
});

// ---------------------------------------------------------------------------
// Content blocks. All carry `title` + `visible`; the header has neither a `title`
// nor a `visible` field — its absence structurally forbids hiding or renaming it.
// ---------------------------------------------------------------------------

const SummaryBlockSchema = z.strictObject({
  id: UuidSchema,
  type: z.literal("summary"),
  title: NonEmptyString,
  visible: z.boolean(),
  body: RichTextSchema,
});

export const SkillCategorySchema = z.strictObject({
  id: UuidSchema,
  label: z.string(),
  items: z.array(z.string()),
});

const SkillsBlockSchema = z.strictObject({
  id: UuidSchema,
  type: z.literal("skills"),
  title: NonEmptyString,
  visible: z.boolean(),
  categories: z.array(SkillCategorySchema),
});

export const ExperienceEntrySchema = z.strictObject({
  id: UuidSchema,
  organization: z.string(),
  location: z.string(),
  role: z.string(),
  startDate: DisplayDate,
  endDate: DisplayDate,
  bullets: RichTextSchema,
});

const ExperienceBlockSchema = z.strictObject({
  id: UuidSchema,
  type: z.literal("experience"),
  title: NonEmptyString,
  visible: z.boolean(),
  entries: z.array(ExperienceEntrySchema),
});

export const EducationEntrySchema = z.strictObject({
  id: UuidSchema,
  institution: z.string(),
  location: z.string(),
  credential: z.string(),
  startDate: DisplayDate,
  endDate: DisplayDate,
  details: RichTextSchema,
});

const EducationBlockSchema = z.strictObject({
  id: UuidSchema,
  type: z.literal("education"),
  title: NonEmptyString,
  visible: z.boolean(),
  entries: z.array(EducationEntrySchema),
});

const RichTextBlockSchema = z.strictObject({
  id: UuidSchema,
  type: z.literal("richtext"),
  title: NonEmptyString,
  visible: z.boolean(),
  body: RichTextSchema,
});

export const BlockSchema = z.discriminatedUnion("type", [
  HeaderBlockSchema,
  SummaryBlockSchema,
  SkillsBlockSchema,
  ExperienceBlockSchema,
  EducationBlockSchema,
  RichTextBlockSchema,
]);

// ---------------------------------------------------------------------------
// ResumeDoc
// ---------------------------------------------------------------------------

export const ResumeDocSchema = z
  .strictObject({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    blocks: z.array(BlockSchema),
  })
  .superRefine(resumeDocCrossChecks);

// ---------------------------------------------------------------------------
// Review items + AI response envelope
// ---------------------------------------------------------------------------

export const ReviewItemSchema = z.strictObject({
  id: UuidSchema,
  targetContentId: NonEmptyString,
  kind: z.literal("ai_proposed_claim"),
  reason: NonEmptyString,
  status: z.enum(["pending", "accepted", "dismissed"]),
  originalText: z.string(),
  resolvedAt: z.iso.datetime().optional(),
});

/**
 * A resume plus its review items — the editor's working state and the persisted
 * working copy. Cross-checks ensure no pending review item is orphaned and that
 * status / resolvedAt stay coherent.
 */
export const WorkingDocSchema = z
  .strictObject({
    resume: ResumeDocSchema,
    reviewItems: z.array(ReviewItemSchema),
  })
  .superRefine((value, ctx) =>
    reviewStateCrossChecks(value.resume, value.reviewItems, ctx),
  );

export const GenerationResultSchema = z
  .strictObject({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    resume: ResumeDocSchema,
    reviewItems: z.array(ReviewItemSchema),
    inferredJob: z.strictObject({
      title: z.string().optional(),
      company: z.string().optional(),
    }),
  })
  .superRefine((value, ctx) =>
    reviewStateCrossChecks(value.resume, value.reviewItems, ctx),
  );

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type ContactItem = z.infer<typeof ContactItemSchema>;
export type Link = z.infer<typeof LinkSchema>;
export type SkillCategory = z.infer<typeof SkillCategorySchema>;
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>;
export type EducationEntry = z.infer<typeof EducationEntrySchema>;
export type Block = z.infer<typeof BlockSchema>;
export type BlockType = Block["type"];
export type ResumeDoc = z.infer<typeof ResumeDocSchema>;
export type ReviewItem = z.infer<typeof ReviewItemSchema>;
export type ReviewStatus = ReviewItem["status"];
export type WorkingDoc = z.infer<typeof WorkingDocSchema>;
export type GenerationResult = z.infer<typeof GenerationResultSchema>;
