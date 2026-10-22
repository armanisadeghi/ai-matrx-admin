"use client";

/**
 * One subject's spend approval (Arman 2026-10-16): the agent's / mandate's / workflow's own
 * Approvals tab, and /administration/billing/approvals/<kind>/<id> for every other kind.
 *
 * The approvals board itself, filtered to this subject (status dropdown, spend columns, links,
 * Copy for AI on the row), then each approval's decision history and the runs it held.
 */
import Link from "@/components/navigation/AppLink";
import { Suspense, useEffect, useState } from "react";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useAdminCost } from "@/components/cost/useAdminCost";
import { useSeesDollars } from "@/components/cost/useCostDisplay";
import { SpendApprovalsBoard, HistoryList } from "./SpendApprovalsBoard";
import {
  SUBJECT_KIND_LABEL,
  approvalRecordHref,
  approvalSubjectHref,
  mandateKeyHref,
  type ApprovalSeat,
  type ApprovalSubject,
  type SpendApprovalRow,
} from "./spendApprovals";
import {
  agentBuildHref,
  fetchHeldRunsForApprovals,
  heldRunHref,
  replayCostLine,
  type HeldRun,
} from "@/features/admin/held-runs/heldRuns";

export function HeldRunsList({ approvalId }: { approvalId: string }) {
  const sees = useSeesDollars();
  const points = useAdminCost();
  const [runs, setRuns] = useState<HeldRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    fetchHeldRunsForApprovals([approvalId])
      .then((r) => live && setRuns(r))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [approvalId]);
  if (error) return <div className="text-xs text-destructive">{error}<ErrorAlchemyMenu error={error} /></div>;
  if (!runs) return <div className="h-12 animate-pulse rounded bg-muted/50" />;
  if (runs.length === 0) return <div className="text-xs text-muted-foreground">None held</div>;
  return (
    <ol className="flex max-h-48 flex-col gap-1 overflow-y-auto text-xs" data-testid="subject-held-runs">
      {runs.map((r) => (
        <li key={r.id} className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 tabular-nums text-muted-foreground">{new Date(r.last_seen_at).toLocaleString()}</span>
          <span className="min-w-0 truncate">
            {r.model ?? "Model unknown"} · {replayCostLine(r.estimated_cost_usd, sees ? undefined : points)}
            {r.occurrence_count > 1 ? ` · ${r.occurrence_count}×` : ""}
          </span>
          <Link className="ml-auto shrink-0 text-primary hover:underline" href={heldRunHref(r.id)}>
            Open · replay
          </Link>
        </li>
      ))}
    </ol>
  );
}

function ApprovalDetail({ row, seat, orgSlug, own }: { row: SpendApprovalRow; seat: ApprovalSeat; orgSlug?: string; own: boolean }) {
  const name = row.subject_name ?? row.subject_id;
  return (
    <section className="rounded-md border border-border bg-card" data-testid="subject-approval-detail">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-2 text-sm">
        <span className="font-medium">{name}</span>
        <span className="text-xs text-muted-foreground">{SUBJECT_KIND_LABEL[row.subject_kind]}</span>
        <span className="ml-auto flex flex-wrap items-center gap-3 text-xs">
          {!own && (
            <Link className="text-primary hover:underline" href={approvalSubjectHref(row.subject_kind, row.subject_id, seat, orgSlug)}>
              Its page
            </Link>
          )}
          {row.agent_id && seat === "admin" && (
            <Link className="text-primary hover:underline" href={agentBuildHref(row.agent_id)}>
              Agent build
            </Link>
          )}
          {row.feature_mandate_key && (
            <Link className="text-primary hover:underline" href={mandateKeyHref(row.feature_mandate_key, seat, orgSlug)}>
              Mandate
            </Link>
          )}
          <Link className="text-primary hover:underline" href={approvalRecordHref(row.subject_kind, row.subject_id, seat, orgSlug)}>
            Full page
          </Link>
        </span>
      </div>
      <div className="grid gap-3 p-3 md:grid-cols-2">
        <div className="min-w-0">
          <h3 className="mb-1 text-xs font-medium text-muted-foreground">History</h3>
          <HistoryList id={row.id} />
        </div>
        <div className="min-w-0">
          <h3 className="mb-1 text-xs font-medium text-muted-foreground">Held runs · {row.blocked_runs}</h3>
          <HeldRunsList approvalId={row.id} />
        </div>
      </div>
    </section>
  );
}

export function SubjectApprovalsPanel({
  subject,
  seat,
  orgId = null,
  orgSlug,
  onRows,
}: {
  subject: ApprovalSubject;
  seat: ApprovalSeat;
  orgId?: string | null;
  orgSlug?: string;
  /** Told the rows each time the board reads them (a host's surface runtime reads them). */
  onRows?: (rows: SpendApprovalRow[]) => void;
}) {
  const [rows, setRowsState] = useState<SpendApprovalRow[] | null>(null);
  const setRows = (next: SpendApprovalRow[]) => {
    setRowsState(next);
    onRows?.(next);
  };
  // Its own record first, then the related ones (an agent's mandates, a mandate's holders).
  const ordered = rows
    ? [...rows].sort(
        (a, b) =>
          Number(b.subject_kind === subject.kind && b.subject_id === subject.id) -
          Number(a.subject_kind === subject.kind && a.subject_id === subject.id),
      )
    : null;
  return (
    <div className="flex flex-col gap-3" data-testid="subject-approvals">
      <div className="h-[320px] min-h-0">
        <Suspense fallback={<div className="h-full animate-pulse rounded-md bg-muted/50" />}>
          <SpendApprovalsBoard orgId={orgId} seat={seat} orgSlug={orgSlug} subject={subject} onRows={setRows} />
        </Suspense>
      </div>
      {ordered === null ? (
        <div className="h-40 animate-pulse rounded-md bg-muted/50" />
      ) : (
        ordered.map((r) => (
          <ApprovalDetail
            key={r.id}
            row={r}
            seat={seat}
            orgSlug={orgSlug}
            own={r.subject_kind === subject.kind && r.subject_id === subject.id}
          />
        ))
      )}
    </div>
  );
}
