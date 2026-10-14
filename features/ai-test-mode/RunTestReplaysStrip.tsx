"use client";

/**
 * RunTestReplaysStrip — one row per step of a workflow run that the server
 * answered from a saved result (AI test mode), each with its badge. Absent
 * when the run has none.
 */

import { useEffect, useState } from "react";
import { AiTestReplayBadge } from "./AiTestReplayBadge";
import { fetchRunTestReplays, type RunTestReplay } from "./run-replays";

export function RunTestReplaysStrip({ runId }: { runId: string }) {
  const [rows, setRows] = useState<RunTestReplay[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRunTestReplays(runId)
      .then((next) => {
        if (!cancelled) {
          setRows(next);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  if (error) return <div className="px-2 py-1 text-[11px] text-destructive">{error}</div>;
  if (rows.length === 0) return null;
  return (
    <ul className="flex flex-col border-b border-border text-xs" data-run-test-replays={rows.length}>
      {rows.map((row) => (
        <li key={row.outcomeId} className="flex min-w-0 items-center gap-2 px-2 py-1">
          <AiTestReplayBadge replay={row.replay} />
          <span className="truncate font-mono">{row.nodeId}</span>
          {row.replay.label ? (
            <span className="truncate text-muted-foreground">{row.replay.label}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
