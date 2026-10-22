/**
 * Surface manifest — Notifications inbox (`matrx-user/notifications`), route `/notifications`.
 *
 * The person's inbox: what is listed in the open view (Inbox, Needs you, Updates, Snoozed, Done), the
 * filters they set, and the notice they have open. Emitters: `InboxPage` (provider; the organization
 * filter from the address) and `InboxWorkspace` in page mode (contributes the list; registers
 * `triage_notices` through the page's own `actions.act`). The bell panel uses the same workspace but
 * is not this surface.
 *
 * Write target: `triage_notices` (read / done / snooze, as the row buttons do; Done only where the
 * triage door exists). NOT writable: opening a notice's link, undo, the filters.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const NOTIFICATIONS_SURFACE_NAME = "matrx-user/notifications";

const v = (
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  sortOrder: number,
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  autoContext: true,
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 20,
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("inbox_view", "View", "string", 100, '"inbox", "needs_you", "updates", "snoozed" or "done".'),
  v("org_filter", "Organization filter", "string", 110, "The organization the list is narrowed to; null = all organizations.", { autoContext: false, typicalCharCount: 36 }),
  v("unread_only", "Unread only", "boolean", 120, "True when only unread notices are listed.", { autoContext: false }),
  v("inbox_search", "Search", "string", 130, "What is typed in the search box.", { autoContext: false }),
  v("inbox_category", "Category filter", "string", 140, "The category chip picked, or null.", { autoContext: false }),
  v("inbox_load_status", "Load status", "string", 145, '"loaded" or "empty_or_loading".', { autoContext: false }),
  v("unread_total", "Unread", "number", 150, "Unread notices across the inbox."),
  v("listed_count", "Listed", "number", 160, "How many notice groups the current view lists (after filters)."),
  v(
    "notices",
    "Listed notices",
    "array",
    170,
    "The first 25 listed, in order: { key (the id triage_notices uses), title, preview, context, category, bucket, unread, count (notices grouped), actors, at }.",
    { typicalCharCount: 3500, inlineUpTo: 4500 },
  ),
  v("open_notice", "Open notice", "object", 180, "The notice shown in the detail pane: the same fields plus its body (up to 2000 characters).", {
    typicalCharCount: 800,
    inlineUpTo: 1500,
  }),
  v("checked_keys", "Checked", "array", 190, "Keys of the notices the person has ticked.", { autoContext: false, typicalCharCount: 80 }),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "triage_notices",
    label: "Triage notices",
    description:
      'Mark listed notices read, done or snoozed, as the row buttons do. SAVED after the person approves (they can undo with Z). Value is a JSON ARRAY of 1-50 objects { "key": a key from notices, "action": "read" | "done" | "snooze", "until"?: ISO date-time in the future (required for snooze) }. "done" exists only where the page offers Done. Refused (nothing changes): a key not listed, an unknown action, a snooze without a future "until".',
    valueType: "array",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "notices",
    sortOrder: 300,
  },
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: NOTIFICATIONS_SURFACE_NAME,
  situation:
    "They are in their notifications inbox, {inbox_view|inbox} view, {unread_total|no} unread, {listed_count|nothing} listed. You can mark notices read, done or snoozed.",
  inheritsFrom: "matrx-default/communications",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Notifications",
  description: "The person's notifications inbox: views, filters, listed notices and the open one.",
  urlPattern: "/notifications",
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

export const notificationsManifest = declared;

export function createNotificationsScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
