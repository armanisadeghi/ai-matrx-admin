/**
 * Surface manifest — Workflow review (`matrx-user/workflow-review`).
 *
 * `/workflows/[id]/review`: one workflow's review issues — every recurring thing
 * its runs recovered from, retried, redid or handed to a person, with how often
 * and its status (open / seen / fixed / ignored).
 *
 * Emitter: `WorkflowReviewPage` (`features/workflow-runtime/review/components/`).
 * Write target: `update_issues` changes issue status through the same
 * `setIssueStatus` the row actions call (Mark seen / Mark fixed / Ignore / Reopen).
 * Not writable: the counts and timestamps (evidence the engine records).
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const WORKFLOW_REVIEW_SURFACE_NAME = "matrx-user/workflow-review";

const groups: SurfaceValueGroup[] = [
  { key: "review_workflow", label: "Workflow", sortOrder: 100, description: "The workflow whose issues are listed." },
  { key: "review_issues", label: "Issues", sortOrder: 200, description: "Its review issues as the table shows them." },
];

const v = (
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  group: string,
  sortOrder: number,
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  group,
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("workflow_id", "Workflow ID", "string", "review_workflow", 100, "UUID of the workflow (from the address).", {
    alwaysAvailable: true,
    typicalCharCount: 36,
  }),
  v("workflow_name", "Workflow name", "string", "review_workflow", 110, "The workflow's name as the header shows it."),
  v(
    "review_load_status",
    "Load status",
    "string",
    "review_workflow",
    120,
    '"loading", "loaded", "failed" (the read failed; the page offers a retry) or "not_found" (no access or no such workflow).',
    { alwaysAvailable: true, typicalCharCount: 10 },
  ),
  v("issue_count", "Issues", "number", "review_issues", 200, "How many issues the table lists."),
  v("open_issue_count", "Open issues", "number", "review_issues", 210, "How many of them are still open."),
  v(
    "issues_capped",
    "List capped",
    "boolean",
    "review_issues",
    220,
    "True when the workflow has more issues than the newest 500 shown.",
  ),
  v(
    "issues",
    "Issues",
    "array",
    "review_issues",
    230,
    'Every issue listed, newest first: { id, what (the issue in words), where (the step or connection), category, status ("open" | "acknowledged" | "fixed" | "ignored"), occurrences, run_count, reopened_count, first_seen_at, last_seen_at, last_message, resolution_note }.',
    { typicalCharCount: 3000 },
  ),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "update_issues",
    label: "Change issue status",
    description:
      'Change the status of issues. SAVED after the person approves, exactly as the row buttons do. Value is a JSON ARRAY of 1-25 objects, each { "id": an id from issues, "status": "open" | "acknowledged" | "fixed" | "ignored", "note"?: string (only with "fixed": what changed) }. "acknowledged" is Mark seen; "open" reopens. A fixed issue reopens by itself if it happens again. Refused (nothing saved): an unknown id, an id twice, another status word, a note without "fixed".',
    valueType: "array",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "issues",
    group: "review_issues",
    sortOrder: 300,
  },
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: WORKFLOW_REVIEW_SURFACE_NAME,
  situation:
    "They are on the review list of the workflow {workflow_name|this workflow} (page: {review_load_status}): {issue_count|no} issues its runs raised, {open_issue_count|none} still open. You can mark issues seen, fixed or ignored, or reopen them.",
  inheritsFrom: "matrx-default/workflows",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Workflow review",
  description: "One workflow's review issues: what its runs recovered from, how often, and their status.",
  urlPattern: "/workflows/[id]/review",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

export const workflowReviewManifest = declared;

export function createWorkflowReviewScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
