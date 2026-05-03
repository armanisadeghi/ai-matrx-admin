"use client";

import { useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { sessionsListLoaded } from "../redux/slice";
import type { StudioSession } from "../types";

interface StudioHydratorProps {
  seeds: StudioSession[];
  initialSessionId?: string | null;
}

/**
 * One-shot Redux hydrator. Server-fetches the session list and seeds Redux
 * during the first render pass — before child components subscribe — so we
 * skip the loading flash on cold loads.
 *
 * Do NOT use useEffect: that fires after paint, producing a one-frame flash.
 */
export function StudioHydrator({ seeds, initialSessionId }: StudioHydratorProps) {
  const dispatch = useAppDispatch();
  const hydrated = useRef(false);

  if (!hydrated.current) {
    dispatch(sessionsListLoaded(seeds));
    if (initialSessionId) {
      // Defer to slice action only when the id resolves to a known session.
      // Unknown ids fall through to "no active session" — the empty state.
      const exists = seeds.some((s) => s.id === initialSessionId);
      if (exists) {
        dispatch({
          type: "transcriptStudio/activeSessionIdSet",
          payload: initialSessionId,
        });
      }
    }
    hydrated.current = true;
  }

  return null;
}
