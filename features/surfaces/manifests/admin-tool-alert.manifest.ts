/**
 * Surface manifest — one Tool alert (`matrx-admin/tool-alert`).
 *
 * `/administration/agents/tool-control/alerts/[id]`: one open alert from Tool control (a tool or
 * its source switched off, a vendor price that drifted from the price book, sources waiting to be
 * imported) with what was found and the decision it offers. Parent: Agents (tool-control sits
 * under agents › agent-tools; admin is a surface, not a domain).
 *
 * Emitter: `ToolAlertRecord` (`features/admin/tool-control/`). Write target `propose_decision`
 * only OPENS the page's own confirm dialog for approve or decline — a price change moves every
 * cost estimate, so the person still presses. Nothing else is writable.
 */

import type { SurfaceManifest, SurfaceValue, SurfaceValueGroup, SurfaceWriteTarget } from "@ai-matrx/chat/surfaces/types";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const ADMIN_TOOL_ALERT_SURFACE_NAME = "matrx-admin/tool-alert";

const group: SurfaceValueGroup = { key: "tool_alert", label: "Tool alert", sortOrder: 100, description: "The alert and what was found." };

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

const values: SurfaceValue[] = [
  v("alert_id", "Alert ID", "string", 100, "The alert's id (from the address).", { alwaysAvailable: true, typicalCharCount: 36 }),
  v(
    "alert_load_status",
    "Load status",
    "string",
    110,
    '"loading", "failed" (the alerts could not be read), "closed" (no longer open: it was resolved) or "open".',
    { alwaysAvailable: true, typicalCharCount: 8 },
  ),
  v("alert_kind", "Kind", "string", 120, 'What kind of alert: e.g. "tool_off", "account_off", "price_drift", "import_candidate".'),
  v("alert_title", "Title", "string", 130, "The alert's title."),
  v("alert_sentence", "What happened", "string", 140, "The alert's one-sentence account.", { typicalCharCount: 160 }),
  v("alert_detail", "Detail", "string", 150, "Its longer detail, when it has one.", { typicalCharCount: 300, inlineUpTo: 2000 }),
  v("alert_state", "State", "string", 160, "Its state in words (e.g. off, no working source)."),
  v("last_seen_at", "Last seen", "string", 170, "When it was last seen (ISO time)."),
  v(
    "findings",
    "Findings",
    "object",
    180,
    "The alert's own facts: for a price drift { proposal: { price_ref, current, value, evidence, basis } }; for an import { proposal: { total, candidates } }; otherwise { tool_name, provider_name, rule, snapshot }.",
    { typicalCharCount: 600 },
  ),
  v(
    "decision_offered",
    "Decision offered",
    "object",
    190,
    "The decision the page offers, or empty: { can_approve, approve_label, approve_consequence, decline_label, decline_consequence }.",
    { typicalCharCount: 400 },
  ),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "propose_decision",
    label: "Open the decision",
    description:
      'Open the page\'s own confirm dialog for this alert\'s decision. NOTHING changes until the person presses its confirm button. Value is "approve" (only when decision_offered.can_approve) or "decline". Refused when the alert offers no decision.',
    valueType: "string",
    mode: "ui",
    applyPolicy: "auto",
    group: group.key,
    sortOrder: 300,
  },
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: ADMIN_TOOL_ALERT_SURFACE_NAME,
  situation:
    "As an admin they are looking at the Tool alert {alert_title|loading} ({alert_load_status|loading}): {alert_sentence|no account yet}. You can open its decision for them to confirm.",
  inheritsFrom: "matrx-default/agents",
  client: "matrx-admin",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Tool alert",
  description: "One Tool control alert: what was found and the decision it offers.",
  urlPattern: "/administration/agents/tool-control/alerts/[id]",
  groups: [group],
  values,
  writeTargets,
  skipBaselineValues: true,
};

export const adminToolAlertManifest = declared;
