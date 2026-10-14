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

/**
 * THE ONE WINDOW (2026-10-14): every Watch AI door opens the page's single window — a list of every
 * AI call of this page's runs on the left, the chosen call on the right. A door's target only moves
 * the selection; it never stacks a second window (three Watch AI windows piled up on one round).
 */
export const AI_WATCH_PAGE_INSTANCE = "ai-watch:page" as const;

export interface WatchAiRunOptions {
  requestId?: string | null;
  userRequestId?: string | null;
  workflowRunId?: string | null;
  conversationId?: string | null;
  /** With `workflowRunId`: select this step's call (a Workflow run rail row's AI step). */
  nodeId?: string | null;
  label?: string | null;
}

function normalize(target: string | WatchAiRunOptions): WatchAiRunOptions {
  return typeof target === "string" ? { requestId: target } : target;
}

export function watchAiRunAction(target: string | WatchAiRunOptions = {}) {
  const opts = normalize(target);
  return openOverlay({
    overlayId: OVERLAY_ID,
    instanceId: AI_WATCH_PAGE_INSTANCE,
    data: {
      windowInstanceId: AI_WATCH_PAGE_INSTANCE,
      requestId: opts.requestId ?? null,
      userRequestId: opts.userRequestId ?? null,
      workflowRunId: opts.workflowRunId ?? null,
      conversationId: opts.conversationId ?? null,
      nodeId: opts.nodeId ?? null,
      label: opts.label ?? null,
      // A new door press re-applies its target even when it names the same call again.
      focusAt: Date.now(),
    },
  });
}

/** The one call: `useWatchAiRun()(requestId | options)`. */
export function useWatchAiRun() {
  const dispatch = useAppDispatch();
  return useCallback(
    (target: string | WatchAiRunOptions = {}) => {
      dispatch(watchAiRunAction(target));
    },
    [dispatch],
  );
}
