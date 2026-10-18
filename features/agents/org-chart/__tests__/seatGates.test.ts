import { seatGatesByPosition } from "../seatGates";
import { buildAgentOrgForest } from "../buildAgentOrgForest";
import type { WaitingRunRow } from "@/features/workflow-runtime/discovery/waiting";

const row = (runId: string, seat: Record<string, unknown> | null): WaitingRunRow => ({
  runId,
  definitionId: null,
  workflowName: null,
  status: "interrupted",
  kind: "interrupt",
  title: null,
  prompt: null,
  missing: [],
  stale: false,
  askedAt: null,
  deadline: null,
  parentRunId: null,
  checkpointId: null,
  decision: seat ? { items: [], seat } : null,
});

describe("seat gates on the org chart", () => {
  it("groups open gates by the seat they name, newest first, and says when the seat is empty", () => {
    const gates = seatGatesByPosition([
      row("run-2", { position_id: "seat-a", notice: "Waiting on Arman (Brand owner)", filled: true }),
      row("run-1", { position_id: "seat-a", notice: "older", filled: true }),
      row("run-3", { position_id: "seat-b", notice: "No one holds Brand strategist", filled: false }),
      row("run-4", null),
    ]);
    expect(gates["seat-a"]).toEqual({ count: 2, notice: "Waiting on Arman (Brand owner)", filled: true, runId: "run-2" });
    expect(gates["seat-b"]).toMatchObject({ count: 1, filled: false });
    expect(Object.keys(gates)).toHaveLength(2);
  });

  it("draws a person seated in an Orchestra under its Conductor as a directed position", () => {
    const forest = buildAgentOrgForest({
      orchestras: new Map([["cond", { members: [], seats: [{ positionId: "seat-a", roleTitle: "Brand owner" }] }]]),
      conductorIds: new Set(["cond"]),
      manualEdges: [],
    });
    const conductor = forest.find((n) => n.key.includes("cond"));
    const child = conductor?.children[0];
    expect(child?.data.boxId).toBe("position:seat-a");
    expect(child?.edgeKind).toBe("directs");
  });
});
