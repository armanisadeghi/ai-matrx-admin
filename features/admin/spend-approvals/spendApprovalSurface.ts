/**
 * One spend approval as a surface carries it — the facts its record page and a subject's
 * approvals panel show, in plain keys. Shared by `matrx-admin/spend-approval` and
 * `matrx-admin/workflow-spend-approvals` so the two pages describe the same row the same way.
 */

import { APPROVAL_STATUS_LABEL, SUBJECT_KIND_LABEL, isCovered, type SpendApprovalRow } from "./spendApprovals";
import { COVERED_LABEL } from "./coveredApprovals";

export function spendApprovalSurfaceRow(row: SpendApprovalRow) {
  return {
    id: row.id,
    subject: { kind: row.subject_kind, kind_label: SUBJECT_KIND_LABEL[row.subject_kind] ?? row.subject_kind, id: row.subject_id, name: row.subject_name },
    status: row.status,
    status_label: isCovered(row) ? COVERED_LABEL : APPROVAL_STATUS_LABEL[row.status],
    can_decide: row.can_decide,
    agent: row.agent_id ? { id: row.agent_id, name: row.agent_name } : null,
    mandate_key: row.feature_mandate_key,
    feature: row.feature || null,
    organization: { id: row.organization_id, name: row.organization_name, is_system: row.organization_is_system },
    threshold_usd: row.threshold_usd,
    automated_cost_per_run_usd: row.automated_cost_per_run,
    automated_cost_30d_usd: row.automated_cost_30d,
    automated_runs_30d: row.automated_runs_30d,
    est_monthly_cost_usd: row.est_monthly_cost,
    avg_cost_since_usd: row.avg_cost_since,
    max_cost_since_usd: row.max_cost_since,
    runs_since: row.runs_since,
    since_at: row.since_at,
    held_runs: row.blocked_runs,
    last_held_at: row.last_blocked_at,
    first_run: { at: row.first_run_at, cost_usd: row.first_run_cost, by: row.first_run_person_email, models: row.first_run_models },
    expected_result: row.expected_result,
    expected_runs_per_month: row.expected_runs_per_month,
    decided: row.decided_at ? { by: row.decided_by_email, at: row.decided_at, note: row.decision_note } : null,
    expires_at: row.expires_at,
    tracking_reset: row.reset_at ? { at: row.reset_at, by: row.reset_by_email, note: row.reset_note } : null,
  };
}
