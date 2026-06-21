import { describe, expect, it } from "vitest";
import { isValidPassword } from "./password";

describe("isValidPassword", () => {
  it("accepts a password of at least 8 characters", () => {
    expect(isValidPassword("hunter22")).toBe(true);
  });

  it("accepts the 72-character maximum", () => {
    expect(isValidPassword("a".repeat(72))).toBe(true);
  });

  it.each([
    ["", "empty"],
    ["short", "too short"],
    ["a".repeat(7), "7 characters"],
    ["a".repeat(73), "over 72 characters"],
  ])("rejects %s (%s)", (value) => {
    expect(isValidPassword(value)).toBe(false);
  });
});
