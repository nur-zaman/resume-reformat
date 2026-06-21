import { describe, expect, it } from "vitest";
import { createEmptyResumeDoc } from "./factory";
import { deriveResumeTitle, DEFAULT_RESUME_TITLE } from "./title";
import type { ResumeDoc } from "./schema";

function docWithName(name: string): ResumeDoc {
  const doc = createEmptyResumeDoc();
  const header = doc.blocks[0];
  if (header.type === "header") header.name = name;
  return doc;
}

describe("deriveResumeTitle", () => {
  it("uses the header name when set", () => {
    expect(deriveResumeTitle(docWithName("Jane Doe"))).toBe("Jane Doe");
  });

  it("trims the header name", () => {
    expect(deriveResumeTitle(docWithName("  Jane Doe  "))).toBe("Jane Doe");
  });

  it("falls back to the default for an empty or whitespace name", () => {
    expect(deriveResumeTitle(docWithName(""))).toBe(DEFAULT_RESUME_TITLE);
    expect(deriveResumeTitle(docWithName("   "))).toBe(DEFAULT_RESUME_TITLE);
  });

  it("falls back to the default when there is no header block", () => {
    const doc = { schemaVersion: 1, blocks: [] } as unknown as ResumeDoc;
    expect(deriveResumeTitle(doc)).toBe(DEFAULT_RESUME_TITLE);
  });
});
