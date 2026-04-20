"use client";

/**
 * useAiPostProcess — orchestrates launching an AI post-processing agent
 * for a VoicePadAi instance and exposes its streaming state.
 *
 * Flow:
 *   1. Caller picks an agent + supplies transcript + optional user context.
 *   2. process() creates a manual agent instance, writes the transcript into
 *      the agent's transcript variable, writes user context into the agent's
 *      context slot (when the agent declares one), and fires executeInstance.
 *   3. The returned `conversationId` is tracked locally. Redux selectors read
 *      the resulting ActiveRequest for status + streaming text.
 *
 * Execution is dispatched fire-and-forget — Redux state is the source of truth
 * for streaming progress, so we do not await the thunk.
 */

import { useCallback, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { createManualInstance } from "@/features/agents/redux/execution-system/thunks/create-instance.thunk";
import { executeInstance } from "@/features/agents/redux/execution-system/thunks/execute-instance.thunk";
import { setUserVariableValues } from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.slice";
import { setContextEntries } from "@/features/agents/redux/execution-system/instance-context/instance-context.slice";
import {
  selectPrimaryRequest,
  selectAccumulatedText,
  selectRequestStatus,
} from "@/features/agents/redux/execution-system/active-requests/active-requests.selectors";
import type { AiPostProcessAgent } from "../ai-agents";

export type AiProcessPhase =
  | "idle"
  | "launching"
  | "pending"
  | "connecting"
  | "streaming"
  | "awaiting-tools"
  | "complete"
  | "error"
  | "cancelled"
  | "timeout";

interface ProcessArgs {
  agent: AiPostProcessAgent;
  transcript: string;
  context: string;
}

export function useAiPostProcess() {
  const dispatch = useAppDispatch();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useAppSelector((s) =>
    conversationId ? selectPrimaryRequest(conversationId)(s) : undefined,
  );
  const requestId = request?.requestId ?? null;
  const requestStatus = useAppSelector((s) =>
    requestId ? selectRequestStatus(requestId)(s) : undefined,
  );
  const accumulatedText = useAppSelector((s) =>
    requestId ? selectAccumulatedText(requestId)(s) : "",
  );

  const phase: AiProcessPhase = launching
    ? "launching"
    : (requestStatus as AiProcessPhase | undefined) ?? "idle";

  const isBusy =
    phase === "launching" ||
    phase === "pending" ||
    phase === "connecting" ||
    phase === "streaming" ||
    phase === "awaiting-tools";

  const process = useCallback(
    async ({ agent, transcript, context }: ProcessArgs) => {
      setError(null);
      setLaunching(true);
      try {
        const cid = await dispatch(
          createManualInstance({
            agentId: agent.id,
            sourceFeature: "voice-pad-ai",
            apiEndpointMode: "agent",
            displayMode: "background",
            autoRun: false,
          }),
        ).unwrap();

        dispatch(
          setUserVariableValues({
            conversationId: cid,
            values: { [agent.transcriptVariableKey]: transcript },
          }),
        );

        if (agent.contextSlotKey && context.trim().length > 0) {
          dispatch(
            setContextEntries({
              conversationId: cid,
              entries: [
                {
                  key: agent.contextSlotKey,
                  value: context,
                  slotMatched: true,
                },
              ],
            }),
          );
        }

        setConversationId(cid);
        // Fire-and-forget: Redux state tracks progress.
        dispatch(executeInstance({ conversationId: cid }));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLaunching(false);
      }
    },
    [dispatch],
  );

  const reset = useCallback(() => {
    setConversationId(null);
    setError(null);
    setLaunching(false);
  }, []);

  return {
    conversationId,
    requestId,
    phase,
    isBusy,
    accumulatedText,
    error,
    process,
    reset,
  };
}
