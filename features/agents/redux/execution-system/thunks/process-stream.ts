/**
 * Shared Stream Processor — V2 Event System
 *
 * Extracts the NDJSON stream processing logic used by both executeInstance
 * and executeChatInstance into a single reusable function.
 *
 * V2 changes from V1:
 *  - `status_update` → `phase` (closed-enum state machine transitions)
 *  - `data` events now use `type` discriminator (not `event` key)
 *  - `completion` events are part of init/completion pairs with operation/operation_id
 *  - New `init` event for operation start tracking
 *  - Old CompletionStats replaced with UserRequestResult from completion.result
 */

import type { RootState } from "@/lib/redux/store";
import type { CompletionStats } from "@/features/agents/types/instance.types";
import type { ClientMetrics } from "@/features/agents/types/request.types";
import type { ToolLifecycleStatus } from "@/features/agents/types/request.types";
import { parseNdjsonStream } from "@/lib/api/stream-parser";
import {
  isChunkEvent,
  isReasoningChunkEvent,
  isPhaseEvent,
  isInitEvent,
  isCompletionEvent,
  isTypedDataEvent,
  isToolEventEvent,
  isWarningEvent,
  isInfoEvent,
  isErrorEvent,
  isEndEvent,
  isContentBlockEvent,
  isHeartbeatEvent,
  isBrokerEvent,
  isRecordReservedEvent,
  isRecordUpdateEvent,
  type ConversationIdData,
  type ConversationLabeledData,
} from "@/types/python-generated/stream-events";
import {
  addPendingToolCall,
  appendChunk,
  appendReasoningChunk,
  appendDataPayload,
  appendTimeline,
  appendRawEvent,
  markTextStreamStart,
  closeTextRun,
  markReasoningStreamStart,
  closeReasoningRun,
  finalizeAccumulatedText,
  finalizeAccumulatedReasoning,
  finalizeClientMetrics,
  setConversationId,
  setRequestStatus,
  setCurrentPhase,
  trackOperationInit,
  trackOperationCompletion,
  addWarning,
  addInfoEvent,
  upsertReservation,
  upsertContentBlock,
  upsertToolLifecycle,
  setCompletion,
  updateExtractedJson,
} from "../active-requests/active-requests.slice";
import { StreamingJsonTracker } from "@/utils/json/streaming-json-tracker";
import type { ExtractedJsonSnapshot } from "@/features/agents/types/request.types";
import {
  commitAssistantTurn,
  attachClientMetrics,
  setConversationLabel,
} from "../instance-conversation-history/instance-conversation-history.slice";
import { clearUserInput } from "../instance-user-input/instance-user-input.slice";
import { clearAllResources } from "../instance-resources/instance-resources.slice";
import { setInstanceStatus } from "../execution-instances";
import {
  patchAgentConversationMetadata,
  upsertAgentConversationFromExecutionAction,
} from "@/features/agents/redux/agent-conversations";

// =============================================================================
// Types
// =============================================================================

export interface JsonExtractionConfig {
  enabled: boolean;
  /** Enable fuzzy matching (bare blocks, inline) on the finalize pass. Default true. */
  fuzzyOnFinalize?: boolean;
  /** Max JSON values to extract. Default Infinity. */
  maxResults?: number;
}

