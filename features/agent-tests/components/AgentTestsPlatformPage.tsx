"use client";

import { useEffect, useState } from "react";
import Link from "@/components/navigation/AppLink";
import { FlaskConical } from "lucide-react";
import { EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";
import {
  ArchiveFilter,
  DEFAULT_ARCHIVE_FILTER,
  ReadFailure,
  type ArchiveFilterValue,
} from "@ai-matrx/design-system";
import {
  MatrxDataTable,
  type MatrxColumnDef,
  type MatrxDataTableCopyConfig,
} from "@ai-matrx/design-system/data-table";
import { createClient } from "@/utils/supabase/client";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { fetchPlatformRuns } from "../service";
import { passRate } from "../verdicts";
import type { TestRunView, TestVerdict } from "../types";
import { RunsTable } from "./AgentTestTables";
import { TestCost } from "./TestCost";
import { openOutbound } from "@ai-matrx/kit/outbound";

const ADMIN_AGENT_BASE = "/administration/agents/system-agents/agents";

interface AgentRollup {
  agentId: string;
  name: string;
  runs: number;
  byVerdict: Partial<Record<TestVerdict, number>>;
  spentCents: number | null;
  lastRunAt: string;
}

function rollup(
  runs: TestRunView[],
  names: ReadonlyMap<string, string>,
): AgentRollup[] {
  const byAgent = new Map<string, AgentRollup>();
  for (const run of runs) {
    for (const agentId of run.agentIds) {
      const row = byAgent.get(agentId) ?? {
        agentId,
        name: names.get(agentId) ?? "Agent",
        runs: 0,
        byVerdict: {},
        spentCents: null,
        lastRunAt: run.createdAt,
      };
      row.runs += 1;
      if (run.createdAt > row.lastRunAt) row.lastRunAt = run.createdAt;
      for (const [verdict, n] of Object.entries(run.counts?.byVerdict ?? {})) {
        const key = verdict as TestVerdict;
        row.byVerdict[key] = (row.byVerdict[key] ?? 0) + (n ?? 0);
      }
      if (run.spentCents !== null)
        row.spentCents = (row.spentCents ?? 0) + run.spentCents;
      byAgent.set(agentId, row);
    }
  }
  return [...byAgent.values()];
}

async function fetchAgentNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("agent")
    .from("definition")
    .select("id, name")
    .in("id", ids);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.id, row.name]));
}

const ROLLUP_COLUMNS: MatrxColumnDef<AgentRollup>[] = [
  {
    id: "agent",
    header: "Agent",
    accessorFn: (r) => r.name,
    filter: "text",
    width: 260,
    frozen: true,
    cell: (r) => (
      <Link
        className="hover:underline"
        href={`${ADMIN_AGENT_BASE}/${r.agentId}/test`}
      >
        {r.name}
      </Link>
    ),
  },
  {
    id: "runs",
    header: "Runs",
    accessorFn: (r) => r.runs,
    filter: "number",
    width: 90,
  },
  {
    id: "pass_rate",
    header: "Pass rate",
    accessorFn: (r) => passRate(r.byVerdict),
    filter: "number",
    width: 110,
    cell: (r) => {
      const rate = passRate(r.byVerdict);
      return rate === null ? "—" : `${Math.round(rate * 100)}%`;
    },
  },
  {
    id: "spent",
    header: "Spend",
    accessorFn: (r) => r.spentCents,
    filter: "number",
    width: 140,
    cell: (r) => <TestCost cents={r.spentCents} seat="admin" />,
  },
  {
    id: "last",
    header: "Last run",
    accessorFn: (r) => r.lastRunAt,
    filter: "date",
    width: 170,
  },
];

const ROLLUP_COPY: MatrxDataTableCopyConfig<AgentRollup> = {
  label: "Agent test rollup",
  listLabel: "Agent test rollups (this view)",
  location: "Admin — agent tests",
  rowKind: "agent-test-rollup",
  listKind: "agent-test-rollup-list",
  rowDescription:
    "One agent's platform test runs: count, pass rate, spend and last run.",
  listDescription: "Platform test runs grouped by agent.",
  humanRow: (r) => [`Agent: ${r.name}`, `Runs: ${r.runs}`].join("\n"),
};

/** /administration/agents/tests — every platform test run, and pass rate and spend per agent. */
export function AgentTestsPlatformPage() {
  const [state, setState] = useState<
    | { state: "loading" }
    | { state: "failed"; error: unknown }
    | { state: "ready"; runs: TestRunView[]; names: Map<string, string> }
  >({ state: "loading" });
  const [archive, setArchive] = useState<ArchiveFilterValue>(
    DEFAULT_ARCHIVE_FILTER,
  );

  useEffect(() => {
    let live = true;
    (async () => {
      const runs = await fetchPlatformRuns(archive);
      const names = await fetchAgentNames([
        ...new Set(runs.flatMap((r) => r.agentIds)),
      ]);
      return { runs, names };
    })()
      .then(
        ({ runs, names }) => live && setState({ state: "ready", runs, names }),
      )
      .catch((error: unknown) => live && setState({ state: "failed", error }));
    return () => {
      live = false;
    };
  }, [archive]);

  return (
    <>
      <RecordPageHeader level={{ name: "Agent tests" }} />
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto px-[var(--matrx-page-gutter)] pt-[calc(var(--shell-header-h)+var(--matrx-page-top))]">
        <div className="flex justify-end">
          <ArchiveFilter
            value={archive}
            onValueChange={setArchive}
            aria-label="Archived runs"
          />
        </div>
        {state.state === "loading" ? (
          <RegionSkeleton
            shape="rows"
            count={5}
            aria-label="Loading platform test runs"
          />
        ) : state.state === "failed" ? (
          <ReadFailure what="platform test runs" error={state.error} />
        ) : state.runs.length === 0 ? (
          <EmptyState
            icon={<FlaskConical />}
            title="No platform test runs yet"
          />
        ) : (
          <>
            <MatrxDataTable<AgentRollup>
              tableId="admin/agents/tests/by-agent"
              data={rollup(state.runs, state.names)}
              columns={ROLLUP_COLUMNS}
              getRowId={(r) => r.agentId}
              pageSize={0}
              density="condensed"
              viewTabs={false}
              toolbar={{
                title: "By agent",
                searchPlaceholder: "Search agents",
              }}
              detail={{ enabled: false }}
              copy={ROLLUP_COPY}
            />
            <RunsTable
              runs={state.runs}
              seat="admin"
              onOpen={(run) => {
                const agentId = run.agentIds[0];
                if (agentId)
                  openOutbound(
                    `${ADMIN_AGENT_BASE}/${agentId}/test?run=${run.id}`,
                    "_blank",
                    "noopener",
                  );
              }}
            />
          </>
        )}
      </div>
    </>
  );
}
