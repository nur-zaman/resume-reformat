import { describe, expect, it, vi } from "vitest";
import { AiParseSchema, type AiParseOutput } from "./schema";
import {
  parseResume,
  type GenerateObjectFn,
  type ParseSource,
} from "./parse-resume";
import { AiError } from "@/lib/ai/errors";

const sample: AiParseOutput = AiParseSchema.parse({
  header: { name: "Sample", headline: "", contacts: [], links: [] },
  summary: [],
  skills: [],
  experience: [],
  education: [],
  customSections: [],
});

const textSource: ParseSource = { kind: "text", text: "resume text" };

function mockGenerate(impl: GenerateObjectFn) {
  return vi.fn(impl);
}

describe("parseResume", () => {
  it("succeeds on the first attempt", async () => {
    const generate = mockGenerate(async () => sample);
    const result = await parseResume(textSource, { generate });

    expect(result).toEqual({ ok: true, output: sample, attempts: 1 });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("does not attach a file for a text source", async () => {
    const generate = mockGenerate(async () => sample);
    await parseResume(textSource, { generate });

    expect(generate.mock.calls[0][0].file).toBeUndefined();
    expect(generate.mock.calls[0][0].prompt).toContain("resume text");
  });

  it("attaches the PDF as a file part for a pdf source", async () => {
    const generate = mockGenerate(async () => sample);
    const bytes = new Uint8Array([1, 2, 3]);
    const result = await parseResume(
      { kind: "pdf", bytes, filename: "cv.pdf" },
      { generate },
    );

    expect(result).toEqual({ ok: true, output: sample, attempts: 1 });
    const arg = generate.mock.calls[0][0];
    expect(arg.file).toEqual({
      bytes,
      mediaType: "application/pdf",
      filename: "cv.pdf",
    });
  });

  it("retries once on a validation failure, then succeeds", async () => {
    const generate = mockGenerate(
      vi
        .fn<GenerateObjectFn>()
        .mockRejectedValueOnce(new AiError("validation", "bad shape"))
        .mockResolvedValueOnce(sample),
    );
    const result = await parseResume(textSource, { generate });

    expect(result).toEqual({ ok: true, output: sample, attempts: 2 });
    expect(generate).toHaveBeenCalledTimes(2);
    // The retry prompt carries corrective feedback the first prompt did not.
    expect(generate.mock.calls[1][0].prompt).toContain(
      "did not match the required structure",
    );
    expect(generate.mock.calls[0][0].prompt).not.toContain(
      "did not match the required structure",
    );
  });

  it("re-sends the same file on the validation retry", async () => {
    const generate = mockGenerate(
      vi
        .fn<GenerateObjectFn>()
        .mockRejectedValueOnce(new AiError("validation", "bad shape"))
        .mockResolvedValueOnce(sample),
    );
    const bytes = new Uint8Array([9, 9]);
    await parseResume({ kind: "pdf", bytes, filename: "cv.pdf" }, { generate });

    expect(generate.mock.calls[1][0].file).toEqual({
      bytes,
      mediaType: "application/pdf",
      filename: "cv.pdf",
    });
  });

  it("returns a validation error after the single retry is exhausted", async () => {
    const generate = mockGenerate(async () => {
      throw new AiError("validation", "still bad");
    });
    const result = await parseResume(textSource, { generate });

    expect(result).toEqual({ ok: false, category: "validation", attempts: 2 });
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it.each(["quota", "auth", "network", "unknown"] as const)(
    "does not retry on a %s error",
    async (category) => {
      const generate = mockGenerate(async () => {
        throw new AiError(category, category);
      });
      const result = await parseResume(textSource, { generate });

      expect(result).toEqual({ ok: false, category, attempts: 1 });
      expect(generate).toHaveBeenCalledTimes(1);
    },
  );
});
