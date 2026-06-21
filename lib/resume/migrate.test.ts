import { describe, expect, it } from "vitest";
import {
  CorruptDocumentError,
  MissingMigrationError,
  UnsupportedVersionError,
  migrate,
} from "./migrate";
import { createEmptyResumeDoc } from "./factory";
import { CURRENT_SCHEMA_VERSION } from "./version";

describe("migrate", () => {
  it("returns a current-version document unchanged (identity)", () => {
    const doc = createEmptyResumeDoc();
    const migrated = migrate(structuredClone(doc));
    expect(migrated).toEqual(doc);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("throws CorruptDocumentError for a non-object", () => {
    expect(() => migrate(null)).toThrow(CorruptDocumentError);
    expect(() => migrate(42)).toThrow(CorruptDocumentError);
  });

  it("throws CorruptDocumentError when schemaVersion is missing or invalid", () => {
    expect(() => migrate({ blocks: [] })).toThrow(CorruptDocumentError);
    expect(() => migrate({ schemaVersion: "1", blocks: [] })).toThrow(CorruptDocumentError);
  });

  it("throws UnsupportedVersionError for a version newer than current", () => {
    expect(() => migrate({ schemaVersion: CURRENT_SCHEMA_VERSION + 1, blocks: [] })).toThrow(
      UnsupportedVersionError,
    );
  });

  it("throws MissingMigrationError for an older version with no step", () => {
    expect(() => migrate({ schemaVersion: 0, blocks: [] })).toThrow(MissingMigrationError);
  });

  it("throws when the final shape is invalid", () => {
    expect(() => migrate({ schemaVersion: CURRENT_SCHEMA_VERSION, blocks: "nope" })).toThrow();
  });
});
