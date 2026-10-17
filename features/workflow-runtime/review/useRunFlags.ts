"use client";

// The flags one run raised. Read from workflow.run_log (row security: whoever
// can read the run). Re-read whenever the run's status moves, so a live run's
// flags appear as it settles — no polling.

import { useEffect, useState } from "react";

import { fetchRunFlags, type RunFlag } from "./service";

export interface RunFlagsState {
  flags: RunFlag[];
  error: string | null;
}

export function useRunFlags(runId: string, statusKey: string | null): RunFlagsState {
  const [state, setState] = useState<RunFlagsState>({ flags: [], error: null });
  useEffect(() => {
    let live = true;
    void fetchRunFlags(runId)
      .then((flags) => {
        if (live) setState({ flags, error: null });
      })
      .catch((error: unknown) => {
        if (live)
          setState((prev) => ({
            flags: prev.flags,
            error: error instanceof Error ? error.message : "Could not read this run's flags.",
          }));
      });
    return () => {
      live = false;
    };
  }, [runId, statusKey]);
  return state;
}

/** Flag count per step (node id), for the run journey's markers. */
export function flagsByNode(flags: readonly RunFlag[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const flag of flags) {
    if (!flag.node_id) continue;
    out[flag.node_id] = (out[flag.node_id] ?? 0) + 1;
  }
  return out;
}
