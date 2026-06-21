import { describe, expect, it } from "vitest";
import { resolveStoredResume } from "./load";
import { emptyResume } from "./fixtures/empty-resume";
import { realisticResume } from "./fixtures/realistic-resume";

describe("resolveStoredResume", () => {
  it("sends a user with no stored resume to onboarding", () => {
    expect(resolveStoredResume(null)).toEqual({ kind: "redirect-onboarding" });
    expect(resolveStoredResume(undefined)).toEqual({ kind: "redirect-onboarding" });
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
    expect(resolveStoredResume({ blocks: [] }).kind).toBe("error"); // no schemaVersion
    expect(resolveStoredResume({ schemaVersion: 1, blocks: "nope" }).kind).toBe("error");
    // A doc with no header violates a schema invariant.
    expect(resolveStoredResume({ schemaVersion: 1, blocks: [] }).kind).toBe("error");
  });
});
