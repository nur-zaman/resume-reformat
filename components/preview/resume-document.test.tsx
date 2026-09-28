import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ResumeDocument } from "./resume-document";
import { realisticResume, emptyResume, longResume } from "@/lib/resume/fixtures";
import type { ResumeDoc } from "@/lib/resume";

describe("ResumeDocument (HTML)", () => {
  it("renders the realistic single-page resume", () => {
    expect(renderToStaticMarkup(<ResumeDocument doc={realisticResume} />)).toMatchSnapshot();
  });

  it("renders an empty resume (header only)", () => {
    expect(renderToStaticMarkup(<ResumeDocument doc={emptyResume} />)).toMatchSnapshot();
  });

  it("renders the long multi-page resume", () => {
    expect(renderToStaticMarkup(<ResumeDocument doc={longResume} />)).toMatchSnapshot();
  });

  it("includes header, entry and link content", () => {
    const html = renderToStaticMarkup(<ResumeDocument doc={realisticResume} />);
    expect(html).toContain("Avery Nguyen");
    expect(html).toContain("Northwind Labs");
    expect(html).toContain("Led the migration of the monolith checkout service");
    expect(html).toContain('href="https://github.com/averynguyen"');
  });

  it("omits hidden sections", () => {
    const doc: ResumeDoc = {
      ...realisticResume,
      blocks: realisticResume.blocks.map((b) =>
        b.type === "skills" ? { ...b, visible: false } : b,
      ),
    };
    const html = renderToStaticMarkup(<ResumeDocument doc={doc} />);
    expect(html).not.toContain("TypeScript");
  });
});
