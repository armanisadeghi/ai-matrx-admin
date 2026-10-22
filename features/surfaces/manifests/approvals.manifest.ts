/**
 * Surface manifest — Waiting on you (`matrx-user/approvals`), route `/approvals`.
 *
 * Every proposal waiting on this person's approval, across every kind (CRM sends, SEO changes,
 * imports, …), each with exactly what Approve and Reject would do. Emitters: `ApprovalsWorkspace`
 * (provider, only with `asPage` — the same workspace in the Approvals window is not a page surface)
 * and `ApprovalQueue` (contributes the listed proposals when given `surfaceName`).
 *
 * Not `matrx-user/approval-queue`: that is the ADDRESS approval rows are filed to (data.ts), not a page.
 *
 * READ-ONLY on purpose: an approval is the person's decision gate. An agent may explain, compare and
 * recommend; Approve and Reject stay the person's press.
 */

import type { SurfaceManifest, SurfaceScopePayload, SurfaceValue } from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const APPROVALS_SURFACE_NAME = "matrx-user/approvals";

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "approvals_load_status",
    label: "Load status",
    description: '"loading", "loaded" or "partly_failed" (some kinds could not be read; the page shows which).',
    valueType: "string",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 12,
    sortOrder: 100,
  },
  {
    name: "approvals_waiting_count",
    label: "Waiting",
    description: "How many proposals are waiting on the person, all kinds (may be more than are loaded).",
    valueType: "number",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 3,
    sortOrder: 110,
  },
  {
    name: "approvals",
    label: "Waiting proposals",
    description:
      "The loaded proposals (first 40): { key, kind, headline, approve_does (the exact change Approve makes), reject_does, proposed_by, proposed_at, auto_applies_at (applies itself then unless decided), blocked (why it cannot be approved yet), decided (set once decided on this page) }.",
    valueType: "array",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 4000,
    inlineUpTo: 8000,
    sortOrder: 120,
  },
  {
    name: "focused_approval_key",
    label: "Linked proposal",
    description: "The proposal a link opened the page at (`?item=`), when it is listed.",
    valueType: "string",
    alwaysAvailable: false,
    autoContext: true,
    typicalCharCount: 40,
    sortOrder: 130,
  },
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: APPROVALS_SURFACE_NAME,
  situation:
    "They are looking at what is waiting on their approval: {approvals_waiting_count|nothing} waiting. You can explain or recommend; only they approve or reject.",
  inheritsFrom: "matrx-default/account",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Waiting on you",
  description: "Every proposal waiting on the person's approval, with what Approve and Reject would do.",
  urlPattern: "/approvals",
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
};

export const approvalsManifest = declared;

export function createApprovalsScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
