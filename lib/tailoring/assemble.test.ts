import { describe, expect, it } from "vitest";
import { AiTailorSchema, type AiTailorOutput } from "./schema";
import { assembleTailoredResult } from "./assemble";
import { validateGenerationResult } from "@/lib/resume/validate";
import { collectContentIds } from "@/lib/resume/invariants";
import { newId } from "@/lib/resume/ids";
import { bulletsToRichText } from "@/lib/resume/richtext-build";
import { CURRENT_SCHEMA_VERSION } from "@/lib/resume/version";
import type { Block, ResumeDoc } from "@/lib/resume/schema";

// --- builders --------------------------------------------------------------

function tailor(o: Partial<AiTailorOutput> = {}): AiTailorOutput {
  return AiTailorSchema.parse({
    headline: "",
    summary: [],
    skills: [],
    experience: [],
    education: [],
    customSections: [],
    proposedSections: [],
    inferredJob: { title: "", company: "" },
    ...o,
  });
}

const para = (text: string, proposed = false, reason = "") => ({ text, proposed, reason });

const expEntry = (o: Partial<AiTailorOutput["experience"][number]>) => ({
  organization: "",
  location: "",
  role: "",
  startDate: "",
  endDate: "",
  bullets: [],
  bulletsProposed: false,
  bulletsReason: "",
  ...o,
});

function makeBase(): ResumeDoc {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    blocks: [
      {
        id: newId(),
        type: "header",
        name: "Jane Doe",
        headline: "Engineer",
        contact: [{ id: newId(), kind: "email", value: "jane@example.com", label: "" }],
        links: [{ id: newId(), label: "GitHub", href: "https://github.com/jane" }],
      },
      {
        id: newId(),
        type: "experience",
        title: "Experience",
        visible: true,
        entries: [
          {
            id: newId(),
            organization: "Acme",
            location: "SF",
            role: "Engineer",
            startDate: "2020",
            endDate: "Present",
            bullets: bulletsToRichText(["Did X", "Did Y"]),
          },
        ],
      },
    ],
  };
}

function blockOfType<T extends Block["type"]>(
  doc: ResumeDoc,
  type: T,
): Extract<Block, { type: T }> | undefined {
  return doc.blocks.find((b): b is Extract<Block, { type: T }> => b.type === type);
}

// --- tests -----------------------------------------------------------------

