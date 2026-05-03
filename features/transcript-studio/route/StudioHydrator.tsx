"use client";

import { useEffect, useRef } from "react";
import { useStore } from "react-redux";
import { activeSessionIdSet, sessionsListLoaded } from "../redux/slice";
import type { StudioSession } from "../types";

interface StudioHydratorProps {
  seeds: StudioSession[];
  initialSessionId?: string | null;
}

/**
 * One-shot Redux hydrator. Seeds the studio session list from server-fetched
 * data into the store after the first commit.
 *
 * Implementation note (React 19 + react-redux 9):
 *   We use `useEffect` rather than the render body or `useState`'s lazy
 *   initializer. Both render-phase paths fire React's "Cannot update a
 *   component while rendering a different component" warning because the
 *   dispatch synchronously notifies every subscribed component (sidebar,
 *   layout, etc.) which queues setStates inside their `useSyncExternalStore`
 *   subscriptions.
 *
 *   `useEffect` runs after the first commit, so subscribers see the update
 *   on the second render — no in-render warning. The visible cost is one
 *   frame where the sidebar shows the loading skeleton; in practice it's a
 *   single tick on warm caches and not perceptible. To eliminate it
 *   entirely, plumb the seeds through the authenticated layout's
 *   `initialReduxState` (Phase 9 polish — out of scope here).
 */
export function StudioHydrator({
  seeds,
  initialSessionId,
}: StudioHydratorProps) {
  const store = useStore();
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    store.dispatch(sessionsListLoaded(seeds));
    if (initialSessionId && seeds.some((s) => s.id === initialSessionId)) {
      store.dispatch(activeSessionIdSet(initialSessionId));
    }
    // Effect is intentionally one-shot. Seeds + initialSessionId are
    // captured once on mount; subsequent navigations to the same route
    // unmount/remount the page wrapper anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
