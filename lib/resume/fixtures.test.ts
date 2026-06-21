import { describe, expect, it } from "vitest";
import { ResumeDocSchema } from "./schema";
import {
  validateGenerationResult,
  validateParseResult,
  validateResumeDoc,
  validateWorkingDoc,
} from "./validate";
import { emptyResume } from "./fixtures/empty-resume";
import { proposedContentId, realisticResume } from "./fixtures/realistic-resume";
import { sampleGenerationResult } from "./fixtures/generation-result";
import { collectContentIds } from "./invariants";
import * as invalid from "./fixtures/invalid";

describe("valid fixtures", () => {
  it("realisticResume validates", () => {
    expect(validateResumeDoc(realisticResume).ok).toBe(true);
  });

  it("emptyResume validates", () => {
    expect(validateResumeDoc(emptyResume).ok).toBe(true);
  });

  it("sampleGenerationResult validates with no orphaned review items", () => {
    expect(validateGenerationResult(sampleGenerationResult).ok).toBe(true);
  });

  it("the sample review item targets real content in the resume", () => {
    expect(collectContentIds(realisticResume)).toContain(proposedContentId);
  });

  it("realisticResume survives a JSON round-trip unchanged", () => {
    const serialized = JSON.parse(JSON.stringify(realisticResume));
    const result = ResumeDocSchema.safeParse(serialized);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(serialized);
  });
});

describe("invalid fixtures are rejected", () => {
  it.each([
    ["twoHeaders", invalid.twoHeaders],
    ["headerNotFirst", invalid.headerNotFirst],
    ["duplicateId", invalid.duplicateId],
    ["unsupportedMark", invalid.unsupportedMark],
    ["unsupportedNode", invalid.unsupportedNode],
    ["badUrlScheme", invalid.badUrlScheme],
    ["nullVsEmpty", invalid.nullVsEmpty],
  ])("validateResumeDoc rejects %s", (_label, fixture) => {
    expect(validateResumeDoc(fixture).ok).toBe(false);
  });

  it("validateGenerationResult rejects an orphaned pending review item", () => {
    expect(validateGenerationResult(invalid.orphanReviewItem).ok).toBe(false);
  });

  it("validateWorkingDoc rejects an orphaned pending review item", () => {
    // The orphan fixture is envelope-shaped; a working doc is { resume, reviewItems }.
    const { resume, reviewItems } = invalid.orphanReviewItem as {
      resume: unknown;
      reviewItems: unknown;
    };
    expect(validateWorkingDoc({ resume, reviewItems }).ok).toBe(false);
  });

  it("validateParseResult rejects an envelope carrying review items", () => {
    expect(validateParseResult(invalid.parseWithReviewItems).ok).toBe(false);
  });
});
