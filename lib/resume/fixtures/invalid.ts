import { newId } from "../ids";
import { CURRENT_SCHEMA_VERSION } from "../version";

/**
 * Invalid documents for negative tests — each isolates a SINGLE defect so a test can
 * assert that exact rule rejects it. Typed `unknown`: these intentionally do not match
 * the schema types. Ids are valid UUIDs so the only failing thing is the named defect.
 */

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

/** Two header blocks. */
export const twoHeaders: unknown = { schemaVersion: V, blocks: [header(), header()] };

/** A non-header block in the first position. */
export const headerNotFirst: unknown = { schemaVersion: V, blocks: [summary(), header()] };

/** Two blocks sharing the same id. */
export const duplicateId: unknown = (() => {
  const id = newId();
  return { schemaVersion: V, blocks: [header(), summary(id), summary(id)] };
})();

/** A pending review item targeting a content id that does not exist. */
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

/** Rich text using an unsupported mark. */
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

/** Rich text using an unsupported node. */
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

/** A link whose href uses a disallowed scheme. */
export const badUrlScheme: unknown = {
  schemaVersion: V,
  blocks: [
    {
      ...header(),
      links: [{ id: newId(), label: "x", href: "javascript:alert(1)" }],
    },
  ],
};

/** A field set to null where an empty string is expected (null discipline). */
export const nullVsEmpty: unknown = {
  schemaVersion: V,
  blocks: [{ ...header(), headline: null }],
};

/** A parse-endpoint envelope that wrongly carries review items. */
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
