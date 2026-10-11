"use client";

/**
 * What the Studio has spent, in the header: the build (Σ its child executions — the factory's own
 * reading, `loadBuildCosts`) and the latest run in the center (Σ the executions of that run's
 * requests). Measured costs only, read once each finishes; shown through THE `<Cost>` (points for
 * people, both units for admins). Nothing measured yet → nothing shown, never a confident zero.
 */

import { useEffect, useState } from "react";
import { Cost } from "@/components/cost/Cost";
import { selectInstanceStatus } from "@ai-matrx/chat/agents/redux/execution-system/conversations/conversations.selectors";
import { selectUserRequestIdsForConversation } from "@ai-matrx/chat/agents/redux/execution-system/observability/observability.selectors";
import { loadBuildCosts } from "@/features/agents/factory/overview";
import { useAppSelector } from "@/lib/redux/hooks";
import { createClient } from "@/utils/supabase/client";

/** Σ cost of every execution of these requests, in dollars; null = nothing measured. */
export async function loadRequestsCost(requestIds: string[]): Promise<number | null> {
  if (requestIds.length === 0) return null;
  const { data, error } = await createClient()
    .schema("runtime")
    .from("global_execution")
    .select("cost")
    .in("request_id", requestIds)
    .limit(2000);
  if (error) throw new Error(`The run cost did not load: ${error.message}`);
  const rows = data ?? [];
  if (rows.length === 0) return null;
  return rows.reduce((sum, r) => sum + Number(r.cost ?? 0), 0);
}

export function StudioCost({
  buildId,
  buildDone,
  runConversationId,
}: {
  buildId: string | null;
  buildDone: boolean;
  runConversationId: string | null;
}) {
  const [buildUsd, setBuildUsd] = useState<number | null>(null);
  const [runUsd, setRunUsd] = useState<number | null>(null);
  const requestIds = useAppSelector((s) =>
    runConversationId ? selectUserRequestIdsForConversation(runConversationId)(s) : null,
  );
  const runStatus = useAppSelector((s) => (runConversationId ? selectInstanceStatus(runConversationId)(s) : undefined));
  const requestKey = (requestIds ?? []).join(",");

  useEffect(() => {
    if (!buildId || !buildDone) return;
    let live = true;
    void loadBuildCosts([buildId])
      .then((m) => {
        const usd = m.get(buildId) ?? 0;
        if (live) setBuildUsd(usd > 0 ? usd : null);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [buildId, buildDone]);

  useEffect(() => {
    setRunUsd(null);
    if (!requestKey || runStatus !== "complete") return;
    let live = true;
    // The run's last execution row lands just after the stream ends; read once it has.
    const t = setTimeout(() => {
      void loadRequestsCost(requestKey.split(","))
        .then((usd) => {
          if (live) setRunUsd(usd);
        })
        .catch(() => undefined);
    }, 2500);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [requestKey, runStatus]);

  if (buildUsd === null && runUsd === null) return null;
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="studio-cost">
      {buildUsd !== null && (
        <span>
          Build <Cost usd={buildUsd} short />
        </span>
      )}
      {runUsd !== null && (
        <span>
          Run <Cost usd={runUsd} short />
        </span>
      )}
    </span>
  );
}
