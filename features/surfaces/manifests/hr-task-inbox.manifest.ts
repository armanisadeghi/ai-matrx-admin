/**
 * Surface manifest — the HR task inbox (`matrx-user/hr-task-inbox`), `/hr/tasks`.
 *
 * THE one HR inbox: what needs this person's decision, their team's or the HR queue's open
 * items, what is waiting on others, failures assigned to them, and what was recently decided.
 * Bulk approve / reject goes through the same door as the page's bulk bar (`hr_wf_bulk_decide`),
 * only on rows the door marks bulk-decidable.
 *
 * Emitter: `SurfaceRuntimeProvider` in `HrTaskInbox` (features/hr/tasks/components).
 */

import type { SurfaceScopePayload, SurfaceValueGroup } from "@ai-matrx/chat/surfaces/types";
import { hrPageSurface, hrTarget, hrValue } from "./hr-surface-kit";

export const HR_TASK_INBOX_SURFACE = "matrx-user/hr-task-inbox";

const groups: SurfaceValueGroup[] = [
  { key: "inbox", label: "Inbox", sortOrder: 100, description: "The HR items on this page." },
];

export const hrTaskInboxManifest = hrPageSurface({
  surfaceName: HR_TASK_INBOX_SURFACE,
  label: "HR tasks",
  description: "The one HR task inbox: decisions for me, my team or the HR queue, waiting, failures, recent (/hr/tasks).",
  urlPattern: "/hr/tasks",
  situation:
    "They are in their HR task inbox ({inbox_scope|mine}): {decision_count|no} items need their decision, {queue_count|no} open in the team or HR queue. You can approve or reject the bulk-decidable ones, or switch the view.",
  intro: `<surface_intro>
The HR task inbox. needs_my_decision lists the items waiting on this person (each with what it is about, in the words the page shows, and whether it may be decided in bulk). scope_items are the team's or the HR queue's open items. Each item opens at /hr/tasks/<instance_id>.
- decide_tasks approves or rejects several bulk-decidable items at once (a reason is required to reject). Items not marked bulk_ok must be opened and decided one by one.
- inbox_scope switches between mine, team and queue.
</surface_intro>`,
  groups,
  values: [
    hrValue("inbox_load_status", "Load status", "string", "inbox", 10, '"loading", "loaded" or "failed".', { alwaysAvailable: true, typicalCharCount: 8 }),
    hrValue("inbox_scope", "View", "string", "inbox", 20, '"mine", "team" or "queue".', { alwaysAvailable: true, typicalCharCount: 6 }),
    hrValue("decision_count", "Need my decision", "number", "inbox", 30, "How many items need this person's decision (all pages)."),
    hrValue(
      "needs_my_decision",
      "Needs my decision",
      "array",
      "inbox",
      40,
      "Items waiting on this person, this page: { step_id, instance_id, item (what it is, the page's line), due_at, urgent, bulk_ok }.",
      { typicalCharCount: 2500, inlineUpTo: 4000 },
    ),
    hrValue("queue_count", "Team / queue open", "number", "inbox", 50, "How many team or HR-queue items are open (all pages)."),
    hrValue(
      "scope_items",
      "Team / queue items",
      "array",
      "inbox",
      60,
      "The team's or the HR queue's open items, this page: { step_id, instance_id, item, due_at, urgent }.",
      { typicalCharCount: 2000, inlineUpTo: 3000 },
    ),
    hrValue(
      "inbox_counts",
      "Other sections",
      "object",
      "inbox",
      70,
      "Totals of the other sections: { auto_applying_soon, waiting_on_others, failures_assigned_to_me, recently_decided }.",
      { typicalCharCount: 120 },
    ),
  ],
  writeTargets: [
    hrTarget(
      "decide_tasks",
      "Approve or reject in bulk",
      { valueType: "object", mode: "entity", updatesValue: "needs_my_decision", group: "inbox", sortOrder: 100 },
      'Approve or reject several items at once, exactly like the bulk bar. SAVED after the person approves; each decision is recorded in the ledger. Value: { "decision": "approve" | "reject", "step_ids": [step_id from needs_my_decision with bulk_ok true, …], "reason"?: text (required, 3+ characters, to reject) }. Returns each item\'s outcome; a skipped item says why. Refused (nothing recorded): a step_id not in needs_my_decision, one not bulk_ok, a reject without a reason.',
    ),
    hrTarget(
      "inbox_scope",
      "Switch the view",
      { valueType: "string", mode: "ui", updatesValue: "inbox_scope", group: "inbox", sortOrder: 110 },
      'Show another part of the inbox. NOTHING is saved. Value: "mine" | "team" | "queue".',
    ),
  ],
});

export function createHrTaskInboxScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
