"use client";

/** The watchtower source's live half: one super-admin read per poll. A failed read is LOUD. */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchWatchtower } from "../watchtower-service";
import { ATTENTION_POLL_MS } from "../poll";
import { muteItem, unmuteItem } from "../item-mute";
import type { AttentionSourceState } from "../types";
import {
  WATCHTOWER_HREF,
  WATCHTOWER_SOURCE_ID,
  WATCHTOWER_SOURCE_LABEL,
  summarizeWatchtower,
  watchtowerItems,
  type WatchtowerRow,
} from "./watchtower";

export const WATCHTOWER_ATTENTION_QUERY_KEY = ["admin-attention", "watchtower-alarms"] as const;

export function useWatchtowerSource(enabled: boolean): AttentionSourceState {
  const queryClient = useQueryClient();
  const query = useQuery<WatchtowerRow[]>({
    queryKey: WATCHTOWER_ATTENTION_QUERY_KEY,
    queryFn: fetchWatchtower,
    enabled,
    refetchInterval: ATTENTION_POLL_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const items = watchtowerItems(query.data ?? [], {
    muteLocally: (key, ms) => muteItem(key, ms),
    unmuteLocally: (key) => unmuteItem(key),
  });

  const status: AttentionSourceState["status"] = !enabled ? "idle" : query.isError ? "failed" : query.data === undefined ? "loading" : "ok";

  return {
    id: WATCHTOWER_SOURCE_ID,
    label: WATCHTOWER_SOURCE_LABEL,
    items,
    status,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    loud: true,
    summarize: summarizeWatchtower,
    review: { href: WATCHTOWER_HREF, label: "Watchtower" },
    refetch: () => {
      void queryClient.invalidateQueries({ queryKey: WATCHTOWER_ATTENTION_QUERY_KEY });
    },
  };
}
