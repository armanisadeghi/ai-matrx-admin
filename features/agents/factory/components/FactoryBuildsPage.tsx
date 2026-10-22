"use client";

/**
 * /administration/agents/factory — every Agent Factory build on the platform
 * (platform scope: the admin seat never filters to its own builds).
 *
 * One row per build (root `runtime.global_execution` of type
 * `agent_factory_build`), its facts read from the build's latest checkpoint.
 * A row opens the build's step-by-step view. The list re-reads when a build
 * starts or changes status (realtime on the build rows), never on a timer.
 */

import { mandateDisplayName } from "@/features/mandates/mandate-words";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Plus } from "lucide-react";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { Button } from "@ai-matrx/design-system/controls";
import { storedMandateKey } from "@ai-matrx/agents/mandates";
import { EntityRef } from "@ai-matrx/records-ui/entity-ref";
import {
  outcomeChip,
  outcomeLabel,
  OUTCOME_CODES,
  verdictChip,
} from "@/components/mardown-display/blocks/agent-factory-kinds/AgentFactoryKindBlocks";
import { listFactoryBuildsPage } from "../service";
import { serverTableInitialState, useServerTable } from "@/features/admin/shared/server-table/useServerTable";
import {
  STEP_LABEL,
  spineIsOver,
  type FactoryBuildRow,
  type FactoryStepName,
} from "../types";
import { StartBuildDialog } from "./StartBuildDialog";
import { SpineStatusChip, formatDuration } from "./factory-shared";
import { BuildRunsSection } from "./BuildRunsSection";
import { FactoryDoorsTable } from "./FactoryDoorsTable";
import { AdminUserRef } from "@/features/admin/users/components/AdminUserRef";
import { CostDoor } from "@/components/cost/CostDoor";
import { DOORS, buildPlaceLabel, doorLabel, loadBuildCosts } from "../overview";

export const FACTORY_BASE_PATH = "/administration/agents/factory";

export function factoryBuildHref(id: string): string {
  return `${FACTORY_BASE_PATH}/${id}`;
}

const STATUS_OPTIONS = [
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Canceled" },
  { value: "pending", label: "Queued" },
];

const PLACE_OPTIONS = [
  ...DOORS.map((d) => ({ value: d.key, label: d.place })),
  { value: "system_plan", label: "Orchestra Studio (via Agent Studio)" },
  { value: "admin_page", label: "Admin page" },
  { value: "script", label: "Script" },
  { value: "not_recorded", label: "Not recorded" },
];

const INITIAL_STATE = serverTableInitialState({ id: "started", direction: "desc" }, 50);

