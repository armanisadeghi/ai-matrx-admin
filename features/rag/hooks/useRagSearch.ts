/**
 * features/rag/hooks/useRagSearch.ts
 *
 * Debounced RAG search hook. Returns hits + meta with stable query
 * identity so consumers can render in-place without flicker.
 *
 * Companion of `<RagSearchHits/>`. Most callers wire them together —
 * the hook owns lifecycle, the component owns rendering.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import {
  ragSearch,
  type RagSearchFilters,
  type RagSearchHit,
  type RagSearchResponse,
} from "@/features/rag/api/search";

export interface UseRagSearchState {
  query: string;
  hits: RagSearchHit[];
  totalCandidates: number;
  latencyMs: number | null;
  loading: boolean;
  error: string | null;
}

export interface UseRagSearchOptions {
  query: string;
  /** Don't fire until the input is at least this long. */
  minLength?: number;
  /** Debounce window in ms. Default 250. */
  debounceMs?: number;
  filters?: RagSearchFilters;
  /** Cap returned hits. Default 12. */
  limit?: number;
  /**
   * Set false to drop the cross-encoder rerank step (faster, slightly
   * lower precision). Default true.
   */
  rerank?: boolean;
}

const INITIAL: UseRagSearchState = {
  query: "",
  hits: [],
  totalCandidates: 0,
  latencyMs: null,
  loading: false,
  error: null,
};

export function useRagSearch(opts: UseRagSearchOptions): UseRagSearchState {
  const {
    query,
    minLength = 2,
    debounceMs = 250,
    filters,
    limit = 12,
    rerank = true,
  } = opts;

  const [state, setState] = useState<UseRagSearchState>(INITIAL);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < minLength) {
      // Reset only when the user clears the box; keep the prior result
      // visible while they're typing toward a new query, so the UI
      // doesn't flash empty between keystrokes.
      if (trimmed.length === 0 && state.hits.length > 0) {
        setState(INITIAL);
      }
      return;
    }

    const myReqId = ++reqIdRef.current;
    const ac = new AbortController();
    const handle = window.setTimeout(async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res: RagSearchResponse = await ragSearch(
          { query: trimmed, limit, rerank, filters },
          { signal: ac.signal },
        );
        // Drop the response if a newer search has been kicked off.
        if (myReqId !== reqIdRef.current) return;
        setState({
          query: res.query,
          hits: res.hits,
          totalCandidates: res.total_candidates,
          latencyMs: res.latency_ms,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (ac.signal.aborted || myReqId !== reqIdRef.current) return;
        setState({
          query: trimmed,
          hits: [],
          totalCandidates: 0,
          latencyMs: null,
          loading: false,
          error: err instanceof Error ? err.message : "Search failed",
        });
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(handle);
      ac.abort();
    };
    // We intentionally exclude `state.hits.length` from the dep array —
    // it only matters at initial-clear and reading it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, minLength, debounceMs, limit, rerank, JSON.stringify(filters)]);

  return state;
}
