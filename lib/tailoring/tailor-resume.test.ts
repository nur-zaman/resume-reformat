import { describe, expect, it, vi } from "vitest";
import { AiTailorSchema, type AiTailorOutput } from "./schema";
import { createEmptyResumeDoc } from "@/lib/resume/factory";
import {
  tailorResume,
  type GenerateTailorFn,
  type TailorInput,
} from "./tailor-resume";
import { AiError } from "@/lib/ai/errors";

const sample: AiTailorOutput = AiTailorSchema.parse({
  headline: "",
  summary: [],
  skills: [],
  experience: [],
  education: [],
  customSections: [],
  proposedSections: [],
  inferredJob: { title: "", company: "" },
});

const input: TailorInput = {
  baseResume: createEmptyResumeDoc(),
  jobDescription: "We need a backend engineer who cares about latency.",
};

function mockGenerate(impl: GenerateTailorFn) {
  return vi.fn(impl);
}

describe("tailorResume", () => {
  it("succeeds on the first attempt", async () => {
    const generate = mockGenerate(async () => sample);
    const result = await tailorResume(input, { generate });

    expect(result).toEqual({ ok: true, output: sample, attempts: 1 });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("fences the job description into the prompt as untrusted data", async () => {
    const generate = mockGenerate(async () => sample);
    await tailorResume(input, { generate });

    const arg = generate.mock.calls[0][0];
    expect(arg.prompt).toContain("backend engineer who cares about latency");
    expect(arg.prompt).toContain("<<<JOB_DESCRIPTION>>>");
    expect(arg.system).toContain("untrusted");
  });

  it("retries once on a validation failure, then succeeds", async () => {
    const generate = mockGenerate(
      vi
        .fn<GenerateTailorFn>()
        .mockRejectedValueOnce(new AiError("validation", "bad shape"))
        .mockResolvedValueOnce(sample),
    );
    const result = await tailorResume(input, { generate });

    expect(result).toEqual({ ok: true, output: sample, attempts: 2 });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1][0].prompt).toContain(
      "did not match the required structure",
    );
    expect(generate.mock.calls[0][0].prompt).not.toContain(
      "did not match the required structure",
    );
  });

  it("returns a validation error after the single retry is exhausted", async () => {
    const generate = mockGenerate(async () => {
      throw new AiError("validation", "still bad");
    });
    const result = await tailorResume(input, { generate });

    expect(result).toEqual({ ok: false, category: "validation", attempts: 2 });
    expect(generate).toHaveBeenCalledTimes(2);
  });

  it.each(["quota", "auth", "network", "unknown"] as const)(
    "does not retry on a %s error",
    async (category) => {
      const generate = mockGenerate(async () => {
        throw new AiError(category, category);
      });
      const result = await tailorResume(input, { generate });

      expect(result).toEqual({ ok: false, category, attempts: 1 });
      expect(generate).toHaveBeenCalledTimes(1);
    },
  );
});
