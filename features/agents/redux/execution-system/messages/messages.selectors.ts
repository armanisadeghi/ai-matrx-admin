import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type { ConversationTurn, MessageRecord } from "./messages.slice";
import type { CompletionStats } from "@/features/agents/types/instance.types";
import type { ClientMetrics } from "@/features/agents/types/request.types";
import type {
  ContentSegment,
  ContentSegmentText,
  ContentSegmentDbTool,
  ContentSegmentThinking,
} from "../active-requests/active-requests.selectors";
import type { ToolCallPart } from "@/types/python-generated/stream-events";
import type { ApiEndpointMode } from "@/features/agents/types/instance.types";

const EMPTY_TURNS: ConversationTurn[] = [];
const EMPTY_MESSAGE_RECORDS: MessageRecord[] = [];
const EMPTY_IDS: string[] = [];

export const selectConversationTurns =
  (conversationId: string) =>
  (state: RootState): ConversationTurn[] =>
    state.messages.byConversationId[conversationId]?.turns ?? EMPTY_TURNS;

// ---------------------------------------------------------------------------
// DB-faithful selectors (Phase 1.3)
// ---------------------------------------------------------------------------

/** Raw MessageRecord list (DB-shaped), ordered by `position`. */
export const selectMessageRecords = (conversationId: string) =>
  createSelector(
    (state: RootState) =>
      state.messages.byConversationId[conversationId]?.orderedIds,
    (state: RootState) => state.messages.byConversationId[conversationId]?.byId,
    (orderedIds, byId): MessageRecord[] => {
      if (!orderedIds || !byId || orderedIds.length === 0)
        return EMPTY_MESSAGE_RECORDS;
      const out: MessageRecord[] = [];
      for (const id of orderedIds) {
        const rec = byId[id];
        if (rec) out.push(rec);
      }
      return out.length === 0 ? EMPTY_MESSAGE_RECORDS : out;
    },
  );

export const selectOrderedMessageIds =
  (conversationId: string) =>
  (state: RootState): string[] =>
    state.messages.byConversationId[conversationId]?.orderedIds ?? EMPTY_IDS;

export const selectMessageById =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId];

// ---------------------------------------------------------------------------
// Narrow field selectors — re-render safety
// ---------------------------------------------------------------------------
//
// Message-body components do expensive work: markdown parsing, renderBlock
// compilation, tool-call visualization, LaTeX, etc. We must NOT re-render
// those components when only bookkeeping fields (status, _clientStatus)
// change — which happens frequently during a live stream (record_reserved
// → record_update "active" → completion). These narrow selectors return
// a referentially-stable value per field: only the exact subscribers of
// the changed field rerun.
//
// Usage:
//   const content = useAppSelector(selectMessageContent(cid, mid));
//   const status  = useAppSelector(selectMessageStatus(cid, mid));
//   <MessageBody content={content} />  // only rerenders on content change
//   <StatusDot status={status} />      // only rerenders on status change
//
// IMPORTANT: `selectMessageById` returns the full record, so subscribing
// to it WILL re-render on every field change. Prefer these narrow
// selectors for anything involving heavy rendering.
// ---------------------------------------------------------------------------

export const selectMessageContent =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["content"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]?.content;

export const selectMessageStatus =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["status"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]?.status;

export const selectMessageClientStatus =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["_clientStatus"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]
      ?._clientStatus;

export const selectMessageRole =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["role"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]?.role;

export const selectMessagePosition =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["position"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]
      ?.position;

export const selectMessageAgentId =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["agentId"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]?.agentId;

export const selectMessageMetadata =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["metadata"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]
      ?.metadata;

export const selectMessageContentHistoryRecord =
  (conversationId: string, messageId: string) =>
  (state: RootState): MessageRecord["contentHistory"] | undefined =>
    state.messages.byConversationId[conversationId]?.byId?.[messageId]
      ?.contentHistory;

/**
 * Projects a DB-faithful `MessageRecord` onto the legacy `ConversationTurn`
 * shape consumers render today. The DB-side `content` is `CxContentBlock[]`
 * (Json); we extract a flat-text projection for consumers that still read
 * `turn.content: string`, and pass the block array through as
 * `cxContentBlocks` for consumers that render richly.
 *
 * The turn's `turnId` is the server-assigned `cx_message.id` (not a
 * client-generated UUID), which is what makes this CRUD-ready — React keys,
 * menu ids, etc. all line up with the DB row without a translation table.
 */
