"use client";

/**
 * Watch AI — open ANY AI run in the "Watch AI" window with one call.
 *
 *   const watchAiRun = useWatchAiRun();
 *   watchAiRun(requestId);                         // a live run (client request id)
 *   watchAiRun({ userRequestId });                 // a recorded run (chat.user_request.id)
 *   watchAiRun({ workflowRunId, label });          // every AI step of a workflow run
 *   watchAiRun({ conversationId });                // every AI turn of a conversation
 *
 * From a thunk / outside React: `dispatch(watchAiRunAction(requestId))`.
 *
 * System admins with debug mode on only (`useCanWatchAi`); the window refuses
 * anyone else. The window reopens after a refresh from the server's record. Contract:
 * common-docs/systems/architecture/execution-runtime/AI-WATCH.md
 */

import { useCallback } from "react";

import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";

const OVERLAY_ID = "aiWatchWindow" as const;

export interface WatchAiRunOptions {
  requestId?: string | null;
  userRequestId?: string | null;
  workflowRunId?: string | null;
  conversationId?: string | null;
  /** With `workflowRunId`: open on this step's call (a Workflow run rail row's AI step). */
  nodeId?: string | null;
  /** List every AI run this tab holds (the sidebar Watch AI light). */
  pageRuns?: boolean;
  label?: string | null;
  /** Stable id to reuse one window per subject. Defaults to the watched id. */
  instanceId?: string;
}

function normalize(target: string | WatchAiRunOptions): WatchAiRunOptions {
  return typeof target === "string" ? { requestId: target } : target;
}

export function watchAiRunAction(target: string | WatchAiRunOptions) {
  const opts = normalize(target);
  const subject =
    opts.requestId ?? opts.userRequestId ?? opts.workflowRunId ?? opts.conversationId ?? "run";
  const instanceId = opts.instanceId ?? `ai-watch:${subject}`;
  return openOverlay({
    overlayId: OVERLAY_ID,
    instanceId,
    data: {
      windowInstanceId: instanceId,
      requestId: opts.requestId ?? null,
      userRequestId: opts.userRequestId ?? null,
      workflowRunId: opts.workflowRunId ?? null,
      conversationId: opts.conversationId ?? null,
      pageRuns: opts.pageRuns ?? false,
      nodeId: opts.nodeId ?? null,
      label: opts.label ?? null,
    },
  });
}

/** The one call: `useWatchAiRun()(requestId | options)`. */
export function useWatchAiRun() {
  const dispatch = useAppDispatch();
  return useCallback(
    (target: string | WatchAiRunOptions) => {
      dispatch(watchAiRunAction(target));
    },
    [dispatch],
  );
}
