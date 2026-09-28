import { CURRENT_SCHEMA_VERSION } from "./version";
import { ResumeDocSchema, type ResumeDoc } from "./schema";

export class CorruptDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorruptDocumentError";
  }
}

export class UnsupportedVersionError extends Error {
  constructor(version: number) {
    super(`Unsupported schema version: ${version} (current is ${CURRENT_SCHEMA_VERSION})`);
    this.name = "UnsupportedVersionError";
  }
}

export class MissingMigrationError extends Error {
  constructor(from: number) {
    super(`No migration step from schema version ${from}`);
    this.name = "MissingMigrationError";
  }
}

type ResumeRecord = Record<string, unknown>;
type Migration = { from: number; to: number; up: (doc: ResumeRecord) => ResumeRecord };

// Append { from, to, up } steps here when CURRENT_SCHEMA_VERSION is bumped.
const MIGRATIONS: Migration[] = [];

function readSchemaVersion(input: unknown): number {
  if (typeof input !== "object" || input === null) {
    throw new CorruptDocumentError("Document is not an object");
  }
  const version = (input as ResumeRecord).schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    throw new CorruptDocumentError("Document is missing a valid schemaVersion");
  }
  return version;
}

export function migrate(input: unknown): ResumeDoc {
  const version = readSchemaVersion(input);
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new UnsupportedVersionError(version);
  }

  let doc = input as ResumeRecord;
  let current = version;
  while (current < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS.find((m) => m.from === current);
    if (!step) throw new MissingMigrationError(current);
    doc = step.up(doc);
    current = step.to;
    doc.schemaVersion = current;
  }

  return ResumeDocSchema.parse(doc);
}
