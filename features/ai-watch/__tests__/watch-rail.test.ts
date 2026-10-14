/**
 * The page's ONE Watch AI window (2026-10-14): calls grouped by run (newest run first), live calls
 * merged onto their recorded rows, and the newest live call selected — never an older run's call.
 */
import type { WatchableRun } from "@ai-matrx/chat/agents/redux/execution-system/active-requests/active-requests.selectors";
import type { AiWatchRunSummary } from "../ai-watch-records";
import { autoSelection, buildRail, focusKey, UNRECORDED_GROUP } from "../watch-rail";

const rec = (id: string, run: string, at: string, label: string, nodeId: string | null = null): AiWatchRunSummary => ({
  userRequestId: id,
  label,
  status: "completed",
  createdAt: at,
  nodeId,
  workflowRunId: run,
});

const live = (key: string, at: string, server: string | null = key): WatchableRun => ({
  key,
  serverRequestId: server,
  requestIds: [`lane-${key}`],
  conversationId: "c",
  mandateRun: null,
  live: true,
  startedAt: at,
});

const OLD = [rec("u1", "run-old", "2026-10-14T22:00:00Z", "brand_intake.web_result_classifier", "classify")];
const NEW = [
  rec("u2", "run-new", "2026-10-14T23:30:00Z", "brand_intake.early_facts", "facts"),
  rec("u3", "run-new", "2026-10-14T23:30:05Z", "brand_intake.key_people_finder", "key_people"),
];

describe("watch rail", () => {
  it("groups calls by run, newest run first, calls in start order", () => {
    const groups = buildRail([], [...OLD, ...NEW]);
    expect(groups.map((g) => g.id)).toEqual(["run-new", "run-old"]);
    expect(groups[0].calls.map((c) => c.key)).toEqual(["u2", "u3"]);
  });

  it("selects the newest live call, not an older run's completed call", () => {
    const groups = buildRail([live("u2", "2026-10-14T23:30:00Z")], [...OLD, ...NEW]);
    expect(groups[0].calls[0]).toMatchObject({ key: "u2", live: true, status: "live" });
    expect(autoSelection(groups)).toBe("u2");
  });

  it("lists a live call the record has not caught up with, first", () => {
    const groups = buildRail([live("client-9", "2026-10-14T23:31:00Z", null)], [...OLD, ...NEW]);
    expect(groups[0].id).toBe(UNRECORDED_GROUP);
    expect(autoSelection(groups)).toBe("client-9");
  });

  it("with nothing live, selects the newest run's last call", () => {
    expect(autoSelection(buildRail([], [...OLD, ...NEW]))).toBe("u3");
  });

  it("a new run with no AI call yet selects nothing, never the last round's call", () => {
    const groups = buildRail([], [...OLD, ...NEW]);
    expect(autoSelection(groups, "run-newest")).toBeNull();
    expect(autoSelection(groups, "run-new")).toBe("u3");
  });

  it("resolves a Workflow run step's door to that step's call", () => {
    const groups = buildRail([], [...OLD, ...NEW]);
    expect(focusKey(groups, [], { requestId: null, userRequestId: null, nodeId: "key_people", workflowRunId: "run-new" })).toBe("u3");
  });
});
