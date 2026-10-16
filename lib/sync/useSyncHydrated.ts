"use client";

// lib/sync/useSyncHydrated.ts
//
// "Has persisted state finished loading?" — the one honest answer.
//
// WHY (W43, 2026-09-12): a surface that restores something from the sync
// engine could not tell "nothing was saved" from "not read yet". The engine
// reads localStorage after React hydration, IndexedDB a turn later, and the
// SIGNED-IN person's records only on the identity resync that lands ~100ms
// after an anonymous first render. So for the first few hundred milliseconds
// every cache legitimately looks empty — and a surface that draws conclusions
// from that renders a confident lie. On /masterwork/new it rendered step 2 of
// the guided start with DEFAULT answers while the Expert's real ones were
// still in IndexedDB, and pressing Start created a Rulebook from the defaults.
//
// Use this anywhere "restored or not?" changes what the user sees. It NEVER
// hangs: if hydration has not settled inside `HYDRATION_BACKSTOP_MS` it
// screams and reports settled, because a surface stuck on a spinner forever is
// a worse failure than an honest "we could not find your saved answers".

import { useState, useSyncExternalStore } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import { createSettledTracker } from "@/lib/sync/whenSyncHydrated";

export { HYDRATION_BACKSTOP_MS } from "@/lib/sync/whenSyncHydrated";

/**
 * `true` once the sync engine has finished reading persisted state for the
 * CURRENT identity (or the backstop fired). A store without the engine — a
 * test store, a non-app context — is settled immediately: there is nothing
 * to wait for.
 */
export function useSyncHydrated(): boolean {
  const store = useAppStore();
  const [tracker] = useState(() => createSettledTracker(store));
  return useSyncExternalStore(
    tracker.subscribe,
    tracker.getSnapshot,
    tracker.getServerSnapshot,
  );
}
