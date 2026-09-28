import { z } from "zod";

/**
 * Application-tracking model (PRD-application-tracking §5, §11). A *tailored* resume doubles as
 * a job application; this pure module is the single source of truth for the application
 * pipeline that lives alongside it on the `public.resumes` row.
 *
 * Deliberately SEPARATE from `status.ts`: `TailoredStatus` (draft/review/ready) is the resume's
 * *readiness* and gates export; `ApplicationStage` is where the user is with the *employer*.
 * Neither derives from the other. See [[m5-tailoring]] and [[multi-resume-and-dashboard]].
 *
 * Pure (no IDs, no DB, no `server-only`) so the `updateApplication` server action, the
 * dashboard's stage badge / detail panel (client components), and the unit tests all share one
 * definition.
 */

/** Every stage, in display order: the forward pipeline first, then the terminal states. */
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

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  none: "Not applied",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/** The forward pipeline the user steps through; terminal stages are set explicitly. */
export const PIPELINE_STAGES: readonly ApplicationStage[] = [
  "none",
  "applied",
  "interviewing",
  "offer",
];
/** Terminal stages that close active tracking. */
export const CLOSED_STAGES: readonly ApplicationStage[] = ["accepted", "rejected", "withdrawn"];

/** Stages where the user is actively pursuing the role (not pre-apply, not closed). */
const ACTIVE_STAGES = new Set<ApplicationStage>(["applied", "interviewing", "offer"]);
/** Reaching any of these stamps `appliedAt` — the application has been submitted. */
const APPLIED_OR_LATER = new Set<ApplicationStage>([
  "applied",
  "interviewing",
  "offer",
  "accepted",
]);
/** Reaching any of these means the employer responded past the initial resume screen. */
const RESPONSE_STAGES = new Set<ApplicationStage>(["interviewing", "offer", "accepted"]);
/** Reaching any of these means the application produced at least one offer. */
const OFFER_OR_LATER = new Set<ApplicationStage>(["offer", "accepted"]);

export function isActiveStage(stage: ApplicationStage): boolean {
  return ACTIVE_STAGES.has(stage);
}

export function isClosedStage(stage: ApplicationStage): boolean {
  return CLOSED_STAGES.includes(stage);
}

// ---------------------------------------------------------------------------
// Stage timeline
// ---------------------------------------------------------------------------

export const stageHistoryEntrySchema = z.object({
  stage: z.enum(APPLICATION_STAGES),
  at: z.string(),
});
export type StageHistoryEntry = z.infer<typeof stageHistoryEntrySchema>;
export const stageHistorySchema = z.array(stageHistoryEntrySchema);

/**
 * Parse a persisted `stage_history` value defensively. Malformed metadata must never block a
 * row from rendering (FR-AT-12), so anything that fails validation collapses to `[]`.
 */
export function parseStageHistory(value: unknown): StageHistoryEntry[] {
  const result = stageHistorySchema.safeParse(value ?? []);
  return result.success ? result.data : [];
}

// ---------------------------------------------------------------------------
// Transition
// ---------------------------------------------------------------------------

export type StageState = {
  stage: ApplicationStage;
  appliedAt: string | null;
  stageHistory: StageHistoryEntry[];
};

/**
 * Compute the next stage state for a stage change (FR-AT-2, FR-AT-3):
 *   - a no-op (same stage) returns the SAME state reference unchanged — never a duplicate
 *     timeline entry, and callers can detect "no change" by `next === current`;
 *   - otherwise the change is appended to the timeline;
 *   - entering an applied-or-later stage for the first time stamps `appliedAt`; an existing
 *     `appliedAt` is preserved (only an explicit user edit changes it).
 */
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

// ---------------------------------------------------------------------------
// Summary stats
// ---------------------------------------------------------------------------

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
  /** Of applied applications, the share that ever drew a response. `null` when none applied. */
  responseRate: number | null;
};

/** Did this application ever reach one of `stages` (current stage OR anywhere in its timeline)? */
function everReached(row: ApplicationStatRow, stages: Set<ApplicationStage>): boolean {
  if (stages.has(row.stage)) return true;
  return (row.stageHistory ?? []).some((entry) => stages.has(entry.stage));
}

/**
 * Pipeline summary for the dashboard strip (PRD-application-tracking §11). `applied` counts any
 * row with `appliedAt` set; `responseRate` consults the timeline so an interview that later
 * ended in rejection still counts as a response.
 */
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
    if (everReached(row, OFFER_OR_LATER)) offers += 1; // "ever reached an offer" (§11)
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
