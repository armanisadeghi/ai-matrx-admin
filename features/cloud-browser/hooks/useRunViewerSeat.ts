"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  holdRunViewer,
  releaseRunViewer,
  runViewerHolder,
  subscribeRunViewer,
} from "../runViewer";

/**
 * This component's claim on a run's ONE viewer seat (`../runViewer`). Hold it
 * before opening a control stream; when `elsewhere` is true another mounted
 * viewer owns the live picture and this one stays passive.
 */
export function useRunViewerSeat(runId: string | null) {
  const [owner] = useState(() => Symbol("run-viewer"));
  const holder = useSyncExternalStore(
    subscribeRunViewer,
    () => (runId ? runViewerHolder(runId) : null),
    () => null,
  );
  useEffect(() => {
    if (!runId) return;
    return () => releaseRunViewer(runId, owner);
  }, [runId, owner]);
  return {
    mine: !!runId && holder === owner,
    elsewhere: !!runId && holder !== null && holder !== owner,
    hold: (steal = false) => (runId ? holdRunViewer(runId, owner, steal) : false),
  };
}
