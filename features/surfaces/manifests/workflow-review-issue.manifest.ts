/**
 * Surface manifest — Workflow review issue (`matrx-user/workflow-review-issue`).
 *
 * `/workflows/[id]/review/[issueId]`: ONE review issue of one workflow — what it is,
 * which step, how often, its status and fix note, and every occurrence (each opens
 * its run).
 *
 * Emitter: `ReviewIssuePage` (`features/workflow-runtime/review/components/`).
 * Write target: `set_issue_status` through `setIssueStatus`, the door the page's
 * Mark seen / Mark fixed / Ignore / Reopen buttons use. Counts and timestamps are
 * evidence and not writable.
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

export const WORKFLOW_REVIEW_ISSUE_SURFACE_NAME = "matrx-user/workflow-review-issue";

const groups: SurfaceValueGroup[] = [
  { key: "issue", label: "Issue", sortOrder: 100, description: "The one issue on screen." },
  { key: "issue_occurrences", label: "Occurrences", sortOrder: 200, description: "Every time it happened." },
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
  typicalCharCount: valueType === "number" ? 4 : 40,
  group,
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("workflow_id", "Workflow ID", "string", "issue", 100, "UUID of the workflow (from the address).", {
    alwaysAvailable: true,
    typicalCharCount: 36,
  }),
  v("issue_id", "Issue ID", "string", "issue", 105, "UUID of the issue (from the address).", {
    alwaysAvailable: true,
    typicalCharCount: 36,
  }),
  v(
    "issue_load_status",
    "Load status",
    "string",
    "issue",
    110,
    '"loading", "loaded", "failed" (the read failed; the page offers a retry) or "not_found" (no access, or the issue is not this workflow\'s).',
    { alwaysAvailable: true, typicalCharCount: 10 },
  ),
  v("workflow_name", "Workflow name", "string", "issue", 120, "The workflow's name."),
  v("issue_what", "Issue", "string", "issue", 130, "The issue in words, as the page title shows it.", {
    typicalCharCount: 80,
  }),
  v("issue_status", "Status", "string", "issue", 140, '"open", "acknowledged" (seen), "fixed" or "ignored".', {
    typicalCharCount: 12,
  }),
  v(
    "issue",
    "Issue details",
    "object",
    "issue",
    150,
    "Everything the page shows about it: { id, what, where (the step or connection), category, status, occurrences, run_count, reopened_count, first_seen_at, last_seen_at, last_message, resolution_note (the fix note) }.",
    { typicalCharCount: 600 },
  ),
  v("occurrence_count", "Occurrences", "number", "issue_occurrences", 200, "How many occurrences are listed (newest 200)."),
  v(
    "occurrences",
    "Occurrence list",
    "array",
    "issue_occurrences",
    210,
    'Each time it happened, newest first: { occurred_at, event ("new" | "reopened" | "repeat" or null), message, run_id }.',
    { typicalCharCount: 2500, autoContext: false },
  ),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "set_issue_status",
    label: "Change this issue's status",
    description:
      'Change this issue\'s status. SAVED after the person approves, exactly as the page buttons do. Value is a JSON object { "status": "open" | "acknowledged" | "fixed" | "ignored", "note"?: string (only with "fixed": what changed) }. "acknowledged" is Mark seen; "open" reopens. A fixed issue reopens by itself if it happens again. Refused (nothing saved): another status word, a note without "fixed", the issue not loaded.',
    valueType: "object",
    mode: "entity",
    applyPolicy: "ask",
    group: "issue",
    sortOrder: 300,
  },
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: WORKFLOW_REVIEW_ISSUE_SURFACE_NAME,
  situation:
    "They are looking at one review issue of the workflow {workflow_name|this workflow}: \"{issue_what|the issue}\", status {issue_status|unknown}, seen {occurrence_count|an unknown number of} times (page: {issue_load_status}). You can mark it seen, fixed or ignored, or reopen it.",
  inheritsFrom: "matrx-default/workflows",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Workflow review issue",
  description: "One review issue of a workflow: what, where, how often, its status, and every occurrence.",
  urlPattern: "/workflows/[id]/review/[issueId]",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

export const workflowReviewIssueManifest = declared;

export function createWorkflowReviewIssueScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
