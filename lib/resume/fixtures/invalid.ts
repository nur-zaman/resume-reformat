import { newId } from "../ids";
import { CURRENT_SCHEMA_VERSION } from "../version";

const V = CURRENT_SCHEMA_VERSION;

function header() {
  return {
    id: newId(),
    type: "header",
    name: "Test User",
    headline: "",
    contact: [],
    links: [],
  };
}

function summary(id = newId()) {
  return {
    id,
    type: "summary",
    title: "Summary",
    visible: true,
    body: { type: "doc", content: [] },
  };
}

export const twoHeaders: unknown = { schemaVersion: V, blocks: [header(), header()] };

export const headerNotFirst: unknown = { schemaVersion: V, blocks: [summary(), header()] };

export const duplicateId: unknown = (() => {
  const id = newId();
  return { schemaVersion: V, blocks: [header(), summary(id), summary(id)] };
})();

export const orphanReviewItem: unknown = {
  schemaVersion: V,
  resume: { schemaVersion: V, blocks: [header()] },
  reviewItems: [
    {
      id: newId(),
      targetContentId: "does-not-exist",
      kind: "ai_proposed_claim",
      reason: "orphan",
      status: "pending",
      originalText: "",
    },
  ],
  inferredJob: {},
};

export const unsupportedMark: unknown = {
  schemaVersion: V,
  blocks: [
    header(),
    {
      id: newId(),
      type: "summary",
      title: "Summary",
      visible: true,
      body: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "x", marks: [{ type: "textStyle", attrs: { color: "red" } }] }],
          },
        ],
      },
    },
  ],
};

export const unsupportedNode: unknown = {
  schemaVersion: V,
  blocks: [
    header(),
    {
      id: newId(),
      type: "richtext",
      title: "Section",
      visible: true,
      body: { type: "doc", content: [{ type: "heading", attrs: { level: 1 }, content: [] }] },
    },
  ],
};

export const badUrlScheme: unknown = {
  schemaVersion: V,
  blocks: [
    {
      ...header(),
      links: [{ id: newId(), label: "x", href: "javascript:alert(1)" }],
    },
  ],
};

// A field set to null where an empty string is expected.
export const nullVsEmpty: unknown = {
  schemaVersion: V,
  blocks: [{ ...header(), headline: null }],
};

export const parseWithReviewItems: unknown = {
  schemaVersion: V,
  resume: { schemaVersion: V, blocks: [header()] },
  reviewItems: [
    {
      id: newId(),
      targetContentId: "x",
      kind: "ai_proposed_claim",
      reason: "should not be here",
      status: "pending",
      originalText: "",
    },
  ],
  inferredJob: {},
};
