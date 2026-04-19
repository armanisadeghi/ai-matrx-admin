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
  isRenderBlockEvent,
  isHeartbeatEvent,
  isBrokerEvent,
  isRecordReservedEvent,
  isRecordUpdateEvent,
  type ConversationIdData,
  type ConversationLabeledData,
  type UntypedDataPayload,
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
  finalizeAccumulatedReasoning,
  finalizeClientMetrics,
  setRequestStatus,
  setCurrentPhase,
  trackOperationInit,
  trackOperationCompletion,
  addWarning,
  addInfoEvent,
  upsertReservation,
  upsertRenderBlock,
  upsertToolLifecycle,
  setCompletion,
  updateExtractedJson,
} from "../active-requests/active-requests.slice";
import { confirmServerSync } from "../conversations/conversations.slice";
import { assertConversationIdMatches } from "../utils/assert-conversation-id";
import { StreamingJsonTracker } from "@/utils/json/streaming-json-tracker";
import { StreamBlockAccumulator } from "../utils/stream-block-accumulator";
import type { ExtractedJsonSnapshot } from "@/features/agents/types/request.types";
import {
  setConversationLabel,
  reserveMessage,
  updateMessageRecord,
  promoteMessageId,
} from "../messages/messages.slice";
import {
  upsertUserRequest,
  patchUserRequest,
  upsertRequest,
  upsertToolCall,
  patchToolCall,
  type CxUserRequestRecord,
  type CxRequestRecord,
  type CxToolCallRecord,
} from "../observability";
import { clearUserInput } from "../instance-user-input/instance-user-input.slice";
import { clearAllResources } from "../instance-resources/instance-resources.slice";
import { resetUserVariableValues } from "../instance-variable-values/instance-variable-values.slice";
import { setInstanceStatus } from "../conversations";
import {
  patchAgentConversationMetadata,
  upsertAgentConversationFromExecutionAction,
} from "@/features/agents/redux/conversation-list";
import { StreamProfiler } from "@/utils/stream-profiler";
import { assembleMessageParts } from "../utils/assemble-cx-content-blocks";
import { callbackManager } from "@/utils/callbackManager";
import {
  isWidgetActionName,
  type WidgetActionName,
  type WidgetHandle,
} from "@/features/agents/types/widget-handle.types";
import { selectWidgetHandleIdFor } from "../instance-ui-state/instance-ui-state.selectors";
import { dispatchWidgetAction } from "./dispatch-widget-action.thunk";

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
  dispatch: (action: unknown) => unknown;
  getState: () => RootState;
  jsonExtraction?: JsonExtractionConfig;
  /**
   * The client-generated id under which the user's optimistic message was
   * pushed into `messages.byId` before the API call fired. When the server
   * streams `record_reserved cx_message` with role=user, the processor
   * uses this to `promoteMessageId(clientTempId → serverId)` so the same
   * Redux record carries the final server id with no duplication.
   */
  userMessageClientTempId?: string;
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
  dispatch,
  getState,
  jsonExtraction,
  userMessageClientTempId,
}: ProcessStreamArgs): Promise<ProcessStreamResult> {
  const { events } = parseNdjsonStream(response);

  const jsonTracker = jsonExtraction?.enabled
    ? new StreamingJsonTracker({
        maxResults: jsonExtraction.maxResults,
        fuzzyOnFinalize: jsonExtraction.fuzzyOnFinalize ?? true,
      })
    : null;
  let lastJsonRevision = 0;

  let cxConversationConfirmed = false;
  let tokenUsage: { input: number; output: number; total: number } | undefined;
  let finishReason: string | undefined;
  let completionStats: CompletionStats | undefined;

  // Server-assigned ids captured from `record_reserved` events. Threaded into
  // the commit path so the final assistant turn (and any DB-faithful mirror)
  // use the server ids — never fake client-generated ones. Position +
  // userRequestId are captured but not consumed yet; the next wave
  // (Phase 8: message CRUD + observability flush) picks them up.
  let reservedAssistantMessageId: string | null = null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let reservedAssistantPosition: number | null = null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let reservedUserRequestId: string | null = null;

  // Maps the provider's opaque `call_id` (used by activeRequests.toolLifecycle)
  // to the DB-side `cx_tool_call.id` (used by observability.toolCalls). Both
  // ids are known at `record_reserved cx_tool_call` time — we just need to
  // remember the association so that when the live-stream tool_event fires
  // later (keyed by call_id) we can patch the right observability row.
  const toolCallIdByProviderCallId = new Map<string, string>();

  let clientFirstChunkAt: number | null = null;
  let totalEvents = 0;
  let chunkEvents = 0;
  let reasoningChunkEvents = 0;
  let phaseEvents = 0;
  let initEvents = 0;
  let completionEvents = 0;
  let dataEvents = 0;
  let toolEvents = 0;
  let renderBlockEvents = 0;
  let warningEvents = 0;
  let infoEvents = 0;
  let recordReservedEvents = 0;
  let recordUpdateEvents = 0;
  let otherEvents = 0;

  let isInTextRun = false;
  let isInReasoningRun = false;
  let unknownEvents = 0;

  StreamProfiler.getInstance().start(requestId);

  const blockAccumulator = new StreamBlockAccumulator(
    requestId,
    upsertRenderBlock,
  );

  let textBuffer = "";
  let reasoningBuffer = "";
  let rafHandle: number | null = null;
  let pendingJsonState: { results: any[]; revision: number } | null = null;

  const dispatchBatch = () => {
    if (rafHandle !== null) {
      if (typeof window !== "undefined" && window.cancelAnimationFrame) {
        cancelAnimationFrame(rafHandle);
      } else {
        clearTimeout(rafHandle);
      }
      rafHandle = null;
    }

    if (textBuffer.length > 0) {
      const flushed = textBuffer;
      dispatch(appendChunk({ requestId, content: flushed }));
      blockAccumulator.ingest(flushed, dispatch);
      textBuffer = "";
    }
    // appendChunk now only increments chunkCount and sets firstChunkAt.
    // The actual text content is written exclusively via blockAccumulator → upsertRenderBlock.
    if (reasoningBuffer.length > 0) {
      dispatch(appendReasoningChunk({ requestId, content: reasoningBuffer }));
      reasoningBuffer = "";
    }
    if (pendingJsonState !== null) {
      dispatch(
        updateExtractedJson({
          requestId,
          results: pendingJsonState.results,
          revision: pendingJsonState.revision,
          isComplete: false,
        }),
      );
      pendingJsonState = null;
    }
  };

  const scheduleBatchEvent = () => {
    if (rafHandle === null) {
      // Throttling down to ~30fps (30ms delay) rather than rAF's 60fps (16ms)
      // because feeding 12,000 character strings to react-markdown 60x a second
      // will mathematically freeze the browser main thread.
      rafHandle = setTimeout(dispatchBatch, 30) as any;
    }
  };

  for await (const event of events) {
    totalEvents++;
    const now = performance.now();

    // Chunk and reasoning_chunk are the hot path (thousands per stream).
    // They skip appendRawEvent — their data lives in textChunks/reasoningChunks.
    // Using the type guards directly preserves TypeScript narrowing on event.data.

    if (isChunkEvent(event)) {
      StreamProfiler.getInstance().trackChunk();
      chunkEvents++;
      if (clientFirstChunkAt === null) clientFirstChunkAt = now;
      const text = event.data.text;

      if (isInReasoningRun) {
        dispatchBatch();
        isInReasoningRun = false;
        dispatch(closeReasoningRun({ requestId, timestamp: now }));
      }

      if (!isInTextRun) {
        isInTextRun = true;
        dispatch(markTextStreamStart({ requestId, timestamp: now }));
      }

      textBuffer += text;

      if (jsonTracker) {
        const jsonState = jsonTracker.append(text);
        if (jsonState.revision !== lastJsonRevision) {
          lastJsonRevision = jsonState.revision;
          pendingJsonState = {
            results: jsonState.results.map(toSnapshot),
            revision: jsonState.revision,
          };
        }
      }

      scheduleBatchEvent();
      continue;
    }

    if (isReasoningChunkEvent(event)) {
      reasoningChunkEvents++;
      const text = event.data.text;

      if (isInTextRun) {
        dispatchBatch();
        isInTextRun = false;
      }

      if (!isInReasoningRun) {
        isInReasoningRun = true;
        dispatch(markReasoningStreamStart({ requestId, timestamp: now }));
      }

      reasoningBuffer += text;
      scheduleBatchEvent();
      continue;
    }

    // All non-chunk events: flush pending text first to preserve chronological order
    dispatchBatch();

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
      dataEvents++;
      const d = event.data;
      const dataType = d.type ?? "unknown";

      dispatch(appendDataPayload({ requestId, data: d }));

      if (d.type === "conversation_id") {
        const convData = d as ConversationIdData;
        assertConversationIdMatches(
          conversationId,
          convData.conversation_id,
          "conversation_id-data-event",
        );
      } else if (d.type === "conversation_labeled") {
        const labeled = d as ConversationLabeledData;
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

        const blockData: Record<string, unknown> =
          blockType === "unknown_data_event"
            ? { ...(d as UntypedDataPayload), _dataType: dataType }
            : (d as unknown as Record<string, unknown>);

        dispatch(
          upsertRenderBlock({
            requestId,
            block: {
              blockId: `data_${dataType}_${totalEvents}`,
              blockIndex: renderBlockEvents,
              type: blockType,
              status: "complete",
              content: null,
              data: blockData,
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
            data: d as Record<string, unknown>,
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

        if (isWidgetActionName(toolData.tool_name)) {
          // Widget actions resolve fast and fire-and-forget from the stream's
          // POV — the microtask batcher posts results back so the server can
          // resume without us having to flip the instance to "paused".
          dispatch(
            dispatchWidgetAction({
              conversationId,
              requestId,
              callId: toolData.call_id,
              toolName: toolData.tool_name as WidgetActionName,
              args:
                ((toolData.data as Record<string, unknown>)
                  ?.arguments as Record<string, unknown>) ?? {},
            }),
          );
        } else {
          // Non-widget delegated tool — preserve the legacy pause for any
          // server-coordinated flow that still expects the client to
          // suspend the instance while it executes.
          dispatch(setInstanceStatus({ conversationId, status: "paused" }));
        }
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
    } else if (isRenderBlockEvent(event)) {
      renderBlockEvents++;
      dispatch(
        upsertRenderBlock({
          requestId,
          block: event.data,
        }),
      );
      dispatch(
        appendTimeline({
          requestId,
          entry: {
            kind: "render_block",
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

      // ── Per-table dispatch into the DB-faithful slices ─────────────────
      //
      // record_reserved arrives BEFORE any content lands. We seed:
      //   • messages.byId[record_id]     with status "reserved" (empty content)
      //   • observability.userRequests   (cx_user_request)
      //   • observability.requests       (cx_request)
      //   • observability.toolCalls      (cx_tool_call)
      //
      // The content of an assistant message is committed later in the
      // `completion` / `end` path via `updateMessageRecord`, which writes
      // the final `CxContentBlock[]` into the same `byId` slot. Live
      // stream writes here are metadata-only — no re-render storm on the
      // message body.
      if (d.table === "cx_message") {
        const meta = d.metadata as
          | { role?: string; position?: number }
          | undefined;
        const parents = d.parent_refs as
          | { conversation_id?: string }
          | undefined;
        const role =
          (meta?.role as "user" | "assistant" | "system") ?? "assistant";
        const position = typeof meta?.position === "number" ? meta.position : 0;
        const owningConversationId =
          parents?.conversation_id ?? conversationId;

        if (role === "user" && userMessageClientTempId) {
          // Promote the optimistic user record to the server id. The record
          // already carries the user's content, so no further patch needed
          // here — the stream just swaps the key.
          dispatch(
            promoteMessageId({
              conversationId: owningConversationId,
              oldId: userMessageClientTempId,
              newId: d.record_id,
              position,
            }),
          );
        } else {
          dispatch(
            reserveMessage({
              conversationId: owningConversationId,
              messageId: d.record_id,
              role,
              position,
            }),
          );
        }

        if (role === "assistant") {
          reservedAssistantMessageId = d.record_id;
          reservedAssistantPosition = position;
        }
      } else if (d.table === "cx_user_request") {
        reservedUserRequestId = d.record_id;
        const parents = d.parent_refs as
          | { conversation_id?: string }
          | undefined;
        const nowIso = new Date().toISOString();
        dispatch(
          upsertUserRequest({
            id: d.record_id,
            conversationId: parents?.conversation_id ?? conversationId,
            // Fields unknown at reservation time; server fills them in on
            // record_update / completion. Sensible zeros keep selectors safe.
            userId: "",
            agentId: null,
            agentVersionId: null,
            status: "pending",
            iterations: 0,
            finishReason: null,
            error: null,
            triggerMessagePosition: null,
            resultStartPosition: null,
            resultEndPosition: null,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalCachedTokens: 0,
            totalTokens: 0,
            totalToolCalls: 0,
            totalCost: null,
            totalDurationMs: null,
            apiDurationMs: null,
            toolDurationMs: null,
            sourceApp: "",
            sourceFeature: "",
            metadata: (d.metadata ?? {}) as CxUserRequestRecord["metadata"],
            createdAt: nowIso,
            completedAt: null,
            deletedAt: null,
          }),
        );
      } else if (d.table === "cx_request") {
        const parents = d.parent_refs as
          | { conversation_id?: string; user_request_id?: string }
          | undefined;
        const meta = d.metadata as { iteration?: number } | undefined;
        const nowIso = new Date().toISOString();
        dispatch(
          upsertRequest({
            id: d.record_id,
            conversationId: parents?.conversation_id ?? conversationId,
            userRequestId: parents?.user_request_id ?? "",
            aiModelId: "",
            apiClass: null,
            iteration: typeof meta?.iteration === "number" ? meta.iteration : 0,
            responseId: null,
            finishReason: null,
            inputTokens: null,
            cachedTokens: null,
            outputTokens: null,
            totalTokens: null,
            cost: null,
            totalDurationMs: null,
            apiDurationMs: null,
            toolDurationMs: null,
            toolCallsCount: null,
            toolCallsDetails: null,
            metadata: (d.metadata ?? {}) as CxRequestRecord["metadata"],
            createdAt: nowIso,
            deletedAt: null,
          }),
        );
      } else if (d.table === "cx_tool_call") {
        const parents = d.parent_refs as
          | {
              conversation_id?: string;
              user_request_id?: string;
              call_id?: string;
            }
          | undefined;
        const meta = d.metadata as
          | { tool_name?: string; call_id?: string; iteration?: number }
          | undefined;
        const nowIso = new Date().toISOString();
        // Record the call_id → DB id mapping so tool_event patches land on
        // the correct observability row.
        const providerCallId = meta?.call_id ?? parents?.call_id;
        if (providerCallId) {
          toolCallIdByProviderCallId.set(providerCallId, d.record_id);
        }
        dispatch(
          upsertToolCall({
            id: d.record_id,
            conversationId: parents?.conversation_id ?? conversationId,
            userRequestId: parents?.user_request_id ?? null,
            messageId: null,
            userId: "",
            callId: meta?.call_id ?? parents?.call_id ?? "",
            toolName: meta?.tool_name ?? "",
            toolType: "",
            iteration: typeof meta?.iteration === "number" ? meta.iteration : 0,
            status: "pending",
            success: false,
            isError: null,
            errorType: null,
            errorMessage: null,
            arguments: {} as CxToolCallRecord["arguments"],
            output: null,
            outputChars: 0,
            outputPreview: null,
            outputType: null,
            inputTokens: null,
            outputTokens: null,
            totalTokens: null,
            costUsd: null,
            durationMs: 0,
            startedAt: nowIso,
            completedAt: nowIso,
            parentCallId: null,
            retryCount: null,
            persistKey: null,
            filePath: null,
            executionEvents: null,
            metadata: (d.metadata ?? {}) as CxToolCallRecord["metadata"],
            createdAt: nowIso,
            deletedAt: null,
          }),
        );
      } else if (d.table === "cx_conversation") {
        assertConversationIdMatches(
          conversationId,
          d.record_id,
          "record_reserved-cx_conversation",
        );
        if (!cxConversationConfirmed) {
          cxConversationConfirmed = true;
          dispatch(confirmServerSync(conversationId));
          const syncListCx = upsertAgentConversationFromExecutionAction(
            getState(),
            conversationId,
            conversationId,
          );
          if (syncListCx) dispatch(syncListCx);
        }
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

      // Per-table status patch into the DB-faithful slices. These updates
      // deliberately ONLY touch the `status` field — never content —
      // so subscribers rendering message bodies don't re-render on
      // bookkeeping status changes. (See Phase 5.3 re-render audit.)
      if (d.table === "cx_message") {
        dispatch(
          updateMessageRecord({
            conversationId,
            messageId: d.record_id,
            patch: { status: d.status },
          }),
        );
      } else if (d.table === "cx_user_request") {
        dispatch(
          patchUserRequest({
            id: d.record_id,
            patch: {
              status: d.status,
              completedAt:
                d.status === "completed" || d.status === "failed"
                  ? new Date().toISOString()
                  : null,
            },
          }),
        );
      } else if (d.table === "cx_tool_call") {
        // Stamp `completedAt` whenever the tool-call record transitions —
        // "active" / "completed" / "failed" all mark the row as no longer
        // reserved and give us the server's timestamp.
        dispatch(
          patchToolCall({
            id: d.record_id,
            patch: {
              status: d.status,
              completedAt: new Date().toISOString(),
            },
          }),
        );
      }

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
      const errorMessage = event.data.user_message ?? event.data.message;
      dispatch(
        setRequestStatus({
          requestId,
          status: "error",
          errorMessage,
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
            message: errorMessage,
            isFatal,
          },
        }),
      );

      // Widget handle lifecycle: fire onError at stream-level errors too,
      // not only for widget_* tool failures (dispatcher fires those already).
      const errWidgetHandleId = selectWidgetHandleIdFor(
        getState(),
        conversationId,
      );
      if (errWidgetHandleId) {
        const handle = callbackManager.get<WidgetHandle>(errWidgetHandleId);
        handle?.onError?.({
          reason: event.data.error_type ?? "stream_error",
          message: errorMessage ?? undefined,
        });
      }
    } else if (isEndEvent(event)) {
      otherEvents++;
      const currentState = getState();
      const currentRequest = currentState.activeRequests.byRequestId[requestId];
      if (currentRequest?.status !== "error") {
        dispatch(setRequestStatus({ requestId, status: "complete" }));
        dispatch(setInstanceStatus({ conversationId, status: "complete" }));

        // Widget handle lifecycle: fire onComplete at stream end (success
        // path only). Fires for EVERY display mode — the previous call site
        // in launch-agent-execution.thunk.ts:439 only fired in the narrow
        // autoRun + direct/background/inline branch.
        const endWidgetHandleId = selectWidgetHandleIdFor(
          getState(),
          conversationId,
        );
        if (endWidgetHandleId) {
          const handle = callbackManager.get<WidgetHandle>(endWidgetHandleId);
          if (handle?.onComplete) {
            const responseText =
              currentRequest?.renderBlockOrder
                .map((id) => currentRequest.renderBlocks[id]?.content ?? "")
                .join("\n") || "";
            handle.onComplete({
              conversationId,
              requestId,
              responseText,
            });
          }
        }
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
          data: { type: "broker", broker: event.data } as UntypedDataPayload,
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
      const _exhaustive: never = event;
      const unhandled = _exhaustive as { event?: string; data?: unknown };
      unknownEvents++;
      otherEvents++;
      console.warn(
        `[stream:${requestId.slice(0, 8)}] Unrecognized event type: "${unhandled.event}"`,
        unhandled,
      );
      dispatch(
        appendTimeline({
          requestId,
          entry: {
            kind: "unknown",
            seq: 0,
            timestamp: now,
            originalEvent: String(unhandled.event ?? "undefined"),
            rawData: unhandled.data,
          },
        }),
      );
    }
  }

  if (unknownEvents > 0) {
    console.warn(
      `[stream:${requestId.slice(0, 8)}] Stream completed with ${unknownEvents} unrecognized event(s)`,
    );
  }

  // Final flush of any trailing buffers after the loop ends
  dispatchBatch();
  blockAccumulator.finalize(dispatch);

  if (isInTextRun) {
    dispatch(closeTextRun({ requestId, timestamp: performance.now() }));
  }
  if (isInReasoningRun) {
    dispatch(closeReasoningRun({ requestId, timestamp: performance.now() }));
  }

  StreamProfiler.getInstance().stopAndReport("Stream Performance Result", {
    tokens: tokenUsage,
    timing: completionStats?.timing_stats,
  });

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
  const finalErrorMessage =
    finalRequest?.status === "error"
      ? (finalRequest.errorMessage ?? null)
      : null;

  // Assemble the DB-compatible CxContentBlock[] from the completed request.
  // This is the single source of truth for the persisted assistant content —
  // exactly what cx_message.content stores. We write it to messages.byId
  // (keyed by the server-assigned cx_message.id reserved earlier in the
  // stream) via `updateMessageRecord`. No parallel legacy path.
  const cxContentBlocks = finalRequest
    ? assembleMessageParts(finalRequest)
    : [];

  if (reservedAssistantMessageId) {
    dispatch(
      updateMessageRecord({
        conversationId,
        messageId: reservedAssistantMessageId,
        patch: {
          content: cxContentBlocks as unknown as import(
            "@/types/database.types"
          ).Json,
          status: "active",
          _clientStatus: finalErrorMessage ? "error" : "complete",
          ...(typeof reservedAssistantPosition === "number" && {
            position: reservedAssistantPosition,
          }),
        },
      }),
    );
  }

  // Flush live tool lifecycle state into the observability slice. Each tool
  // call was reserved earlier (cx_tool_call record_reserved) so the
  // observability entries already exist — patch them now with the final
  // live-state results (output, status, duration, error info). We map
  // provider call_id → DB record_id via the map populated during the
  // reservation event.
  if (finalRequest?.toolLifecycle) {
    for (const [callId, lc] of Object.entries(finalRequest.toolLifecycle)) {
      const dbId = toolCallIdByProviderCallId.get(callId);
      if (!dbId) continue; // reservation wasn't observed — skip safely
      const startedAt = lc.startedAt ?? null;
      const completedAt = lc.completedAt ?? null;
      const durationMs =
        startedAt && completedAt
          ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
          : 0;
      const outputStr =
        lc.result !== undefined && lc.result !== null
          ? typeof lc.result === "string"
            ? lc.result
            : JSON.stringify(lc.result)
          : null;
      dispatch(
        patchToolCall({
          id: dbId,
          patch: {
            status: lc.status,
            success: lc.status === "completed",
            isError: lc.status === "error" ? true : null,
            errorType: lc.errorType ?? null,
            errorMessage: lc.errorMessage ?? null,
            arguments: (lc.arguments ?? {}) as CxToolCallRecord["arguments"],
            output: outputStr,
            outputChars: outputStr?.length ?? 0,
            outputPreview: (lc.resultPreview ??
              null) as CxToolCallRecord["outputPreview"],
            durationMs,
            ...(startedAt ? { startedAt } : {}),
            ...(completedAt ? { completedAt } : {}),
          },
        }),
      );
    }
  }

  dispatch(clearUserInput(conversationId));
  dispatch(clearAllResources(conversationId));
  dispatch(resetUserVariableValues(conversationId));

  const renderCompleteAt = performance.now();

  const internalLatencyMs =
    conversationIdAt !== null ? conversationIdAt - submitAt : null;
  const ttftMs =
    clientFirstChunkAt !== null ? clientFirstChunkAt - submitAt : null;
  const streamDurationMs =
    clientFirstChunkAt !== null ? streamEndAt - clientFirstChunkAt : null;
  const renderDelayMs = renderCompleteAt - streamEndAt;
  const totalClientDurationMs = renderCompleteAt - submitAt;

  // Derive completed text from the assembled content blocks — the active
  // request no longer stores an `accumulatedText` field (textChunks are
  // folded directly into content blocks).
  const completedText = cxContentBlocks
    .filter(
      (b): b is { type: "text"; text: string } =>
        typeof b === "object" &&
        b !== null &&
        (b as { type?: unknown }).type === "text" &&
        typeof (b as { text?: unknown }).text === "string",
    )
    .map((b) => b.text)
    .join("");
  const completedReasoning = finalRequest?.accumulatedReasoning ?? "";
  const encoder = new TextEncoder();
  const accumulatedTextBytes = encoder.encode(completedText).length;
  const totalPayloadBytes =
    accumulatedTextBytes + encoder.encode(completedReasoning).length;

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
    renderBlockEvents: renderBlockEvents,
    warningEvents,
    infoEvents,
    recordReservedEvents,
    recordUpdateEvents,
    otherEvents,
    accumulatedTextBytes,
    totalPayloadBytes,
  };

  dispatch(finalizeClientMetrics({ requestId, metrics: clientMetrics }));

  return {
    conversationId,
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
