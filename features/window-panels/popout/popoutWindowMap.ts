/**
 * popoutWindowMap — module-level registry mapping a window-panel id to its
 * currently-open popout `Window` object.
 *
 * This is intentionally module-level (not Redux) because:
 *
 * 1. **`Window` objects aren't serializable.** Putting them in Redux would
 *    break the `serializableCheck` middleware and corrupt DevTools time-travel.
 *
 * 2. **Cross-component lookup without prop drilling.** `PopoutPortal`,
 *    `usePopoutWindow`, and the `beforeunload` defensive cleanup all need to
 *    locate a popout by id without coordinating through React context.
 *
 * 3. **Singleton lifetime matches page lifetime.** The map is naturally
 *    cleared when the user navigates away or reloads.
 *
 * Subscriptions: callers can `subscribe` for change notifications. This is
 * how `PopoutPortal` discovers a newly-opened window without prop drilling
 * (its `windowId` is stable; the `Window` reference is what changes). The
 * subscription is a thin wrapper over `useSyncExternalStore`-friendly
 * primitives — see `usePopoutWindowRef` below.
 */
import { useSyncExternalStore } from "react";

const map = new Map<string, Window>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) fn();
}

/**
 * Register or replace the popout window for a given window-panel id.
 * Notifies subscribers synchronously.
 */
export function setPopoutWindow(id: string, win: Window): void {
  const prev = map.get(id);
  if (prev === win) return;
  map.set(id, win);
  notify();
}

/**
 * Remove the popout window registration for a given id. Notifies subscribers
 * if a previously-registered window is being removed.
 */
export function deletePopoutWindow(id: string): void {
  if (!map.has(id)) return;
  map.delete(id);
  notify();
}

/** Get the popout window for a given id, or `null` if none is registered. */
export function getPopoutWindow(id: string): Window | null {
  return map.get(id) ?? null;
}

/** Iterate over every currently-registered popout window. */
export function forEachPopoutWindow(
  cb: (win: Window, id: string) => void,
): void {
  for (const [id, win] of map) cb(win, id);
}

/**
 * Subscribe to map changes. Returns an unsubscribe function.
 * Used internally by `usePopoutWindowRef` for `useSyncExternalStore`.
 */
export function subscribePopoutWindowMap(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * React hook: subscribe to the popout window for a given id and re-render
 * when it changes. Returns the live `Window` reference or `null`.
 *
 * Uses `useSyncExternalStore` for tearing-free reads under React 19 strict
 * mode and concurrent rendering.
 */
export function usePopoutWindowRef(id: string): Window | null {
  return useSyncExternalStore(
    subscribePopoutWindowMap,
    () => getPopoutWindow(id),
    // SSR snapshot — popouts are never present during SSR.
    () => null,
  );
}
