"use client";

import { useEffect, useState } from "react";
import { onMandateCacheInvalidated } from "@ai-matrx/chat/mandates/service";
import { fetchFeatureIntelligence } from "./service";
import {
  fetchRegisteredPlacesForKeys,
  keepVisibleJobs,
  mergePlaces,
  resolveDeclaredPlaces,
} from "./places";
import { usePlacement } from "./usePlacement";
import { entriesWithin, entryKeys, type PlacedEntry, type Tree } from "./placement-model";
import type {
  FeatureIntelligenceRow,
  IntelligenceContext,
  IntelligenceLevel,
  ResolvedPlace,
} from "./types";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";

export interface FeatureIntelligenceState {
  rows: FeatureIntelligenceRow[];
  places: ResolvedPlace[];
  loading: boolean;
  error: string | null;
  /** A failed read of registered places — the declared ones still show. */
  placesError: string | null;
  /** The registry tree and the page's arranged jobs (null until read). */
  tree: Tree | null;
  arranged: Map<string, PlacedEntry[]> | null;
}

/**
 * One page's jobs and places for a seat — a registry node with every node
 * below it, or a lane. Re-reads whenever any binding is written (the
 * resolution cache's invalidation), so an action on this page shows its
 * result without a reload.
 */
export function useFeatureIntelligence(args: {
  /** A registry node slug or a lane id. */
  feature: string;
  level: IntelligenceLevel;
  organizationId: string | null;
  userId: string | null;
  context: IntelligenceContext;
  /** False while the seat is still being worked out. */
  enabled: boolean;
}): FeatureIntelligenceState {
  const { feature, level, organizationId, userId, enabled } = args;
  const contextKey = JSON.stringify(args.context);
  const placement = usePlacement();
  const keys: AnyMandateKey[] =
    placement.tree && placement.arranged
      ? [...new Set(entriesWithin(placement.tree, placement.arranged, feature).flatMap(entryKeys))].sort()
      : [];
  const keyList = placement.arranged ? keys.join("|") : null;
  const [epoch, setEpoch] = useState(0);
  const [state, setState] = useState<Omit<FeatureIntelligenceState, "tree" | "arranged">>({
    rows: [],
    places: [],
    loading: true,
    error: null,
    placesError: null,
  });

  useEffect(() => onMandateCacheInvalidated(() => setEpoch((n) => n + 1)), []);

  useEffect(() => {
    if (!enabled || keyList === null) return;
    let cancelled = false;
    const context = JSON.parse(contextKey) as IntelligenceContext;
    // The keys were typed on the way in; the join is only the effect's stable identity.
    const mandateKeys = (keyList ? keyList.split("|") : []) as AnyMandateKey[];
    setState((prev) => ({ ...prev, loading: prev.rows.length === 0, error: null }));
    (async () => {
      try {
        const [rows, registeredAnswer] = await Promise.all([
          fetchFeatureIntelligence({ mandateKeys, level, organizationId, userId }),
          fetchRegisteredPlacesForKeys(mandateKeys, context).then(
            (places) => ({ places, error: null as string | null }),
            (error: unknown) => ({
              places: [] as ResolvedPlace[],
              error: error instanceof Error ? error.message : String(error),
            }),
          ),
        ]);
        const visible = new Set<string>(rows.map((row) => row.mandateKey));
        const declared = resolveDeclaredPlaces(visible, context);
        const registered = keepVisibleJobs(registeredAnswer.places, visible);
        if (cancelled) return;
        setState({
          rows,
          places: mergePlaces(declared, registered),
          loading: false,
          error: null,
          placesError: registeredAnswer.error,
        });
      } catch (error) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [keyList, level, organizationId, userId, contextKey, enabled, epoch]);

  return {
    ...state,
    loading: state.loading && !placement.error,
    error: state.error ?? placement.error,
    tree: placement.tree,
    arranged: placement.arranged,
  };
}
