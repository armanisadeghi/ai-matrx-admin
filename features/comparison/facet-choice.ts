/**
 * The facets a person turned on or off for a kind (companies: Google rating, LinkedIn, open jobs, social
 * following). One small shared choice so every quote and run of that kind sends the same `facets` — the
 * quote shown is the run billed. Unset = the server's defaults (each facet's `default_on`).
 */

import { useSyncExternalStore } from "react";

const chosen = new Map<string, string[]>();
const listeners = new Set<() => void>();

export function facetChoice(kind: string): string[] | undefined {
  return chosen.get(kind);
}

export function setFacetChoice(kind: string, keys: string[] | null): void {
  if (keys === null) chosen.delete(kind);
  else chosen.set(kind, [...keys]);
  for (const l of listeners) l();
}

export function onFacetChoice(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A quote/run body with the kind's chosen facets (left out when the person changed nothing). */
export function withFacets<T extends { kind: string }>(b: T): T & { facets?: string[] } {
  const keys = facetChoice(b.kind);
  return keys ? { ...b, facets: keys } : b;
}

/** The kind's chosen facet keys as a stable string ("" = the server's defaults), re-read on every change —
 * part of every quote's cache key, so the price shown is always for the facets that are on. */
export function useFacetKeys(kind: string): string {
  return useSyncExternalStore(onFacetChoice, () => (facetChoice(kind) ?? ["(defaults)"]).join(","), () => "(defaults)");
}
