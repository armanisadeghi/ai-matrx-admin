"use client";

import { useState } from "react";
import { useStore } from "react-redux";
import { sessionsListLoaded, activeSessionIdSet } from "../redux/slice";
import type { StudioSession } from "../types";

interface StudioHydratorProps {
  seeds: StudioSession[];
  initialSessionId?: string | null;
}

/**
 * One-shot Redux hydrator. Server-fetches the session list and seeds Redux
 * before any subscribed component reads from the store, so cold loads skip
 * the loading flash.
 *
 * Implementation note (React 19): dispatching from the render body fires
 * subscription updates on sibling components, which logs a "Cannot update a
 * component while rendering a different component" warning. We use
 * `useState`'s lazy initializer to perform the dispatch — it runs once,
 * synchronously, before sibling components' subscriptions activate.
 *
 * This sidesteps a `useEffect` (which causes a one-frame flash because it
 * fires after paint) and keeps the seed deterministic.
 */
export function StudioHydrator({
  seeds,
  initialSessionId,
}: StudioHydratorProps) {
  const store = useStore();

  useState(() => {
    store.dispatch(sessionsListLoaded(seeds));
    if (initialSessionId && seeds.some((s) => s.id === initialSessionId)) {
      store.dispatch(activeSessionIdSet(initialSessionId));
    }
    return null;
  });

  return null;
}
