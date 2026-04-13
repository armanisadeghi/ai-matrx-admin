import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type {
  ConversationTurn,
  ConversationMode,
} from "./instance-conversation-history.slice";
import type { CompletionStats } from "@/features/agents/types/instance.types";
import type { ClientMetrics } from "@/features/agents/types/request.types";
import type {
  ContentSegment,
  ContentSegmentText,
  ContentSegmentDbTool,
  ContentSegmentThinking,
} from "../active-requests/active-requests.selectors";
import type {
  ToolCallPart,
  ToolResultPart,
} from "@/types/python-generated/stream-events";

const EMPTY_TURNS: ConversationTurn[] = [];

export const selectConversationTurns =
  (conversationId: string) =>
  (state: RootState): ConversationTurn[] =>
    state.instanceConversationHistory.byConversationId[conversationId]?.turns ??
    EMPTY_TURNS;

/** Look up a single turn by turnId within a conversation. */
export const selectTurnByTurnId =
  (conversationId: string, turnId: string) =>
  (state: RootState): ConversationTurn | undefined =>
    state.instanceConversationHistory.byConversationId[
      conversationId
    ]?.turns.find((t) => t.turnId === turnId);

export const selectConversationMode =
  (conversationId: string) =>
  (state: RootState): ConversationMode =>
    state.instanceConversationHistory.byConversationId[conversationId]?.mode ??
    "agent";

export const selectStoredConversationId =
  (conversationId: string) =>
  (state: RootState): string | null =>
    state.instanceConversationHistory.byConversationId[conversationId]
      ? conversationId
      : null;

export const selectTurnCount =
  (conversationId: string) =>
  (state: RootState): number =>
    state.instanceConversationHistory.byConversationId[conversationId]?.turns
      .length ?? 0;

export const selectHasConversationHistory =
  (conversationId: string) =>
  (state: RootState): boolean =>
    (state.instanceConversationHistory.byConversationId[conversationId]?.turns
      .length ?? 0) > 0;

export const selectLoadedFromHistory =
  (conversationId: string) =>
  (state: RootState): boolean =>
    state.instanceConversationHistory.byConversationId[conversationId]
      ?.loadedFromHistory ?? false;

/**
 * Returns the CompletionStats for the most recent assistant turn.
 * Used by AgentRequestStats to show the last request's data.
 */
export const selectLatestCompletionStats =
  (conversationId: string) =>
  (state: RootState): CompletionStats | undefined => {
    const turns =
      state.instanceConversationHistory.byConversationId[conversationId]?.turns;
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
      state.instanceConversationHistory.byConversationId[conversationId]?.turns,
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
    const turns =
      state.instanceConversationHistory.byConversationId[conversationId]?.turns;
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
      state.instanceConversationHistory.byConversationId[conversationId]?.turns,
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
    state.instanceConversationHistory.byConversationId[conversationId]?.title ??
    null;

export const selectConversationDescription =
  (conversationId: string) =>
  (state: RootState): string | null =>
    state.instanceConversationHistory.byConversationId[conversationId]
      ?.description ?? null;

export const selectConversationKeywords =
  (conversationId: string) =>
  (state: RootState): string[] | null =>
    state.instanceConversationHistory.byConversationId[conversationId]
      ?.keywords ?? null;

// =============================================================================
// Interleaved Content from DB-Loaded Turns
// =============================================================================

const EMPTY_SEGMENTS: ContentSegment[] = [];

/**
 * Converts a DB-loaded turn's `messageParts` into the same `ContentSegment[]`
 * format that `selectInterleavedContent` produces for streaming turns.
 *
 * Walks `messageParts` in order:
 *   - TextPart       → ContentSegmentText
 *   - ThinkingPart   → ContentSegmentThinking
 *   - ToolCallPart   → look ahead for matching ToolResultPart, emit ContentSegmentDbTool
 *   - ToolResultPart → consumed by the look-ahead, skipped
 *   - Other parts    → ignored for now
 *
 * Falls back to `[{ type: "text", content: turn.content }]` when messageParts
 * is not available or contains only text.
 */
export const selectTurnInterleavedContent = (
  conversationId: string,
  turnId: string,
) =>
  createSelector(
    (state: RootState) =>
      state.instanceConversationHistory.byConversationId[conversationId]?.turns,
    (turns): ContentSegment[] => {
      if (!turns) return EMPTY_SEGMENTS;

      const turn = turns.find((t) => t.turnId === turnId);
      if (!turn) return EMPTY_SEGMENTS;

      const parts = turn.messageParts;
      if (!parts || parts.length === 0) {
        if (turn.content) return [{ type: "text", content: turn.content }];
        return EMPTY_SEGMENTS;
      }

      const resultsByCallId = new Map<string, ToolResultPart>();
      for (const p of parts) {
        if (p.type === "tool_result") {
          const rp = p as ToolResultPart;
          const key = rp.call_id ?? rp.tool_use_id;
          if (key) resultsByCallId.set(key, rp);
        }
      }

      const segments: ContentSegment[] = [];
      const consumedResultIds = new Set<string>();

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
            const result = resultsByCallId.get(callId);
            if (result) {
              consumedResultIds.add(result.call_id ?? result.tool_use_id ?? "");
            }

            segments.push({
              type: "db_tool",
              callId,
              toolName: tc.name ?? "unknown_tool",
              arguments: tc.arguments ?? {},
              result: result?.content ?? null,
              isError: result?.is_error ?? false,
            } satisfies ContentSegmentDbTool);
            break;
          }
          case "tool_result": {
            const rp = part as ToolResultPart;
            const key = rp.call_id ?? rp.tool_use_id ?? "";
            if (consumedResultIds.has(key)) break;
            segments.push({
              type: "db_tool",
              callId: key || "orphan",
              toolName: rp.name ?? "unknown_tool",
              arguments: {},
              result: rp.content ?? null,
              isError: rp.is_error ?? false,
            } satisfies ContentSegmentDbTool);
            break;
          }
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
