"use client";

/**
 * The deploy-freshness source's live half: one super-admin read per poll
 * (`platform.deploy_freshness_for_attention`). A failed read is LOUD — a stale
 * service that cannot be read about is exactly the silence this source ends.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDeployFreshness } from "../deploy-freshness-service";
import { ATTENTION_POLL_MS } from "../poll";
import { muteItem, unmuteItem } from "../item-mute";
import type { AttentionSourceState } from "../types";
import {
  DEPLOY_FRESHNESS_SOURCE_ID,
  DEPLOY_FRESHNESS_SOURCE_LABEL,
  FLEET_HEALTH_HREF,
  deployFreshnessItems,
  summarizeDeployFreshness,
  type DeployFreshnessRow,
} from "./deploy-freshness";

export const DEPLOY_FRESHNESS_QUERY_KEY = ["admin-attention", "deploy-freshness"] as const;

export function useDeployFreshnessSource(enabled: boolean): AttentionSourceState {
  const queryClient = useQueryClient();
  const query = useQuery<DeployFreshnessRow[]>({
    queryKey: DEPLOY_FRESHNESS_QUERY_KEY,
    queryFn: fetchDeployFreshness,
    enabled,
    refetchInterval: ATTENTION_POLL_MS,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const items = deployFreshnessItems(query.data ?? [], {
    muteLocally: (key, ms) => muteItem(key, ms),
    unmuteLocally: (key) => unmuteItem(key),
  });

  const status: AttentionSourceState["status"] = !enabled
    ? "idle"
    : query.isError
      ? "failed"
      : query.data === undefined
        ? "loading"
        : "ok";

  return {
    id: DEPLOY_FRESHNESS_SOURCE_ID,
    label: DEPLOY_FRESHNESS_SOURCE_LABEL,
    items,
    status,
    error: query.error instanceof Error ? query.error.message : query.error ? String(query.error) : null,
    loud: true,
    summarize: summarizeDeployFreshness,
    review: { href: FLEET_HEALTH_HREF, label: "Fleet health" },
    refetch: () => {
      void queryClient.invalidateQueries({ queryKey: DEPLOY_FRESHNESS_QUERY_KEY });
    },
  };
}
