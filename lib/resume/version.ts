/**
 * Schema version constants for the canonical resume document.
 *
 * Every persisted ResumeDoc / GenerationResult carries `schemaVersion`. When the
 * shape changes, bump CURRENT_SCHEMA_VERSION and add a migration step in migrate.ts.
 * Keeping the version here (not inline) gives the schema, migration runner, and
 * factories one source of truth.
 */
export const CURRENT_SCHEMA_VERSION = 1 as const;

export type SchemaVersion = typeof CURRENT_SCHEMA_VERSION;
