/**
 * features/files/virtual-sources/registry.ts
 *
 * Process-wide registry of `VirtualSourceAdapter` instances. Adapters are
 * registered once at app boot from `registerBuiltinVirtualSources.ts`. The
 * cloud-files tree iterates the registry to mount one virtual root per
 * adapter; thunks look adapters up by `sourceId` to dispatch read/write.
 */

import type { VirtualSourceAdapter } from "./types";

const registry = new Map<string, VirtualSourceAdapter>();

/** Register an adapter. Calling twice with the same `sourceId` replaces the
 *  prior entry — useful for hot-reload during dev; production wires register
 *  exactly once. */
export function registerVirtualSource(adapter: VirtualSourceAdapter): void {
  registry.set(adapter.sourceId, adapter);
}

/** Look up an adapter by `sourceId`. Returns `undefined` if unregistered. */
export function getVirtualSource(
  sourceId: string,
): VirtualSourceAdapter | undefined {
  return registry.get(sourceId);
}

/** Snapshot of every registered adapter, in insertion order. The cloud-files
 *  tree uses this to mount roots; selectors use it to enumerate sources. */
export function listVirtualSources(): VirtualSourceAdapter[] {
  return Array.from(registry.values());
}

/** Test/dev helper. Not used in app code. */
export function clearVirtualSourceRegistry(): void {
  registry.clear();
}
