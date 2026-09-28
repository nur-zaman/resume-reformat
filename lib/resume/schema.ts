import { z } from "zod";
import { CURRENT_SCHEMA_VERSION } from "./version";
import { UuidSchema } from "./ids";
import { RichTextSchema, isAllowedUrl } from "./richtext";
import {
  resumeDocCrossChecks,
  reviewStateCrossChecks,
} from "./invariants";

// Null/empty discipline: text fields are required strings that may be ""; arrays are
// required and may be []. `ReviewItem.resolvedAt` is the only optional field, and
// `.nullable()` is never used — `null` is never a valid value.

const NonEmptyString = z.string().min(1);

const DisplayDate = z.string();

const UrlString = z.string().refine(isAllowedUrl, {
  message: "URL must use an https:, http:, mailto:, or tel: scheme",
});

export const ContactItemSchema = z
  .strictObject({
    id: UuidSchema,
    kind: z.enum(["email", "phone", "location", "custom"]),
    value: z.string(),
    label: z.string(),
  })
  .superRefine((item, ctx) => {
    // Only validated once a value is entered, so a freshly-added blank item isn't an error.
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

// The header has neither `title` nor `visible` — its absence structurally forbids
// hiding or renaming it, unlike every other block type.
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

export const ResumeDocSchema = z
  .strictObject({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    blocks: z.array(BlockSchema),
  })
  .superRefine(resumeDocCrossChecks);

export const ReviewItemSchema = z.strictObject({
  id: UuidSchema,
  targetContentId: NonEmptyString,
  kind: z.literal("ai_proposed_claim"),
  reason: NonEmptyString,
  status: z.enum(["pending", "accepted", "dismissed"]),
  originalText: z.string(),
  resolvedAt: z.iso.datetime().optional(),
});

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
