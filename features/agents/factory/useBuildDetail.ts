"use client";

/**
 * The build the person is watching, whichever engine built it.
 *
 * An id is one of two shapes (D7): an `agent_build` workflow run, or an old build's execution on the
 * spine. Both are read once on mount (a reload restores the view) and both come back as the same
 * `FactoryBuildDetail`.
 *
 * NOTHING POLLS:
 *  - a workflow run is followed on its event feed (`followWorkflowRunStream`: replay from the start,
 *    then live, closing at the run's end); the row is re-read once after a step finishes or the run
 *    waits for an answer or ends, never on a clock;
 *  - an old build that is still running is re-read when the person returns to the tab, or on `reload`.
 */

import { useEffect, useRef, useState } from "react";
import { createRequest } from "@ai-matrx/chat/agents/redux/execution-system/active-requests/active-requests.slice";
import {
  generateConversationId,
  generateRequestId,
} from "@ai-matrx/chat/agents/redux/execution-system/utils/ids";
import {
  followWorkflowRunStream,
  TERMINAL_RUN_EVENTS,
  type WorkflowRunWireEvent,
} from "@ai-matrx/chat/agents/redux/execution-system/thunks/follow-workflow-run-stream";
import { useAppDispatch } from "@/lib/redux/hooks";
import { buildDetailFromRun, changesRowOutputs, gateOfRun, isLoggedNode, type BuildGate, type BuildRunRow, type NodeLogEntry } from "./build-run";
import { readBuildRun } from "./build-run-service";
import { getFactoryBuild } from "./service";
import { spineIsOver, type FactoryBuildDetail } from "./types";

/** How long a burst of step events waits before the row is read once (a delay, not a poll). */
const ROW_READ_SETTLE_MS = 400;
/** The "polls past the end" a settled run reports, so `buildIsSettled` does not wait for an id that is already there. */
const SETTLED_POLLS = 10;

export type BuildEngineKind = "run" | "build";

export interface BuildDetailSnap {
  id: string;
  kind: BuildEngineKind | null;
  detail: FactoryBuildDetail | null;
  gate: BuildGate | null;
  error: string | null;
  polls: number;
}

const NODE_EVENT_KIND: Record<string, NodeLogEntry["kind"]> = {
  node_started: "started",
  node_completed: "completed",
  node_failed: "failed",
  node_skipped: "skipped",
};

export function useBuildDetail(id: string): { snap: BuildDetailSnap | null; reload: () => void } {
  const dispatch = useAppDispatch();
  const [snap, setSnap] = useState<BuildDetailSnap | null>(null);
  const reloadRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    const log: NodeLogEntry[] = [];
    let row: BuildRunRow | null = null;
    let kind: BuildEngineKind | null = null;
    let reading = false;
    let readAgain = false;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let following = false;

    const fail = (e: unknown) => {
      if (live) setSnap({ id, kind, detail: null, gate: null, error: e instanceof Error ? e.message : "Could not load the build", polls: 0 });
    };

    const publishRun = () => {
      if (!live || !row) return;
      const detail = buildDetailFromRun(row, log);
      setSnap({ id, kind: "run", detail, gate: gateOfRun(row), error: null, polls: spineIsOver(detail.spineStatus) ? SETTLED_POLLS : 0 });
    };

    const readRow = async (): Promise<void> => {
      if (reading) {
        readAgain = true;
        return;
      }
      reading = true;
      try {
        const next = await readBuildRun(id, controller.signal);
        if (live && next) {
          row = next;
          publishRun();
        }
      } catch (e) {
        if (live && !controller.signal.aborted) fail(e);
      } finally {
        reading = false;
        if (readAgain && live) {
          readAgain = false;
          void readRow();
        }
      }
    };
    const scheduleRowRead = () => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        settleTimer = null;
        void readRow();
      }, ROW_READ_SETTLE_MS);
    };

    const onEvent = (event: WorkflowRunWireEvent) => {
      const entryKind = NODE_EVENT_KIND[event.event];
      const nodeId = typeof event.node_id === "string" ? event.node_id : null;
      if (entryKind && nodeId && isLoggedNode(nodeId)) {
        log.push({ nodeId, kind: entryKind, at: typeof event.ts === "string" ? event.ts : null });
        publishRun();
      }
      if (
        (entryKind && entryKind !== "started" && nodeId && changesRowOutputs(nodeId)) ||
        event.event === "run_interrupted" ||
        event.event === "run_resumed" ||
        TERMINAL_RUN_EVENTS.has(event.event)
      ) {
        scheduleRowRead();
      }
    };

    const follow = () => {
      if (following) return;
      following = true;
      const ids = { requestId: generateRequestId(), conversationId: generateConversationId() };
      dispatch(createRequest(ids));
      void dispatch(
        followWorkflowRunStream({ runId: id, ...ids, signal: controller.signal, onEvent }),
      ).catch((e: unknown) => {
        if (live && !controller.signal.aborted) console.error("[agent build] the run's event feed ended with an error", e);
      });
    };

    const readOld = async () => {
      try {
        const old = await getFactoryBuild(id, controller.signal);
        if (!live) return;
        kind = "build";
        setSnap({ id, kind, detail: old, gate: null, error: null, polls: old && spineIsOver(old.spineStatus) ? SETTLED_POLLS : 0 });
      } catch (e) {
        if (!controller.signal.aborted) fail(e);
      }
    };

    const start = async () => {
      try {
        const [run, old] = await Promise.all([readBuildRun(id, controller.signal), getFactoryBuild(id, controller.signal)]);
        if (!live) return;
        if (run) {
          row = run;
          kind = "run";
          publishRun();
          follow();
          return;
        }
        kind = "build";
        setSnap({ id, kind, detail: old, gate: null, error: null, polls: old && spineIsOver(old.spineStatus) ? SETTLED_POLLS : 0 });
      } catch (e) {
        if (!controller.signal.aborted) fail(e);
      }
    };

    // An old build still running is re-read when the person comes back to it.
    const onReturn = () => {
      if (document.visibilityState === "visible" && kind === "build") void readOld();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);

    reloadRef.current = () => {
      if (kind === "build") void readOld();
      else void readRow();
    };
    setSnap(null);
    void start();

    return () => {
      live = false;
      controller.abort();
      if (settleTimer) clearTimeout(settleTimer);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [id, dispatch]);

  return { snap: snap?.id === id ? snap : null, reload: () => reloadRef.current() };
}