function messageRecordToDisplayTurn(record: MessageRecord): ConversationTurn {
  // Flat text extraction: walk the CxContentBlock[] and join every block
  // that has a `.text` string. Tool calls / thinking blocks without text
  // are skipped. Consumers that need rich rendering use `cxContentBlocks`
  // directly.
  let flatText = "";
  const blocks = Array.isArray(record.content)
    ? (record.content as Array<{ type?: string; text?: string }>)
    : [];
  for (const block of blocks) {
    if (typeof block?.text === "string" && block.text.length > 0) {
      if (flatText.length > 0) flatText += "\n";
      flatText += block.text;
    }
  }

  const metadata =
    record.metadata && typeof record.metadata === "object"
      ? (record.metadata as Record<string, unknown>)
      : {};

  return {
    turnId: record.id,
    role: record.role,
    content: flatText,
    // MessagePart shape overlaps with CxContentBlock enough for consumers
    // that read `messageParts`. Consumers doing strict discriminated
    // unions should migrate to reading `cxContentBlocks`.
    ...(blocks.length > 0 && {
      messageParts: blocks as unknown as ConversationTurn["messageParts"],
      cxContentBlocks: blocks as unknown as ConversationTurn["cxContentBlocks"],
    }),
    timestamp: record.createdAt,
    requestId: record._streamRequestId ?? null,
    conversationId: record.conversationId,
    cxMessageId: record.id,
    agentId: record.agentId,
    position: record.position,
    contentHistory: record.contentHistory,
    deletedAt: record.deletedAt,
    isVisibleToModel: record.isVisibleToModel,
    isVisibleToUser: record.isVisibleToUser,
    messageMetadata: metadata,
    source: record.source,
    messageStatus: record.status,
    userContent: record.userContent,
  };
}

/**
 * `selectDisplayMessages` — the single list selector used by every message
 * renderer (MessageList, AssistantMessage, UserMessage, etc.).
 *
 * Phase 6: the implementation now PREFERS the DB-faithful `byId + orderedIds`
 * store. The selector projects each `MessageRecord` into a `ConversationTurn`
 * on the fly (see `messageRecordToDisplayTurn`). The `turnId` on each
 * projected turn is the server-assigned `cx_message.id` — ready for CRUD.
 *
 * Merge fallback: if legacy `turns[]` contains an entry whose `cxMessageId`
 * is NOT yet represented in `byId` (e.g. the user's just-submitted turn
 * before `record_reserved cx_message` lands on the stream), that turn is
 * merged in and the output is sorted by `position` (with timestamp
 * fallback). This keeps the optimistic user-message path snappy.
 *
 * Honors `display.showSubAgents`: when `false`, entries tagged with
 * `metadata.isSubAgent === true` (on the record) or
 * `messageMetadata.isSubAgent === true` (on a legacy turn) are filtered
 * out. Data stays in the slices — rendering only, no loss.
 */
export const selectDisplayMessages = (conversationId: string) =>
  createSelector(
    (state: RootState) =>
      state.messages.byConversationId[conversationId]?.orderedIds ?? EMPTY_IDS,
    (state: RootState) => state.messages.byConversationId[conversationId]?.byId,
    (state: RootState) =>
      state.messages.byConversationId[conversationId]?.turns ?? EMPTY_TURNS,
    (state: RootState) =>
      state.instanceUIState?.byConversationId?.[conversationId]
        ?.showSubAgents ?? true,
    (orderedIds, byId, legacyTurns, showSubAgents): ConversationTurn[] => {
      const hasByIdData =
        orderedIds.length > 0 && byId && Object.keys(byId).length > 0;

      // Pre-migration / empty-stream path: fall back to legacy turns[]. This
      // keeps existing conversations that haven't been refetched through
      // the DB-faithful pipeline rendering normally.
      if (!hasByIdData) {
        if (showSubAgents) return legacyTurns;
        const filtered = legacyTurns.filter((t) => {
          const meta =
            (t.messageMetadata as { isSubAgent?: boolean } | undefined) ??
            undefined;
          return meta?.isSubAgent !== true;
        });
        return filtered.length === 0 ? EMPTY_TURNS : filtered;
      }

      // Primary path: project `byId + orderedIds` into ConversationTurn[].
      const out: ConversationTurn[] = [];
      const serverIds = new Set<string>(orderedIds);

      for (const id of orderedIds) {
        const record = byId![id];
        if (!record) continue;
        const meta =
          (record.metadata as { isSubAgent?: boolean } | undefined) ??
          undefined;
        if (!showSubAgents && meta?.isSubAgent === true) continue;
        out.push(messageRecordToDisplayTurn(record));
      }

      // Merge in any legacy turns that don't have a matching server
      // reservation yet — e.g. the user's just-submitted turn before
      // `record_reserved cx_message` lands. Dedup by `cxMessageId`.
      for (const turn of legacyTurns) {
        if (turn.cxMessageId && serverIds.has(turn.cxMessageId)) continue;
        if (!showSubAgents) {
          const m =
            (turn.messageMetadata as { isSubAgent?: boolean } | undefined) ??
            undefined;
          if (m?.isSubAgent === true) continue;
        }
        out.push(turn);
      }

      // Sort by `position` (authoritative when present) with timestamp as
      // tiebreaker. Legacy optimistic turns may have position=undefined;
      // they sort to the end via Number.POSITIVE_INFINITY.
      out.sort((a, b) => {
        const pa =
          typeof a.position === "number"
            ? a.position
            : Number.POSITIVE_INFINITY;
        const pb =
          typeof b.position === "number"
            ? b.position
            : Number.POSITIVE_INFINITY;
        if (pa !== pb) return pa - pb;
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return ta - tb;
      });

      return out.length === 0 ? EMPTY_TURNS : out;
    },
  );

