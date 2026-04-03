/**
 * Shared Stream Processor
 *
 * Extracts the NDJSON stream processing logic used by both executeInstance
 * and executeChatInstance into a single reusable function.
 *
 * Handles:
 *  - Event dispatch for all stream event types (chunk, status, data, tool, content_block, etc.)
 *  - Client-side event counters and timing metrics
 *  - Post-stream finalization (accumulated text, assistant turn commit, input clear)
 */

import type { RootState } from "@/lib/redux/store";
import type { CompletionStats } from "@/features/agents/types/instance.types";
import type { ClientMetrics } from "@/features/agents/types/request.types";
import type { ToolLifecycleStatus } from "@/features/agents/types/request.types";
import { parseNdjsonStream } from "@/lib/api/stream-parser";
import {
  isChunkEvent,
  isToolEventEvent,
  isEndEvent,
  isErrorEvent,
  isStatusUpdateEvent,
  isDataEvent,
  isCompletionEvent,
  isContentBlockEvent,
  isHeartbeatEvent,
  isBrokerEvent,
} from "@/types/python-generated/stream-events";
import {
  addPendingToolCall,
  appendChunk,
  appendDataPayload,
  finalizeAccumulatedText,
  finalizeClientMetrics,
  setConversationId,
  setRequestStatus,
  setCurrentStatus,
  upsertContentBlock,
  upsertToolLifecycle,
  setCompletion,
} from "../active-requests/active-requests.slice";
import {
  commitAssistantTurn,
  attachClientMetrics,
} from "../instance-conversation-history/instance-conversation-history.slice";
import { clearUserInput } from "../instance-user-input/instance-user-input.slice";
import { clearAllResources } from "../instance-resources/instance-resources.slice";
import { setInstanceStatus } from "../execution-instances";

// =============================================================================
// Types
// =============================================================================

interface ProcessStreamArgs {
  requestId: string;
  instanceId: string;
  response: Response;
  submitAt: number;
  conversationIdAt: number | null;
  initialConversationId: string | null;
  dispatch: (action: unknown) => unknown;
  getState: () => RootState;
}

export interface ProcessStreamResult {
  conversationId: string | null;
  completionStats: CompletionStats | undefined;
  tokenUsage: { input: number; output: number; total: number } | undefined;
  finishReason: string | undefined;
}

// =============================================================================
// Processor
// =============================================================================

