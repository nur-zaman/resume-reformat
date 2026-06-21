import { describe, expect, it } from "vitest";
import { getSafeNextPath } from "./redirect";

describe("getSafeNextPath", () => {
  it("keeps an internal absolute path", () => {
    expect(getSafeNextPath("/dashboard?tab=recent#top")).toBe(
      "/dashboard?tab=recent#top",
    );
  });

  it.each([
    { candidate: null, label: "missing" },
    { candidate: "dashboard", label: "relative" },
    { candidate: "https://evil.example", label: "absolute external" },
    { candidate: "//evil.example", label: "protocol-relative" },
    { candidate: "/\\evil.example", label: "backslash protocol-relative" },
  ])("uses the fallback for $label input", ({ candidate }) => {
    expect(getSafeNextPath(candidate)).toBe("/dashboard");
  });
});
