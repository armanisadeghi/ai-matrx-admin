"use client";

/**
 * A test run's live door: row changes on `agent.test_run` (the run's counts and status) and
 * `agent.test_result` (each result's verdict) tell a reader to re-read. Nothing here polls.
 *
 * Both tables are in the `supabase_realtime` publication (migration
 * `20261021220000_agent_tests_realtime_publication.sql`) and RLS gates delivery.
 * Why a re-read and not the payload: the readers join cases and the pairwise rows, so a payload
 * alone is never the whole answer. A burst (a run writes several results in a second) folds into
 * ONE re-read. Nothing here writes these rows, so there is no own echo. Realtime has no replay,
 * so a reconnect re-reads once (`onBackfill`).
 */

import { useCallback, useEffect, useRef } from "react";
import { defineChannelNamespace } from "@ai-matrx/data/realtime";
import { useChannel } from "@ai-matrx/data/realtime/react";

const runChannel = defineChannelNamespace({
  namespace: "agent-test-run",
  parts: ["scope", "run"],
  description: "agent.test_run and agent.test_result changes for one run, so the screen re-reads instead of polling",
});

/** A burst of changes becomes one re-read after this quiet gap. */
export const RUN_CHANGE_FOLD_MS = 300;

export interface RunChangesOptions {
  /** Which screen this is (names the channel). */
  scope: string;
  /** The run to follow; null closes the channel. */
  runId: string | null;
  /** Counts or status moved. Held in a ref: a new function each render does not reopen the channel. */
  onRun?: () => void;
  /** A result was written or its verdict changed (pairwise rows included). */
  onResults?: () => void;
}

export function useRunChanges({ scope, runId, onRun, onResults }: RunChangesOptions): void {
  const handlers = useRef({ onRun, onResults });
  useEffect(() => {
    handlers.current = { onRun, onResults };
  });
  const timers = useRef<{ run: ReturnType<typeof setTimeout> | null; results: ReturnType<typeof setTimeout> | null }>({
    run: null,
    results: null,
  });
  useEffect(() => {
    const held = timers.current;
    return () => {
      if (held.run) clearTimeout(held.run);
      if (held.results) clearTimeout(held.results);
    };
  }, []);

  const fold = useCallback((which: "run" | "results") => {
    if (timers.current[which]) return;
    timers.current[which] = setTimeout(() => {
      timers.current[which] = null;
      if (which === "run") handlers.current.onRun?.();
      else handlers.current.onResults?.();
    }, RUN_CHANGE_FOLD_MS);
  }, []);

  useChannel(
    runId
      ? {
          topic: runChannel.topic({ scope, run: runId }),
          onBackfill: () => {
            fold("run");
            fold("results");
          },
          postgresChanges: [
            {
              event: "UPDATE",
              schema: "agent",
              table: "test_run",
              filter: `id=eq.${runId}`,
              rowId: (row) => (typeof row.id === "string" ? row.id : undefined),
              fingerprint: (row) => JSON.stringify([row.status ?? null, row.counts ?? null, row.version ?? null]),
              onChange: () => fold("run"),
            },
            {
              event: "*",
              schema: "agent",
              table: "test_result",
              filter: `test_run_id=eq.${runId}`,
              rowId: (row) => (typeof row.id === "string" ? row.id : undefined),
              fingerprint: (row) => JSON.stringify([row.status ?? null, row.verdict ?? null, row.version ?? null]),
              onChange: () => fold("results"),
            },
          ],
        }
      : null,
  );
}
