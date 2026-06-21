import { describe, expect, it } from "vitest";
import {
  validateGenerationResult,
  validateParseResult,
  validateResumeDoc,
  validateWorkingDoc,
} from "./validate";
import { createEmptyResumeDoc, createReviewItem } from "./factory";
import { newId } from "./ids";
import { CURRENT_SCHEMA_VERSION } from "./version";
import type { ResumeDoc } from "./schema";

function docWithContentId(contentId: string): ResumeDoc {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    blocks: [
      createEmptyResumeDoc().blocks[0],
      {
        id: newId(),
        type: "summary",
        title: "Summary",
        visible: true,
        body: {
          type: "doc",
          content: [{ type: "paragraph", attrs: { contentId }, content: [{ type: "text", text: "x" }] }],
        },
      },
    ],
  };
}

describe("validateResumeDoc", () => {
  it("accepts a valid document", () => {
    expect(validateResumeDoc(createEmptyResumeDoc()).ok).toBe(true);
  });

  it("rejects garbage without throwing", () => {
    const result = validateResumeDoc({ nope: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.issues.length).toBeGreaterThan(0);
  });
});

describe("validateWorkingDoc", () => {
  it("accepts a resume with a pending item targeting existing content", () => {
    const cid = newId();
    const resume = docWithContentId(cid);
    const reviewItems = [createReviewItem({ targetContentId: cid, reason: "Adds a metric" })];
    expect(validateWorkingDoc({ resume, reviewItems }).ok).toBe(true);
  });

  it("rejects a working doc with an orphaned pending item", () => {
    const resume = docWithContentId(newId());
    const reviewItems = [createReviewItem({ targetContentId: "missing", reason: "r" })];
    expect(validateWorkingDoc({ resume, reviewItems }).ok).toBe(false);
  });
});

describe("validateGenerationResult", () => {
  it("accepts a valid envelope with a pending review item", () => {
    const cid = newId();
    const result = validateGenerationResult({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      resume: docWithContentId(cid),
      reviewItems: [createReviewItem({ targetContentId: cid, reason: "r" })],
      inferredJob: { title: "Engineer" },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown top-level key (strict)", () => {
    const result = validateGenerationResult({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      resume: createEmptyResumeDoc(),
      reviewItems: [],
      inferredJob: {},
      extra: 1,
    });
    expect(result.ok).toBe(false);
  });
});

describe("validateParseResult", () => {
  it("accepts an envelope with no review items", () => {
    expect(
      validateParseResult({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        resume: createEmptyResumeDoc(),
        reviewItems: [],
        inferredJob: {},
      }).ok,
    ).toBe(true);
  });

  it("rejects an envelope that carries review items", () => {
    const cid = newId();
    expect(
      validateParseResult({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        resume: docWithContentId(cid),
        reviewItems: [createReviewItem({ targetContentId: cid, reason: "r" })],
        inferredJob: {},
      }).ok,
    ).toBe(false);
  });
});
