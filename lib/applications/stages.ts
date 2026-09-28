import { z } from "zod";

export const APPLICATION_STAGES = [
  "none",
  "applied",
  "interviewing",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export function parseApplicationStage(value: unknown): ApplicationStage {
  return APPLICATION_STAGES.includes(value as ApplicationStage)
    ? (value as ApplicationStage)
    : "none";
}

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  none: "Not applied",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const PIPELINE_STAGES: readonly ApplicationStage[] = [
  "none",
  "applied",
  "interviewing",
  "offer",
];
export const CLOSED_STAGES: readonly ApplicationStage[] = ["accepted", "rejected", "withdrawn"];

const ACTIVE_STAGES = new Set<ApplicationStage>(["applied", "interviewing", "offer"]);
const APPLIED_OR_LATER = new Set<ApplicationStage>([
  "applied",
  "interviewing",
  "offer",
  "accepted",
]);
const RESPONSE_STAGES = new Set<ApplicationStage>(["interviewing", "offer", "accepted"]);
const OFFER_OR_LATER = new Set<ApplicationStage>(["offer", "accepted"]);

export function isActiveStage(stage: ApplicationStage): boolean {
  return ACTIVE_STAGES.has(stage);
}

export function isClosedStage(stage: ApplicationStage): boolean {
  return CLOSED_STAGES.includes(stage);
}

export const stageHistoryEntrySchema = z.object({
  stage: z.enum(APPLICATION_STAGES),
  at: z.string(),
});
export type StageHistoryEntry = z.infer<typeof stageHistoryEntrySchema>;
export const stageHistorySchema = z.array(stageHistoryEntrySchema);

// Malformed stage_history must never block a row from rendering - invalid data collapses to [].
export function parseStageHistory(value: unknown): StageHistoryEntry[] {
  const result = stageHistorySchema.safeParse(value ?? []);
  return result.success ? result.data : [];
}

export type StageState = {
  stage: ApplicationStage;
  appliedAt: string | null;
  stageHistory: StageHistoryEntry[];
};

// A no-op (same stage) returns the SAME state reference unchanged - callers rely on
// `next === current` to detect "no change" rather than a duplicate timeline entry.
export function applyStageChange(
  current: StageState,
  next: ApplicationStage,
  now: string,
): StageState {
  if (next === current.stage) return current;
  return {
    stage: next,
    appliedAt: current.appliedAt ?? (APPLIED_OR_LATER.has(next) ? now : null),
    stageHistory: [...current.stageHistory, { stage: next, at: now }],
  };
}

export type ApplicationStatRow = {
  stage: ApplicationStage;
  appliedAt: string | null;
  stageHistory?: StageHistoryEntry[];
};

export type ApplicationStats = {
  total: number;
  active: number;
  applied: number;
  interviewing: number;
  offers: number;
  responseRate: number | null;
};

function everReached(row: ApplicationStatRow, stages: Set<ApplicationStage>): boolean {
  if (stages.has(row.stage)) return true;
  return (row.stageHistory ?? []).some((entry) => stages.has(entry.stage));
}

// responseRate consults the timeline, so an interview that later ended in rejection
// still counts as a response.
export function applicationStats(rows: ApplicationStatRow[]): ApplicationStats {
  let active = 0;
  let applied = 0;
  let interviewing = 0;
  let offers = 0;
  let responded = 0;

  for (const row of rows) {
    if (isActiveStage(row.stage)) active += 1;
    if (row.appliedAt != null) {
      applied += 1;
      if (everReached(row, RESPONSE_STAGES)) responded += 1;
    }
    if (row.stage === "interviewing") interviewing += 1;
    if (everReached(row, OFFER_OR_LATER)) offers += 1;
  }

  return {
    total: rows.length,
    active,
    applied,
    interviewing,
    offers,
    responseRate: applied > 0 ? responded / applied : null,
  };
}
