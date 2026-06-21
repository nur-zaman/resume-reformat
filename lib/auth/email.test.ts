import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail } from "./email";

describe("normalizeEmail", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeEmail("  user@example.com  ")).toBe("user@example.com");
  });

  it("lowercases", () => {
    expect(normalizeEmail("User@Example.COM")).toBe("user@example.com");
  });

  it("combines trim and lowercase", () => {
    expect(normalizeEmail("\tNur@Manzil.CA\n")).toBe("nur@manzil.ca");
  });
});

describe("isValidEmail", () => {
  it("accepts a normal address", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("accepts addresses needing normalization", () => {
    expect(isValidEmail("  User@Example.com ")).toBe(true);
  });

  it.each([
    ["", "empty"],
    ["notanemail", "no @"],
    ["user@", "no domain"],
    ["@example.com", "no local part"],
    ["user@example", "no TLD dot"],
    ["a b@example.com", "internal space"],
  ])("rejects %s (%s)", (value) => {
    expect(isValidEmail(value)).toBe(false);
  });

  it("rejects an over-long address", () => {
    const huge = `${"a".repeat(250)}@example.com`;
    expect(isValidEmail(huge)).toBe(false);
  });
});