/** Look up a single turn by turnId within a conversation. */
export const selectTurnByTurnId =
  (conversationId: string, turnId: string) =>
  (state: RootState): ConversationTurn | undefined =>
    state.messages.byConversationId[conversationId]?.turns.find(
      (t) => t.turnId === turnId,
    );

export const selectApiEndpointMode =
  (conversationId: string) =>
  (state: RootState): ApiEndpointMode =>
    state.messages.byConversationId[conversationId]?.apiEndpointMode ?? null;

export const selectStoredConversationId =
  (conversationId: string) =>
  (state: RootState): string | null =>
    state.messages.byConversationId[conversationId] ? conversationId : null;

export const selectTurnCount =
  (conversationId: string) =>
  (state: RootState): number =>
    state.messages.byConversationId[conversationId]?.turns.length ?? 0;

export const selectHasConversationHistory =
  (conversationId: string) =>
  (state: RootState): boolean =>
    (state.messages.byConversationId[conversationId]?.turns.length ?? 0) > 0;

export const selectLoadedFromHistory =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.messages.byConversationId[conversationId]?.loadedFromHistory ?? false;

/**
 * Returns the CompletionStats for the most recent assistant turn.
 * Used by AgentRequestStats to show the last request's data.
 */
export const selectLatestCompletionStats =
  (conversationId: string) =>
  (state: RootState): CompletionStats | undefined => {
    const turns = state.messages.byConversationId[conversationId]?.turns;
    if (!turns) return undefined;
    // Walk backwards to find the last assistant turn that has completionStats
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].role === "assistant" && turns[i].completionStats) {
        return turns[i].completionStats;
      }
    }
    return undefined;
  };

export interface AggregateStats {
  turnCount: number;
  requestCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalDurationMs: number;
  totalIterations: number;
  totalCost: number;
  totalToolCalls: number;
}

const EMPTY_AGGREGATE: AggregateStats = {
  turnCount: 0,
  requestCount: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalTokens: 0,
  totalDurationMs: 0,
  totalIterations: 0,
  totalCost: 0,
  totalToolCalls: 0,
};

/**
 * Aggregated stats across all completed assistant turns.
 * Reads from UserRequestResult (aliased as CompletionStats) using the real
 * deeply-typed fields from the auto-generated stream-events.ts.
 */
export const selectAggregateStats = (conversationId: string) =>
  createSelector(
    (state: RootState) =>
      state.messages.byConversationId[conversationId]?.turns,
    (turns): AggregateStats => {
      if (!turns || turns.length === 0) return EMPTY_AGGREGATE;

      let requestCount = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalTokens = 0;
      let totalDurationMs = 0;
      let totalIterations = 0;
      let totalCost = 0;
      let totalToolCalls = 0;

      for (const turn of turns) {
        if (turn.role !== "assistant") continue;
        requestCount++;

        const stats = turn.completionStats;
        if (!stats) continue;

        const totals = stats.total_usage?.total;
        if (totals) {
          totalInputTokens += totals.input_tokens ?? 0;
          totalOutputTokens += totals.output_tokens ?? 0;
          totalTokens += totals.total_tokens ?? 0;
          totalCost += totals.total_cost ?? 0;
        }

        totalDurationMs += (stats.timing_stats?.total_duration ?? 0) * 1000;
        totalIterations += stats.iterations ?? 0;
        totalToolCalls += stats.tool_call_stats?.total_tool_calls ?? 0;
      }

      return {
        turnCount: turns.length,
        requestCount,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        totalDurationMs,
        totalIterations,
        totalCost,
        totalToolCalls,
      };
    },
  );

