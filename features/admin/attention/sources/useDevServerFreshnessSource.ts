"use client";

/**
 * The dev-server-freshness source's live half: development only, one GET to this same dev
 * server. QUIET on failure (`loud: false`, no items): the read fails exactly while the server
 * is restarting, and the page itself says that much.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DevServerFreshness } from "@/lib/dev-server/server-freshness";
import { muteItem, unmuteItem } from "../item-mute";
import type { AttentionSourceState } from "../types";
import {
  DEV_SERVER_FRESHNESS_SOURCE_ID,
  DEV_SERVER_FRESHNESS_SOURCE_LABEL,
  devServerFreshnessItems,
  summarizeDevServerFreshness,
} from "./dev-server-freshness";

export const DEV_SERVER_FRESHNESS_QUERY_KEY = ["admin-attention", "dev-server-freshness"] as const;
/** Staleness lasts seconds to a minute; the dock's platform poll is far too slow for it. */
const DEV_SERVER_POLL_MS = 15_000;
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

async function fetchDevServerFreshness(): Promise<DevServerFreshness> {
  const response = await fetch("/api/dev/server-freshness", { cache: "no-store" });
  if (!response.ok) throw new Error(`dev server freshness answered ${response.status}`);
  return (await response.json()) as DevServerFreshness;
}

export function useDevServerFreshnessSource(enabled: boolean): AttentionSourceState {
  const queryClient = useQueryClient();
  const active = enabled && IS_DEVELOPMENT;
  const query = useQuery<DevServerFreshness>({
    queryKey: DEV_SERVER_FRESHNESS_QUERY_KEY,
    queryFn: fetchDevServerFreshness,
    enabled: active,
    refetchInterval: DEV_SERVER_POLL_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const items = devServerFreshnessItems(query.isError ? null : (query.data ?? null), {
    muteLocally: (key, ms) => muteItem(key, ms),
    unmuteLocally: (key) => unmuteItem(key),
  });

  return {
    id: DEV_SERVER_FRESHNESS_SOURCE_ID,
    label: DEV_SERVER_FRESHNESS_SOURCE_LABEL,
    items,
    status: !active ? "idle" : query.isError ? "failed" : query.data === undefined ? "loading" : "ok",
    error: query.error instanceof Error ? query.error.message : null,
    loud: false,
    machineLocal: true,
    summarize: summarizeDevServerFreshness,
    review: null,
    refetch: () => {
      void queryClient.invalidateQueries({ queryKey: DEV_SERVER_FRESHNESS_QUERY_KEY });
    },
  };
}
