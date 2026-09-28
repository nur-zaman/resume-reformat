import { z } from "zod";

export const UuidSchema = z.uuid();

export function newId(): string {
  return crypto.randomUUID();
}

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
