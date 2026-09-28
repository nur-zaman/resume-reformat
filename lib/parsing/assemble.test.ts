import { describe, expect, it } from "vitest";
import { AiParseSchema, type AiParseOutput } from "./schema";
import { assembleResumeDoc } from "./assemble";
import { validateParseResult } from "@/lib/resume/validate";
import { CURRENT_SCHEMA_VERSION } from "@/lib/resume/version";
import type { Block } from "@/lib/resume/schema";
import type { RichText } from "@/lib/resume/richtext";

/**
 * Build a complete `AiParseOutput` from a partial. The lean schema is now REQUIRED
 * throughout (Gemini skips non-required fields), so tests must supply every field; this
 * helper fills the rest with the empty values the model would emit, then validates.
 */
type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

function ai(partial: DeepPartial<AiParseOutput> = {}): AiParseOutput {
  const h = partial.header ?? {};
  const obj = {
    header: {
      name: h.name ?? "",
      headline: h.headline ?? "",
      contacts: (h.contacts ?? []).map((c) => ({
        kind: c?.kind ?? "custom",
        value: c?.value ?? "",
        label: c?.label ?? "",
      })),
      links: (h.links ?? []).map((l) => ({ label: l?.label ?? "", href: l?.href ?? "" })),
    },
    summary: partial.summary ?? [],
    skills: (partial.skills ?? []).map((s) => ({
      label: s?.label ?? "",
      items: s?.items ?? [],
    })),
    experience: (partial.experience ?? []).map((e) => ({
      organization: e?.organization ?? "",
      location: e?.location ?? "",
      role: e?.role ?? "",
      startDate: e?.startDate ?? "",
      endDate: e?.endDate ?? "",
      bullets: e?.bullets ?? [],
    })),
    education: (partial.education ?? []).map((e) => ({
      institution: e?.institution ?? "",
      location: e?.location ?? "",
      credential: e?.credential ?? "",
      startDate: e?.startDate ?? "",
      endDate: e?.endDate ?? "",
      details: e?.details ?? [],
    })),
    customSections: (partial.customSections ?? []).map((c) => ({
      title: c?.title ?? "",
      paragraphs: c?.paragraphs ?? [],
    })),
  };
  return AiParseSchema.parse(obj);
}

/** Every `contentId` carried anywhere in a rich-text body (should be none after parse). */
function contentIdsIn(body: RichText): string[] {
  const ids: string[] = [];
  for (const node of body.content) {
    if (node.attrs?.contentId) ids.push(node.attrs.contentId);
  }
  return ids;
}

function blockOfType<T extends Block["type"]>(
  blocks: Block[],
  type: T,
): Extract<Block, { type: T }> | undefined {
  return blocks.find((b): b is Extract<Block, { type: T }> => b.type === type);
}

const richSample = ai({
  header: {
    name: "Avery Nguyen",
    headline: "Senior Engineer",
    contacts: [
      { kind: "email", value: "avery@example.com" },
      { kind: "location", value: "Remote" },
    ],
    links: [{ label: "GitHub", href: "https://github.com/avery" }],
  },
  summary: ["First line.", "Second line."],
  skills: [{ label: "Languages", items: ["TypeScript", "Go"] }],
  experience: [
    {
      organization: "Northwind",
      role: "Engineer",
      startDate: "2021",
      endDate: "Present",
      bullets: ["Shipped things.", "Mentored people."],
    },
  ],
  education: [
    { institution: "Waterloo", credential: "BASc", startDate: "2013", endDate: "2017" },
  ],
  customSections: [{ title: "Open Source", paragraphs: ["Maintainer of a library."] }],
});

describe("assembleResumeDoc", () => {
  it("produces an envelope that passes the strict parse gate", () => {
    const result = validateParseResult(assembleResumeDoc(richSample));
    expect(result.ok).toBe(true);
  });

  it("always sets the envelope invariants for a parse result", () => {
    const env = assembleResumeDoc(richSample);
    expect(env.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(env.resume.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(env.reviewItems).toEqual([]);
    expect(env.inferredJob).toEqual({});
  });

  it("keeps the header first and never mints contentIds", () => {
    const { blocks } = assembleResumeDoc(richSample).resume;
    expect(blocks[0].type).toBe("header");
    const bodies: RichText[] = [];
    for (const b of blocks) {
      if (b.type === "summary" || b.type === "richtext") bodies.push(b.body);
      if (b.type === "experience") b.entries.forEach((e) => bodies.push(e.bullets));
      if (b.type === "education") b.entries.forEach((e) => bodies.push(e.details));
    }
    expect(bodies.flatMap(contentIdsIn)).toEqual([]);
  });

  it("turns bullet strings into a single bulletList of listItems", () => {
    const exp = blockOfType(assembleResumeDoc(richSample).resume.blocks, "experience");
    const bullets = exp!.entries[0].bullets;
    expect(bullets.content).toHaveLength(1);
    const list = bullets.content[0];
    expect(list.type).toBe("bulletList");
    expect(list.type === "bulletList" && list.content).toHaveLength(2);
  });

  it("drops empty/whitespace bullets and yields an empty doc when none remain", () => {
    const out = assembleResumeDoc(
      ai({
        header: { name: "X" },
        experience: [{ organization: "Org", bullets: ["  ", "", "real"] }],
      }),
    );
    const exp = blockOfType(out.resume.blocks, "experience")!;
    const list = exp.entries[0].bullets.content[0];
    expect(list.type === "bulletList" && list.content).toHaveLength(1);

    const noBullets = assembleResumeDoc(
      ai({ header: { name: "X" }, experience: [{ organization: "Org", bullets: ["   "] }] }),
    );
    expect(blockOfType(noBullets.resume.blocks, "experience")!.entries[0].bullets.content).toEqual([]);
  });

  it("drops links with disallowed URL schemes", () => {
    const out = assembleResumeDoc(
      ai({
        header: {
          name: "X",
          links: [
            { label: "bad", href: "javascript:alert(1)" },
            { label: "rel", href: "/relative" },
            { label: "ok", href: "https://example.com" },
          ],
        },
      }),
    );
    const header = blockOfType(out.resume.blocks, "header")!;
    expect(header.links).toHaveLength(1);
    expect(header.links[0].href).toBe("https://example.com");
  });

  it("demotes a malformed email contact to custom so validation still passes", () => {
    const out = assembleResumeDoc(
      ai({ header: { name: "X", contacts: [{ kind: "email", value: "not-an-email" }] } }),
    );
    const header = blockOfType(out.resume.blocks, "header")!;
    expect(header.contact[0].kind).toBe("custom");
    expect(header.contact[0].value).toBe("not-an-email");
    expect(validateParseResult(out).ok).toBe(true);
  });

  it("omits sections that have no content", () => {
    const out = assembleResumeDoc(ai({ header: { name: "Solo" } }));
    expect(out.resume.blocks.map((b) => b.type)).toEqual(["header"]);
  });

  it("includes every populated section", () => {
    const types = assembleResumeDoc(richSample).resume.blocks.map((b) => b.type);
    expect(types).toEqual([
      "header",
      "summary",
      "skills",
      "experience",
      "education",
      "richtext",
    ]);
  });
});
