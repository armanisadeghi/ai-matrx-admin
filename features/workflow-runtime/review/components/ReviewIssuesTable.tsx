"use client";

// THE review issue table (Sentry-style): what happened, where, category,
// occurrences, runs, first/last seen, status (+ reopened), row actions.
// One component for the per-workflow review page and the cross-workflow inbox
// (which adds the Workflow column and its organization filter).

import type { ReactNode } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, EyeOff, Flag, RotateCcw } from "lucide-react";

import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type {
  MatrxColumnDef,
  MatrxTableRowActionDef,
} from "@ai-matrx/design-system/data-table/types";
import { formatRelativeTime } from "@ai-matrx/kit/format";

import {
  REVIEW_CATEGORY_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  reviewCategoryLabel,
  reviewLabelText,
  type ReviewIssueRow,
} from "../model";
import { reviewIssueHref } from "../hrefs";
import type { WorkflowSummary } from "../service";
import { IssueStatusBadge } from "./IssueStatusBadge";
import { useIssueActions } from "./useIssueActions";

export interface IssueView extends ReviewIssueRow {
  what: string;
  where: string;
  workflowName: string;
}

export function issueView(
  issue: ReviewIssueRow,
  summary: WorkflowSummary | undefined,
): IssueView {
  const step = issue.node_id ? (summary?.steps[issue.node_id] ?? issue.node_id) : null;
  return {
    ...issue,
    what: reviewLabelText(issue.label, step),
    where: issue.edge_id ? `Connection to ${step ?? "a step"}` : (step ?? "Whole run"),
    workflowName: summary?.name ?? "Workflow",
  };
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

function timeCell(value: string | null) {
  return value ? (
    <span className="tabular-nums text-muted-foreground" title={new Date(value).toLocaleString()}>
      {formatRelativeTime(value)}
    </span>
  ) : (
    <Muted>—</Muted>
  );
}

export function ReviewIssuesTable({
  rows,
  loading,
  showWorkflow = false,
  urlStateId,
  onChanged,
  toolbarLeading,
}: {
  rows: IssueView[];
  loading: boolean;
  showWorkflow?: boolean;
  urlStateId: string;
  onChanged: (issue: ReviewIssueRow) => void;
  toolbarLeading?: ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { act, busyId, dialog } = useIssueActions(onChanged);

  const columns: MatrxColumnDef<IssueView>[] = [
    {
      id: "what",
      accessorKey: "what",
      header: "What happened",
      href: (row) => reviewIssueHref(row.definition_id, row.id),
      cell: (row) => (
        <span className="min-w-0 truncate" title={row.last_message ?? row.label}>
          {row.what}
        </span>
      ),
    },
    ...(showWorkflow
      ? [
          {
            id: "workflow",
            accessorKey: "workflowName",
            header: "Workflow",
            width: 180,
            entityToken: "workflow",
            entityId: (row: IssueView) => row.definition_id,
            cell: (row: IssueView) => row.workflowName,
          } satisfies MatrxColumnDef<IssueView>,
        ]
      : []),
    {
      id: "where",
      accessorKey: "where",
      header: "Step",
      width: 170,
      cell: (row) => <span className="truncate text-muted-foreground">{row.where}</span>,
    },
    {
      id: "category",
      accessorKey: "category",
      header: "Category",
      width: 140,
      filter: "select",
      filterOptions: REVIEW_CATEGORY_OPTIONS,
      cell: (row) => <span className="text-muted-foreground">{reviewCategoryLabel(row.category)}</span>,
    },
    {
      id: "occurrences",
      accessorKey: "occurrences",
      header: "Times",
      width: 80,
      align: "right",
      cell: (row) => <span className="tabular-nums">{row.occurrences}</span>,
    },
    {
      id: "run_count",
      accessorKey: "run_count",
      header: "Runs",
      width: 70,
      align: "right",
      cell: (row) => <span className="tabular-nums text-muted-foreground">{row.run_count}</span>,
    },
    {
      id: "first_seen_at",
      accessorKey: "first_seen_at",
      format: { id: "datetime" },
      header: "First seen",
      width: 110,
      align: "right",
      mobileHidden: true,
      cell: (row) => timeCell(row.first_seen_at),
    },
    {
      id: "last_seen_at",
      accessorKey: "last_seen_at",
      format: { id: "datetime" },
      header: "Last seen",
      width: 110,
      align: "right",
      cell: (row) => timeCell(row.last_seen_at),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      width: 150,
      filter: "select",
      filterOptions: REVIEW_STATUS_OPTIONS,
      cell: (row) => <IssueStatusBadge status={row.status} reopenedCount={row.reopened_count} />,
    },
  ];

  const rowActionDefs: MatrxTableRowActionDef<IssueView>[] = [
    {
      id: "acknowledge",
      icon: Check,
      label: "Mark seen",
      appliesTo: (row) => row.status === "open",
      unavailableTooltip: "Only an open issue",
      loading: (row) => busyId === row.id,
      onClick: (row) => act(row, "acknowledged"),
    },
    {
      id: "fix",
      icon: CheckCheck,
      label: "Mark fixed",
      tone: "success",
      appliesTo: (row) => row.status !== "fixed",
      unavailableTooltip: "Already fixed",
      loading: (row) => busyId === row.id,
      onClick: (row) => act(row, "fixed"),
    },
    {
      id: "ignore",
      icon: EyeOff,
      label: "Ignore",
      appliesTo: (row) => row.status !== "ignored",
      unavailableTooltip: "Already ignored",
      loading: (row) => busyId === row.id,
      onClick: (row) => act(row, "ignored"),
    },
    {
      id: "reopen",
      icon: RotateCcw,
      label: "Reopen",
      appliesTo: (row) => row.status !== "open",
      unavailableTooltip: "Already open",
      loading: (row) => busyId === row.id,
      onClick: (row) => act(row, "open"),
    },
  ];

  return (
    <>
      <MatrxDataTable<IssueView>
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        isLoading={loading}
        urlState={{ id: urlStateId }}
        rowActionDefs={rowActionDefs}
        toolbar={toolbarLeading ? { leading: toolbarLeading } : undefined}
        onRowOpen={(row) => {
          startTransition(() => router.push(reviewIssueHref(row.definition_id, row.id)));
        }}
        emptyState={{
          icon: <Flag className="h-5 w-5" />,
          title: "Nothing to review",
          description: "Flagged runs show up here.",
        }}
      />
      {dialog}
    </>
  );
}
