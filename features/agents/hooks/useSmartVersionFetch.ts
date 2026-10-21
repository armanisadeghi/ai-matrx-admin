"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@ai-matrx/chat/store/hooks";
import { fetchAgentVersionSnapshot } from "@/features/agents/redux/builder-versions.thunks";
import {
  selectVersionsByParentAgentId,
} from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import type { AgentVersionHistoryItem } from "@ai-matrx/chat/agents/types/agent-definition.types";
import {
  computeVersionFetchTargets,
  enrichVersions,
  type EnrichedVersion,
} from "@ai-matrx/agents/versions";

export type { EnrichedVersion };

interface SmartVersionFetchState {
  enrichedVersions: EnrichedVersion[];
  loading: boolean;
  progress: { fetched: number; total: number };
  /**
   * Versions whose snapshot fetch rejected, and one representative reason.
   * A per-version failure is survivable — the rest of the timeline still
   * enriches — but it is never invisible: the consumer renders these, so an
   * enrichment pass that loaded nothing can't masquerade as "not loaded yet".
   */
  failedVersions: number[];
  failureReason: string | null;
}

/**
 * Smart version fetcher that:
 * 1. Takes the already-loaded version history list
 * 2. Fetches the 10 newest snapshots
 * 3. Fetches the oldest snapshot
 * 4. Fetches every ~10th version in between
 * 5. Computes diff summaries between consecutive fetched versions
 */
export function useSmartVersionFetch(
  agentId: string,
  versions: AgentVersionHistoryItem[],
) {
  const dispatch = useAppDispatch();
  const snapshotRecords = useAppSelector((state) =>
    selectVersionsByParentAgentId(state, agentId),
  );
  const [state, setState] = useState<SmartVersionFetchState>({
    enrichedVersions: versions.map((v) => ({ ...v, snapshotLoaded: false })),
    loading: false,
    progress: { fetched: 0, total: 0 },
    failedVersions: [],
    failureReason: null,
  });
  const fetchedRef = useRef(false);

  // Compute which versions to fetch using the smart algorithm
  const computeTargetVersions = useCallback(
    (): number[] => computeVersionFetchTargets(versions),
    [versions],
  );

  // Fetch snapshots for the computed target versions
  const fetchEnrichedHistory = useCallback(async () => {
    if (versions.length === 0 || fetchedRef.current) return;
    fetchedRef.current = true;

    const targets = computeTargetVersions();
    // Filter out already-loaded snapshots
    const toFetch = targets.filter(
      (vn) => !snapshotRecords.some((r) => r.version === vn),
    );

    setState((prev) => ({
      ...prev,
      loading: true,
      progress: { fetched: targets.length - toFetch.length, total: targets.length },
      failedVersions: [],
      failureReason: null,
    }));

    // Fetch in batches of 3 to avoid overwhelming the API
    for (let i = 0; i < toFetch.length; i += 3) {
      const batch = toFetch.slice(i, i + 3);
      const outcomes = await Promise.all(
        batch.map((version) =>
          dispatch(fetchAgentVersionSnapshot({ agentId, version }))
            .unwrap()
            .then(() => null)
            .catch((err: unknown) => ({
              version,
              reason:
                err instanceof Error ? err.message : "unknown error",
            })),
        ),
      );
      const failures = outcomes.filter((o) => o !== null);
      setState((prev) => ({
        ...prev,
        progress: {
          ...prev.progress,
          fetched: prev.progress.fetched + batch.length,
        },
        failedVersions: [
          ...prev.failedVersions,
          ...failures.map((f) => f.version),
        ],
        failureReason: prev.failureReason ?? failures[0]?.reason ?? null,
      }));
    }

    setState((prev) => ({ ...prev, loading: false }));
  }, [agentId, versions, computeTargetVersions, dispatch, snapshotRecords]);

  // Recompute enriched versions whenever snapshots change
  useEffect(() => {
    // What changed at each version: the package's one enrichment over the snapshots in Redux.
    const enriched: EnrichedVersion[] = enrichVersions(versions, (n) =>
      snapshotRecords.find((r) => r.version === n),
    );
    setState((prev) => ({ ...prev, enrichedVersions: enriched }));
  }, [versions, snapshotRecords]);

  // Fill in specific missing versions (for the "load more" feature)
  const fetchGap = useCallback(
    async (versionNumbers: number[]) => {
      const toFetch = versionNumbers.filter(
        (vn) => !snapshotRecords.some((r) => r.version === vn),
      );
      const outcomes = await Promise.all(
        toFetch.map((version) =>
          dispatch(fetchAgentVersionSnapshot({ agentId, version }))
            .unwrap()
            .then(() => null)
            .catch((err: unknown) => ({
              version,
              reason:
                err instanceof Error ? err.message : "unknown error",
            })),
        ),
      );
      const failures = outcomes.filter((o) => o !== null);
      if (failures.length > 0) {
        setState((prev) => ({
          ...prev,
          failedVersions: [
            ...prev.failedVersions,
            ...failures.map((f) => f.version),
          ],
          failureReason: prev.failureReason ?? failures[0].reason,
        }));
      }
    },
    [agentId, dispatch, snapshotRecords],
  );

  return {
    enrichedVersions: state.enrichedVersions,
    loading: state.loading,
    progress: state.progress,
    failedVersions: state.failedVersions,
    failureReason: state.failureReason,
    fetchEnrichedHistory,
    fetchGap,
  };
}
