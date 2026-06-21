import { describe, expect, it } from "vitest";
import {
  BlockSchema,
  ContactItemSchema,
  LinkSchema,
  ResumeDocSchema,
  ReviewItemSchema,
} from "./schema";
import { createBlock, createEmptyResumeDoc } from "./factory";
import { newId } from "./ids";

describe("BlockSchema — per block", () => {
  it("accepts a minimal valid block of each type", () => {
    for (const type of ["summary", "skills", "experience", "education", "richtext"] as const) {
      expect(BlockSchema.safeParse(createBlock(type)).success).toBe(true);
    }
  });

  it("rejects a non-header block missing `visible`", () => {
    const { visible, ...rest } = createBlock("summary") as { visible: boolean };
    void visible;
    expect(BlockSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an unknown key on a block (strict)", () => {
    expect(BlockSchema.safeParse({ ...createBlock("summary"), extra: 1 }).success).toBe(false);
  });

  it("rejects a header that carries a `visible` field", () => {
    const header = createEmptyResumeDoc().blocks[0];
    expect(BlockSchema.safeParse({ ...header, visible: false }).success).toBe(false);
  });
});

describe("ContactItemSchema", () => {
  it("validates an email value only once entered", () => {
    expect(ContactItemSchema.safeParse({ id: newId(), kind: "email", value: "", label: "" }).success).toBe(true);
    expect(
      ContactItemSchema.safeParse({ id: newId(), kind: "email", value: "nur@manzil.ca", label: "" }).success,
    ).toBe(true);
    expect(
      ContactItemSchema.safeParse({ id: newId(), kind: "email", value: "not-an-email", label: "" }).success,
    ).toBe(false);
  });
});

describe("LinkSchema", () => {
  it("rejects a disallowed href scheme", () => {
    expect(LinkSchema.safeParse({ id: newId(), label: "x", href: "javascript:alert(1)" }).success).toBe(false);
  });

  it("accepts a mailto href", () => {
    expect(LinkSchema.safeParse({ id: newId(), label: "Email", href: "mailto:a@b.com" }).success).toBe(true);
  });
});

describe("ReviewItemSchema", () => {
  it("rejects an unknown status value", () => {
    expect(
      ReviewItemSchema.safeParse({
        id: newId(),
        targetContentId: "a",
        kind: "ai_proposed_claim",
        reason: "r",
        status: "maybe",
        originalText: "",
      }).success,
    ).toBe(false);
  });

  it("rejects a kind other than ai_proposed_claim", () => {
    expect(
      ReviewItemSchema.safeParse({
        id: newId(),
        targetContentId: "a",
        kind: "other",
        reason: "r",
        status: "pending",
        originalText: "",
      }).success,
    ).toBe(false);
  });
});

describe("ResumeDocSchema — invariants via superRefine", () => {
  it("rejects two header blocks", () => {
    const doc = createEmptyResumeDoc();
    doc.blocks.push({ ...doc.blocks[0], id: newId() });
    expect(ResumeDocSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects a non-header first block", () => {
    const doc = createEmptyResumeDoc();
    const header = doc.blocks[0];
    const reordered = { ...doc, blocks: [createBlock("summary"), header] };
    expect(ResumeDocSchema.safeParse(reordered).success).toBe(false);
  });

  it("rejects a foreign schemaVersion", () => {
    expect(ResumeDocSchema.safeParse({ schemaVersion: 99, blocks: [] }).success).toBe(false);
  });
});

describe("JSON round-trip stability", () => {
  it("parsing does not mutate a serialized document", () => {
    const doc = createEmptyResumeDoc();
    doc.blocks.push(createBlock("summary"), createBlock("experience"));
    const serialized = JSON.parse(JSON.stringify(doc));
    const result = ResumeDocSchema.safeParse(serialized);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(serialized);
  });
});
