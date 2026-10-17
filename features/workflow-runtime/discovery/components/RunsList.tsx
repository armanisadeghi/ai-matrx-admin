"use client";

/**
 * The runs list — census #39, one component for both doors.
 *
 * `/workflows/runs` lists every run the caller can see; `/workflows/[id]/runs`
 * lists one workflow's history. Same rows, same columns minus the workflow
 * name (which the page title already carries), so there is ONE implementation
 * and no chance of the two drifting.
 *
 * On the canonical `MatrxDataTable`: it owns sorting, filtering, paging, the
 * toolbar, copy controls and the empty state over a bounded page this surface
 * has already fetched. The list is live through the shared announce channel
 * (`useRunsList`) — a status changes in place, a new run arrives on its own.
 *
 * THE DOOR LAW: the Started cell is the run's real link (keyboard-reachable,
 * cmd-clickable), the whole row opens it as a mouse convenience, and the
 * Workflow cell is an `EntityRef` so the workflow behind a run is one click
 * away too.
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { formatElapsed } from "@/components/official-candidate/elapsed-time/ElapsedTime";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { Flag, ListX } from "lucide-react";

import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import { CONTEXT_MENU_ENTITY_KEY } from "@ai-matrx/context-menu/engine";

import { RunStatusChip, runStatusLabel } from "../../run-status";
import {
  runEntityRef,
  runMenuContent,
  buildWorkflowRunMenuSection,
  type WorkflowRunMenuRow,
} from "../../run-actions";
import { runDurationMs, type RunListRow } from "../runs";
import { useRunsList } from "../useRunsList";
import { useWorkflowFacts } from "../useWorkflowFacts";
import { fetchRunFlagCounts } from "../../review/service";
import { useOrganizationsWith } from "@/features/organizations/hooks/useOrganizationsWith";
import { EntityOrgFilter } from "@/lib/entity-list/components/EntityOrgFilter";
import { useOrgFilterParam } from "@/lib/entity-list/orgFilterUrl";
import { Button } from "@/components/ui/button";
import { ReadFailure } from "@ai-matrx/design-system";
import { StaleDataNotice } from "@ai-matrx/design-system";
import {
  useWorkflowsBasePath,
  workflowRunPermalinkHref,
} from "@/features/workflow-runtime/browse/workflowActionRegistry";

/** A row plus the workflow facts resolved for it. */
interface RunRowView extends RunListRow {
  workflowName: string | null;
  /**
   * What this run's workflow DECLARES it produces. Not the run's own result:
   * `GET /runs` never returns `result` (it is derived by `GET /runs/{id}`), so
   * a column fed from the list row could only ever render "—". See
   * `service.ts` § WorkflowFacts.
   */
  declaredKind: string | null;
  /** Review flags this run raised; 0 when none (or not yet read). */
  flagged: number;
}

const FLAGGED_FILTER_OPTIONS = [
  { value: "flagged", label: "Flagged" },
  { value: "clean", label: "Not flagged" },
];

const STATUS_FILTER_OPTIONS = [
  "running",
  "completed",
  "failed",
  "errored",
  "interrupted",
  "awaiting_input",
  "paused",
  "cancelled",
  "pending",
].map((value) => ({ value, label: runStatusLabel(value) }));

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

