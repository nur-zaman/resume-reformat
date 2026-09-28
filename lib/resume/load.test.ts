import { describe, expect, it } from "vitest";
import { resolveStoredResume } from "./load";
import { emptyResume } from "./fixtures/empty-resume";
import { realisticResume } from "./fixtures/realistic-resume";

describe("resolveStoredResume", () => {
  it("reports an error when no doc is stored", () => {
    expect(resolveStoredResume(null)).toEqual({ kind: "error" });
    expect(resolveStoredResume(undefined)).toEqual({ kind: "error" });
  });

  it("returns a valid stored resume", () => {
    expect(resolveStoredResume(emptyResume)).toEqual({ kind: "ok", doc: emptyResume });
    expect(resolveStoredResume(realisticResume)).toEqual({
      kind: "ok",
      doc: realisticResume,
    });
  });

  it("reports an error for a corrupt or unreadable stored value (never overwrites it)", () => {
    expect(resolveStoredResume("not a doc").kind).toBe("error");
    expect(resolveStoredResume({ blocks: [] }).kind).toBe("error");
    expect(resolveStoredResume({ schemaVersion: 1, blocks: "nope" }).kind).toBe("error");
    expect(resolveStoredResume({ schemaVersion: 1, blocks: [] }).kind).toBe("error");
  });
});
