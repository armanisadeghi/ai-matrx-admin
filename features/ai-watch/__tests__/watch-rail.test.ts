/**
 * The page's ONE Watch AI window (2026-10-14): calls grouped by run (newest run first), live calls
 * merged onto their recorded rows, and the newest live call selected — never an older run's call.
 */
import type { WatchableRun } from "@ai-matrx/chat/agents/redux/execution-system/active-requests/active-requests.selectors";
import type { AiWatchRunSummary } from "../ai-watch-records";
import { autoSelection, buildRail, callKindTitle, focusKey, railGroupHeading, UNRECORDED_GROUP } from "../watch-rail";

const rec = (
  id: string,
  run: string | null,
  at: string,
  label: string,
  nodeId: string | null = null,
  originClass: string | null = run ? "workflow" : null,
): AiWatchRunSummary => ({
  userRequestId: id,
  label,
  status: "completed",
  createdAt: at,
  nodeId,
  workflowRunId: run,
  originClass,
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

  // 2026-10-16: every call with no workflow run on record was headed "Chat" — a factory build, an
  // API caller, a scheduled run. The heading names who started the call; only a person is a Chat.
  it("heads calls outside a workflow run by their real starter, never a blanket Chat", () => {
    const groups = buildRail([], [
      rec("p1", null, "2026-10-14T20:00:00Z", "chat turn", null, "human"),
      rec("s1", null, "2026-10-14T20:01:00Z", "agent_factory.contract", null, "system"),
      rec("a1", null, "2026-10-14T20:02:00Z", "app.city_guide", null, "api"),
      rec("k1", null, "2026-10-14T20:03:00Z", "seo.keyword_classifier", null, "scheduled"),
      ...NEW,
    ]);
    const heading = (callKey: string) =>
      railGroupHeading(groups.find((g) => g.calls.some((c) => c.key === callKey))!, "run-new");
    expect(heading("p1")).toBe("Chat");
    expect(heading("s1")).toBe("System calls");
    expect(heading("a1")).toBe("API calls");
    expect(heading("k1")).toBe("Scheduled calls");
    expect(heading("u2")).toBe("This run");
    expect(new Set(groups.map((g) => g.id)).size).toBe(groups.length);
  });

  // The selected call's transcript section was titled "Chat" for every call (2026-10-16).
  it("titles a call's transcript by its starter; only a person's call is a Chat", () => {
    expect(callKindTitle("human", null)).toBe("Chat");
    expect(callKindTitle("workflow", "run-1")).toBe("Workflow step");
    expect(callKindTitle(null, "run-1")).toBe("Workflow step");
    expect(callKindTitle("system", null)).toBe("System call");
    expect(callKindTitle("api", null)).toBe("API call");
    expect(callKindTitle(null, null)).toBe("Call");
  });
});
