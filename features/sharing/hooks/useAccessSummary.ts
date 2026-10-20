/**
 * features/sharing/hooks/useAccessSummary.ts
 *
 * One-entity-at-a-time effective-access loader. `enabled` exists so callers can
 * mount the panel inside a collapsed tab and only pay for the round trip when
 * the user actually looks — this query is NOT cheap enough to fire per row.
 */

"use client";

import { useRefreshWhenChanged, useStoreRead } from "@/lib/redux/store-reads/useStoreRead";
import {
  fetchAccessSummary,
  type AccessSummary,
} from "@/features/sharing/service/accessSummary";
import type { EntityTypeToken } from "@ai-matrx/associations";

export interface UseAccessSummaryArgs {
  entityType: EntityTypeToken;
  entityId: string | null;
  /** Load only while true. Defaults to true. */
  enabled?: boolean;
  /**
   * Change this value to force a refetch — for surfaces that mutate grants
   * beside the panel (a Share tab), pass a signature of the grant state so
   * the summary can never contradict the freshly-refreshed list next to it.
   */
  refreshToken?: unknown;
}

export interface UseAccessSummaryResult {
  summary: AccessSummary | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAccessSummary({
  entityType,
  entityId,
  enabled = true,
  refreshToken,
}: UseAccessSummaryArgs): UseAccessSummaryResult {
  // Kept once per record per tab (the remount law): a tile waking from sleep or remounting shows the
  // kept summary and reads nothing; a failed read is not kept. A new `refreshToken` or `reload()` is the
  // deliberate re-read.
  const read = useStoreRead<AccessSummary>(
    entityId ? `sharing.access-summary:${entityType}:${entityId}` : null,
    () => fetchAccessSummary(entityType, entityId as string),
    { enabled: enabled && Boolean(entityId), staleAfterMs: 60_000 },
  );
  useRefreshWhenChanged(refreshToken, read.refresh);

  const active = enabled && Boolean(entityId);
  const reload = () => {
    void read.refresh();
  };
  return {
    summary: active ? (read.data ?? null) : null,
    loading: active && read.isLoading,
    error: active && read.isError ? (read.error ?? "Could not load access") : null,
    reload,
  };
}