/**
 * Returns the ClientMetrics for the most recent assistant turn.
 * Available after finalizeClientMetrics + attachClientMetrics dispatch.
 */
export const selectLatestClientMetrics =
  (conversationId: string) =>
  (state: RootState): ClientMetrics | undefined => {
    const turns = state.messages.byConversationId[conversationId]?.turns;
    if (!turns) return undefined;
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].role === "assistant" && turns[i].clientMetrics) {
        return turns[i].clientMetrics;
      }
    }
    return undefined;
  };

/**
 * Aggregate client-side data volume across all completed assistant turns.
 * Memoized — only recomputes when turns change.
 */
export interface AggregateClientMetrics {
  totalRequests: number;
  totalEvents: number;
  totalChunkEvents: number;
  totalDataEvents: number;
  totalToolEvents: number;
  totalPayloadBytes: number;
  totalTextBytes: number;
  avgTtftMs: number | null;
  avgInternalLatencyMs: number | null;
  avgTotalDurationMs: number | null;
}

const EMPTY_AGGREGATE_CLIENT: AggregateClientMetrics = {
  totalRequests: 0,
  totalEvents: 0,
  totalChunkEvents: 0,
  totalDataEvents: 0,
  totalToolEvents: 0,
  totalPayloadBytes: 0,
  totalTextBytes: 0,
  avgTtftMs: null,
  avgInternalLatencyMs: null,
  avgTotalDurationMs: null,
};

export const selectAggregateClientMetrics = (conversationId: string) =>
  createSelector(
    (state: RootState) =>
      state.messages.byConversationId[conversationId]?.turns,
    (turns): AggregateClientMetrics => {
      if (!turns || turns.length === 0) return EMPTY_AGGREGATE_CLIENT;

      let totalRequests = 0;
      let totalEvents = 0;
      let totalChunkEvents = 0;
      let totalDataEvents = 0;
      let totalToolEvents = 0;
      let totalPayloadBytes = 0;
      let totalTextBytes = 0;
      let ttftSum = 0;
      let ttftCount = 0;
      let latencySum = 0;
      let latencyCount = 0;
      let durationSum = 0;
      let durationCount = 0;

      for (const turn of turns) {
        if (turn.role !== "assistant" || !turn.clientMetrics) continue;
        totalRequests++;
        const m = turn.clientMetrics;
        totalEvents += m.totalEvents;
        totalChunkEvents += m.chunkEvents;
        totalDataEvents += m.dataEvents;
        totalToolEvents += m.toolEvents;
        totalPayloadBytes += m.totalPayloadBytes;
        totalTextBytes += m.accumulatedTextBytes;
        if (m.ttftMs !== null) {
          ttftSum += m.ttftMs;
          ttftCount++;
        }
        if (m.internalLatencyMs !== null) {
          latencySum += m.internalLatencyMs;
          latencyCount++;
        }
        if (m.totalClientDurationMs !== null) {
          durationSum += m.totalClientDurationMs;
          durationCount++;
        }
      }

      return {
        totalRequests,
        totalEvents,
        totalChunkEvents,
        totalDataEvents,
        totalToolEvents,
        totalPayloadBytes,
        totalTextBytes,
        avgTtftMs: ttftCount > 0 ? ttftSum / ttftCount : null,
        avgInternalLatencyMs:
          latencyCount > 0 ? latencySum / latencyCount : null,
        avgTotalDurationMs:
          durationCount > 0 ? durationSum / durationCount : null,
      };
    },
  );

// =============================================================================
// Conversation Label Selectors
// =============================================================================

export const selectConversationTitle =
  (conversationId: string) =>
  (state: RootState): string | null =>
    state.messages.byConversationId[conversationId]?.title ?? null;

export const selectConversationDescription =
  (conversationId: string) =>
  (state: RootState): string | null =>
    state.messages.byConversationId[conversationId]?.description ?? null;

export const selectConversationKeywords =
  (conversationId: string) =>
  (state: RootState): string[] | null =>
    state.messages.byConversationId[conversationId]?.keywords ?? null;

// =============================================================================
// Interleaved Content from DB-Loaded Turns
// =============================================================================

const EMPTY_SEGMENTS: ContentSegment[] = [];

