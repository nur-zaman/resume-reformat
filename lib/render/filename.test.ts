import { describe, it, expect } from "vitest";
import {
  slugifySegment,
  buildPdfFilename,
  formatDateForFilename,
  resumeFileName,
} from "./filename";
import { realisticResume } from "@/lib/resume/fixtures/realistic-resume";
import { emptyResume } from "@/lib/resume/fixtures/empty-resume";

describe("slugifySegment", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugifySegment("Avery Nguyen")).toBe("avery-nguyen");
  });

  it("strips unsafe characters and collapses separators", () => {
    expect(slugifySegment("Acme, Inc. / Corp")).toBe("acme-inc-corp");
  });

  it("strips diacritics", () => {
    expect(slugifySegment("Renée Łódź")).toBe("renee-odz");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugifySegment("  ***hello***  ")).toBe("hello");
  });

  it("returns empty string when nothing survives", () => {
    expect(slugifySegment("***")).toBe("");
  });
});

describe("buildPdfFilename", () => {
  it("joins name, company and role with underscores and appends the date", () => {
    expect(
      buildPdfFilename({
        name: "Avery Nguyen",
        company: "Acme Corp",
        role: "Senior Engineer",
        date: "2026-06-22",
      }),
    ).toBe("avery-nguyen_acme-corp_senior-engineer_2026-06-22.pdf");
  });

  it("drops empty segments", () => {
    expect(buildPdfFilename({ name: "Avery Nguyen", date: "2026-06-22" })).toBe(
      "avery-nguyen_2026-06-22.pdf",
    );
    expect(
      buildPdfFilename({ name: "Avery Nguyen", company: "", role: "Engineer", date: "2026-06-22" }),
    ).toBe("avery-nguyen_engineer_2026-06-22.pdf");
  });

  it("falls back to `resume` when every segment is empty", () => {
    expect(buildPdfFilename({ name: "", company: "***", date: "2026-06-22" })).toBe(
      "resume_2026-06-22.pdf",
    );
  });
});

describe("formatDateForFilename", () => {
  it("formats a date as YYYY-MM-DD with zero padding", () => {
    expect(formatDateForFilename(new Date(2026, 5, 9))).toBe("2026-06-09");
  });
});

describe("resumeFileName", () => {
  it("derives the name segment from the resume header", () => {
    expect(resumeFileName(realisticResume, { date: "2026-06-22" })).toBe(
      "avery-nguyen_2026-06-22.pdf",
    );
  });

  it("includes company and role when supplied", () => {
    expect(
      resumeFileName(realisticResume, {
        company: "Acme Corp",
        role: "Staff Engineer",
        date: "2026-06-22",
      }),
    ).toBe("avery-nguyen_acme-corp_staff-engineer_2026-06-22.pdf");
  });

  it("falls back to `resume` when the header name is empty", () => {
    expect(resumeFileName(emptyResume, { date: "2026-06-22" })).toBe("resume_2026-06-22.pdf");
  });
});
