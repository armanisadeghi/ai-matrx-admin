// features/launchpad/bus/store.ts — THE PAGE BUS STORE: one per launchpad page, outside React.
//
// Values are keyed by address (`busAddress(widgetId, key)`). A publish notifies only the listeners of THAT
// address, so a widget that is not connected to it never re-renders (React reads through
// `useSyncExternalStore` per address). Values live for the browser session: they are mirrored to
// `sessionStorage` under the launchpad's key and restored on reload; they are never saved to the database.
import { busAddress } from "./ports";

export interface PageBus {
  read(widgetId: string, key: string): unknown;
  publish(widgetId: string, key: string, value: unknown): void;
  subscribe(widgetId: string, key: string, listener: () => void): () => void;
}

const SESSION_PREFIX = "matrx:client:launchpad.bus:";

function storageOf(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** A bus for one page. `sessionKey` (the launchpad's key) restores this tab's values on reload; absent = memory only. */
export function createPageBus(sessionKey?: string): PageBus {
  const values = new Map<string, unknown>();
  const listeners = new Map<string, Set<() => void>>();
  const storage = sessionKey ? storageOf() : null;
  const storeKey = `${SESSION_PREFIX}${sessionKey ?? ""}`;
  if (storage) {
    try {
      const raw = storage.getItem(storeKey);
      const saved = raw ? (JSON.parse(raw) as unknown) : null;
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        for (const [k, v] of Object.entries(saved as Record<string, unknown>)) values.set(k, v);
      }
    } catch (err) {
      console.warn("[launchpad bus] this tab's saved values could not be read; starting empty", err);
    }
  }
  const persist = () => {
    if (!storage) return;
    try {
      storage.setItem(storeKey, JSON.stringify(Object.fromEntries(values)));
    } catch (err) {
      console.warn("[launchpad bus] this tab could not keep the page's values for a reload", err);
    }
  };
  return {
    read: (widgetId, key) => values.get(busAddress(widgetId, key)),
    publish(widgetId, key, value) {
      const address = busAddress(widgetId, key);
      const prior = values.get(address);
      if (prior === value) return;
      if (value === undefined || value === null) {
        if (!values.has(address)) return;
        values.delete(address);
      } else {
        if (prior !== undefined && JSON.stringify(prior) === JSON.stringify(value)) return;
        values.set(address, value);
      }
      persist();
      for (const l of [...(listeners.get(address) ?? [])]) l();
    },
    subscribe(widgetId, key, listener) {
      const address = busAddress(widgetId, key);
      let set = listeners.get(address);
      if (!set) listeners.set(address, (set = new Set()));
      set.add(listener);
      return () => {
        set.delete(listener);
        if (set.size === 0) listeners.delete(address);
      };
    },
  };
}
