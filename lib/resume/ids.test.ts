import { describe, expect, it } from "vitest";
import { UuidSchema, findDuplicates, newId } from "./ids";

describe("newId", () => {
  it("returns a value that passes UuidSchema", () => {
    expect(UuidSchema.safeParse(newId()).success).toBe(true);
  });

  it("returns distinct ids across calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId()));
    expect(ids.size).toBe(100);
  });
});

describe("findDuplicates", () => {
  it("returns an empty array when all values are unique", () => {
    expect(findDuplicates(["a", "b", "c"])).toEqual([]);
  });

  it("lists each duplicated value exactly once", () => {
    expect(findDuplicates(["a", "b", "a", "c", "b", "a"]).sort()).toEqual([
      "a",
      "b",
    ]);
  });

  it("handles an empty input", () => {
    expect(findDuplicates([])).toEqual([]);
  });
});