export async function processStream({
  requestId,
  instanceId,
  response,
  submitAt,
  conversationIdAt,
  initialConversationId,
  dispatch,
  getState,
}: ProcessStreamArgs): Promise<ProcessStreamResult> {
  const { events } = parseNdjsonStream(response);

  let conversationId = initialConversationId;
  let tokenUsage: { input: number; output: number; total: number } | undefined;
  let finishReason: string | undefined;
  let completionStats: CompletionStats | undefined;

  let clientFirstChunkAt: number | null = null;
  let totalEvents = 0;
  let chunkEvents = 0;
  let dataEvents = 0;
  let toolEvents = 0;
  let contentBlockEvents = 0;
  let statusUpdateEvents = 0;
  let otherEvents = 0;
  let totalPayloadBytes = 0;

  const encoder = new TextEncoder();
  for await (const event of events) {
    totalEvents++;

    if (isChunkEvent(event)) {
      chunkEvents++;
      if (clientFirstChunkAt === null) clientFirstChunkAt = performance.now();
      const text = event.data.text;
      totalPayloadBytes += encoder.encode(text).length;
      dispatch(appendChunk({ requestId, content: text }));
    } else if (isStatusUpdateEvent(event)) {
      statusUpdateEvents++;
      dispatch(setCurrentStatus({ requestId, status: event.data }));
    } else if (isDataEvent(event)) {
      dataEvents++;
      const data = event.data as Record<string, unknown>;
      if (
        data.event === "conversation_id" &&
        typeof data.conversation_id === "string" &&
        !conversationId
      ) {
        conversationId = data.conversation_id;
        dispatch(setConversationId({ requestId, conversationId }));
      } else {
        dispatch(appendDataPayload({ requestId, data }));
      }
    } else if (isToolEventEvent(event)) {
      toolEvents++;
      const toolData = event.data;

      if (toolData.event === "tool_delegated") {
        dispatch(
          addPendingToolCall({
            requestId,
            toolCall: {
              callId: toolData.call_id,
              toolName: toolData.tool_name,
              arguments: (toolData.data as Record<string, unknown>) ?? {},
            },
          }),
        );
        dispatch(
          upsertToolLifecycle({
            requestId,
            callId: toolData.call_id,
            toolName: toolData.tool_name,
            status: "started",
            arguments: (toolData.data as Record<string, unknown>) ?? {},
            isDelegated: true,
          }),
        );
        dispatch(setInstanceStatus({ instanceId, status: "paused" }));
      } else {
        const lifecycleStatus = toolData.event.replace(
          "tool_",
          "",
        ) as ToolLifecycleStatus;

        dispatch(
          upsertToolLifecycle({
            requestId,
            callId: toolData.call_id,
            toolName: toolData.tool_name,
            status: lifecycleStatus,
            message: toolData.message,
            data: toolData.data as Record<string, unknown> | null,
            ...(toolData.event === "tool_completed" && {
              result: (toolData.data as Record<string, unknown>)?.result,
            }),
            ...(toolData.event === "tool_result_preview" && {
              resultPreview: (toolData.data as Record<string, unknown>)
                ?.preview as string | undefined,
            }),
            ...(toolData.event === "tool_error" && {
              errorType: (toolData.data as Record<string, unknown>)
                ?.error_type as string | undefined,
              errorMessage: toolData.message,
            }),
          }),
        );
      }
    } else if (isContentBlockEvent(event)) {
      contentBlockEvents++;
      dispatch(
        upsertContentBlock({
          requestId,
          block: event.data,
        }),
      );
    } else if (isCompletionEvent(event)) {
      otherEvents++;
      const d = event.data as Record<string, unknown>;

      completionStats = {
        status: (d.status as string) ?? "complete",
        iterations: (d.iterations as number) ?? 1,
        finish_reason: (d.finish_reason as string) ?? "stop",
        total_usage: (d.total_usage as CompletionStats["total_usage"]) ?? {
          by_model: {},
          total: {
            input_tokens: 0,
            output_tokens: 0,
            cached_input_tokens: 0,
            total_tokens: 0,
            total_requests: 0,
            unique_models: 0,
            total_cost: 0,
          },
        },
        timing_stats: (d.timing_stats as CompletionStats["timing_stats"]) ?? {
          total_duration: 0,
          api_duration: 0,
          tool_duration: 0,
          iterations: 1,
          avg_iteration_duration: 0,
        },
        tool_call_stats:
          (d.tool_call_stats as CompletionStats["tool_call_stats"]) ?? {
            total_tool_calls: 0,
            iterations_with_tools: 0,
            by_tool: {},
          },
        metadata: d.metadata ?? null,
      };

      const totalUsage = completionStats.total_usage?.total;
      if (totalUsage) {
        tokenUsage = {
          input: totalUsage.input_tokens,
          output: totalUsage.output_tokens,
          total: totalUsage.total_tokens,
        };
      }
      finishReason = completionStats.finish_reason;

      dispatch(
        setCompletion({
          requestId,
          data: event.data,
        }),
      );
    } else if (isErrorEvent(event)) {
      otherEvents++;
      const isFatal = true;
      dispatch(
        setRequestStatus({
          requestId,
          status: "error",
          errorMessage: event.data.user_message ?? event.data.message,
          isFatal,
        }),
      );
      dispatch(setInstanceStatus({ instanceId, status: "error" }));
    } else if (isEndEvent(event)) {
      otherEvents++;
      dispatch(setRequestStatus({ requestId, status: "complete" }));
      dispatch(setInstanceStatus({ instanceId, status: "complete" }));
    } else if (isBrokerEvent(event)) {
      otherEvents++;
      dispatch(
        appendDataPayload({
          requestId,
          data: { broker: event.data },
        }),
      );
    } else if (isHeartbeatEvent(event)) {
      otherEvents++;
    }
  }

  const streamEndAt = performance.now();

  dispatch(finalizeAccumulatedText({ requestId }));

  const finalState = getState();
  const completedText =
    finalState.activeRequests.byRequestId[requestId]?.accumulatedText ?? "";
  const finalConversationId =
    finalState.activeRequests.byRequestId[requestId]?.conversationId ??
    conversationId;

  dispatch(
    commitAssistantTurn({
      instanceId,
      requestId,
      content: completedText,
      conversationId: finalConversationId,
      ...(tokenUsage && { tokenUsage }),
      ...(finishReason && { finishReason }),
      ...(completionStats && { completionStats }),
    }),
  );

  dispatch(clearUserInput(instanceId));
  dispatch(clearAllResources(instanceId));

  const renderCompleteAt = performance.now();

  const internalLatencyMs =
    conversationIdAt !== null ? conversationIdAt - submitAt : null;
  const ttftMs =
    clientFirstChunkAt !== null ? clientFirstChunkAt - submitAt : null;
  const streamDurationMs =
    clientFirstChunkAt !== null ? streamEndAt - clientFirstChunkAt : null;
  const renderDelayMs = renderCompleteAt - streamEndAt;
  const totalClientDurationMs = renderCompleteAt - submitAt;

  const accumulatedTextBytes = new TextEncoder().encode(completedText).length;

  const clientMetrics: ClientMetrics = {
    submitAt,
    conversationIdAt,
    firstChunkAt: clientFirstChunkAt,
    streamEndAt,
    renderCompleteAt,
    internalLatencyMs,
    ttftMs,
    streamDurationMs,
    renderDelayMs,
    totalClientDurationMs,
    totalEvents,
    chunkEvents,
    dataEvents,
    toolEvents,
    contentBlockEvents,
    statusUpdateEvents,
    otherEvents,
    accumulatedTextBytes,
    totalPayloadBytes,
  };

  dispatch(finalizeClientMetrics({ requestId, metrics: clientMetrics }));
  dispatch(attachClientMetrics({ instanceId, requestId, clientMetrics }));

  return {
    conversationId: finalConversationId,
    completionStats,
    tokenUsage,
    finishReason,
  };
}
