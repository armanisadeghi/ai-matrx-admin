// providers/StoreProvider.tsx
//
// Synchronous client-side store bootstrap. Creates the store once per tree
// mount via `useRef` initializer and then synchronously runs `bootSync` so
// localStorage-rehydrated state is applied before children render (no FOUC).
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

export default function StoreProvider({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: Partial<InitialReduxState> & LiteInitialReduxState;
}) {
  const storeRef = useRef<AppStore | null>(null);

  if (!storeRef.current) {
    const store = makeStore(initialState);
    // bootSync is async-shaped but awaits no I/O in Phase 1 — it just runs
    // the legacy migration + localStorage rehydrate + channel listener
    // attach synchronously. Fire-and-forget is safe; the rehydrate dispatch
    // happens inside this call before the promise tick resolves.
    void bootSync({
      store,
      identity: store._sync.identity,
      policies: syncPolicies,
      openChannel: () => store._sync.channel,
    });
    storeRef.current = store;
  }

  if (!storeRef.current) {
    throw new Error("Redux store failed to initialize");
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
