"use client";

/**
 * The Factory list of OLD pipeline builds: a build is a root `runtime.global_execution` row of type
 * `agent_factory_build`, and every start or status change of one tells the list to re-read. Nothing polls.
 *
 * `runtime.global_execution` is in the `supabase_realtime` publication (migration
 * `20261022050000_agent_factory_builds_realtime_publication.sql`) and RLS gates delivery to the
 * platform-admin seat that can read it. The payload is never the answer (the list reads facts off each
 * build's newest checkpoint), so a burst folds into ONE re-read; realtime has no replay, so a reconnect
 * re-reads once (`onBackfill`).
 */

import { useEffect, useRef } from "react";
import { defineChannelNamespace } from "@ai-matrx/data/realtime";
import { useChannel } from "@ai-matrx/data/realtime/react";

const buildsChannel = defineChannelNamespace({
  namespace: "agent-factory-builds",
  parts: ["scope"],
  description: "Agent Factory build rows (runtime.global_execution, type agent_factory_build), so the list re-reads instead of polling",
});

/** A burst of changes becomes one re-read after this quiet gap. */
export const BUILD_CHANGE_FOLD_MS = 600;

export function useFactoryBuildChanges(onChange: () => void): void {
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const fold = () => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      latest.current();
    }, BUILD_CHANGE_FOLD_MS);
  };

  useChannel({
    topic: buildsChannel.topic({ scope: "list" }),
    onBackfill: fold,
    postgresChanges: [
      {
        event: "*",
        schema: "runtime",
        table: "global_execution",
        filter: "type=eq.agent_factory_build",
        rowId: (row) => (typeof row.id === "string" ? row.id : undefined),
        fingerprint: (row) => JSON.stringify([row.status ?? null, row.updated_at ?? null]),
        onChange: fold,
      },
    ],
  });
}
