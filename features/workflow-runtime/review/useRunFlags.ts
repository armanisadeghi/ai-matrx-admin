"use client";

// The flags one run raised. Read from workflow.run_log (row security: whoever
// can read the run). KEPT ONCE PER RUN (the Board's remount law: a tile that
// wakes or remounts reads nothing); re-read only when the run's status moves
// from the status the kept answer was read at, so a live run's flags appear
// as it settles — no polling.

import { useEffect } from "react";

import { useStoreRead } from "@/lib/redux/store-reads/useStoreRead";

import { fetchRunFlags, type RunFlag } from "./service";

export interface RunFlagsState {
  flags: RunFlag[];
  error: string | null;
  retry: () => void;
}

/** What is kept: the flags and the run status they were read at. */
interface KeptRunFlags {
  statusKey: string | null;
  flags: RunFlag[];
}

const NO_FLAGS: RunFlag[] = [];

export function useRunFlags(runId: string, statusKey: string | null): RunFlagsState {
  const read = useStoreRead<KeptRunFlags>(`workflow.run_flags:${runId}`, async () => ({
    statusKey,
    flags: await fetchRunFlags(runId),
  }));
  const keptStatus = read.data ? read.data.statusKey : undefined;
  const { status, refresh } = read;
  useEffect(() => {
    if (status === "ready" && keptStatus !== undefined && keptStatus !== statusKey) void refresh();
  }, [status, keptStatus, statusKey]);
  return { flags: read.data?.flags ?? NO_FLAGS, error: read.error, retry: () => void refresh() };
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
