/**
 * traySnapshotMap — module-level registry mapping a window id to a captured
 * data-URL snapshot used in the minimized tray chip.
 *
 * Why module-level (not Redux):
 *
 *   - Data URLs can be 50–200 KB. Keeping them out of Redux avoids
 *     cluttering DevTools time-travel with megabytes of base64.
 *   - serializableCheck would warn on every dispatch (technically a string
 *     IS serializable but the volume is wasteful).
 *   - Subscribers need re-render on snapshot ready — we expose a tiny
 *     subscribe API for `useSyncExternalStore`-style consumers.
 *
 * Lifecycle:
 *   - `WindowPanel` captures via `registry.captureTraySnapshot` JUST BEFORE
 *     the minimize transition fires. Result is stored here.
 *   - `TrayChipPreview` subscribes via `subscribeTraySnapshotMap` and reads
 *     via `getTraySnapshot(id)`.
 *   - On restore (un-minimize), the snapshot is cleared so a future
 *     minimize captures fresh state.
 *   - On unregister, the snapshot is cleared.
 */

const map = new Map<string, string>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) fn();
}

/** Set the snapshot for a given window id. Notifies subscribers. */
export function setTraySnapshot(id: string, dataUrl: string): void {
  if (map.get(id) === dataUrl) return;
  map.set(id, dataUrl);
  notify();
}

/** Clear the snapshot for a given window id. */
export function clearTraySnapshot(id: string): void {
  if (!map.has(id)) return;
  map.delete(id);
  notify();
}

/** Read the snapshot for a given window id, or null. */
export function getTraySnapshot(id: string): string | null {
  return map.get(id) ?? null;
}

/**
 * Subscribe to map changes. Returns an unsubscribe function. Used by
 * `TrayChipPreview` to re-render when an async snapshot capture finishes.
 */
export function subscribeTraySnapshotMap(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
