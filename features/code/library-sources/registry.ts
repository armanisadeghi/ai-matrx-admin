"use client";

import type { LibrarySourceAdapter } from "./types";

/**
 * In-memory adapter registry. Builtin adapters register themselves at
 * import time via `library-sources/index.ts`; callers only ever read.
 */
const adapters = new Map<string, LibrarySourceAdapter>();
const prefixes: LibrarySourceAdapter[] = [];

export function registerLibrarySource(adapter: LibrarySourceAdapter): void {
  if (adapters.has(adapter.sourceId)) {
    // Re-registration is a no-op so Fast Refresh in dev doesn't explode.
    return;
  }
  adapters.set(adapter.sourceId, adapter);
  prefixes.push(adapter);
}

export function getLibrarySource(
  sourceId: string,
): LibrarySourceAdapter | undefined {
  return adapters.get(sourceId);
}

export function listLibrarySources(): LibrarySourceAdapter[] {
  return [...adapters.values()];
}

/** Find the adapter whose `tabIdPrefix` owns the given tab id. */
export function getAdapterForTabId(
  tabId: string,
): LibrarySourceAdapter | undefined {
  for (const adapter of prefixes) {
    if (tabId.startsWith(adapter.tabIdPrefix)) return adapter;
  }
  return undefined;
}
