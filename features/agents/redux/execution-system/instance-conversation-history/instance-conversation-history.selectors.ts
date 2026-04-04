import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";
import type {
  ConversationTurn,
  ConversationMode,
} from "./instance-conversation-history.slice";
import type { CompletionStats } from "@/features/agents/types/instance.types";
import type { ClientMetrics } from "@/features/agents/types/request.types";

const EMPTY_TURNS: ConversationTurn[] = [];

export const selectConversationTurns =
  (instanceId: string) =>
  (state: RootState): ConversationTurn[] =>
    state.instanceConversationHistory.byInstanceId[instanceId]?.turns ??
    EMPTY_TURNS;

export const selectConversationMode =
  (instanceId: string) =>
  (state: RootState): ConversationMode =>
    state.instanceConversationHistory.byInstanceId[instanceId]?.mode ?? "agent";

export const selectStoredConversationId =
  (instanceId: string) =>
  (state: RootState): string | null =>
    state.instanceConversationHistory.byInstanceId[instanceId]
      ?.conversationId ?? null;

export const selectTurnCount =
  (instanceId: string) =>
  (state: RootState): number =>
    state.instanceConversationHistory.byInstanceId[instanceId]?.turns.length ??
    0;

export const selectHasConversationHistory =
  (instanceId: string) =>
  (state: RootState): boolean =>
    (state.instanceConversationHistory.byInstanceId[instanceId]?.turns.length ??
      0) > 0;

export const selectLoadedFromHistory =
  (instanceId: string) =>
  (state: RootState): boolean =>
    state.instanceConversationHistory.byInstanceId[instanceId]
      ?.loadedFromHistory ?? false;

/**
 * Returns the CompletionStats for the most recent assistant turn.
 * Used by AgentRequestStats to show the last request's data.
 */
export const selectLatestCompletionStats =
  (instanceId: string) =>
  (state: RootState): CompletionStats | undefined => {
    const turns =
      state.instanceConversationHistory.byInstanceId[instanceId]?.turns;
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
  /** Total turns in the session (user + assistant) */
  turnCount: number;
  /** Number of completed assistant turns (= number of requests) */
  requestCount: number;
  /** Sum of all input tokens across all assistant turns */
  totalInputTokens: number;
  /** Sum of all output tokens across all assistant turns */
  totalOutputTokens: number;
  /** Sum of input + output tokens */
  totalTokens: number;
  /** Sum of all costs across all assistant turns */
  totalCost: number;
  /** Sum of all wall-clock durations across all assistant turns */
  totalDuration: number;
  /** Total tool calls across all turns */
  totalToolCalls: number;
}

const EMPTY_AGGREGATE: AggregateStats = {
  turnCount: 0,
  requestCount: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalTokens: 0,
  totalCost: 0,
  totalDuration: 0,
  totalToolCalls: 0,
};

/**
 * Aggregated stats across all completed assistant turns.
 * Memoized — only recomputes when the turns array changes.
 */
export const selectAggregateStats = (instanceId: string) =>
  createSelector(
    (state: RootState) =>
      state.instanceConversationHistory.byInstanceId[instanceId]?.turns,
    (turns): AggregateStats => {
      if (!turns || turns.length === 0) return EMPTY_AGGREGATE;

      let requestCount = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalTokens = 0;
      let totalCost = 0;
      let totalDuration = 0;
      let totalToolCalls = 0;

      for (const turn of turns) {
        if (turn.role !== "assistant") continue;
        requestCount++;

        const stats = turn.completionStats;
        if (!stats) continue;

        const t = stats.total_usage?.total;
        if (t) {
          totalInputTokens += t.input_tokens ?? 0;
          totalOutputTokens += t.output_tokens ?? 0;
          totalTokens += t.total_tokens ?? 0;
          totalCost += t.total_cost ?? 0;
        }

        totalDuration += stats.timing_stats?.total_duration ?? 0;
        totalToolCalls += stats.tool_call_stats?.total_tool_calls ?? 0;
      }

      return {
        turnCount: turns.length,
        requestCount,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        totalCost,
        totalDuration,
        totalToolCalls,
      };
    },
  );

/**
 * Returns the ClientMetrics for the most recent assistant turn.
 * Available after finalizeClientMetrics + attachClientMetrics dispatch.
 */
export const selectLatestClientMetrics =
  (instanceId: string) =>
  (state: RootState): ClientMetrics | undefined => {
    const turns =
      state.instanceConversationHistory.byInstanceId[instanceId]?.turns;
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

export const selectAggregateClientMetrics = (instanceId: string) =>
  createSelector(
    (state: RootState) =>
      state.instanceConversationHistory.byInstanceId[instanceId]?.turns,
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
  (instanceId: string) =>
  (state: RootState): string | null =>
    state.instanceConversationHistory.byInstanceId[instanceId]?.title ?? null;

export const selectConversationDescription =
  (instanceId: string) =>
  (state: RootState): string | null =>
    state.instanceConversationHistory.byInstanceId[instanceId]?.description ??
    null;

export const selectConversationKeywords =
  (instanceId: string) =>
  (state: RootState): string[] | null =>
    state.instanceConversationHistory.byInstanceId[instanceId]?.keywords ??
    null;
