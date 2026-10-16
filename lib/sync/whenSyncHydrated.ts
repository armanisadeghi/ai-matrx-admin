// lib/sync/whenSyncHydrated.ts
//
// The engine's "persisted state has been read" signal, outside React. The hook
// (`useSyncHydrated`) and the promise (`whenSyncHydrated`) share ONE tracker,
// so both obey the same backstop and never hang.

import { fairTimeout, type FairTimeout } from "@/lib/timing/fairTimeout";

/** How long a surface waits for persisted hydration before giving up, loudly. */
export const HYDRATION_BACKSTOP_MS = 8000;

interface SyncSettledSource {
  hydrationSettled: () => boolean;
  onHydrationSettledChange: (listener: () => void) => () => void;
  /** Absent on hand-built test stores: then the backstop counts from subscribe. */
  bootStarted?: () => boolean;
}

function readSyncSource(store: unknown): SyncSettledSource | null {
  const sync = (store as { _sync?: Partial<SyncSettledSource> } | null)?._sync;
  if (
    !sync ||
    typeof sync.hydrationSettled !== "function" ||
    typeof sync.onHydrationSettledChange !== "function"
  ) {
    return null;
  }
  return sync as SyncSettledSource;
}

/**
 * A tiny external store over the engine's settled signal, plus the backstop.
 * External-store shape on purpose: `useSyncExternalStore` is how React reads a
 * value that lives outside it, and it keeps this hook free of the
 * setState-in-an-effect cascade.
 */
export interface SettledTracker {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => boolean;
  /** SSR has no engine and nothing persisted — settled by definition. */
  getServerSnapshot: () => boolean;
}

export function createSettledTracker(store: unknown): SettledTracker {
  const source = readSyncSource(store);
  // No engine (a test store, a non-app context): nothing to wait for.
  if (!source) {
    return {
      subscribe: () => () => {},
      getSnapshot: () => true,
      getServerSnapshot: () => true,
    };
  }
  let backstopFired = false;
  return {
    getSnapshot: () => backstopFired || source.hydrationSettled(),
    getServerSnapshot: () => true,
    subscribe: (onChange: () => void) => {
      // The backstop measures the ENGINE, so it arms when boot starts — not at
      // first render. SyncBootstrap defers boot on purpose (window load, idle,
      // streamed boundaries) and bounds that wait itself; counting it here
      // turned a slow page load into a false "defect in the boot path" (D345).
      // A FAIR timeout: a page frozen past the deadline is not the engine's
      // failure, and settling is usually queued right behind the freeze.
      let backstop: FairTimeout | null = null;
      const armBackstop = () => {
        if (backstop !== null || backstopFired) return;
        if (source.bootStarted && !source.bootStarted()) return;
        backstop = fairTimeout(HYDRATION_BACKSTOP_MS);
        void backstop.expired.then(() => {
          if (source.hydrationSettled()) return;
          // LOUD: reaching here means the engine never finished reading
          // persisted state. Consumers stop waiting and show their honest empty
          // state rather than a spinner that never ends.
          console.error(
            `[sync] persisted hydration did not settle within ${HYDRATION_BACKSTOP_MS}ms of boot starting — ` +
              "surfaces waiting on restored state will now show their empty state. " +
              "This is a defect in the sync engine's boot path, not a normal path.",
          );
          backstopFired = true;
          onChange();
        });
      };
      const unsubscribe = source.onHydrationSettledChange(() => {
        armBackstop();
        onChange();
      });
      armBackstop();
      return () => {
        unsubscribe();
        backstop?.cancel();
      };
    },
  };
}

/**
 * Resolves once the sync engine has read persisted state for the current
 * identity (or the backstop fired). A loader that would otherwise go to the
 * network awaits this first, so a warm reload answers from the saved copy
 * instead of racing it. A store without the engine resolves at once.
 */
export function whenSyncHydrated(store: unknown): Promise<void> {
  const tracker = createSettledTracker(store);
  if (tracker.getSnapshot()) return Promise.resolve();
  return new Promise((resolve) => {
    let unsubscribe: (() => void) | null = null;
    let done = false;
    const check = () => {
      if (done || !tracker.getSnapshot()) return;
      done = true;
      unsubscribe?.();
      resolve();
    };
    unsubscribe = tracker.subscribe(check);
    check();
  });
}
