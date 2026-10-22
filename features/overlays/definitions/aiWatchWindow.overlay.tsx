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

import { useMemo } from "react";

import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { createOpener } from "@ai-matrx/summon/opener";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "aiWatchWindow" as const;
const opener = createOpener<Record<string, unknown>>(OVERLAY_ID);

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
  return opener.openAction(
    {
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
    AI_WATCH_PAGE_INSTANCE,
  );
}

/** The one call: `useWatchAiRun()(requestId | options)`. */
/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
export function createWatchAiRunOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (target: string | WatchAiRunOptions = {}) => {
    dispatch(watchAiRunAction(target));
  };
}

export function useWatchAiRun() {
  const store = useAppStore();
  return useMemo(() => createWatchAiRunOpener(store), [store]);
}

export type AiWatchWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    aiWatchWindow: OverlayWire<AiWatchWindowDefinitionData>;
  }
}
