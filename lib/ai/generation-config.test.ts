import { describe, expect, it } from "vitest";
import { parseKnobs, tailorKnobs } from "./generation-config";

/**
 * Locks the model-family gating and the exact provider-option key names (verified against
 * @ai-sdk/google's GoogleGenerativeAIProviderOptions). A typo like `thinkingLevle` or a wrong
 * branch would silently send no/garbage config to the model; these tests catch that.
 */
describe("parseKnobs (transcription profile)", () => {
  it("Gemini 3: minimal thinkingLevel, no temperature", () => {
    expect(parseKnobs("gemini-3.1-flash-lite")).toEqual({
      providerOptions: { google: { thinkingConfig: { thinkingLevel: "minimal" } } },
    });
  });

  it("Gemini 2.5: temperature 0, thinking disabled", () => {
    expect(parseKnobs("gemini-2.5-flash-lite")).toEqual({
      temperature: 0,
      providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
    });
  });
});

describe("tailorKnobs (generative profile)", () => {
  it("Gemini 3: low thinkingLevel, no temperature", () => {
    expect(tailorKnobs("gemini-3.1-flash-lite")).toEqual({
      providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } },
    });
  });

  it("Gemini 2.5: modest temperature, dynamic thinking", () => {
    expect(tailorKnobs("gemini-2.5-flash")).toEqual({
      temperature: 0.4,
      providerOptions: { google: { thinkingConfig: { thinkingBudget: -1 } } },
    });
  });
});

describe("model-family detection", () => {
  it.each([
    "gemini-3.1-flash-lite",
    "gemini-3.1-flash-lite-preview",
    "gemini-3-pro-preview",
    "models/gemini-3-flash",
  ])("treats %s as Gemini 3 (no temperature)", (id) => {
    expect(parseKnobs(id).temperature).toBeUndefined();
    expect(tailorKnobs(id).temperature).toBeUndefined();
  });

  it.each(["gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-flash-latest"])(
    "treats %s as non-Gemini-3 (sets temperature)",
    (id) => {
      expect(parseKnobs(id).temperature).toBe(0);
      expect(typeof tailorKnobs(id).temperature).toBe("number");
    },
  );
});
