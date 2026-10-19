"use client";

/**
 * A one-way bridge from the ladder's own component state to the Knowledge
 * room's agent surface. The ladder owns `runningStep` (the rung it is running
 * right now); it is not in any query cache, so the ladder publishes it here and
 * `KnowledgeRoomSurface` reads the latest at trigger time. Null-safe outside
 * the room (the floating discovery window has no provider).
 */

import { createContext, useContext, useEffect, type RefObject } from "react";
import type { DiscoveryStepKey } from "./data";

export const RunningStepContext = createContext<RefObject<DiscoveryStepKey | null> | null>(null);

export function usePublishRunningStep(step: DiscoveryStepKey | null): void {
  const ref = useContext(RunningStepContext);
  useEffect(() => {
    if (!ref) return;
    ref.current = step;
    return () => {
      ref.current = null;
    };
  }, [ref, step]);
}
