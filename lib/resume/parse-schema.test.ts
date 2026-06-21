import { describe, expect, it } from "vitest";
import { AiParseSchema } from "./parse-schema";

/** A complete, minimal-but-valid model output (every field present). */
const complete = {
  header: { name: "Jordan", headline: "", contacts: [], links: [] },
  summary: [],
  skills: [],
  experience: [],
  education: [],
  customSections: [],
};

describe("AiParseSchema", () => {
  it("parses a complete object", () => {
    const r = AiParseSchema.safeParse(complete);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.header.name).toBe("Jordan");
  });

  it("is required throughout — rejects a sparse object missing fields", () => {
    // The model MUST fill every field (Gemini's structured-output decoder skips
    // non-required fields, which is exactly what we are preventing here).
    expect(AiParseSchema.safeParse({ header: { name: "X" } }).success).toBe(false);
    expect(AiParseSchema.safeParse({}).success).toBe(false);
  });

  it("validates the contact kind enum", () => {
    const bad = {
      ...complete,
      header: {
        ...complete.header,
        contacts: [{ kind: "fax", value: "123", label: "" }],
      },
    };
    expect(AiParseSchema.safeParse(bad).success).toBe(false);
  });

  it("strips unknown keys (strictness lives on the assembled doc)", () => {
    const r = AiParseSchema.safeParse({ ...complete, somethingExtra: true });
    expect(r.success).toBe(true);
    if (r.success) expect("somethingExtra" in r.data).toBe(false);
  });
});
