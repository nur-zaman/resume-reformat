import { describe, expect, it } from "vitest";
import {
  MAX_RESUME_INPUT_CHARS,
  MAX_RESUME_PDF_BYTES,
  MAX_JD_INPUT_CHARS,
  validateResumeInput,
  validateResumePdf,
  validateJobDescriptionInput,
} from "./input";

describe("validateResumeInput", () => {
  it("rejects empty and whitespace-only input", () => {
    expect(validateResumeInput("")).toEqual({ ok: false, reason: "empty", length: 0 });
    expect(validateResumeInput("   \n\t ")).toEqual({ ok: false, reason: "empty", length: 0 });
  });

  it("accepts input at exactly the limit and trims it", () => {
    const atLimit = "a".repeat(MAX_RESUME_INPUT_CHARS);
    expect(validateResumeInput(`  ${atLimit}  `)).toEqual({ ok: true, text: atLimit });
  });

  it("rejects input one character over the limit, measured after trim", () => {
    const over = "a".repeat(MAX_RESUME_INPUT_CHARS + 1);
    expect(validateResumeInput(over)).toEqual({
      ok: false,
      reason: "too_long",
      length: MAX_RESUME_INPUT_CHARS + 1,
    });
  });
});

describe("validateJobDescriptionInput", () => {
  it("rejects empty and whitespace-only input", () => {
    expect(validateJobDescriptionInput("")).toEqual({ ok: false, reason: "empty", length: 0 });
    expect(validateJobDescriptionInput("  \n ")).toEqual({ ok: false, reason: "empty", length: 0 });
  });

  it("accepts input at exactly the limit and trims it", () => {
    const atLimit = "a".repeat(MAX_JD_INPUT_CHARS);
    expect(validateJobDescriptionInput(`  ${atLimit}  `)).toEqual({ ok: true, text: atLimit });
  });

  it("rejects input one character over the limit, measured after trim", () => {
    const over = "a".repeat(MAX_JD_INPUT_CHARS + 1);
    expect(validateJobDescriptionInput(over)).toEqual({
      ok: false,
      reason: "too_long",
      length: MAX_JD_INPUT_CHARS + 1,
    });
  });
});

describe("validateResumePdf", () => {
  const pdf = (over: Partial<{ size: number; type: string; name: string }> = {}) => ({
    size: 1000,
    type: "application/pdf",
    name: "resume.pdf",
    ...over,
  });

  it("accepts a normal PDF", () => {
    expect(validateResumePdf(pdf())).toEqual({ ok: true });
  });

  it("accepts a .pdf file even when the browser reports an empty type", () => {
    expect(validateResumePdf(pdf({ type: "" }))).toEqual({ ok: true });
  });

  it("rejects an empty file", () => {
    expect(validateResumePdf(pdf({ size: 0 }))).toEqual({
      ok: false,
      reason: "empty",
      size: 0,
    });
  });

  it("rejects a non-PDF file", () => {
    expect(validateResumePdf(pdf({ type: "image/png", name: "shot.png" }))).toEqual({
      ok: false,
      reason: "wrong_type",
      size: 1000,
    });
  });

  it("rejects a PDF over the size limit", () => {
    const size = MAX_RESUME_PDF_BYTES + 1;
    expect(validateResumePdf(pdf({ size }))).toEqual({
      ok: false,
      reason: "too_large",
      size,
    });
  });
});
