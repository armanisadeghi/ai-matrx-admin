/**
 * Watch AI lists only AI runs (VISION Part 18 item 6). A workflow run mints a lane per node,
 * deterministic steps included; the raw registry listed every step as "AI run" and dropped them
 * when the run ended. A lane counts once the server named its AI run; a chat turn always counts.
 * Forcing: an unbound lane is excluded, the same lane bound to a server run is included and is
 * "automated" (auto-watch), and a chat request is included and is not automated.
 */
import type { WatchableRun } from "@ai-matrx/chat/agents/redux/execution-system/active-requests/active-requests.selectors";
import { RunLaneManager } from "@/features/workflow-runtime/redux/lane-manager";
import { isAutomatedRun, selectPageAiRuns } from "../page-ai-runs";
import type { RootState } from "@/lib/redux/store";

function run(requestId: string, serverRequestId: string | null): WatchableRun {
  return { key: serverRequestId ?? requestId, serverRequestId, requestIds: [requestId], conversationId: "c", mandateRun: null, live: true, startedAt: "2026-10-14T00:00:00Z" } as WatchableRun;
}

describe("page AI runs", () => {
  it("keeps chat turns and bound lanes, drops deterministic steps", () => {
    const manager = new RunLaneManager(() => undefined as never);
    const lane = manager.ensureLane("run-1", "probe")!;
    const aiLane = manager.ensureLane("run-1", "we_think")!;
    const byRequestId = {
      [lane.requestId]: { requestId: lane.requestId, serverRequestId: null, status: "streaming", startedAt: "1", conversationId: "a" },
      [aiLane.requestId]: { requestId: aiLane.requestId, serverRequestId: "ur-1", status: "streaming", startedAt: "2", conversationId: "b" },
      chat: { requestId: "chat", serverRequestId: null, status: "streaming", startedAt: "3", conversationId: "c" },
    };
    const state = { activeRequests: { byRequestId } } as unknown as RootState;
    const keys = selectPageAiRuns(state).map((r) => r.key).sort();
    expect(keys).toEqual(["chat", "ur-1"]);
    expect(isAutomatedRun(run(aiLane.requestId, "ur-1"))).toBe(true);
    expect(isAutomatedRun(run("chat", null))).toBe(false);
    expect(isAutomatedRun(run(lane.requestId, null))).toBe(false);
  });
});
