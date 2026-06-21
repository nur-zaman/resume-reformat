import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Font, renderToBuffer } from "@react-pdf/renderer";
import { ResumePdf } from "./resume-pdf";
import { realisticResume, emptyResume, longResume } from "@/lib/resume/fixtures";
import type { ResumeDoc } from "@/lib/resume";

/**
 * Node-side smoke tests for the PDF renderer (PRD §10 visual-regression layer).
 *
 * `renderToBuffer` exercises the full react-pdf pipeline (fonts, layout engine,
 * pagination props, every component) and proves the document renders end-to-end without
 * throwing or producing an empty file — the proxy for "exports without clipped content"
 * that is achievable without a browser. Fonts are registered from the local TTFs because
 * the app's browser URLs (lib/render/pdf-fonts.ts) cannot be fetched in node.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const fontsDir = path.resolve(here, "../../../public/fonts/source-serif-4");

beforeAll(() => {
  Font.register({
    family: "Source Serif 4",
    fonts: [
      { src: path.join(fontsDir, "SourceSerif4-Regular.ttf"), fontWeight: 400 },
      { src: path.join(fontsDir, "SourceSerif4-Bold.ttf"), fontWeight: 700 },
      {
        src: path.join(fontsDir, "SourceSerif4-Italic.ttf"),
        fontWeight: 400,
        fontStyle: "italic",
      },
      {
        src: path.join(fontsDir, "SourceSerif4-BoldItalic.ttf"),
        fontWeight: 700,
        fontStyle: "italic",
      },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
});

async function renderPdf(doc: ResumeDoc): Promise<Buffer> {
  const out = await renderToBuffer(<ResumePdf doc={doc} />);
  return Buffer.from(out);
}

function isPdf(buf: Buffer): boolean {
  return buf.subarray(0, 5).toString("latin1") === "%PDF-";
}

describe("ResumePdf (node renderToBuffer)", () => {
  it("renders the realistic resume to a valid, non-empty PDF", async () => {
    const buf = await renderPdf(realisticResume);
    expect(isPdf(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
  }, 30000);

  it("renders an empty resume without throwing", async () => {
    const buf = await renderPdf(emptyResume);
    expect(isPdf(buf)).toBe(true);
  }, 30000);

  it("renders the long multi-page resume", async () => {
    const buf = await renderPdf(longResume);
    expect(isPdf(buf)).toBe(true);
    // A multi-page document is materially larger than the single-page fixture.
    expect(buf.length).toBeGreaterThan(3000);
  }, 30000);
});