interface ProcessStreamArgs {
  requestId: string;
  conversationId: string;
  response: Response;
  submitAt: number;
  conversationIdAt: number | null;
  initialConversationId: string | null;
  dispatch: (action: unknown) => unknown;
  getState: () => RootState;
  jsonExtraction?: JsonExtractionConfig;
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
  conversationId,
  response,
  submitAt,
  conversationIdAt,
  initialConversationId,
  dispatch,
  getState,
  jsonExtraction,
}: ProcessStreamArgs): Promise<ProcessStreamResult> {
  const { events } = parseNdjsonStream(response);

  const jsonTracker = jsonExtraction?.enabled
    ? new StreamingJsonTracker({
        maxResults: jsonExtraction.maxResults,
        fuzzyOnFinalize: jsonExtraction.fuzzyOnFinalize ?? true,
      })
    : null;
  let lastJsonRevision = 0;

  let streamServerConversationId = initialConversationId;
  let tokenUsage: { input: number; output: number; total: number } | undefined;
  let finishReason: string | undefined;
  let completionStats: CompletionStats | undefined;

  let clientFirstChunkAt: number | null = null;
  let totalEvents = 0;
  let chunkEvents = 0;
  let reasoningChunkEvents = 0;
  let phaseEvents = 0;
  let initEvents = 0;
  let completionEvents = 0;
  let dataEvents = 0;
  let toolEvents = 0;
  let contentBlockEvents = 0;
  let warningEvents = 0;
  let infoEvents = 0;
  let recordReservedEvents = 0;
  let recordUpdateEvents = 0;
  let otherEvents = 0;
  let totalPayloadBytes = 0;

  let isInTextRun = false;
  let isInReasoningRun = false;
  let unknownEvents = 0;

  const encoder = new TextEncoder();
  for await (const event of events) {
    totalEvents++;
    const now = performance.now();

    dispatch(
      appendRawEvent({
        requestId,
        event: {
          idx: totalEvents,
          timestamp: now,
          eventType: event.event,
          data: event.data,
        },
      }),
    );

    if (isChunkEvent(event)) {
      chunkEvents++;
      if (clientFirstChunkAt === null) clientFirstChunkAt = now;
      const text = event.data.text;
      totalPayloadBytes += encoder.encode(text).length;

      if (isInReasoningRun) {
        isInReasoningRun = false;
        dispatch(closeReasoningRun({ requestId, timestamp: now }));
      }

      if (!isInTextRun) {
        isInTextRun = true;
        dispatch(markTextStreamStart({ requestId, timestamp: now }));
      }

      dispatch(appendChunk({ requestId, content: text }));

      if (jsonTracker) {
        const jsonState = jsonTracker.append(text);
        if (jsonState.revision !== lastJsonRevision) {
          lastJsonRevision = jsonState.revision;
          dispatch(
            updateExtractedJson({
              requestId,
              results: jsonState.results.map(toSnapshot),
              revision: jsonState.revision,
              isComplete: false,
            }),
          );
        }
      }
    } else if (isReasoningChunkEvent(event)) {
      reasoningChunkEvents++;
      const text = event.data.text;
      totalPayloadBytes += encoder.encode(text).length;

      if (isInTextRun) {
        isInTextRun = false;
      }

      if (!isInReasoningRun) {
        isInReasoningRun = true;
        dispatch(markReasoningStreamStart({ requestId, timestamp: now }));
      }

      dispatch(appendReasoningChunk({ requestId, content: text }));
    } else {
      if (isInTextRun) {
        isInTextRun = false;
      }
      if (isInReasoningRun) {
        isInReasoningRun = false;
        dispatch(closeReasoningRun({ requestId, timestamp: now }));
      }

      if (isPhaseEvent(event)) {
        phaseEvents++;
        dispatch(setCurrentPhase({ requestId, phase: event.data.phase }));
        dispatch(
          appendTimeline({
            requestId,
            entry: {
              kind: "phase",
              seq: 0,
              timestamp: now,
              phase: event.data.phase,
            },
          }),
        );
      } else if (isInitEvent(event)) {
        initEvents++;
        const d = event.data;
        dispatch(
          trackOperationInit({
            requestId,
            operationId: d.operation_id,
            operation: d.operation,
            parentOperationId: d.parent_operation_id,
            timestamp: now,
          }),
        );
        dispatch(
          appendTimeline({
            requestId,
            entry: {
              kind: "init",
              seq: 0,
              timestamp: now,
              operation: d.operation,
              operationId: d.operation_id,
              parentOperationId: d.parent_operation_id ?? null,
            },
          }),
        );
      } else if (isCompletionEvent(event)) {
        completionEvents++;
        const d = event.data;
        const result = (d.result ?? {}) as Record<string, unknown>;

        dispatch(
          trackOperationCompletion({
            requestId,
            operationId: d.operation_id,
            operation: d.operation,
            status: d.status,
            result,
            timestamp: now,
          }),
        );

        if (d.operation === "user_request") {
          dispatch(setCompletion({ requestId, data: d }));

          completionStats = result as CompletionStats;

          const totals = completionStats.total_usage?.total;
          if (totals) {
            tokenUsage = {
              input: totals.input_tokens ?? 0,
              output: totals.output_tokens ?? 0,
              total: totals.total_tokens ?? 0,
            };
          }
          finishReason = completionStats.finish_reason ?? undefined;
        }

        dispatch(
          appendTimeline({
            requestId,
            entry: {
              kind: "completion",
              seq: 0,
              timestamp: now,
              operation: d.operation,
              operationId: d.operation_id,
              status: d.status,
            },
          }),
        );
      } else if (isTypedDataEvent(event)) {
        // Every `data` event is:
        //  1. Stored via appendDataPayload (backward compat — feature hooks that
        //     read selectPrimaryResponseDataByTaskId still work unchanged).
        //  2. Promoted to a content block so BlockRenderer can render it inline.
        //
        // A small set of types (conversation_id, conversation_labeled) also
        // trigger Redux side-effects first — they are NOT promoted to blocks
        // because they carry no displayable content.
        //
        // Unknown types get promoted as "unknown_data_event" blocks so nothing
        // is ever silently dropped.
        dataEvents++;
        const d = event.data as Record<string, unknown>;
        const dataType = (d.type as string) ?? "unknown";

        // Always store in data payload store for any feature that reads it directly
        dispatch(appendDataPayload({ requestId, data: d }));

        if (dataType === "conversation_id") {
          // Identity hook — no block; sets conversation ID in state
          const cid = (d as unknown as ConversationIdData).conversation_id;
          if (cid && !streamServerConversationId) {
            streamServerConversationId = cid;
            dispatch(
              setConversationId({
                requestId,
                conversationId: streamServerConversationId,
              }),
            );
            const syncList = upsertAgentConversationFromExecutionAction(
              getState(),
              conversationId,
              streamServerConversationId,
            );
            if (syncList) dispatch(syncList);
          }
        } else if (dataType === "conversation_labeled") {
          // Identity hook — no block; sets conversation label in state
          const labeled = d as unknown as ConversationLabeledData;
          dispatch(
            setConversationLabel({
              conversationId,
              title: labeled.title,
              description: labeled.description ?? null,
              keywords: labeled.keywords ?? null,
            }),
          );
          dispatch(
            patchAgentConversationMetadata({
              conversationId: labeled.conversation_id,
              title: labeled.title,
              description: labeled.description ?? "",
            }),
          );
        } else {
          // All other typed data events → promote to a content block.
          // BlockRenderer has a dedicated case for every known type, plus
          // "unknown_data_event" as a visible catchall for anything new.
          const blockType = [
            "audio_output",
            "image_output",
            "video_output",
            "search_results",
            "search_error",
            "function_result",
            "workflow_step",
            "categorization_result",
            "fetch_results",
            "podcast_complete",
            "podcast_stage",
            "scrape_batch_complete",
            "structured_input_warning",
            "display_questionnaire",
          ].includes(dataType)
            ? dataType
            : "unknown_data_event";

          dispatch(
            upsertContentBlock({
              requestId,
              block: {
                blockId: `data_${dataType}_${totalEvents}`,
                blockIndex: contentBlockEvents,
                type: blockType,
                status: "complete",
                content: null,
                // For unknown types, tag the original dataType so the block can display it
                data:
                  blockType === "unknown_data_event"
                    ? { ...d, _dataType: dataType }
                    : d,
              },
            }),
          );
        }

        dispatch(
          appendTimeline({
            requestId,
            entry: {
              kind: "data",
              seq: 0,
              timestamp: now,
              dataType,
              data: d,
            },
          }),
        );
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
          dispatch(setInstanceStatus({ conversationId, status: "paused" }));
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

        dispatch(
          appendTimeline({
            requestId,
            entry: {
              kind: "tool_event",
              seq: 0,
              timestamp: now,
              subEvent: toolData.event,
              callId: toolData.call_id,
              toolName: toolData.tool_name,
              data: (toolData.data as Record<string, unknown>) ?? null,
            },
          }),
        );
      } else if (isContentBlockEvent(event)) {
        contentBlockEvents++;
        dispatch(
          upsertContentBlock({
            requestId,
            block: event.data,
          }),
        );
        dispatch(
          appendTimeline({
            requestId,
            entry: {
              kind: "content_block",
              seq: 0,
              timestamp: now,
              blockId: event.data.blockId,
              blockType: event.data.type,
              blockStatus: event.data.status,
            },
          }),
        );
      } else if (isWarningEvent(event)) {
        warningEvents++;
        dispatch(addWarning({ requestId, warning: event.data }));
        dispatch(
          appendTimeline({
            requestId,
            entry: {
              kind: "warning",
              seq: 0,
              timestamp: now,
              code: event.data.code,
              level: event.data.level ?? "medium",
              recoverable: event.data.recoverable ?? true,
              userMessage: event.data.user_message ?? null,
              systemMessage: event.data.system_message,
            },
          }),
        );
      } else if (isInfoEvent(event)) {
        infoEvents++;
        dispatch(addInfoEvent({ requestId, info: event.data }));
        dispatch(
          appendTimeline({
            requestId,
            entry: {
              kind: "info",
              seq: 0,
              timestamp: now,
              code: event.data.code,
              userMessage: event.data.user_message ?? null,
              systemMessage: event.data.system_message,
            },
          }),
        );
      } else if (isRecordReservedEvent(event)) {
        recordReservedEvents++;
        const d = event.data;
        dispatch(
          upsertReservation({
            requestId,
            recordId: d.record_id,
            dbProject: d.db_project,
            table: d.table,
            status: "pending",
            parentRefs: d.parent_refs,
            metadata: d.metadata,
          }),
        );

        if (d.table === "cx_conversation" && !streamServerConversationId) {
          streamServerConversationId = d.record_id;
          dispatch(
            setConversationId({
              requestId,
              conversationId: streamServerConversationId,
            }),
          );
          const syncListCx = upsertAgentConversationFromExecutionAction(
            getState(),
            conversationId,
            streamServerConversationId,
          );
          if (syncListCx) dispatch(syncListCx);
        }

        dispatch(
          appendTimeline({
            requestId,
            entry: {
              kind: "record_reserved",
              seq: 0,
              timestamp: now,
              table: d.table,
              recordId: d.record_id,
              dbProject: d.db_project,
              parentRefs: d.parent_refs ?? {},
            },
          }),
        );
      } else if (isRecordUpdateEvent(event)) {
        recordUpdateEvents++;
        const d = event.data;
        dispatch(
          upsertReservation({
            requestId,
            recordId: d.record_id,
            dbProject: d.db_project,
            table: d.table,
            status: d.status,
            metadata: d.metadata,
          }),
        );
        dispatch(
          appendTimeline({
            requestId,
            entry: {
              kind: "record_update",
              seq: 0,
              timestamp: now,
              table: d.table,
              recordId: d.record_id,
              status: d.status,
            },
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
        dispatch(setInstanceStatus({ conversationId, status: "error" }));
        dispatch(
          appendTimeline({
            requestId,
            entry: {
              kind: "error",
              seq: 0,
              timestamp: now,
              errorType: event.data.error_type,
              message: event.data.user_message ?? event.data.message,
              isFatal,
            },
          }),
        );
      } else if (isEndEvent(event)) {
        otherEvents++;
        const currentState = getState();
        const currentRequest =
          currentState.activeRequests.byRequestId[requestId];
        if (currentRequest?.status !== "error") {
          dispatch(setRequestStatus({ requestId, status: "complete" }));
          dispatch(setInstanceStatus({ conversationId, status: "complete" }));
        }
        dispatch(
          appendTimeline({
            requestId,
            entry: {
              kind: "end",
              seq: 0,
              timestamp: now,
              reason: event.data.reason,
            },
          }),
        );
      } else if (isBrokerEvent(event)) {
        otherEvents++;
        dispatch(
          appendDataPayload({
            requestId,
            data: { broker: event.data },
          }),
        );
        dispatch(
          appendTimeline({
            requestId,
            entry: {
              kind: "broker",
              seq: 0,
              timestamp: now,
              brokerId: event.data.broker_id,
            },
          }),
        );
      } else if (isHeartbeatEvent(event)) {
        otherEvents++;
        dispatch(
          appendTimeline({
            requestId,
            entry: {
              kind: "heartbeat",
              seq: 0,
              timestamp: now,
            },
          }),
        );
      } else {
        unknownEvents++;
        otherEvents++;
        console.warn(
          `[stream:${requestId.slice(0, 8)}] Unrecognized event type: "${event.event}"`,
          event,
        );
        dispatch(
          appendTimeline({
            requestId,
            entry: {
              kind: "unknown",
              seq: 0,
              timestamp: now,
              originalEvent: String(event.event ?? "undefined"),
              rawData: event.data,
            },
          }),
        );
      }
    }
  }

  if (unknownEvents > 0) {
    console.warn(
      `[stream:${requestId.slice(0, 8)}] Stream completed with ${unknownEvents} unrecognized event(s)`,
    );
  }

  if (isInTextRun) {
    dispatch(closeTextRun({ requestId, timestamp: performance.now() }));
  }
  if (isInReasoningRun) {
    dispatch(closeReasoningRun({ requestId, timestamp: performance.now() }));
  }

  const postLoopState = getState();
  const postLoopRequest = postLoopState.activeRequests.byRequestId[requestId];
  if (
    postLoopRequest &&
    postLoopRequest.status !== "complete" &&
    postLoopRequest.status !== "error"
  ) {
    dispatch(setRequestStatus({ requestId, status: "complete" }));
    dispatch(setInstanceStatus({ conversationId, status: "complete" }));
  }

  const streamEndAt = performance.now();

  dispatch(finalizeAccumulatedText({ requestId }));
  dispatch(finalizeAccumulatedReasoning({ requestId }));

  if (jsonTracker) {
    const finalJsonState = jsonTracker.finalize();
    dispatch(
      updateExtractedJson({
        requestId,
        results: finalJsonState.results.map(toSnapshot),
        revision: finalJsonState.revision,
        isComplete: true,
      }),
    );
  }

  const finalState = getState();
  const finalRequest = finalState.activeRequests.byRequestId[requestId];
  const completedText = finalRequest?.accumulatedText ?? "";
  const finalConversationId =
    finalRequest?.serverConversationId ?? streamServerConversationId ?? null;
  const finalErrorMessage =
    finalRequest?.status === "error"
      ? (finalRequest.errorMessage ?? null)
      : null;

  // Collect completed content blocks to persist in the turn (audio, images, etc.)
  const completedContentBlocks =
    finalRequest && finalRequest.contentBlockOrder.length > 0
      ? finalRequest.contentBlockOrder
          .map((id) => finalRequest.contentBlocks[id])
          .filter(
            (b): b is NonNullable<typeof b> =>
              b != null && b.status === "complete",
          )
          .map((b) => b as unknown as Record<string, unknown>)
      : undefined;

  dispatch(
    commitAssistantTurn({
      conversationId,
      requestId,
      content: completedText,
      serverConversationId: finalConversationId,
      ...(tokenUsage && { tokenUsage }),
      ...(finishReason && { finishReason }),
      ...(completionStats && { completionStats }),
      ...(finalErrorMessage && { errorMessage: finalErrorMessage }),
      ...(completedContentBlocks && { contentBlocks: completedContentBlocks }),
    }),
  );

  dispatch(clearUserInput(conversationId));
  dispatch(clearAllResources(conversationId));

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
    reasoningChunkEvents,
    phaseEvents,
    initEvents,
    completionEvents,
    dataEvents,
    toolEvents,
    contentBlockEvents,
    warningEvents,
    infoEvents,
    recordReservedEvents,
    recordUpdateEvents,
    otherEvents,
    accumulatedTextBytes,
    totalPayloadBytes,
  };

  dispatch(finalizeClientMetrics({ requestId, metrics: clientMetrics }));
  dispatch(attachClientMetrics({ conversationId, requestId, clientMetrics }));

  return {
    conversationId: finalConversationId,
    completionStats,
    tokenUsage,
    finishReason,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function toSnapshot(extracted: {
  value: unknown;
  type: "object" | "array" | "primitive";
  source: "fenced" | "bare-block" | "inline" | "whole-string";
  isComplete: boolean;
  repairApplied: boolean;
  warnings: string[];
}): ExtractedJsonSnapshot {
  return {
    value: extracted.value,
    type: extracted.type,
    source: extracted.source,
    isComplete: extracted.isComplete,
    repairApplied: extracted.repairApplied,
    warnings: extracted.warnings,
  };
}