/**
 * Converts a DB-loaded turn's `messageParts` (the `cx_message.content` array)
 * into the `ContentSegment[]` format consumed by the renderers.
 *
 * Ground truth (from the DB, not the stream shape):
 *
 *   - An assistant `cx_message` carries `tool_call` content blocks: these have
 *     `id` (provider call_id), `name`, `arguments`. They are the authoritative
 *     source for the call itself.
 *
 *   - The matching tool result is NOT inlined on any message. The next
 *     `role: "tool"` message contains only stub blocks:
 *     `{ type: "tool_result", call_id, tool_use_id, name, is_error,
 *        output_chars }` — NO result payload. The actual output lives in the
 *     `cx_tool_call` row (observability slice), keyed by `callId` (the
 *     provider-issued id, which equals the stub's `call_id`).
 *
 * So for each `tool_call` part we join to `observability.toolCalls` by
 * `callId` to retrieve the real arguments/output/error.
 *
 * `role: "tool"` turns are pure stubs — the preceding assistant turn already
 * rendered the call + joined result inline, so these turns emit no segments
 * (avoids duplicate tool display).
 */
export const selectTurnInterleavedContent = (
  conversationId: string,
  turnId: string,
) =>
  createSelector(
    (state: RootState) =>
      state.messages.byConversationId[conversationId]?.turns,
    (state: RootState) => state.observability.toolCalls,
    (turns, toolCallsById): ContentSegment[] => {
      if (!turns) return EMPTY_SEGMENTS;

      const turn = turns.find((t) => t.turnId === turnId);
      if (!turn) return EMPTY_SEGMENTS;

      // Tool-role turns are stubs in the V2 DB shape — their results are
      // joined onto the preceding assistant turn's tool_call segments.
      if ((turn.role as string) === "tool") return EMPTY_SEGMENTS;

      const parts = turn.messageParts;
      if (!parts || parts.length === 0) {
        if (turn.content) return [{ type: "text", content: turn.content }];
        return EMPTY_SEGMENTS;
      }

      // Build a callId → CxToolCallRecord lookup. `toolCalls` is keyed by
      // the cx_tool_call row id, but each record carries the provider
      // `callId` which is what `tool_call.id` on the content block matches.
      const toolCallByCallId = new Map<
        string,
        (typeof toolCallsById)[string]
      >();
      for (const key in toolCallsById) {
        const rec = toolCallsById[key];
        if (rec?.callId) toolCallByCallId.set(rec.callId, rec);
      }

      const segments: ContentSegment[] = [];

      for (const part of parts) {
        switch (part.type) {
          case "text": {
            const text = (part as { text?: string }).text;
            if (text) {
              segments.push({
                type: "text",
                content: text,
              } satisfies ContentSegmentText);
            }
            break;
          }
          case "thinking": {
            const text = (part as { text?: string }).text;
            if (text) {
              segments.push({
                type: "thinking",
                content: text,
              } satisfies ContentSegmentThinking);
            }
            break;
          }
          case "tool_call": {
            const tc = part as ToolCallPart;
            const callId = tc.id ?? "unknown";
            const toolCallRecord =
              callId !== "unknown" ? toolCallByCallId.get(callId) : undefined;

            // Prefer the authoritative cx_tool_call row. The full `output`
            // is a JSON string; `outputPreview` is an already-parsed object
            // suitable for rendering. Fall back to the content-block stub
            // data when the row hasn't loaded yet (rare on initial history
            // fetch but possible during live streams).
            const resolvedArguments =
              (toolCallRecord?.arguments as Record<string, unknown> | null) ??
              tc.arguments ??
              {};
            const resolvedResult =
              toolCallRecord?.outputPreview ?? toolCallRecord?.output ?? null;
            const resolvedIsError =
              toolCallRecord?.isError ??
              (toolCallRecord ? !toolCallRecord.success : false);

            segments.push({
              type: "db_tool",
              callId,
              toolName: toolCallRecord?.toolName ?? tc.name ?? "unknown_tool",
              arguments: resolvedArguments,
              result: resolvedResult,
              isError: resolvedIsError,
            } satisfies ContentSegmentDbTool);
            break;
          }
          // tool_result blocks never appear on non-tool-role turns in the
          // V2 DB shape. If one does, it's a stub with no payload — skip.
          case "tool_result":
          default:
            break;
        }
      }

      if (segments.length === 0 && turn.content) {
        return [{ type: "text", content: turn.content }];
      }

      return segments;
    },
  );
