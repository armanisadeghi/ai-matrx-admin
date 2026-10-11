"use client";

/**
 * The triage read, polled with the sources. `status` drives the dock: while it loads the dock
 * waits (no flash of every alarm); a failed read is LOUD and the card falls back to the first
 * FALLBACK_CARD_BUDGET items — never the whole list.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ATTENTION_POLL_MS } from "../poll";
import { fetchAttentionTriage } from "../triage-service";
import type { AttentionTriage } from "../triage";

export const ATTENTION_TRIAGE_QUERY_KEY = ["admin-attention", "triage"] as const;

export interface AttentionTriageState {
  status: "idle" | "loading" | "ok" | "failed";
  triage: AttentionTriage | null;
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
    status: !enabled ? "idle" : query.isError ? "failed" : query.data === undefined ? "loading" : "ok",
    triage: query.data ?? null,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    refetch: () => void queryClient.invalidateQueries({ queryKey: ATTENTION_TRIAGE_QUERY_KEY }),
  };
}
