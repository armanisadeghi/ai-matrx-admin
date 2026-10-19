"use client";

/**
 * The triage read, polled with the sources. `status` drives the dock: while it loads the dock
 * waits (no flash of every alarm); a failed read is LOUD and the card falls back to the first
 * FALLBACK_CARD_BUDGET items — never the whole list. A failed REFETCH with a good card cached keeps that
 * card (`stale`) and says so beside it: one failed poll never swaps the card for unsorted alarms (review 3, N5).
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ATTENTION_POLL_MS } from "../poll";
import { fetchAttentionTriage } from "../triage-service";
import type { AttentionTriage } from "../triage";

export const ATTENTION_TRIAGE_QUERY_KEY = ["admin-attention", "triage"] as const;

export interface AttentionTriageState {
  status: "idle" | "loading" | "ok" | "failed";
  triage: AttentionTriage | null;
  /** The last poll failed but the last good card is kept (status stays "ok"); the dock says sorting failed. */
  stale: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAttentionTriage(enabled: boolean): AttentionTriageState {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ATTENTION_TRIAGE_QUERY_KEY,
    queryFn: fetchAttentionTriage,
    enabled,
    refetchInterval: ATTENTION_POLL_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  return {
    status: triageStatus(enabled, query.isError, query.data !== undefined),
    triage: query.data ?? null,
    stale: enabled && query.isError && query.data !== undefined,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    refetch: () => void queryClient.invalidateQueries({ queryKey: ATTENTION_TRIAGE_QUERY_KEY }),
  };
}

/** "failed" only when there is no good card to keep; a failed refetch over cached data stays "ok". */
export function triageStatus(enabled: boolean, isError: boolean, hasData: boolean): AttentionTriageState["status"] {
  if (!enabled) return "idle";
  if (hasData) return "ok";
  return isError ? "failed" : "loading";
}