export function RunsList({ definitionId }: { definitionId?: string }) {
  // THE ADMIN SEAT: on an admin page every link stays in the admin tree.
  const workflowsBase = useWorkflowsBasePath();
  const router = useRouter();
  const [, startTransition] = useTransition();
  // The organization FILTER: a visible on-page control, `?org_filter=`, All organizations by
  // default, passed to the server (`GET /runs?organization_id=`). Never the header's organization.
  const [orgFilter, setOrgFilter] = useOrgFilterParam();
  const organizationFilter = definitionId ? null : orgFilter;
  const { rows, loading, error, refresh } = useRunsList({
    definitionId,
    organizationId: organizationFilter,
  });
  const facts = useWorkflowFacts(rows.map((row) => row.definitionId));
  // Review flags: the wire row carries `review_flag_count` once the server
  // model has it; rows without it are read from workflow.run (row security).
  const missingFlagIds = rows.filter((r) => r.reviewFlagCount === null).map((r) => r.runId);
  const missingKey = missingFlagIds.join(",");
  const [flagCounts, setFlagCounts] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    if (!missingKey) return undefined;
    let live = true;
    void fetchRunFlagCounts(missingKey.split(","))
      .then((counts) => {
        if (live) setFlagCounts(counts);
      })
      .catch((e: unknown) => {
        console.error("[runs-list] review flag counts", e);
      });
    return () => {
      live = false;
    };
  }, [missingKey]);
  const [clickedRow, setClickedRow] = useState<RunRowView | null>(null);

  // The list spans every organization the person belongs to; name each row's.
  const { organizations } = useOrganizationsWith(rows.map((r) => r.organizationId));
  const orgName = new Map(organizations.map((o) => [o.id, o.name]));
  const showOrganization = organizations.length > 1;

  const view: RunRowView[] = rows.map((row) => {
    const fact = row.definitionId ? facts.get(row.definitionId) : undefined;
    return {
      ...row,
      workflowName: fact?.name ?? null,
      // The run's own declared kind when the wrapper ever carries one, else
      // the workflow's declaration — the only source a LIST row can have.
      declaredKind: row.deliverableKind ?? fact?.outputKind ?? null,
      flagged: row.reviewFlagCount ?? flagCounts.get(row.runId) ?? 0,
    };
  });

  const columns: MatrxColumnDef<RunRowView>[] = [
    // Dropped on a per-workflow list: every row would say the same name.
    ...(definitionId
      ? []
      : [
          {
            id: "workflow",
            accessorFn: (row: RunRowView) => row.workflowName ?? "",
            header: "Workflow",
            entityToken: (row: RunRowView) =>
              row.definitionId ? "workflow" : undefined,
            entityId: (row: RunRowView) => row.definitionId ?? undefined,
            cell: (row: RunRowView) =>
              row.workflowName ?? <Muted>Unnamed workflow</Muted>,
          } satisfies MatrxColumnDef<RunRowView>,
        ]),
    ...(showOrganization
      ? [
          {
            id: "organization",
            accessorFn: (row: RunRowView) =>
              (row.organizationId && orgName.get(row.organizationId)) ?? "",
            header: "Organization",
            width: 170,
            entityToken: (row: RunRowView) =>
              row.organizationId ? "organization" : undefined,
            entityId: (row: RunRowView) => row.organizationId ?? undefined,
            cell: (row: RunRowView) =>
              (row.organizationId && orgName.get(row.organizationId)) ?? (
                <Muted>—</Muted>
              ),
          } satisfies MatrxColumnDef<RunRowView>,
        ]
      : []),
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      filter: "select",
      filterOptions: STATUS_FILTER_OPTIONS,
      width: 150,
      cell: (row) => <RunStatusChip status={row.status} />,
    },
    {
      id: "flagged",
      accessorKey: "flagged",
      header: "Flagged",
      width: 90,
      align: "right",
      filter: "select",
      filterOptions: FLAGGED_FILTER_OPTIONS,
      filterValue: (row) => (row.flagged > 0 ? "flagged" : "clean"),
      cell: (row) =>
        row.flagged > 0 ? (
          <span
            className="inline-flex items-center gap-1 tabular-nums text-warning"
            title={`${row.flagged} review ${row.flagged === 1 ? "flag" : "flags"}`}
          >
            <Flag className="h-3 w-3" aria-hidden />
            {row.flagged}
          </span>
        ) : (
          <Muted>—</Muted>
        ),
    },
    {
      id: "started",
      accessorKey: "startedAt",
      header: "Started",
      width: 130,
      align: "right",
      // The run's door. A timestamp is what a person recognises a run by —
      // never the uuid — so the timestamp is what opens it.
      href: (row) => workflowRunPermalinkHref(row.runId, workflowsBase),
      cell: (row) =>
        row.startedAt ? (
          <span
            className="tabular-nums"
            title={new Date(row.startedAt).toLocaleString()}
          >
            {formatRelativeTime(row.startedAt)}
          </span>
        ) : (
          <Muted>—</Muted>
        ),
    },
    {
      id: "duration",
      accessorFn: (row) => runDurationMs(row) ?? -1,
      header: "Duration",
      width: 100,
      align: "right",
      cell: (row) => {
        const ms = runDurationMs(row);
        // A run still in flight has no duration yet, and a finished run with
        // no start instant cannot be measured. Neither gets a made-up number.
        return ms === null ? (
          <Muted>—</Muted>
        ) : (
          <span className="tabular-nums text-muted-foreground">
            {formatElapsed(ms)}
          </span>
        );
      },
    },
    {
      id: "delivers",
      accessorKey: "declaredKind",
      header: "Delivers",
      width: 160,
      mobileHidden: true,
      cell: (row) =>
        row.declaredKind ? (
          <span className="text-muted-foreground">{row.declaredKind}</span>
        ) : (
          <Muted>—</Muted>
        ),
    },
  ];

  const runMenuSection = buildWorkflowRunMenuSection({
    getRow: (): WorkflowRunMenuRow | null =>
      clickedRow
        ? {
            runId: clickedRow.runId,
            definitionId: clickedRow.definitionId,
            workflowName: clickedRow.workflowName,
          }
        : null,
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      {error && view.length > 0 ? (
        <StaleDataNotice
          hasData
          what={definitionId ? "this workflow's runs" : "your runs"}
          onRetry={refresh}
          detail={error}
          className="mx-3 mb-2"
        />
      ) : null}
      {error && view.length === 0 ? (
        <ReadFailure
          error={error}
          what={definitionId ? "this workflow's runs" : "your runs"}
          onRetry={refresh}
        />
      ) : (
        <>
          {definitionId ? null : (
            <div
              className="flex items-center gap-2 px-3 pb-2"
              data-runs-org-filter=""
            >
              <EntityOrgFilter orgId={orgFilter} onChange={setOrgFilter} />
              {orgFilter && !loading && view.length === 0 ? (
                <Button
                  variant="outline"
                  onClick={() => setOrgFilter(null)}
                >
                  View all organizations
                </Button>
              ) : null}
            </div>
          )}
          <NonEditableContextMenu
            sourceFeature="workflow_run"
            contentSource={{ type: "raw" }}
            contextData={{ content: "" }}
            resolveContextOnOpen={(target) => {
              const id = target
                ?.closest("[data-row-id]")
                ?.getAttribute("data-row-id");
              const row = (id && view.find((r) => r.runId === id)) || null;
              setClickedRow(row);
              if (!row) return null;
              return {
                [CONTEXT_MENU_ENTITY_KEY]: runEntityRef(row),
                content: [
                  runMenuContent(row),
                  `Status: ${runStatusLabel(row.status)}`,
                  row.startedAt
                    ? `Started: ${new Date(row.startedAt).toLocaleString()}`
                    : null,
                  row.declaredKind ? `Delivers: ${row.declaredKind}` : null,
                ]
                  .filter(Boolean)
                  .join("\n"),
              };
            }}
            extraSections={[runMenuSection]}
          >
            <div className="flex h-full min-h-0 flex-col">
              <MatrxDataTable<RunRowView>
                data={view}
                columns={columns}
                getRowId={(row) => row.runId}
                isLoading={loading}
                urlState={{ id: definitionId ? "workflow-runs" : "runs" }}
                onRowOpen={(row) => {
                  startTransition(() => router.push(workflowRunPermalinkHref(row.runId, workflowsBase)));
                }}
                emptyState={{
                  icon: <ListX className="h-5 w-5" />,
                  title: definitionId
                    ? "This workflow hasn't run yet"
                    : "No runs yet",
                  description: "A run appears here the moment it starts.",
                }}
              />
            </div>
          </NonEditableContextMenu>
        </>
      )}
    </div>
  );
}
