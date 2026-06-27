import { describe, expect, it } from "vitest";
import {
  applicationStats,
  applyStageChange,
  isActiveStage,
  isClosedStage,
  parseStageHistory,
  type ApplicationStatRow,
  type StageState,
} from "./application";

const NOW = "2026-06-26T12:00:00.000Z";
const EARLIER = "2026-06-01T09:00:00.000Z";

function state(partial: Partial<StageState> = {}): StageState {
  return { stage: "none", appliedAt: null, stageHistory: [], ...partial };
}

describe("stage classification", () => {
  it("treats applied/interviewing/offer as active", () => {
    expect(isActiveStage("applied")).toBe(true);
    expect(isActiveStage("interviewing")).toBe(true);
    expect(isActiveStage("offer")).toBe(true);
  });

  it("treats none and terminal stages as not active", () => {
    expect(isActiveStage("none")).toBe(false);
    expect(isActiveStage("accepted")).toBe(false);
    expect(isActiveStage("rejected")).toBe(false);
    expect(isActiveStage("withdrawn")).toBe(false);
  });

  it("treats accepted/rejected/withdrawn as closed", () => {
    expect(isClosedStage("accepted")).toBe(true);
    expect(isClosedStage("rejected")).toBe(true);
    expect(isClosedStage("withdrawn")).toBe(true);
    expect(isClosedStage("none")).toBe(false);
    expect(isClosedStage("applied")).toBe(false);
  });
});

describe("applyStageChange", () => {
  it("is a no-op (same reference) when the stage is unchanged", () => {
    const current = state({ stage: "applied", appliedAt: EARLIER });
    expect(applyStageChange(current, "applied", NOW)).toBe(current);
  });

  it("stamps appliedAt on the first move into Applied and appends to the timeline", () => {
    const next = applyStageChange(state(), "applied", NOW);
    expect(next.stage).toBe("applied");
    expect(next.appliedAt).toBe(NOW);
    expect(next.stageHistory).toEqual([{ stage: "applied", at: NOW }]);
  });

  it("stamps appliedAt even when jumping straight to a later stage", () => {
    const next = applyStageChange(state(), "interviewing", NOW);
    expect(next.appliedAt).toBe(NOW);
  });

  it("preserves an existing appliedAt on later transitions", () => {
    const current = state({ stage: "applied", appliedAt: EARLIER });
    const next = applyStageChange(current, "offer", NOW);
    expect(next.appliedAt).toBe(EARLIER);
    expect(next.stageHistory).toEqual([{ stage: "offer", at: NOW }]);
  });

  it("does not stamp appliedAt when moving to a non-applied stage with none set", () => {
    const next = applyStageChange(state(), "rejected", NOW);
    expect(next.appliedAt).toBeNull();
    expect(next.stage).toBe("rejected");
  });

  it("keeps prior history when appending", () => {
    const current = state({
      stage: "applied",
      appliedAt: EARLIER,
      stageHistory: [{ stage: "applied", at: EARLIER }],
    });
    const next = applyStageChange(current, "interviewing", NOW);
    expect(next.stageHistory).toEqual([
      { stage: "applied", at: EARLIER },
      { stage: "interviewing", at: NOW },
    ]);
  });
});

describe("parseStageHistory", () => {
  it("returns [] for null/undefined", () => {
    expect(parseStageHistory(null)).toEqual([]);
    expect(parseStageHistory(undefined)).toEqual([]);
  });

  it("accepts a valid history", () => {
    const history = [
      { stage: "applied", at: EARLIER },
      { stage: "interviewing", at: NOW },
    ];
    expect(parseStageHistory(history)).toEqual(history);
  });

  it("collapses malformed metadata to [] rather than throwing", () => {
    expect(parseStageHistory("nonsense")).toEqual([]);
    expect(parseStageHistory([{ stage: "not-a-stage", at: NOW }])).toEqual([]);
    expect(parseStageHistory([{ stage: "applied" }])).toEqual([]);
  });
});

describe("applicationStats", () => {
  it("is all-zero with a null response rate for no rows", () => {
    expect(applicationStats([])).toEqual({
      total: 0,
      active: 0,
      applied: 0,
      interviewing: 0,
      offers: 0,
      responseRate: null,
    });
  });

  it("counts active, applied, interviewing, and offers", () => {
    const rows: ApplicationStatRow[] = [
      { stage: "none", appliedAt: null },
      { stage: "applied", appliedAt: EARLIER },
      { stage: "interviewing", appliedAt: EARLIER },
      { stage: "offer", appliedAt: EARLIER },
      { stage: "accepted", appliedAt: EARLIER },
      { stage: "rejected", appliedAt: EARLIER },
      { stage: "withdrawn", appliedAt: null },
    ];
    const stats = applicationStats(rows);
    expect(stats.total).toBe(7);
    expect(stats.active).toBe(3); // applied + interviewing + offer
    expect(stats.applied).toBe(5); // every row with appliedAt set
    expect(stats.interviewing).toBe(1);
    expect(stats.offers).toBe(2); // offer + accepted
  });

  it("counts an offer from the timeline even after it was declined or rescinded", () => {
    const rows: ApplicationStatRow[] = [
      {
        stage: "withdrawn",
        appliedAt: EARLIER,
        stageHistory: [
          { stage: "applied", at: EARLIER },
          { stage: "offer", at: NOW },
          { stage: "withdrawn", at: NOW },
        ],
      },
    ];
    expect(applicationStats(rows).offers).toBe(1);
  });

  it("counts a response from the timeline even after a later rejection", () => {
    const rows: ApplicationStatRow[] = [
      // applied, never heard back
      { stage: "applied", appliedAt: EARLIER },
      // interviewed then rejected — still a response
      {
        stage: "rejected",
        appliedAt: EARLIER,
        stageHistory: [
          { stage: "applied", at: EARLIER },
          { stage: "interviewing", at: NOW },
          { stage: "rejected", at: NOW },
        ],
      },
    ];
    const stats = applicationStats(rows);
    expect(stats.applied).toBe(2);
    expect(stats.responseRate).toBe(0.5);
  });

  it("ignores not-yet-applied rows in the response rate", () => {
    const rows: ApplicationStatRow[] = [
      { stage: "none", appliedAt: null },
      { stage: "interviewing", appliedAt: EARLIER },
    ];
    const stats = applicationStats(rows);
    expect(stats.applied).toBe(1);
    expect(stats.responseRate).toBe(1);
  });
});
