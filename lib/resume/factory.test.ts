import { describe, expect, it } from "vitest";
import {
  createBlock,
  createContactItem,
  createEducationEntry,
  createEmptyResumeDoc,
  createExperienceEntry,
  createReviewItem,
  createSkillCategory,
} from "./factory";
import {
  BlockSchema,
  ContactItemSchema,
  EducationEntrySchema,
  ExperienceEntrySchema,
  ResumeDocSchema,
  ReviewItemSchema,
  SkillCategorySchema,
  type BlockType,
} from "./schema";
import { CURRENT_SCHEMA_VERSION } from "./version";

describe("createEmptyResumeDoc", () => {
  it("produces a valid, header-first document", () => {
    const doc = createEmptyResumeDoc();
    const result = ResumeDocSchema.safeParse(doc);
    expect(result.success).toBe(true);
    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0].type).toBe("header");
    expect(doc.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});

describe("createBlock", () => {
  const types: Exclude<BlockType, "header">[] = [
    "summary",
    "skills",
    "experience",
    "education",
    "richtext",
  ];

  it.each(types)("creates a valid, visible %s block with a default title", (type) => {
    const block = createBlock(type);
    expect(BlockSchema.safeParse(block).success).toBe(true);
    expect(block.type).toBe(type);
    if (block.type !== "header") {
      expect(block.visible).toBe(true);
      expect(block.title.length).toBeGreaterThan(0);
    }
  });

  it("mints a distinct id on each call", () => {
    expect(createBlock("summary").id).not.toBe(createBlock("summary").id);
  });
});

describe("entry / category / contact factories", () => {
  it("creates a schema-valid experience entry", () => {
    expect(ExperienceEntrySchema.safeParse(createExperienceEntry()).success).toBe(true);
  });

  it("creates a schema-valid education entry", () => {
    expect(EducationEntrySchema.safeParse(createEducationEntry()).success).toBe(true);
  });

  it("creates a schema-valid skill category", () => {
    expect(SkillCategorySchema.safeParse(createSkillCategory()).success).toBe(true);
  });

  it("creates a schema-valid contact item with the requested kind", () => {
    const item = createContactItem("email");
    expect(item.kind).toBe("email");
    // value is "" -> the email-format check only fires once a value is entered.
    expect(ContactItemSchema.safeParse(item).success).toBe(true);
  });
});

describe("createReviewItem", () => {
  it("creates a pending item with no resolvedAt", () => {
    const item = createReviewItem({ targetContentId: "abc", reason: "Adds a metric" });
    expect(ReviewItemSchema.safeParse(item).success).toBe(true);
    expect(item.status).toBe("pending");
    expect(item.resolvedAt).toBeUndefined();
    expect(item.kind).toBe("ai_proposed_claim");
    expect(item.originalText).toBe("");
  });
});
