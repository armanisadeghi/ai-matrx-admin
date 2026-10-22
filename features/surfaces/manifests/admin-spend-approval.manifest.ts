/**
 * Surface manifests — spend approvals for one subject.
 *
 * - `matrx-admin/spend-approval` — `/administration/billing/approvals/[kind]/[subjectId]`: one
 *   subject's spend approval record (decision, spend, first run, history, held runs). Parent:
 *   Account (billing). Emitter: `ApprovalRecordView`.
 * - `matrx-admin/workflow-spend-approvals` — `/administration/automation/workflows/[id]/approvals`:
 *   the spend approvals that cover one workflow, its own first. Parent: Workflows. Emitter:
 *   `SubjectApprovalsPanel` (registers only when its host passes this surface).
 *
 * Both describe a row through `spendApprovalSurfaceRow` (`features/admin/spend-approvals/`).
 * Approving lets automated runs SPEND, so a decision is the person's press: the record page's
 * `propose_decision` only OPENS its own decision dialog (with the cost per run and per month);
 * the panel page has no write target.
 */

import type { SurfaceManifest, SurfaceValue, SurfaceValueGroup, SurfaceWriteTarget } from "@ai-matrx/chat/surfaces/types";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const ADMIN_SPEND_APPROVAL_SURFACE_NAME = "matrx-admin/spend-approval";
export const ADMIN_WORKFLOW_SPEND_APPROVALS_SURFACE_NAME = "matrx-admin/workflow-spend-approvals";

const ROW_SHAPE =
  "{ id, subject: { kind, kind_label, id, name }, status, status_label, can_decide, agent: { id, name }, mandate_key, feature, organization: { id, name, is_system }, threshold_usd, automated_cost_per_run_usd, automated_cost_30d_usd, automated_runs_30d, est_monthly_cost_usd, avg_cost_since_usd, max_cost_since_usd, runs_since, since_at, held_runs, last_held_at, first_run: { at, cost_usd, by, models }, expected_result, expected_runs_per_month, decided: { by, at, note }, expires_at, tracking_reset }";

const group: SurfaceValueGroup = { key: "spend_approval", label: "Spend approval", sortOrder: 100, description: "Whether automated runs may spend." };

const v = (name: string, label: string, valueType: SurfaceValue["valueType"], sortOrder: number, description: string, extra: Partial<SurfaceValue> = {}): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  group: group.key,
  sortOrder,
  ...extra,
});

// ── The record page ────────────────────────────────────────────────────────

const recordValues: SurfaceValue[] = [
  v("subject_kind", "Subject type", "string", 100, 'What the approval is for: "agent", "mandate", "workflow", an automation kind… (from the address).', {
    alwaysAvailable: true,
    typicalCharCount: 12,
  }),
  v("subject_id", "Subject ID", "string", 110, "The subject's id (from the address).", { alwaysAvailable: true, typicalCharCount: 36 }),
  v("approval_load_status", "Load status", "string", 120, '"loading", "failed", "none" (no approval for this subject) or "loaded".', {
    alwaysAvailable: true,
    typicalCharCount: 8,
  }),
  v("approval", "Approval", "object", 130, `The approval shown: ${ROW_SHAPE}.`, { typicalCharCount: 1200 }),
  v("related_approvals", "Related approvals", "array", 140, "Other approvals for the same subject: [{ id, subject_name, kind_label, status_label }]."),
];

const recordWriteTargets: SurfaceWriteTarget[] = [
  {
    name: "propose_decision",
    label: "Open a decision",
    description:
      'Open the page\'s own decision dialog for this approval, which shows the cost per run and per month. NOTHING is decided until the person presses its confirm button. Value is "approve", "approve_temporary" (approve until a date the person picks), "reject" or "reopen" (back to waiting). Refused when there is no approval or approval.can_decide is false.',
    valueType: "string",
    mode: "ui",
    applyPolicy: "auto",
    group: group.key,
    sortOrder: 300,
  },
];

const recordDeclared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: ADMIN_SPEND_APPROVAL_SURFACE_NAME,
  situation:
    "As an admin they are looking at the spend approval for one {subject_kind|subject} ({approval_load_status|loading}): whether its automated runs may spend. You can open a decision for them to confirm.",
  inheritsFrom: "matrx-default/account",
  client: "matrx-admin",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Spend approval",
  description: "One subject's spend approval: the decision, its spend, the first run and held runs.",
  urlPattern: "/administration/billing/approvals/[kind]/[subjectId]",
  groups: [group],
  values: recordValues,
  writeTargets: recordWriteTargets,
  skipBaselineValues: true,
};

export const adminSpendApprovalManifest = recordDeclared;

// ── A workflow's approvals ─────────────────────────────────────────────────

const panelValues: SurfaceValue[] = [
  v("workflow_id", "Workflow ID", "string", 100, "UUID of the workflow (from the address).", { alwaysAvailable: true, typicalCharCount: 36 }),
  v("approvals_load_status", "Load status", "string", 110, '"loading" or "loaded".', { alwaysAvailable: true, typicalCharCount: 8 }),
  v("approvals", "Approvals", "array", 120, `Every spend approval that covers this workflow, its own first: [${ROW_SHAPE}].`, { typicalCharCount: 2500 }),
];

const panelDeclared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: ADMIN_WORKFLOW_SPEND_APPROVALS_SURFACE_NAME,
  situation:
    "As an admin they are looking at the spend approvals that cover one workflow ({approvals_load_status|loading}). Deciding one is their press, on its own page.",
  inheritsFrom: "matrx-default/workflows",
  client: "matrx-admin",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Workflow spend approvals",
  description: "The spend approvals that cover one workflow, with their history and held runs.",
  urlPattern: "/administration/automation/workflows/[id]/approvals",
  groups: [group],
  values: panelValues,
  skipBaselineValues: true,
};

export const adminWorkflowSpendApprovalsManifest = panelDeclared;