describe("assembleTailoredResult", () => {
  it("pins header identity from the base; an empty headline keeps the base headline", () => {
    const base = makeBase();
    const baseHeader = blockOfType(base, "header")!;
    const out = assembleTailoredResult(tailor({ headline: "" }), base);

    const header = blockOfType(out.resume, "header")!;
    expect(header.name).toBe("Jane Doe");
    expect(header.headline).toBe("Engineer");
    expect(header.contact).toEqual(baseHeader.contact);
    expect(header.links).toEqual(baseHeader.links);
    expect(out.resume.blocks[0].type).toBe("header");
  });

  it("tailors the headline but never the name/contacts/links", () => {
    const out = assembleTailoredResult(tailor({ headline: "Senior Backend Engineer" }), makeBase());
    const header = blockOfType(out.resume, "header")!;
    expect(header.headline).toBe("Senior Backend Engineer");
    expect(header.name).toBe("Jane Doe");
  });

  it("mints a contentId + a matching pending review item only for proposed paragraphs", () => {
    const out = assembleTailoredResult(
      tailor({ summary: [para("Clean line"), para("Cut p99 latency 40%", true, "JD emphasises performance")] }),
      makeBase(),
    );
    const summary = blockOfType(out.resume, "summary")!;
    expect(summary.body.content).toHaveLength(2);
    expect(summary.body.content[0].attrs?.contentId).toBeUndefined();

    const cid = summary.body.content[1].attrs?.contentId;
    expect(cid).toBeTruthy();
    expect(out.reviewItems).toHaveLength(1);
    expect(out.reviewItems[0]).toMatchObject({
      targetContentId: cid,
      kind: "ai_proposed_claim",
      status: "pending",
      reason: "JD emphasises performance",
      originalText: "",
    });
    expect(out.reviewItems[0].resolvedAt).toBeUndefined();
  });

  it("anchors a proposed experience bullet set on its bulletList and records the base bullets as originalText", () => {
    const out = assembleTailoredResult(
      tailor({
        experience: [
          expEntry({
            organization: "Acme",
            role: "Engineer",
            startDate: "2020",
            endDate: "Present",
            bullets: ["Cut p99 latency 40%", "Led the migration"],
            bulletsProposed: true,
            bulletsReason: "Quantified the impact the JD asks for",
          }),
        ],
      }),
      makeBase(),
    );
    const exp = blockOfType(out.resume, "experience")!;
    const list = exp.entries[0].bullets.content[0];
    expect(list.type).toBe("bulletList");
    const cid = list.attrs?.contentId;
    expect(cid).toBeTruthy();
    expect(out.reviewItems).toHaveLength(1);
    expect(out.reviewItems[0].targetContentId).toBe(cid);
    expect(out.reviewItems[0].originalText).toBe("Did X\nDid Y");
  });

  it("produces no review items for a clean (reworded-only) tailoring, and validates", () => {
    const out = assembleTailoredResult(
      tailor({
        summary: [para("Reworded summary")],
        experience: [expEntry({ organization: "Acme", role: "Engineer", bullets: ["Reworded bullet"] })],
      }),
      makeBase(),
    );
    expect(out.reviewItems).toEqual([]);
    expect(validateGenerationResult(out).ok).toBe(true);
  });

  it("keeps every pending review item anchored to an existing content id (passes the gate)", () => {
    const out = assembleTailoredResult(
      tailor({
        summary: [para("New quantified claim", true, "metrics")],
        experience: [
          expEntry({
            organization: "Acme",
            role: "Engineer",
            bullets: ["Strengthened bullet"],
            bulletsProposed: true,
            bulletsReason: "impact",
          }),
        ],
        proposedSections: [{ title: "Certifications", paragraphs: ["AWS Certified"], reason: "JD requires AWS" }],
      }),
      makeBase(),
    );
    const checked = validateGenerationResult(out);
    expect(checked.ok).toBe(true);
    expect(out.reviewItems).toHaveLength(3);
    const ids = new Set(collectContentIds(out.resume));
    expect(out.reviewItems.every((i) => ids.has(i.targetContentId))).toBe(true);
  });

  it("always flags a brand-new section as a proposal, using a fallback reason when missing", () => {
    const out = assembleTailoredResult(
      tailor({ proposedSections: [{ title: "Extra", paragraphs: ["A", "B"], reason: "" }] }),
      makeBase(),
    );
    const rt = blockOfType(out.resume, "richtext")!;
    expect(rt.body.content).toHaveLength(2);
    expect(out.reviewItems).toHaveLength(1);
    expect(out.reviewItems[0].targetContentId).toBe(rt.body.content[0].attrs?.contentId);
    expect(out.reviewItems[0].reason.length).toBeGreaterThan(0);
    expect(validateGenerationResult(out).ok).toBe(true);
  });

  it("honours a proposed flag even when the model omits the reason", () => {
    const out = assembleTailoredResult(
      tailor({ summary: [para("New claim", true, "")] }),
      makeBase(),
    );
    expect(out.reviewItems).toHaveLength(1);
    expect(out.reviewItems[0].reason.length).toBeGreaterThan(0);
    expect(validateGenerationResult(out).ok).toBe(true);
  });

  it("omits empty inferredJob fields", () => {
    const out = assembleTailoredResult(tailor({ inferredJob: { title: "", company: "Acme" } }), makeBase());
    expect(out.inferredJob).toEqual({ company: "Acme" });
    expect(out.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("selects/reorders existing skills without adding a proposal", () => {
    const out = assembleTailoredResult(
      tailor({ skills: [{ label: "Languages", items: ["TypeScript", "Go"] }] }),
      makeBase(),
    );
    const skills = blockOfType(out.resume, "skills")!;
    expect(skills.categories[0].items).toEqual(["TypeScript", "Go"]);
    expect(out.reviewItems).toEqual([]);
  });
});
