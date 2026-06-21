import { z } from "zod";

/**
 * Stable identifier helpers for the canonical resume document.
 *
 * Every block and nested entry/category/contact/link carries a UUID so AI review
 * metadata and editor actions key off stable ids rather than array indexes. IDs are
 * minted here (and only here, plus the editor via factory.ts) so validation stays a
 * pure, deterministic, re-parse-idempotent function — the schema never mints.
 */

/** A v4 UUID string, the id format used throughout the document. */
export const UuidSchema = z.uuid();

/**
 * Mint a fresh stable id. Thin wrapper over the platform `crypto.randomUUID()`
 * (available in supported browsers and Node ≥ the project target) so tests can mock
 * a single seam and no `uuid` dependency is needed.
 */
export function newId(): string {
  return crypto.randomUUID();
}

/** Return the values that appear more than once, each listed a single time. */
export function findDuplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      dupes.add(value);
    } else {
      seen.add(value);
    }
  }
  return [...dupes];
}
