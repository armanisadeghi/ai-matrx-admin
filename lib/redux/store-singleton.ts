// lib/redux/store-singleton.ts
//
// Pure leaf module holding the runtime store reference. Both store factories
// (`makeStore` in `./store.ts` and `makeEntityStore` in `./entity-store.ts`)
// call `setStoreSingleton()` after building the store. Consumers (utility
// modules that need to read state from outside React) call
// `getStoreSingleton()`.
//
// CRITICAL: this file imports nothing at runtime. That's the whole point —
// utilities that previously imported `getStore` from `@/lib/redux/store`
// dragged the entire reducer/middleware/saga graph into the consumer's
// chunk and produced TDZ cycles when a slice imported a util that imported
// the store. Routing through this leaf module breaks the cycle.
//
// The `AppStore` type import is `import type` only (erased at runtime) so
// it does not create a load-time dependency on `./store.ts`.
//
// See `~/.claude/plans/the-entity-system-which-bubbly-wind.md`.

import type { AppStore } from "./store";

let storeInstance: AppStore | null = null;

export function setStoreSingleton(store: AppStore): void {
  storeInstance = store;
}

export function getStoreSingleton(): AppStore | null {
  return storeInstance;
}

/**
 * @deprecated Migration alias for callers that previously imported
 * `getStore` from `@/lib/redux/store`. Use `getStoreSingleton`. The alias
 * preserves source-compat while we migrate call sites.
 */
export const getStore = getStoreSingleton;
