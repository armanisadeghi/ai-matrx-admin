"use client";

/**
 * One Tool call as the page lives it: send it as a durable record (`/tools/calls`), follow it while it
 * runs, pick it up again by id after a reload or a closed tab (same record, no new spend), stop it.
 * The Tool page and every follow-up under it run through this one hook, so a paid answer is never
 * lost and a second press never buys the same answer twice by accident.
 */

import { useEffect, useRef, useState } from "react";
import { cancelHostToolCall, resumeHostToolCall, runHostToolCall } from "@ai-matrx/chat/agents/identity/tool-calls";
import { newToolCallKey, type ToolCallView } from "@ai-matrx/agents/tools";

import { extractErrorMessage } from "@/utils/errors";

import { inputsToSend } from "./toolFacts";

/** The runner gives up on an unreadable record with a typed error (checked by name: the package is not imported for it). */
const lostTouch = (cause: unknown): boolean => cause instanceof Error && cause.name === "ToolCallLostError";
const SAVED = "Your answer is saved. Reopen it to see it.";

export interface ToolCallState {
  view: ToolCallView | null;
  clientError: string | null;
  /** Send one call. `overrides` are inputs layered over `base`; `spendApprovalId` follows a "needs OK". */
  run: (base: Record<string, unknown>, overrides?: Record<string, unknown>, spendApprovalId?: string) => Promise<void>;
  /** Show an earlier call again (a reload, a link). A no-op for the call already shown. */
  resume: (callId: string) => void;
  /** Read the saved call again after a lost connection. */
  reopen: () => void;
  stop: () => void;
  clear: () => void;
  setView: (view: ToolCallView | null) => void;
}

export function useToolCall(toolId: string, onCallId?: (callId: string) => void): ToolCallState {
  const [view, setView] = useState<ToolCallView | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const shown = useRef<string | null>(null);
  const onCall = useRef(onCallId);
  useEffect(() => {
    onCall.current = onCallId;
  });

  useEffect(() => () => abort.current?.abort(), []);

  const run: ToolCallState["run"] = async (base, overrides = {}, spendApprovalId) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setClientError(null);
    try {
      const done = await runHostToolCall({
        request: {
          tool_id: toolId,
          inputs: inputsToSend({ ...base, ...overrides }),
          idempotency_key: newToolCallKey(),
          cache_policy: "prefer",
          spend_approval_id: spendApprovalId ?? null,
          wait_s: 25,
        },
        signal: controller.signal,
        onUpdate: (next) => {
          setView(next);
          if (next.call_id && shown.current !== next.call_id) {
            // Marked as ours so a later `resume` of the same id does not read it again.
            shown.current = next.call_id;
            onCall.current?.(next.call_id);
          }
        },
      });
      setView(done);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setClientError(lostTouch(cause) ? SAVED : extractErrorMessage(cause, "The Tool could not be reached. Nothing was charged."));
    }
  };

  const resume = (callId: string) => {
    if (shown.current === callId) return;
    shown.current = callId;
    const controller = new AbortController();
    abort.current = controller;
    resumeHostToolCall(callId, { signal: controller.signal, onUpdate: setView }).then(setView, (cause: unknown) => {
      if (!controller.signal.aborted) setClientError(lostTouch(cause) ? SAVED : extractErrorMessage(cause, "That answer could not be opened."));
    });
  };

  const reopen = () => {
    if (!shown.current) return;
    const id = shown.current;
    shown.current = null;
    setClientError(null);
    resume(id);
  };

  const stop = () => {
    if (view?.call_id) void cancelHostToolCall(view.call_id).then(setView, () => undefined);
  };

  const clear = () => {
    abort.current?.abort();
    shown.current = null;
    setView(null);
    setClientError(null);
  };

  return { view, clientError, run, resume, reopen, stop, clear, setView };
}
