"use client";

/**
 * The Factory page's builds on the `agent_build` workflow, beside the old builds' table (D7). One
 * snapshot read, then the run announcements feed says when to read again; nothing polls. A row opens
 * the run in its build page; the run itself opens in Workflow Studio.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ErrorNotice } from "@ai-matrx/design-system";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import Link from "@/components/navigation/AppLink";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { outcomeChip } from "@/components/mardown-display/blocks/agent-factory-kinds/AgentFactoryKindBlocks";
import { StateChip } from "@/components/mardown-display/blocks/result-kinds/result-kind-shared";
import { runHref } from "@/features/workflow-runtime/run-doors";
import { listItemFromRun, type BuildRunListItem } from "../build-run";
import { listBuildRuns } from "../build-run-service";
import { useBuildRunAnnouncements } from "../useBuildRunAnnouncements";
import { FACTORY_BASE_PATH } from "./FactoryBuildsPage";

export function BuildRunsSection() {
  const [items, setItems] = useState<BuildRunListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    listBuildRuns()
      .then((rows) => {
        setItems(rows.map(listItemFromRun));
        setError(null);
      })
      // A row that cannot be drawn is an error the person sees, never a skeleton that stays forever.
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load the workflow builds"));
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);
  useBuildRunAnnouncements(reload);

  const rows = useMemo(() => items ?? [], [items]);

  if (error) return <ErrorNotice title="Workflow builds not loaded" message={error} operation="load the workflow builds" size="compact" />;
  if (items === null) return <RegionSkeleton shape="rows" count={3} aria-label="Loading workflow builds" />;
  if (rows.length === 0) return null;

  return (
    <section aria-label="Workflow builds" data-testid="build-runs-section" className="flex min-w-0 flex-col gap-1.5">
      <h2 className="type-title">Workflow builds</h2>
      <ul className="flex min-w-0 flex-col divide-y divide-border rounded-md border border-border bg-card">
        {rows.map((r) => (
          <li key={r.id} className="flex min-w-0 items-center gap-3 px-3 py-1.5" data-testid="build-run-row">
            <span className="w-28 shrink-0 type-secondary text-muted-foreground" title={new Date(r.createdAt).toLocaleString()}>
              {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
            </span>
            <Link href={`${FACTORY_BASE_PATH}/${r.id}`} className="min-w-0 flex-1 truncate type-body text-primary hover:underline">
              {r.name ?? "New agent"}
            </Link>
            {r.spineStatus === "running" ? <StateChip label="Building" tone="accent" /> : (outcomeChip(r.outcome) ?? null)}
            {r.agentId ? <EntityRef token="agent" id={r.agentId} /> : null}
            {r.definitionId ? <EntityRef token="workflow" id={r.definitionId} /> : null}
            <Link href={runHref(r.id)} className="shrink-0 type-secondary text-primary hover:underline">
              Open run
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
