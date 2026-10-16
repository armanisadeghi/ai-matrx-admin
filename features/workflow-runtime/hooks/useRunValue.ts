"use client";

/**
 * `useRunValue(runId, value)` — a run value with its by-reference parts loaded
 * (MKT-167). Large event values arrive as references; the screen showing one
 * calls this, and only then is the value fetched (once, cached by hash).
 *
 * Returns the value itself when it carries no reference, so a small output costs
 * nothing. While loading, `value` is null and `pending` true; a failed read keeps
 * the reason in `error` (never shows a reference marker to a person).
 */

import { useEffect, useState } from "react";

import {
  cachedRunValues,
  collectRunValueRefs,
  resolveRunValue,
  substituteRunValues,
} from "../transport/run-values";

export interface RunValueState<T> {
  value: T | null;
  pending: boolean;
  error: string | null;
}

function fromCache<T>(runId: string | null | undefined, value: T): RunValueState<T> {
  const refs = collectRunValueRefs(value);
  if (refs.size === 0) return { value, pending: false, error: null };
  if (!runId) return { value: null, pending: false, error: "no run to load this value from" };
  const known = cachedRunValues(runId, refs);
  if (known.size === refs.size) {
    const resolved = substituteRunValues(value, known);
    // A cached value may itself be fully resolved; any reference left means more to load.
    if (collectRunValueRefs(resolved).size === 0) return { value: resolved, pending: false, error: null };
  }
  return { value: null, pending: true, error: null };
}

export function useRunValue<T>(runId: string | null | undefined, value: T): RunValueState<T> {
  const initial = fromCache(runId, value);
  const [loaded, setLoaded] = useState<{ source: T; state: RunValueState<T> } | null>(null);
  const needsFetch = initial.pending && Boolean(runId);

  useEffect(() => {
    if (!needsFetch || !runId) return;
    let live = true;
    resolveRunValue(runId, value).then(
      (resolved) => {
        if (live) setLoaded({ source: value, state: { value: resolved, pending: false, error: null } });
      },
      (err: unknown) => {
        if (live) {
          setLoaded({
            source: value,
            state: { value: null, pending: false, error: err instanceof Error ? err.message : String(err) },
          });
        }
      },
    );
    return () => {
      live = false;
    };
  }, [needsFetch, runId, value]);

  if (!initial.pending) return initial;
  if (loaded && loaded.source === value) return loaded.state;
  return initial;
}
