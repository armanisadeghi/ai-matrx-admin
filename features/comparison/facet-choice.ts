/**
 * The facets a person turned on or off for a kind (companies: Google rating, LinkedIn, open jobs, social
 * following). One small shared choice so every quote and run of that kind sends the same `facets` — the
 * quote shown is the run billed. Unset = the server's defaults (each facet's `default_on`).
 */

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
