import { describe, it, expect } from "vitest";
import { newId } from "@/lib/resume";
import type { Block, ResumeDoc } from "@/lib/resume";
import {
  resumeToSections,
  contactDisplay,
  contactValues,
  formatDateRange,
  type HeaderBlock,
} from "./document";

function header(): HeaderBlock {
  return {
    id: newId(),
    type: "header",
    name: "Avery Nguyen",
    headline: "Engineer",
    contact: [
      { id: newId(), kind: "email", value: "a@example.com", label: "" },
      { id: newId(), kind: "location", value: "SF, CA", label: "" },
      { id: newId(), kind: "custom", value: "", label: "" }, // blank → dropped
    ],
    links: [],
  };
}

function summary(visible: boolean): Block {
  return {
    id: newId(),
    type: "summary",
    title: "Summary",
    visible,
    body: { type: "doc", content: [] },
  };
}

describe("resumeToSections", () => {
  it("puts the header first and keeps non-header order", () => {
    const h = header();
    const s = summary(true);
    const sk: Block = { id: newId(), type: "skills", title: "Skills", visible: true, categories: [] };
    const doc: ResumeDoc = { schemaVersion: 1, blocks: [h, s, sk] };
    expect(resumeToSections(doc).map((b) => b.type)).toEqual(["header", "summary", "skills"]);
  });

  it("drops hidden non-header blocks", () => {
    const doc: ResumeDoc = {
      schemaVersion: 1,
      blocks: [header(), summary(false), summary(true)],
    };
    const out = resumeToSections(doc);
    expect(out).toHaveLength(2);
    expect(out.every((b) => b.type !== "summary" || b.visible)).toBe(true);
  });

  it("resolves the header even if it is not first in the array", () => {
    const h = header();
    const doc: ResumeDoc = { schemaVersion: 1, blocks: [summary(true), h] };
    expect(resumeToSections(doc)[0]).toBe(h);
  });

  it("accepts a bare blocks array too", () => {
    const h = header();
    expect(resumeToSections([h])).toEqual([h]);
  });
});

describe("contactDisplay / contactValues", () => {
  it("uses the value for typed items", () => {
    expect(contactDisplay({ id: "x", kind: "email", value: "a@b.com", label: "" })).toBe("a@b.com");
  });

  it("formats a labelled custom item as `label: value`", () => {
    expect(contactDisplay({ id: "x", kind: "custom", value: "@avery", label: "Twitter" })).toBe(
      "Twitter: @avery",
    );
  });

  it("filters out blank contact items", () => {
    expect(contactValues(header())).toEqual(["a@example.com", "SF, CA"]);
  });
});

describe("formatDateRange", () => {
  it("joins both sides with an en dash", () => {
    expect(formatDateRange("2021", "Present")).toBe("2021 – Present");
  });

  it("shows only the present side when one is empty", () => {
    expect(formatDateRange("2021", "")).toBe("2021");
    expect(formatDateRange("", "2021")).toBe("2021");
  });

  it("returns empty string when both are empty", () => {
    expect(formatDateRange("", "")).toBe("");
  });
});
