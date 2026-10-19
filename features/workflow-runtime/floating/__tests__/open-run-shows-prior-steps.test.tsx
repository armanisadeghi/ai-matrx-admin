/**
 * "OPEN RUN" SHOWS WHAT THE RUN ALREADY DID (Arman, 2026-10-19).
 *
 * The floating run window (opened from the chat's background card) drew one liveness line and the
 * steps rail — for a one-step import that is only the current line, so everything the run had
 * already done was invisible even though the adapter had refolded it from the saved event log.
 * The window now draws the run page's own activity feed under the rail: every prior progress line,
 * then the live ones.
 *
 * Fails when: the floating body stops rendering the run's earlier activity lines.
 */
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("@/features/ai-watch/useCanWatchAi", () => ({ useCanWatchAi: () => false }));
jest.mock("../useRunStepLabels", () => ({ useRunStepLabels: (_id: string, labels: Record<string, string>) => labels }));
jest.mock("@/components/agent-copy/CopyButtons", () => ({ CopyButtons: () => null }));

import { act } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import reducer, { applyRunEvent, attachRun } from "@/features/workflow-runtime/redux/workflow-runs.slice";
import type { WorkflowRunEvent } from "@/features/workflow-runtime/types";
import { FloatingRunBody } from "../FloatingRunBody";

const RUN_ID = "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d";

function ev(seq: number, body: Record<string, unknown>) {
  return applyRunEvent({
    runId: RUN_ID,
    event: { run_id: RUN_ID, step: 1, attempt: 1, ...body } as unknown as WorkflowRunEvent,
    seq,
    replay: true,
  });
}

describe("the floating run window", () => {
  it("lists the run's prior progress, not only the current line", async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const store = configureStore({ reducer: { workflowRuns: reducer } });
    store.dispatch(attachRun({ runId: RUN_ID }));
    for (const action of [
      ev(1, { event: "run_started", ts: "2026-10-19T10:00:00Z" }),
      ev(2, { event: "node_started", node_id: "import", spec_type: "data.notion_import", ts: "2026-10-19T10:00:01Z" }),
      ev(3, { event: "node_progress", node_id: "import", message: "reading: Roster page", ts: "2026-10-19T10:00:05Z" }),
      ev(4, { event: "node_progress", node_id: "import", message: "tables: Players table", ts: "2026-10-19T10:00:20Z" }),
      ev(5, { event: "node_progress", node_id: "import", message: "rows: Players rows", current: 200, total: 431, ts: "2026-10-19T10:01:30Z" }),
    ]) store.dispatch(action);

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <Provider store={store}>
          <FloatingRunBody runId={RUN_ID} stepLabels={{ import: "Import" }} />
        </Provider>,
      );
    });
    const text = host.textContent ?? "";
    expect(text).toContain("Roster page");
    expect(text).toContain("Players table");
    expect(text).toContain("Players rows");
    act(() => root.unmount());
  });
});