export function FactoryBuildsPage() {
  const router = useRouter();
  const [startOpen, setStartOpen] = useState(false);
  const [costs, setCosts] = useState<Map<string, number> | null>(null);
  const [costError, setCostError] = useState(false);
  const { rows, reload, tableProps } = useServerTable<FactoryBuildRow>(
    listFactoryBuildsPage,
    INITIAL_STATE,
    "builds",
    "",
    "agent-factory-builds",
  );

  const rowIds = useMemo(() => rows.map((r) => r.id).join(","), [rows]);
  useEffect(() => {
    if (!rowIds) return undefined;
    let live = true;
    loadBuildCosts(rowIds.split(","))
      .then((c) => {
        if (!live) return;
        setCosts(c);
        setCostError(false);
      })
      .catch((e) => {
        console.error("[agent-factory] could not load build costs", e);
        if (live) setCostError(true);
      });
    return () => {
      live = false;
    };
  }, [rowIds]);

  const buildRows = useMemo(
    () => rows.map((r) => ({ ...r, cost: costs ? (costs.get(r.id) ?? 0) : null })),
    [rows, costs],
  );

  const columns = useMemo(
    (): MatrxColumnDef<FactoryBuildRow>[] => [
      {
        id: "started",
        accessorKey: "createdAt",
        header: "Started",
        filter: "date",
        width: 130,
        cell: (r) => (
          <span
            className="whitespace-nowrap type-secondary text-muted-foreground"
            title={new Date(r.createdAt).toLocaleString()}
          >
            {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
          </span>
        ),
      },
      {
        id: "who",
        accessorFn: (r) => r.userId ?? "",
        header: "Who",
        width: 230,
        filter: "text",
        cell: (r) =>
          r.userId ? (
            <div className="min-w-0">
              <AdminUserRef userId={r.userId} hideEmail={r.originClass === "system"} />
              {r.originClass === "system" ? (
                <div className="truncate text-[11px] text-muted-foreground">
                  {r.origin === "script"
                    ? "Started by a script"
                    : "No person recorded"}
                </div>
              ) : null}
            </div>
          ) : (
            <span className="type-secondary text-muted-foreground">—</span>
          ),
      },
      {
        id: "door",
        accessorFn: (r) => buildPlaceLabel(r),
        header: "Door",
        filter: "select",
        filterOptions: PLACE_OPTIONS,
        width: 230,
        cell: (r) => (
          <span className="truncate type-secondary">{buildPlaceLabel(r)}</span>
        ),
      },
      {
        id: "outcome",
        filter: "select",
        filterOptions: (OUTCOME_CODES ?? []).map((c) => ({ value: c, label: outcomeLabel(c) })),
        accessorFn: (r) => (r.outcome ? outcomeLabel(r.outcome) : ""),
        header: "Outcome",
        width: 175,
        cell: (r) =>
          outcomeChip(r.outcome) ?? (
            <span className="type-secondary text-muted-foreground">—</span>
          ),
      },
      {
        id: "cost",
        filter: false,
        sortable: false,
        accessorFn: (r) => r.cost ?? 0,
        header: costError ? "Cost (not loaded)" : "Cost",
        width: 100,
        cell: (r) => <CostDoor usd={r.cost} iconOnly />,
      },
      {
        id: "agent",
        filter: false,
        sortable: false,
        accessorFn: (r) => r.agentId ?? "",
        header: "Agent",
        width: 130,
        cell: (r) =>
          r.agentId ? (
            <EntityRef
              token="agent"
              id={r.agentId}
              name={null}
              showIcon={false}
            />
          ) : (
            <span className="type-secondary text-muted-foreground">—</span>
          ),
      },
      {
        id: "engine",
        filter: false,
        sortable: false,
        accessorKey: "engine",
        header: "Engine",
        width: 95,
        cell: (r) => <span className="type-secondary">{r.engine}</span>,
      },
      {
        id: "mandate",
        filter: "text",
        accessorFn: (r) => r.mandateKey ?? "",
        header: "Job",
        width: 230,
        cell: (r) =>
          r.mandateKey ? (
            <span
              className="truncate font-mono type-secondary font-medium"
              title={r.name ?? undefined}
            >
              {mandateDisplayName(storedMandateKey(r.mandateKey))}
            </span>
          ) : (
            <span className="type-secondary text-muted-foreground">
              New agent
            </span>
          ),
      },
      {
        id: "status",
        accessorKey: "spineStatus",
        header: "Status",
        filter: "select",
        filterOptions: STATUS_OPTIONS,
        width: 110,
        cell: (r) => <SpineStatusChip status={r.spineStatus} />,
      },
      {
        id: "current_step",
        filter: false,
        sortable: false,
        accessorFn: (r) =>
          r.currentStep
            ? (STEP_LABEL[r.currentStep as FactoryStepName] ?? r.currentStep)
            : "",
        header: "Step",
        width: 110,
        cell: (r) => (
          <span className="type-secondary">
            {r.currentStep
              ? (STEP_LABEL[r.currentStep as FactoryStepName] ?? r.currentStep)
              : "—"}
          </span>
        ),
      },
      {
        id: "send_backs",
        filter: false,
        sortable: false,
        accessorKey: "sendBacks",
        header: "Send-backs",
        width: 100,
        cell: (r) => (
          <span className="type-secondary tabular-nums">{r.sendBacks}</span>
        ),
      },
      {
        id: "verdict",
        filter: false,
        sortable: false,
        accessorFn: (r) => r.verdict ?? "",
        header: "Judge",
        width: 100,
        cell: (r) =>
          verdictChip(r.verdict) ?? (
            <span className="type-secondary text-muted-foreground">—</span>
          ),
      },
      {
        id: "duration",
        filter: false,
        sortable: false,
        accessorFn: (r) =>
          r.endedAt
            ? new Date(r.endedAt).getTime() -
              new Date(r.startedAt ?? r.createdAt).getTime()
            : 0,
        header: "Took",
        width: 90,
        cell: (r) => (
          <span className="type-secondary tabular-nums text-muted-foreground">
            {r.endedAt
              ? formatDuration(r.startedAt ?? r.createdAt, r.endedAt)
              : "—"}
          </span>
        ),
      },
      {
        id: "build_id",
        filter: false,
        sortable: false,
        accessorKey: "id",
        header: "Build",
        cellKind: "uuid",
        width: 110,
      },
    ],
    [costError],
  );

  return (
    <div className="flex h-[calc(100dvh-2.5rem)] min-h-0 flex-col gap-3 overflow-y-auto pb-16">
      <div className="flex h-[36rem] shrink-0 flex-col overflow-hidden">
        <FactoryDoorsTable />
      </div>
      <BuildRunsSection />
      <div className="flex h-[calc(100dvh-4rem)] min-h-[28rem] shrink-0 flex-col overflow-hidden">
        <MatrxDataTable
          {...tableProps}
          data={buildRows}
          columns={columns}
          getRowId={(r) => r.id}
          getRowHref={(r) => factoryBuildHref(r.id)}
          onRowOpen={(r) => router.push(factoryBuildHref(r.id))}
          emptyState={{
            title: "No builds yet",
            description: "Start a build to see its steps here.",
          }}
          toolbar={{
            title: "Agent Factory",
            refresh: { onRefresh: reload },
            actions: (
              <Button
                variant="primary"
                icon={<Plus />}
                onClick={() => setStartOpen(true)}
              >
                Start a build
              </Button>
            ),
          }}
          copy={{
            label: "Agent Factory build",
            listLabel: "Agent Factory builds (this view)",
            location: FACTORY_BASE_PATH,
            rowKind: "agent-factory-build",
            listKind: "agent-factory-builds",
            listDescription:
              "The builds on this page of the list; filters and paging are answered by the database.",
            humanRow: (r) =>
              [
                `Build ${r.id} — ${r.mandateKey ?? "new agent"}`,
                `Status: ${r.spineStatus}; step: ${r.currentStep ?? "—"}; outcome: ${r.outcome ? `${outcomeLabel(r.outcome)} (${r.outcome})` : "—"}`,
                `Door: ${buildPlaceLabel(r)}; engine: ${r.engine}`,
                `Send-backs: ${r.sendBacks}; judge: ${r.verdict ?? "—"}; agent: ${r.agentId ?? "—"}`,
                r.error ? `Error: ${r.error}` : "",
              ]
                .filter(Boolean)
                .join("\n"),
            rowAttributes: (r) => ({ id: r.id, status: r.spineStatus }),
          }}
        />
      </div>
      <StartBuildDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        onStarted={(id) => router.push(factoryBuildHref(id))}
      />
    </div>
  );
}
