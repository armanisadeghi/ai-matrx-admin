"use client";

/**
 * A live list whose order holds still while the person is looking at it.
 *
 * Champions: Slack's sidebar, Linear's inbox, macOS Mail. A row's CONTENT
 * updates in place the moment its data changes (a presence dot, an age, an
 * unread count); its POSITION changes only at a natural moment:
 *
 *   - the tab comes back after being hidden (the person was away),
 *   - the person asks (`resort()`, e.g. a "Sort" control shown while
 *     `pending` is true),
 *   - the sort key itself changes (`resetKey`, e.g. the filter text).
 *
 * Rows that were not there before are genuinely new: they go in at their
 * sorted place. Rows that left are dropped. Everything else keeps its held
 * relative order, however often its activity timestamp moves.
 */
import { useCallback, useEffect, useState } from "react";

/**
 * The held order for `sorted` (already in its live order): rows in `held`
 * keep their relative order; new rows go in at their live index.
 */
export function holdOrder<T>(held: readonly string[], sorted: readonly T[], keyOf: (item: T) => string): T[] {
  const byKey = new Map(sorted.map((item) => [keyOf(item), item] as const));
  const kept = held.filter((key) => byKey.has(key));
  const keptSet = new Set(kept);
  const out: T[] = kept.map((key) => byKey.get(key) as T);
  sorted.forEach((item, index) => {
    if (keptSet.has(keyOf(item))) return;
    out.splice(Math.min(index, out.length), 0, item);
  });
  return out;
}

export interface StableOrder<T> {
  /** The rows in their held order, with their latest content. */
  items: T[];
  /** True when the live order differs from the held one. */
  pending: boolean;
  /** Adopt the live order now. */
  resort: () => void;
}

export function useStableOrder<T>(
  sorted: readonly T[],
  keyOf: (item: T) => string,
  resetKey: unknown = null,
): StableOrder<T> {
  const [epoch, setEpoch] = useState(0);
  const resort = useCallback(() => setEpoch((n) => n + 1), []);
  // The held keys, and the epoch and reset key they were taken under. Updated
  // during render (React's "adjust state when props change" pattern) only when
  // the key set changes, so a content-only update costs no extra render.
  const [held, setHeld] = useState<{ keys: string[] | null; epoch: number; resetKey: unknown }>({
    keys: null,
    epoch,
    resetKey,
  });

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") resort();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [resort]);

  const fresh = held.keys === null || held.epoch !== epoch || !Object.is(held.resetKey, resetKey);
  const items = fresh ? [...sorted] : holdOrder(held.keys ?? [], sorted, keyOf);
  const keys = items.map(keyOf);
  if (fresh || !sameKeys(keys, held.keys)) setHeld({ keys, epoch, resetKey });

  const pending = items.some((item, i) => keyOf(item) !== keyOf(sorted[i]));
  return { items, pending, resort };
}

function sameKeys(a: readonly string[], b: readonly string[] | null): boolean {
  return b !== null && a.length === b.length && a.every((k, i) => k === b[i]);
}
