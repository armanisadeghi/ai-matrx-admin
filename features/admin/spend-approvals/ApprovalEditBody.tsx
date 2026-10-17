"use client";

/**
 * What a person can change on one spend approval: its status (the same inline dropdown as the
 * board's cell), and the decisions that need a form — approve until a date, reset tracking, and
 * the expected result / runs a month. The record window's Edit tab and the record page both draw
 * this, so a decision reads and works the same everywhere.
 */
import { CalendarClock, History, NotebookPen, TimerReset } from "lucide-react";
import { Button, PropertyRow } from "@ai-matrx/design-system/controls";
import { ApprovalStatusSelect } from "./ApprovalStatusSelect";
import { ApprovalStatusText } from "./RunApprovalCell";
import { expiryLabel, type ApprovalDecision, type ApprovalStatus, type SpendApprovalRow } from "./spendApprovals";

export type ApprovalFormAction = ApprovalDecision | "history" | "reset";

export function ApprovalEditBody({
  row,
  onDecide,
  onAction,
}: {
  row: SpendApprovalRow;
  onDecide: (decision: ApprovalDecision, next: ApprovalStatus, note: string, expiresAt: string | null) => Promise<void>;
  onAction: (action: ApprovalFormAction) => void;
}) {
  const name = row.subject_name ?? row.subject_id;
  return (
    <div className="flex flex-col gap-3 p-3" data-testid="approval-edit">
      <PropertyRow label="Approval status" help={row.can_decide ? undefined : "The platform decides this one"}>
        {row.can_decide ? (
          <ApprovalStatusSelect
            status={row.status}
            name={name}
            costPerRun={row.avg_cost_since ?? row.first_run_cost}
            estMonthly={row.est_monthly_cost}
            expiresAt={row.expires_at}
            onDecide={onDecide}
          />
        ) : (
          <ApprovalStatusText status={row.status} />
        )}
      </PropertyRow>
      {row.status === "temporary" ? <PropertyRow label="Expires" value={expiryLabel(row.expires_at)} /> : null}
      <PropertyRow label="Expected result" value={row.expected_result ?? undefined} missing={!row.expected_result} />
      <PropertyRow
        label="Expected runs a month"
        value={row.expected_runs_per_month == null ? undefined : String(row.expected_runs_per_month)}
        missing={row.expected_runs_per_month == null}
      />
      <div className="flex flex-wrap items-center gap-2">
        {row.can_decide ? (
          <>
            <Button variant="outline" onClick={() => onAction("approve_temporary")}>
              <CalendarClock className="h-4 w-4" /> Approve until…
            </Button>
            <Button variant="outline" onClick={() => onAction("details")}>
              <NotebookPen className="h-4 w-4" /> Expected result
            </Button>
            <Button variant="outline" onClick={() => onAction("reset")}>
              <TimerReset className="h-4 w-4" /> Reset tracking
            </Button>
          </>
        ) : null}
        <Button variant="quiet" onClick={() => onAction("history")}>
          <History className="h-4 w-4" /> History
        </Button>
      </div>
    </div>
  );
}
