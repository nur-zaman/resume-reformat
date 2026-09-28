// When the doc shape changes, bump this and add a migration step in migrate.ts.
export const CURRENT_SCHEMA_VERSION = 1 as const;

export type SchemaVersion = typeof CURRENT_SCHEMA_VERSION;
