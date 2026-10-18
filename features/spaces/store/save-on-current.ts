// features/spaces/store/save-on-current.ts — one write that lands on a page's CURRENT stored version.

import type { SpaceDoc, SpaceId, SpacesStore } from "../contract";

/**
 * Writes `build(current)` over the page's CURRENT stored version (read fresh), retrying when someone
 * saved in between — never the version the page had when it was made. A template's pages are visible
 * (and openable) while the rest are made; a write made meanwhile must not leave one empty.
 */
export async function saveOnCurrent(store: SpacesStore, id: SpaceId, build: (current: SpaceDoc) => SpaceDoc): Promise<SpaceDoc> {
  let last: unknown = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await store.get(id);
    if (!current) throw new Error("The page could not be read back.");
    try {
      return await store.save(build(current), current.version);
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error("The page could not be saved.");
}
