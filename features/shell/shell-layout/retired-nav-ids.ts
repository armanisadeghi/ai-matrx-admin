// features/shell/shell-layout/retired-nav-ids.ts — every nav id that ever left the menu.
//
// Nav ids (`ShellNavItem.id` / `ShellNavChild.id` in features/shell/constants/nav-data.ts) are
// PERMANENT: stored custom layouts reference them. An id may leave the menu only with a row here
// naming its successor (the id that now stands for the same destination) or `null` (the
// destination is gone; stored layouts drop it and say so). Never delete a row: an old stored body
// can name any id that ever existed. Guard: features/shell/__tests__/nav-ids.test.ts.

export const RETIRED_NAV_IDS: Readonly<Record<string, string | null>> = {
  // Marketing pillar key "clients" became "brands" (brands, never clients - Arman, 2026-10-21).
  "marketing.clients.brands": "marketing.brands.brands",
  // "Matrx Search" (/search/experience) became /search itself - one Google-layout page (owner, 2026-10-21).
  "web.search-tools": "web.search",
};

/**
 * Follows the retired map to the id that stands for `id` today. `retired` is true when any hop
 * was taken; `id` is null when the chain ends at a destination that is gone. A cycle (a defect in
 * this file) ends as gone rather than looping.
 */
export function resolveRetiredNavId(
  id: string,
  retired: Readonly<Record<string, string | null>> = RETIRED_NAV_IDS,
): { id: string | null; retired: boolean } {
  let current: string | null = id;
  let hops = 0;
  const seen = new Set<string>();
  while (current !== null && Object.hasOwn(retired, current)) {
    if (seen.has(current)) return { id: null, retired: true };
    seen.add(current);
    current = retired[current] ?? null;
    hops += 1;
  }
  return { id: current, retired: hops > 0 };
}
