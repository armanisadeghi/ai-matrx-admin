// providers/StoreProvider.tsx
//
// Synchronous client-side store bootstrap. On the client the store is a
// module-level singleton so it survives React remounts (HMR, route-level
// re-renders, parent key changes) — `useRef` alone is per-instance and was
// re-running `bootSync` on every remount, leaking a fresh BroadcastChannel +
// channel listener each time (symptom: dozens of `boot.start / boot.complete`
// in a single session, duplicate broadcast dispatches).
//
// SSR path: `typeof window === "undefined"` — skip the module cache, create a
// per-render store via `useRef`. Each request stays isolated; `bootSync` is
// not invoked on the server (localStorage + BroadcastChannel are no-ops there
// anyway; the first client render runs it).
//
// Per phase-1-plan.md §6.4 + plan ground-truth delta #9: the awaited portion
// of `bootSync` is strictly synchronous work, so calling it inside the ref
// initializer is safe. Peer hydration (Phase 2+) will move to a background
// `useEffect`.

"use client";

import { AppStore, makeStore } from "@/lib/redux/store";
import { useRef } from "react";
import { Provider } from "react-redux";
import { bootSync, syncPolicies } from "@/lib/sync";
import { InitialReduxState, LiteInitialReduxState } from "@/types/reduxTypes";

// Module-level browser singleton. Populated lazily on first client render.
// Never populated on the server (the `typeof window` guard below skips it).
let clientStore: AppStore | null = null;

function getOrCreateClientStore(
  initialState?: Partial<InitialReduxState> & LiteInitialReduxState,
): AppStore {
  if (clientStore) return clientStore;
  const store = makeStore(initialState);
  void bootSync({
    store,
    identity: store._sync.identity,
    policies: syncPolicies,
    openChannel: () => store._sync.channel,
  });
  clientStore = store;
  return store;
}

export default function StoreProvider({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: Partial<InitialReduxState> & LiteInitialReduxState;
}) {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    if (typeof window !== "undefined") {
      // Browser: reuse the per-tab singleton. Idempotent across remounts.
      storeRef.current = getOrCreateClientStore(initialState);
    } else {
      // SSR: per-request store. No boot (server has no localStorage anyway).
      storeRef.current = makeStore(initialState);
    }
  }

  if (!storeRef.current) {
    throw new Error("Redux store failed to initialize");
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
